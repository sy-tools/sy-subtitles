"""Fullscreen subtitle side inset — CSS specificity guard.

`components.css:373` deliberately gives fullscreen subtitles a 10% side
inset. `components.css:668` — written for the embedded (non-fullscreen)
resized block, and carrying no `.fs-mode` in its selector — ties that
rule's specificity and, sitting later in the file, silently overrides it
to a 24px inset once the user has ever dragged the subtitle resize handle
(`data-subs-tuned="1"`).

A string-grep test cannot detect this: the "correct" 10% rule is already
present in the file and greps green today. Only a computed style catches
the override, so this test drives a real browser. Harness copied verbatim
from `tests/test_spa_theme_tokens.py` (server, `__SY_REPO` injection).

The burned-in subtitle renderer wraps text at the same 10% side inset
(`SIDE_INSET_RATIO = 0.10`), so this rule and the renderer must agree or
the burned video breaks subtitle lines differently than the app preview.
"""

import http.server
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


def _measure(page, fs_mode):
    """Put the preview into the given mode and read the overlay's side inset."""
    return page.evaluate(
        """(fsMode) => {
            const vp = document.getElementById('view-preview');
            const ov = document.getElementById('subtitle-overlay');
            vp.classList.add('active');
            vp.classList.toggle('fs-mode', fsMode);
            vp.setAttribute('data-subs-tuned', '1');
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
        fs_mode,
    )


def test_fullscreen_tuned_subtitles_keep_the_ten_percent_side_inset(served_site):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(served_site)

        fs = _measure(page, True)
        # 10% of the overlay's own width, which spans the viewport in fullscreen.
        assert fs["left"] == pytest.approx(fs["width"] * 0.10, abs=1.0), (
            "fullscreen subtitles lost their 10% side inset -- the embedded "
            "[data-subs-tuned] rule is overriding .fs-mode again"
        )
        assert fs["right"] == pytest.approx(fs["width"] * 0.10, abs=1.0)
        # The vertical paddings are what the burn ratios are calibrated to.
        assert fs["top"] == pytest.approx(80.0, abs=0.5)
        assert fs["bottom"] == pytest.approx(36.0, abs=0.5)

        browser.close()


def test_embedded_tuned_subtitles_keep_their_own_padding(served_site):
    """Guard against over-correcting: only fullscreen was wrong."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        page.goto(served_site)

        embedded = _measure(page, False)
        assert embedded["left"] == pytest.approx(24.0, abs=0.5)
        assert embedded["right"] == pytest.approx(24.0, abs=0.5)

        browser.close()
