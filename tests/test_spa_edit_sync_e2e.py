"""E2E for the SPA's edit auto-sync feature (site/js/edit_sync.js wired into
site/index.html).

For a signed-in user on a review/preview view, edits stored in localStorage
auto-sync to a state file (.review-sync/<talkId>.json) on a deterministic
branch (sync/<login>/<talkId>) behind a draft PR. This suite drives the real
browser flow with all GitHub endpoints mocked via page.route:

  1. first edit bootstraps the branch, state file and draft PR,
  2. cross-device pull adopts remote edits without pushing,
  3. a CAS 409 triggers a fetch + three-way merge + retry,
  4. the signed-in preview hides Copy-all (signed out keeps it in marker mode),
  5. finalize commits the real file, deletes the state file, marks PR ready,
  6. the synced chip opens the PR url.

The harness mirrors tests/test_spa_auth_actions_e2e.py: a local http.server
serves site/ with window.__SY_* injected in <head>, the signed-in session is
seeded via sy_gh_token / sy_gh_user, and window.open is stubbed. Generic
GitHub routes are registered first; specific routes after (later routes win).
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

# Session identity: the sync branch is derived from this login + the talk id.
LOGIN = "tester"
TALK_ID = "2001-01-01_Test-Talk"
VIDEO_SLUG = "Test-Video"
SYNC_BRANCH = f"sync/{LOGIN}/{TALK_ID}"
STATE_PATH = f".review-sync/{TALK_ID}.json"
REVIEW_KEY = f"review_{TALK_ID}"
SYNC_BASE_KEY = f"sy_sync_base_{TALK_ID}"

PR_NUMBER = 88
PR_URL = "https://github.com/sy-tools/sy-subtitles/pull/88"
PR_NODE_ID = "PR_n88"

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
# rightParas[0] == "Перший абзац." after the header line is stripped.
PARA0 = "Перший абзац."

MOCK_TREE = {
    "sha": "test123",
    "tree": [
        {"path": f"talks/{TALK_ID}/{VIDEO_SLUG}/final/uk.srt", "type": "blob"},
        {"path": f"talks/{TALK_ID}/{VIDEO_SLUG}/source/en.srt", "type": "blob"},
        {"path": f"talks/{TALK_ID}/meta.yaml", "type": "blob"},
        {"path": f"talks/{TALK_ID}/review_report.md", "type": "blob"},
        {"path": f"talks/{TALK_ID}/transcript_en.txt", "type": "blob"},
        {"path": f"talks/{TALK_ID}/transcript_uk.txt", "type": "blob"},
    ],
}

REVIEW_STATUS_UNASSIGNED = {
    "version": 1,
    "updated_at": "2026-07-12T00:00:00Z",
    "talks": {
        TALK_ID: {
            "status": "pending",
            "reviewer": None,
            "issue_number": 42,
            "updated_at": "2026-07-12T00:00:00Z",
        },
    },
}

SYNCED_LABEL_RE = "Synced|Синхронізовано"
FINALIZE_LABEL_RE = "Finalize PR|Фіналізувати PR"


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


# --- doc / body helpers ----------------------------------------------------


def sync_doc(entries, revision=1):
    """A remote sync document as edit_sync.js models it."""
    return {
        "version": 1,
        "revision": revision,
        "updatedAt": "2026-07-13T00:00:00Z",
        "client": "remoteclient",
        "talkId": TALK_ID,
        "entries": entries,
    }


def sync_doc_b64(entries, revision=1):
    """base64 of the JSON document, as the Contents API `content` field."""
    return base64.b64encode(json.dumps(sync_doc(entries, revision)).encode("utf-8")).decode("ascii")


def review_entry(edits, marks=None):
    return {"marks": marks or {}, "edits": edits}


def decode_put_doc(call):
    """Parse the sync document out of a recorded PUT to the state file."""
    return json.loads(base64.b64decode(call["body"]["content"]).decode("utf-8"))


# --- routing ---------------------------------------------------------------


def _record(calls, status, payload):
    def handle(route):
        req = route.request
        calls.append(
            {
                "method": req.method,
                "url": req.url,
                "body": json.loads(req.post_data) if req.post_data else None,
            }
        )
        route.fulfill(status=status, content_type="application/json", body=json.dumps(payload))

    return handle


def _wire(pg, calls, review_status, sync_opts):
    """Register read mocks first, then write mocks (later-registered win).

    sync_opts controls the .review-sync/<talkId>.json contents endpoint:
      get_mode:          "404" (no state yet) or "doc" (return doc_entries)
      doc_entries:       entries returned for get_mode=="doc"
      doc_sha:           sha returned with the doc (default "shaR1")
      put_conflict_once: first PUT -> 409, then a GET returns conflict_entries
      conflict_entries:  the remote doc served after the 409 (CAS merge input)
      conflict_sha:      sha for the conflict doc (default "shaRemote")
    """
    state = {"conflicted": False}

    # 1) generic API + raw + vimeo (read side)
    pg.route(
        "**/api.github.com/**",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            headers={"ETag": '"e2e"'},
            body=json.dumps(MOCK_TREE),
        ),
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
    pg.route(
        "**/player.vimeo.com/api/player.js",
        lambda r: r.fulfill(status=200, content_type="application/javascript", body=MOCK_PLAYER_JS),
    )
    pg.route(
        "**/player.vimeo.com/video/**",
        lambda r: r.fulfill(status=200, content_type="text/html", body="<html></html>"),
    )

    # 2) write endpoints — registered last so they shadow the generic API mock.
    pg.route("**/api.github.com/repos/**/git/ref/heads/main", _record(calls, 200, {"object": {"sha": "base1"}}))
    pg.route("**/api.github.com/repos/**/git/refs", _record(calls, 201, {}))

    def pulls(route):
        req = route.request
        if req.method == "GET":
            # findOpenPrByHead — cosmetic re-attach lookup; report none.
            route.fulfill(status=200, content_type="application/json", body=json.dumps([]))
            return
        calls.append(
            {"method": req.method, "url": req.url, "body": json.loads(req.post_data) if req.post_data else None}
        )
        route.fulfill(
            status=201,
            content_type="application/json",
            body=json.dumps({"number": PR_NUMBER, "html_url": PR_URL, "node_id": PR_NODE_ID, "draft": True}),
        )

    pg.route("**/api.github.com/repos/**/pulls**", pulls)
    pg.route(
        "**/api.github.com/graphql",
        _record(
            calls,
            200,
            {"data": {"markPullRequestReadyForReview": {"pullRequest": {"isDraft": False}}}},
        ),
    )

    def talks_contents(route):
        req = route.request
        if req.method == "GET":
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"sha": "blob1"}))
            return
        calls.append(
            {"method": req.method, "url": req.url, "body": json.loads(req.post_data) if req.post_data else None}
        )
        route.fulfill(status=201, content_type="application/json", body=json.dumps({"content": {"sha": "blobP"}}))

    pg.route("**/api.github.com/repos/**/contents/talks/**", talks_contents)

    def review_sync_contents(route):
        req = route.request
        method = req.method
        if method == "GET":
            serve_doc = state["conflicted"] or sync_opts.get("get_mode") == "doc"
            if serve_doc:
                if state["conflicted"]:
                    entries = sync_opts.get("conflict_entries", {})
                    sha = sync_opts.get("conflict_sha", "shaRemote")
                else:
                    entries = sync_opts.get("doc_entries", {})
                    sha = sync_opts.get("doc_sha", "shaR1")
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps({"content": sync_doc_b64(entries), "sha": sha}),
                )
            else:
                route.fulfill(status=404, content_type="application/json", body=json.dumps({"message": "Not Found"}))
            return
        # PUT / DELETE — record the write.
        calls.append({"method": method, "url": req.url, "body": json.loads(req.post_data) if req.post_data else None})
        if method == "PUT":
            if sync_opts.get("put_conflict_once") and not state["conflicted"]:
                state["conflicted"] = True
                route.fulfill(status=409, content_type="application/json", body=json.dumps({"message": "conflict"}))
                return
            route.fulfill(status=201, content_type="application/json", body=json.dumps({"content": {"sha": "shaP1"}}))
            return
        # DELETE
        route.fulfill(status=200, content_type="application/json", body=json.dumps({}))

    pg.route("**/api.github.com/repos/**/contents/.review-sync/**", review_sync_contents)


def _page(browser, calls, review_status, sync_opts=None, signed_in=True):
    ctx = browser.new_context()
    pg = ctx.new_page()
    _wire(pg, calls, review_status, sync_opts or {})
    pg.add_init_script(
        "localStorage.removeItem('sy_tree_cache__main');localStorage.removeItem('sy_review_status__main');"
    )
    if signed_in:
        pg.add_init_script(
            "localStorage.setItem('sy_gh_token', 'gho_e2e');"
            "localStorage.setItem('sy_gh_user',"
            f" JSON.stringify({{login: '{LOGIN}', avatar_url: 'icon.png'}}));"
        )
    pg.add_init_script(
        "window.__spa_auto_info_confirm = true;"
        "window.__opened = []; window.open = function(u){ window.__opened.push(u); };"
    )
    return ctx, pg


# --- helpers on the running page ------------------------------------------


def _open_review(pg, server):
    pg.goto(f"{server}{SPA_URL}#/review/{TALK_ID}")
    pg.wait_for_function("document.querySelectorAll('.cell.uk .cell-text').length > 0", timeout=10000)


def _wait_chip_synced(pg, timeout=10000):
    pg.wait_for_function(
        "() => {"
        "  const chip = document.getElementById('sync-chip');"
        "  const txt = document.getElementById('sync-chip-text');"
        f"  return chip && chip.style.display !== 'none' && txt && /{SYNCED_LABEL_RE}/.test(txt.textContent);"
        "}",
        timeout=timeout,
    )


def _edit_first_review_cell(pg, appended):
    cell = pg.locator(".cell.uk .cell-text").first
    cell.click()
    cell.press("End")
    cell.type(appended)
    cell.press("Tab")  # blur -> engine.flushSoon() (1.5s coalesce)


def _review_sync_puts(calls):
    return [c for c in calls if c["method"] == "PUT" and "/contents/.review-sync/" in c["url"].split("?")[0]]


def _methods_urls(calls):
    return [(c["method"], c["url"].split("/repos/")[-1].split("?")[0]) for c in calls]


# ---------------------------------------------------------------------------
# 1. First edit bootstraps branch + state file + draft PR.
# ---------------------------------------------------------------------------


def test_first_edit_bootstraps_branch_state_and_draft_pr(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    _open_review(pg, server)

    _edit_first_review_cell(pg, " SYNCED123")
    _wait_chip_synced(pg)

    seq = _methods_urls(calls)
    assert ("POST", "sy-tools/sy-subtitles/git/refs") in seq
    assert ("POST", "sy-tools/sy-subtitles/pulls") in seq

    refs = next(c for c in calls if c["url"].endswith("/git/refs"))
    assert refs["body"]["ref"] == "refs/heads/" + SYNC_BRANCH

    puts = _review_sync_puts(calls)
    assert len(puts) == 1
    put = puts[0]
    assert put["url"].split("?")[0].endswith("/contents/" + STATE_PATH)
    assert put["body"]["branch"] == SYNC_BRANCH
    doc = decode_put_doc(put)
    assert REVIEW_KEY in doc["entries"]
    edits = doc["entries"][REVIEW_KEY]["edits"]
    assert any("SYNCED123" in str(v) for v in edits.values())

    pull = next(c for c in calls if c["method"] == "POST" and c["url"].endswith("/pulls"))
    assert pull["body"]["draft"] is True
    assert pull["body"]["head"] == SYNC_BRANCH
    assert pull["body"]["base"] == "main"

    assert pg.locator("#sync-chip").is_visible()
    import re

    assert re.search(SYNCED_LABEL_RE, pg.locator("#sync-chip-text").text_content())
    ctx.close()


# ---------------------------------------------------------------------------
# 2. Cross-device pull adopts remote edits without pushing.
# ---------------------------------------------------------------------------


def test_cross_device_pull_adopts_remote_edits_without_push(server, browser):
    calls = []
    remote_entries = {REVIEW_KEY: review_entry({"0": "REMOTE TEXT"})}
    ctx, pg = _page(
        browser,
        calls,
        REVIEW_STATUS_UNASSIGNED,
        {"get_mode": "doc", "doc_entries": remote_entries, "doc_sha": "shaR1"},
    )
    _open_review(pg, server)

    # The remote edit lands in the first cell without any local edit.
    pg.wait_for_function(
        "() => { const c = document.querySelector('.cell.uk .cell-text');"
        " return c && c.innerText.includes('REMOTE TEXT'); }",
        timeout=10000,
    )

    # Settle: no debounce is armed (no local edit), so nothing may push.
    pg.wait_for_timeout(2500)
    assert not _review_sync_puts(calls), "clean local state must not push"
    assert not [c for c in calls if c["method"] == "POST" and c["url"].endswith("/pulls")]
    assert not [c for c in calls if c["url"].endswith("/git/refs")]
    ctx.close()


# ---------------------------------------------------------------------------
# 3. CAS 409 -> fetch, three-way merge, retry.
# ---------------------------------------------------------------------------


def test_cas_conflict_merges_and_retries(server, browser):
    calls = []
    # The concurrent writer touched a DIFFERENT index (1); our local edit is 0.
    conflict_entries = {REVIEW_KEY: review_entry({"1": "REMOTE_CAS"})}
    ctx, pg = _page(
        browser,
        calls,
        REVIEW_STATUS_UNASSIGNED,
        {
            "get_mode": "404",
            "put_conflict_once": True,
            "conflict_entries": conflict_entries,
            "conflict_sha": "shaRemote",
        },
    )
    _open_review(pg, server)

    _edit_first_review_cell(pg, " LOCAL_CAS")
    _wait_chip_synced(pg)

    puts = _review_sync_puts(calls)
    assert len(puts) == 2, "409 must be followed by a retry PUT"
    merged = decode_put_doc(puts[1])["entries"][REVIEW_KEY]["edits"]
    assert any("LOCAL_CAS" in str(v) for v in merged.values()), "local edit preserved"
    assert merged.get("1") == "REMOTE_CAS", "remote edit merged in"

    import re

    assert re.search(SYNCED_LABEL_RE, pg.locator("#sync-chip-text").text_content())
    ctx.close()


# ---------------------------------------------------------------------------
# 4. Signed in hides Copy-all; signed out shows it in marker mode.
# ---------------------------------------------------------------------------


def _open_preview_marker(pg, server):
    pg.goto(f"{server}{SPA_URL}#/preview/{TALK_ID}/{VIDEO_SLUG}")
    pg.wait_for_selector("#mock-player", state="visible", timeout=10000)


def test_signed_in_hides_copy_all_signed_out_shows(server, browser):
    ctx1, pg1 = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=True)
    _open_preview_marker(pg1, server)
    assert not pg1.locator("#btn-copy-all").is_visible()
    ctx1.close()

    ctx2, pg2 = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=False)
    _open_preview_marker(pg2, server)
    # Default preview mode is marker: the signed-out Copy-all affordance shows.
    assert pg2.locator("#btn-copy-all").is_visible()
    ctx2.close()


# ---------------------------------------------------------------------------
# 5. Finalize: commit real file, delete state file, mark PR ready.
# ---------------------------------------------------------------------------


def test_finalize_commits_real_file_deletes_state_and_marks_ready(server, browser):
    calls = []
    local_edit = review_entry({"0": "LOCAL EDIT TEXT"})
    entries = {REVIEW_KEY: local_edit}
    ctx, pg = _page(
        browser,
        calls,
        REVIEW_STATUS_UNASSIGNED,
        {"get_mode": "doc", "doc_entries": entries, "doc_sha": "shaR1"},
    )
    # Seed an attached sync PR + a local edit that survive the reload.
    base_meta = {
        "doc": entries,
        "sha": "shaR1",
        "revision": 1,
        "prNumber": PR_NUMBER,
        "prUrl": PR_URL,
        "nodeId": PR_NODE_ID,
        "branch": SYNC_BRANCH,
    }
    pg.add_init_script(
        f"localStorage.setItem({json.dumps(SYNC_BASE_KEY)}, {json.dumps(json.dumps(base_meta))});"
        f"localStorage.setItem({json.dumps(REVIEW_KEY)}, {json.dumps(json.dumps(local_edit))});"
    )
    _open_review(pg, server)

    # The attached PR relabels the Create PR button to Finalize PR.
    pg.wait_for_function(
        "() => { const b = document.getElementById('btn-create-pr');"
        f" return b && b.offsetParent !== null && /{FINALIZE_LABEL_RE}/.test(b.textContent); }}",
        timeout=10000,
    )
    pg.click("#btn-create-pr")
    pg.wait_for_function("window.__opened.length > 0", timeout=10000)

    # Real file committed to the sync branch.
    put = next(
        c
        for c in calls
        if c["method"] == "PUT" and f"/contents/talks/{TALK_ID}/transcript_uk.txt" in c["url"].split("?")[0]
    )
    assert put["body"]["branch"] == SYNC_BRANCH

    # State file removed.
    delete = next(
        c for c in calls if c["method"] == "DELETE" and c["url"].split("?")[0].endswith("/contents/" + STATE_PATH)
    )
    assert delete["body"]["branch"] == SYNC_BRANCH

    # Draft flipped to ready via GraphQL, keyed on the PR node id.
    graphql = next(c for c in calls if c["method"] == "POST" and c["url"].endswith("/graphql"))
    assert graphql["body"]["variables"]["id"] == PR_NODE_ID

    # No second branch and no second PR were created.
    assert not [c for c in calls if c["method"] == "POST" and c["url"].endswith("/git/refs")]
    assert not [c for c in calls if c["method"] == "POST" and c["url"].endswith("/pulls")]
    ctx.close()


# ---------------------------------------------------------------------------
# 6. Synced chip opens the PR url.
# ---------------------------------------------------------------------------


def test_sync_chip_links_to_pr(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    _open_review(pg, server)

    _edit_first_review_cell(pg, " SYNCED123")
    _wait_chip_synced(pg)

    pg.click("#sync-chip-btn")
    pg.wait_for_function("window.__opened.length > 0", timeout=5000)
    assert pg.evaluate("window.__opened[0]") == PR_URL
    ctx.close()
