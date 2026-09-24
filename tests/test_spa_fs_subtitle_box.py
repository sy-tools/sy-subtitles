"""Fullscreen subtitle box — the preview must draw what the burn will render.

The burned video (`tools/burn_subtitles.py`) sizes everything from the video
frame: font and vertical paddings as fractions of its height (the ratios
`measureBurnRatios` in `site/js/burn_video.js` sends), side insets as
`SIDE_INSET_RATIO` of its width, and wraps inside what is left. Fullscreen used
to size from the screen instead — a gradient and text spanning the whole
viewport, a font of `clamp(28px, 4vw, 80px)`, paddings in fixed px — so:

- a pillarboxed video (4:3 on a 16:9 screen) wrapped wider in the preview than
  in the burn, and the burn came out with more lines;
- a phone measured 28px over a 219px-tall video, and its burn came out with a
  font at the 0.12 ceiling and a band covering most of the frame.

So these tests hold fullscreen to the displayed video's own box: they compute
where the video sits (letterboxed in the player), then check the overlay's
position, width, paddings and font against the numbers the burn uses — read
from the burn's own code, not re-typed here, so the three cannot drift.

Only a computed style catches this (a CSS rule can be present and still lose
the cascade), so the tests drive a real browser. Harness copied from
`tests/test_spa_theme_tokens.py` (server, `__SY_REPO` injection, GitHub API
route stubs so the SPA never hits the real network).
"""

import http.server
import json
import threading
from pathlib import Path

import pytest

from tools.burn_subtitles import SIDE_INSET_RATIO

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


def _box(vw, vh, ar):
    """Where a video of aspect `ar` sits when letterboxed in a vw x vh player."""
    w = min(vw, vh * ar)
    h = min(vh, vw / ar)
    return {"left": (vw - w) / 2, "top": (vh - h) / 2, "width": w, "height": h}


def _measure(page, vw, vh, aspect, fs_mode=True, tuned=False, scale=None, inset=""):
    """Lay the preview out at vw x vh for a video of `aspect` ("W / H") and read
    the overlay's box plus the ratios the burn would be dispatched with.
    `inset` (a CSS padding) pads the fullscreen view, pushing the player off
    the viewport's edges — as any visible strip beside it would."""
    page.set_viewport_size({"width": vw, "height": vh})
    return page.evaluate(
        """({fsMode, tuned, aspect, scale, inset}) => {
            const vp = document.getElementById('view-preview');
            const ov = document.getElementById('subtitle-overlay');
            vp.classList.add('active');
            vp.classList.toggle('fs-mode', fsMode);
            vp.style.padding = inset;
            vp.style.setProperty('--preview-aspect', aspect);
            if (tuned) {
                vp.setAttribute('data-subs-tuned', '1');
            } else {
                vp.removeAttribute('data-subs-tuned');
            }
            if (scale === null) {
                document.documentElement.style.removeProperty('--preview-subs-scale');
            } else {
                document.documentElement.style.setProperty('--preview-subs-scale', String(scale));
            }
            ov.textContent = 'Від матерії ви переходите, скажімо, до живих рослин,';
            const cs = getComputedStyle(ov);
            const r = ov.getBoundingClientRect();
            const pc = document.querySelector('.player-container').getBoundingClientRect();
            const [w, h] = aspect.split('/').map(Number);
            return {
                left: parseFloat(cs.paddingLeft),
                right: parseFloat(cs.paddingRight),
                top: parseFloat(cs.paddingTop),
                bottom: parseFloat(cs.paddingBottom),
                font: parseFloat(cs.fontSize),
                rect: {left: r.left, bottom: r.bottom, width: r.width},
                player: {left: pc.left, top: pc.top, width: pc.width, height: pc.height},
                ratios: measureBurnRatios({videoWidth: w, videoHeight: h, subsScale: scale || 1}),
            };
        }""",
        {"fsMode": fs_mode, "tuned": tuned, "aspect": aspect, "scale": scale, "inset": inset},
    )


def _assert_matches_burn(m, box):
    approx = lambda v: pytest.approx(v, abs=0.6)  # noqa: E731
    # The overlay IS the video's bottom band: same width, same bottom edge.
    assert m["rect"]["width"] == approx(box["width"]), "overlay must span the video, not the screen"
    assert m["rect"]["left"] == approx(box["left"])
    assert m["rect"]["bottom"] == approx(box["top"] + box["height"])
    # ...sized exactly as the burn will size it on the real frame.
    assert m["font"] == approx(m["ratios"]["font_ratio"] * box["height"])
    assert m["top"] == approx(m["ratios"]["padtop_ratio"] * box["height"])
    assert m["bottom"] == approx(m["ratios"]["padbot_ratio"] * box["height"])
    assert m["left"] == approx(SIDE_INSET_RATIO * box["width"])
    assert m["right"] == approx(SIDE_INSET_RATIO * box["width"])


