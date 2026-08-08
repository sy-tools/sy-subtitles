"""Hiding guard — every surface the SPA hides must actually stop rendering.

Why this exists: `el.hidden = true` only sets an attribute. It stops the element
rendering through ONE rule, the UA's `[hidden] { display: none }` — and any
AUTHOR `display` in components.css outranks that rule and keeps the element on
screen. So a surface can be "hidden" in every sense the code and the unit tests
can see, and still be painted.

Nothing else in the suite can catch it. The string lanes grep CSS and markup;
the burn driver harness in test_spa_cache.js drives the real driver against stub
elements that model the `hidden` PROPERTY only, so a stub goes hidden even when
no rule exists to hide the real one. That gap shipped the disowned-readout bug:
renderVideoItem() correctly hid #burn-track and #burn-run-link under a "create
the video" label, three fixes in a row passed their tests, and the user kept
seeing a full blue track and a run link under the offer to build.

Only computed style settles it, so this file loads the app and reads the value
the browser actually resolved. Tagged `smoke` as well as `e2e`: it is the same
kind of gate as the boot smoke — cheap, deterministic, and the difference
between "tests green" and "the page is right".
"""

import http.server
import json
import re
import threading
from pathlib import Path

import pytest

pytestmark = [pytest.mark.e2e, pytest.mark.smoke]

SITE = Path(__file__).parent.parent / "site"

# Surfaces hidden from JS ALONE, so they ship no `hidden` attribute in the
# markup for the derivation below to find. Keep in step with the `.hidden =`
# assignments in index.html.
JS_ONLY_HIDDEN = ["#export-video .export-item__meta"]

# The surfaces MUST come from the markup, never from the live DOM: boot-time JS
# rewrites the attribute (renderVideoItem() unhides #burn-track in the
# signed-out session, where the whole item is display:none anyway), so a sweep
# of the rendered [hidden] elements silently skips the very element this bug is
# about — and reports success for having measured nothing.
_HIDDEN_TAG = re.compile(r"<[a-z][a-z0-9-]*\b[^>]*?\shidden(?=[\s>/])[^>]*>", re.I | re.S)


def _hidden_surfaces():
    """Selectors for every element index.html ships with a `hidden` attribute."""
    out = []
    for tag in _HIDDEN_TAG.findall((SITE / "index.html").read_text()):
        ident = re.search(r'\bid="([^"]+)"', tag)
        cls = re.search(r'\bclass="([^"]+)"', tag)
        if ident:
            out.append("#" + ident.group(1))
        elif cls:
            out.append("." + ".".join(cls.group(1).split()))
    return out + JS_ONLY_HIDDEN


# Reads the display the browser RESOLVED for each surface while it is hidden.
# Each element is measured in isolation and restored: a hidden ancestor must not
# be what makes a descendant look hidden.
_MEASURE = """
(selectors) => {
  const out = [];
  for (const sel of selectors) {
    for (const el of document.querySelectorAll(sel)) {
      const had = el.hasAttribute('hidden');
      el.hidden = true;
      out.push({ name: sel, display: getComputedStyle(el).display });
      if (!had) el.removeAttribute('hidden');
    }
  }
  return out;
}
"""


@pytest.fixture
def served_site():
    # Same shape as the boot smoke: serve site/ with window.__SY_REPO injected so
    # the SPA resolves its repo off GitHub Pages instead of failing loudly to a
    # blank page (which would carry no styled markup to measure).
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
def booted_page(served_site, browser):
    ctx = browser.new_context()
    pg = ctx.new_page()
    # Deterministic + offline: empty repo tree, no real network reached.
    pg.route(
        "**/api.github.com/**",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            headers={"ETag": '"hidden"'},
            body=json.dumps({"sha": "hidden", "tree": [], "truncated": False}),
        ),
    )
    pg.route(
        "**/raw.githubusercontent.com/**",
        lambda r: r.fulfill(status=404, body="not found"),
    )
    pg.goto(f"{served_site}/index.html")
    # The app has to have booted and applied its stylesheet, or every element
    # would measure as "correctly hidden" for the wrong reason.
    pg.wait_for_function("document.title.includes('Index')", timeout=10000)
    yield pg
    ctx.close()


def test_disowned_render_readout_leaves_the_screen(booted_page):
    # The exact combination the user photographed: renderVideoItem() disowns a
    # finished render and hides its track and its run link, and both stay on
    # screen under "Create the video with subtitles" — a full progress bar and a
    # link to a run the label above them says does not exist.
    rows = booted_page.evaluate(_MEASURE, ["#burn-track", "#burn-run-link"])
    assert len(rows) == 2, f"the disowned readout is not in the markup: {rows}"
    shown = [r for r in rows if r["display"] != "none"]
    assert not shown, (
        "hidden by renderVideoItem() but still rendered: "
        + ", ".join(f"{r['name']} → display:{r['display']}" for r in shown)
        + " — an author `display` outranks the UA [hidden] rule, so each of"
        " these needs its own [hidden] rule in components.css"
    )


def test_every_hideable_surface_stops_rendering_when_hidden(booted_page):
    # The class of bug, not the one instance: every surface the SPA hides,
    # measured for real. A new one with an author `display` and no [hidden] rule
    # fails here the day it is added, not three fixes into a bug report.
    selectors = _hidden_surfaces()
    assert "#burn-track" in selectors, (
        "the surfaces are derived from index.html — the derivation broke, and a"
        f" guard that measures nothing passes everything (found {selectors})"
    )
    rows = booted_page.evaluate(_MEASURE, selectors)
    assert len(rows) == len(selectors), (
        f"only {len(rows)} of {len(selectors)} surfaces resolved in the page: {selectors}"
    )
    shown = [r for r in rows if r["display"] != "none"]
    assert not shown, "hidden surfaces that still render: " + ", ".join(
        f"{r['name']} → display:{r['display']}" for r in shown
    )
