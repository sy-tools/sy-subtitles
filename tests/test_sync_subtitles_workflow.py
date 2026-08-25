"""Guards for .github/workflows/sync-subtitles.yml.

The SPA's edit auto-sync commits real subtitle/transcript files to a DRAFT
PR on every background push (1.5s after a field blur). Without a draft
guard each of those commits would trigger the full SRT<->transcript
reconciliation run — a CI storm and bot commits racing the client.
The sync must run only for non-draft PRs, and must fire when the draft
is flipped to ready (event type ready_for_review).
"""

from pathlib import Path

import yaml

WORKFLOW = Path(__file__).parent.parent / ".github" / "workflows" / "sync-subtitles.yml"


def _load():
    return yaml.safe_load(WORKFLOW.read_text())


def test_triggers_on_ready_for_review():
    wf = _load()
    # PyYAML parses the bare `on:` key as boolean True.
    pr = wf[True]["pull_request"]
    assert "types" in pr, "pull_request needs explicit types to include ready_for_review"
    assert set(pr["types"]) == {"opened", "synchronize", "reopened", "ready_for_review"}


def test_sync_job_skips_draft_prs():
    wf = _load()
    cond = wf["jobs"]["sync"].get("if", "")
    assert "github.event.pull_request.draft == false" in cond, (
        "the sync job must not run on draft PRs (edit auto-sync pushes there)"
    )


def test_workflow_has_a_concurrency_group_per_pr():
    """Overlapping runs race on the final push.

    The loser is rejected non-fast-forward, which surfaces as a spurious
    red check on a PR whose sync actually succeeded.
    """
    wf = _load()
    group = wf["concurrency"]["group"]
    assert "pull_request.number" in group, "concurrency must be scoped per PR, not global"
    assert wf["concurrency"]["cancel-in-progress"] is True


def test_workflow_does_not_pass_a_base_sha():
    """The baseline comes from git history, not from the PR base.

    Diffing from the PR base replays every edit the bot already committed,
    which is why no sync run has ever been green twice.
    """
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "base.sha" not in text
    assert "--base-sha" not in text


def test_bot_commit_carries_the_trailer_the_resolver_looks_for():
    """The baseline is found by trailer; a commit without it is invisible.

    Asserted against the constant itself so the two can never drift.
    """
    from tools.sync_pr import BOT_AUTHOR, SYNC_TRAILER

    text = WORKFLOW.read_text(encoding="utf-8")
    assert SYNC_TRAILER in text, "the bot commit must carry the sync trailer"
    assert f'git config user.name "{BOT_AUTHOR}"' in text


def test_commit_step_only_runs_on_success():
    """A failed sync leaves a clean tree, so there is nothing to preserve.

    `if: always()` used to commit whatever had landed before the failure —
    a red check and a half-applied push at the same time.
    """
    wf = _load()
    steps = wf["jobs"]["sync"]["steps"]
    commit = next(s for s in steps if s.get("name") == "Commit and push")
    assert commit.get("if") == "success()", "a failed sync must never push a partial result"
