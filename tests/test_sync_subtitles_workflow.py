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
