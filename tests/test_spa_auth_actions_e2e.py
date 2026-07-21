"""E2E for the signed-in GitHub write actions: take-for-review (+'mine' chip,
filter, highlight), direct review-issue creation via the API, and the add-talk
PR. All GitHub endpoints are mocked with page.route; a signed-in session is
simulated by seeding sy_gh_token / sy_gh_user in localStorage (the app treats
those as the session — no network auth involved).

Note (edit-sync v2): the one-button "Create PR" flow from review/preview edits
was removed — background auto-sync (tests/test_spa_edit_sync_e2e.py) replaced
it. #btn-create-pr / #btn-preview-pr no longer exist, and the manual editor /
issue buttons are now signed-out-only (data-gh-hide). The signed-in issue API
path (SPA.createReviewIssue -> submitIssueViaApi) still exists and is exercised
here by calling it directly, since its button is hidden while signed in.
"""

import base64
import http.server
import json
import threading
from pathlib import Path

import pytest

pytestmark = pytest.mark.e2e

SITE = Path(__file__).parent.parent / "site"
SPA_URL = "/index.html"
MOCK_PLAYER_JS = (Path(__file__).parent / "fixtures" / "mock_vimeo_player.js").read_text()

SAMPLE_META = """title: 'Test Talk: Subtitle Preview'
date: '2001-01-01'
location: Test Location
videos:
- slug: Test-Video
  title: Test Video
  video_ref: r1DBtMTl9VW1NC
"""

SAMPLE_UK_SRT = """1
00:00:01,000 --> 00:00:05,000
Перший субтитр

2
00:00:06,000 --> 00:00:10,000
Другий субтитр
"""

SAMPLE_EN = "Talk Language: English\n\nFirst paragraph.\n\nSecond paragraph.\n"
SAMPLE_UK = "Мова промови: англійська\n\nПерший абзац.\n\nДругий абзац.\n"

MOCK_TREE = {
    "sha": "test123",
    "tree": [
        {"path": "talks/2001-01-01_Test-Talk/Test-Video/final/uk.srt", "type": "blob"},
        {"path": "talks/2001-01-01_Test-Talk/Test-Video/source/en.srt", "type": "blob"},
        {"path": "talks/2001-01-01_Test-Talk/meta.yaml", "type": "blob"},
        {"path": "talks/2001-01-01_Test-Talk/review_report.md", "type": "blob"},
        {"path": "talks/2001-01-01_Test-Talk/transcript_en.txt", "type": "blob"},
        {"path": "talks/2001-01-01_Test-Talk/transcript_uk.txt", "type": "blob"},
    ],
}

SECOND_TALK = "2002-02-02_Second-Talk"

TWO_TALK_TREE = {
    "sha": "tree2",
    "tree": MOCK_TREE["tree"]
    + [
        {"path": f"talks/{SECOND_TALK}/Test-Video/final/uk.srt", "type": "blob"},
        {"path": f"talks/{SECOND_TALK}/Test-Video/source/en.srt", "type": "blob"},
        {"path": f"talks/{SECOND_TALK}/meta.yaml", "type": "blob"},
        {"path": f"talks/{SECOND_TALK}/transcript_en.txt", "type": "blob"},
        {"path": f"talks/{SECOND_TALK}/transcript_uk.txt", "type": "blob"},
    ],
}

REVIEW_STATUS_UNASSIGNED = {
    "version": 1,
    "updated_at": "2026-07-12T00:00:00Z",
    "talks": {
        "2001-01-01_Test-Talk": {
            "status": "pending",
            "reviewer": None,
            "issue_number": 42,
            "updated_at": "2026-07-12T00:00:00Z",
        },
    },
}


