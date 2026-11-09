"""Only allow-listed people can start a pipeline run that spends Claude tokens."""

from pathlib import Path

import pytest
import yaml

from tools.workflow_validation import InvalidWorkflowInput, validate_llm_actor

WORKFLOW = Path(__file__).parent.parent / ".github" / "workflows" / "subtitle-pipeline.yml"


def test_llm_actor_on_the_list_passes():
    assert validate_llm_actor("SlavaSubotskiy", "SlavaSubotskiy") == "SlavaSubotskiy"


def test_llm_actor_compares_logins_case_insensitively_and_trims_the_list():
    validate_llm_actor("slavasubotskiy", " SlavaSubotskiy , someone-else ")


@pytest.mark.parametrize("actor", ["someone-else", "", "SlavaSubotskiy2"])
def test_llm_actor_off_the_list_is_refused(actor):
    with pytest.raises(InvalidWorkflowInput, match="not allowed"):
        validate_llm_actor(actor, "SlavaSubotskiy")


def test_an_empty_list_refuses_everyone():
    with pytest.raises(InvalidWorkflowInput):
        validate_llm_actor("SlavaSubotskiy", " , ")


def _guard_step():
    steps = yaml.safe_load(WORKFLOW.read_text())["jobs"]["discover"]["steps"]
    found = [s for s in steps if "--llm-actor" in s.get("run", "")]
    assert len(found) == 1, "discover must run exactly one LLM actor guard"
    return steps, found[0]


def test_guard_runs_in_discover_before_anything_else_that_needs_it():
    steps, guard = _guard_step()
    assert steps.index(guard) == 1, "guard must follow checkout and precede the discovery step"


def test_guard_checks_whoever_triggered_this_attempt():
    _, guard = _guard_step()
    assert guard["env"]["LLM_ACTOR"] == "${{ github.triggering_actor }}"


def test_guard_list_is_a_repo_variable_failing_closed_to_the_owner():
    _, guard = _guard_step()
    assert guard["env"]["LLM_ACTORS_ALLOWED"] == "${{ vars.PIPELINE_LLM_ACTORS || 'SlavaSubotskiy' }}"


def test_guard_skips_runs_that_spend_no_tokens():
    _, guard = _guard_step()
    cond = guard["if"]
    assert "!inputs.dry_run" in cond
    for step in ("translate", "review", "build"):
        assert f"inputs.{step} != false" in cond
    assert "whisper" not in cond
