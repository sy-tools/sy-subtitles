"""Sync transcript_uk.txt text edits into existing uk.srt.

Applies text changes from a transcript diff directly to SRT blocks
via difflib fragment matching.  This approach works regardless of
whether the SRT block structure matches prepare_blocks output (e.g.
whisper-built SRTs that combine sentences differently).

When a replacement pushes a block over MAX_CPL, returns an error —
the caller should fall back to the full pipeline, which rebuilds
timing from whisper.

Usage:
    python -m tools.sync_transcript_to_srt \
        --talk-dir talks/TALK --video-slug VIDEO \
        --old-transcript OLD --new-transcript NEW
"""

import argparse
import difflib
import re
import sys
from pathlib import Path

from .srt_utils import parse_srt, write_srt
from .text_segmentation import (
    MAX_CPL,
    build_blocks_from_paragraphs,
    global_omit_phrases,
    load_transcript,
    talk_omit_phrases,
)

MIN_FRAGMENT = 3  # shortest fragment worth trying to locate in a block


def prepare_blocks(paragraphs: list) -> list:
    """Split paragraphs into subtitle-sized blocks (<=84 CPL).

    Thin wrapper around text_segmentation.build_blocks_from_paragraphs — the
    canonical implementation shared with build_map.prepare_uk_blocks.
    """
    return build_blocks_from_paragraphs(paragraphs)


def find_paragraph_blocks(srt_blocks: list, para_blocks: list) -> list | None:
    """Find SRT block indices matching paragraph blocks by sequential text."""
    if not para_blocks or not srt_blocks:
        return None
    target = [b["text"] for b in para_blocks]
    for start in range(len(srt_blocks) - len(target) + 1):
        if all(srt_blocks[start + j]["text"] == target[j] for j in range(len(target))):
            return list(range(start, start + len(target)))
    return None


def _tighten(old_f: str, new_f: str, offset: int, min_len: int) -> tuple[str, str, int]:
    """Drop the characters an island shares on both sides.

    Word alignment is robust but coarse: an SRT that drifted from the
    transcript by a single punctuation mark would fail to match a whole word
    («щось.» against «щось!»). Trimming the island's shared edges describes
    the same edit with a smaller fragment, which survives that drift. The
    fragment never begins or ends on whitespace — that is exactly where one
    subtitle block ends and the next begins.
    """
    lo, limit = 0, min(len(old_f), len(new_f))
    while lo < limit and old_f[lo] == new_f[lo] and len(old_f) - lo > min_len:
        lo += 1
    hi_o, hi_n = len(old_f), len(new_f)
    while hi_o > lo and hi_n > lo and old_f[hi_o - 1] == new_f[hi_n - 1] and hi_o - lo > min_len:
        hi_o -= 1
        hi_n -= 1
    while lo > 0 and old_f[lo].isspace():
        lo -= 1
    while hi_o < len(old_f) and old_f[hi_o - 1].isspace():
        hi_o += 1
        hi_n += 1
    return old_f[lo:hi_o], new_f[lo:hi_n], offset + lo