@pytest.fixture(scope="module")
def server():
    injected = (
        (SITE / "index.html")
        .read_text()
        .replace(
            "<head>",
            "<head><script>window.__SY_REPO='sy-tools/sy-subtitles';"
            "window.__SY_GH_CLIENT_ID='Iv1.test';"
            "window.__SY_GH_EXCHANGE_URL='https://oauth-exchange.test/exchange';</script>",
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
                self.send_header("Content-Length", str(len(injected)))
                self.end_headers()
                self.wfile.write(injected)
                return
            super().do_GET()

    httpd = http.server.HTTPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{port}"
    httpd.shutdown()


@pytest.fixture(scope="module")
def browser():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


def _record(calls):
    def handler_for(status, payload):
        def handle(route):
            req = route.request
            calls.append(
                {
                    "method": req.method,
                    "url": req.url,
                    "body": json.loads(req.post_data) if req.post_data else None,
                }
            )
            route.fulfill(
                status=status,
                content_type="application/json",
                body=json.dumps(payload),
            )

        return handle

    return handler_for


def _wire(pg, calls, review_status, tree=None):
    """Read mocks first, then write mocks (later-registered routes win)."""
    h = _record(calls)
    pg.route(
        "**/api.github.com/**",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            headers={"ETag": '"e2e"'},
            body=json.dumps(tree if tree is not None else MOCK_TREE),
        ),
    )
    # Repo root: the write-access probe — full access, so the signed-in write
    # UI (the subject of these tests) stays enabled.
    pg.route(
        "**/api.github.com/repos/sy-tools/sy-subtitles",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"permissions": {"push": True, "pull": True}}),
        ),
    )
    # "My work" creator query — empty by default so signed-in tests keep the
    # assigned-only behaviour unless a test overrides this route (a route
    # registered later wins in Playwright).
    pg.route(
        "**/api.github.com/repos/**/issues?creator=*",
        lambda r: r.fulfill(status=200, content_type="application/json", body="[]"),
    )
    pg.route("**/raw.githubusercontent.com/**", lambda r: r.fulfill(status=404, body="not found"))
    pg.route(
        "**/raw.githubusercontent.com/**/meta.yaml",
        lambda r: r.fulfill(status=200, content_type="text/plain", body=SAMPLE_META),
    )
    pg.route(
        "**/raw.githubusercontent.com/**/uk.srt",
        lambda r: r.fulfill(status=200, content_type="text/plain", body=SAMPLE_UK_SRT),
    )
    pg.route(
        "**/raw.githubusercontent.com/**/transcript_en.txt",
        lambda r: r.fulfill(status=200, content_type="text/plain", body=SAMPLE_EN),
    )
    pg.route(
        "**/raw.githubusercontent.com/**/transcript_uk.txt",
        lambda r: r.fulfill(status=200, content_type="text/plain", body=SAMPLE_UK),
    )
    pg.route(
        "**/raw.githubusercontent.com/**/review-status.json",
        lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(review_status)),
    )
    # Preview needs a player: serve the mock Vimeo SDK and a blank embed page
    # so nothing reaches the real network.
    pg.route(
        "**/player.vimeo.com/api/player.js",
        lambda r: r.fulfill(status=200, content_type="application/javascript", body=MOCK_PLAYER_JS),
    )
    pg.route(
        "**/player.vimeo.com/video/**",
        lambda r: r.fulfill(status=200, content_type="text/html", body="<html></html>"),
    )
    # Write endpoints — registered last so they shadow the generic API mock.
    pg.route("**/api.github.com/repos/**/issues/42/assignees", h(201, {"number": 42}))
    pg.route(
        "**/api.github.com/repos/**/issues",
        h(201, {"number": 77, "html_url": "https://github.com/sy-tools/sy-subtitles/issues/77"}),
    )
    pg.route("**/api.github.com/repos/**/git/ref/heads/main", h(200, {"object": {"sha": "base1"}}))
    pg.route("**/api.github.com/repos/**/git/refs", h(201, {}))

    def contents(route):
        req = route.request
        if req.method == "GET":
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"sha": "blob1"}))
            return
        calls.append(
            {"method": req.method, "url": req.url, "body": json.loads(req.post_data) if req.post_data else None}
        )
        route.fulfill(status=201, content_type="application/json", body=json.dumps({"content": {}}))

    pg.route("**/api.github.com/repos/**/contents/**", contents)
    pg.route(
        "**/api.github.com/repos/**/pulls",
        h(201, {"number": 9, "html_url": "https://github.com/sy-tools/sy-subtitles/pull/9"}),
    )


def _page(browser, calls, review_status, signed_in=True, tree=None):
    ctx = browser.new_context()
    pg = ctx.new_page()
    _wire(pg, calls, review_status, tree=tree)
    pg.add_init_script(
        "localStorage.removeItem('sy_tree_cache__main');localStorage.removeItem('sy_review_status__main');"
    )
    if signed_in:
        pg.add_init_script(
            "localStorage.setItem('sy_gh_token', 'gho_e2e');"
            "localStorage.setItem('sy_gh_user',"
            " JSON.stringify({login: 'tester', avatar_url: 'icon.png'}));"
        )
    # Auto-resolve single-button info dialogs; record window.open targets.
    pg.add_init_script(
        "window.__spa_auto_info_confirm = true;"
        "window.__opened = []; window.open = function(u){ window.__opened.push(u); };"
    )
    return ctx, pg


