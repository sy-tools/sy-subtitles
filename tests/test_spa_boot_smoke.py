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


# The help catalog the smoke serves in place of sy-help's Pages site: two
# sections, the updates listed newest first to prove the sheet sorts them.
HELP_CATALOG = {
    "version": 1,
    "sections": [
        {
            "id": "guide",
            "title": {"uk": "Як працювати з порталом", "en": "How to work with the portal"},
            "order": "manual",
            "videos": [
                {
                    "file": "intro",
                    "title": {"uk": "Вступ", "en": "Introduction"},
                    "duration": 61.0,
                    "subtitles": ["uk", "en"],
                },
                {"file": "security", "title": {"uk": "Безпека", "en": ""}, "duration": 75.0},
            ],
        },
        {
            "id": "updates",
            "title": {"uk": "Оновлення", "en": "Updates"},
            "order": "chronological",
            "videos": [
                {
                    "file": "update-2026-11-22",
                    "date": "2026-11-22",
                    "duration": 30.0,
                    "notes": {"uk": ["Збереження файлу субтитрів."], "en": ["Saving the subtitle file."]},
                },
                {
                    "file": "update-2026-09-05",
                    "date": "2026-09-05",
                    "duration": 20.0,
                    "notes": {"uk": ["Меню налаштувань"], "en": []},
                },
            ],
        },
    ],
}
HELP_VIDEO_COUNT = 4
HELP_PAGES = "https://sy-tools.github.io/sy-help/"
GATE_TEST_PHRASE = "test-passphrase"
GATE_TEST_HASH = "289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f"


def _serve_help(page, requests=None):
    def handle(route):
        url = route.request.url
        if requests is not None:
            requests.append(url)
        if url.endswith("/catalog.json"):
            route.fulfill(status=200, content_type="application/json", body=json.dumps(HELP_CATALOG))
        elif url.endswith(".vtt"):
            route.fulfill(
                status=200,
                content_type="text/vtt",
                headers={"Access-Control-Allow-Origin": "*"},
                body="WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nx\n",
            )
        else:
            route.fulfill(status=404, body="not found")

    page.route("**/sy-tools.github.io/sy-help/**", handle)


@pytest.fixture
def index_page(smoke_server, smoke_page):
    _serve_help(smoke_page)
    # The titles below are Ukrainian; the browser's own language would pick English.
    smoke_page.add_init_script("localStorage.setItem('sy_lang', 'uk')")
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


def test_the_help_sheet_opens_over_the_index_with_the_catalog(index_page):
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
    assert srcs == [
        HELP_PAGES + "v/" + f + ".mp4" for f in ("intro", "security", "update-2026-09-05", "update-2026-11-22")
    ], srcs
    titles = page.eval_on_selector_all("#help-sheet .help-video__title", "hs => hs.map(h => h.textContent)")
    assert titles[0] == "1.1 Вступ"
    assert titles[2:] == ["2.1 Оновлення на 05.09.2026", "2.2 Оновлення на 22.11.2026"], "updates are not oldest first"
    assert page.locator("#help-sheet .help-section[data-section='updates'] .help-video__notes li").count() == 2
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


def test_a_catalog_that_does_not_load_says_so_and_is_tried_again(smoke_server, smoke_page):
    page = smoke_page
    page.route("**/sy-tools.github.io/sy-help/**", lambda r: r.fulfill(status=503, body="down"))
    page.goto(f"{smoke_server}/index.html")
    page.wait_for_function("document.title.includes('Index')", timeout=10000)
    page.click("#prefs-btn")
    page.click("#prefs-help")
    page.wait_for_selector("#help-sheet .help-sheet__error")
    page.keyboard.press("Escape")

    page.unroute("**/sy-tools.github.io/sy-help/**")
    _serve_help(page)
    _open_help(page)
    assert page.locator("#help-sheet .help-sheet__error").count() == 0


def _track_modes(page):
    return page.evaluate("[...document.querySelector('#help-sheet video').textTracks].map(t => [t.language, t.mode])")


