"""Copying a primary video's subtitle text onto its derived videos.

A derived video's subtitles ARE the primary's, cut to its own timeline. The
sync used to reconcile every video with the transcript by character diff,
which for a derived video is the wrong instrument: its block boundaries were
never the transcript's, so an edit could only land if it happened to fall
inside a block both sides had cut the same way.

Substitution here is strictly POSITIONAL, through difflib opcodes. It is
never a text search: 51 of the corpus's 165 SRTs contain duplicate block
texts, so "replace it wherever it appears" would rewrite the wrong subtitle.
Text that has no counterpart on the derived video is skipped — a Talk cut is
often a subset of the full recording. Text that has no timing there is a
failure, never an invention (feedback_no_proportional).
"""

import difflib


def align_blocks(source_texts: list[str], target_texts: list[str]) -> dict[int, int]:
    """Source block index -> target block index, for blocks that correspond.

    Only runs difflib pairs one-for-one: an `equal` run, or a `replace` whose
    two sides have the same length. Anything else is a structural difference
    between the two cuts, and guessing across it is what corrupts subtitles.
    """
    mapping: dict[int, int] = {}
    matcher = difflib.SequenceMatcher(None, source_texts, target_texts, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal" or (tag == "replace" and (i2 - i1) == (j2 - j1)):
            for k in range(i2 - i1):
                mapping[i1 + k] = j1 + k
    return mapping


def _primary_edits(primary_old: list[str], primary_new: list[str]) -> tuple[dict[int, str], list[int], dict | None]:
    """What changed on the primary: {old index: new text}, deleted indices."""
    edits: dict[int, str] = {}
    deleted: list[int] = []
    matcher = difflib.SequenceMatcher(None, primary_old, primary_new, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag == "delete":
            deleted.extend(range(i1, i2))
        elif tag == "replace" and (i2 - i1) == (j2 - j1):
            for k in range(i2 - i1):
                if primary_old[i1 + k] != primary_new[j1 + k]:
                    edits[i1 + k] = primary_new[j1 + k]
        else:
            return (
                {},
                [],
                {
                    "error": (
                        f"the primary gained {j2 - j1 - (i2 - i1)} block(s) — a derived video has no "
                        f"timecode for text that was never on it. Run the full pipeline."
                    )
                },
            )
    return edits, deleted, None


def propagate_primary_to_derived(
    primary_old: list[str],
    primary_new: list[str],
    derived_old: list[str],
    derived_blocks: list[dict],
) -> dict:
    """Apply the primary's text changes to `derived_blocks` in place.

    The correspondence is taken from the two BASELINE texts, so an edit does
    not break the alignment it is supposed to travel along. Nothing is written
    unless every change could be placed.

    Returns {"changed": n, "removed": n} or {"error": ...}.
    """
    edits, deleted, err = _primary_edits(primary_old, primary_new)
    if err:
        return err
    if not edits and not deleted:
        return {"changed": 0, "removed": 0}

    mapping = align_blocks(primary_old, derived_old)
    current = [b["text"] for b in derived_blocks]
    if len(derived_old) != len(current):
        # The derived SRT changed structurally in this PR too (the human
        # edited it, or it is unreadable). Carry the correspondence forward
        # onto what is actually there now rather than indexing into a shape
        # that no longer exists.
        forward = align_blocks(derived_old, current)
        mapping = {i: forward[j] for i, j in mapping.items() if j in forward}

    replacements = {mapping[i]: text for i, text in edits.items() if i in mapping}
    drops = sorted({mapping[i] for i in deleted if i in mapping}, reverse=True)

    for j, text in replacements.items():
        derived_blocks[j]["text"] = text
    for j in drops:
        del derived_blocks[j]
    for i, block in enumerate(derived_blocks):
        block["idx"] = i + 1

    return {"changed": len(replacements), "removed": len(drops)}
