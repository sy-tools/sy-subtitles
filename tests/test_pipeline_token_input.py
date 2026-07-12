"""Structural guard: the pipeline's OAuth token is selectable per run.

Convention: the ``oauth_token`` input names the account. ``default`` (or an
empty value on push-triggered runs) uses ``secrets.CLAUDE_CODE_OAUTH_TOKEN``;
any other value ``X`` uses ``secrets.CLAUDE_CODE_OAUTH_TOKEN_X`` (option
values are literal uppercase suffixes — GH expressions have no upper()).
An unset/empty named secret must fall back to the default token, so a typo
or missing secret degrades gracefully instead of running token-less.
"""

from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"


def _load() -> dict:
    return yaml.safe_load((WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8"))


def _on(wf: dict) -> dict:
    # PyYAML parses the bare `on:` key as boolean True.
    return wf.get("on", wf.get(True))


def test_oauth_token_input_on_dispatch_and_call() -> None:
    on = _on(_load())

    dispatch = on["workflow_dispatch"]["inputs"]
    assert "oauth_token" in dispatch, "workflow_dispatch is missing the `oauth_token` input"
    assert dispatch["oauth_token"].get("type") == "choice"
    assert dispatch["oauth_token"].get("default") == "default"
    options = dispatch["oauth_token"].get("options", [])
    assert "default" in options
    assert "EXTRA" in options
    # non-default options are literal secret-name suffixes; expressions have
    # no upper(), so lowercase options would silently miss the secret
    for opt in options:
        if opt != "default":
            assert opt == opt.upper(), f"non-default option must be an uppercase suffix: {opt!r}"

    call = on["workflow_call"]["inputs"]
    assert "oauth_token" in call, "workflow_call is missing the `oauth_token` input"
    assert call["oauth_token"].get("type") == "string"
    assert call["oauth_token"].get("default") == "default"


def test_oauth_token_env_convention_and_fallback() -> None:
    env = _load()["env"]
    expr = str(env.get("OAUTH_TOKEN", ""))
    assert "CLAUDE_CODE_OAUTH_TOKEN_{0}" in expr, (
        f"OAUTH_TOKEN must resolve the named secret via format('CLAUDE_CODE_OAUTH_TOKEN_{{0}}', …), got: {expr!r}"
    )
    assert "inputs.oauth_token" in expr, f"OAUTH_TOKEN must be driven by inputs.oauth_token, got: {expr!r}"
    assert "secrets.CLAUDE_CODE_OAUTH_TOKEN" in expr, (
        f"OAUTH_TOKEN must fall back to the default secret (push runs, empty named secret), got: {expr!r}"
    )


def test_all_claude_steps_use_selected_token() -> None:
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    lines = [line.strip() for line in text.splitlines() if "claude_code_oauth_token:" in line]
    assert len(lines) >= 3, f"expected 3+ claude-code-action steps, found {len(lines)}"
    for line in lines:
        assert "env.OAUTH_TOKEN" in line, f"step must use the selected token (env.OAUTH_TOKEN): {line}"