@pytest.mark.parametrize("lang, english_mode", [("en", "showing"), ("uk", "disabled")])
def test_help_videos_carry_subtitles_shown_only_for_an_english_interface(smoke_server, smoke_page, lang, english_mode):
    page = smoke_page
    _serve_help(page)
    page.add_init_script(f"localStorage.setItem('sy_lang', '{lang}')")
    page.goto(f"{smoke_server}/index.html")
    page.wait_for_function("document.title.length > 0", timeout=10000)

    _open_help(page)

    labels = page.eval_on_selector_all("#help-sheet video >> nth=0 >> track", "ts => ts.map(t => t.label)")
    assert labels == ["Українська", "English"]
    assert page.eval_on_selector("#help-sheet video", "v => v.getAttribute('crossorigin')") == "anonymous"
    page.wait_for_function("document.querySelector('#help-sheet video').textTracks.length === 2")
    assert dict(_track_modes(page)) == {"uk": "disabled", "en": english_mode}
    assert page.locator("#help-sheet video >> nth=1 >> track").count() == 0, "a video without subtitles got tracks"


def test_switching_the_interface_language_rebuilds_the_sheet_in_it(index_page):
    page = index_page
    _open_help(page)
    page.keyboard.press("Escape")

    page.evaluate("SPA.toggleLang()")
    _open_help(page)
    assert page.evaluate("currentLang") == "en"
    titles = page.eval_on_selector_all("#help-sheet .help-video__title", "hs => hs.map(h => h.textContent)")
    assert titles[0] == "1.1 Introduction"
    assert titles[1] == "1.2 Безпека", "an empty English title falls back to Ukrainian"
    page.wait_for_function("document.querySelector('#help-sheet video').textTracks.length === 2")
    assert dict(_track_modes(page))["en"] == "showing"


def test_the_tutorials_wait_behind_the_passphrase_gate(smoke_server, smoke_page):
    page = smoke_page
    requests = []
    _serve_help(page, requests)
    page.add_init_script(f"window.__SY_GATE_HASH = '{GATE_TEST_HASH}';")
    page.goto(f"{smoke_server}/index.html")
    page.wait_for_function("document.title.includes('Index')", timeout=10000)

    page.click("#prefs-btn")
    page.click("#prefs-help")
    page.wait_for_selector("#sy-gate-input", timeout=4000)
    assert page.locator("#help-sheet").is_hidden()
    assert not requests, "the catalog was fetched before the passphrase"

    page.keyboard.press("Escape")
    page.wait_for_selector("#sy-gate-input", state="detached")
    assert page.locator("#help-sheet").is_hidden(), "cancelling the gate still opened the tutorials"

    page.click("#prefs-btn")
    page.click("#prefs-help")
    page.fill("#sy-gate-input", GATE_TEST_PHRASE)
    page.press("#sy-gate-input", "Enter")
    page.wait_for_selector("#help-sheet .help-video", timeout=10000)
    assert page.locator("#help-sheet .help-video").count() == HELP_VIDEO_COUNT


HELP_API = "https://api.github.com/repos/sy-tools/sy-help"


def _admin_page(smoke_server, page, push=True, put_status=200):
    """The index signed in as a user whose push right on sy-help is `push`."""
    import base64

    calls = {"put": []}

    def api(route):
        req = route.request
        url = req.url
        if url == HELP_API:
            return route.fulfill(
                status=200, content_type="application/json", body=json.dumps({"permissions": {"push": push}})
            )
        if url.startswith(HELP_API + "/contents/catalog.json"):
            if req.method == "PUT":
                calls["put"].append(json.loads(req.post_data))
                if put_status != 200:
                    return route.fulfill(
                        status=put_status, content_type="application/json", body=json.dumps({"message": "sha mismatch"})
                    )
                return route.fulfill(
                    status=200, content_type="application/json", body=json.dumps({"content": {"sha": "s2"}})
                )
            content = base64.b64encode(json.dumps(HELP_CATALOG).encode()).decode()
            return route.fulfill(
                status=200, content_type="application/json", body=json.dumps({"sha": "s1", "content": content})
            )
        return route.fallback()

    _serve_help(page)
    page.route("**/api.github.com/repos/sy-tools/sy-help**", api)
    page.add_init_script(
        "localStorage.setItem('sy_lang', 'uk');"
        "localStorage.setItem('sy_gh_token', 'gho_smoke');"
        "localStorage.setItem('sy_gh_user', JSON.stringify({login: 'owner', id: 1}));"
    )
    page.goto(f"{smoke_server}/index.html")
    page.wait_for_function("document.title.includes('Index')", timeout=10000)
    _open_help(page)
    return calls