def test_take_for_review_assigns_existing_issue(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    pg.click(".take-review-btn")
    # Optimistic update: the talk moves out of the default needs-review filter
    # and into the 'mine' chip; following the chip shows the highlighted card.
    pg.wait_for_function(
        "document.querySelector(\".stat-card[data-filter='mine'] .num\")"
        " && document.querySelector(\".stat-card[data-filter='mine'] .num\").textContent.includes('1')",
        timeout=5000,
    )
    posts = [c for c in calls if c["method"] == "POST"]
    assert posts and posts[0]["url"].endswith("/issues/42/assignees")
    assert posts[0]["body"] == {"assignees": ["tester"]}
    pg.click(".stat-card[data-filter='mine']")
    pg.wait_for_selector(".talk-item--mine", timeout=5000)
    assert "tester" in pg.locator(".review-badge, .status-badge").first.text_content()
    ctx.close()


def test_take_for_review_creates_issue_when_none_exists(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, {"version": 1, "talks": {}})
    # A talk with no review issue is 'in-progress' — visible only in expert
    # mode's 'all' filter, so claim-from-scratch is an expert-mode action.
    pg.add_init_script("localStorage.setItem('sy_expert_mode', '1');localStorage.setItem('sy_filter_expert', 'all');")
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    pg.click(".take-review-btn")
    pg.wait_for_function(
        "document.querySelector(\".stat-card[data-filter='mine'] .num\")"
        " && document.querySelector(\".stat-card[data-filter='mine'] .num\").textContent.includes('1')",
        timeout=5000,
    )
    posts = [c for c in calls if c["method"] == "POST"]
    assert posts and posts[0]["url"].endswith("/issues")
    body = posts[0]["body"]
    assert body["title"] == "Review: 2001-01-01_Test-Talk"
    assert "talk-review" in body["labels"]
    assert body["assignees"] == ["tester"]
    ctx.close()


def test_mine_chip_filters_and_highlights(server, browser):
    st = {
        "version": 1,
        "talks": {
            "2001-01-01_Test-Talk": {
                "status": "in-progress",
                "reviewer": "tester",
                "issue_number": 42,
                "updated_at": "2026-07-12T00:00:00Z",
            }
        },
    }
    ctx, pg = _page(browser, [], st)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='mine']", timeout=10000)
    assert "1" in pg.locator(".stat-card[data-filter='mine'] .num").text_content()
    pg.click(".stat-card[data-filter='mine']")
    pg.wait_for_timeout(200)
    assert pg.locator(".talk-item").count() == 1
    assert pg.locator(".talk-item--mine").count() == 1
    ctx.close()


def test_review_issue_posted_via_api_when_signed_in(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED)
    pg.goto(f"{server}{SPA_URL}#/review/2001-01-01_Test-Talk")
    pg.wait_for_function("document.querySelectorAll('.cell.uk').length > 0", timeout=10000)
    # Edit-sync v2: the "Create Issue" button is data-gh-hide, so it is hidden
    # while signed in (auto-sync replaces the manual flows). The signed-in issue
    # API path still exists — invoke it directly rather than clicking the button.
    assert not pg.locator("#view-review .btn--issue").is_visible()
    pg.evaluate("SPA.createReviewIssue()")
    pg.wait_for_function("window.__opened.length > 0", timeout=10000)
    posts = [c for c in calls if c["method"] == "POST" and c["url"].endswith("/issues")]
    assert posts and posts[0]["body"]["title"].startswith("Translation review:")
    assert posts[0]["body"]["labels"] == ["review:pending"]
    # The prefilled /issues/new page was NOT opened — the API path was taken.
    assert pg.evaluate("window.__opened[0]") == "https://github.com/sy-tools/sy-subtitles/issues/77"
    ctx.close()


