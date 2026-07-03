"""Snap an English SRT's block timings onto whisper word timestamps.

For an English talk the subtitle text *is* the spoken text, so each block can be
force-aligned to the exact words it transcribes. The subtitle builder (an LLM)
places blocks by meaning and drifts around pauses — it can leave a subtitle on
screen during a silence and then move on before its words are actually spoken.
This tool re-times every block to the whisper words it matches (a monotonic
difflib alignment, robust to ASR slips and repeated phrases), so each subtitle
is shown exactly while its words are heard. Pauses become gaps; too-short blocks
are extended into the surrounding silence only — never over a neighbour's speech.

Blocks with no whisper match (content cut from an abridged video, or editorial
lines past the last spoken word) are left untouched and reported, so they can be
reviewed by hand.

Usage:
    python -m tools.snap_srt_to_whisper --srt PATH --whisper-json PATH \
        --output PATH [--min-gap 80] [--min-duration 1000]
"""

import argparse
import bisect
import difflib
import re
import sys

from .srt_utils import load_whisper_json, parse_srt, write_srt

_NORM = re.compile(r"[^a-z0-9]")


def _norm(token):
    return _NORM.sub("", token.lower())


def whisper_words(segments):
    """Flatten whisper segments into [(start_ms, end_ms, norm_word)] in order."""
    out = []
    for seg in segments:
        for w in seg.get("words", []):
            if "start" not in w or "end" not in w:
                continue
            n = _norm(w.get("word", ""))
            if n:
                out.append((int(w["start"] * 1000), int(w["end"] * 1000), n))
    return out


def _word_time_map(wwords, swords):
    """Give every subtitle word a (start_ms, end_ms) via a monotonic difflib
    alignment to the whisper words. Words the ASR transcribed differently (no
    exact anchor) are interpolated across the whisper words their neighbouring
    anchors span — so a block is never collapsed onto a single matched word.

    Returns (times, anchored): times[j] is a (start,end) tuple or None when no
    anchors exist at all; anchored[j] is True only for exact matches (used to
    decide whether a block is really present in the audio).
    """
    wlist = [w[2] for w in wwords]
    pairs = []  # (subtitle_idx, whisper_idx) exact anchors, monotonic
    for ai, bj, size in difflib.SequenceMatcher(a=wlist, b=swords, autojunk=False).get_matching_blocks():
        for k in range(size):
            pairs.append((bj + k, ai + k))

    times = [None] * len(swords)
    anchored = [False] * len(swords)
    if not pairs:
        return times, anchored

    s_idx = [p[0] for p in pairs]
    for sj, wi in pairs:
        times[sj] = (wwords[wi][0], wwords[wi][1])
        anchored[sj] = True

    for j in range(len(swords)):
        if times[j] is not None:
            continue
        pos = bisect.bisect_left(s_idx, j)
        if pos == 0:  # before first anchor → clamp to it
            wi = pairs[0][1]
            times[j] = (wwords[wi][0], wwords[wi][0])
        elif pos == len(pairs):  # after last anchor → clamp to it
            wi = pairs[-1][1]
            times[j] = (wwords[wi][1], wwords[wi][1])
        else:  # interpolate across the whisper words the two anchors span
            sj0, wi0 = pairs[pos - 1]
            sj1, wi1 = pairs[pos]
            frac = (j - sj0) / (sj1 - sj0)
            wi = max(0, min(len(wwords) - 1, int(round(wi0 + (wi1 - wi0) * frac))))
            times[j] = (wwords[wi][0], wwords[wi][1])
    return times, anchored


def align_blocks_to_words(blocks, wwords):
    """Map each block to the (start_ms, end_ms) span of the whisper words it
    transcribes. A block is included only if at least one of its words is an
    exact anchor (so content absent from the audio is left for the caller to
    handle). The span uses every word of the block (interpolated where needed),
    so partial/ASR-mismatched matches never collapse a block to a sliver.
    """
    swords, owner = [], []
    for bi, b in enumerate(blocks):
        for tok in b["text"].split():
            n = _norm(tok)
            if n:
                swords.append(n)
                owner.append(bi)

    times, anchored = _word_time_map(wwords, swords)
    span = {}
    has_anchor = set()
    for j, t in enumerate(times):
        if t is None:
            continue
        bi = owner[j]
        if anchored[j]:
            has_anchor.add(bi)
        lo, hi = span.get(bi, (t[0], t[1]))
        span[bi] = (min(lo, t[0]), max(hi, t[1]))

    return {bi: span[bi] for bi in span if bi in has_anchor}


