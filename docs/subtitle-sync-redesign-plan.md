# Subtitle Sync Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `sync-subtitles.yml` reconcile a talk's transcript with every one of its videos correctly, idempotently, and atomically — it has never completed successfully.

**Architecture:** Roles (`primary` / `derived` / `independent` / `ignored`) are declared per video in `meta.yaml` and read through one shared resolver. Text propagates SRT -> transcript -> primary/independent videos, and primary -> derived videos by positional block substitution. Diffs are taken from the last bot sync commit, not the PR base. The workflow computes everything before it writes anything, gates on end-state invariants, and pushes only when every target succeeded.

**Tech Stack:** Python 3.12, pytest, PyYAML, GitHub Actions, vanilla JS (`node --test`) for the SPA.

**Spec:** `docs/subtitle-sync-redesign.md`

## Global Constraints

- **TDD is mandatory.** No production code without a failing test first (`CLAUDE.md`). Watch each test fail for the right reason before implementing.
- **English everywhere** except Ukrainian translated content: code, comments, docstrings, workflow YAML, commit messages, test names, assertion messages (`.claude/CLAUDE.md`).
- **One PR per task.** Refactor, cleanup, and feature never share a PR (`feedback_pr_scope_discipline`).
- **Never merge without explicit approval** from the user (`feedback_no_merge_without_explicit_approval`).
- **Work in a git worktree**, never the primary checkout; branch from `origin/main`; push with `--force-with-lease`, never bare `--force`.
- **Verify the GitHub account before every push**: `gh auth status` must show **SlavaSubotskiy** active.
- **No approximate timing, ever.** Timecodes are never invented, interpolated, or scaled (`feedback_no_proportional`). If timing would have to be guessed, the run fails instead.
- **Never suppress a check to make something pass** (`feedback_no_symptom_bypass`). Fix the cause.
- **Any change under `site/`** must pass `pytest -m smoke` AND be opened in a browser before it is "done" (`CLAUDE.md`). Green unit tests do not prove the SPA renders.
- **New SPA components and palette tokens ship a `site/styleguide.html` entry in the same change** (`CLAUDE.md`).
- Fast test lane: `python -m pytest tests/ -m "not e2e"`. JS: `node --test tests/test_*.js`.

---

## File Structure

**New files:**

| File | Responsibility |
|---|---|
| `tools/video_roles.py` | The ONLY interpreter of the `sync:` model. Reads `meta.yaml`, applies resolution rules, exposes `resolve_roles()` plus a CLI for workflow steps. |
| `tools/sync_plan.py` | Pure planning: computes the full set of file writes for a talk without touching the working tree. Returns a `SyncPlan`; raises nothing, collects failures. |
| `tools/sync_invariants.py` | End-state checks (I1-I4) that gate the commit. Operates on planned content, not on disk. |
| `tests/test_video_roles.py` | Resolver behaviour and CLI. |
| `tests/test_sync_plan.py` | Planning purity, atomicity, baseline selection. |
| `tests/test_sync_invariants.py` | Each invariant fails the gate on a crafted violation. |

**Modified files:**

| File | Change |
|---|---|
| `tools/sync_pr.py` | Becomes a thin driver: resolve baseline -> build plan -> check invariants -> write or abort. Loses `_process_talk`'s inline writes and the per-video effective-old machinery. |
| `tools/sync_srt_to_transcript.py` | Omit-aware lookup; declared remarks protected from deletion; returns planned text instead of writing. |
| `tools/sync_transcript_to_srt.py` | `_find_diff` returns multiple change islands; `sync_transcript` applies each. |
| `tools/build_secondary_srts.py` | Takes roles from the resolver instead of a `--primary-slug` argument. |
| `tools/validate_subtitles.py` | `manifest_validate_flags` keeps its job; `role` is no longer an input to the sync model. |
| `.github/workflows/sync-subtitles.yml` | `concurrency:` group; plan/gate/commit; `if: success()`; `Sync-Bot: v1` trailer; explicit path list. |
| `.github/workflows/subtitle-pipeline.yml` | Both inline primary-picking heuristics (lines ~596 and ~1044) call the resolver CLI. |
| `site/js/add_talk_data.js` | Serialises `sync:` per video; name-only form default. |
| `site/index.html` | Per-video role controls on the add-talk screen. |
| `site/styleguide.html` | Catalog entry for the role control. |

---

## Task 1: Baseline resolution, merge-base, concurrency

Fixes R3 (non-idempotent replay), R5 (two-dot diff against a non-ancestor), R8 (no concurrency control). No behaviour change to propagation — this task only changes *what the diff is taken against*.

