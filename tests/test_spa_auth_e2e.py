"""GitHub sign-in happy path + logout, fully offline (all GitHub endpoints and
the exchange Worker are mocked with page.route). Follows the boot-smoke server
pattern; marker e2e only (not smoke — this is a feature test, not the boot gate).
"""

import http.server
import json
import threading
from pathlib import Path

import pytest

pytestmark = [pytest.mark.e2e]

SITE = Path(__file__).parent.parent / "site"
EXCHANGE_URL = "https://oauth-exchange.test/exchange"


def _serve(index_html: bytes):
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
    return httpd, f"http://127.0.0.1:{port}"


@pytest.fixture
def auth_server():
    # window test hooks: repo (off-Pages), client id + exchange URL (the shipped
    # config is empty = feature disabled; the hooks enable it for the test).
    inject = (
        "<head><script>"
        "window.__SY_REPO='sy-tools/sy-subtitles';"
        "window.__SY_GH_CLIENT_ID='Iv1.test';"
        f"window.__SY_GH_EXCHANGE_URL='{EXCHANGE_URL}';"
        "</script>"
    )
    index_html = (SITE / "index.html").read_text().replace("<head>", inject, 1).encode("utf-8")
    httpd, url = _serve(index_html)
    yield url
    httpd.shutdown()


@pytest.fixture
def plain_server():
    # No auth hooks: the shipped config (real APP_GH_CLIENT_ID + prod worker
    # URL) stays in force, so this serves the app exactly as production does.
    inject = "<head><script>window.__SY_REPO='sy-tools/sy-subtitles';</script>"
    index_html = (SITE / "index.html").read_text().replace("<head>", inject, 1).encode("utf-8")
    httpd, url = _serve(index_html)
    yield url
    httpd.shutdown()


def _route_github(pg, auth_server):
    # Later-registered routes win in Playwright, so the generic API mock goes
    # FIRST and the specific /user mock second (it must shadow the generic one).
    pg.route(
        "**/api.github.com/**",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            headers={"ETag": '"e2e"'},
            body=json.dumps({"sha": "e2e", "tree": [], "truncated": False}),
        ),
    )
    pg.route(
        "**/api.github.com/user",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"login": "tester", "avatar_url": f"{auth_server}/icon.png"}),
        ),
    )
    # Repo root: the write-access probe. Default = full access (a collaborator),
    # matching what the API returns for users who have been added to the repo.
    pg.route(
        "**/api.github.com/repos/sy-tools/sy-subtitles",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"permissions": {"push": True, "pull": True}}),
        ),
    )
    pg.route(
        "**/raw.githubusercontent.com/**",
        lambda r: r.fulfill(status=404, body="not found"),
    )
    pg.route(
        EXCHANGE_URL,
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"token": "gho_e2e"}),
        ),
    )


@pytest.fixture
def auth_page(auth_server):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        pg = ctx.new_page()
        _route_github(pg, auth_server)
        yield pg
        ctx.close()
        browser.close()


def test_callback_exchanges_code_and_signs_in(auth_server, auth_page):
    page = auth_page
    # Pre-seed the CSRF state exactly as SPA.ghLogin would before redirecting.
    page.add_init_script("sessionStorage.setItem('sy_gh_state', 'st1');")
    page.goto(f"{auth_server}/index.html?code=c1&state=st1")
    page.wait_for_selector("#gh-avatar", state="visible", timeout=10000)
    # Token persisted, avatar labeled with the login, URL scrubbed of auth params.
    assert page.evaluate("localStorage.getItem('sy_gh_token')") == "gho_e2e"
    assert "tester" in page.evaluate("document.getElementById('gh-avatar').title")
    assert "code=" not in page.url and "state=" not in page.url
    # Login button hidden while signed in.
    assert page.evaluate("getComputedStyle(document.getElementById('gh-login-btn')).display") == "none"