def test_signed_out_shows_none_of_the_new_ui(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, signed_in=False)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".talk-item", timeout=10000)
    assert pg.locator(".take-review-btn").count() == 0
    assert pg.locator(".stat-card[data-filter='mine']").count() == 0
    pg.goto(f"{server}{SPA_URL}#/review/2001-01-01_Test-Talk")
    pg.wait_for_function("document.querySelectorAll('.cell.uk').length > 0", timeout=10000)
    # The one-button Create-PR control was removed entirely (edit-sync v2).
    assert pg.locator("#btn-create-pr").count() == 0
    # The classic editor flow stays: signed-out users see the editor button.
    assert pg.locator("#btn-review-editor").is_visible()
    assert not calls, "no write API calls may happen signed out"
    ctx.close()


def test_take_for_review_failure_recovers_the_button(server, browser):
    """A failed write must not leave a dead disabled button: the card stays
    claimable and the toast names the actionable problem (app not installed)
    instead of echoing the opaque API message."""
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED)
    pg.route(
        "**/api.github.com/repos/**/issues/42/assignees",
        lambda r: r.fulfill(
            status=403,
            content_type="application/json",
            body=json.dumps({"message": "Resource not accessible by integration"}),
        ),
    )
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    pg.click(".take-review-btn")
    pg.wait_for_function("document.getElementById('toast').classList.contains('show')", timeout=5000)
    assert "GitHub App" in pg.locator("#toast").text_content()
    pg.wait_for_function(
        "document.querySelector('.take-review-btn') && !document.querySelector('.take-review-btn').disabled",
        timeout=5000,
    )
    ctx.close()


def test_signed_in_review_hides_editor_and_has_no_create_pr(server, browser):
    """Edit-sync v2: signed in, background auto-sync replaces the manual flows.
    The Open-in-GitHub-Editor button is data-gh-hide (present but hidden), and
    there is no Create-PR button at all."""
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    pg.goto(f"{server}{SPA_URL}#/review/2001-01-01_Test-Talk")
    pg.wait_for_function("document.querySelectorAll('.cell.uk').length > 0", timeout=10000)
    assert pg.locator("#btn-create-pr").count() == 0
    assert pg.locator("#btn-review-editor").count() == 1
    assert not pg.locator("#btn-review-editor").is_visible()
    ctx.close()


def _open_preview_in_edit_mode(pg, server):
    pg.goto(f"{server}{SPA_URL}#/preview/2001-01-01_Test-Talk/Test-Video")
    pg.wait_for_selector("#mock-player", state="visible", timeout=10000)
    pg.click(".preview-mode-toggle [data-mode='edit']")


def test_signed_in_preview_hides_editor_and_has_no_pr_button(server, browser):
    """Edit-sync v2: signed in, the preview's editor button is hidden (edit
    mode, signed in) and the removed Create-PR control is absent."""
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _open_preview_in_edit_mode(pg, server)
    assert pg.locator("#btn-preview-pr").count() == 0
    assert pg.locator("#btn-preview-editor").count() == 1
    assert not pg.locator("#btn-preview-editor").is_visible()
    # Marker mode also keeps the editor hidden; still no PR button.
    pg.click(".preview-mode-toggle [data-mode='marker']")
    assert pg.locator("#btn-preview-pr").count() == 0
    assert not pg.locator("#btn-preview-editor").is_visible()
    ctx.close()


def test_signed_out_preview_keeps_editor_button(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, signed_in=False)
    _open_preview_in_edit_mode(pg, server)
    assert pg.locator("#btn-preview-editor").is_visible()
    # The one-button preview PR control was removed entirely (edit-sync v2).
    assert pg.locator("#btn-preview-pr").count() == 0
    assert not calls, "no write API calls may happen signed out"
    ctx.close()


def test_add_talk_creates_pr_when_signed_in(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED)
    payload = json.dumps({"t": "Brand New Talk", "d": "2002-02-02", "u": "https://www.amruta.org/talk/"})
    pg.goto(f"{server}{SPA_URL}#/add?data={payload}")
    pg.wait_for_selector("#add-form", state="visible", timeout=10000)
    pg.click("#add-form button[type='submit']")
    pg.wait_for_function("window.__opened.length > 0", timeout=10000)

    put = next(c for c in calls if c["method"] == "PUT")
    assert put["url"].split("?")[0].endswith("/contents/talks/2002-02-02_Brand-New-Talk/meta.yaml")
    committed = base64.b64decode(put["body"]["content"]).decode("utf-8")
    assert "Brand New Talk" in committed
    refs = next(c for c in calls if c["url"].endswith("/git/refs"))
    assert refs["body"]["ref"].startswith("refs/heads/add-talk/2002-02-02_Brand-New-Talk--tester--")
    assert pg.evaluate("window.__opened[0]") == "https://github.com/sy-tools/sy-subtitles/pull/9"
    ctx.close()


