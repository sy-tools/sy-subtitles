"""The burned frame against the fullscreen preview, line by line, in pixels.

`test_spa_fs_subtitle_box.py` holds the preview to the numbers the burn uses;
this closes the loop on what the burn really draws. The ASS document comes from
the burner's own `build_ass_document`, libass renders the frame (as ffmpeg's
`ass` filter does in the workflow), and Chromium renders the fullscreen band in
a viewport the size of that frame. The white text fill of each is cut into line
boxes, and the boxes must agree: same lines, same edges, within a pixel or two
of antialiasing.

libass is loaded from the machine (`tests/libass_frame.py`). Where it is
missing the tests skip — unless REQUIRE_LIBASS is set, as CI sets it, so a
runner that lost the library fails instead of passing on nothing.
"""

import io
import os

import pytest
from PIL import Image

from tests import libass_frame
from tests.test_spa_fs_subtitle_box import page, served_site  # noqa: F401 — fixtures
from tools.burn_subtitles import (
    DEFAULT_FONT_FILE,
    build_ass_document,
    css_font_px,
    text_measurer,
)

pytestmark = [
    pytest.mark.e2e,
    pytest.mark.skipif(
        not libass_frame.available() and not os.environ.get("REQUIRE_LIBASS"),
        reason="libass is not installed (set REQUIRE_LIBASS to make this a failure)",
    ),
]

CUES = [
    "Але коли ви на півдорозі, коли ваша необізнаність стосується вас самих,",
    "літак, що летів до Вашингтона, а не до Нью-Йорка,",
    "Це перше попередження, яке Я хочу вам дати, бо тепер ми вирушаємо вглиб Махараштри.",
    "Тоді починається інтроспекція.",
]


# Edges agree to about 3% of the em: the rasterisers antialias differently, and
# a browser centres a line with its last glyph's kern into the space it broke
# on, libass without it. A line in the wrong place is off by a word or a line
# height — far past this.
def _tolerance_px(font_px):
    return max(2, 0.03 * font_px)


# The fill is white over a dark band; this sits above the band's lightest shade
# and the text shadow, so only glyph ink counts.
INK_THRESHOLD = 160


def _burned_lines(width, height, ratios, index):
    doc = build_ass_document(
        [{"idx": i + 1, "start_ms": i * 1000, "end_ms": i * 1000 + 900, "text": t} for i, t in enumerate(CUES)],
        width,
        height,
        ratios["font_ratio"],
        ratios["padtop_ratio"],
        ratios["padbot_ratio"],
        text_measurer(DEFAULT_FONT_FILE, css_font_px(ratios["font_ratio"], height)),
    )
    mask = libass_frame.text_mask(doc, width, height, index * 1000 + 450, os.path.dirname(DEFAULT_FONT_FILE))
    return libass_frame.line_boxes(mask)


def _shown_lines(page, width, height, text, scale):  # noqa: F811 — the fixture
    page.set_viewport_size({"width": width, "height": height})
    box = page.evaluate(
        """async ({text, aspect, scale}) => {
            const vp = document.getElementById('view-preview');
            const ov = document.getElementById('subtitle-overlay');
            vp.classList.add('active', 'fs-mode');
            vp.style.setProperty('--preview-aspect', aspect);
            // No video here: a black frame where the player would be, so the
            // page's paper does not show through the band's transparent top.
            for (const el of vp.querySelectorAll('.player-container, .video-wrap')) {
                el.style.setProperty('background', '#000', 'important');
            }
            if (scale === null) {
                vp.removeAttribute('data-subs-tuned');
                document.documentElement.style.removeProperty('--preview-subs-scale');
            } else {
                vp.setAttribute('data-subs-tuned', '1');
                document.documentElement.style.setProperty('--preview-subs-scale', String(scale));
            }
            ov.style.removeProperty('height');
            fillFullscreenSubtitle(ov, text);
            await document.fonts.load(getComputedStyle(ov).fontSize + ' "SY Subtitle Serif"');
            await document.fonts.ready;
            // Two frames: the swap to the loaded face must be painted before
            // the screenshot, not merely laid out.
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const r = ov.getBoundingClientRect();
            return {x: Math.floor(r.left), y: Math.floor(r.top),
                    w: Math.ceil(r.width), h: Math.ceil(r.height)};
        }""",
        {"text": text, "aspect": f"{width} / {height}", "scale": scale},
    )
    shot = Image.open(
        io.BytesIO(page.screenshot(clip={"x": box["x"], "y": box["y"], "width": box["w"], "height": box["h"]}))
    )
    frame = Image.new("L", (width, height))
    frame.paste(shot.convert("L"), (box["x"], box["y"]))
    return libass_frame.line_boxes(frame, threshold=INK_THRESHOLD)


def test_libass_is_installed_where_it_is_required():
    assert libass_frame.available(), "REQUIRE_LIBASS is set but libass could not be loaded"


@pytest.mark.parametrize(("width", "height"), [(640, 480), (854, 480), (1920, 1080)])
@pytest.mark.parametrize("scale", [None, 0.6, 1.5])
def test_the_burned_frame_draws_the_lines_the_preview_shows(page, width, height, scale):  # noqa: F811
    ratios = page.evaluate(
        "(g) => measureBurnRatios(g)",
        {"videoWidth": width, "videoHeight": height, "subsScale": scale or 1},
    )
    tolerance = _tolerance_px(css_font_px(ratios["font_ratio"], height))
    for index, text in enumerate(CUES):
        burned = _burned_lines(width, height, ratios, index)
        shown = _shown_lines(page, width, height, text, scale)
        assert len(burned) == len(shown), (text, burned, shown)
        for b, s in zip(burned, shown, strict=True):
            assert all(abs(p - q) <= tolerance for p, q in zip(b, s, strict=True)), (text, burned, shown)
