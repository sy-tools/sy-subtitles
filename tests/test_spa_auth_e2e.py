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
