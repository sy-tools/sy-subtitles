"""Structural guard: the pipeline's OAuth token is selectable per run.

Convention: the ``oauth_token`` input names the account. ``default`` (or an
empty value on push-triggered runs) uses ``secrets.CLAUDE_CODE_OAUTH_TOKEN``;
any other value ``X`` uses ``secrets.CLAUDE_CODE_OAUTH_TOKEN_X`` (option
values are literal uppercase suffixes — GH expressions have no upper()).

Fail-fast: when a named account is selected and its secret is missing or
empty, the run must FAIL before any LLM step — silently falling back to the
default account would burn the primary account's weekly limits unnoticed.
The env expression resolves to '' in that case and explicit guard steps
abort; it must also never leak a boolean (a bare ``a && b`` expression that
evaluates false would stringify to ``'false'`` and be sent as the token).
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


def test_oauth_token_env_no_silent_fallback() -> None:
    env = _load()["env"]
    expr = str(env.get("OAUTH_TOKEN", ""))
    assert "CLAUDE_CODE_OAUTH_TOKEN_{0}" in expr, (
        f"OAUTH_TOKEN must resolve the named secret via format('CLAUDE_CODE_OAUTH_TOKEN_{{0}}', …), got: {expr!r}"
    )
    assert "inputs.oauth_token" in expr, f"OAUTH_TOKEN must be driven by inputs.oauth_token, got: {expr!r}"
    # the default secret may be used ONLY behind the explicit == 'default' /
    # empty-input condition — a bare `|| secrets.CLAUDE_CODE_OAUTH_TOKEN`
    # tail after the named lookup is the silent-fallback bug shape
    assert "inputs.oauth_token == 'default'" in expr, (
        f"default secret must be gated by an explicit == 'default' condition, got: {expr!r}"
    )
    tail = expr[expr.index("CLAUDE_CODE_OAUTH_TOKEN_{0}") :]
    assert not tail.rstrip("}' ").rstrip().endswith("secrets.CLAUDE_CODE_OAUTH_TOKEN"), (
        f"named-secret miss must NOT fall back to the default secret: {expr!r}"
    )
    # boolean-false must never stringify into the token value
    assert "|| ''" in expr, f"expression must end with || '' so a false branch yields empty, got: {expr!r}"


def test_token_guard_steps_fail_on_empty() -> None:
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    guards = [line for line in text.splitlines() if '-z "$OAUTH_TOKEN"' in line]
    assert len(guards) >= 2, (
        "expected explicit empty-token guard steps in both LLM jobs "
        f"(translate-and-review, build-timecodes), found {len(guards)}"
    )


def test_all_claude_steps_use_selected_token() -> None:
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    lines = [line.strip() for line in text.splitlines() if "claude_code_oauth_token:" in line]
    assert len(lines) >= 3, f"expected 3+ claude-code-action steps, found {len(lines)}"
    for line in lines:
        assert "env.OAUTH_TOKEN" in line, f"step must use the selected token (env.OAUTH_TOKEN): {line}"
