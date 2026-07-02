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
import re
import sys
from pathlib import Path

from .srt_utils import parse_srt, write_srt
from .text_segmentation import MAX_CPL, build_blocks_from_paragraphs, load_transcript


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


def _find_diff(old_para: str, new_para: str) -> tuple[str, str, int]:
    """Find the changed region between old and new paragraph text.

    Returns (old_fragment, new_fragment, offset) — the minimal differing
    middle with enough surrounding context for matching in SRT blocks, and
    the fragment's exact character offset within old_para.
    """
    # Common prefix
    prefix_len = 0
    min_len = min(len(old_para), len(new_para))
    while prefix_len < min_len and old_para[prefix_len] == new_para[prefix_len]:
        prefix_len += 1

    # Common suffix (can't overlap prefix)
    suffix_len = 0
    max_suffix = min_len - prefix_len
    while suffix_len < max_suffix and old_para[-(suffix_len + 1)] == new_para[-(suffix_len + 1)]:
        suffix_len += 1

    old_end = len(old_para) - suffix_len if suffix_len else len(old_para)
    new_end = len(new_para) - suffix_len if suffix_len else len(new_para)
    old_mid = old_para[prefix_len:old_end]
    new_mid = new_para[prefix_len:new_end]

    # If the diff region is too short, include surrounding context
    # so the fragment is findable and unique in SRT blocks
    while len(old_mid) < 3 and (prefix_len > 0 or suffix_len > 0):
        if prefix_len > 0:
            prefix_len -= 1
        if suffix_len > 0:
            suffix_len -= 1
            old_end = len(old_para) - suffix_len if suffix_len else len(old_para)
            new_end = len(new_para) - suffix_len if suffix_len else len(new_para)
        old_mid = old_para[prefix_len:old_end]
        new_mid = new_para[prefix_len:new_end]

    return old_mid, new_mid, prefix_len


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


def _apply_diff(old_para: str, new_para: str, srt_blocks: list, p_idx: int, loc: tuple | None = None) -> dict | None:
    """Apply text diff from old_para → new_para to SRT blocks.

    Finds the changed region (prefix/suffix trimming), then replaces the old
    fragment at `loc` — the (block, offset) located by word-stream position.
    Without a location (streams drifted, boundary straddle) the fragment is
    applied only if it is unambiguous across the whole SRT; a short fragment
    found in several blocks is an error, never a first-match guess.

    Returns an error dict on failure, or None on success.
    """
    old_frag, new_frag, _ = _find_diff(old_para, new_para)

    if not old_frag:
        return {"error": (f"P{p_idx + 1}: cannot determine changed text — run the full subtitle pipeline to rebuild")}

    target = None
    if loc is not None:
        block, offset = loc
        if offset >= 0 and block["text"][offset : offset + len(old_frag)] == old_frag:
            block["text"] = block["text"][:offset] + new_frag + block["text"][offset + len(old_frag) :]
            target = block
        elif old_frag in block["text"]:
            # offset arithmetic thrown off by whitespace variance — still the right block
            block["text"] = block["text"].replace(old_frag, new_frag, 1)
            target = block

    if target is None:
        hits = [b for b in srt_blocks if old_frag in b["text"]]
        if not hits:
            return {"error": (f"P{p_idx + 1}: cannot find «{old_frag[:60]}» in SRT blocks")}
        if len(hits) > 1:
            return {
                "error": (
                    f"P{p_idx + 1}: «{old_frag[:60]}» is ambiguous ({len(hits)} blocks) — "
                    "run the full subtitle pipeline to rebuild"
                )
            }
        hits[0]["text"] = hits[0]["text"].replace(old_frag, new_frag, 1)
        target = hits[0]

    print(
        f"  P{p_idx + 1}: «{old_frag[:60]}» → «{new_frag[:60]}»",
        file=sys.stderr,
    )

    # CPL check on all blocks after replacement
    for block in srt_blocks:
        if len(block["text"]) > MAX_CPL:
            return {
                "error": (
                    f"P{p_idx + 1}: block exceeds {MAX_CPL} CPL after edit — run the full subtitle pipeline to re-split"
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
    old_paras = load_transcript(old_transcript)
    new_paras = load_transcript(new_transcript)
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

    # Locate every fragment against the pristine blocks before mutating any
    # text — applied edits would desync the word streams for later paragraphs.
    locs = {}
    for p_idx in changed_paras:
        old_frag, _new_frag, frag_lo = _find_diff(old_paras[p_idx], new_paras[p_idx])
        if old_frag:
            locs[p_idx] = _locate_fragment(old_paras, p_idx, frag_lo, frag_lo + len(old_frag), srt_blocks)

    total_updated = 0
    for p_idx in changed_paras:
        err = _apply_diff(old_paras[p_idx], new_paras[p_idx], srt_blocks, p_idx, locs.get(p_idx))
        if err:
            return err
        total_updated += 1

    # Renumber
    for i, b in enumerate(srt_blocks):
        b["idx"] = i + 1

    write_srt(srt_blocks, str(srt_path))
    print(f"Updated: {srt_path} ({total_updated} paragraphs)", file=sys.stderr)
    return {"changed": len(changed_paras), "updated_blocks": total_updated}


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
