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

from tools.burn_subtitles import (
    DEFAULT_FONT_FILE,
    LINE_ADVANCE,
    SIDE_INSET_RATIO,
    WRAP_SAFETY,
    css_font_px,
    text_measurer,
    wrap_text,
    wrap_width_for,
)
from tools.serve_auth_local import SpaHTTPServer

pytestmark = pytest.mark.e2e

SITE = Path(__file__).parent.parent / "site"
SUBTITLE_FAMILY = "SY Subtitle Serif"

# Every cue of the talk the mismatch was first seen on (2000 Guru Puja) —
# 503 real lines, hyphenated names and all. Frozen: a review of that talk's SRT
# must not quietly change what this test measures.
CUES = sorted(
    (Path(__file__).parent / "fixtures/guru_puja_2000_cues.txt").read_text(encoding="utf-8").splitlines(),
    key=len,
    reverse=True,
)


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

    httpd = SpaHTTPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{port}/index.html"
    httpd.shutdown()
    httpd.server_close()


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
    # The text box is the burn's wrap limit: the side insets, then its safety
    # headroom — so a line breaks here exactly where the burn breaks it.
    inset = (box["width"] - WRAP_SAFETY * box["width"] * (1 - 2 * SIDE_INSET_RATIO)) / 2
    assert m["left"] == approx(inset)
    assert m["right"] == approx(inset)


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
@pytest.mark.parametrize("scale", [None, 0.6, 1.5, 3])
def test_fullscreen_overlay_is_the_burned_band(page, vw, vh, aspect, ar, scale):
    m = _measure(page, vw, vh, aspect, tuned=scale is not None, scale=scale)
    _assert_matches_burn(m, _box(vw, vh, ar))


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
    shrink, 10% -> 7% (plus the burn's 2% wrap headroom)."""
    m = _measure(page, 1920, 1080, "16 / 9")
    assert m["font"] == pytest.approx(76.8, abs=0.1)
    assert m["top"] == pytest.approx(80.0, abs=0.1)
    assert m["bottom"] == pytest.approx(36.0, abs=0.1)
    assert m["left"] == pytest.approx((1920 - 0.98 * 0.86 * 1920) / 2, abs=0.1)


def test_tuned_subtitles_scale_with_the_handle_and_keep_the_side_inset(page):
    """Once the handle has been dragged, the embedded `[data-subs-tuned]` rule
    (`padding: 16px 24px`) must not reach fullscreen — it once turned the side
    inset into 24px — and the scale must reach the font as it reaches the burn."""
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


def _browser_lines(page, vw, vh, aspect, texts, scale=None):
    """Lay each text out in the fullscreen band and read back its lines."""
    page.set_viewport_size({"width": vw, "height": vh})
    return page.evaluate(
        """async ({aspect, texts, family, scale}) => {
            const vp = document.getElementById('view-preview');
            const ov = document.getElementById('subtitle-overlay');
            vp.classList.add('active', 'fs-mode');
            vp.style.setProperty('--preview-aspect', aspect);
            if (scale === null) {
                vp.removeAttribute('data-subs-tuned');
                document.documentElement.style.removeProperty('--preview-subs-scale');
            } else {
                vp.setAttribute('data-subs-tuned', '1');
                document.documentElement.style.setProperty('--preview-subs-scale', String(scale));
            }
            ov.textContent = 'x';
            await document.fonts.load(getComputedStyle(ov).fontSize + ' "' + family + '"');
            const out = [];
            for (const text of texts) {
                ov.style.removeProperty('height');
                // The app's own fill (the render loop calls the same function).
                fillFullscreenSubtitle(ov, text);
                const lines = [];
                let top = null;
                for (const w of ov.querySelectorAll('.fs-word')) {
                    const t = Math.round(w.getBoundingClientRect().top);
                    if (top === null || Math.abs(t - top) > 2) { lines.push(w.textContent); top = t; }
                    else lines[lines.length - 1] += ' ' + w.textContent;
                }
                out.push(lines);
            }
            return out;
        }""",
        {"aspect": aspect, "texts": texts, "family": SUBTITLE_FAMILY, "scale": scale},
    )


# Chromium places glyphs on a 1/64 px grid, so a line's width drifts from the
# design width by up to ~1/128 px a glyph — half a pixel over a long line. A
# cue whose deciding line lands that close to the wrap limit can break either
# way, and which way differs by platform (it did between macOS and Linux).
TIE_PX = 0.5


def _tie_slack(burned, shown, measure, limit):
    """How far from the wrap limit is the line one side took and the other refused.

    That is the side that broke first's line plus the next word, measured as
    `wrap_text` measures a candidate.
    """
    i = next(i for i, (b, s) in enumerate(zip(burned, shown, strict=False)) if b != s)
    rest = " ".join(burned[i:]).split()
    taken = min(len(burned[i].split()), len(shown[i].split())) + 1
    refused = " ".join(rest[:taken])
    width = measure(refused + " ") - measure(" ") if taken < len(rest) else measure(refused)
    return limit - width


def _per_char(text):
    return float(len(text))


@pytest.mark.parametrize(
    ("burned", "shown", "slack"),
    [
        (["aaa bb ccc", "d"], ["aaa", "bb ccc d"], 4.0),  # the browser broke two words early
        (["aaa", "bb ccc d"], ["aaa bb ccc", "d"], 4.0),  # the burner did
        (["aaa bb", "ccc d"], ["aaa bb ccc", "d"], 0.0),  # "aaa bb ccc" sits on the limit
        (["aaa bb cc", "d"], ["aaa bb", "cc d"], 1.0),
    ],
)
def test_the_tie_is_judged_on_the_line_one_side_refused(burned, shown, slack):
    assert _tie_slack(burned, shown, _per_char, 10) == slack


@pytest.mark.parametrize(
    ("vw", "vh", "aspect", "ar"),
    [
        (1440, 1080, "4 / 3", 4 / 3),  # the talk the mismatch was reported on
        (1920, 1080, "16 / 9", 16 / 9),
    ],
)
@pytest.mark.parametrize("scale", [None, 0.6, 1.5])
def test_fullscreen_breaks_lines_where_the_burn_does(page, vw, vh, aspect, ar, scale):
    """The whole point: the burned video must show the lines the preview showed.
    Same file, same size, same wrap limit — so the browser's line breaks must be
    the burner's own `wrap_text`, measured by Pillow on the TTF libass renders."""
    box = _box(vw, vh, ar)
    width, height = box["width"], box["height"]
    ratio = page.evaluate(
        "(g) => measureBurnRatios(g).font_ratio",
        {"videoWidth": width, "videoHeight": height, "subsScale": scale or 1},
    )
    measure = text_measurer(DEFAULT_FONT_FILE, css_font_px(ratio, height))
    burned = [wrap_text(t, measure, wrap_width_for(width)) for t in CUES]
    shown = _browser_lines(page, vw, vh, aspect, CUES, scale)
    limit = wrap_width_for(width) * WRAP_SAFETY
    judged = [(b, s, _tie_slack(b, s, measure, limit)) for b, s in zip(burned, shown, strict=True) if b != s]
    mismatched = [(b, s, round(slack, 3)) for b, s, slack in judged if abs(slack) >= TIE_PX]
    assert not mismatched, f"{len(mismatched)} of {len(CUES)} cues break differently: {mismatched[:3]}"


def test_fullscreen_draws_the_burn_font_with_its_line_advance(page):
    """PT Serif, from the very file libass renders with, advancing one ASS
    FontSize per line — LINE_ADVANCE em — as libass does (band_geometry).
    Georgia, the old fallback, is ~6% narrower and re-wrapped cues."""
    for tuned, scale in ((False, None), (True, 1.3)):
        page.set_viewport_size({"width": 1280, "height": 720})
        got = page.evaluate(
            """async ({tuned, scale, family}) => {
                const vp = document.getElementById('view-preview');
                const ov = document.getElementById('subtitle-overlay');
                vp.classList.add('active', 'fs-mode');
                if (tuned) vp.setAttribute('data-subs-tuned', '1'); else vp.removeAttribute('data-subs-tuned');
                if (scale) document.documentElement.style.setProperty('--preview-subs-scale', String(scale));
                ov.textContent = 'Але коли ви на півдорозі';
                const cs = getComputedStyle(ov);
                await document.fonts.load(cs.fontSize + ' "' + family + '"');
                return {
                    family: cs.fontFamily,
                    loaded: document.fonts.check(cs.fontSize + ' "' + family + '"'),
                    ratio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize),
                };
            }""",
            {"tuned": tuned, "scale": scale, "family": SUBTITLE_FAMILY},
        )
        assert got["family"].strip("'\" ").startswith(SUBTITLE_FAMILY), got
        assert got["loaded"], "the subtitle face did not load"
        assert got["ratio"] == pytest.approx(LINE_ADVANCE, abs=0.002), (tuned, got)


# --- The fullscreen scale handle: the band's top edge, dragged ---------------


def _handle_state(page):
    return page.evaluate(
        """() => {
            const ov = document.getElementById('subtitle-overlay');
            const h = document.getElementById('fs-subs-resize');
            const o = ov.getBoundingClientRect();
            const r = h.getBoundingClientRect();
            return {
                display: getComputedStyle(h).display,
                handle: {left: r.left, width: r.width, mid: r.top + r.height / 2},
                band: {left: o.left, width: o.width, top: o.top,
                       textTop: o.top + parseFloat(getComputedStyle(ov).paddingTop)},
                font: parseFloat(getComputedStyle(ov).fontSize),
                scale: document.documentElement.style.getPropertyValue('--preview-subs-scale'),
                stored: localStorage.getItem('sy.preview_subs_h.__default'),
            };
        }"""
    )


def _settle(page):
    """The handle follows the band through a ResizeObserver: one frame behind."""
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")


def _drag_handle(page, dy):
    s = _handle_state(page)
    x = s["handle"]["left"] + s["handle"]["width"] / 2
    y = s["handle"]["mid"]
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x, y + dy / 2)
    page.mouse.move(x, y + dy)
    page.mouse.up()
    _settle(page)


