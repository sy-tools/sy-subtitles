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


def test_build_model_input_on_dispatch_and_call() -> None:
    """The build step is mechanical timecode alignment — it may run on a
    cheaper/different model than review (e.g. review=Fable, build=Opus).
    An empty default falls back to `model`, so single-model runs need no
    extra input."""
    on = _on(_load())

    dispatch = on["workflow_dispatch"]["inputs"]
    assert "build_model" in dispatch, "workflow_dispatch is missing the `build_model` input"
    assert dispatch["build_model"].get("type") == "choice"
    options = dispatch["build_model"].get("options", [])
    assert DEFAULT_MODEL in options
    assert "claude-fable-5" in options
    # first option is the default for a choice input without explicit default;
    # an explicit empty-string default is not representable in choice, so the
    # sentinel option "same-as-model" must come first.
    assert options[0] == "same-as-model"

    call = on["workflow_call"]["inputs"]
    assert "build_model" in call, "workflow_call is missing the `build_model` input"
    assert call["build_model"].get("type") == "string"
    assert call["build_model"].get("default", "") in ("", "same-as-model")


def test_build_model_env_fallback_chain() -> None:
    """MODEL_BUILD: build_model if set (and not the sentinel) → model → default."""
    env = _load()["env"]
    build = str(env.get("MODEL_BUILD", ""))
    assert "inputs.build_model" in build, f"MODEL_BUILD must consider inputs.build_model, got: {build!r}"
    assert "inputs.model" in build, f"MODEL_BUILD must fall back to inputs.model, got: {build!r}"
    assert DEFAULT_MODEL in build, f"MODEL_BUILD must keep the push-run fallback, got: {build!r}"
    assert "same-as-model" in build, f"MODEL_BUILD must neutralize the sentinel option, got: {build!r}"


def test_build_step_uses_model_build() -> None:
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    build_args = [line for line in text.splitlines() if "claude_args" in line and "--effort high" in line]
    assert build_args, "build-step claude_args not found (expected the only --effort high)"
    for line in build_args:
        assert "env.MODEL_BUILD" in line, f"build step must use env.MODEL_BUILD: {line.strip()}"


def test_model_env_wired_to_input() -> None:
    heavy = _load()["env"]["MODEL_HEAVY"]
    assert "inputs.model" in str(heavy), f"MODEL_HEAVY must be driven by inputs.model, got: {heavy!r}"
    assert DEFAULT_MODEL in str(heavy), (
        f"MODEL_HEAVY must keep the default fallback for push-triggered runs (no inputs context), got: {heavy!r}"
    )
