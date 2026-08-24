# Subtitle sync redesign

Status: approved design, not yet implemented
Date: 2026-08-24

## 1. Problem

`sync-subtitles.yml` reconciles a talk's `transcript_uk.txt` with the
`final/uk.srt` of each of its videos after a reviewer edits subtitles in
the SPA. It has never completed successfully: every recent run is either
`skipped` (draft PR) or `failure`. Worse, failing runs still push, so
`main` accumulates talks whose transcript and subtitles disagree.

Observed on PR #962 (`1989-05-06_Sahasrara-Puja-Jump-Into-the-Ocean-of-Joy`):

- Run 1 applied 12 edits to the transcript, failed to propagate them to the
  second video, and pushed the transcript anyway (commit `72755c6f`).
- Run 2, triggered by a merge of `main` into the branch, failed before doing
  anything, because the transcript already contained those 12 edits.

## 2. Root causes

**R1 — one edit per paragraph.** `tools/sync_transcript_to_srt.py:52`
(`_find_diff`) computes a single contiguous changed region per paragraph:
common prefix, common suffix, everything between is "the fragment". Twelve
separate edits inside one paragraph produce one fragment spanning all of
them. Measured on the failing talk: paragraph 19,446 chars, fragment 12,563
chars. No SRT block (max 84 chars) can contain it, so the propagation errors
with `cannot find «…» in SRT blocks`.

**R2 — all-or-nothing per talk.** `tools/sync_pr.py:180` returns as soon as
Step A fails, before Step B, so no video receives forward-sync at all.

**R3 — non-idempotent baseline.** `tools/sync_pr.py:62` diffs from
`pull_request.base.sha`. Once the bot has committed, any later
`synchronize` replays already-applied edits.

**R4 — partial pushes.** `.github/workflows/sync-subtitles.yml:53` commits
with `if: always()`, deliberately pushing partial progress on failure.

**R5 — two-dot diff against a non-ancestor.** `tools/sync_pr.py:62` uses
`git diff BASE HEAD`, not `merge-base`. When `BASE` is not an ancestor of
`HEAD`, unrelated talks that moved on `main` appear as reversed changes and
the tool actively un-edits and commits them.

**R6 — Step A reads the raw transcript.** `tools/sync_srt_to_transcript.py:80`
does a plain `open().read()` instead of going through `load_transcript`. A
subtitle block reading `A B` cannot be found in a transcript reading
`A (сміх) B`. 31 transcripts contain 86 declared omit phrases, so this is a
permanent red for those talks.

**R7 — Step A deletes declared remarks from the transcript.** The delete
branch (`tools/sync_srt_to_transcript.py:187`, via `delete_from_text`,
`tools/sync_common.py:53`) removes the remark from the transcript when a
reviewer removes it from the SRT. Policy (`glossary/subtitle_omit.yaml`)
is that remarks stay in the transcript and never reach the screen.

**R8 — no concurrency control.** `sync-subtitles.yml` has no `concurrency:`
group. Overlapping runs race on `git push`.

## 3. Corpus facts the design rests on

Measured across `talks/`:

- 62 secondary videos. Aligning each one's block list onto its talk's
  primary with `difflib.SequenceMatcher`: **60 of 62 align >= 99% of their
  blocks**. The 2 exceptions are `2000-07-23_Guru-Puja-Shraddha`'s two
  after-puja talks.
- Those 2 exceptions are *not* outside the system: the talk's transcript
  contains 23 of 24 and 16 of 16 of their blocks verbatim.
- **9 multi-video talks do not have exactly one `role: primary`**: eight
  have no `build_manifest.yaml` at all (legacy), and
  `2000-07-23_Guru-Puja-Shraddha` has three. `build_manifest.yaml` is a
  build artifact and cannot carry this model.
- **51 of 165 SRT files contain duplicate block texts** (161 duplicated
  blocks; repeated mantras). Text-matching substitution is unsafe;
  substitution must be positional.
- `sync_pr` runtime for 3 talks: 0.5 s. GitHub job setup: 17 s. Max videos
  per talk: 4. A per-video job matrix would cost 40x its own work and break
  atomicity; it is rejected.

## 4. Derivation model

The talk's `meta.yaml` becomes the source of truth for how each video
participates in sync. Each entry under `videos:` gains a `sync:` key:

