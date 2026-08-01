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
    import socketserver

    serve_auth_local.Handler.script = serve_auth_local.injection("http://x/exchange", "", "")
    handler = functools.partial(serve_auth_local.Handler, directory=serve_auth_local.SITE_DIR)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
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