def find_diff_islands(
    old_para: str,
    new_para: str,
    min_len: int = MIN_FRAGMENT,
    merge_gap_words: int = 1,
) -> list[tuple[str, str, int]]:
    """Every changed region between old and new paragraph text.

    Returns (old_fragment, new_fragment, offset_in_old) per island, in order.
    Trimming one common prefix and one common suffix — what this used to do —
    calls everything between the first and last change "the change". Two edits
    in a long paragraph then produce a fragment that exists in no single
    subtitle block, and the sync fails on text it could have placed exactly.

    The diff runs over WORDS, not characters. A character diff of Ukrainian
    prose aligns on repeated function words and produces islands that start
    mid-word or on a space — and a space is exactly where one subtitle block
    ends and the next begins. Words are also the unit _locate_fragment maps
    in, so an island lands on a block boundary by construction or not at all.

    Changes separated by at most `merge_gap_words` unchanged words become one
    island: splitting on every micro-gap yields fragments too short to place
    unambiguously, and adjacent changes are one edit anyway. Each island then
    grows whole words of context until its old fragment reaches `min_len`.
    """
    if old_para == new_para:
        return []

    old_toks = list(re.finditer(r"\S+", old_para))
    new_toks = list(re.finditer(r"\S+", new_para))
    ops = [
        (i1, i2, j1, j2)
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(
            None, [m.group() for m in old_toks], [m.group() for m in new_toks], autojunk=False
        ).get_opcodes()
        if tag != "equal"
    ]
    if not ops:
        # Whitespace-only change: nothing a subtitle block would show.
        return []

    groups: list[list[int]] = []
    for i1, i2, j1, j2 in ops:
        if groups and i1 - groups[-1][1] <= merge_gap_words:
            groups[-1][1], groups[-1][3] = i2, j2
        else:
            groups.append([i1, i2, j1, j2])

    def span(toks, lo, hi, para):
        """Character slice covering words [lo, hi), or an empty anchor."""
        if hi > lo:
            return toks[lo].start(), toks[hi - 1].end()
        anchor = toks[lo].start() if lo < len(toks) else len(para)
        return anchor, anchor

    islands = []
    for i1, i2, j1, j2 in groups:
        # Words outside a group are equal in both texts, so the two windows
        # widen in lockstep.
        while True:
            o_lo, o_hi = span(old_toks, i1, i2, old_para)
            if o_hi - o_lo >= min_len:
                break
            if i1 > 0 and j1 > 0:
                i1, j1 = i1 - 1, j1 - 1
            elif i2 < len(old_toks) and j2 < len(new_toks):
                i2, j2 = i2 + 1, j2 + 1
            else:
                break
        o_lo, o_hi = span(old_toks, i1, i2, old_para)
        n_lo, n_hi = span(new_toks, j1, j2, new_para)
        islands.append(_tighten(old_para[o_lo:o_hi], new_para[n_lo:n_hi], o_lo, min_len))
    return islands


def _locate_fragment(old_paras: list, p_idx: int, frag_lo: int, frag_hi: int, srt_blocks: list) -> tuple | None:
    """(block_index, char_offset) of paragraph p_idx's fragment [frag_lo, frag_hi).

    Maps by word-stream position: transcript paragraphs and SRT blocks carry
    the same words in the same order even when segmented differently
    (whisper-built SRTs combine sentences prepare_blocks would split).
    Returns None when the streams have drifted or the fragment straddles a
    block boundary — the caller must then fall back to a stricter search.
    """
    para_words = [list(re.finditer(r"\S+", p)) for p in old_paras]
    block_words = [list(re.finditer(r"\S+", b["text"])) for b in srt_blocks]
    if [m.group() for ms in para_words for m in ms] != [m.group() for ms in block_words for m in ms]:
        return None

    words = para_words[p_idx]
    if not words:
        return None
    touched = [k for k, m in enumerate(words) if m.start() < frag_hi and m.end() > frag_lo]
    if not touched:  # whitespace-only fragment: anchor to the next word
        touched = [k for k, m in enumerate(words) if m.start() >= frag_lo][:1] or [len(words) - 1]

    w0 = sum(len(ms) for ms in para_words[:p_idx])
    g_lo, g_hi = w0 + touched[0], w0 + touched[-1]

    pos = 0
    for ms, block in zip(block_words, srt_blocks, strict=True):
        if pos <= g_lo and g_hi < pos + len(ms):
            anchor = ms[g_lo - pos]
            offset = anchor.start() + (frag_lo - words[touched[0]].start())
            return block, offset
        pos += len(ms)
    return None  # fragment straddles a block boundary


def _align_transcript_to_blocks(old_paras: list[str], srt_blocks: list) -> dict:
    """Map the transcript's words onto the SRT's, tolerating drift.

    _locate_fragment needs the two word streams to be equal, and in 74 of the
    corpus's 94 talks they are not: an en-srt build legitimately leaves
    transcript-only content off the screen, and older talks carry punctuation
    edits made on one side only. Aligning the streams with difflib instead
    keeps every word the two still share, which is enough to say which block
    a given transcript word ended up in.

    Returns a dict with `starts` (global word index where each paragraph
    begins), `words` (each paragraph's word matches), and `word_block`
    (global word index -> block index, for matched words only).
    """
    para_words = [list(re.finditer(r"\S+", para)) for para in old_paras]
    starts, total = [], 0
    for words in para_words:
        starts.append(total)
        total += len(words)

    block_of: list[int] = []
    block_words: list[str] = []
    for bi, block in enumerate(srt_blocks):
        words = re.findall(r"\S+", block["text"])
        block_words += words
        block_of += [bi] * len(words)

    flat = [m.group() for words in para_words for m in words]
    word_block: dict[int, int] = {}
    if flat and block_words:
        matcher = difflib.SequenceMatcher(None, flat, block_words, autojunk=False)
        for a, b, size in matcher.get_matching_blocks():
            for k in range(size):
                word_block[a + k] = block_of[b + k]
    return {"starts": starts, "words": para_words, "word_block": word_block}


