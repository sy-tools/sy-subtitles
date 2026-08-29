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

A RE-CUT — the same words re-split across the same number of blocks, when a
reviewer nudges a word across a boundary — travels here too, and only here.
The transcript cannot carry it (it records no boundaries, and
`sync_srt_to_transcript` rightly refuses to treat a re-cut as an edit), so
without this channel a boundary fix strands on whichever video the reviewer
happened to be looking at, and the divergence then fails every later edit
that touches those blocks. A re-cut is placed as ONE unit or not at all:
half of it applied is a word moved off the screen with nothing to catch it.

The derived -> primary leg (`propagate_recuts_to_target`) runs AFTER the
text edits have reached the primary through the transcript, and compares
each candidate span against the primary's CURRENT text rather than the
source's baseline. A reviewer usually fixes the wording and the boundary in
the same blocks; such a span's own two sides do not join equal, but once
Step B has delivered the words, the primary holds them in the old cut and
what remains between the two windows IS a pure boundary move. A window that
does not hold the same words is an error, never a silent skip: the sync only
carries changes made on top of a derived video that was in sync with the
primary, and anything else needs the full pipeline.
"""

import difflib
from dataclasses import dataclass

from .sync_common import joined_text


def align_blocks(source_texts: list[str], target_texts: list[str]) -> dict[int, int]:
    """Source block index -> target block index, for blocks that correspond.

    Correspondence means the two blocks hold the same text. A `replace` opcode
    is difflib reporting that it found none; pairing one up because its two
    sides happen to be the same length declares a correspondence nobody
    established, and propagation then writes the primary's text over a derived
    block that says something else. An equal-length `replace` is still walked,
    but only the positions whose text actually matches are kept — difflib
    emits such a run when a region differs, and identical blocks can sit
    inside it.
    """
    mapping: dict[int, int] = {}
    matcher = difflib.SequenceMatcher(None, source_texts, target_texts, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1):
                mapping[i1 + k] = j1 + k
        elif tag == "replace" and (i2 - i1) == (j2 - j1):
            for k in range(i2 - i1):
                if source_texts[i1 + k] == target_texts[j1 + k]:
                    mapping[i1 + k] = j1 + k
    return mapping


@dataclass(frozen=True)
class Recut:
    """One boundary move: the same words, re-split across the same N blocks.

    `start` indexes the first block in the SOURCE video's old cut. The two
    tuples are the same length (N >= 2). For a unit `extract_recuts` proves,
    they join to the same string — that equality is what makes it a re-cut
    rather than an edit. For a CANDIDATE unit (`_candidate_units`) they need
    not: the reviewer may have fixed the wording in the same blocks, and the
    re-cut equality is then established against the target's current text.
    """

    start: int
    old_texts: tuple[str, ...]
    new_texts: tuple[str, ...]


def _recuts_in_run(old_run: list[str], new_run: list[str], offset: int) -> list[Recut]:
    """The re-cut units inside one equal-count `replace` run.

    difflib reports a maximal run of changed blocks as ONE opcode, so a
    boundary fix arrives bundled with any ordinary edit that happens to sit
    beside it — in PR #1001 the re-cut of blocks 178/179 and a wording change
    three blocks later came through as a single `replace`. Testing the whole
    run for joined-equality therefore misses the re-cut entirely. Each unit is
    instead found on its own: the SHORTEST span from a moved block whose two
    sides join to the same words, which is the span whose boundaries actually
    moved and nothing more.
    """
    recuts: list[Recut] = []
    k, n = 0, len(old_run)
    while k < n:
        if old_run[k] == new_run[k]:
            k += 1
            continue
        found = None
        for end in range(k + 2, n + 1):
            # A unit has to END on a block that moved too, or an untouched
            # neighbour gets swept in and the unit reads wider than it is.
            if old_run[end - 1] == new_run[end - 1]:
                continue
            if joined_text(old_run[k:end]) == joined_text(new_run[k:end]):
                found = end
                break
        if found is None:
            k += 1  # an ordinary edit; it reaches the other videos as text
            continue
        recuts.append(Recut(offset + k, tuple(old_run[k:found]), tuple(new_run[k:found])))
        k = found
    return recuts


def _uneven_replace_error(i1: int, i2: int, new_count: int) -> dict:
    """The merge/split refusal: joined-equal sides with different block counts."""
    shape = "merge" if (i2 - i1) > new_count else "split"
    return {
        "error": (
            f"blocks {i1 + 1}–{i2} are a {shape} ({i2 - i1} block(s) became {new_count}), not a re-cut — "
            f"the resulting subtitle needs a timecode that no video measured. Run the full pipeline."
        )
    }


def extract_recuts(old_texts: list[str], new_texts: list[str]) -> tuple[list[Recut], dict | None]:
    """The re-cuts in a diff, or why one of them cannot travel.

    A re-cut is the same words re-split across the same number of blocks;
    everything else belongs to the text path, which reaches the other videos
    through the transcript. A joined-equal run whose two sides have DIFFERENT
    block counts is a merge or a split, and both are refused: the cue a merged
    subtitle would need (`start` of the first, `end` of the last) and the
    boundary a split would need exist in no data source, and `check_writes`
    forbids inventing either.
    """
    recuts: list[Recut] = []
    matcher = difflib.SequenceMatcher(None, old_texts, new_texts, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag != "replace":
            continue
        old_slice, new_slice = old_texts[i1:i2], new_texts[j1:j2]
        if (i2 - i1) == (j2 - j1):
            recuts.extend(_recuts_in_run(old_slice, new_slice, i1))
            continue
        if joined_text(old_slice) == joined_text(new_slice):
            return [], _uneven_replace_error(i1, i2, j2 - j1)
        # An uneven run that is not joined-equal is a structural change the
        # text path reports on; _primary_edits raises it with its own message.
    return recuts, None


def _primary_edits(
    primary_old: list[str], primary_new: list[str]
) -> tuple[dict[int, str], list[int], list[Recut], dict | None]:
    """What changed on the primary: {old index: new text}, deletions, re-cuts."""
    recuts, err = extract_recuts(primary_old, primary_new)
    if err:
        return {}, [], [], err
    # Blocks a unit owns are carried whole; counting them again as independent
    # per-block edits would apply half a boundary move on its own.
    covered = {i for r in recuts for i in range(r.start, r.start + len(r.old_texts))}

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
                if (i1 + k) in covered:
                    continue
                if primary_old[i1 + k] != primary_new[j1 + k]:
                    edits[i1 + k] = primary_new[j1 + k]
        else:
            return (
                {},
                [],
                [],
                {
                    "error": (
                        f"the primary's block structure changed ({i2 - i1} block(s) became {j2 - j1}) — "
                        f"a derived video has no timecode for text that was never on it. "
                        f"Run the full pipeline."
                    )
                },
            )
    return edits, deleted, recuts, None


def _carried_mapping(source_old: list[str], target_old: list[str], current: list[str]) -> dict[int, int]:
    """Source index -> index in the target's CURRENT blocks.

    The correspondence is taken from the two BASELINE texts, so an edit does
    not break the alignment it is supposed to travel along. When the target
    changed structurally in this PR too (the human edited it, or it is
    unreadable), the correspondence is carried forward onto what is actually
    there now rather than indexing into a shape that no longer exists.
    """
    mapping = align_blocks(source_old, target_old)
    if len(target_old) != len(current):
        forward = align_blocks(target_old, current)
        mapping = {i: forward[j] for i, j in mapping.items() if j in forward}
    return mapping


def _target_window(recut: Recut, mapping: dict[int, int], n_target: int) -> tuple[int, int]:
    """The half-open range on the target where this unit's blocks must sit.

    Read off the unit's MAPPED NEIGHBOURS, never off the unit's own indices:
    once the target already carries the new cut, its blocks no longer match
    the source's old ones and map nowhere — which is agreement, not absence.
    """
    start, n = recut.start, len(recut.old_texts)
    before = [i for i in mapping if i < start]
    after = [i for i in mapping if i >= start + n]
    lo = mapping[max(before)] + 1 if before else 0
    hi = mapping[min(after)] if after else n_target
    return (lo, hi) if hi >= lo else (lo, lo)


def _unpaired_stream(current: list[str], taken: set[int]) -> str:
    """The target's unaccounted-for blocks, as the screen shows them.

    Consecutive blocks are joined into one run so the search sees text the way
    it is read: the other cut can SPLIT a block as easily as merge two, and
    looking inside single blocks only ever caught the merge. Runs are kept
    apart, so no match may span blocks that are not adjacent.
    """
    runs, run, prev = [], [], None
    for j, text in enumerate(current):
        if j in taken:
            continue
        if prev is not None and j != prev + 1:
            runs.append(run)
            run = []
        run.append(" ".join(text.split()))
        prev = j
    if run:
        runs.append(run)
    return "\n".join(" ".join(r) for r in runs)


def _place_recuts(
    recuts: list[Recut], mapping: dict[int, int], current: list[str]
) -> tuple[list[tuple[int, Recut]], int, set[int], dict | None]:
    """Decide each unit's fate: apply here, already done, absent, or refuse.

    Returns (placements, skipped, claimed target indices, error). A placement
    is (target index of the unit's first block, the unit).

    The anchor window is scanned position by position, never judged
    wholesale: a divergent block sitting next to the unit is unmapped, so the
    window grows past the unit (1988-05-08_Sahasrara-Puja diverges in 123 of
    382 blocks), and the widened window would otherwise red a PR whose
    re-cut never touched the divergent block.
    """
    placements: list[tuple[int, Recut]] = []
    claimed: set[int] = set()
    absent: list[Recut] = []

    def refuse(recut: Recut, window: list[str]) -> tuple[list, int, set, dict]:
        return (
            [],
            0,
            set(),
            {
                "error": (
                    f"a re-cut of {len(recut.old_texts)} block(s) cannot be placed: this video reads "
                    f"«{joined_text(window)[:60]}» where the change expects "
                    f"«{joined_text(recut.old_texts)[:60]}». Placing the boundary would be a guess, and "
                    f"applying part of it would move a word off the screen. Run the full pipeline."
                )
            },
        )

    for recut in recuts:
        n = len(recut.new_texts)
        lo, hi = _target_window(recut, mapping, len(current))
        wanted = joined_text(recut.new_texts)  # == joined(old_texts): these units are proven re-cuts
        offsets = [j for j in range(lo, hi - n + 1) if joined_text(current[j : j + n]) == wanted]
        exact_new = [j for j in offsets if current[j : j + n] == list(recut.new_texts)]
        if not offsets:
            if any(i in mapping for i in range(recut.start, recut.start + n)):
                # Part of the unit is on this video (an excerpt often ends
                # mid-unit) but the whole unit does not fit — applying the
                # part alone would take the moved word off the screen.
                return refuse(recut, current[lo:hi])
            absent.append(recut)
            continue
        if len(offsets) > 1 and exact_new != offsets:
            return refuse(recut, current[lo:hi])
        j = offsets[0]
        if j in exact_new:
            claimed.update(range(j, j + n))  # already re-cut: agreement, not conflict
        elif current[j : j + n] == list(recut.old_texts):
            placements.append((j, recut))
            claimed.update(range(j, j + n))
        else:
            # The same words under a THIRD cut: neither the old boundary nor
            # the new one. Following it would be a guess.
            return refuse(recut, current[j : j + n])

    # An absent unit is only safe to skip when the video genuinely lacks those
    # words — an excerpt cut is often a strict subset. If the words ARE on it,
    # under some cut this alignment could not pair up, skipping would drop a
    # reviewer's work under a green check.
    unpaired = _unpaired_stream(current, set(mapping.values()) | claimed)
    for recut in absent:
        if joined_text(recut.old_texts) in unpaired:
            return (
                [],
                0,
                set(),
                {
                    "error": (
                        f"a re-cut has no counterpart on this video, yet its words are on it under a different "
                        f"cut (e.g. «{joined_text(recut.old_texts)[:60]}»). Placing the boundary would be a "
                        f"guess. Run the full pipeline."
                    )
                },
            )
    return placements, len(absent), claimed, None


def _apply_recuts(placements: list[tuple[int, Recut]], blocks: list[dict]) -> int:
    """Write the placed units. Only `text` moves; every cue stays where it is."""
    changed = 0
    for lo, recut in placements:
        for k, text in enumerate(recut.new_texts):
            if blocks[lo + k]["text"] != text:
                blocks[lo + k]["text"] = text
                changed += 1
    return changed


def _candidate_units(source_old: list[str], source_new: list[str]) -> tuple[list[Recut], dict | None]:
    """Every span that COULD carry a boundary move: equal-count changed runs.

    Unlike `extract_recuts`, joined-equality of the source's own two sides is
    not required — a reviewer who fixed the wording and the boundary in the
    same blocks produced a span whose sides do not join equal, yet whose
    boundary move still has to travel. Whether a unit really is a re-cut is
    decided against the TARGET's current text, in `_match_candidates`. A
    single changed block is never a candidate: one block has no boundary to
    move, and its text travels through the transcript.
    """
    units: list[Recut] = []
    matcher = difflib.SequenceMatcher(None, source_old, source_new, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag != "replace":
            continue
        if (i2 - i1) != (j2 - j1):
            if joined_text(source_old[i1:i2]) == joined_text(source_new[j1:j2]):
                return [], _uneven_replace_error(i1, i2, j2 - j1)
            continue  # a structural change; the text path reports it
        old_run, new_run = source_old[i1:i2], source_new[j1:j2]
        k, n = 0, len(old_run)
        while k < n:
            if old_run[k] == new_run[k]:
                k += 1
                continue
            end = k
            while end < n and old_run[end] != new_run[end]:
                end += 1
            if end - k >= 2:
                units.append(Recut(i1 + k, tuple(old_run[k:end]), tuple(new_run[k:end])))
            k = end
    return units, None


def _match_candidates(
    units: list[Recut], mapping: dict[int, int], current: list[str]
) -> tuple[list[tuple[int, Recut]], dict | None]:
    """Where each candidate unit sits on the target as it stands NOW.

    The anchor window can be wider than the unit — a block that diverges next
    to it is unmapped, so the window grows past it (1988-05-08_Sahasrara-Puja
    diverges in 123 of 382 blocks) — and judging the window wholesale would
    red a PR whose edit never touched the divergent block. The unit's words
    are instead looked for at every in-window position. Exactly one
    joined-equal position either already carries the new cut (agreement) or
    receives it whole; none means the target does not hold these words — the
    two videos were not in sync to begin with, which the sync cannot repair;
    several would make placement a guess, and a guessed boundary is a word
    moved off the screen.
    """
    placements: list[tuple[int, Recut]] = []
    claimed: set[int] = set()
    for unit in units:
        n = len(unit.new_texts)
        lo, hi = _target_window(unit, mapping, len(current))
        wanted = joined_text(unit.new_texts)
        offsets = [j for j in range(lo, hi - n + 1) if joined_text(current[j : j + n]) == wanted]
        exact = [j for j in offsets if current[j : j + n] == list(unit.new_texts)]
        if not offsets:
            return [], {
                "error": (
                    f"a re-cut of {n} block(s) cannot be placed: this video reads "
                    f"«{joined_text(current[lo:hi])[:60]}» where the re-cut leaves «{wanted[:60]}». "
                    f"The two videos were not in sync to begin with — the sync only carries changes "
                    f"made on top of an agreeing cut. Run the full pipeline."
                )
            }
        if len(offsets) > 1 and exact != offsets:
            return [], {
                "error": (
                    f"a re-cut of {n} block(s) cannot be placed: its words occur more than once inside "
                    f"the target window («{wanted[:60]}»), so placing the boundary would be a guess. "
                    f"Run the full pipeline."
                )
            }
        if exact:
            claimed.update(range(exact[0], exact[0] + n))
            continue  # the target already carries the new cut: agreement
        j = offsets[0]
        if claimed & set(range(j, j + n)):
            return [], {
                "error": (
                    f"two re-cut units contend for the same target blocks around «{wanted[:60]}» — "
                    f"placing either would be a guess. Run the full pipeline."
                )
            }
        placements.append((j, unit))
        claimed.update(range(j, j + n))
    return placements, None


def propagate_recuts_to_target(
    source_old: list[str],
    source_new: list[str],
    target_old: list[str],
    target_blocks: list[dict],
) -> dict:
    """Carry the boundary moves of `source` onto `target_blocks`, in place.

    The derived -> primary leg. It runs AFTER Step B, so each candidate span
    is compared against the target's CURRENT text: by then the target holds
    the PR's new words in its old cut, the edited video holds the same words
    in the new cut, and what remains between the two windows is a pure
    re-cut. That is what lets a boundary move survive a wording change made
    in the same blocks — the span's own two sides need not join equal, the
    window and the unit must.

    Text edits still do not travel here: a single changed block is never a
    candidate, and a candidate whose words already sit on the target in the
    same cut is agreement. A window that holds OTHER words is an error, not
    a skip — the sync only carries changes made on top of a derived video
    that was in sync with the primary.

    Returns {"recut": units applied} or {"error": ...}.
    """
    units, err = _candidate_units(source_old, source_new)
    if err:
        return err
    if not units:
        return {"recut": 0}

    current = [b["text"] for b in target_blocks]
    mapping = _carried_mapping(source_old, target_old, current)
    placements, err = _match_candidates(units, mapping, current)
    if err:
        return err

    _apply_recuts(placements, target_blocks)
    return {"recut": len(placements)}


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

    Re-cuts travel as whole units alongside the per-block edits; a unit the
    derived video already carries is agreement, and counts as neither.

    Returns {"changed": n, "removed": n, "skipped": n} or {"error": ...}.
    """
    edits, deleted, recuts, err = _primary_edits(primary_old, primary_new)
    if err:
        return err
    if not edits and not deleted and not recuts:
        return {"changed": 0, "removed": 0, "skipped": 0}

    current = [b["text"] for b in derived_blocks]
    mapping = _carried_mapping(primary_old, derived_old, current)

    # Re-cuts resolve first: a unit the derived video already carries occupies
    # blocks that match neither cut's neighbours, and leaving them unaccounted
    # for would make the stranded check below read them as loose text.
    placements, recut_skipped, claimed, err = _place_recuts(recuts, mapping, current)
    if err:
        return err

    # A change with no counterpart is only safe to skip when the derived video
    # genuinely lacks that content — a Talk cut is often a strict excerpt, and
    # most of the primary is legitimately missing from it. What is NOT safe is
    # finding the very text on the derived side in a block the alignment could
    # not pair up: the two cuts split it differently, so the change belongs
    # there and skipping drops a human's work under a green check.
    #
    # Looked for only among UNMAPPED blocks — a short line like «Гаразд.»
    # recurs all over a talk, and a mapped block is already accounted for.
    unpaired = _unpaired_stream(current, set(mapping.values()) | claimed)

    # Deletions count too. A block the human removed from the primary has to
    # leave the derived video with it, and an unplaceable deletion used to
    # vanish without even a count — leaving the removed sentence on screen for
    # good, where no later run can notice it is stale.
    stranded = [
        i
        for i in sorted(set(edits) | set(deleted))
        if i not in mapping and " ".join(primary_old[i].split()) in unpaired
    ]
    if stranded:
        first = primary_old[stranded[0]]
        return {
            "error": (
                f"{len(stranded)} changed block(s) have no counterpart on the derived video, yet their text "
                f"is on it under a different cut (e.g. «{first[:60]}»). Placing the change would be a guess, "
                f"and skipping it would lose a human's work. Run the full pipeline."
            )
        }

    replacements = {mapping[i]: text for i, text in edits.items() if i in mapping}
    drops = sorted({mapping[i] for i in deleted if i in mapping}, reverse=True)

    # Re-cuts and replacements both address pre-deletion indices, so they are
    # written before any block is dropped.
    changed = _apply_recuts(placements, derived_blocks)
    for j, text in replacements.items():
        derived_blocks[j]["text"] = text
    changed += len(replacements)
    for j in drops:
        del derived_blocks[j]
    for i, block in enumerate(derived_blocks):
        block["idx"] = i + 1

    # Skips are legitimate — an excerpt cut simply lacks most of the primary —
    # but a `derived` video is meant to mirror it, so a change that did not
    # arrive has to be visible to whoever reads the run. Deletions are counted
    # alongside replacements: "removed 0" reads as "nothing to remove", which
    # is exactly what an unplaceable deletion is not.
    skipped = (len(edits) - len(replacements)) + (len(deleted) - len(drops)) + recut_skipped
    return {"changed": changed, "removed": len(drops), "skipped": skipped}