```yaml
videos:
- slug: Guru-Puja
  title: Guru Puja
  video_ref: r1...
  sync: primary
- slug: Guru-Puja-Talk-Gravity
  title: 'Guru Puja Talk: Gravity'
  video_ref: r1...
  sync: derived
```

| value | meaning |
|---|---|
| `primary` | Authoritative subtitle text for the talk. Exactly one per talk. Syncs both ways with the transcript. |
| `derived` | Text mirrors the primary positionally; its own timing is never touched by sync. |
| `independent` | Its own cut of the text (e.g. an after-puja talk). Syncs both ways with the transcript directly, never against the primary. |
| `ignored` | Never read, never written by sync. |

This model is not new. It already exists implicitly, guessed afresh in
three places that disagree: `subtitle-pipeline.yml:604` picks the primary by
whichever video has the most words in `whisper.json` (falling back to the
first video); `tools/build_secondary_srts.py` takes `--primary-slug` as a
CLI argument from outside; `build_manifest.yaml` records the role after the
fact as build provenance and is read only by `manifest_validate_flags`; and
`tools/sync_pr.py` does not know about it at all, treating every SRT as an
equal source of truth. That is why one talk carries three `role: primary`
manifests and eight legacy talks carry none. Declaring it in `meta.yaml`
moves an existing implicit fact into one explicit place that is available
before a build, survives legacy talks, and is editable by a human.

Every one of those places is converted to read the declaration in this
work — see section 14. One mechanism, one source.

Resolution rules:

- A talk with exactly one video that has a `final/uk.srt` treats it as
  `primary` implicitly; `sync:` may be omitted.
- A talk with more than one such video MUST declare `sync:` on every video.
  A missing declaration is a hard error naming the talk and the videos, not
  a guess.
- `build_manifest.yaml` keeps its current job (build provenance and
  validate flags). It is never consulted for the sync model.

The 9 talks identified above are filled in by hand as part of this work.
N is small and fixed; a script would add risk without saving effort.

All four values are selectable in the SPA (see section 10). `independent`
is rare but real — `2000-07-23_Guru-Puja-Shraddha`'s two after-puja talks
share no text with the primary yet have 23/24 and 16/16 of their blocks in
the transcript verbatim — so hiding it behind hand-editing would make the
common way to handle that case (`ignored`) silently lose those subtitles
from every future transcript edit.

## 5. Baseline: what counts as a human edit

The unit of truth is **what changed after the last bot sync**, not what
changed since the PR base.

```
baseline:
  1. Search `git log --first-parent HEAD ^origin/main` for the newest commit
     that is authored by github-actions[bot] AND carries the trailer
     `Sync-Bot: v1`. If found, that commit is the baseline.
  2. Otherwise, baseline = `git merge-base origin/main HEAD`.
```

Both conditions are required in step 1: the first-parent walk bounded by
`^origin/main` keeps bot commits that arrived via a merge from `main`
(belonging to other PRs) out of the search, and the trailer plus author
check stops a human-typed message from being mistaken for a marker.

`pull_request.base.sha` and the two-dot diff are removed (R5).

**Missing marker after a rebase or force-push.** History can lose the
marker while keeping the bot's tree. Diffing from the merge-base then
presents a stale bot write as a human edit; if the reviewer has since
reverted the primary by hand, the sync would push the bot's old wording
back over the revert, silently. Mitigation: when no marker is found, run the
section 7 invariants first. If they all pass, the state is already
consistent and the correct action is **nothing to do**. Only files that
fail an invariant are diffed and propagated. This narrows but does not
eliminate the window; the residual risk is accepted and recorded here.

**Concurrency.** Add to the workflow:

```yaml
concurrency:
  group: sync-pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

A non-fast-forward `git push` means another run superseded this one. It
exits **neutral**, not failed.

## 6. Propagation

Sources are the files changed between baseline and HEAD, restricted to
`talks/*/transcript_uk.txt` and `talks/*/*/final/uk.srt`.

```
Step A   edited SRT -> transcript
         Applies to primary and independent videos. An edited *derived*
         SRT is first normalised onto the primary positionally, then
         treated as a primary edit.

Step B   transcript -> SRT
         Applies to primary and independent videos. Uses the multi-island
         _find_diff (section 8).

Step C   primary -> derived
         Positional block substitution. Not a text search.
