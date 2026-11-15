"""Only an operator flagged `llm: true` in roles.yaml can start a pipeline run
that spends Claude tokens (tools.roles.may_spend_llm; tests/test_roles.py)."""

from pathlib import Path

import yaml

WORKFLOW = Path(__file__).parent.parent / ".github" / "workflows" / "subtitle-pipeline.yml"


def _guard_step():
    steps = yaml.safe_load(WORKFLOW.read_text())["jobs"]["discover"]["steps"]
    found = [s for s in steps if "tools.roles may-spend-llm" in s.get("run", "")]
    assert len(found) == 1, "discover must run exactly one LLM actor guard"
    return steps, found[0]


def test_guard_runs_in_discover_before_anything_else_that_needs_it():
    steps, guard = _guard_step()
    names = [s.get("name", "") for s in steps]
    assert names.index("Install pyyaml") < steps.index(guard), "roles.py reads YAML"
    assert steps.index(guard) < names.index("Find talks, videos, and pending whisper")


def test_guard_checks_whoever_triggered_this_attempt():
    _, guard = _guard_step()
    assert guard["env"]["LLM_ACTOR"] == "${{ github.triggering_actor }}"


def test_guard_resolves_the_login_through_the_api_and_reads_roles_yaml():
    _, guard = _guard_step()
    assert '--login "$LLM_ACTOR"' in guard["run"]
    assert guard["env"]["GH_TOKEN"] == "${{ github.token }}"
    assert "PIPELINE_LLM_ACTORS" not in WORKFLOW.read_text()


def test_guard_skips_runs_that_spend_no_tokens():
    _, guard = _guard_step()
    cond = guard["if"]
    assert "!inputs.dry_run" in cond
    for step in ("translate", "review", "build"):
        assert f"inputs.{step} != false" in cond
    assert "whisper" not in cond


def test_guard_reads_roles_yaml_from_main_not_from_the_dispatched_ref():
    _, guard = _guard_step()
    run = guard["run"]
    assert "git fetch" in run and "origin main" in run
    assert "FETCH_HEAD:roles.yaml" in run
    assert '--roles "$RUNNER_TEMP/roles.yaml"' in run