def test_the_edit_button_is_offered_only_to_who_can_push_to_the_help_repo(smoke_server, smoke_page):
    _admin_page(smoke_server, smoke_page, push=False)
    smoke_page.wait_for_timeout(300)
    assert smoke_page.locator("#help-sheet-edit").is_hidden()


def test_the_edit_button_stays_hidden_when_signed_out(index_page):
    _open_help(index_page)
    index_page.wait_for_timeout(300)
    assert index_page.locator("#help-sheet-edit").is_hidden()


def test_the_admin_saves_edited_texts_and_order_in_one_commit(smoke_server, smoke_page):
    page = smoke_page
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    calls = _admin_page(smoke_server, page)
    page.click("#help-sheet-edit")
    page.wait_for_selector(".help-admin__bar")
    assert page.locator(".help-admin__save").is_disabled()

    page.fill("[data-path='guide/intro/title/en']", "Getting started")
    assert page.locator(".help-admin__send").first.is_disabled(), "an upload while edits are unsaved would race them"
    page.click(".help-admin__video[data-file='intro'] .help-admin__down")
    page.fill("[data-path='updates/update-2026-09-05/notes/en']", "Settings menu\nTypo fixes")
    page.click(".help-admin__save")
    page.wait_for_selector(".help-admin__save:disabled")

    assert len(calls["put"]) == 1
    put = calls["put"][0]
    assert put["sha"] == "s1"
    assert put["branch"] == "main"
    import base64

    saved = json.loads(base64.b64decode(put["content"]))
    guide = saved["sections"][0]["videos"]
    assert [v["file"] for v in guide] == ["security", "intro"]
    assert guide[1]["title"] == {"uk": "Вступ", "en": "Getting started"}
    assert saved["sections"][1]["videos"][1]["notes"]["en"] == ["Settings menu", "Typo fixes"]

    page.click("#help-sheet-edit")
    titles = page.eval_on_selector_all("#help-sheet .help-video__title", "hs => hs.map(h => h.textContent)")
    assert titles[:2] == ["1.1 Безпека", "1.2 Вступ"], "leaving edit mode did not show what was saved"
    assert not page_errors, page_errors


def test_a_save_over_a_catalog_changed_elsewhere_reloads_it_and_says_so(smoke_server, smoke_page):
    page = smoke_page
    calls = _admin_page(smoke_server, page, put_status=409)
    page.click("#help-sheet-edit")
    page.wait_for_selector(".help-admin__bar")
    page.fill("[data-path='guide/intro/title/en']", "Lost edit")
    page.click(".help-admin__save")
    page.wait_for_selector(".help-admin__status .help-sheet__error")
    assert len(calls["put"]) == 1
    assert page.input_value("[data-path='guide/intro/title/en']") == "Introduction", "the stale edit was kept"
    assert page.locator(".help-admin__save").is_disabled()


def test_leaving_edit_mode_with_unsaved_changes_is_refused(smoke_server, smoke_page):
    page = smoke_page
    _admin_page(smoke_server, page)
    page.click("#help-sheet-edit")
    page.wait_for_selector(".help-admin__bar")
    page.fill("[data-path='guide/security/title/en']", "Safety")
    page.click("#help-sheet-edit")
    page.wait_for_selector(".help-admin__status .help-sheet__error")
    assert page.locator(".help-admin__bar").count() == 1
