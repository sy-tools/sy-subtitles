"""Sync subtitle text edits back into transcript_uk.txt.

Mirror of sync_transcript_to_srt: takes the diff between an old and a
new SRT, then applies the changes to the transcript file in-place.

Supported edits:
  - text-only edits (block count unchanged)
  - block deletions (e.g. removing a placeholder block) — the deleted
    text is removed from the transcript if found, otherwise skipped
    silently (placeholders are often not in the transcript)

Deliberately NOT propagated:
  - removal of a declared `subtitle_omit` phrase ("(сміх)"). Those
    remarks belong to the transcript and never to a subtitle, so an
    edit that only takes one off the screen leaves the transcript
    untouched — whether it shrank a block or dropped an omit-only one.

Unsupported (returns error):
  - block insertions — there's no signal where to insert text in the
    transcript; needs full pipeline rebuild
  - block-group replacements with different counts — too ambiguous
    for automated propagation; needs full pipeline rebuild

After processing the new SRT is rewritten via write_srt, which
normalizes block numbering — handy when the user deleted blocks but
forgot to renumber.

Usage:
    python -m tools.sync_srt_to_transcript \
        --old-srt OLD --new-srt NEW --transcript transcript_uk.txt
"""

import argparse
import difflib
import sys
from pathlib import Path

from .srt_utils import parse_srt, write_srt
from .sync_common import (
    find_diff_islands,
    find_in_text,
    find_in_text_lenient,
    raw_span,
    span_drops_text,
    strip_with_map,
)
from .text_segmentation import (
    global_omit_phrases,
    strip_omitted_phrases,
    talk_omit_phrases,
)


def _joined(slice_: list[str]) -> str:
    """Block texts as one whitespace-normalised string, for comparing content
    independently of how it is split into blocks."""
    return " ".join(" ".join(t.split()) for t in slice_)


def _match_blocks_by_similarity(old_slice: list[str], new_slice: list[str]) -> list[int | None]:
    """Pair each old block with the most similar new block (ratio > 0.5).

    Returns a list parallel to `old_slice`; each entry is either the index
    in `new_slice` of the matched block, or None if the old block should be
    treated as a deletion. Each new block is matched at most once.
    """
    matches: list[int | None] = []
    available = list(range(len(new_slice)))
    for old_text in old_slice:
        best_idx = None
        best_ratio = 0.0
        for ni in available:
            ratio = difflib.SequenceMatcher(None, old_text, new_slice[ni]).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_idx = ni
        if best_idx is not None and best_ratio > 0.5:
            matches.append(best_idx)
            available.remove(best_idx)
        else:
            matches.append(None)
    return matches


