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

from tools.serve_auth_local import SpaHTTPServer

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

    httpd = SpaHTTPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{port}"
    httpd.shutdown()
    httpd.server_close()


@pytest.fixture
def smoke_page(browser):
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

    # 3. The burn's geometry reached the stylesheet: the fullscreen band reads
    #    it from --fs-* with no fallback, and a page that never wrote them would
    #    draw a band the burn does not reproduce.
    ratio = page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--fs-font-w-ratio')")
    assert ratio.strip(), "the --fs-* burn geometry was never written onto :root\n  " + "\n  ".join(page_errors)

    # 4. Nothing threw uncaught while booting.
    assert not page_errors, "uncaught JS error(s) during boot:\n  " + "\n  ".join(page_errors)


def test_the_boot_loader_gives_way_to_the_index(smoke_server, smoke_page):
    """The centred loading mark must hand over, not linger.

    The mark is deliberately allowed to be skipped entirely (js/boot_loader.js
    holds a show back for LOADER_SHOW_DELAY_MS, and these mocks answer faster
    than that), so this does NOT assert it appears. What it pins is the exit:
    once the index has settled, the loader is gone and the list it was waiting
    for is on screen. A hand-over that never completes leaves a breathing mark
    over a blank page — a failure no string grep would see.
    """
    page = smoke_page
    page.goto(f"{smoke_server}/index.html")
    page.wait_for_function("document.title.includes('Index')", timeout=10000)

    page.wait_for_function("document.getElementById('index-status').hidden", timeout=10000)
    # The index rendered in the mark's place: the toolbar is only revealed by
    # renderIndex, and offsetParent is null while an ancestor stays display:none.
    assert page.evaluate("!!document.getElementById('index-toolbar').offsetParent"), (
        "the loader let go but the index never rendered"
    )


def test_the_styleguide_builds_its_live_catalog_without_errors(smoke_server, smoke_page):
    page = smoke_page
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    page.goto(f"{smoke_server}/styleguide.html")
    page.wait_for_load_state("load")

    assert not page_errors, "uncaught JS error(s) in the styleguide:\n  " + "\n  ".join(page_errors)
    assert page.locator(".burn-seg").count() > 0, "the burn-progress examples were never built"


HELP_VIDEO_COUNT = 13


@pytest.fixture
def index_page(smoke_server, smoke_page):
    smoke_page.route(
        "**/sy-tools.github.io/sy-help/**",
        lambda r: r.fulfill(status=404, body="not found"),
    )
    smoke_page.goto(f"{smoke_server}/index.html")
    smoke_page.wait_for_function("document.title.includes('Index')", timeout=10000)
    return smoke_page


def _open_help(page):
    page.click("#prefs-btn")
    page.click("#prefs-help")
    page.wait_for_selector("#help-sheet .help-video")


def test_the_settings_menu_ends_with_the_video_tutorials_entry(index_page):
    page = index_page
    page.click("#prefs-btn")
    last = page.locator("#prefs-menu > :last-child")
    assert last.get_attribute("id") == "prefs-help"
    assert last.evaluate("el => el.tagName") == "BUTTON"
    assert last.is_visible()
    assert last.locator("svg").count() == 1


def test_the_help_sheet_opens_over_the_index_with_every_video(index_page):
    page = index_page
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    assert page.locator("#help-sheet video").count() == 0, "players were built before anyone asked for them"

    _open_help(page)

    assert page.locator("#help-sheet").is_visible()
    assert page.locator("#prefs-menu").is_hidden(), "the settings menu stayed open under the sheet"
    assert page.locator("#help-sheet .help-section").count() == 2
    assert page.locator("#help-sheet .help-video").count() == HELP_VIDEO_COUNT
    srcs = page.eval_on_selector_all("#help-sheet video", "vs => vs.map(v => v.getAttribute('src'))")
    assert all(s.startswith("https://sy-tools.github.io/sy-help/v/") and s.endswith(".mp4") for s in srcs), srcs
    assert len(set(srcs)) == HELP_VIDEO_COUNT
    assert page.locator("#help-sheet .help-section[data-section='updates'] .help-video__notes li").count() > 0
    assert page.evaluate("getComputedStyle(document.documentElement).overflow") == "hidden", (
        "the page behind still scrolls"
    )
    assert not page_errors, "uncaught JS error(s) opening the help sheet:\n  " + "\n  ".join(page_errors)