def _assert_grip_sits_over_the_text(s):
    """In the half of the top padding nearer the text, down to the text's own
    top: on the edge itself — where the gradient is still clear — the grip
    read as a mark adrift on the picture, not as the subtitles' own."""
    edge, text = s["band"]["top"], s["band"]["textTop"]
    assert edge + 0.5 * (text - edge) - 1 <= s["handle"]["mid"] <= text + 1


def test_the_scale_handle_sits_between_the_bands_edge_and_its_text(page):
    _measure(page, 1280, 800, "4 / 3")
    s = _handle_state(page)
    assert s["display"] != "none"
    _assert_grip_sits_over_the_text(s)
    assert s["handle"]["left"] == pytest.approx(s["band"]["left"], abs=0.6)
    assert s["handle"]["width"] == pytest.approx(s["band"]["width"], abs=0.6)


def test_the_scale_handle_is_fullscreen_only(page):
    _measure(page, 1280, 800, "16 / 9", fs_mode=False)
    assert _handle_state(page)["display"] == "none"


@pytest.mark.parametrize("dy", [-40, 25])
def test_dragging_the_edge_moves_it_with_the_pointer(page, dy):
    """Held to a cue that stays on one line. A cue that rewraps under the drag
    gains or loses a whole line at once, and no font size puts the edge inside
    that jump — the handle then follows the font, not the pointer."""
    _measure(page, 1280, 800, "16 / 9")
    page.evaluate("() => { document.getElementById('subtitle-overlay').textContent = 'Так.'; }")
    _settle(page)
    before = _handle_state(page)
    _drag_handle(page, dy)
    after = _handle_state(page)
    assert after["band"]["top"] - before["band"]["top"] == pytest.approx(dy, abs=1.5)
    assert (after["font"] > before["font"]) == (dy < 0)
    _assert_grip_sits_over_the_text(after)