def _locate_by_alignment(align: dict, p_idx: int, frag_lo: int, frag_hi: int) -> int | None:
    """Block index the fragment most likely sits in, or None.

    The fragment's own words are usually the ones that changed, so they are
    exactly the words difflib could not match. The nearest matched word on
    either side — searched within the paragraph, never across it — is the
    anchor.
    """
    words = align["words"][p_idx]
    if not words:
        return None
    touched = [k for k, m in enumerate(words) if m.start() < frag_hi and m.end() > frag_lo]
    centre = touched[0] if touched else 0
    start = align["starts"][p_idx]
    for step in range(len(words)):
        for k in (centre - step, centre + step):
            if 0 <= k < len(words) and (start + k) in align["word_block"]:
                return align["word_block"][start + k]
    return None


def _paragraph_block_range(align: dict, p_idx: int) -> tuple[int, int] | None:
    """Block range [lo, hi) carrying paragraph `p_idx`'s matched words."""
    start, count = align["starts"][p_idx], len(align["words"][p_idx])
    hits = [align["word_block"][start + k] for k in range(count) if (start + k) in align["word_block"]]
    return (min(hits), max(hits) + 1) if hits else None


def _resolve_edits(
    old_paras: list[str],
    new_paras: list[str],
    changed_paras: list[int],
    srt_blocks: list,
) -> tuple[list[dict], dict | None]:
    """Pin every island of every changed paragraph to a block and offset.

    Pure: runs against the pristine blocks and mutates nothing. Resolving
    everything before applying anything is what makes several edits in one
    paragraph safe — an applied edit would desync the word streams and shift
    the offsets that later islands were measured against.

    Returns (edits, error). An island that cannot be placed, or that could go
    in more than one block, is an error — never a first-match guess: 51 of the
    corpus's 165 SRTs contain duplicate block texts.
    """
    edits: list[dict] = []
    # Where the next lookup inside a given block may start: without this every
    # island searching for the same fragment resolves to the first occurrence,
    # and the last edit silently overwrites the earlier ones.
    claimed: dict[int, int] = {}

    def place(block: dict, offset_from: int = 0) -> int:
        return block["text"].find(old_frag, max(offset_from, claimed.get(id(block), 0)))

    align: dict | None = None
    for p_idx in changed_paras:
        islands = find_diff_islands(old_paras[p_idx], new_paras[p_idx])
        if any(not old_frag for old_frag, _, _ in islands):
            return [], {
                "error": f"P{p_idx + 1}: cannot determine changed text — run the full subtitle pipeline to rebuild"
            }
        for old_frag, new_frag, frag_lo in islands:
            loc = _locate_fragment(old_paras, p_idx, frag_lo, frag_lo + len(old_frag), srt_blocks)
            block = offset = None
            if loc is not None:
                block, offset = loc
                if block["text"][offset : offset + len(old_frag)] != old_frag:
                    # Offset arithmetic thrown off by whitespace variance —
                    # still the right block.
                    offset = place(block)
                    if offset == -1:
                        block = None
            if block is None:
                # Second tier: the drift-tolerant alignment names one block.
                if align is None:
                    align = _align_transcript_to_blocks(old_paras, srt_blocks)
                bi = _locate_by_alignment(align, p_idx, frag_lo, frag_lo + len(old_frag))
                if bi is not None:
                    for cand in (bi, bi - 1, bi + 1):
                        if 0 <= cand < len(srt_blocks) and place(srt_blocks[cand]) != -1:
                            block = srt_blocks[cand]
                            offset = place(block)
                            break
            if block is None:
                # Third tier: the paragraph's own blocks, then the whole file.
                # Uniqueness is the only guard left, so anything that appears
                # twice is refused rather than guessed at.
                scope = _paragraph_block_range(align, p_idx) if align else None
                hits = []
                if scope is not None:
                    hits = [b for b in srt_blocks[scope[0] : scope[1]] if old_frag in b["text"]]
                if not hits:
                    hits = [b for b in srt_blocks if old_frag in b["text"]]
                if not hits:
                    return [], {"error": f"P{p_idx + 1}: cannot find «{old_frag[:60]}» in SRT blocks"}
                if len(hits) > 1:
                    return [], {
                        "error": (
                            f"P{p_idx + 1}: «{old_frag[:60]}» is ambiguous ({len(hits)} blocks) — "
                            "run the full subtitle pipeline to rebuild"
                        )
                    }
                block, offset = hits[0], place(hits[0])
            claimed[id(block)] = offset + len(old_frag)
            edits.append({"block": block, "offset": offset, "old": old_frag, "new": new_frag, "p_idx": p_idx})
    places = {(id(e["block"]), e["offset"]) for e in edits}
    if len(places) != len(edits):
        return [], {
            "error": "two edits resolved to the same place in one block — run the full subtitle pipeline to rebuild"
        }
    return edits, None


