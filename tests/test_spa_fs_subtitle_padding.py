"""Fullscreen subtitle side inset — CSS specificity guard.

`components.css:373` deliberately gives fullscreen subtitles a 10% side inset.
`components.css:668` — written for the embedded (non-fullscreen) resized
block, and carrying no `.fs-mode` in its selector — ties `:373`'s
specificity and, sitting later in the file, silently overrides it to a 24px
inset once the user has ever dragged the subtitle resize handle
(`data-subs-tuned="1"`). The fix lives in the still more specific
`#view-preview.fs-mode[data-subs-tuned="1"] #subtitle-overlay` rule
(`:801`), which re-asserts the 10% and, being strictly more specific than
both `:373` and `:668`, wins regardless of source order.

A string-grep test cannot detect this: the "correct" 10% rule is already
present in the file and greps green today. Only a computed style catches
the override, so this test drives a real browser. Harness copied from
`tests/test_spa_theme_tokens.py` (server, `__SY_REPO` injection, GitHub API
route stubs so the SPA never hits the real network).

The burned-in subtitle renderer wraps text at the same 10% side inset
(`SIDE_INSET_RATIO` in `tools/burn_subtitles.py`), so this rule and the
renderer must agree or the burned video breaks subtitle lines differently
than the app preview.
"""

import http.server
import json
import threading
from pathlib import Path

import pytest

pytestmark = pytest.mark.e2e

SITE = Path(__file__).parent.parent / "site"


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


@pytest.fixture
def page(served_site, browser):
    """A Playwright page loaded on the served SPA, with GitHub API calls
    stubbed locally (same routes as tests/test_spa_theme_tokens.py) so the
    test stays hermetic and isn't exposed to real network calls or GitHub
    rate limiting. Always closes its context, even on assertion failure.
    """
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    try:
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
        yield pg
    finally:
        ctx.close()


def _measure(page, fs_mode, tuned=True):
    """Put the preview into the given mode and read the overlay's side inset."""
    return page.evaluate(
        """({fsMode, tuned}) => {
            const vp = document.getElementById('view-preview');
            const ov = document.getElementById('subtitle-overlay');
            vp.classList.add('active');
            vp.classList.toggle('fs-mode', fsMode);
            if (tuned) {
                vp.setAttribute('data-subs-tuned', '1');
            } else {
                vp.removeAttribute('data-subs-tuned');
            }
            ov.textContent = 'Від матерії ви переходите, скажімо, до живих рослин,';
            const cs = getComputedStyle(ov);
            return {
                left: parseFloat(cs.paddingLeft),
                right: parseFloat(cs.paddingRight),
                top: parseFloat(cs.paddingTop),
                bottom: parseFloat(cs.paddingBottom),
                width: ov.getBoundingClientRect().width,
            };
        }""",
        {"fsMode": fs_mode, "tuned": tuned},
    )


def test_fullscreen_tuned_subtitles_keep_the_ten_percent_side_inset(page):
    fs = _measure(page, True)
    # The viewport is pinned at 1280px and the overlay spans it in fullscreen,
    # so 10% is a known 128.0px. Assert the width too -- otherwise a future
    # regression that both re-broke the padding AND shrank the overlay could
    # hide a wrong absolute inset behind a coincidentally-correct ratio.
    assert fs["width"] == pytest.approx(1280.0, abs=1.0)
    assert fs["left"] == pytest.approx(128.0, abs=1.0), (
        "fullscreen subtitles lost their 10% side inset -- the embedded "
        "[data-subs-tuned] rule is overriding .fs-mode again"
    )
    assert fs["right"] == pytest.approx(128.0, abs=1.0)
    # The vertical paddings are what the burn ratios are calibrated to.
    assert fs["top"] == pytest.approx(80.0, abs=0.5)
    assert fs["bottom"] == pytest.approx(36.0, abs=0.5)


def test_fullscreen_untuned_subtitles_keep_the_ten_percent_side_inset(page):
    """Covers `:373` directly -- the source of the same 10% inset for every
    user who has never dragged the resize handle (no `data-subs-tuned`),
    which the burn renderer's fixed 10% also depends on."""
    fs = _measure(page, True, tuned=False)
    assert fs["width"] == pytest.approx(1280.0, abs=1.0)
    assert fs["left"] == pytest.approx(128.0, abs=1.0)
    assert fs["right"] == pytest.approx(128.0, abs=1.0)


def test_embedded_tuned_subtitles_keep_their_own_padding(page):
    """Guard against over-correcting: only fullscreen was wrong."""
    embedded = _measure(page, False)
    assert embedded["left"] == pytest.approx(24.0, abs=0.5)
    assert embedded["right"] == pytest.approx(24.0, abs=0.5)
