"""Structural guard: the pipeline's Claude model is selectable per run.

The three LLM steps (translate, review, build-timecodes) read the model from
workflow-level ``env.MODEL_HEAVY``. A ``model`` input on workflow_dispatch and
workflow_call must feed that env with a safe default, so a run can be
dispatched on a different model (e.g. claude-fable-5) without editing the
workflow. Push-triggered runs have no inputs, so the env expression must
fall back to the default model.
"""

from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"

DEFAULT_MODEL = "claude-opus-4-8"


def _load() -> dict:
    return yaml.safe_load((WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8"))


def _on(wf: dict) -> dict:
    # PyYAML parses the bare `on:` key as boolean True.
    return wf.get("on", wf.get(True))


def test_model_input_on_dispatch_and_call() -> None:
    on = _on(_load())

    dispatch = on["workflow_dispatch"]["inputs"]
    assert "model" in dispatch, "workflow_dispatch is missing the `model` input"
    assert dispatch["model"].get("default") == DEFAULT_MODEL
    assert dispatch["model"].get("type") == "choice"
    options = dispatch["model"].get("options", [])
    assert DEFAULT_MODEL in options
    assert "claude-fable-5" in options

    # workflow_call inputs don't support `choice` — plain string with the
    # same default keeps matrix/driver callers on the current model.
    call = on["workflow_call"]["inputs"]
    assert "model" in call, "workflow_call is missing the `model` input"
    assert call["model"].get("default") == DEFAULT_MODEL
    assert call["model"].get("type") == "string"


def test_model_env_wired_to_input() -> None:
    heavy = _load()["env"]["MODEL_HEAVY"]
    assert "inputs.model" in str(heavy), f"MODEL_HEAVY must be driven by inputs.model, got: {heavy!r}"
    assert DEFAULT_MODEL in str(heavy), (
        f"MODEL_HEAVY must keep the default fallback for push-triggered runs (no inputs context), got: {heavy!r}"
    )