def test_a_drag_is_stored_as_the_embedded_handles_own_value(page):
    """One scale, two handles: what fullscreen stores must be what the embedded
    handle reads back (a height in px, 120 px = 1x), or the next visit and the
    burn would each see a different size."""
    _measure(page, 1280, 800, "16 / 9")
    _drag_handle(page, -40)
    s = _handle_state(page)
    assert float(s["scale"]) > 1
    assert float(s["stored"]) == pytest.approx(float(s["scale"]) * 120, abs=0.01)


def test_a_click_without_a_drag_stores_nothing(page):
    """A stray press on the edge must not turn an untouched talk into a
    "tuned" one: the embedded overlay changes its look once a value is stored."""
    _measure(page, 1280, 800, "16 / 9")
    _drag_handle(page, 0)
    s = _handle_state(page)
    assert s["stored"] is None
    assert s["scale"] == ""


def test_the_drag_stops_at_the_burn_ceiling_and_comes_straight_back(page):
    m = _measure(page, 1280, 800, "16 / 9")
    box = _box(1280, 800, 16 / 9)
    _drag_handle(page, -600)
    top = _handle_state(page)
    assert top["font"] == pytest.approx(0.12 * box["height"], abs=0.6)
    _drag_handle(page, 20)
    assert _handle_state(page)["font"] < top["font"] - 1, "no dead travel past the ceiling"
    assert m["font"] < top["font"]


def test_a_double_click_on_the_edge_resets_the_scale(page):
    m = _measure(page, 1280, 800, "16 / 9")
    _drag_handle(page, -40)
    s = _handle_state(page)
    page.mouse.dblclick(s["handle"]["left"] + s["handle"]["width"] / 2, s["handle"]["mid"])
    after = _handle_state(page)
    assert after["scale"] == ""
    assert after["stored"] is None
    assert after["font"] == pytest.approx(m["font"], abs=0.1)


def test_the_grip_sits_in_the_right_margin_beside_the_text_column(page):
    """Not in the middle: that is where the speaker's face most often is.
    Out in the side margin, it is clear of the text's last word too."""
    m = _measure(page, 1280, 800, "4 / 3")
    grip = page.evaluate(
        """() => {
            const cs = getComputedStyle(document.getElementById('fs-subs-resize'), '::before');
            return {right: parseFloat(cs.right), left: parseFloat(cs.left), width: parseFloat(cs.width)};
        }"""
    )
    assert grip["right"] == pytest.approx(m["right"] / 4, abs=1)
    assert grip["left"] > _box(1280, 800, 4 / 3)["width"] / 2
