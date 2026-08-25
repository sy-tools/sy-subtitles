# Subtitle Sync Redesign — Phase 2

**Spec:** `docs/subtitle-sync-redesign.md` · **Phase 1 plan:** `docs/subtitle-sync-redesign-plan.md`

Phase 1 (PR #990) made the sync idempotent, atomic, and gave it one declared
role model. It did not change *how* text travels between a talk's videos —
that is this phase.

> **What this document is.** Phase 1 shipped a step-by-step plan because it
> was written to be handed to a fresh engineer. This phase was executed
> inline by its author, so what follows is the design each task was built
> against — interfaces, obligations, and the tests that must prove them —
> rather than a keystroke-level script. Every task was still built test-first.

## Global constraints

Unchanged from phase 1: TDD, English in code artifacts, one PR per task,
no merge without explicit approval, work in a worktree, never suppress a
check to make something pass, no approximate timing ever, `site/` changes
need `pytest -m smoke` plus a real browser.

---

## Task 4 — Positional propagation and the invariant gate

**Why.** Today every video's SRT is reconciled with the transcript by
character diff. For a `derived` video that is the wrong instrument: its text
is the primary's text, and the primary is right there. Going through the
transcript means a `derived` video can only be fixed if the edit happens to
map cleanly onto its own block cut.

**Files.** `tools/sync_plan.py` (propagation), `tools/sync_invariants.py`
(new), `tools/sync_pr.py` (`_plan_talk` calls both).

**Design.**

- `propagate_primary_to_derived(primary_blocks, derived_blocks) -> list | dict`
  aligns the two block lists with `difflib.SequenceMatcher` opcodes over
  block *texts* and substitutes **positionally**. Never a text search: 51 of
  165 SRTs contain duplicate block texts, so "replace wherever it appears"
  is a corruption vector.
- `equal` → nothing. `replace` with equal counts → substitute pairwise.
  `delete` → drop those blocks from the derived SRT. `insert`, and `replace`
  with unequal counts → **fail the run**. New text has no timing, and timing
  is never invented.
- `tools/sync_invariants.py` checks the *planned* content, not the disk:

  | | |
  |---|---|
  | **I1** | Every `derived` video's block texts equal the primary's under the alignment. |
  | **I2** | Every subtitled video's text is preserved in the transcript. |
  | **I3** | No video gained blocks. |
  | **I4** | No timecode moved; blocks may only be dropped. |

  **As built, the gate enforces I3 and I4 only.** I1 holds by construction —
  a derived block is only ever written by copying the primary's text at the
  aligned index, so a separate check could catch nothing but a coding bug in
  ten lines of code. I2 is already run per video by `validate_subtitles`
  inside the plan; promoting it to a gate would have blocked syncs on legacy
  divergence rather than on anything this run did, which is the opposite of
  what a gate is for. I3 and I4 are the ones with teeth: they make "timing is
  never invented" structural instead of a convention.

- The gate runs on the merged plan, before `apply_plan`. A violation is a
  failure, so nothing is written — phase 1's atomicity carries it.

**Must prove.** Positional substitution survives duplicate block texts;
deletions propagate; an insert fails instead of inventing timing; I2 catches
a plan that would drop transcript text; each invariant fails the gate on a
crafted violation.

---

## Task 5 — Multi-island `_find_diff`

**Why.** `_find_diff` trims a common prefix and a common suffix and calls
whatever is left "the change". Two edits in one paragraph therefore produce
one fragment spanning everything between them — in a 19k-character paragraph
that is a 12k-character fragment that exists in no single subtitle block, so
the run fails. This is load-bearing for `independent` videos, which have no
primary to mirror and must go through the transcript.

**Files.** `tools/sync_transcript_to_srt.py`.

**Design.**

- `find_diff_islands(old, new, min_len=3) -> list[(old_frag, new_frag, offset)]`
  built on `SequenceMatcher(...).get_opcodes()`. Non-equal opcodes separated
  by a short equal run merge into one island; each island grows context until
  its old fragment is at least `min_len` long, matching what the single-region
  version did.
- `sync_transcript` locates every island of every changed paragraph against
  the *pristine* blocks, then applies them grouped by block, **right to left**,
  so an earlier replacement cannot shift a later island's offset.

**Must prove.** Twelve edits in one paragraph produce twelve locatable
fragments, not one span; two islands landing in the same block both apply;
a single-edit paragraph behaves exactly as before.

---

## Task 6 — Omit-aware transcript lookups

**Why.** `sync_srt_to_transcript` reads the transcript raw, but subtitle
blocks were built from the omit-stripped text. A block reading `A B` cannot
be found in a transcript reading `A (сміх) B`, and the run fails. Measured
across the corpus: 2 talks, 6 blocks — one of them `1992-07-19_Guru-Puja`,
which is under active editing.

**Files.** `tools/sync_common.py`, `tools/sync_srt_to_transcript.py`.

**Design.**

- `strip_with_map(text, phrases) -> (stripped, offsets)` — the omit-stripped
  view plus, for every character in it, the index it came from in the raw
  text.
- Lookups run in stripped space; splices translate back to raw and rewrite
  only the changed islands (task 5's), so a remark that sits outside an
  island survives. An island that *contains* a remark is ambiguous and fails
  the run rather than guessing.

**Must prove.** `A B` is found in `A (сміх) B`; editing around a remark
leaves it in place; removing a remark from an SRT still never travels back.

---

## Task 7 — SPA role controls

**Why.** The declarations exist; nothing in the UI writes them, so every new
multi-video talk starts unresolvable.

**Files.** `site/js/add_talk_data.js`, `site/index.html`,
`site/styleguide.html`.

**Design.** A per-video role control offering all four roles. Default is
name-only, from the video titles the form already has: the first video whose
slug does not look like a `Talk` cut is `primary`, the rest `derived`. No
subtitle detection — at add-talk time the talk has no subtitles at all.
`buildMetaYaml` serialises `sync:` per video. A single-video talk emits
nothing, matching the resolver's implicit case.

**Must prove.** All four roles selectable; the default lands primary/derived
in amruta's order; `sync:` serialised per video; the control has a
styleguide entry; `pytest -m smoke` green and the page opened in a browser.

---

## Task 8 — Convert the remaining call sites

**Why.** Two copies of the whisper heuristic still live in
`subtitle-pipeline.yml` (lines ~596 and ~1044) and disagree with each other:
one falls back to `meta['videos'][0]` with a warning, the other does not.
`build_secondary_srts` takes `--primary-slug` from outside.

**Files.** `.github/workflows/subtitle-pipeline.yml`,
`tools/build_secondary_srts.py`.

**Design.** Both heuristic copies call `python -m tools.video_roles
--talk-dir ... --role primary`. `build_secondary_srts` resolves roles itself
and builds the `derived` list; `--primary-slug` stays only as an override.
`build_manifest.yaml`'s `role` becomes output, never input.

**Must prove.** Neither heuristic remains in the workflow; the pipeline
resolves the primary without `whisper.json` existing; `build_secondary_srts`
builds exactly the `derived` videos and skips `independent` and `ignored`.