**Files:**
- Modify: `tools/sync_pr.py` (add `resolve_baseline`, replace `_list_changed`'s two-dot diff)
- Modify: `.github/workflows/sync-subtitles.yml` (concurrency group, drop `BASE_SHA` plumbing)
- Test: `tests/test_sync_pr.py`, `tests/test_sync_subtitles_workflow.py`

**Interfaces:**
- Produces: `tools.sync_pr.resolve_baseline(head: str = "HEAD", remote_main: str = "origin/main") -> str` — returns a commit SHA. Later tasks call this instead of reading `pull_request.base.sha`.
- Produces: constant `tools.sync_pr.SYNC_TRAILER = "Sync-Bot: v1"`.
- Produces: `tools.sync_pr.run(baseline: str | None = None) -> int` — `None` means "resolve it yourself".

- [ ] **Step 1: Write the failing test for bot-commit baseline**

Add to `tests/test_sync_pr.py`:

```python
from tools.sync_pr import SYNC_TRAILER, resolve_baseline


def _commit(repo: Path, message: str, *, author: str | None = None) -> str:
    """Commit whatever is staged and return the new SHA."""
    env = ["-c", f"user.name={author}"] if author else []
    _git(repo, *env, "commit", "-q", "--allow-empty", "-m", message)
    return _git(repo, "rev-parse", "HEAD").strip()


def test_baseline_is_the_last_bot_sync_commit(repo):
    repo_path, _base_sha = repo
    _git(repo_path, "branch", "-f", "origin/main", "HEAD")
    human = _commit(repo_path, "human edit")
    bot = _commit(
        repo_path,
        f"Sync subtitles and transcript edits [skip ci]\n\n{SYNC_TRAILER}",
        author="github-actions[bot]",
    )
    _commit(repo_path, "another human edit")
    assert resolve_baseline(remote_main="origin/main") == bot
    assert resolve_baseline(remote_main="origin/main") != human
```

- [ ] **Step 2: Run it and watch it fail**

Run: `python -m pytest tests/test_sync_pr.py::test_baseline_is_the_last_bot_sync_commit -v`
Expected: FAIL with `ImportError: cannot import name 'SYNC_TRAILER'`.

- [ ] **Step 3: Write the failing test for the merge-base fallback**

```python
def test_baseline_falls_back_to_merge_base_not_branch_tip(repo):
    """With no bot commit, the baseline is where the branch diverged —
    never a tip that is not an ancestor, which would show unrelated talks
    as reversed changes (R5)."""
    repo_path, _base_sha = repo
    fork_point = _git(repo_path, "rev-parse", "HEAD").strip()
    _git(repo_path, "branch", "-f", "origin/main", "HEAD")
    _commit(repo_path, "work on the PR branch")
    # main moves on independently of this branch
    _git(repo_path, "checkout", "-q", "origin/main")
    moved_main = _commit(repo_path, "unrelated change on main")
    _git(repo_path, "branch", "-f", "origin/main", moved_main)
    _git(repo_path, "checkout", "-q", "-")

    assert resolve_baseline(remote_main="origin/main") == fork_point
```

- [ ] **Step 4: Write the failing test for an imported bot commit**

```python
def test_baseline_ignores_a_bot_commit_merged_in_from_main(repo):
    """A merge from main drags in other PRs' bot commits. Diffing from one
    of those would treat unrelated talks as sources."""
    repo_path, _base_sha = repo
    fork_point = _git(repo_path, "rev-parse", "HEAD").strip()
    _git(repo_path, "branch", "-f", "origin/main", "HEAD")

    _git(repo_path, "checkout", "-q", "origin/main")
    foreign_bot = _commit(
        repo_path,
        f"Sync subtitles and transcript edits [skip ci]\n\n{SYNC_TRAILER}",
        author="github-actions[bot]",
    )
    _git(repo_path, "branch", "-f", "origin/main", foreign_bot)
    _git(repo_path, "checkout", "-q", "-")
    _git(repo_path, "merge", "-q", "--no-ff", "-m", "Merge branch 'main'", "origin/main")

    resolved = resolve_baseline(remote_main="origin/main")
    assert resolved != foreign_bot
    assert resolved == fork_point
```

- [ ] **Step 5: Write the failing test for a human faking the trailer**

```python
def test_baseline_ignores_a_trailer_from_a_human_author(repo):
    repo_path, _base_sha = repo
    fork_point = _git(repo_path, "rev-parse", "HEAD").strip()
    _git(repo_path, "branch", "-f", "origin/main", "HEAD")
    _commit(repo_path, f"looks official\n\n{SYNC_TRAILER}", author="Some Human")
    assert resolve_baseline(remote_main="origin/main") == fork_point
```

- [ ] **Step 6: Run all four and watch them fail**

Run: `python -m pytest tests/test_sync_pr.py -k baseline -v`
Expected: 4 FAILED, all on the missing import.

- [ ] **Step 7: Implement `resolve_baseline`**

In `tools/sync_pr.py`, replacing the `_show_base`/`_list_changed` header area:

```python
SYNC_TRAILER = "Sync-Bot: v1"
BOT_AUTHOR = "github-actions[bot]"

# Only these paths can carry a human edit; everything else in a diff is
# noise (a merge from main, a docs change riding along in a manual PR).
SYNC_PATHSPECS = ("talks/*/transcript_uk.txt", "talks/*/*/final/uk.srt")


def resolve_baseline(head: str = "HEAD", remote_main: str = "origin/main") -> str:
    """Return the commit a human edit should be measured against.

    The last bot sync commit on THIS branch if there is one, otherwise the
    point where the branch diverged from main. Never the PR's base tip: a
    two-dot diff against a non-ancestor reports every file that moved on
    main as a reversed change, and the sync would dutifully un-edit and
    commit them.

    The search is bounded by `remote_main..head` and walks --first-parent,
    so bot commits belonging to other PRs that arrived through a merge are
    not candidates. Author and trailer must BOTH match: the trailer alone
    is text a human can type.
    """
    sep = "\x1f"
    out = _run_git(
        "log",
        "--first-parent",
        f"{remote_main}..{head}",
        f"--format=%H{sep}%an{sep}%B%x1e",
    )
    for entry in out.split("\x1e"):
        entry = entry.strip()
        if not entry:
            continue
        sha, author, body = entry.split(sep, 2)
        if author == BOT_AUTHOR and SYNC_TRAILER in body:
            return sha
    return _run_git("merge-base", remote_main, head).strip()
```

- [ ] **Step 8: Run the four tests and watch them pass**

Run: `python -m pytest tests/test_sync_pr.py -k baseline -v`
Expected: 4 PASSED.

- [ ] **Step 9: Write the failing test that the diff is scoped to sync paths**

```python
def test_list_changed_ignores_paths_outside_the_sync_scope(repo):
    repo_path, _base_sha = repo
    _git(repo_path, "branch", "-f", "origin/main", "HEAD")
    (repo_path / "README.md").write_text("noise\n", encoding="utf-8")
    srt = repo_path / "talks/talk/Video1/final/uk.srt"
    srt.write_text(srt.read_text(encoding="utf-8").replace("Перше", "Змінене"), encoding="utf-8")
    _git(repo_path, "add", "-A")
    _commit(repo_path, "edit a subtitle and a readme")

    changed = _list_changed(resolve_baseline(remote_main="origin/main"))
    assert "talks/talk/Video1/final/uk.srt" in changed
    assert "README.md" not in changed
```

- [ ] **Step 10: Run it and watch it fail**

Run: `python -m pytest tests/test_sync_pr.py::test_list_changed_ignores_paths_outside_the_sync_scope -v`
Expected: FAIL — `README.md` is currently listed.

- [ ] **Step 11: Scope `_list_changed` to the sync pathspecs**

```python
def _list_changed(baseline: str) -> list[str]:
    try:
        out = _run_git("diff", "--name-only", baseline, "HEAD", "--", *SYNC_PATHSPECS)
    except subprocess.CalledProcessError as exc:
        _gha_error(f"git diff failed: {exc.stderr}")
        return []
    return [line for line in out.splitlines() if line.strip()]
```

- [ ] **Step 12: Make `run` resolve its own baseline**

```python
def run(baseline: str | None = None) -> int:
    if baseline is None:
        baseline = resolve_baseline()
    changed = _list_changed(baseline)
    ...
```

And in `main()`, make the argument optional:

```python
    p.add_argument(
        "--baseline",
        default=None,
        help="Commit to diff against (default: last bot sync commit, else merge-base with origin/main)",
    )
```

- [ ] **Step 13: Run the whole sync suite**

Run: `python -m pytest tests/test_sync_pr.py tests/test_sync_srt.py tests/test_sync_transcript.py -v`
Expected: all PASS. Existing tests that passed `--base-sha` still work through `--baseline`.

- [ ] **Step 14: Write the failing workflow tests**

Add to `tests/test_sync_subtitles_workflow.py`:

```python
def test_workflow_has_a_concurrency_group_per_pr():
    wf = yaml.safe_load(Path(".github/workflows/sync-subtitles.yml").read_text(encoding="utf-8"))
    group = wf["concurrency"]["group"]
    assert "pull_request.number" in group, "concurrency must be scoped per PR, not global"
    assert wf["concurrency"]["cancel-in-progress"] is True


def test_workflow_does_not_pass_a_base_sha():
    text = Path(".github/workflows/sync-subtitles.yml").read_text(encoding="utf-8")
    assert "base.sha" not in text, "the baseline is resolved from git history, not from the PR base"
```

- [ ] **Step 15: Run and watch them fail**

Run: `python -m pytest tests/test_sync_subtitles_workflow.py -k "concurrency or base_sha" -v`
Expected: 2 FAILED.

- [ ] **Step 16: Update the workflow**

In `.github/workflows/sync-subtitles.yml`, after `permissions:`:

```yaml
# Overlapping runs race on the final push: the loser's push is rejected
# non-fast-forward, which would surface as a spurious red. One run per PR,
# newest wins.
concurrency:
  group: sync-pr-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

And the sync step loses its `env: BASE_SHA` block and calls:

```yaml
        run: |
          set +e
          python -m tools.sync_pr
          echo "exit_code=$?" >> "$GITHUB_OUTPUT"
```

- [ ] **Step 17: Run the workflow tests and the full fast lane**

Run: `python -m pytest tests/ -m "not e2e" -q`
Expected: all PASS.

- [ ] **Step 18: Commit**

```bash
git add tools/sync_pr.py .github/workflows/sync-subtitles.yml \
        tests/test_sync_pr.py tests/test_sync_subtitles_workflow.py
git commit -m "$(cat <<'MSG'
Anchor the sync diff on the last bot commit, not the PR base

sync_pr diffed from pull_request.base.sha, so every event after the bot
committed replayed edits that were already applied — the reason no run has
ever been green. It also used a two-dot diff, which against a non-ancestor
base reports files that moved on main as reversed changes and would
un-edit them.

The baseline is now the newest github-actions[bot] commit carrying the
Sync-Bot trailer on this branch, found with a --first-parent walk bounded
by origin/main so bot commits merged in from other PRs are not candidates,
falling back to merge-base. The diff is scoped to the sync pathspecs, and
the workflow gets a per-PR concurrency group.
MSG
)"
```

---

## Task 2: Atomicity — plan, gate, commit

Fixes R4 (partial pushes) and R2 (all-or-nothing skips Step B). Propagation logic is untouched; only *when* the working tree is written changes.

The technique is a **shadow tree**: copy the talk into a temp directory, run the existing sync steps there (they may write freely), and copy the results back only when every target for every talk succeeded. This buys atomicity without rewriting `sync_srt_to_transcript` / `sync_transcript` to return content instead of writing — that rewrite would be a large, separate risk.

**Files:**
- Create: `tools/sync_plan.py`
- Create: `tests/test_sync_plan.py`
- Modify: `tools/sync_pr.py:120-207` (`_process_talk` becomes plan-producing), `tools/sync_pr.py:209-235` (`run`)
- Modify: `.github/workflows/sync-subtitles.yml`
- Test: `tests/test_sync_pr.py`, `tests/test_sync_subtitles_workflow.py`

**Interfaces:**
- Consumes: `tools.sync_pr.resolve_baseline`, `SYNC_PATHSPECS` (Task 1).
- Produces: `tools.sync_plan.SyncPlan` — a dataclass with `writes: dict[str, str]` (repo-relative path -> full new file content) and `failures: list[str]` (GitHub-annotation-ready messages). Property `ok: bool` is `not failures`.
- Produces: `tools.sync_plan.shadow_talk(talk_dir: str, dest: Path) -> Path` — copies a talk into `dest` and returns the shadow talk directory.
- Produces: `tools.sync_plan.collect_writes(shadow: Path, talk_dir: str) -> dict[str, str]` — every file under the shadow whose content differs from the working tree, keyed by repo-relative path.
- Produces: `tools.sync_plan.apply_plan(plan: SyncPlan) -> list[str]` — writes every entry, returns the paths written.
- Task 4 replaces the propagation *inside* the plan; the `SyncPlan` contract stays.

- [ ] **Step 1: Write the failing test that a failure leaves the tree untouched**

Create `tests/test_sync_plan.py`:

```python
"""The sync plan must be computed in full before anything is written.

A failure anywhere means the working tree is byte-identical to what it was
before the run: the workflow then has nothing to commit, so a red check can
never coexist with a partial push.
"""