def sync_srt_to_transcript(old_srt: str, new_srt: str, transcript: str, talk_dir: str | None = None) -> dict:
    """Apply text-level diff between old_srt and new_srt to the transcript file.

    `talk_dir` names the talk whose declared remarks apply. It defaults to the
    transcript's own directory, which is right for a file in place and wrong
    for a copy staged elsewhere — sync_pr stages one per video, and reading
    the remarks from a temp dir there would silently use a different
    vocabulary than the run beside meta.yaml.

    Lookups run against an omit-stripped VIEW of the transcript, because that
    is the text the subtitles were built from: a block reading «A B» does not
    occur in a file reading «A (сміх) B». Every edit is then translated back to
    a span of the real file, so the remarks stay where they belong.

    Returns a dict with `changed` (number of edited blocks), `removed`
    (number of removed blocks), `skipped` (deletions of blocks not in
    transcript), or `error`.
    """
    old_blocks = parse_srt(old_srt)
    new_blocks = parse_srt(new_srt)

    with open(transcript, encoding="utf-8") as f:
        raw = f.read()

    # Declared editorial remarks ("(сміх)") live in the transcript and never on
    # screen, so an SRT edit that only takes one off the screen must not travel
    # back — it would delete the remark from the one artefact that keeps it.
    omit_source = Path(talk_dir) / "transcript_uk.txt" if talk_dir else transcript
    omit_phrases = global_omit_phrases() + talk_omit_phrases(omit_source)
    mapped = strip_with_map(raw, omit_phrases)
    # strip_with_map returns None only when it cannot reproduce the canonical
    # stripper byte for byte; the raw text is then the honest fallback.
    view, offsets = mapped if mapped else (raw, list(range(len(raw))))

    old_texts = [b["text"] for b in old_blocks]
    new_texts = [b["text"] for b in new_blocks]
    matcher = difflib.SequenceMatcher(a=old_texts, b=new_texts, autojunk=False)

    cursor = 0  # position in the VIEW; it only ever moves forward

    def locate(needle: str, label: str) -> tuple[int, dict | None]:
        """Where `needle` is, or why we refuse to guess.

        The cursor is what tells two identical sentences apart. A drifted
        block leaves it where it was, so from that point on `find(..., cursor)`
        no longer means "the next one" — it means "the first one from
        somewhere earlier", which is a different sentence.
        """
        pos = find_in_text(view, needle, cursor)
        if pos != -1 and drifted and view.count(needle) > 1:
            return -1, {
                "error": (
                    f"{label}: «{needle[:60]}» appears {view.count(needle)} times in the transcript and an "
                    f"earlier block had drifted, so which one this edit belongs to is ambiguous. "
                    f"Run the full pipeline."
                )
            }
        return pos, None

    changed = 0
    removed = 0
    skipped = 0
    drifted = 0
    # Raw (start, end, replacement) triples, applied once everything succeeded.
    edits: list[tuple[int, int, str]] = []

    def record_replace(view_pos: int, old_t: str, new_t: str, label: str) -> dict | None:
        """Rewrite one block's text in the transcript, keeping any remark."""
        lo_v, hi_v = view_pos, view_pos + len(old_t)
        if not span_drops_text(offsets, lo_v, hi_v):
            lo, hi = raw_span(offsets, lo_v, hi_v)
            edits.append((lo, hi, new_t))
            return None
        # A declared remark sits inside this sentence. Rewrite only the parts
        # that actually changed so the remark survives around them.
        for old_frag, new_frag, off in find_diff_islands(old_t, new_t):
            if not old_frag:
                return {"error": f"{label}: cannot tell what changed around a declared remark. Run the full pipeline."}
            frag_lo = lo_v + off
            frag_hi = frag_lo + len(old_frag)
            if span_drops_text(offsets, frag_lo, frag_hi):
                return {
                    "error": (
                        f"{label}: this edit spans a declared remark in the transcript. "
                        f"The transcript is the one artefact that keeps remarks, so it cannot be "
                        f"rewritten automatically. Run the full pipeline."
                    )
                }
            lo, hi = raw_span(offsets, frag_lo, frag_hi)
            edits.append((lo, hi, new_frag))
        return None

    def record_delete(view_pos: int, old_t: str) -> None:
        """Remove one block's sentence, taking any remark inside it along."""
        lo_v, hi_v = view_pos, view_pos + len(old_t)
        if lo_v > 0 and view[lo_v - 1] == " ":
            lo_v -= 1
        elif hi_v < len(view) and view[hi_v] == " ":
            hi_v += 1
        lo, hi = raw_span(offsets, lo_v, hi_v)
        edits.append((lo, hi, ""))

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            # Walk the cursor through these unchanged blocks so subsequent
            # find()s land in the right region. The walk is best-effort: SRTs
            # in older talks have legitimate drift from the transcript (manual
            # edits, capitalization changes). If a block isn't found we leave
            # the cursor where it was — ordering may then be approximate, but
            # for delete-only PRs the cursor doesn't matter.
            for k in range(i1, i2):
                # Lenient (case-insensitive) fallback: benign capitalization
                # drift must not stall the cursor, or a later deletion of
                # duplicated text grabs an earlier occurrence.
                pos = find_in_text_lenient(view, old_texts[k], cursor)
                if pos == -1:
                    drifted += 1
                    continue
                cursor = pos + len(old_texts[k])

        elif tag == "replace":
            # Pair old blocks to new blocks by similarity ratio. Equal-count
            # replaces degenerate to 1:1; unequal-count replaces (edit + delete
            # bundled together by difflib) match what they can and treat any
            # unmatched old block as a deletion. Any unmatched *new* block is
            # a real insertion and errors out.
            old_slice = old_texts[i1:i2]
            new_slice = new_texts[j1:j2]

            # Pure re-blocking: the same words redistributed over a different
            # number of blocks (the optimizer's merge guard keeps sentences
            # apart that used to share a subtitle). Nothing was edited, so the
            # transcript needs no change — and the cursor still has to walk
            # past this text for later find()s to land correctly.
            if _joined(old_slice) == _joined(new_slice):
                pos = find_in_text_lenient(view, old_slice[0], cursor)
                if pos != -1:
                    cursor = pos + len(_joined(old_slice))
                continue
            matches = (
                list(range(i2 - i1)) if (i2 - i1) == (j2 - j1) else _match_blocks_by_similarity(old_slice, new_slice)
            )
            matched_new_indices = {m for m in matches if m is not None}
            unmatched_new = [ni for ni in range(len(new_slice)) if ni not in matched_new_indices]
            if unmatched_new:
                return {
                    "error": (
                        f"Block group replaced ({i2 - i1} → {j2 - j1}) with "
                        f"{len(unmatched_new)} unmatched new block(s) — likely an "
                        f"insertion. Run the full pipeline."
                    )
                }

            for local_idx, match_idx in enumerate(matches):
                old_t = old_slice[local_idx]
                src_block = old_blocks[i1 + local_idx]
                label = f"Block {src_block['idx']}"
                if match_idx is None:
                    # Treat as deletion
                    pos = find_in_text(view, old_t, cursor)
                    if pos == -1:
                        print(
                            f"  {label}: «{old_t[:60]}» not in transcript — skipping (placeholder?)",
                            file=sys.stderr,
                        )
                        skipped += 1
                        continue
                    record_delete(pos, old_t)
                    cursor = pos + len(old_t)
                    removed += 1
                    print(f"  {label}: removed «{old_t[:60]}»", file=sys.stderr)
                    continue
                new_t = new_slice[match_idx]
                if omit_phrases and strip_omitted_phrases(old_t, omit_phrases) == new_t != old_t:
                    # The edit only took a declared remark off the screen. The
                    # transcript is meant to keep it — walk past and move on.
                    pos = find_in_text_lenient(view, old_t, cursor)
                    if pos != -1:
                        cursor = pos + len(old_t)
                    print(
                        f"  {label}: «{old_t[:60]}» — omit remark dropped from the screen only; transcript keeps it",
                        file=sys.stderr,
                    )
                    continue
                pos, ambiguous = locate(old_t, label)
                if ambiguous:
                    return ambiguous
                if pos == -1:
                    return {
                        "error": (
                            f"{label}: cannot find «{old_t[:60]}» in transcript (searching from offset {cursor})."
                        )
                    }
                if old_t == new_t:
                    cursor = pos + len(old_t)
                    continue
                err = record_replace(pos, old_t, new_t, label)
                if err:
                    return err
                cursor = pos + len(old_t)
                changed += 1
                print(f"  {label}: «{old_t[:60]}» → «{new_t[:60]}»", file=sys.stderr)

        elif tag == "delete":
            # Blocks i1:i2 were removed from the SRT. Try to find each
            # removed block's text in the transcript and remove it. If a
            # block isn't in the transcript (placeholder, technical note),
            # skip silently — the SRT change stands but the transcript was
            # never the source of that text.
            for k in range(i1, i2):
                old_t = old_texts[k]
                label = f"Block {old_blocks[k]['idx']}"
                if omit_phrases and not strip_omitted_phrases(old_t, omit_phrases):
                    # The block was nothing but declared remarks. Dropping it
                    # from the SRT is right; the transcript still keeps them.
                    pos = find_in_text_lenient(view, old_t, cursor)
                    if pos != -1:
                        cursor = pos + len(old_t)
                    print(
                        f"  {label}: «{old_t[:60]}» — omit-only block dropped from "
                        f"the screen only; transcript keeps it",
                        file=sys.stderr,
                    )
                    skipped += 1
                    continue
                pos = find_in_text(view, old_t, cursor)
                if pos == -1:
                    print(
                        f"  {label}: «{old_t[:60]}» not in transcript — skipping (placeholder?)",
                        file=sys.stderr,
                    )
                    skipped += 1
                    continue
                record_delete(pos, old_t)
                cursor = pos + len(old_t)
                removed += 1
                print(f"  {label}: removed «{old_t[:60]}»", file=sys.stderr)

        elif tag == "insert":
            return {
                "error": (
                    f"Cannot propagate inserted blocks ({j2 - j1} new) — "
                    f"transcript has no signal where to put new text. Run the full pipeline."
                )
            }

    if changed or removed:
        # Applied last and right to left, so no edit can shift another's span.
        for lo, hi, replacement in sorted(edits, key=lambda e: -e[0]):
            raw = raw[:lo] + replacement + raw[hi:]
        with open(transcript, "w", encoding="utf-8") as f:
            f.write(raw)
        print(
            f"Updated transcript: {transcript} (changed: {changed}, removed: {removed}, skipped: {skipped})",
            file=sys.stderr,
        )
    if drifted:
        print(
            f"Note: {drifted} unchanged block(s) not found in transcript verbatim — "
            f"likely benign drift (capitalization, punctuation). Cursor walk continued best-effort.",
            file=sys.stderr,
        )

    # Always normalize the new SRT's block numbering. The user may have
    # deleted blocks without renumbering; write_srt always emits sequential
    # indices starting at 1.
    write_srt(new_blocks, new_srt)

    return {"changed": changed, "removed": removed, "skipped": skipped}


def main():
    p = argparse.ArgumentParser(description="Sync SRT text edits back to transcript")
    p.add_argument("--old-srt", required=True)
    p.add_argument("--new-srt", required=True)
    p.add_argument("--transcript", required=True)
    args = p.parse_args()

    result = sync_srt_to_transcript(args.old_srt, args.new_srt, args.transcript)
    if result.get("error"):
        print(f"FAIL: {result['error']}", file=sys.stderr)
        sys.exit(1)
    if result["changed"] == 0 and result.get("removed", 0) == 0:
        print("No changes", file=sys.stderr)


if __name__ == "__main__":
    main()