def test_avatar_tooltip_refreshes_on_language_toggle(auth_server, auth_page):
    """The avatar tooltip carries the translated "signed in as" prefix, but it
    is set imperatively (the avatar has no data-i18n* attribute), so a UI
    language toggle must refresh it — otherwise it sticks in the old language."""
    page = auth_page
    page.add_init_script("localStorage.setItem('sy_lang', 'en');")
    page.add_init_script("sessionStorage.setItem('sy_gh_state', 'st1');")
    page.goto(f"{auth_server}/index.html?code=c1&state=st1")
    page.wait_for_selector("#gh-avatar", state="visible", timeout=10000)
    before = page.evaluate("document.getElementById('gh-avatar').title")
    assert before == "Signed in as tester"
    page.click("#lang-btn")
    after = page.evaluate("document.getElementById('gh-avatar').title")
    assert after != before, "avatar tooltip must refresh on language toggle"
    assert after == page.evaluate("t('auth.signed_in')") + " tester"


def test_avatar_menu_signs_out(auth_server, auth_page):
    page = auth_page
    page.add_init_script("sessionStorage.setItem('sy_gh_state', 'st1');")
    page.goto(f"{auth_server}/index.html?code=c1&state=st1")
    page.wait_for_selector("#gh-avatar", state="visible", timeout=10000)
    page.click("#gh-avatar")
    page.click(".sy-modal-btn.primary")  # confirm sign-out
    page.wait_for_selector("#gh-login-btn", state="visible", timeout=5000)
    assert page.evaluate("localStorage.getItem('sy_gh_token')") is None


def test_invalid_state_does_not_sign_in(auth_server, auth_page):
    page = auth_page
    page.add_init_script("sessionStorage.setItem('sy_gh_state', 'OTHER');")
    page.goto(f"{auth_server}/index.html?code=c1&state=st1")
    page.wait_for_selector("#gh-login-btn", state="visible", timeout=10000)
    assert page.evaluate("localStorage.getItem('sy_gh_token')") is None
    assert "code=" not in page.url


def test_signed_out_default_shows_login_button(plain_server):
    """The shipped config carries the real GitHub App client id + worker URL,
    so a signed-out visitor sees the login button (and no avatar) by default."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        pg = ctx.new_page()
        _route_github(pg, plain_server)
        pg.goto(f"{plain_server}/index.html")
        pg.wait_for_function("document.title.includes('Index')", timeout=10000)
        assert pg.evaluate("getComputedStyle(document.getElementById('gh-login-btn')).display") != "none"
        assert pg.evaluate("getComputedStyle(document.getElementById('gh-avatar')).display") == "none"
        ctx.close()
        browser.close()


@pytest.fixture
def hooks_only_server():
    # Auth hooks WITHOUT __SY_REPO: off Pages the app can only learn the repo
    # from ?repo=, so this fixture proves the login roundtrip restores it.
    inject = f"<head><script>window.__SY_GH_CLIENT_ID='Iv1.test';window.__SY_GH_EXCHANGE_URL='{EXCHANGE_URL}';</script>"
    index_html = (SITE / "index.html").read_text().replace("<head>", inject, 1).encode("utf-8")
    httpd, url = _serve(index_html)
    yield url
    httpd.shutdown()


def test_callback_restores_app_params_saved_before_login(hooks_only_server):
    """GitHub App redirect_uri is the bare app URL (exact-match rule), so
    ?repo= must round-trip via sessionStorage — else the off-Pages app cannot
    even boot on the callback (deriveRepo throws -> blank page)."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        pg = ctx.new_page()
        _route_github(pg, hooks_only_server)
        pg.add_init_script(
            "sessionStorage.setItem('sy_gh_state', 'st1');"
            "sessionStorage.setItem('sy_gh_return', '?repo=sy-tools%2Fsy-subtitles');"
        )
        # The callback arrives WITHOUT ?repo — exactly as GitHub sends it.
        pg.goto(f"{hooks_only_server}/index.html?code=c1&state=st1")
        pg.wait_for_selector("#gh-avatar", state="visible", timeout=10000)
        assert pg.evaluate("localStorage.getItem('sy_gh_token')") == "gho_e2e"
        assert "repo=" in pg.url and "code=" not in pg.url
        ctx.close()
        browser.close()