# ============================================================
# "My work" mine-filter extension (assigned + my PRs/issues)
# ============================================================


def _my_work_rows_route(pg, rows, calls=None):
    def handle(route):
        if calls is not None:
            calls.append(route.request.url)
        route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))

    pg.route("**/api.github.com/repos/**/issues?creator=*", handle)


def _mine_chip_num(pg):
    return pg.locator(".stat-card[data-filter='mine'] .num").text_content()


def test_mine_filter_groups_started_work_with_separator(server, browser):
    # 2001 assigned to tester; 2002 has tester's open sync PR (not assigned).
    review_status = {
        "version": 1,
        "talks": {
            "2001-01-01_Test-Talk": {"status": "in-progress", "reviewer": "tester", "issue_number": 42},
        },
    }
    ctx, pg = _page(browser, [], review_status, tree=TWO_TALK_TREE)
    _my_work_rows_route(
        pg,
        [
            {
                "number": 101,
                "title": f"Edit sync: {SECOND_TALK} (tester)",
                "state": "open",
                "html_url": "https://github.com/sy-tools/sy-subtitles/pull/101",
                "pull_request": {"merged_at": None},
            },
            # Merged PR on the assigned talk: invisible in normal mode
            # (open-only), a --merged badge in expert mode.
            {
                "number": 90,
                "title": "Edit sync: 2001-01-01_Test-Talk (tester)",
                "state": "closed",
                "html_url": "https://github.com/sy-tools/sy-subtitles/pull/90",
                "pull_request": {"merged_at": "2026-07-01T00:00:00Z"},
            },
        ],
    )
    pg.goto(f"{server}{SPA_URL}")
    # The creator query resolves async after first render — wait for the union count.
    pg.wait_for_function(
        "document.querySelector(\".stat-card[data-filter='mine'] .num\")"
        " && document.querySelector(\".stat-card[data-filter='mine'] .num\").textContent === '2'",
        timeout=10000,
    )
    pg.click(".stat-card[data-filter='mine']")
    pg.wait_for_selector(".talk-sep", timeout=5000)
    items = pg.locator("#index-content .talk-item, #index-content .talk-sep")
    # Order: assigned card, separator, started card.
    assert items.count() == 3
    assert "talk-sep" in items.nth(1).get_attribute("class")
    # Normal mode renders no badges.
    assert pg.locator(".work-badge").count() == 0
    # Expert mode: the separator still splits the mine list, and badges
    # carry state-specific classes + GitHub links (open and merged here;
    # the closed state is covered by the expert-badges test).
    pg.evaluate("SPA.toggleExpert()")
    pg.click(".stat-card[data-filter='mine']")
    pg.wait_for_selector(".talk-sep", timeout=5000)
    expert_items = pg.locator("#index-content .talk-item, #index-content .talk-sep")
    assert expert_items.count() == 3
    assert "talk-sep" in expert_items.nth(1).get_attribute("class")
    open_badge = pg.wait_for_selector(".work-badge--open", timeout=5000)
    assert open_badge.get_attribute("href").endswith("/pull/101")
    merged_badge = pg.locator(".work-badge--merged")
    assert merged_badge.get_attribute("href").endswith("/pull/90")
    assert merged_badge.text_content().strip() == "PR #90"
    ctx.close()


def test_expert_mode_shows_badges_and_counts_closed_items(server, browser):
    # Only work item = a CLOSED marker issue on 2002: invisible in normal
    # mode, counted + badged in expert mode.
    review_status = {"version": 1, "talks": {}}
    creator_calls = []
    ctx, pg = _page(browser, [], review_status, tree=TWO_TALK_TREE)
    _my_work_rows_route(
        pg,
        [
            {
                "number": 55,
                "title": f"Markers: {SECOND_TALK} / Test-Video",
                "state": "closed",
                "html_url": "https://github.com/sy-tools/sy-subtitles/issues/55",
            },
        ],
        calls=creator_calls,
    )
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='mine']", timeout=10000)
    assert _mine_chip_num(pg) == "0"
    pg.evaluate("SPA.toggleExpert()")
    pg.wait_for_function(
        "document.querySelector(\".stat-card[data-filter='mine'] .num\").textContent === '1'",
        timeout=5000,
    )
    # Badges show on any filter in expert mode — visible before entering 'mine'.
    pg.wait_for_selector(".work-badge--closed", timeout=5000)
    pg.click(".stat-card[data-filter='mine']")
    badge = pg.wait_for_selector(".work-badge--closed", timeout=5000)
    assert badge.get_attribute("href").endswith("/issues/55")
    assert badge.text_content().strip() == "#55"
    # The expert toggle filters cached data at read time — no refetch.
    assert len(creator_calls) == 1
    ctx.close()


