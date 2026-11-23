"""The local auth stand must never serve a stale asset.

This server exists so a developer can sign in locally and exercise the real
app. It marked ``index.html`` ``no-store`` and left everything else to the
default handler — so Chrome cached ``css/*.css`` and ``js/*.js`` happily, and
edits to those files simply did not reach the page.

That cost hours: three rounds of "fixed it" on a CSS bug, each verified green
in the unit suites and each landing on a browser still holding the previous
stylesheet. The freshness of a development stand is a testable property, so it
is tested.
"""

from __future__ import annotations

import http.client
import threading
from contextlib import closing

import pytest

from tools import serve_auth_local


@pytest.fixture
def stand():
    """The real server on an ephemeral port, torn down after the test."""
    import functools

    serve_auth_local.Handler.script = serve_auth_local.injection("http://x/exchange", "", "")
    handler = functools.partial(serve_auth_local.Handler, directory=serve_auth_local.SITE_DIR)
    with serve_auth_local.SpaHTTPServer(("127.0.0.1", 0), handler) as httpd:
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            yield httpd.server_address[1]
        finally:
            httpd.shutdown()


def _head(port: int, path: str):
    with closing(http.client.HTTPConnection("127.0.0.1", port, timeout=5)) as conn:
        conn.request("GET", path)
        resp = conn.getresponse()
        resp.read()
        return resp


@pytest.mark.parametrize(
    "path",
    [
        "/index.html",
        "/css/components.css",  # the one that actually bit
        "/css/tokens.css",
        "/js/export_menu.js",
        "/js/burn_video.js",
    ],
)
def test_every_asset_is_served_no_store(stand, path):
    resp = _head(stand, path)
    assert resp.status == 200, f"{path} -> {resp.status}"
    cache = (resp.getheader("Cache-Control") or "").lower()
    assert "no-store" in cache, (
        f"{path} was served with Cache-Control={cache!r}. A cached asset on a "
        f"development stand means an edit that never reaches the page, and the "
        f"developer debugging code the browser is not running."
    )


def test_index_still_carries_the_injected_hooks(stand):
    """The no-store change must not disturb what this server is for."""
    with closing(http.client.HTTPConnection("127.0.0.1", stand, timeout=5)) as conn:
        conn.request("GET", "/index.html")
        resp = conn.getresponse()
        body = resp.read().decode("utf-8")
    assert "__SY_GH_EXCHANGE_URL" in body
    assert body.index("__SY_GH_EXCHANGE_URL") < body.index("<script src="), (
        "the hooks must run before any app code, or the OAuth callback is consumed before they exist"
    )


def test_the_injection_points_the_help_sheet_at_another_help_repo():
    script = serve_auth_local.injection("http://x", "", help_repo="sy-tools/sy-help-staging")
    assert "window.__SY_HELP_REPO='sy-tools/sy-help-staging';" in script
    assert "__SY_HELP_REPO" not in serve_auth_local.injection("http://x", "")


def test_the_injection_can_turn_the_passphrase_gate_on_for_a_test_phrase():
    from tools.passphrase_gate import derive_hash

    script = serve_auth_local.injection("http://x", "", gate_phrase="test-passphrase")
    expected = derive_hash("test-passphrase", "a3f1c92e6b4d80571e2c9f3a6d8b0e47", 200000)
    assert f"window.__SY_GATE_HASH='{expected}';" in script
    assert "test-passphrase" not in script
    assert "__SY_GATE_HASH" not in serve_auth_local.injection("http://x", "")