from pathlib import Path

from tools.sync_plan import SyncPlan, apply_plan


def test_a_plan_with_failures_is_not_ok():
    plan = SyncPlan(writes={"talks/t/transcript_uk.txt": "new"}, failures=["Video2: cannot align"])
    assert plan.ok is False


def test_an_empty_plan_is_ok():
    assert SyncPlan(writes={}, failures=[]).ok is True


def test_apply_plan_writes_every_entry(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    target = tmp_path / "talks/t/transcript_uk.txt"
    target.parent.mkdir(parents=True)
    target.write_text("old", encoding="utf-8")

    written = apply_plan(SyncPlan(writes={"talks/t/transcript_uk.txt": "new"}, failures=[]))

    assert target.read_text(encoding="utf-8") == "new"
    assert written == ["talks/t/transcript_uk.txt"]
```

- [ ] **Step 2: Run and watch it fail**

Run: `python -m pytest tests/test_sync_plan.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools.sync_plan'`.

- [ ] **Step 3: Implement `SyncPlan` and `apply_plan`**

Create `tools/sync_plan.py`:

```python
"""Planning half of the sync driver.

`sync_pr` used to write the transcript and each SRT as it went, and the
workflow committed whatever had landed even when the job failed
(`if: always()`). A run could therefore leave the transcript updated and a
second video untouched — exactly the state PR #962 pushed to main.

Here the work happens against a *shadow* copy of the talk. The existing
sync steps write into the shadow as freely as they like; the working tree
is written only after every target of every talk has succeeded.
"""

import shutil
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class SyncPlan:
    """Every file the sync wants to write, plus every reason it cannot."""

    writes: dict[str, str] = field(default_factory=dict)
    failures: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failures

    def merge(self, other: "SyncPlan") -> None:
        self.writes.update(other.writes)
        self.failures.extend(other.failures)


def shadow_talk(talk_dir: str, dest: Path) -> Path:
    """Copy a talk into `dest` so sync steps can write without consequence."""
    shadow = dest / Path(talk_dir).name
    if shadow.exists():
        shutil.rmtree(shadow)
    shutil.copytree(talk_dir, shadow)
    return shadow


def collect_writes(shadow: Path, talk_dir: str) -> dict[str, str]:
    """Repo-relative path -> new content, for every file the shadow changed."""
    writes: dict[str, str] = {}
    for path in sorted(shadow.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(shadow)
        real = Path(talk_dir) / rel
        new = path.read_text(encoding="utf-8")
        if not real.exists() or real.read_text(encoding="utf-8") != new:
            writes[str(Path(talk_dir) / rel)] = new
    return writes


def apply_plan(plan: SyncPlan) -> list[str]:
    """Write the plan. Callers must check `plan.ok` first."""
    for path, content in sorted(plan.writes.items()):
        Path(path).write_text(content, encoding="utf-8")
    return sorted(plan.writes)
```

- [ ] **Step 4: Run and watch it pass**

Run: `python -m pytest tests/test_sync_plan.py -v`
Expected: 3 PASSED.

- [ ] **Step 5: Write the failing integration test — a broken second video blocks everything**

Add to `tests/test_sync_pr.py`, inside `TestSyncPrIntegration`:

```python
def test_a_failure_on_one_video_leaves_the_whole_talk_untouched(self, repo):
    """Video2's SRT is mangled so its sync cannot succeed. The transcript
    edit that Video1 would have produced must NOT land: a red check and a
    partial push together are what put main into a split state."""
    repo_path, _ = repo
    _git(repo_path, "branch", "-f", "origin/main", "HEAD")

    v2 = repo_path / "talks/talk/Video2/final/uk.srt"
    v2.write_text("garbage that is not an SRT at all\n", encoding="utf-8")
    v1 = repo_path / "talks/talk/Video1/final/uk.srt"
    v1.write_text(v1.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"), encoding="utf-8")
    _git(repo_path, "add", "-A")
    _commit(repo_path, "edit Video1, break Video2")

    transcript = repo_path / "talks/talk/transcript_uk.txt"
    before = transcript.read_text(encoding="utf-8")

    exit_code = run()

    assert exit_code == 1, "a broken video must fail the run"
    assert transcript.read_text(encoding="utf-8") == before, "nothing may be written when any target fails"
```

- [ ] **Step 6: Run and watch it fail**

Run: `python -m pytest tests/test_sync_pr.py -k untouched -v`
Expected: FAIL — the transcript has been rewritten despite the failure.

- [ ] **Step 7: Rewrite `_process_talk` to plan into a shadow**

In `tools/sync_pr.py`, change the signature and the writes:

```python
def _plan_talk(talk_dir: str, srt_paths: list[str], baseline: str, tmp: Path) -> SyncPlan:
    """Compute every write this talk needs. Never touches the working tree.

    The talk is copied into a shadow directory and the existing sync steps
    run against the copy; whatever they change there becomes the plan.
    """
    plan = SyncPlan()
    talk_id = Path(talk_dir).name
    shadow = shadow_talk(talk_dir, tmp / "shadow")
    ...  # same Step A / Step B flow as before, but paths point into `shadow`
    if plan.ok:
        plan.writes.update(collect_writes(shadow, talk_dir))
    return plan
```

Step A and Step B keep their current bodies; only the paths they are handed change from `talk_dir` to `shadow`, and every `_gha_error(...)` call also appends the same message to `plan.failures`.

Note: the Step-A-failed early return is removed. Step B now runs regardless, so a talk reports *every* problem in one run instead of hiding later ones behind the first — but a single failure still blocks the whole write.

- [ ] **Step 8: Rewrite `run` to gate on the merged plan**

```python
def run(baseline: str | None = None) -> int:
    if baseline is None:
        baseline = resolve_baseline()
    changed = _list_changed(baseline)
    srt_by_talk, transcript_talks = _classify(changed)
    all_talks = sorted(set(srt_by_talk) | set(transcript_talks))
    if not all_talks:
        print("No transcript or SRT changes", file=sys.stderr)
        return 0

    tmp = Path(tempfile.mkdtemp(prefix="sync_pr_"))
    plan = SyncPlan()
    for talk_dir in all_talks:
        talk_id = Path(talk_dir).name
        print(f"\n{'=' * 40}\n  {talk_id}\n{'=' * 40}", file=sys.stderr)
        plan.merge(_plan_talk(talk_dir, srt_by_talk.get(talk_dir, []), baseline, tmp))

    if not plan.ok:
        for failure in plan.failures:
            _gha_error(failure)
        print(
            f"{len(plan.failures)} target(s) failed — nothing written",
            file=sys.stderr,
        )
        return 1

    written = apply_plan(plan)
    print(f"Wrote {len(written)} file(s)", file=sys.stderr)
    return 0
```

- [ ] **Step 9: Run the integration test and watch it pass**

Run: `python -m pytest tests/test_sync_pr.py -v`
Expected: all PASS, including the new atomicity test.

- [ ] **Step 10: Write the failing workflow tests**

```python
def test_commit_step_only_runs_on_success():
    wf = yaml.safe_load(Path(".github/workflows/sync-subtitles.yml").read_text(encoding="utf-8"))
    steps = wf["jobs"]["sync"]["steps"]
    commit = next(s for s in steps if s.get("name") == "Commit and push")
    assert commit.get("if") == "success()", "a failed sync must never push a partial result"


def test_commit_message_carries_the_sync_trailer():
    text = Path(".github/workflows/sync-subtitles.yml").read_text(encoding="utf-8")
    assert "Sync-Bot: v1" in text, "the next run finds its baseline by this trailer"
```

- [ ] **Step 11: Run and watch them fail**

Run: `python -m pytest tests/test_sync_subtitles_workflow.py -k "success or trailer" -v`
Expected: 2 FAILED.

- [ ] **Step 12: Update the workflow**

Replace the sync + commit steps:

```yaml
      # tools.sync_pr resolves its own baseline (the last bot sync commit on
      # this branch, else the merge-base), computes every write against a
      # shadow copy of each talk, and writes nothing unless every target
      # succeeded. A non-zero exit therefore means the tree is clean.
      - name: Sync, optimize, validate
        run: python -m tools.sync_pr

      - name: Commit and push
        if: success()
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add talks/*/*/final/uk.srt talks/*/transcript_uk.txt
          git diff --cached --quiet && { echo "No changes to commit"; exit 0; }
          # [skip ci]: this commit is the RESULT of the sync; re-triggering
          # ourselves on it would be pure waste. The trailer is how the next
          # run finds its baseline — see tools/sync_pr.py::resolve_baseline.
          git commit -m "Sync subtitles and transcript edits [skip ci]" -m "Sync-Bot: v1"
          git push
```

The `set +e` / `exit_code` capture and the separate `Fail if sync had errors` step are deleted: the sync step now fails on its own.

- [ ] **Step 13: Run the full fast lane**

Run: `python -m pytest tests/ -m "not e2e" -q`
Expected: all PASS.

- [ ] **Step 14: Commit**

```bash
git add tools/sync_plan.py tools/sync_pr.py .github/workflows/sync-subtitles.yml \
        tests/test_sync_plan.py tests/test_sync_pr.py tests/test_sync_subtitles_workflow.py
git commit -m "$(cat <<'MSG'
Compute the whole sync before writing any of it

The commit step ran with if: always() to preserve partial progress, and
sync_pr wrote files as it went. A run could leave the transcript updated
and a second video untouched, then push that split state and go red — which
is how main ended up with talks whose subtitles and transcript disagree.

Each talk is now synced against a shadow copy; the working tree is written
only when every target of every talk succeeded. A failed run leaves a clean
tree, so there is nothing for the commit step to push. Step A failing no
longer skips Step B either, so one run reports every problem instead of
hiding the later ones behind the first.
MSG
)"
```

---

## Task 3: The role model — schema, resolver, declarations

Schema, reader and data land together: a schema with no reader has nothing to prove it right, and a reader with no data has nothing to read. This is the task that makes "cannot align" configuration instead of failure.

**Files:**
- Create: `tools/video_roles.py`
- Create: `tests/test_video_roles.py`
- Modify: `talks/*/meta.yaml` for every multi-video talk (~64; count exactly with the command in Step 9)
- Modify: `ARCHITECTURE.md`, `CLAUDE.md` (document the `sync:` key)

**Interfaces:**
- Produces: `tools.video_roles.ROLES = ("primary", "derived", "independent", "ignored")`.
- Produces: `tools.video_roles.RoleError(Exception)` — raised with a message naming the talk and what is wrong.
- Produces: `tools.video_roles.resolve_roles(talk_dir: str | Path) -> dict[str, str]` — slug -> role, for every video in `meta.yaml`.
- Produces: `tools.video_roles.primary_slug(talk_dir: str | Path) -> str`.
- Produces: `tools.video_roles.derived_slugs(talk_dir: str | Path) -> list[str]`.
- Produces: CLI `python -m tools.video_roles --talk-dir PATH [--role primary]` — with `--role`, prints matching slugs one per line; without, prints `slug<TAB>role` lines.
- Tasks 4 and 8 consume all of the above. No other module may interpret the `sync:` key.

- [ ] **Step 1: Write the failing test for the implicit single-video case**

Create `tests/test_video_roles.py`:

```python
"""The one interpreter of the `sync:` model in meta.yaml.

Every other consumer — sync_pr, build_secondary_srts, the pipeline —
resolves roles through here, so the model cannot drift between them the way
build_manifest.yaml's `role` did (one talk carries three primaries, eight
legacy talks carry none).
"""

import pytest
import yaml

from tools.video_roles import RoleError, derived_slugs, primary_slug, resolve_roles


def _talk(tmp_path, meta: dict, srt_slugs=()):
    talk = tmp_path / "talks" / "1990-01-01_Some-Talk"
    talk.mkdir(parents=True)
    (talk / "meta.yaml").write_text(yaml.safe_dump(meta, allow_unicode=True), encoding="utf-8")
    for slug in srt_slugs:
        final = talk / slug / "final"
        final.mkdir(parents=True)
        (final / "uk.srt").write_text("1\n00:00:01,000 --> 00:00:02,000\nтекст\n", encoding="utf-8")
    return talk


def test_single_subtitled_video_is_primary_without_a_declaration(tmp_path):
    talk = _talk(tmp_path, {"videos": [{"slug": "Only-Video"}]}, srt_slugs=["Only-Video"])
    assert resolve_roles(talk) == {"Only-Video": "primary"}
    assert primary_slug(talk) == "Only-Video"
```

- [ ] **Step 2: Run and watch it fail**

Run: `python -m pytest tests/test_video_roles.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools.video_roles'`.

- [ ] **Step 3: Write the failing tests for the multi-video rules**

```python
def test_multi_video_talk_without_declarations_is_a_hard_error(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Puja"}, {"slug": "Puja-Talk"}]},
        srt_slugs=["Puja", "Puja-Talk"],
    )
    with pytest.raises(RoleError) as exc:
        resolve_roles(talk)
    assert "1990-01-01_Some-Talk" in str(exc.value), "the error must name the talk"
    assert "Puja-Talk" in str(exc.value), "the error must name the undeclared videos"


def test_declared_roles_are_returned_verbatim(tmp_path):
    talk = _talk(
        tmp_path,
        {
            "videos": [
                {"slug": "Puja", "sync": "primary"},
                {"slug": "Puja-Talk", "sync": "derived"},
                {"slug": "After-Puja", "sync": "independent"},
                {"slug": "Yogi-Intro", "sync": "ignored"},
            ]
        },
        srt_slugs=["Puja", "Puja-Talk", "After-Puja"],
    )
    assert resolve_roles(talk) == {
        "Puja": "primary",
        "Puja-Talk": "derived",
        "After-Puja": "independent",
        "Yogi-Intro": "ignored",
    }
    assert primary_slug(talk) == "Puja"
    assert derived_slugs(talk) == ["Puja-Talk"], "independent and ignored are not derived"


def test_two_primaries_are_rejected(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A", "sync": "primary"}, {"slug": "B", "sync": "primary"}]},
        srt_slugs=["A", "B"],
    )
    with pytest.raises(RoleError, match="exactly one"):
        resolve_roles(talk)


def test_no_primary_is_rejected(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A", "sync": "derived"}, {"slug": "B", "sync": "ignored"}]},
        srt_slugs=["A", "B"],
    )
    with pytest.raises(RoleError, match="exactly one"):
        resolve_roles(talk)


def test_an_unknown_role_value_is_rejected(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A", "sync": "primary"}, {"slug": "B", "sync": "secondary"}]},
        srt_slugs=["A", "B"],
    )
    with pytest.raises(RoleError, match="secondary"):
        resolve_roles(talk)


def test_extra_videos_without_subtitles_do_not_force_a_declaration(tmp_path):
    """A talk whose second video has no uk.srt still resolves: only videos
    that actually carry subtitles participate in the model."""
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Only-Subtitled"}, {"slug": "No-Subs"}]},
        srt_slugs=["Only-Subtitled"],
    )
    assert resolve_roles(talk)["Only-Subtitled"] == "primary"
    assert resolve_roles(talk)["No-Subs"] == "ignored"
```

- [ ] **Step 4: Run and watch all six fail**

Run: `python -m pytest tests/test_video_roles.py -v`
Expected: 7 FAILED on the missing module.

- [ ] **Step 5: Implement the resolver**

Create `tools/video_roles.py`:

```python
"""How each of a talk's videos participates in subtitle sync.

The model used to be guessed afresh in three places that disagreed: the
pipeline picked whichever video had the most words in whisper.json,
build_secondary_srts took a --primary-slug argument from outside, and
build_manifest.yaml recorded a role after the fact. sync_pr knew nothing
about any of it and treated every SRT as an equal source of truth.

Roles are declared per video in meta.yaml under `sync:` and read here.
This module is the ONLY interpreter of that key.

    primary      Authoritative subtitle text. Exactly one per talk.
    derived      Mirrors the primary's text positionally; its own timing.
    independent  Its own slice of the transcript; synced with the
                 transcript directly, never against the primary.
    ignored      Never read, never written.

A multi-video talk MUST declare. There is deliberately no default: a
default in a resolver is seen by nobody and fires in CI, which is the
silent guessing this module exists to remove.

    python -m tools.video_roles --talk-dir talks/1992-07-19_Guru-Puja --role primary
"""

import argparse
import sys
from pathlib import Path

import yaml

ROLES = ("primary", "derived", "independent", "ignored")


class RoleError(Exception):
    """A talk's sync model is missing, ambiguous, or invalid."""


def _load_videos(talk_dir: Path) -> list[dict]:
    meta_path = talk_dir / "meta.yaml"
    if not meta_path.is_file():
        raise RoleError(f"{talk_dir.name}: no meta.yaml")
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}
    return [v for v in meta.get("videos", []) if v.get("slug")]


def _has_subtitles(talk_dir: Path, slug: str) -> bool:
    return (talk_dir / slug / "final" / "uk.srt").is_file()


def resolve_roles(talk_dir: str | Path) -> dict[str, str]:
    """Return {slug: role} for every video in the talk."""
    talk_dir = Path(talk_dir)
    videos = _load_videos(talk_dir)
    if not videos:
        raise RoleError(f"{talk_dir.name}: meta.yaml declares no videos")

    subtitled = [v["slug"] for v in videos if _has_subtitles(talk_dir, v["slug"])]

    # A talk with at most one subtitled video has nothing to disambiguate.
    if len(subtitled) <= 1:
        return {
            v["slug"]: ("primary" if v["slug"] in subtitled else "ignored")
            for v in videos
        }

    undeclared = [v["slug"] for v in videos if v["slug"] in subtitled and not v.get("sync")]
    if undeclared:
        raise RoleError(
            f"{talk_dir.name}: {len(subtitled)} videos carry subtitles but "
            f"{', '.join(undeclared)} have no `sync:` in meta.yaml. "
            f"Declare one of {', '.join(ROLES)} for each."
        )

    roles: dict[str, str] = {}
    for v in videos:
        role = v.get("sync", "ignored")
        if role not in ROLES:
            raise RoleError(f"{talk_dir.name}/{v['slug']}: unknown sync role {role!r} (expected one of {', '.join(ROLES)})")
        roles[v["slug"]] = role

    primaries = [s for s, r in roles.items() if r == "primary"]
    if len(primaries) != 1:
        raise RoleError(
            f"{talk_dir.name}: expected exactly one video with `sync: primary`, found {len(primaries)}"
            + (f" ({', '.join(primaries)})" if primaries else "")
        )
    return roles


def primary_slug(talk_dir: str | Path) -> str:
    return next(s for s, r in resolve_roles(talk_dir).items() if r == "primary")


def derived_slugs(talk_dir: str | Path) -> list[str]:
    return [s for s, r in resolve_roles(talk_dir).items() if r == "derived"]


def main() -> None:
    p = argparse.ArgumentParser(description="Resolve a talk's subtitle sync roles")
    p.add_argument("--talk-dir", required=True)
    p.add_argument("--role", choices=ROLES, help="Print only slugs with this role")
    args = p.parse_args()
    try:
        roles = resolve_roles(args.talk_dir)
    except RoleError as exc:
        print(f"::error::{exc}", file=sys.stderr)
        sys.exit(1)
    if args.role:
        for slug, role in roles.items():
            if role == args.role:
                print(slug)
        return
    for slug, role in roles.items():
        print(f"{slug}\t{role}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run and watch them pass**

Run: `python -m pytest tests/test_video_roles.py -v`
Expected: 7 PASSED.

- [ ] **Step 7: Write the failing CLI test**

```python
import subprocess


def test_cli_prints_the_primary_slug(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Puja", "sync": "primary"}, {"slug": "Puja-Talk", "sync": "derived"}]},
        srt_slugs=["Puja", "Puja-Talk"],
    )
    out = subprocess.run(
        [sys.executable, "-m", "tools.video_roles", "--talk-dir", str(talk), "--role", "primary"],
        capture_output=True, text=True, check=True,
    )
    assert out.stdout.strip() == "Puja"


def test_cli_exits_nonzero_and_annotates_on_a_missing_declaration(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A"}, {"slug": "B"}]},
        srt_slugs=["A", "B"],
    )
    out = subprocess.run(
        [sys.executable, "-m", "tools.video_roles", "--talk-dir", str(talk)],
        capture_output=True, text=True,
    )
    assert out.returncode == 1
    assert "::error::" in out.stderr
```

Add `import sys` to the test module's imports.

- [ ] **Step 8: Run and watch them pass**

Run: `python -m pytest tests/test_video_roles.py -k cli -v`
Expected: 2 PASSED (implementation from Step 5 already covers this).

- [ ] **Step 9: List every talk that needs a declaration**

Run:

```bash
python - <<'PY'
from pathlib import Path
import yaml
need = []
for meta_p in sorted(Path("talks").glob("*/meta.yaml")):
    meta = yaml.safe_load(meta_p.read_text(encoding="utf-8")) or {}
    vids = [v.get("slug") for v in meta.get("videos", []) if v.get("slug")]
    talk = meta_p.parent
    subtitled = [s for s in vids if (talk / s / "final" / "uk.srt").is_file()]
    if len(subtitled) > 1:
        need.append((talk.name, vids, subtitled))
print(f"talks needing a declaration: {len(need)}")
for name, vids, sub in need:
    print(f"{name}\n  videos:    {vids}\n  subtitled: {sub}")
PY
```

Expected: roughly 64 talks. This list is the work for Step 10.

- [ ] **Step 10: Write the declarations by hand**

For each talk from Step 9, add `sync:` to every video in its `meta.yaml`:

```yaml
videos:
- slug: Guru-Puja
  title: Guru Puja
  video_ref: r1A1QQUEUHE0FJBUhdSh5QW1RbUkA
  sync: primary
- slug: Guru-Puja-Talk-Gravity
  title: 'Guru Puja Talk: Gravity'
  video_ref: r1XVsVXRZXQhdJB0hZShlVWlRbUkA
  sync: derived
```

By hand, not by script — small fixed N, and each talk deserves a look (`feedback_small_n_prefer_manual`). Guidance:

- The **full recording** is `primary`; the `Talk` cut is `derived`. Verified: 51 of 55 talks that declare a primary today agree with this.
- A video with **no `source/en.srt`** cannot be `primary`: `build_secondary_srts` needs an EN bridge on both sides. This is why `1992-05-10`'s `...NITL-RAW` is not primary despite being first.
- A video sharing **no text** with the primary is `independent` if its text is in the transcript, else `ignored`. Known case: `2000-07-23_Guru-Puja-Shraddha`'s `Guru-Puja-1st-Talk-after-Puja` (23 of 24 blocks in the transcript) and `-2nd-` (16 of 16) — both `independent`.
- `1998-05-10_Sahasrara-Puja-Blessing-of-Divine-Pours...` is the one talk whose `Talk` video is genuinely primary. Keep it that way.

- [ ] **Step 11: Check the declarations against today's behaviour**

Run:

```bash
python - <<'PY'
"""One-off: does the declared primary match what the pipeline picks today?
Any disagreement is reviewed by hand and fixed in the declaration — never
by softening the resolver."""
import json
from pathlib import Path
import yaml
from tools.video_roles import primary_slug, RoleError

for meta_p in sorted(Path("talks").glob("*/meta.yaml")):
    talk = meta_p.parent
    meta = yaml.safe_load(meta_p.read_text(encoding="utf-8")) or {}
    vids = [v.get("slug") for v in meta.get("videos", []) if v.get("slug")]
    if len([s for s in vids if (talk / s / "final" / "uk.srt").is_file()]) < 2:
        continue
    best_slug, best_words = None, -1
    for slug in vids:
        wpath = talk / slug / "source" / "whisper.json"
        try:
            segs = json.loads(wpath.read_text(encoding="utf-8"))["segments"]
            nw = sum(len(s.get("words", [])) for s in segs)
        except Exception:
            nw = 0
        if nw > best_words:
            best_words, best_slug = nw, slug
    try:
        declared = primary_slug(talk)
    except RoleError as exc:
        print(f"UNRESOLVED {talk.name}: {exc}")
        continue
    if declared != best_slug:
        print(f"DIFFERS {talk.name}: declared={declared} heuristic={best_slug}")
PY
```

Review every `DIFFERS` line by hand. Expect a handful — ties between identical camera cuts, and videos the heuristic favours despite having no `en.srt`. Resolve each in the declaration.

- [ ] **Step 12: Write the failing corpus guard test**

Add to `tests/test_video_roles.py`:

```python
def test_every_multi_video_talk_in_the_corpus_resolves():
    """A talk that cannot resolve would fail its next sync run. Catch it
    here instead of in CI on someone's PR."""
    failures = []
    for meta_p in sorted(Path("talks").glob("*/meta.yaml")):
        talk = meta_p.parent
        try:
            resolve_roles(talk)
        except RoleError as exc:
            failures.append(str(exc))
    assert not failures, "talks with an unresolvable sync model:\n" + "\n".join(failures)
```

Add `from pathlib import Path` to the test imports.

- [ ] **Step 13: Run it**

Run: `python -m pytest tests/test_video_roles.py::test_every_multi_video_talk_in_the_corpus_resolves -v`
Expected: PASS once Step 10 is complete. If it fails, the message lists exactly which talks are still undeclared.

- [ ] **Step 14: Document the key**

In `CLAUDE.md`, under the Tools section:

```
# Resolve a talk's subtitle sync roles (the ONE interpreter of meta.yaml `sync:`)
python -m tools.video_roles --talk-dir talks/{date}_{slug} [--role primary]
#   sync: primary | derived | independent | ignored — see docs/subtitle-sync-redesign.md
```

In `ARCHITECTURE.md`, document the four roles next to the multi-video layout description.

- [ ] **Step 15: Run the full fast lane**

Run: `python -m pytest tests/ -m "not e2e" -q`
Expected: all PASS.

- [ ] **Step 16: Commit**

```bash
git add tools/video_roles.py tests/test_video_roles.py talks/*/meta.yaml CLAUDE.md ARCHITECTURE.md
git commit -m "$(cat <<'MSG'
Declare each video's sync role in meta.yaml, resolved in one place

How a talk's videos relate was guessed in three places that disagreed: the
pipeline picked whichever video had the most whisper words,
build_secondary_srts took the primary as an argument, build_manifest.yaml
recorded a role after the build, and sync_pr treated every SRT as an equal
source. One talk accumulated three primaries and eight legacy talks have
none.

meta.yaml now declares primary / derived / independent / ignored per video,
and tools.video_roles is the only interpreter. A multi-video talk with no
declaration is a hard error naming the talk: a resolver default would fire
in CI where nobody sees it, which is the guessing being removed.
MSG
)"
```

---

## Phase 2 — a separate plan, written after Task 3 lands

Tasks 1-3 are a complete, shippable unit: after them the sync is
idempotent, atomic, and reads one declared model. Everything below still
belongs to the same spec, but its tests are written against interfaces that
do not exist yet — `SyncPlan`'s exact shape after Task 2's shadow-tree
refactor, and the resolver's signatures from Task 3. Writing those tests
now would mean inventing them against imagined code, and they would be
rewritten on contact.

The phase-2 plan is written once Task 3 is merged, covering:

| Task | Scope | Must prove |
|---|---|---|
| 4 | Positional `primary -> derived` propagation inside `_plan_talk`; invariants I1-I4 as the commit gate (`tools/sync_invariants.py`) | Substitution is positional through difflib opcodes, never a text search — 51 of 165 SRTs contain duplicate block texts. Deletions propagate; inserts and splits fail the run rather than invent timing. I2 calls `check_text_preservation` directly, not through `manifest_validate_flags`, which sets `skip_text_check=True` for secondaries. |
| 5 | Multi-island `_find_diff` (`tools/sync_transcript_to_srt.py:52`) | Twelve edits in one 19k-char paragraph produce twelve locatable fragments, not one 12k-char span. Load-bearing: `independent` videos have no primary to mirror. |
| 6 | Omit-aware Step A (`tools/sync_srt_to_transcript.py:80`, `tools/sync_common.py:53`) | A block reading `A B` is found in a transcript reading `A (сміх) B` — 31 transcripts contain 86 declared remarks. Removing a remark from an SRT leaves it in the transcript. |
| 7 | SPA role controls (`site/index.html`, `site/js/add_talk_data.js`, `site/styleguide.html`) | All four roles selectable; name-only default (first non-`Talk` video is primary, rest derived); `sync:` serialised per video; `pytest -m smoke` green and the page opened in a browser. |
| 8 | Convert remaining call sites (`subtitle-pipeline.yml:596` and `:1044`, `tools/build_secondary_srts.py`, `build_manifest.yaml`'s `role`) | Both heuristic copies are gone; the pipeline resolves the primary without needing `whisper.json` to exist; `role` in the manifest is output, never input. |

---

## Self-Review

**Spec coverage (sections 1-14 of `docs/subtitle-sync-redesign.md`):**

| Spec | Covered by |
|---|---|
| R3, R5 (baseline, two-dot diff) | Task 1 |
| R8 (concurrency) | Task 1 |
| R4, R2 (partial pushes, all-or-nothing) | Task 2 |
| S4 (derivation model), S14 (shared resolver) | Task 3 |
| R1 (one edit per paragraph) | Phase 2, task 5 |
| R6, R7 (raw transcript read, remark deletion) | Phase 2, task 6 |
| S6 (propagation), S7 (invariants) | Phase 2, task 4 |
| S10 (SPA controls) | Phase 2, task 7 |
| S14 (call sites) | Phase 2, task 8 |

No spec section is unassigned.

**Type consistency:** `resolve_baseline` / `SYNC_TRAILER` / `SYNC_PATHSPECS` (Task 1) are used unchanged in Tasks 2 and 3. `SyncPlan.writes` is `dict[str, str]` in its definition, its test, and `apply_plan`. `resolve_roles` returns `dict[str, str]` everywhere it appears. `run()` takes `baseline: str | None` in Task 1 and is called as `run()` in Task 2's test.

**Placeholder scan:** no TBD, TODO, "handle edge cases", or "similar to Task N". Every code step carries the actual code. Phase 2 is an explicit scope boundary with named files and obligations, not a placeholder inside a task.

**Known risk carried forward from the spec (section 5):** a rebase or force-push that drops the bot commit while keeping its tree leaves the baseline falling back to merge-base, which can present a stale bot write as a human edit. Task 1 does not close this. The spec's mitigation — run the invariants first when no marker is found, and propagate only what fails them — depends on `tools/sync_invariants.py`, which arrives in phase-2 task 4. Until then the window is open and documented.
