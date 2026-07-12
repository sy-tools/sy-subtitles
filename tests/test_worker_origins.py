"""Guards for the OAuth-exchange Worker's CORS origin allowlist.

The DEPLOYED (production) Worker must only trust the GitHub Pages origin: the
CI deploy reads ALLOWED_ORIGINS from wrangler.toml's [vars], so a localhost
entry there would let a page served from any localhost:8000 use the production
Worker to exchange codes. Local development never hits the production Worker
(the injected SPA points at `wrangler dev` on localhost:8787), so localhost
belongs only in .dev.vars — read by `wrangler dev`, never shipped.
"""

import re
from pathlib import Path

WORKER = Path(__file__).resolve().parents[1] / "workers" / "oauth-exchange"
WRANGLER = WORKER / "wrangler.toml"
DEV_VARS_EXAMPLE = WORKER / ".dev.vars.example"

PROD_ORIGIN = "https://sy-tools.github.io"
LOCAL_ORIGINS = ("localhost", "127.0.0.1")


def _wrangler_allowed_origins() -> list[str]:
    text = WRANGLER.read_text(encoding="utf-8")
    m = re.search(r'^\s*ALLOWED_ORIGINS\s*=\s*"([^"]*)"', text, re.MULTILINE)
    assert m, "wrangler.toml must set ALLOWED_ORIGINS in [vars]"
    return [o.strip() for o in m.group(1).split(",") if o.strip()]


def test_prod_wrangler_allows_only_the_pages_origin() -> None:
    origins = _wrangler_allowed_origins()
    assert origins == [PROD_ORIGIN], f"the deployed Worker must trust only {PROD_ORIGIN}, got {origins}"


def test_prod_wrangler_has_no_localhost_origin() -> None:
    joined = ",".join(_wrangler_allowed_origins())
    for local in LOCAL_ORIGINS:
        assert local not in joined, f"{local} must not be a trusted origin on the prod Worker"


def test_dev_vars_example_documents_localhost_for_local_dev() -> None:
    """`wrangler dev` needs localhost trusted — .dev.vars.example must show how,
    including the prod origin so a dev can test against either."""
    text = DEV_VARS_EXAMPLE.read_text(encoding="utf-8")
    m = re.search(r"^\s*ALLOWED_ORIGINS\s*=\s*(.+)$", text, re.MULTILINE)
    assert m, ".dev.vars.example must show ALLOWED_ORIGINS for local dev"
    value = m.group(1).strip()
    assert "localhost:8000" in value
    assert PROD_ORIGIN in value
