"""Structural guards for the OAuth-exchange Worker deploy workflow.

The Worker (workers/oauth-exchange/) must be deployed through CI, not from a
laptop: the workflow deploys on merge to main (paths-filtered) and on manual
dispatch, and injects the GitHub App credentials as Worker secrets from repo
secrets — never inline.
"""

from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"
WF = WORKFLOWS / "deploy-worker.yml"


def _load():
    return yaml.safe_load(WF.read_text(encoding="utf-8"))


def test_deploys_on_main_push_touching_worker_and_on_dispatch() -> None:
    data = _load()
    on = data[True] if True in data else data["on"]  # yaml parses bare `on:` as True
    assert "workflow_dispatch" in on
    push = on["push"]
    assert push["branches"] == ["main"]
    assert any(p.startswith("workers/oauth-exchange") for p in push["paths"])
    # The workflow file itself must retrigger a deploy when it changes.
    assert ".github/workflows/deploy-worker.yml" in push["paths"]


def test_uses_wrangler_action_from_worker_directory() -> None:
    text = WF.read_text(encoding="utf-8")
    assert "cloudflare/wrangler-action@" in text
    assert "workingDirectory: workers/oauth-exchange" in text


def test_wrangler_action_is_sha_pinned() -> None:
    """Third-party action handling all four secrets must be pinned to an
    immutable commit SHA (a movable tag could be repointed at hostile code)."""
    import re

    text = WF.read_text(encoding="utf-8")
    ref = re.search(r"cloudflare/wrangler-action@(\S+)", text).group(1)
    assert re.fullmatch(r"[0-9a-f]{40}", ref), f"not SHA-pinned: {ref}"


def test_worker_secrets_come_from_repo_secrets_not_inline() -> None:
    """GH_CLIENT_ID / GH_CLIENT_SECRET must flow repo-secret -> env -> wrangler
    `secrets:` input; a literal value in the workflow would leak the secret."""
    text = WF.read_text(encoding="utf-8")
    assert "${{ secrets.CLOUDFLARE_API_TOKEN }}" in text
    assert "${{ secrets.GH_OAUTH_CLIENT_ID }}" in text
    assert "${{ secrets.GH_OAUTH_CLIENT_SECRET }}" in text
    data = _load()
    deploy = data["jobs"]["deploy"]
    step = next(s for s in deploy["steps"] if "wrangler-action" in str(s.get("uses", "")))
    wrangler_secrets = step["with"]["secrets"].split()
    assert wrangler_secrets == ["GH_CLIENT_ID", "GH_CLIENT_SECRET"]
    assert step["env"]["GH_CLIENT_ID"] == "${{ secrets.GH_OAUTH_CLIENT_ID }}"
    assert step["env"]["GH_CLIENT_SECRET"] == "${{ secrets.GH_OAUTH_CLIENT_SECRET }}"


def test_minimal_permissions() -> None:
    data = _load()
    assert data["permissions"] == {"contents": "read"}