def _want(block, target_cps):
    """ms a block would still like, to read at target_cps (0 if already comfy)."""
    if target_cps <= 0:
        return 0
    return max(0, int(len(block["text"].replace("\n", "")) / target_cps * 1000) - (block["end_ms"] - block["start_ms"]))


def distribute_pauses(blocks, matched_idx, target_cps, min_gap_ms):
    """Hand each inter-speech pause to the neighbour(s) that need the reading
    time: the previous block lingers into it and/or the next block starts early
    into it (lead-in), split by how dense each is. So a dense block gets a
    lead-in from the pause before it instead of that pause being eaten by the
    previous block. Only matched blocks move; the silence is never crossed into
    a neighbour's speech (bounded by the snapped word edges)."""
    for i in range(len(blocks) - 1):
        a, b = blocks[i], blocks[i + 1]
        avail = b["start_ms"] - a["end_ms"] - min_gap_ms
        if avail <= 0:
            continue
        wa = _want(a, target_cps) if a["idx"] in matched_idx else 0
        wb = _want(b, target_cps) if b["idx"] in matched_idx else 0
        if wa + wb == 0:
            continue
        # Lead-in priority: the NEXT block claims the pause first (appearing on
        # time matters more than the previous subtitle lingering — and whisper
        # marks word onsets late, so a lead-in keeps the subtitle from coming up
        # after its words). The previous block lingers with whatever is left.
        gb = min(avail, wb)
        ga = min(avail - gb, wa)
        if a["idx"] in matched_idx:
            a["end_ms"] += ga
        if b["idx"] in matched_idx:
            b["start_ms"] -= gb
    return blocks


def _word_gaps(wwords, min_sil_ms=150):
    """Silences between consecutive whisper words: [(gap_start, gap_end), ...]."""
    out = []
    for i in range(len(wwords) - 1):
        a, b = wwords[i][1], wwords[i + 1][0]
        if b - a >= min_sil_ms:
            out.append((a, b))
    return out


def rebalance_short_blocks(blocks, wwords, target_cps=15, min_gap_ms=80, min_dur_ms=700, matched_idx=None):
    """When a block reads too fast (CPS above target), move its boundary with the
    next block to even out the reading rate, so the next subtitle doesn't flash
    up while the dense phrase is still being heard. The boundary lands on a real
    whisper word edge (preferring an actual pause), never mid-silence guessing,
    and only when it lowers the pair's worst CPS. The two blocks' outer edges
    (this block's first word, the next block's last word) stay put, so neither
    is pushed off its own speech — only the shared hand-off moves.

    Pairs where either block is unmatched (idx not in matched_idx) are skipped:
    an unmatched block keeps its stale SRT timing, which is neither a valid
    balance window nor allowed to move (contract: untouched, reviewed by hand)."""
    # candidate boundaries = every whisper word edge; pauses are naturally included
    edges = sorted({w[0] for w in wwords} | {w[1] for w in wwords})
    pauses = {ge for _gs, ge in _word_gaps(wwords)} | {gs for gs, _ge in _word_gaps(wwords)}
    for i in range(len(blocks) - 1):
        b, n = blocks[i], blocks[i + 1]
        if matched_idx is not None and (b["idx"] not in matched_idx or n["idx"] not in matched_idx):
            continue
        cb = len(b["text"].replace("\n", ""))
        cn = len(n["text"].replace("\n", ""))
        dur_b = b["end_ms"] - b["start_ms"]
        cps_b = cb / (dur_b / 1000) if dur_b > 0 else 999
        if cps_b <= target_cps:
            continue
        win_s, win_e = b["start_ms"], n["end_ms"]
        if win_e - win_s < 2 * min_dur_ms:
            continue
        target = win_s + (win_e - win_s) * cb / (cb + cn)  # equal-CPS split point
        lo, hi = win_s + min_dur_ms, win_e - min_dur_ms
        cands = [e for e in edges if lo <= e <= hi]
        if not cands:
            continue
        # prefer the closest real pause to the balance point; else closest word edge
        near_pause = [e for e in cands if e in pauses]
        pool = near_pause if near_pause else cands
        boundary = min(pool, key=lambda e: abs(e - target))
        new_cps_b = cb / ((boundary - win_s) / 1000)
        new_cps_n = cn / ((win_e - boundary) / 1000)
        if max(new_cps_b, new_cps_n) < cps_b - 1:  # only if it genuinely helps
            b["end_ms"] = boundary - min_gap_ms
            n["start_ms"] = boundary
    return blocks


