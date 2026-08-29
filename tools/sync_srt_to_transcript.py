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
    count_occurrences,
    find_diff_islands,
    find_span,
    find_span_lenient,
    joined_text,
    raw_span,
    restore_gaps,
    span_drops_text,
    strip_with_map,
    translate_span,
)
from .text_segmentation import (
    global_omit_phrases,
    strip_omitted_phrases,
    talk_omit_phrases,
)


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

    def locate(needle: str, label: str) -> tuple[tuple[int, int], dict | None]:
        """Where `needle` sits, or why we refuse to guess.

        The cursor is what tells two identical sentences apart. A drifted
        block leaves it where it was, so from that point on `find(..., cursor)`
        no longer means "the next one" — it means "the first one from
        somewhere earlier", which is a different sentence.
        """
        span = find_span(view, needle, cursor)
        occurrences = count_occurrences(view, needle)
        if span[0] != -1 and drifted and occurrences > 1:
            return (-1, -1), {
                "error": (
                    f"{label}: «{needle[:60]}» appears {occurrences} times in the transcript and an "
                    f"earlier block had drifted, so which one this edit belongs to is ambiguous. "
                    f"Run the full pipeline."
                )
            }
        return span, None

    changed = 0
    removed = 0
    skipped = 0
    drifted = 0
    # Raw (start, end, replacement) triples, applied once everything succeeded.
    edits: list[tuple[int, int, str]] = []

    def record_replace(lo_v: int, hi_v: int, old_t: str, new_t: str, label: str) -> dict | None:
        """Rewrite one block's text in the transcript, keeping any remark."""
        matched = view[lo_v:hi_v]
        # Overwriting the whole span is only safe when it reads exactly like
        # the block. When the transcript spells the same words across a line
        # break, replacing the span would glue two paragraphs into one — and
        # paragraphs decide the block cut, so the next rebuild would re-cut
        # the talk. Edit only what actually changed instead.
        if matched == old_t and not span_drops_text(offsets, lo_v, hi_v):
            edits.append((*raw_span(offsets, lo_v, hi_v), new_t))
            return None
        # Either a declared remark sits inside this sentence, or the transcript
        # spaces these words differently. Rewrite only the parts that actually
        # changed, so the remark — or the line break — survives around them.
        for old_frag, new_frag, off in find_diff_islands(old_t, new_t):
            if not old_frag:
                return {"error": f"{label}: cannot tell what changed around a declared remark. Run the full pipeline."}
            frag_lo_rel, frag_hi_rel = translate_span(old_t, matched, off, off + len(old_frag))
            frag_lo = lo_v + frag_lo_rel
            frag_hi = lo_v + frag_hi_rel
            if span_drops_text(offsets, frag_lo, frag_hi):
                return {
                    "error": (
                        f"{label}: this edit spans a declared remark in the transcript. "
                        f"The transcript is the one artefact that keeps remarks, so it cannot be "
                        f"rewritten automatically. Run the full pipeline."
                    )
                }
            # The island may straddle the line break itself: find_diff_islands
            # merges changes one word apart, and grows a short island by whole
            # words, so a single-letter edit at the start of a line («В» → «У»)
            # reaches here. Writing new_frag verbatim would put a space where
            # the file has a newline and glue the two paragraphs together.
            matched_frag = matched[frag_lo_rel:frag_hi_rel]
            replacement = new_frag
            if matched_frag != old_frag:
                replacement = restore_gaps(new_frag, matched_frag)
                if replacement is None:
                    return {
                        "error": (
                            f"{label}: this edit changes the words around a line break in the "
                            f"transcript, so which gap the break belongs to is a guess. "
                            f"Run the full pipeline."
                        )
                    }
            lo, hi = raw_span(offsets, frag_lo, frag_hi)
            edits.append((lo, hi, replacement))
        return None

    def record_delete(lo_v: int, hi_v: int) -> None:
        """Remove one block's sentence, taking any remark inside it along."""
        lo, hi = raw_span(offsets, lo_v, hi_v)
        # Absorb one neighbouring space so the sentences around the hole are
        # neither glued together nor doubly spaced. Measured in the RAW text,
        # not the view: the view cannot see a declared remark, so "the next
        # character" there can be a whole remark away in the transcript, and
        # widening by it swallowed a remark that annotates the sentence which
        # STAYS. Taking a single raw space can never reach a remark, and it
        # closes the gap even between two of them — the shape
        # 2000-07-23_Guru-Puja-Shraddha really has.
        if hi < len(raw) and raw[hi] == " ":
            hi += 1
        elif lo > 0 and raw[lo - 1] == " ":
            lo -= 1
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
                _, end = find_span_lenient(view, old_texts[k], cursor)
                if end == -1:
                    drifted += 1
                    continue
                cursor = end

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
            if joined_text(old_slice) == joined_text(new_slice):
                _, end = find_span_lenient(view, joined_text(old_slice), cursor)
                if end == -1:
                    # The cursor could not walk past this re-blocked text, so
                    # it is stale from here on exactly as a drifted block
                    # leaves it — the ambiguity guard has to know.
                    drifted += 1
                else:
                    cursor = end
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
                    (lo_v, hi_v), ambiguous = locate(old_t, label)
                    if ambiguous:
                        return ambiguous
                    if lo_v == -1:
                        print(
                            f"  {label}: «{old_t[:60]}» not in transcript — skipping (placeholder?)",
                            file=sys.stderr,
                        )
                        skipped += 1
                        continue
                    record_delete(lo_v, hi_v)
                    cursor = hi_v
                    removed += 1
                    print(f"  {label}: removed «{old_t[:60]}»", file=sys.stderr)
                    continue
                new_t = new_slice[match_idx]
                if omit_phrases and strip_omitted_phrases(old_t, omit_phrases) == new_t != old_t:
                    # The edit only took a declared remark off the screen. The
                    # transcript is meant to keep it — walk past and move on.
                    #
                    # The walk looks for the STRIPPED text: `old_t` carries the
                    # remark and the view by construction never does, so
                    # searching for `old_t` here failed every single time,
                    # stalling the cursor with nobody counting it — the very
                    # shape the ambiguity guard exists to catch, in the branch
                    # that runs on exactly the PRs that clean remarks up.
                    _, end = find_span_lenient(view, new_t, cursor)
                    if end == -1:
                        drifted += 1
                    else:
                        cursor = end
                    print(
                        f"  {label}: «{old_t[:60]}» — omit remark dropped from the screen only; transcript keeps it",
                        file=sys.stderr,
                    )
                    continue
                (lo_v, hi_v), ambiguous = locate(old_t, label)
                if ambiguous:
                    return ambiguous
                if lo_v == -1:
                    return {
                        "error": (
                            f"{label}: cannot find «{old_t[:60]}» in transcript (searching from offset {cursor})."
                        )
                    }
                if old_t == new_t:
                    cursor = hi_v
                    continue
                err = record_replace(lo_v, hi_v, old_t, new_t, label)
                if err:
                    return err
                cursor = hi_v
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
                    _, end = find_span_lenient(view, old_t, cursor)
                    if end != -1:
                        cursor = end
                    print(
                        f"  {label}: «{old_t[:60]}» — omit-only block dropped from "
                        f"the screen only; transcript keeps it",
                        file=sys.stderr,
                    )
                    skipped += 1
                    continue
                (lo_v, hi_v), ambiguous = locate(old_t, label)
                if ambiguous:
                    return ambiguous
                if lo_v == -1:
                    print(
                        f"  {label}: «{old_t[:60]}» not in transcript — skipping (placeholder?)",
                        file=sys.stderr,
                    )
                    skipped += 1
                    continue
                record_delete(lo_v, hi_v)
                cursor = hi_v
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
    p.add_argument(
        "--talk-dir",
        help=(
            "the talk whose declared remarks apply; needed when --transcript is a copy "
            "staged away from meta.yaml, as sync_pr stages it"
        ),
    )
    args = p.parse_args()

    result = sync_srt_to_transcript(args.old_srt, args.new_srt, args.transcript, talk_dir=args.talk_dir)
    if result.get("error"):
        print(f"FAIL: {result['error']}", file=sys.stderr)
        sys.exit(1)
    if result["changed"] == 0 and result.get("removed", 0) == 0:
        print("No changes", file=sys.stderr)


if __name__ == "__main__":
    main()
