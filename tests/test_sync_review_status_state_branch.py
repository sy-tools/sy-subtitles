"""Review statuses are published on the `state` branch, never through `main`.

They are derived from issue labels and nobody reviews them, so a pull request
into `main` per label change bought nothing but a `gate` run and a commit in
the code history. sync-review-status.yml pushes the file to a data branch
instead (.github/scripts/push-state.sh).

What that leaves to guard structurally:

* the issues are read INSIDE the command push-state.sh re-runs — a refused
  push must publish a fresh reading, not the one that lost the race;
* the push needs `contents: write`, which a called workflow only has when
  every caller grants it (the repository default is read-only);
* nothing in the job can open a pull request or reach the bot App's key.
"""

import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
SYNC = "sync-review-status.yml"
STATUS_SOURCE_JS = ROOT / "site" / "js" / "review_status_source.js"


def _load(name: str) -> dict:
    return yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))


def _sync_job() -> dict:
    return _load(SYNC)["jobs"]["sync"]


def _publishes(step: dict) -> bool:
    return "push-state.sh" in str(step.get("run", ""))


def _publish_step() -> dict:
    steps = [s for s in _sync_job()["steps"] if _publishes(s)]
    assert len(steps) == 1, "exactly one step publishes the statuses"
    return steps[0]


def _published_branch() -> str:
    match = re.search(r"push-state\.sh\s+(\S+)", _publish_step()["run"])
    assert match, "push-state.sh must be given the branch to publish on"
    return match.group(1)


def test_statuses_are_not_committed_through_a_pull_request():
    text = (WORKFLOWS / SYNC).read_text(encoding="utf-8")
    assert "bot-pr.sh" not in text
    assert "gh pr " not in text
    assert "pull-requests" not in _load(SYNC)["permissions"], "a workflow that opens no PR asks for no PR permission"


def test_statuses_are_published_on_a_branch_that_is_not_main():
    assert _published_branch() not in ("main", "")


def test_spa_reads_the_branch_the_workflow_publishes_on():
    declared = re.search(r"var STATE_BRANCH = '([^']+)';", STATUS_SOURCE_JS.read_text(encoding="utf-8"))
    assert declared, "review_status_source.js must declare STATE_BRANCH"
    assert declared.group(1) == _published_branch()


def test_issues_are_read_by_the_command_a_refused_push_reruns():
    run = _publish_step()["run"]
    generator = run[run.index("push-state.sh") :]
    assert "sync-review-status.py" in generator, "the generator must be handed to push-state.sh, not run before it"
    assert '--status-file "$STATE_DIR/review-status.json"' in generator
    other_steps = [s for s in _sync_job()["steps"] if not _publishes(s)]
    assert all("sync-review-status.py" not in str(s.get("run", "")) for s in other_steps), (
        "statuses generated in an earlier step are generated once: a retry would publish the stale reading"
    )


def test_first_run_is_seeded_from_the_copy_on_main():
    assert "--seed review-status.json" in _publish_step()["run"]


def test_script_and_talk_list_come_from_the_live_main_tip():
    """Called from subtitle-pipeline.yml the default checkout is the dispatch
    commit, an hour stale by the time the build finishes: a talk added since
    has no `talks/` directory there, and its Operator issue would be skipped."""
    checkouts = [s for s in _sync_job()["steps"] if str(s.get("uses", "")).startswith("actions/checkout@")]
    assert len(checkouts) == 1
    assert checkouts[0]["with"]["ref"] == "main"
    assert "token" not in checkouts[0]["with"], "the push is GITHUB_TOKEN's: it must fire no other workflow"


def test_sync_job_needs_no_secret_beyond_the_workflow_token():
    job = _sync_job()
    assert "environment" not in job
    assert "BOT_APP" not in yaml.safe_dump(job)


def test_workflow_asks_for_the_permission_the_push_needs():
    assert _load(SYNC)["permissions"]["contents"] == "write"


def _callers() -> list[tuple[str, dict, dict]]:
    found = []
    for path in sorted(WORKFLOWS.glob("*.yml")):
        wf = yaml.safe_load(path.read_text(encoding="utf-8"))
        for job_id, spec in (wf.get("jobs") or {}).items():
            if str(spec.get("uses", "")).endswith("/" + SYNC):
                found.append((f"{path.name}:{job_id}", spec, wf))
    assert {name for name, _, _ in found} == {"subtitle-pipeline.yml:sync-status", "talk-operator.yml:status"}
    return found


def test_every_caller_grants_the_called_workflow_contents_write():
    """A called workflow gets at most its caller's permissions, and the
    repository default is read-only: a caller that grants less fails the run
    at startup instead of publishing."""
    short = [
        name
        for name, spec, wf in _callers()
        if (spec.get("permissions") or wf.get("permissions") or {}).get("contents") != "write"
    ]
    assert short == []


def test_no_caller_hands_the_sync_its_secrets():
    assert [name for name, spec, _ in _callers() if "secrets" in spec] == []
