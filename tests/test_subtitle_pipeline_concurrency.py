"""Guard for the per-talk concurrency group in subtitle-pipeline.yml.

Two dispatches for the same talk used to run in parallel and open two bot PRs.
"""

from pathlib import Path

import yaml

WORKFLOW = Path(__file__).parent.parent / ".github" / "workflows" / "subtitle-pipeline.yml"


def _conc():
    return yaml.safe_load(WORKFLOW.read_text())["concurrency"]


def test_runs_for_the_same_talk_serialize_without_cancelling():
    conc = _conc()
    assert "inputs.talk_id" in conc["group"], "group must be scoped per talk"
    assert conc["cancel-in-progress"] is False, "a running pipeline must never be cancelled"


def test_group_is_safe_for_push_triggers():
    # inputs.* is empty on push; the group must still be non-empty and per-ref.
    assert "github.ref" in _conc()["group"]


def test_dry_runs_use_a_separate_group_from_real_runs():
    group = _conc()["group"]
    assert "inputs.dry_run" in group
    assert "inputs.dry_run_tag" in group, "matrix dry runs of one talk must not queue behind each other"