def test_the_help_sheet_closes_and_hands_focus_back(index_page):
    page = index_page
    for close in (
        lambda: page.keyboard.press("Escape"),
        lambda: page.click("#help-sheet-close"),
        lambda: page.mouse.click(5, 300),
    ):
        _open_help(page)
        page.evaluate(
            "document.querySelectorAll('#help-sheet video').forEach(v => v.pause = () => { v.dataset.paused = '1'; })"
        )
        close()
        page.wait_for_selector("#help-sheet", state="hidden")
        assert page.evaluate("document.activeElement.id") == "prefs-btn"
        assert page.evaluate(
            "[...document.querySelectorAll('#help-sheet video')].every(v => v.dataset.paused === '1')"
        ), "a video kept playing behind the closed sheet"
        assert page.evaluate("getComputedStyle(document.documentElement).overflow") != "hidden"
    assert page.locator("#help-sheet .help-video").count() == HELP_VIDEO_COUNT, "reopening built the list twice"


def _serve_subtitles(page, manifest):
    page.route(
        "**/help/subs/index.json",
        lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(manifest)),
    )
    page.route(
        "**/help/subs/*.vtt",
        lambda r: r.fulfill(
            status=200, content_type="text/vtt", body="WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nx\n"
        ),
    )


def _first_ref(page):
    return page.evaluate("HelpVideos.HELP_SECTIONS[0].videos[0].ref")


def _track_modes(page):
    return page.evaluate("[...document.querySelector('#help-sheet video').textTracks].map(t => [t.language, t.mode])")


@pytest.mark.parametrize("lang, english_mode", [("en", "showing"), ("uk", "disabled")])
def test_help_videos_carry_subtitles_shown_only_for_an_english_interface(smoke_server, smoke_page, lang, english_mode):
    page = smoke_page
    page.route("**/sy-tools.github.io/sy-help/**", lambda r: r.fulfill(status=404, body="not found"))
    page.add_init_script(f"localStorage.setItem('sy_lang', '{lang}')")
    page.goto(f"{smoke_server}/index.html")
    page.wait_for_function("document.title.length > 0", timeout=10000)
    _serve_subtitles(page, {_first_ref(page): ["en", "uk"]})

    _open_help(page)

    labels = page.eval_on_selector_all("#help-sheet video >> nth=0 >> track", "ts => ts.map(t => t.label)")
    assert labels == ["Українська", "English"]
    page.wait_for_function("document.querySelector('#help-sheet video').textTracks.length === 2")
    assert dict(_track_modes(page)) == {"uk": "disabled", "en": english_mode}
    assert page.locator("#help-sheet video >> nth=1 >> track").count() == 0, "a video without subtitles got tracks"


def test_switching_the_interface_language_follows_into_an_open_sheet(smoke_server, smoke_page):
    page = smoke_page
    page.route("**/sy-tools.github.io/sy-help/**", lambda r: r.fulfill(status=404, body="not found"))
    page.add_init_script("localStorage.setItem('sy_lang', 'uk')")
    page.goto(f"{smoke_server}/index.html")
    page.wait_for_function("document.title.length > 0", timeout=10000)
    _serve_subtitles(page, {_first_ref(page): ["en", "uk"]})
    _open_help(page)
    page.keyboard.press("Escape")

    page.evaluate("SPA.toggleLang()")
    _open_help(page)
    page.wait_for_function("document.querySelector('#help-sheet video').textTracks.length === 2")
    assert dict(_track_modes(page)) == {"uk": "disabled", "en": "showing"}