@pytest.mark.parametrize(
    ("vw", "vh", "aspect", "ar"),
    [
        (1920, 1080, "16 / 9", 16 / 9),  # the approved baseline: fills the screen
        (1280, 800, "16 / 9", 16 / 9),  # letterboxed top and bottom
        (1280, 800, "4 / 3", 4 / 3),  # pillarboxed: used to wrap wider than the burn
        (390, 844, "16 / 9", 16 / 9),  # phone held upright: used to burn huge
        (844, 390, "16 / 9", 16 / 9),  # phone on its side
    ],
)
def test_fullscreen_overlay_is_the_burned_band(page, vw, vh, aspect, ar):
    _assert_matches_burn(_measure(page, vw, vh, aspect), _box(vw, vh, ar))


def test_the_band_follows_the_player_not_the_viewport(page):
    """The video is letterboxed inside the player container, which in
    fullscreen happens to fill the viewport. Push the container off the
    viewport's edges and the band must move with the video — its size already comes from
    the container, so its position must come from the same box."""
    m = _measure(page, 1280, 800, "16 / 9", inset="60px 0 120px 200px")
    p = m["player"]
    assert (p["left"], p["top"]) == pytest.approx((200, 60), abs=0.6), "the inset must move the player"
    box = _box(p["width"], p["height"], 16 / 9)
    box["left"] += p["left"]
    box["top"] += p["top"]
    _assert_matches_burn(m, box)


def test_a_tiny_font_stops_at_the_burn_floor(page):
    """The other end of the band: a portrait video with the subtitles shrunk to
    0.5x measures 0.0113 of its height, under FONT_RATIO_MIN. The preview must
    stop at the floor the burn clamps to, as it stops at the ceiling."""
    m = _measure(page, 1280, 800, "9 / 16", tuned=True, scale=0.5)
    _assert_matches_burn(m, _box(1280, 800, 9 / 16))
    assert m["ratios"]["font_ratio"] == pytest.approx(0.02)


def test_the_1080p_baseline_keeps_its_approved_pixels(page):
    """The box change must not move today's look on a 1080p screen: 76.8px
    text, 80px of gradient over it and 36px under it. Only the side insets
    shrink, 10% -> 7%."""
    m = _measure(page, 1920, 1080, "16 / 9")
    assert m["font"] == pytest.approx(76.8, abs=0.1)
    assert m["top"] == pytest.approx(80.0, abs=0.1)
    assert m["bottom"] == pytest.approx(36.0, abs=0.1)
    assert m["left"] == pytest.approx(0.07 * 1920, abs=0.1)


def test_tuned_subtitles_scale_with_the_handle_and_keep_the_side_inset(page):
    """Once the handle has been dragged, the embedded `[data-subs-tuned]` rule
    (`padding: 16px 24px`) ties the fullscreen rule's specificity; whichever
    sits later wins, so the side inset must survive it — the fullscreen
    `[data-subs-tuned]` rule re-asserts it, whatever the source order. The
    scale must reach the font exactly as it reaches the burn."""
    m = _measure(page, 1280, 800, "16 / 9", tuned=True, scale=1.5)
    _assert_matches_burn(m, _box(1280, 800, 16 / 9))
    assert m["font"] == pytest.approx(0.04 * 1280 * 1.5, abs=0.6)


def test_an_oversized_scale_stops_where_the_burn_stops(page):
    """The handle reaches 4x; the burn clamps the font at FONT_RATIO_MAX of the
    frame height. The preview must stop at the same size, not keep growing."""
    m = _measure(page, 1280, 800, "16 / 9", tuned=True, scale=4)
    _assert_matches_burn(m, _box(1280, 800, 16 / 9))
    assert m["ratios"]["font_ratio"] == pytest.approx(0.12)


def test_embedded_tuned_subtitles_keep_their_own_padding(page):
    """Guard against over-correcting: only fullscreen changed."""
    embedded = _measure(page, 1280, 800, "16 / 9", fs_mode=False, tuned=True)
    assert embedded["left"] == pytest.approx(24.0, abs=0.5)
    assert embedded["right"] == pytest.approx(24.0, abs=0.5)
