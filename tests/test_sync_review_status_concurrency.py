"""Structural guard: review-status syncs are serialized, never cancelled.

Claiming two talks seconds apart fires two `issues` events; the parallel
sync runs raced bot-pr.sh from the same base and produced duplicate stuck
"Update review status" PRs (#728/#729). A concurrency group must queue the
second run behind the first.

Two properties matter:

* The group must be on the JOB, not the workflow: this file also runs via
  ``workflow_call`` (subtitle-pipeline's sync-status job), and top-level
  ``concurrency`` of a called workflow is ignored in that context.
* ``cancel-in-progress`` must stay off: an in-flight sync is a multi-step
  sequence (label edits -> regenerate -> PR -> merge) and killing it midway
  leaves half-applied state — the very race this guard exists to prevent.
"""

from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"


def _sync_job() -> dict:
    wf = yaml.safe_load((WORKFLOWS / "sync-review-status.yml").read_text(encoding="utf-8"))
    return wf["jobs"]["sync"]


def test_sync_job_has_concurrency_group() -> None:
    conc = _sync_job().get("concurrency")
    assert conc, "sync job must declare a job-level concurrency group (workflow-level is ignored under workflow_call)"
    assert isinstance(conc, dict) and conc.get("group"), f"concurrency must name a group, got: {conc!r}"


def test_sync_concurrency_never_cancels_in_progress() -> None:
    conc = _sync_job().get("concurrency") or {}
    cancel = conc.get("cancel-in-progress", False)
    assert cancel is False, (
        "cancel-in-progress must be false: an in-flight sync is a multi-step "
        f"process and must finish; queue new runs instead. Got: {cancel!r}"
    )