def snap_to_whisper(blocks, segments, min_gap_ms=80, min_duration_ms=1000, target_cps=15):
    """Re-time blocks onto whisper words. Returns (blocks, unmatched_idx_list)."""
    wwords = whisper_words(segments)
    spans = align_blocks_to_words(blocks, wwords)

    unmatched = []
    for bi, b in enumerate(blocks):
        if bi in spans:
            b["start_ms"], b["end_ms"] = spans[bi]
        else:
            unmatched.append(b["idx"])

    # Resolve any word-boundary overlaps between consecutive snapped blocks by
    # trimming the earlier block's tail (keep speech onset of the later block).
    for i in range(1, len(blocks)):
        prev, cur = blocks[i - 1], blocks[i]
        if cur["start_ms"] - prev["end_ms"] < min_gap_ms:
            prev["end_ms"] = min(prev["end_ms"], cur["start_ms"] - min_gap_ms)
            if prev["end_ms"] < prev["start_ms"]:
                prev["end_ms"] = prev["start_ms"]

    matched_idx = {b["idx"] for b in blocks if b["idx"] not in unmatched}

    # Readability without breaking sync, in two steps:
    # 1) hand each inter-speech pause to the neighbour(s) that need reading time
    #    (lead-in for a dense block, linger for the previous one);
    # 2) where speech is continuous (no pause) but a block still reads too fast,
    #    even out the shared boundary with the next block at a real word edge.
    distribute_pauses(blocks, matched_idx, target_cps, min_gap_ms)
    rebalance_short_blocks(blocks, wwords, target_cps=target_cps, min_gap_ms=min_gap_ms, matched_idx=matched_idx)

    # Floor: keep any block at least min_duration_ms, borrowing only from a
    # following pause (never over the next block's speech).
    for i, b in enumerate(blocks):
        if b["idx"] not in matched_idx:
            continue
        short = min_duration_ms - (b["end_ms"] - b["start_ms"])
        if short > 0:
            nxt = blocks[i + 1]["start_ms"] if i + 1 < len(blocks) else b["end_ms"] + short + min_gap_ms
            b["end_ms"] += max(0, min(short, nxt - min_gap_ms - b["end_ms"]))

    return blocks, unmatched


def main():
    p = argparse.ArgumentParser(description="Snap an English SRT onto whisper word timestamps")
    p.add_argument("--srt", required=True)
    p.add_argument("--whisper-json", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--min-gap", type=int, default=80)
    p.add_argument("--min-duration", type=int, default=1000)
    p.add_argument(
        "--target-cps",
        type=float,
        default=15.0,
        help="Reading-time target; blocks above it grow into surrounding silence only.",
    )
    args = p.parse_args()

    blocks = parse_srt(args.srt)
    segments = load_whisper_json(args.whisper_json)
    blocks, unmatched = snap_to_whisper(
        blocks,
        segments,
        min_gap_ms=args.min_gap,
        min_duration_ms=args.min_duration,
        target_cps=args.target_cps,
    )
    write_srt(blocks, args.output)
    print(f"Snapped {len(blocks) - len(unmatched)}/{len(blocks)} blocks to whisper words", file=sys.stderr)
    if unmatched:
        print(f"  Unmatched (review by hand): {unmatched}", file=sys.stderr)


if __name__ == "__main__":
    main()
