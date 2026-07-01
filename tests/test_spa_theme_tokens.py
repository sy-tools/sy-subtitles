"""Authoritative palette guard — the design system's two themes, by COMPUTED style.

Reads the real rendered value of each palette token in all six theme states
(OS prefers light/dark × data-theme auto/light/dark) and asserts the canonical
warm-paper (light) / walnut (dark) values, with ONE rule:

    effective theme = dark  if  data-theme=dark, or (data-theme=auto and OS=dark)
                      light otherwise

This enforces what the PR-2 consolidation fixed: an explicit theme always wins
regardless of OS preference, and no token leaks across themes (the old layered
CSS rendered light accent colours — --cell-hover, --stat-active-bg, --mark-bg —
in an explicit dark theme under a light OS). String-grepping CSS can't catch
that; only computed styles can. Edit the palette in tokens.css and update the
LIGHT/DARK maps here in lockstep.
"""

import http.server
import json
import threading
from pathlib import Path

import pytest

pytestmark = pytest.mark.e2e

SITE = Path(__file__).parent.parent / "site"

# Canonical palette (subset that fully exercises the consolidation, incl. the
# tokens that used to leak). Values are the rendered hex/rgb the app ships.
LIGHT = {
    "--bg": "#FAF6EE",
    "--bg2": "#F6F0E2",
    "--bg3": "#F0E9D7",
    "--fg": "#221E18",
    "--fg5": "#766A54",
    "--border": "#E5DCC6",
    "--link": "#8A4A2E",
    "--stat-active-bg": "#EFE4CE",
    "--cell-hover": "#F3ECDB",
    "--cell-edit-bg": "#EDEAD4",
    "--cell-edited-bg": "#EFE6CC",
    "--mark-bg": "rgba(198, 138, 42, 0.14)",
    "--primary-bg": "#E6E9D6",
    "--issue-bg": "#F1E4D3",
    "--danger-bg": "#F2DCD2",
}
DARK = {
    "--bg": "#14120F",
    "--bg2": "#1A1612",
    "--bg3": "#1E1A14",
    "--fg": "#F0E8D6",
    "--fg5": "#8A7F6A",
    "--border": "#2B2720",
    "--link": "#E39770",
    "--stat-active-bg": "#2B2418",
    "--cell-hover": "#221E18",
    "--cell-edit-bg": "#1F2A1C",
    "--cell-edited-bg": "#2A2518",
    "--mark-bg": "rgba(227, 151, 112, 0.14)",
    "--primary-bg": "#223020",
    "--issue-bg": "#2E241A",
    "--danger-bg": "#2E1F1A",
}
NAMES = list(LIGHT)


@pytest.fixture
def served_site():
    index_html = (
        (SITE / "index.html")
        .read_text()
        .replace("<head>", "<head><script>window.__SY_REPO='sy-tools/sy-subtitles';</script>", 1)
        .encode()
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
    yield f"http://127.0.0.1:{port}/index.html"
    httpd.shutdown()


def _read_tokens(page, names):
    return page.evaluate(
        "(names) => { const cs = getComputedStyle(document.documentElement);"
        " const o = {}; for (const n of names) o[n] = cs.getPropertyValue(n).trim(); return o; }",
        names,
    )


def test_palette_is_consistent_across_all_six_theme_states(served_site):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")

    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for scheme in ("light", "dark"):
            for dtheme in (None, "light", "dark"):
                ctx = browser.new_context(color_scheme=scheme)
                pg = ctx.new_page()
                pg.route(
                    "**/api.github.com/**",
                    lambda r: r.fulfill(
                        status=200,
                        content_type="application/json",
                        body=json.dumps({"sha": "x", "tree": [], "truncated": False}),
                    ),
                )
                pg.route("**/raw.githubusercontent.com/**", lambda r: r.fulfill(status=404, body=""))
                pg.goto(served_site)
                if dtheme:
                    pg.evaluate("(t) => document.documentElement.setAttribute('data-theme', t)", dtheme)
                else:
                    pg.evaluate("() => document.documentElement.removeAttribute('data-theme')")
                got = _read_tokens(pg, NAMES)
                is_dark = dtheme == "dark" or (dtheme is None and scheme == "dark")
                want = DARK if is_dark else LIGHT
                state = f"OS={scheme}/data-theme={dtheme or 'auto'} (effective={'dark' if is_dark else 'light'})"
                for n in NAMES:
                    if got[n] != want[n]:
                        failures.append(f"{state} {n}: got {got[n]!r}, want {want[n]!r}")
                ctx.close()
        browser.close()

    assert not failures, "palette drift / cross-theme leak:\n  " + "\n  ".join(failures)