def _apply_edits(edits: list[dict]) -> dict | None:
    """Splice every resolved edit into its block, then check CPL.

    Applied by descending offset so that two islands landing in the same block
    cannot shift each other: edits in different blocks never interact, and
    within a block the later one is written first.
    """
    for edit in sorted(edits, key=lambda e: -e["offset"]):
        block, offset, old_frag, new_frag = edit["block"], edit["offset"], edit["old"], edit["new"]
        block["text"] = block["text"][:offset] + new_frag + block["text"][offset + len(old_frag) :]
        print(f"  P{edit['p_idx'] + 1}: «{old_frag[:60]}» → «{new_frag[:60]}»", file=sys.stderr)

    for edit in edits:
        if len(edit["block"]["text"]) > MAX_CPL:
            return {
                "error": (
                    f"P{edit['p_idx'] + 1}: block exceeds {MAX_CPL} CPL after edit — "
                    "run the full subtitle pipeline to re-split"
                )
            }
    return None


def sync_transcript(talk_dir: str, video_slug: str, old_transcript: str, new_transcript: str) -> dict:
    """Apply changed paragraph text to SRT via difflib fragment matching.

    For each changed paragraph, computes a character-level diff and applies
    the replacements directly to the SRT blocks that contain the old text.
    This works even when SRT block boundaries differ from what prepare_blocks
    would produce (e.g. whisper-built SRTs).
    """
    # Declared omissions belong to the TALK, not to the directory a transcript
    # copy happens to sit in: sync_pr stages the base transcript in a temp dir,
    # where talk_omit_phrases() would find no meta.yaml and silently read the
    # remarks back in — making identical bytes compare unequal.
    omit_phrases = global_omit_phrases() + talk_omit_phrases(Path(talk_dir) / "transcript_uk.txt")
    old_paras = load_transcript(old_transcript, omit_phrases)
    new_paras = load_transcript(new_transcript, omit_phrases)
    srt_path = Path(talk_dir) / video_slug / "final" / "uk.srt"

    if not srt_path.exists():
        return {"error": f"No SRT: {srt_path}"}

    if len(old_paras) != len(new_paras):
        return {"error": f"Paragraph count changed: {len(old_paras)} → {len(new_paras)} (need full rebuild)"}

    srt_blocks = parse_srt(str(srt_path))

    changed_paras = [i for i, (o, n) in enumerate(zip(old_paras, new_paras, strict=True)) if o != n]
    if not changed_paras:
        return {"changed": 0}

    print(f"Changed paragraphs: {len(changed_paras)}", file=sys.stderr)

    edits, err = _resolve_edits(old_paras, new_paras, changed_paras, srt_blocks)
    if err:
        return err
    err = _apply_edits(edits)
    if err:
        return err

    # Renumber
    for i, b in enumerate(srt_blocks):
        b["idx"] = i + 1

    write_srt(srt_blocks, str(srt_path))
    print(f"Updated: {srt_path} ({len(changed_paras)} paragraphs, {len(edits)} edits)", file=sys.stderr)
    return {"changed": len(changed_paras), "updated_blocks": len(changed_paras), "edits": len(edits)}


def main():
    p = argparse.ArgumentParser(description="Sync transcript edits to subtitles")
    p.add_argument("--talk-dir", required=True)
    p.add_argument("--video-slug", required=True)
    p.add_argument("--old-transcript", required=True)
    p.add_argument("--new-transcript", required=True)
    args = p.parse_args()

    result = sync_transcript(args.talk_dir, args.video_slug, args.old_transcript, args.new_transcript)
    if result.get("error"):
        print(f"FAIL: {result['error']}", file=sys.stderr)
        sys.exit(1)
    if result["changed"] == 0:
        print("No changes", file=sys.stderr)


if __name__ == "__main__":
    main()