def test_mine_excludes_approved_talks_in_normal_mode(server, browser):
    # 2002 is approved but has tester's OPEN PR: hidden in normal mode,
    # shown in expert mode (spec decision).
    review_status = {
        "version": 1,
        "talks": {
            SECOND_TALK: {"status": "approved", "reviewer": "someone-else", "issue_number": 43},
        },
    }
    ctx, pg = _page(browser, [], review_status, tree=TWO_TALK_TREE)
    _my_work_rows_route(
        pg,
        [
            {
                "number": 101,
                "title": f"Edit sync: {SECOND_TALK} (tester)",
                "state": "open",
                "html_url": "https://github.com/sy-tools/sy-subtitles/pull/101",
                "pull_request": {"merged_at": None},
            },
        ],
    )
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='mine']", timeout=10000)
    # Give the async creator fetch time to land, then assert it stayed 0.
    pg.wait_for_timeout(1500)
    assert _mine_chip_num(pg) == "0"
    pg.evaluate("SPA.toggleExpert()")
    pg.wait_for_function(
        "document.querySelector(\".stat-card[data-filter='mine'] .num\").textContent === '1'",
        timeout=5000,
    )
    ctx.close()


def test_read_only_session_never_fires_the_creator_query(server, browser):
    # A signed-in session WITHOUT repo write access is functionally signed
    # out: no mine chip, and the my-work query must not fire at all.
    creator_calls = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _my_work_rows_route(pg, [], calls=creator_calls)
    # Degraded state: cached no-write flag + a probe that confirms it.
    pg.route(
        "**/api.github.com/repos/sy-tools/sy-subtitles",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"permissions": {"push": False, "pull": True}}),
        ),
    )
    pg.add_init_script("localStorage.setItem('sy_gh_no_write', '1');")
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card", timeout=10000)
    assert pg.locator(".stat-card[data-filter='mine']").count() == 0
    pg.wait_for_timeout(800)
    assert creator_calls == []
    ctx.close()


def test_my_work_fetch_failure_falls_back_to_assigned_only(server, browser):
    review_status = {
        "version": 1,
        "talks": {
            "2001-01-01_Test-Talk": {"status": "in-progress", "reviewer": "tester", "issue_number": 42},
        },
    }
    ctx, pg = _page(browser, [], review_status)
    pg.route(
        "**/api.github.com/repos/**/issues?creator=*",
        lambda r: r.fulfill(status=500, content_type="application/json", body="{}"),
    )
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_function(
        "document.querySelector(\".stat-card[data-filter='mine'] .num\")"
        " && document.querySelector(\".stat-card[data-filter='mine'] .num\").textContent === '1'",
        timeout=10000,
    )
    ctx.close()


def test_review_issue_i_created_for_someone_elses_review_is_not_my_work(server, browser):
    # Live bug: the user CREATED "Review: <talk>" (take-for-review does that),
    # the review was then taken over by another person. The talk must NOT
    # land in "work I started" — creating the tracking issue is not doing
    # the work; assignment (the reviewer field) is the only review signal.
    review_status = {
        "version": 1,
        "talks": {
            SECOND_TALK: {"status": "in-progress", "reviewer": "someone-else", "issue_number": 2},
        },
    }
    ctx, pg = _page(browser, [], review_status, tree=TWO_TALK_TREE)
    _my_work_rows_route(
        pg,
        [
            {
                "number": 2,
                "title": f"Review: {SECOND_TALK}",
                "state": "open",
                "html_url": "https://github.com/sy-tools/sy-subtitles/issues/2",
            },
        ],
    )
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='mine']", timeout=10000)
    pg.wait_for_timeout(1500)  # let the async creator fetch land
    assert _mine_chip_num(pg) == "0"
    ctx.close()
