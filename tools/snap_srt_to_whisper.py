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


def _extend_into_silence(blocks, i, min_duration_ms, min_gap_ms, target_cps):
    """Grow a block into the adjacent pauses (silence only) toward a comfortable
    reading time, bounded by the neighbours' speech so it never covers another
    block's words. Extends the tail first (linger), then the lead-in."""
    b = blocks[i]
    chars = len(b["text"].replace("\n", ""))
    desired = max(min_duration_ms, int(chars / target_cps * 1000) if target_cps > 0 else 0)
    need = desired - (b["end_ms"] - b["start_ms"])
    if need <= 0:
        return
    next_start = blocks[i + 1]["start_ms"] if i + 1 < len(blocks) else b["end_ms"] + need + min_gap_ms
    room_after = next_start - min_gap_ms - b["end_ms"]
    if room_after > 0:
        grow = min(need, room_after)
        b["end_ms"] += grow
        need -= grow
    if need > 0 and i > 0:
        prev_end = blocks[i - 1]["end_ms"]
        room_before = b["start_ms"] - (prev_end + min_gap_ms)
        if room_before > 0:
            b["start_ms"] -= min(need, room_before)


def _word_gaps(wwords, min_sil_ms=150):
    """Silences between consecutive whisper words: [(gap_start, gap_end), ...]."""
    out = []
    for i in range(len(wwords) - 1):
        a, b = wwords[i][1], wwords[i + 1][0]
        if b - a >= min_sil_ms:
            out.append((a, b))
    return out


def rebalance_short_blocks(blocks, wwords, target_cps=15, hard_cps=22, min_gap_ms=80):
    """A too-short (unreadable) block borrows time from the next block by moving
    their shared boundary later to a real whisper pause — so the short block
    stays up until the next phrase actually begins, instead of the next subtitle
    flashing up while the short one is still being heard. Bounded: never push the
    next block's display below its own readable time (hard_cps)."""
    gaps = _word_gaps(wwords)
    gstarts = [g[0] for g in gaps]
    for i in range(len(blocks) - 1):
        b, n = blocks[i], blocks[i + 1]
        chars = len(b["text"].replace("\n", ""))
        desired = int(chars / target_cps * 1000) if target_cps else 0
        if b["end_ms"] - b["start_ms"] >= desired:
            continue
        nchars = len(n["text"].replace("\n", ""))
        n_floor = int(nchars / hard_cps * 1000) if hard_cps else 0
        k = bisect.bisect_right(gstarts, b["end_ms"])
        boundary = None
        for j in range(k, len(gaps)):
            gs, ge = gaps[j]
            mid = (gs + ge) // 2
            if mid >= n["end_ms"]:
                break
            if n["end_ms"] - mid < n_floor:  # next would get too dense
                break
            if mid <= b["start_ms"] + min_gap_ms:
                continue
            boundary = mid
            if mid - b["start_ms"] >= desired:  # enough; stop at first sufficient pause
                break
        if boundary:
            b["end_ms"] = boundary - min_gap_ms // 2
            n["start_ms"] = boundary + min_gap_ms // 2
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

    # Readability: stretch too-short blocks into surrounding silence only.
    matched_idx = {b["idx"] for b in blocks if b["idx"] not in unmatched}
    for i, b in enumerate(blocks):
        if b["idx"] in matched_idx:
            _extend_into_silence(blocks, i, min_duration_ms, min_gap_ms, target_cps)

    # A short block borrows from the next one's lead at a real pause, so the next
    # subtitle never flashes up while the short phrase is still being spoken.
    rebalance_short_blocks(blocks, wwords, target_cps=target_cps, min_gap_ms=min_gap_ms)

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
