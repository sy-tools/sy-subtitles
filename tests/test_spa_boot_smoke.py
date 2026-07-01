"""Boot smoke test — the guard that makes "tests green" mean "the site works".

Why this exists: the rest of the suite is unit-level (it greps strings out of
index.html / *.js / *.css) and the ~320 Playwright e2e tests are gated out of the
fast lane. So a change could leave the SPA a fully blank page — failing to boot,
or shipping an unstyled / unlinked stylesheet — while every test the developer
runs still passes. This file closes that gap with ONE cheap, deterministic check:
load the app the way it actually runs and assert it BOOTS, RENDERS, and is STYLED,
with nothing thrown.

It is tagged BOTH `e2e` (so the chromium-free `-m "not e2e"` lane still skips it)
AND `smoke` (so `pytest -m smoke` runs just this, ~5s, as the boot gate for any
SPA change). Deterministic + offline: GitHub is mocked to an empty repo tree, so
the index renders its empty state without network.
"""

import http.server
import json
import threading
from pathlib import Path

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.smoke]

SITE = Path(__file__).parent.parent / "site"


@pytest.fixture
def smoke_server():
    # Serve site/, injecting window.__SY_REPO so deriveRepo() resolves off Pages
    # (the SPA derives owner/repo from the *.github.io host in production; off it,
    # an unresolvable host is a deliberate loud error → blank page).
    index_html = (
        (SITE / "index.html")
        .read_text()
        .replace(
            "<head>",
            "<head><script>window.__SY_REPO='sy-tools/sy-subtitles';</script>",
            1,
        )
        .encode("utf-8")
    )
    directory = str(SITE)

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=directory, **k)

        def log_message(self, *a):
            pass

        def do_GET(self):
            if self.path.split("?", 1)[0] in ("/", "/index.html"):
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(index_html)))
                self.end_headers()
                self.wfile.write(index_html)
                return
            super().do_GET()

    httpd = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{port}"
    httpd.shutdown()


@pytest.fixture
def smoke_page():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        pg = ctx.new_page()
        # Deterministic + offline: empty repo tree, no real network reached.
        pg.route(
            "**/api.github.com/**",
            lambda r: r.fulfill(
                status=200,
                content_type="application/json",
                headers={"ETag": '"smoke"'},
                body=json.dumps({"sha": "smoke", "tree": [], "truncated": False}),
            ),
        )
        pg.route(
            "**/raw.githubusercontent.com/**",
            lambda r: r.fulfill(status=404, body="not found"),
        )
        yield pg
        ctx.close()
        browser.close()


# A truly unstyled <body> computes to a transparent background; the themed app
# paints a real colour (warm paper in light, walnut in dark). Either is fine —
# we only assert the stylesheet actually applied.
_UNSTYLED_BG = {"rgba(0, 0, 0, 0)", "transparent", ""}


def test_spa_boots_renders_and_is_styled_without_errors(smoke_server, smoke_page):
    page = smoke_page
    # pageerror = an UNCAUGHT JS exception. That is the unambiguous "app is
    # broken" signal (a boot-time throw — e.g. deriveRepo on a bad host, or a
    # missing function from an unloaded js module). We do NOT assert on
    # console.error: a mocked resource 404 makes the browser log "Failed to load
    # resource", which is network noise the app handles gracefully, not a defect —
    # coupling the gate to mock completeness would make it flaky.
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    page.goto(f"{smoke_server}/index.html")

    # 1. JS actually BOOTED and rendered the index view: the router sets the
    #    per-view title. A halted boot (the blank-page failure) never reaches
    #    this, so the wait times out and the test fails loudly.
    page.wait_for_function("document.title.includes('Index')", timeout=10000)

    # 2. The stylesheet loaded AND applied (catches a missing/unlinked/404 sheet,
    #    which renders a functional-but-unstyled page no string grep would catch).
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    assert bg not in _UNSTYLED_BG, f"<body> is unstyled — app CSS did not apply (bg={bg!r})"

    # 3. Nothing threw uncaught while booting.
    assert not page_errors, "uncaught JS error(s) during boot:\n  " + "\n  ".join(page_errors)