def test_login_roundtrip_returns_to_the_page_the_user_left(hooks_only_server):
    """Full circle: clicking login on a preview page must land back ON that
    preview page. redirect_uri is the bare app URL (exact-match rule), so BOTH
    the query (?repo=) and the hash route (#/preview/...) round-trip via
    sessionStorage; losing the hash strands the user on the index after login."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")
    from urllib.parse import parse_qs, urlparse

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context()
        pg = ctx.new_page()
        _route_github(pg, hooks_only_server)

        # GitHub authorize bounces straight back to redirect_uri with a code —
        # the shape of a real approval, so the SPA's stash/restore pair runs
        # exactly as in production.
        def authorize(route):
            q = parse_qs(urlparse(route.request.url).query)
            target = q["redirect_uri"][0] + "?code=c1&state=" + q["state"][0]
            route.fulfill(status=302, headers={"Location": target})

        pg.route("https://github.com/login/oauth/authorize*", authorize)

        route_hash = "#/preview/1979-09-27_Talk/Video-HD"
        pg.goto(f"{hooks_only_server}/index.html?repo=sy-tools%2Fsy-subtitles{route_hash}")
        pg.wait_for_selector("#gh-login-btn", state="visible", timeout=10000)
        pg.click("#gh-login-btn")
        pg.wait_for_selector("#gh-avatar", state="visible", timeout=10000)
        assert pg.evaluate("localStorage.getItem('sy_gh_token')") == "gho_e2e"
        assert "repo=" in pg.url and "code=" not in pg.url
        assert pg.url.endswith(route_hash), f"login must return to the page the user left, got {pg.url}"
        ctx.close()
        browser.close()


def test_foreign_state_url_does_not_consume_the_return_stash(auth_server, auth_page):
    """An abandoned login leaves the return stash in sessionStorage. A later
    URL carrying an UNRELATED ?state= (a pasted link, a foreign App-install
    callback) must not consume it and teleport the user to the stale
    pre-login route — only a state matching the saved CSRF state (which
    GitHub echoes back on both success and error paths) may restore."""
    page = auth_page
    page.add_init_script(
        "sessionStorage.setItem('sy_gh_state', 'st1');"
        "sessionStorage.setItem('sy_gh_return', '?repo=sy-tools%2Fsy-subtitles');"
        "sessionStorage.setItem('sy_gh_return_hash', '#/preview/1979-09-27_Talk/Video-HD');"
    )
    page.goto(f"{auth_server}/index.html?state=UNRELATED")
    page.wait_for_selector("#gh-login-btn", state="visible", timeout=10000)
    assert "#/preview/" not in page.url, f"stale route must not be restored, got {page.url}"
    assert "repo=" not in page.url
    # The stash survives for the real callback that may still arrive.
    assert page.evaluate("sessionStorage.getItem('sy_gh_return_hash')") == ("#/preview/1979-09-27_Talk/Video-HD")


def test_login_control_sits_left_of_branch_selector(auth_server, auth_page):
    """The login button and avatar live in the freshness bar's LEFT group,
    before the branch selector — placed on the right they visually split the
    refresh button from the last-updated message."""
    page = auth_page
    page.goto(f"{auth_server}/index.html")
    page.wait_for_selector("#gh-login-btn", state="visible", timeout=10000)
    left_group = "document.getElementById('freshness-bar').children[0]"
    for el_id in ("gh-login-btn", "gh-avatar", "branch-btn"):
        assert page.evaluate(f"{left_group}.contains(document.getElementById('{el_id}'))"), (
            f"#{el_id} must be in the freshness bar's left group"
        )
    assert page.evaluate(
        "!!(document.getElementById('gh-login-btn').compareDocumentPosition("
        "document.getElementById('branch-btn')) & Node.DOCUMENT_POSITION_FOLLOWING)"
    ), "login button must precede the branch selector"


def test_login_redirect_uri_is_bare_app_url(auth_server, auth_page):
    """The authorize URL must carry a query-less redirect_uri (GitHub Apps
    exact-match a registered callback; ?repo= riding along is rejected with
    'redirect_uri is not associated with this application')."""
    page = auth_page
    page.route(
        "https://github.com/login/oauth/authorize*",
        lambda r: r.fulfill(status=200, content_type="text/html", body="<title>gh</title>"),
    )
    page.goto(f"{auth_server}/index.html")
    page.wait_for_selector("#gh-login-btn", state="visible", timeout=10000)
    page.click("#gh-login-btn")
    page.wait_for_url("**github.com/login/oauth/authorize**", timeout=5000)
    from urllib.parse import parse_qs, urlparse

    q = parse_qs(urlparse(page.url).query)
    redirect_uri = q["redirect_uri"][0]
    assert "?" not in redirect_uri and "index.html" not in redirect_uri
    assert redirect_uri.endswith("/")
    # (sessionStorage can't be asserted here: page.url is github.com now — a
    # different origin. The stash/restore pair is proven by
    # test_callback_restores_app_params_saved_before_login.)


# ---------------------------------------------------------------------------
# Read-only mode: signed in WITHOUT repo write access (permissions.push=false
# — the user has not been added to the repo; the repo itself is public-read).
# The UI must collapse to the signed-out feature set, keeping only the avatar
# (grayscale + disconnect badge) as evidence of the session.
# ---------------------------------------------------------------------------


def _seed_session(pg):
    pg.add_init_script(
        "localStorage.setItem('sy_gh_token', 'gho_e2e');"
        "localStorage.setItem('sy_gh_user',"
        " JSON.stringify({login: 'tester', avatar_url: 'icon.png'}));"
    )


def _route_repo_permissions(pg, push):
    # Registered after the fixture's default push=true route — later wins.
    pg.route(
        "**/api.github.com/repos/sy-tools/sy-subtitles",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"permissions": {"push": push, "pull": True}}),
        ),
    )


def test_readonly_user_gets_signed_out_ui_with_badge(auth_server, auth_page):
    page = auth_page
    _route_repo_permissions(page, False)
    _seed_session(page)
    page.goto(f"{auth_server}/index.html")
    page.wait_for_function("localStorage.getItem('sy_gh_no_write') === '1'", timeout=10000)
    # Avatar stays (still signed in), marked grayscale + badge.
    assert page.evaluate("getComputedStyle(document.getElementById('gh-avatar')).display") != "none"
    assert page.evaluate("document.getElementById('gh-avatar-wrap').classList.contains('gh-avatar--readonly')")
    assert "grayscale" in page.evaluate("getComputedStyle(document.getElementById('gh-avatar')).filter")
    assert page.evaluate("getComputedStyle(document.getElementById('gh-avatar-badge')).display") != "none"
    # Write-gated controls behave exactly as for a signed-out visitor: the
    # signed-out fallback (data-gh-hide, e.g. Open in GitHub Editor) is shown.
    # (v3 removed the write-only Create-PR buttons; edits auto-sync instead.)
    assert page.evaluate("document.getElementById('btn-review-editor').style.display") != "none"
    # The login button must NOT reappear — the user IS signed in.
    assert page.evaluate("getComputedStyle(document.getElementById('gh-login-btn')).display") == "none"


def test_write_access_return_clears_flag_and_restores_ui(auth_server, auth_page):
    """Once an admin adds the user, the next probe (boot here; the 30-min
    re-check while the page is open) lifts read-only mode automatically."""
    page = auth_page  # fixture default: push=true
    _seed_session(page)
    page.add_init_script("localStorage.setItem('sy_gh_no_write', '1');")
    page.goto(f"{auth_server}/index.html")
    page.wait_for_function("localStorage.getItem('sy_gh_no_write') === null", timeout=10000)
    assert not page.evaluate("document.getElementById('gh-avatar-wrap').classList.contains('gh-avatar--readonly')")
    # With write access the signed-out fallback (data-gh-hide) is hidden again —
    # auto-sync takes over (v3 removed the standalone Create-PR button).
    assert page.evaluate("document.getElementById('btn-review-editor').style.display") == "none"


def test_integration_403_blames_missing_repo_access_not_the_app(auth_server, auth_page):
    """GitHub returns the SAME 403 'Resource not accessible by integration'
    for app-not-installed AND user-without-write. ghWriteError must consult
    permissions and blame the right cause instead of always blaming the App."""
    page = auth_page
    _route_repo_permissions(page, False)
    _seed_session(page)
    page.goto(f"{auth_server}/index.html")
    # Let the boot probe finish first so the toast assertion is race-free.
    page.wait_for_function("localStorage.getItem('sy_gh_no_write') === '1'", timeout=10000)
    page.evaluate("ghWriteError({status: 403, message: 'Resource not accessible by integration'})")
    page.wait_for_function(
        "document.getElementById('toast').textContent === t('gh.no_repo_access')",
        timeout=5000,
    )
    assert page.evaluate("localStorage.getItem('sy_gh_no_write')") == "1"