```

**Step C is positional, always.** Align `primary_blocks` to
`derived_blocks` once with `difflib.SequenceMatcher`, then substitute
through the resulting opcodes. The phrase "substitute wherever the block
appears" is explicitly rejected: 51 of 165 SRTs contain duplicate block
texts, and `tools/sync_transcript_to_srt.py:157` already treats a multi-hit
match as an error for this reason.

**Block-count changes.** Step C may propagate a deletion (drop the aligned
block, leave the gap). An insert or a split cannot be propagated, because
the derived video's timing for new blocks would have to be invented, which
`feedback_no_proportional` forbids. Those cases red the run, matching the
shape `tools/sync_srt_to_transcript.py:211` already uses for inserts.

**Conflict rule.** Multiple SRT sources merge block-wise; a conflict exists
only when the same aligned block was changed differently. Transcript and
SRT edited in the same window: disjoint edits both apply; overlapping edits
are a conflict. Any conflict is a red check with nothing pushed.

**No-op detection is not implemented.** With a correct baseline a replay
cannot happen, so it would defend nothing; without one it converts a
baseline bug into a silent success. Already-applied edits must surface as
red (`feedback_no_symptom_bypass`).

## 7. The gate: end-state invariants

The fixed-point idea (re-run the planner over its own output) is dropped:
it compares the code against itself and proves nothing. The commit is gated
on properties of the resulting files instead.

- **I1 — derived mirror.** For every `derived` video: its block list is a
  subsequence of the primary's, and every block equals its positionally
  aligned primary block.
- **I2 — transcript preservation.** For the primary and every
  `independent` video, `check_text_preservation`
  (`tools/validate_subtitles.py:91`) passes. Call it **directly**, not
  through `manifest_validate_flags`, which sets `skip_text_check=True` for
  every `role: secondary` (`tools/validate_subtitles.py:351`) and would
  validate the bot's own text writes with a text-blind check.
- **I3 — remarks preserved.** Every declared omit phrase present in the
  baseline transcript is still present (R7).
- **I4 — CPL.** No written block exceeds `MAX_CPL`.

## 8. Correctness fixes carried by this work

**Multi-island `_find_diff` (R1).** Return a list of change islands per
paragraph instead of one span, each independently located and applied. This
is load-bearing, not optional: `independent` videos have no primary to
mirror, so the transcript leg is their only path.

**Omit-aware Step A (R6).** Search the `load_transcript`-stripped stream
with an offset map back into the raw text, and splice edits through that
map. Declared remarks are never the target of a delete originating from an
SRT-side removal (R7).

**Plan-phase purity.** `sync_srt_to_transcript` also rewrites its *source*
SRT in place to renumber (`tools/sync_srt_to_transcript.py:233`). The plan
must capture that write rather than perform it.

**Structural pre-check.** `tools/srt_utils.py:40` silently drops malformed
blocks, so a mangled SPA edit currently surfaces as a phantom deletion. Red
on a structurally invalid SRT instead.

## 9. Workflow shape

One job, four phases. No matrix.

```
1. Plan     compute every change in memory/tmp; the working tree is untouched
2. Report   Job Summary table: target | ok/fail | reason, plus ::error:: lines
3. Gate     any failure -> exit 1; tree is clean, so there is nothing to push
4. Commit   only on success: write files, one commit, one push
```

- `Commit and push` becomes `if: success()`; `if: always()` is removed (R4).
- The commit stages the plan's explicit path list, not today's globs
  (`sync-subtitles.yml:57`).
- The commit message carries the `Sync-Bot: v1` trailer (section 5) and
  keeps `[skip ci]`.
- `set +e` and the exit-code capture dance (`sync-subtitles.yml:47`) are
  deleted; with `if: success()` the step simply fails.
- Triggers stay `opened, synchronize, reopened, ready_for_review`.
  Restricting to `ready_for_review` was considered and rejected: it
  suppresses the symptom of R3 while leaving the cause, and `synchronize`
  is what lets a manual fix turn the check green.

## 10. SPA: declaring the model when a talk is added

The add-talk screen (`site/index.html` around line 7500, serialized by
`buildMetaYaml` in `site/js/add_talk_data.js:76`) gains per-video controls:

- one **primary** selection across the talk's videos (single choice),
- a per-video role for every other video: **derived**, **independent**, or
  **ignored**,
- the consequence of each choice stated in the UI rather than implied —
  `ignored` means transcript edits never reach that video's subtitles.

`buildMetaYaml` serializes the resulting `sync:` value per video. The
control is disabled until a primary is chosen, and choosing a primary is
required whenever the talk has more than one video, mirroring section 4's
resolution rules.

Per `CLAUDE.md`, the new control is built from existing design-system
tokens, ships a `site/styleguide.html` entry in the same change, has its
logic in `site/js/add_talk_data.js` under `node --test`, and the change is
verified with `pytest -m smoke` and by opening the page in a browser.

## 10.1 Auto-detecting the roles from existing material

The reviewer should not have to work the model out from scratch. The SPA
pre-selects the roles and the reviewer confirms or overrides them. The
proposal is never written without confirmation.

**When the talk already has subtitles** (any video with a `final/uk.srt`,
or `source/en.srt` when Ukrainian is not built yet) the proposal is
computed from the material, not guessed:

1. Parse each video's block texts.
2. Align every pair with an LCS over block texts (the JS twin of the
   `difflib.SequenceMatcher` measurement in section 3).
3. `primary` = the video whose block list is a superset of the greatest
   number of the others. Ties (identical block lists — multiple cameras or
   sources of the same recording) break toward the slug that does NOT
   contain `Talk`, then toward `meta.yaml` order.
4. `derived` = every video aligning >= 99% of its blocks onto the primary.
5. Everything else = `ignored`, flagged in the UI as "no shared text with
   the primary" so the reviewer can promote it to `independent` by hand if
   it carries its own slice of the transcript.

Validated against the 54 talks that currently declare a primary: rule 3
picks the declared primary in **49** cases, and the other **5 are ties**
where every candidate has an identical block list — the rule never
contradicts a declared primary, it only needs the tie-break. Rule 4
reproduces the 60-of-62 alignment measured in section 3.

**When the talk is new** there is no material: the add-talk screen has the
video titles and links, but no SRTs (those arrive later, via
`tools.download` in the pipeline). The proposal falls back to a name
heuristic — the video whose slug does not contain `Talk` is offered as
primary — and is labelled in the UI as a guess, not a detection. Across the
corpus only 1 of 54 declared primaries contains `Talk`, so the heuristic is
sound but it is still a guess and says so.

**One implementation, not two.** The detector lives in a single JS module
(`site/js/video_sync_roles.js`) under `node --test`. No Python twin is
written: the 9 existing talks are filled in by hand (small fixed N,
`feedback_small_n_prefer_manual`), using the SPA's proposal as the check.
A second implementation would be a normaliser-twin of the kind that already
bit this project.

## 11. Failure modes and the livelock question

Strict atomicity means one unsyncable video blocks every later edit to its
talk. That is accepted, because the two known chronic causes are removed
rather than tolerated:

- "cannot align" becomes configuration (`ignored` / `independent`), not a
  failure — section 4;
- the omit-phrase class disappears — section 8.

SPA edit-sync PRs target a single talk (`site/js/edit_sync.js:16`), so
per-run atomicity equals per-talk atomicity in practice. For a manual PR
touching several talks, a failure in one blocks the others; this is
intentional and is the meaning of "nothing is pushed".

No override mechanism ships in this work. If a genuinely stuck video
appears in practice, the escape hatch is an explicit, audited maintainer
action recorded on the PR (a label), never a partial push.

## 12. Testing

TDD throughout; each item is a failing test first.

- `tests/test_sync_pr.py`: run twice from the same baseline; run after a bot
  commit; merge of `main` into the branch; missing marker with consistent
  tree (expect "nothing to do"); missing marker with inconsistent tree;
  non-fast-forward push is neutral. The suite currently has no replay test
  at all, which is why R3 shipped.
- `tests/test_sync_transcript.py`: multiple islands in one paragraph; an
  island straddling a block boundary.
- `tests/test_sync_srt.py`: omit-aware lookup; removing a remark from the
  SRT leaves it in the transcript.
- New: positional Step C against an SRT with duplicate block texts; insert
  and split red; delete propagates.
- New: each invariant I1-I4 fails the gate on a crafted violation.
- `tests/test_sync_subtitles_workflow.py`: no `if: always()` on the push;
  `concurrency:` present; commit trailer present.
- `tests/test_add_talk_data.js`: `sync:` serialization for all four values.
- New `tests/test_video_sync_roles.js`: superset detection; tie-break on
  identical block lists; the 99% threshold; a video sharing no text lands in
  `ignored`; the name heuristic when no material is present.
- `tests/test_spa_boot_smoke.py` plus a browser check for the new control.
- Golden corpus (`GOLDEN_TALKS_SCOPE=all`) after the `meta.yaml` fill-in.
- New `tests/test_video_roles.py`: single-video implicit primary; missing
  declaration on a multi-video talk is a hard error; `ignored` and
  `independent` are excluded from derivation; the CLI's output shape.
- `tests/test_pipeline_*`: the pipeline resolves the primary without needing
  `whisper.json` to exist.

## 13. Rollout

Separate PRs, each leaving the system no worse than it found it:

1. Baseline, merge-base, concurrency (fixes R3, R5, R8).
2. Atomicity: plan / gate / commit (fixes R4, R2).
3. Derivation model in `meta.yaml` + fill in the 9 talks.
4. Positional primary -> derived propagation + invariant gate.
5. Multi-island `_find_diff` (fixes R1).
6. Omit-aware Step A and remark protection (fixes R6, R7).
7. SPA controls for all four roles + auto-detection (sections 10, 10.1).
8. Shared resolver `tools/video_roles.py`, plus the corpus comparison against
   today's heuristic (section 14).
9. Convert every call site to the resolver: both `subtitle-pipeline.yml`
   heuristics, `build_secondary_srts`, and `build_manifest.yaml`'s `role`
   as derived output (section 14).

## 14. One mechanism everywhere

The declaration is worthless if the rest of the system keeps guessing. Every
place that currently decides, records, or consumes the primary/derived
relationship is converted to the `meta.yaml` declaration.

**A shared resolver.** One function, `tools/video_roles.py::resolve_roles(talk_dir)`,
returns the roles for a talk: it reads `meta.yaml`, applies section 4's
resolution rules (single-video implicit primary; a missing declaration on a
multi-video talk is a hard error naming the talk), and is the ONLY place the
model is interpreted. It ships with a CLI (`python -m tools.video_roles
--talk-dir PATH [--role primary]`) so workflow steps consume it without
re-implementing anything in inline Python.

**Call sites converted:**

| where | today | after |
|---|---|---|
| `subtitle-pipeline.yml:596` | inline Python: video with most words in `whisper.json`, fallback `videos[0]` | `tools.video_roles --role primary` |
| `subtitle-pipeline.yml:1044` | a **second, non-identical copy** of that heuristic (`best_words` starts at `-1`, no fallback branch) | the same call |
| `subtitle-pipeline.yml:930` | `build_secondary_srts --primary-slug "${VIDEO_SLUG}"` | primary and the derived set come from the resolver |
| `tools/build_secondary_srts.py:55` | `primary_slug` is a required argument; every other video is treated as secondary | resolver-supplied; `ignored` videos are skipped, `independent` videos are not derived from the primary |
| `tools/sync_pr.py` | no notion of roles; every changed SRT is an equal source | roles drive Steps A/B/C (section 6) |
| `site/js/video_sync_roles.js` | — | detection + editing in the SPA (sections 10, 10.1) |

**`build_manifest.yaml` keeps a narrower job.** It stays the record of *how a
file was built* (`mode: en-srt` / `whisper`, `run_id`, `built_at`) and keeps
feeding `manifest_validate_flags` (`tools/validate_subtitles.py:339`). Its
`role` key becomes derived output written from the resolver, never an input
to the sync model — which is what let one talk accumulate three
`role: primary` manifests.

**Ordering constraint.** The pipeline resolves the primary *before* whisper
runs, whereas the old heuristic needed `whisper.json` to exist. That is an
improvement (the choice no longer depends on build artifacts), but it means
the declaration must be present for multi-video talks before the pipeline is
triggered. The `new-talk` / add-talk path (section 10) is what guarantees
that, and the hard error names the talk when it is missing.

**Behaviour check, not a leap of faith.** Before the conversion lands, the
resolver's answer is compared against the current heuristic's answer for
every talk in the corpus; any disagreement is reviewed by hand and resolved
in the declaration, not by softening the resolver. Section 10.1 already
measured the shape of that comparison: the block-superset rule matches the
declared primary in 49 of 54 talks and the other 5 are ties.
