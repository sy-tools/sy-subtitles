"""E2E for the SPA's edit auto-sync feature (site/js/edit_sync.js wired into
site/index.html).

For a signed-in user on a review/preview view, edits stored in localStorage
auto-sync to a file-scoped state file (.review-sync/<talkId>/<target>.json) on
a deterministic branch (sync/<login>/<talkId>--<target>) behind a draft PR,
where the target names the edited file (transcript-<lang> or <video>-<lang>).
This suite drives the real browser flow with all GitHub endpoints mocked via
page.route:

  1. first edit bootstraps the branch, state file, draft PR AND commits the
     real edited file (v2 pushes the transcript alongside the state file),
  2. cross-device pull adopts remote edits without pushing,
  3. a CAS 409 triggers a fetch + three-way merge + retry,
  4. the signed-in preview hides Copy-all + the issue button, and the removed
     one-button PR control (#btn-preview-pr) is absent (signed out keeps the
     affordances in marker mode),
  5. finalize (from the chip dropdown) deletes the state file and marks the
     draft PR ready via GraphQL — no re-commit, no new branch/PR,
  6. a NEW edit after finalize re-drafts the PR (GraphQL) and re-pushes state,
  7. the sync chip's dropdown opens the PR url,
  8. a preview subtitle edit syncs to the VIDEO-scoped target (its own branch/
     state/PR + final/uk.srt), distinct from the transcript target — v3's
     file-scoped PRs,
  9. an edit the loaded SRT already contains is retired from the device, and
     the edits of a MERGED sync PR are cleared instead of being proposed again
     — unless no file push carried them, or the row is a placeholder nobody has
     typed into yet.

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
from urllib.parse import urlparse

import pytest

from tools.serve_auth_local import SpaHTTPServer

pytestmark = pytest.mark.e2e

SITE = Path(__file__).parent.parent / "site"
SPA_URL = "/index.html"
MOCK_PLAYER_JS = (Path(__file__).parent / "fixtures" / "mock_vimeo_player.js").read_text()

# Session identity: the sync branch is derived from this login + the talk id +
# the file-scoped target. The review view here opens in transcript-default
# mode, so its target is transcript-<rightLang> (rightLang defaults to uk).
LOGIN = "tester"
TALK_ID = "2001-01-01_Test-Talk"
VIDEO_SLUG = "Test-Video"
SYNC_TARGET = "transcript-uk"
SYNC_BRANCH = f"sync/{LOGIN}/{TALK_ID}--{SYNC_TARGET}"
STATE_PATH = f".review-sync/{TALK_ID}/{SYNC_TARGET}.json"
REVIEW_KEY = f"review_{TALK_ID}"
SYNC_BASE_KEY = f"sy_sync_base_{TALK_ID}__{SYNC_TARGET}"

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

# Chip / dropdown labels (English | Ukrainian) — both UI languages accepted.
SYNCED_LABEL_RE = "Synced|Синхронізовано"
READY_LABEL_RE = "In review|На ревʼю"
FINALIZE_LABEL_RE = "Finalize|Фіналізувати"
OPEN_PR_LABEL_RE = "View on GitHub|Переглянути на GitHub"


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

    httpd = SpaHTTPServer(("127.0.0.1", 0), Handler)
    port = httpd.server_address[1]
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{port}"
    httpd.shutdown()
    httpd.server_close()


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
      branch_gone:       the sync branch's head answers 404 (deleted, e.g. by a merge)
      prs_by_head:       every PR ever opened from the sync branch, newest first
      files_at_commit:   {sha: {repo path: text}} — what the Contents API answers for
                         ?ref=<sha>; a path the commit lacks is a 404, and an int in
                         place of the text is the HTTP status of a failed read

    and the markers issue endpoint:
      stale_issue_bodies: a list the test may append to at any time; each single-issue
                          GET consumes one entry and answers with THAT body instead of
                          the issue's current one (a read that lags our own write)
      issue_state:        set by the first _wire and reused by later ones, so that every
                          tab wired with the same sync_opts talks to ONE markers issue
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

    # Repo root: the write-access probe (#753) GETs this on boot. The signed-in
    # test user HAS write access, so report push=true — else ghWriteUser() is null
    # and the sync engines never attach.
    pg.route(
        "**/api.github.com/repos/sy-tools/sy-subtitles",
        lambda r: r.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"permissions": {"push": True, "pull": True}}),
        ),
    )

    # 2) write endpoints — registered last so they shadow the generic API mock.
    pg.route("**/api.github.com/repos/**/git/ref/heads/main", _record(calls, 200, {"object": {"sha": "base1"}}))
    pg.route("**/api.github.com/repos/**/git/refs", _record(calls, 201, {}))

    def sync_branch_head(route):
        if sync_opts.get("branch_gone"):
            route.fulfill(status=404, content_type="application/json", body=json.dumps({"message": "Not Found"}))
        else:
            route.fulfill(status=200, content_type="application/json", body=json.dumps({"object": {"sha": "sync1"}}))

    pg.route("**/api.github.com/repos/**/git/ref/heads/sync/**", sync_branch_head)

    def delete_ref(route):
        # DELETE /git/refs/heads/<branch> — teardown drops the sync branch.
        req = route.request
        calls.append({"method": req.method, "url": req.url, "body": None})
        route.fulfill(status=204, body="")

    pg.route("**/api.github.com/repos/**/git/refs/heads/**", delete_ref)

    def pulls(route):
        req = route.request
        if req.method == "GET":
            # findOpenPrByHead — cosmetic re-attach lookup; report none. With
            # state=all it is listPrsByHead: what became of the sync PR.
            prs = sync_opts.get("prs_by_head", []) if "state=all" in req.url else []
            route.fulfill(status=200, content_type="application/json", body=json.dumps(prs))
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

    def graphql(route):
        # Draft <-> ready are the only GraphQL mutations; dispatch by the query
        # text so a finalize (markPullRequestReadyForReview) and an
        # edit-after-finalize (convertPullRequestToDraft) each get a matching
        # reply. Always record for the assertions.
        req = route.request
        body = json.loads(req.post_data) if req.post_data else None
        query = (body or {}).get("query", "")
        if "object(expression" in query:
            # The index's meta.yaml batch (js/meta_batch.js) is a read, so it
            # stays out of `calls`, which the tests read as the write log.
            blobs = {
                alias: {"text": SAMPLE_META, "isTruncated": False}
                for alias in body["variables"]
                if alias not in ("owner", "name")
            }
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"data": {"repository": blobs}}),
            )
            return
        calls.append({"method": req.method, "url": req.url, "body": body})
        if "convertPullRequestToDraft" in query:
            data = {"convertPullRequestToDraft": {"pullRequest": {"isDraft": True}}}
        else:
            data = {"markPullRequestReadyForReview": {"pullRequest": {"isDraft": False}}}
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"data": data}))

    pg.route("**/api.github.com/graphql", graphql)

    # Issue endpoints for marker-sync (create / list / get / patch) + labels.
    issue_state = sync_opts.setdefault("issue_state", {"issue": None, "next": 900})

    def labels(route):
        route.fulfill(status=201, content_type="application/json", body=json.dumps({}))

    pg.route("**/api.github.com/repos/**/labels", labels)

    def issues(route):
        req = route.request
        method = req.method
        url = req.url
        if method == "GET" and "/issues?" in url:  # list by label
            rows = [issue_state["issue"]] if issue_state["issue"] else []
            route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))
            return
        if method == "GET":  # single issue
            served = issue_state["issue"] or {}
            stale_bodies = sync_opts.get("stale_issue_bodies")
            if stale_bodies:
                served = dict(served, body=stale_bodies.pop(0))
            route.fulfill(status=200, content_type="application/json", body=json.dumps(served))
            return
        body = json.loads(req.post_data) if req.post_data else {}
        calls.append({"method": method, "url": url, "body": body})
        if method == "POST":
            n = issue_state["next"]
            issue_state["next"] += 1
            issue_state["issue"] = {
                "number": n,
                "title": body.get("title"),
                "state": "open",
                "node_id": f"I_{n}",
                "html_url": f"https://github.com/x/issues/{n}",
                "body": body.get("body", ""),
            }
            route.fulfill(status=201, content_type="application/json", body=json.dumps(issue_state["issue"]))
            return
        if issue_state["issue"]:  # PATCH
            if "body" in body:
                issue_state["issue"]["body"] = body["body"]
            if "state" in body:
                issue_state["issue"]["state"] = body["state"]
        route.fulfill(status=200, content_type="application/json", body=json.dumps(issue_state["issue"] or {}))

    pg.route("**/api.github.com/repos/**/issues**", issues)

    def talks_contents(route):
        req = route.request
        if req.method == "GET":
            path, _, ref = req.url.split("/contents/", 1)[1].partition("?ref=")
            at_commit = sync_opts.get("files_at_commit", {}).get(ref)
            if at_commit is None:
                route.fulfill(status=200, content_type="application/json", body=json.dumps({"sha": "blob1"}))
                return
            text = at_commit.get(path, 404)
            if isinstance(text, int):
                route.fulfill(status=text, content_type="application/json", body=json.dumps({"message": "failed"}))
                return
            content = base64.b64encode(text.encode("utf-8")).decode("ascii")
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps({"content": content, "sha": "blobAtCommit"}),
            )
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
    return ctx, _tab(ctx, calls, review_status, sync_opts, signed_in)


def _tab(ctx, calls, review_status, sync_opts=None, signed_in=True):
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
    return pg


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


def _open_chip_dropdown(pg):
    """Click the chip button and wait until its dropdown is open and populated.

    The chip button ALWAYS toggles the dropdown in v2; items are plain <div>s
    appended when it opens.
    """
    pg.click("#sync-chip-btn")
    pg.wait_for_function(
        "() => { const dd = document.getElementById('sync-chip-dropdown');"
        " return dd && dd.classList.contains('open') && dd.children.length > 0; }",
        timeout=5000,
    )


def _click_dropdown_item(pg, label_re):
    """Open the dropdown and click the item whose text matches label_re."""
    import re

    _open_chip_dropdown(pg)
    pg.locator("#sync-chip-dropdown div", has_text=re.compile(label_re)).first.click()


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

    # v2 also commits the real edited file to the sync branch so the draft PR
    # diff is human-readable (a PUT to transcript_uk.txt, not just the state).
    real_put = next(
        c
        for c in calls
        if c["method"] == "PUT" and f"/contents/talks/{TALK_ID}/transcript_uk.txt" in c["url"].split("?")[0]
    )
    assert real_put["body"]["branch"] == SYNC_BRANCH
    committed = base64.b64decode(real_put["body"]["content"]).decode("utf-8")
    assert "SYNCED123" in committed

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
    pg1.evaluate("SPA.setPreviewMode('marker')")  # default is edit since #748
    # Signed in, the auto-sync chip replaces the manual affordances: Copy-all
    # and the issue button are hidden (data-gh-hide), and the removed one-button
    # PR control is not in the DOM at all.
    assert not pg1.locator("#btn-copy-all").is_visible()
    assert not pg1.locator("#btn-preview-issue").is_visible()
    assert pg1.locator("#btn-preview-pr").count() == 0
    ctx1.close()

    ctx2, pg2 = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=False)
    _open_preview_marker(pg2, server)
    pg2.evaluate("SPA.setPreviewMode('marker')")  # opt into marker mode explicitly
    # In marker mode the signed-out Copy-all affordance shows.
    assert pg2.locator("#btn-copy-all").is_visible()
    # #btn-preview-pr never existed — absent regardless of auth state.
    assert pg2.locator("#btn-preview-pr").count() == 0
    ctx2.close()


# ---------------------------------------------------------------------------
# 5. Finalize (from the chip dropdown): delete state file, mark PR ready via
#    GraphQL. No re-commit, no new branch/PR.
# ---------------------------------------------------------------------------


def test_finalize_deletes_state_and_marks_ready(server, browser):
    calls = []
    local_edit = review_entry({"0": "LOCAL EDIT TEXT"})
    entries = {REVIEW_KEY: local_edit}
    ctx, pg = _page(
        browser,
        calls,
        REVIEW_STATUS_UNASSIGNED,
        {"get_mode": "doc", "doc_entries": entries, "doc_sha": "shaR1"},
    )
    # Seed an attached DRAFT sync PR + a matching local edit + matching remote
    # doc, all of which survive the reload. Nothing is dirty on open, so
    # finalize takes the no-flush path (no re-commit).
    base_meta = {
        "doc": entries,
        "sha": "shaR1",
        "revision": 1,
        "prNumber": PR_NUMBER,
        "prUrl": PR_URL,
        "nodeId": PR_NODE_ID,
        "prDraft": True,
        "fileShas": {},
        "branch": SYNC_BRANCH,
    }
    pg.add_init_script(
        f"localStorage.setItem({json.dumps(SYNC_BASE_KEY)}, {json.dumps(json.dumps(base_meta))});"
        f"localStorage.setItem({json.dumps(REVIEW_KEY)}, {json.dumps(json.dumps(local_edit))});"
    )
    _open_review(pg, server)

    # The attached PR surfaces as a synced chip; finalize lives in its dropdown.
    _wait_chip_synced(pg)
    _click_dropdown_item(pg, FINALIZE_LABEL_RE)
    # finalize resolves -> success dialog (auto-confirmed) -> window.open(prUrl).
    pg.wait_for_function("window.__opened.length > 0", timeout=10000)
    assert pg.evaluate("window.__opened[0]") == PR_URL

    # State file removed on the sync branch.
    delete = next(
        c for c in calls if c["method"] == "DELETE" and c["url"].split("?")[0].endswith("/contents/" + STATE_PATH)
    )
    assert delete["body"]["branch"] == SYNC_BRANCH

    # Draft flipped to ready via GraphQL, keyed on the PR node id.
    graphql = next(c for c in calls if c["method"] == "POST" and c["url"].endswith("/graphql"))
    assert "markPullRequestReadyForReview" in graphql["body"]["query"]
    assert graphql["body"]["variables"]["id"] == PR_NODE_ID

    # No re-commit of the real file, no second branch, no second PR.
    assert not [
        c
        for c in calls
        if c["method"] == "PUT" and f"/contents/talks/{TALK_ID}/transcript_uk.txt" in c["url"].split("?")[0]
    ]
    assert not [c for c in calls if c["method"] == "POST" and c["url"].endswith("/git/refs")]
    assert not [c for c in calls if c["method"] == "POST" and c["url"].endswith("/pulls")]

    # Chip now shows the ready ("In review") state.
    import re

    pg.wait_for_function(
        "() => { const txt = document.getElementById('sync-chip-text');"
        f"  return txt && /{READY_LABEL_RE}/.test(txt.textContent); }}",
        timeout=10000,
    )
    assert re.search(READY_LABEL_RE, pg.locator("#sync-chip-text").text_content())
    ctx.close()


# ---------------------------------------------------------------------------
# 6. Edit after finalize re-drafts the PR (GraphQL) and re-pushes state.
# ---------------------------------------------------------------------------


def test_edit_after_finalize_redrafts(server, browser):
    calls = []
    # Seed an attached READY (non-draft) PR with no cached state (sha null) and
    # a clean local store; the remote state file is 404 (finalize removed it).
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    base_meta = {
        "doc": {},
        "sha": None,
        "revision": 1,
        "prNumber": PR_NUMBER,
        "prUrl": PR_URL,
        "nodeId": PR_NODE_ID,
        "prDraft": False,
        "fileShas": {},
        "branch": SYNC_BRANCH,
    }
    pg.add_init_script(f"localStorage.setItem({json.dumps(SYNC_BASE_KEY)}, {json.dumps(json.dumps(base_meta))});")
    _open_review(pg, server)

    # Attach surfaces the ready PR as the 'ready' chip state.
    pg.wait_for_function(
        "() => { const chip = document.getElementById('sync-chip');"
        "  const txt = document.getElementById('sync-chip-text');"
        f"  return chip && chip.style.display !== 'none' && txt && /{READY_LABEL_RE}/.test(txt.textContent); }}",
        timeout=10000,
    )

    # A fresh edit must silently re-draft the PR and re-create the state file.
    _edit_first_review_cell(pg, " AFTER_FINAL")
    _wait_chip_synced(pg)

    graphql = next(c for c in calls if c["method"] == "POST" and c["url"].endswith("/graphql"))
    assert "convertPullRequestToDraft" in graphql["body"]["query"]
    assert graphql["body"]["variables"]["id"] == PR_NODE_ID

    puts = _review_sync_puts(calls)
    assert puts, "the re-drafted PR must get a fresh state-file PUT"
    assert decode_put_doc(puts[-1])["entries"][REVIEW_KEY]["edits"]

    # No new branch/PR — the finalized PR is reused.
    assert not [c for c in calls if c["method"] == "POST" and c["url"].endswith("/git/refs")]
    assert not [c for c in calls if c["method"] == "POST" and c["url"].endswith("/pulls")]
    ctx.close()


# ---------------------------------------------------------------------------
# 7. The sync chip's dropdown opens the PR url.
# ---------------------------------------------------------------------------


def test_sync_chip_dropdown_opens_pr(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    _open_review(pg, server)

    _edit_first_review_cell(pg, " SYNCED123")
    _wait_chip_synced(pg)

    _click_dropdown_item(pg, OPEN_PR_LABEL_RE)
    pg.wait_for_function("window.__opened.length > 0", timeout=5000)
    assert pg.evaluate("window.__opened[0]") == PR_URL
    ctx.close()


# ---------------------------------------------------------------------------
# 8. A PREVIEW subtitle edit syncs to the VIDEO-scoped target (its own branch,
#    state file and PR), distinct from the transcript target — proving v3's
#    file-scoped PRs. The edit lands in the canonical block store and the
#    committed real file is final/uk.srt.
# ---------------------------------------------------------------------------


def _transcript_puts(calls):
    return [
        c
        for c in calls
        if c["method"] == "PUT" and f"/contents/talks/{TALK_ID}/transcript_uk.txt" in c["url"].split("?")[0]
    ]


def test_reverting_the_last_edit_tears_down_the_pr(server, browser):
    """ "No edits = no PR": reverting the last edit closes the sync PR, deletes
    its branch and hides the chip — instead of committing an empty file."""
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    _open_review(pg, server)

    _edit_first_review_cell(pg, " SYNCED123")
    _wait_chip_synced(pg)
    assert _transcript_puts(calls), "the edit must have committed the transcript"

    # Revert the only edit via the real handler (no forced flush): it must sync
    # on the fast 1.5s cadence (syncRevertSoon -> flushSoon) and, being empty,
    # tear the PR down.
    pg.evaluate("SPA.revertEdit(0)")

    def _closed_pull():
        return [
            c
            for c in calls
            if c["method"] == "PATCH" and "/pulls/" in c["url"] and (c["body"] or {}).get("state") == "closed"
        ]

    def _deleted_branch():
        return [c for c in calls if c["method"] == "DELETE" and f"/git/refs/heads/{SYNC_BRANCH}" in c["url"]]

    for _ in range(60):
        if _closed_pull() and _deleted_branch():
            break
        pg.wait_for_timeout(100)

    assert _closed_pull(), "revert-all must close the sync PR"
    assert _deleted_branch(), "revert-all must delete the sync branch"
    assert _closed_pull()[-1]["url"].split("?")[0].endswith(f"/pulls/{PR_NUMBER}")
    pg.wait_for_selector("#sync-chip", state="hidden", timeout=5000)
    ctx.close()


def test_torn_down_edits_stay_gone_when_github_still_serves_the_old_state_file(server, browser):
    calls = []
    sync_opts = {"get_mode": "404"}
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, sync_opts)
    _open_review(pg, server)
    _edit_first_review_cell(pg, " SYNCED123")
    _wait_chip_synced(pg)
    state_file_before_teardown = decode_put_doc(_review_sync_puts(calls)[-1])

    pg.evaluate("SPA.revertEdit(0)")
    for _ in range(60):
        if [c for c in calls if c["method"] == "DELETE" and f"/git/refs/heads/{SYNC_BRANCH}" in c["url"]]:
            break
        pg.wait_for_timeout(100)
    pg.wait_for_selector("#sync-chip", state="hidden", timeout=5000)

    sync_opts.update(get_mode="doc", doc_entries=state_file_before_teardown["entries"], doc_sha="shaP1")

    def _is_state_file_read(response):
        return response.request.method == "GET" and "/contents/.review-sync/" in response.url

    with pg.expect_response(_is_state_file_read, timeout=10000):
        pg.reload()
    pg.wait_for_function("document.querySelectorAll('.cell.uk .cell-text').length > 0", timeout=10000)
    pg.wait_for_timeout(500)

    assert "SYNCED123" not in pg.locator(".cell.uk .cell-text").first.inner_text()
    assert pg.locator("#sync-chip").is_hidden(), "nothing is on GitHub, so nothing may read as synced"
    assert len(_review_sync_puts(calls)) == 1, "the torn-down state must not be pushed back"
    ctx.close()


def test_preview_edit_syncs_to_video_scoped_target(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    pg.goto(f"{server}{SPA_URL}#/preview/{TALK_ID}/{VIDEO_SLUG}")
    pg.wait_for_selector("#mock-player", state="visible", timeout=10000)
    pg.wait_for_function(
        "() => window.previewState && (window.previewState.subtitles || []).length > 0",
        timeout=10000,
    )

    # Enter edit mode, position inside block 1 (1-5s) and add an edit.
    pg.evaluate("SPA.setPreviewMode('edit')")
    pg.evaluate("window._vimeoPlayer._currentTime = 3; window.previewState.currentTime = 3;")
    pg.evaluate("SPA.addEdit()")
    cell = pg.locator(".edit-item .edited").first
    cell.click()
    cell.press("End")
    cell.type(" PREVIEWSYNC")
    cell.press("Tab")  # blur -> flushSoon

    _wait_chip_synced(pg)

    video_target = f"{VIDEO_SLUG}-uk"
    video_branch = f"sync/{LOGIN}/{TALK_ID}--{video_target}"
    video_state = f".review-sync/{TALK_ID}/{video_target}.json"
    canon_key = f"srt_edits_{TALK_ID}_{VIDEO_SLUG}_uk"

    # The state PUT went to the VIDEO target's own path + branch — NOT the
    # transcript target used by the review tests above.
    put = next(c for c in _review_sync_puts(calls) if c["url"].split("?")[0].endswith("/contents/" + video_state))
    assert put["body"]["branch"] == video_branch
    doc = decode_put_doc(put)
    assert canon_key in doc["entries"], "edit stored in the canonical block map"
    assert any("PREVIEWSYNC" in str(v) for v in doc["entries"][canon_key].values())

    # A branch ref was created for the video target specifically.
    refs = next(c for c in calls if c["url"].endswith("/git/refs"))
    assert refs["body"]["ref"] == "refs/heads/" + video_branch

    # The real committed file is the video's final/uk.srt with the edit applied.
    real = next(
        c
        for c in calls
        if c["method"] == "PUT" and f"/contents/talks/{TALK_ID}/{VIDEO_SLUG}/final/uk.srt" in c["url"].split("?")[0]
    )
    assert real["body"]["branch"] == video_branch
    committed = base64.b64decode(real["body"]["content"]).decode("utf-8")
    assert "PREVIEWSYNC" in committed
    ctx.close()


# ---------------------------------------------------------------------------
# 8b. Edits that have landed on main are retired from the device.
# ---------------------------------------------------------------------------

VIDEO_TARGET = f"{VIDEO_SLUG}-uk"
VIDEO_BRANCH = f"sync/{LOGIN}/{TALK_ID}--{VIDEO_TARGET}"
VIDEO_STATE = f".review-sync/{TALK_ID}/{VIDEO_TARGET}.json"
VIDEO_BASE_KEY = f"sy_sync_base_{TALK_ID}__{VIDEO_TARGET}"
CANON_KEY = f"srt_edits_{TALK_ID}_{VIDEO_SLUG}_uk"
HELD_KEY = f"srt_placeholders_{TALK_ID}_{VIDEO_SLUG}_uk"
BLOCK0 = "Перший субтитр"
BLOCK1 = "Другий субтитр"


def _seed_once(pg, items):
    """Seed localStorage on the first load only, so a later write by the app is not undone."""
    pg.add_init_script(
        "if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1');"
        + "".join(f"localStorage.setItem({json.dumps(k)}, {json.dumps(json.dumps(v))});" for k, v in items.items())
        + "}"
    )


def _open_preview_in_edit_mode(pg, server):
    pg.goto(f"{server}{SPA_URL}#/preview/{TALK_ID}/{VIDEO_SLUG}")
    pg.wait_for_selector("#mock-player", state="visible", timeout=10000)
    pg.wait_for_function(
        "() => window.previewState && (window.previewState.subtitles || []).length > 0",
        timeout=10000,
    )
    pg.evaluate("SPA.setPreviewMode('edit')")


def _stored(pg, key):
    raw = pg.evaluate("k => localStorage.getItem(k)", key)
    return json.loads(raw) if raw else None


def _edit_preview_block_at(pg, seconds, appended):
    pg.evaluate(f"window._vimeoPlayer._currentTime = {seconds}; window.previewState.currentTime = {seconds};")
    pg.evaluate("SPA.addEdit()")
    cell = pg.locator(".edit-item .edited").last
    cell.click()
    cell.press("End")
    cell.type(appended)
    cell.press("Tab")


MERGE_SHA = "mergecommit88"
VIDEO_SRT_PATH = f"talks/{TALK_ID}/{VIDEO_SLUG}/final/uk.srt"
TRANSCRIPT_PATH = f"talks/{TALK_ID}/transcript_uk.txt"


def _finalized_base(doc, branch):
    """The sync base of a device whose PR was finalized."""
    return {
        "doc": doc,
        "sha": None,
        "revision": 2,
        "prNumber": PR_NUMBER,
        "prUrl": PR_URL,
        "nodeId": PR_NODE_ID,
        "prDraft": False,
        "fileShas": {},
        "branch": branch,
    }


def _pr_merged_with(files):
    """The sync PR merged and GitHub deleted its branch; `files` is the merge commit."""
    return {
        "get_mode": "404",
        "branch_gone": True,
        "prs_by_head": [
            {
                "number": PR_NUMBER,
                "state": "closed",
                "merged_at": "2026-11-01T10:00:00Z",
                "merge_commit_sha": MERGE_SHA,
                "html_url": PR_URL,
            }
        ],
        "files_at_commit": {MERGE_SHA: files},
    }


def _wait_for_video_state_push(pg, calls, count, timeout=10000):
    waited = 0
    while len(_video_state_docs(calls)) < count and waited < timeout:
        pg.wait_for_timeout(100)
        waited += 100
    assert len(_video_state_docs(calls)) >= count


def _video_state_docs(calls):
    return [
        decode_put_doc(c)
        for c in _review_sync_puts(calls)
        if c["url"].split("?")[0].endswith("/contents/" + VIDEO_STATE)
    ]


def _committed_srts(calls):
    return [
        base64.b64decode(c["body"]["content"]).decode("utf-8")
        for c in calls
        if c["method"] == "PUT" and f"/contents/talks/{TALK_ID}/{VIDEO_SLUG}/final/uk.srt" in c["url"].split("?")[0]
    ]


def test_preview_edit_equal_to_the_loaded_srt_is_retired_and_not_proposed_again(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    _seed_once(pg, {CANON_KEY: {"0": BLOCK0}})
    _open_preview_in_edit_mode(pg, server)

    assert _stored(pg, CANON_KEY) is None, "main already reads this way: the edit has landed"
    assert pg.locator(".edit-item").count() == 0

    _edit_preview_block_at(pg, 7, " NEWEDIT")
    _wait_chip_synced(pg)

    assert _video_state_docs(calls)[-1]["entries"] == {CANON_KEY: {"1": BLOCK1 + " NEWEDIT"}}
    assert len([c for c in calls if c["method"] == "POST" and c["url"].split("?")[0].endswith("/pulls")]) == 1
    ctx.close()


def test_review_srt_edit_equal_to_the_loaded_srt_is_retired(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    _seed_once(pg, {CANON_KEY: {"0": BLOCK0, "1": BLOCK1 + " ПРАВКА"}})
    _open_review(pg, server)
    pg.evaluate(f"SPA.switchReviewMode('srt', '{VIDEO_SLUG}')")
    pg.wait_for_function("document.querySelectorAll('.cell.uk.edited').length > 0", timeout=10000)

    assert _stored(pg, CANON_KEY) == {"1": BLOCK1 + " ПРАВКА"}
    assert pg.locator(".cell.uk.edited").count() == 1
    ctx.close()


def _main_now_reads_as_the_synced_edit(pg, sync_opts, calls, block_text):
    (edit_text,) = _stored(pg, CANON_KEY).values()
    sync_opts.update(get_mode="doc", doc_entries=_video_state_docs(calls)[-1]["entries"], doc_sha="shaP1")
    pg.route(
        "**/raw.githubusercontent.com/**/uk.srt",
        lambda r: r.fulfill(status=200, content_type="text/plain", body=SAMPLE_UK_SRT.replace(block_text, edit_text)),
    )


def _wait_for_an_armed_push(pg):
    pg.wait_for_function("() => window.editSync && window.editSync.getInfo().dirty === true", timeout=5000)


def test_preview_rereading_an_srt_that_now_holds_a_synced_edit_arms_its_withdrawal_from_the_pr(server, browser):
    """No focus or visibility event follows, so nothing else would start the push
    that takes the retired edit off the draft PR."""
    calls = []
    sync_opts = {"get_mode": "404"}
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, sync_opts)
    _open_preview_in_edit_mode(pg, server)
    _edit_preview_block_at(pg, 7, " NEWEDIT")
    _wait_chip_synced(pg)
    _main_now_reads_as_the_synced_edit(pg, sync_opts, calls, BLOCK1)

    assert pg.evaluate("loadSubtitleLang('uk')") is True

    assert _stored(pg, CANON_KEY) is None
    _wait_for_an_armed_push(pg)
    ctx.close()


def test_review_srt_rereading_an_srt_that_now_holds_a_synced_edit_arms_its_withdrawal_from_the_pr(server, browser):
    calls = []
    sync_opts = {"get_mode": "404"}
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, sync_opts)
    _open_review(pg, server)
    pg.evaluate(f"SPA.switchReviewMode('srt', '{VIDEO_SLUG}')")
    pg.wait_for_function("(window.reviewState.ukBlocks || []).length > 0", timeout=10000)
    _edit_first_review_cell(pg, " NEWEDIT")
    _wait_chip_synced(pg)
    _main_now_reads_as_the_synced_edit(pg, sync_opts, calls, BLOCK0)

    pg.evaluate(f"SPA.switchReviewMode('srt', '{VIDEO_SLUG}')")

    pg.wait_for_function("k => localStorage.getItem(k) === null", arg=CANON_KEY, timeout=10000)
    _wait_for_an_armed_push(pg)
    ctx.close()


def test_an_edit_row_just_opened_survives_the_preview_reloading_the_same_srt(server, browser):
    """SPA.addEdit opens a row holding the block's own text. The preview re-reads
    the SRT on a route() re-entry (a manifest refresh) — here by the same loader,
    because the mock player leaves no iframe for a re-entry to reuse."""
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=False)
    _open_preview_in_edit_mode(pg, server)
    pg.evaluate("window._vimeoPlayer._currentTime = 3; window.previewState.currentTime = 3;")
    pg.evaluate("SPA.addEdit()")
    assert _stored(pg, CANON_KEY) == {"0": BLOCK0}

    assert pg.evaluate("loadSubtitleLang('uk')") is True

    assert _stored(pg, CANON_KEY) == {"0": BLOCK0}
    assert pg.locator(".edit-item").count() == 1
    ctx.close()


def test_edits_of_a_merged_pr_are_cleared_and_never_overwrite_what_main_has_now(server, browser):
    """The device finalized its PR; the PR merged (GitHub deleted the branch) and
    another reviewer has since rewritten the same block on main — so the SRT the
    page loads no longer holds the edit, and only the merge commit says it landed."""
    calls = []
    landed_then_rewritten = "Перший, правка з цього пристрою"
    sync_opts = _pr_merged_with({VIDEO_SRT_PATH: SAMPLE_UK_SRT.replace(BLOCK0, landed_then_rewritten)})
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, sync_opts)
    _seed_once(
        pg,
        {
            CANON_KEY: {"0": landed_then_rewritten},
            VIDEO_BASE_KEY: _finalized_base({CANON_KEY: {"0": landed_then_rewritten}}, VIDEO_BRANCH),
        },
    )
    _open_preview_in_edit_mode(pg, server)

    pg.wait_for_function("k => localStorage.getItem(k) === null", arg=CANON_KEY, timeout=10000)
    pg.wait_for_function("document.querySelectorAll('.edit-item').length === 0", timeout=5000)
    assert pg.locator("#sync-chip").is_hidden(), "a merged PR is not one 'in review'"
    assert calls == [], "opening the page writes nothing"

    _edit_preview_block_at(pg, 7, " NEWEDIT")
    _wait_chip_synced(pg)

    assert _video_state_docs(calls)[-1]["entries"] == {CANON_KEY: {"1": BLOCK1 + " NEWEDIT"}}
    committed = _committed_srts(calls)[-1]
    assert BLOCK0 in committed and landed_then_rewritten not in committed
    assert not [c for c in calls if "convertPullRequestToDraft" in json.dumps(c["body"] or {})]
    ctx.close()


def test_an_edit_holding_invisible_characters_is_cleared_once_its_cleaned_text_has_merged(server, browser):
    """The push strips \u00a0 and zero-width characters from the file it commits,
    so the merge commit holds the cleaned text while the device still stores
    the edit as it was typed."""
    calls = []
    as_stored = "Перший,\u00a0правка з цього\u200b пристрою"
    as_merged = "Перший, правка з цього пристрою"
    sync_opts = _pr_merged_with({VIDEO_SRT_PATH: SAMPLE_UK_SRT.replace(BLOCK0, as_merged)})
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, sync_opts)
    _seed_once(
        pg,
        {
            CANON_KEY: {"0": as_stored},
            VIDEO_BASE_KEY: _finalized_base({CANON_KEY: {"0": as_stored}}, VIDEO_BRANCH),
        },
    )
    _open_preview_in_edit_mode(pg, server)

    pg.wait_for_function("k => localStorage.getItem(k) === null", arg=CANON_KEY, timeout=10000)
    assert calls == [], "opening the page writes nothing"
    ctx.close()


def _assert_the_edit_is_kept_and_shown_as_not_synced(pg, calls, edit_text):
    assert _stored(pg, CANON_KEY) == {"0": edit_text}
    assert pg.locator(".edit-item").count() == 1
    assert pg.locator("#sync-chip").is_visible(), "an edit on no branch is shown as not synced"
    assert calls == [], "opening the page writes nothing"


def test_edits_of_a_merged_pr_stay_when_the_merged_file_does_not_hold_them(server, browser):
    """The base says the edit was synced, and it was — as a state file. The SRT
    that merged reads as before, so the merge took nothing of this edit."""
    calls = []
    never_committed = "Перший, правка без файлу"
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, _pr_merged_with({VIDEO_SRT_PATH: SAMPLE_UK_SRT}))
    _seed_once(
        pg,
        {
            CANON_KEY: {"0": never_committed},
            VIDEO_BASE_KEY: _finalized_base({CANON_KEY: {"0": never_committed}}, VIDEO_BRANCH),
        },
    )
    _open_preview_in_edit_mode(pg, server)

    pg.wait_for_function(
        "k => JSON.parse(localStorage.getItem(k)).orphaned === true", arg=VIDEO_BASE_KEY, timeout=10000
    )
    _assert_the_edit_is_kept_and_shown_as_not_synced(pg, calls, never_committed)
    ctx.close()


def test_edits_of_a_merged_pr_stay_while_the_merged_file_cannot_be_read(server, browser):
    calls = []
    landed = "Перший, правка з цього пристрою"
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, _pr_merged_with({VIDEO_SRT_PATH: 502}))
    _seed_once(
        pg,
        {
            CANON_KEY: {"0": landed},
            VIDEO_BASE_KEY: _finalized_base({CANON_KEY: {"0": landed}}, VIDEO_BRANCH),
        },
    )
    _open_preview_in_edit_mode(pg, server)

    pg.wait_for_function("() => window.editSync && window.editSync.getInfo().status === 'pending'", timeout=10000)
    _assert_the_edit_is_kept_and_shown_as_not_synced(pg, calls, landed)
    assert _stored(pg, VIDEO_BASE_KEY)["prNumber"] == PR_NUMBER, "the next pull can still find the merge"
    ctx.close()


def test_transcript_edits_of_a_merged_pr_are_cleared_paragraph_by_paragraph(server, browser):
    calls = []
    landed, not_landed = "Перший абзац, правка.", "Другий абзац, правка без файлу."
    merged_transcript = SAMPLE_UK.replace(PARA0, landed)
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, _pr_merged_with({TRANSCRIPT_PATH: merged_transcript}))
    entry = review_entry({"0": landed, "1": not_landed})
    _seed_once(pg, {REVIEW_KEY: entry, SYNC_BASE_KEY: _finalized_base({REVIEW_KEY: entry}, SYNC_BRANCH)})
    _open_review(pg, server)

    pg.wait_for_function(
        "k => Object.keys(JSON.parse(localStorage.getItem(k)).edits).length === 1", arg=REVIEW_KEY, timeout=10000
    )
    assert _stored(pg, REVIEW_KEY)["edits"] == {"1": not_landed}
    assert calls == [], "opening the page writes nothing"
    ctx.close()


# ---------------------------------------------------------------------------
# 8c. A placeholder — an edit row opened and not typed into yet — is not a
#     landed edit, on this device or on any other.
# ---------------------------------------------------------------------------


def _capture_in_fullscreen_at(pg, seconds):
    pg.evaluate(f"window._vimeoPlayer._currentTime = {seconds}; window.previewState.currentTime = {seconds};")
    pg.evaluate(
        "(() => { const view = document.getElementById('view-preview');"
        " view.classList.add('fs-mode'); SPA.addMarkOrEdit(); view.classList.remove('fs-mode'); })()"
    )
    pg.evaluate("editSync && editSync.flushSoon()")  # no field loses focus here to cut the 15 s debounce short


def _reload_preview_in_edit_mode(pg):
    pg.reload()
    pg.wait_for_function(
        "() => window.previewState && (window.previewState.subtitles || []).length > 0",
        timeout=10000,
    )
    pg.evaluate("SPA.setPreviewMode('edit')")


def test_a_row_captured_in_fullscreen_survives_a_reload_until_it_is_typed_into(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"})
    _open_preview_in_edit_mode(pg, server)
    _capture_in_fullscreen_at(pg, 3)
    _wait_chip_synced(pg)
    captured = {CANON_KEY: {"0": BLOCK0}, HELD_KEY: {"0": BLOCK0}}
    assert _video_state_docs(calls)[-1]["entries"] == captured, "the marker travels with the edit"
    pushes = len(_video_state_docs(calls))

    _reload_preview_in_edit_mode(pg)

    assert _stored(pg, CANON_KEY) == {"0": BLOCK0}
    assert pg.locator(".edit-item").count() == 1
    pg.wait_for_timeout(2500)
    assert len(_video_state_docs(calls)) == pushes, "nothing was retired, so nothing is pushed"

    _edit_preview_block_at(pg, 3, " ДОПИСАНО")
    pg.wait_for_function("k => localStorage.getItem(k) === null", arg=HELD_KEY, timeout=5000)
    _wait_for_video_state_push(pg, calls, pushes + 1)
    assert _video_state_docs(calls)[-1]["entries"] == {CANON_KEY: {"0": BLOCK0 + " ДОПИСАНО"}}
    ctx.close()


def test_a_placeholder_row_is_not_retired_by_the_review_srt_view(server, browser):
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=False)
    _seed_once(pg, {CANON_KEY: {"0": BLOCK0, "1": BLOCK1}, HELD_KEY: {"0": BLOCK0}})
    _open_review(pg, server)
    pg.evaluate(f"SPA.switchReviewMode('srt', '{VIDEO_SLUG}')")
    pg.wait_for_function("document.querySelectorAll('.cell.uk.edited').length === 1", timeout=10000)

    assert _stored(pg, CANON_KEY) == {"0": BLOCK0}, "block 1 has landed, block 0 is waiting to be typed into"
    assert _stored(pg, HELD_KEY) == {"0": BLOCK0}
    ctx.close()


def test_a_row_captured_on_another_device_is_not_swept_from_this_one(server, browser):
    calls = []
    captured_elsewhere = {CANON_KEY: {"0": BLOCK0}, HELD_KEY: {"0": BLOCK0}}
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "doc", "doc_entries": captured_elsewhere})
    _open_preview_in_edit_mode(pg, server)
    pg.wait_for_function("document.querySelectorAll('.edit-item').length === 1", timeout=10000)

    assert pg.evaluate("loadSubtitleLang('uk')") is True

    assert _stored(pg, CANON_KEY) == {"0": BLOCK0}
    assert _stored(pg, HELD_KEY) == {"0": BLOCK0}
    assert pg.locator(".edit-item").count() == 1
    pg.wait_for_timeout(2500)
    assert not _review_sync_puts(calls), "the capture must not be taken off the other device's PR"
    ctx.close()


# ---------------------------------------------------------------------------
# 8d. Where the retiring is wired, and where it must hold back.
# ---------------------------------------------------------------------------

HI_CANON_KEY = f"srt_edits_{TALK_ID}_{VIDEO_SLUG}_hi"
SAMPLE_HI_SRT = SAMPLE_UK_SRT.replace("Перший субтитр", "पहला उपशीर्षक").replace("Другий субтитр", "दूसरा उपशीर्षक")
LEGACY_REVIEW_SRT_KEY = f"review_srt_{TALK_ID}_{VIDEO_SLUG}_en_uk"
LEGACY_PREVIEW_KEY = f"preview_{TALK_ID}_{VIDEO_SLUG}"


def _refuse_canonical_store_writes(pg):
    """What a full localStorage does to the edit-store migration: it fails, and the session stays on the legacy store."""
    pg.add_init_script(
        "(() => { const real = Storage.prototype.setItem;"
        " Storage.prototype.setItem = function (k, v) {"
        "   if (String(k).indexOf('srt_edits_') === 0) throw new Error('QuotaExceededError');"
        "   return real.call(this, k, v); }; })();"
    )


def test_switching_the_review_srt_language_retires_the_landed_edits_of_that_language(server, browser):
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=False)
    pg.route(
        "**/raw.githubusercontent.com/**/final/hi.srt",
        lambda r: r.fulfill(status=200, content_type="text/plain", body=SAMPLE_HI_SRT),
    )
    _seed_once(pg, {HI_CANON_KEY: {"0": "पहला उपशीर्षक", "1": "दूसरा, संपादित"}})
    _open_review(pg, server)
    pg.evaluate(f"SPA.switchReviewMode('srt', '{VIDEO_SLUG}')")
    pg.wait_for_function("(window.reviewState.ukBlocks || []).length > 0", timeout=10000)
    assert _stored(pg, HI_CANON_KEY) == {"0": "पहला उपशीर्षक", "1": "दूसरा, संपादित"}, "uk is open, hi is untouched"

    pg.evaluate("SPA.switchSrtLang('right', 'hi')")

    pg.wait_for_function("document.querySelectorAll('.cell.uk.edited').length === 1", timeout=10000)
    assert _stored(pg, HI_CANON_KEY) == {"1": "दूसरा, संपादित"}
    ctx.close()


def test_review_srt_on_the_legacy_store_retires_nothing(server, browser):
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=False)
    _seed_once(
        pg,
        {
            CANON_KEY: {"1": BLOCK1},
            LEGACY_REVIEW_SRT_KEY: {"marks": {}, "edits": {"0": "Перший, рядкова правка"}},
        },
    )
    _refuse_canonical_store_writes(pg)
    _open_review(pg, server)
    pg.evaluate(f"SPA.switchReviewMode('srt', '{VIDEO_SLUG}')")
    pg.wait_for_function("document.querySelectorAll('.cell.uk.edited').length === 1", timeout=10000)

    assert pg.evaluate("window.reviewState._legacyEdits") is True
    assert _stored(pg, CANON_KEY) == {"1": BLOCK1}
    assert _stored(pg, LEGACY_REVIEW_SRT_KEY)["edits"] == {"0": "Перший, рядкова правка"}
    ctx.close()


def test_preview_on_the_legacy_store_retires_nothing(server, browser):
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=False)
    _seed_once(pg, {LEGACY_PREVIEW_KEY: {"mode": "edit", "markers": [], "edits": {"uk": {"0": BLOCK0}}}})
    _refuse_canonical_store_writes(pg)
    _open_preview_in_edit_mode(pg, server)

    assert pg.evaluate("window.previewState._legacyEdits") is True
    assert _stored(pg, LEGACY_PREVIEW_KEY)["edits"] == {"uk": {"0": BLOCK0}}
    assert pg.locator(".edit-item").count() == 1
    ctx.close()


# ---------------------------------------------------------------------------
# 9. Signed-in preview markers auto-sync to a GitHub issue (create + teardown).
# ---------------------------------------------------------------------------


def test_signed_in_marker_creates_issue_then_closes_when_emptied(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=True)
    _open_preview_marker(pg, server)
    pg.evaluate("SPA.setPreviewMode('marker')")  # default is edit since #748
    pg.wait_for_function("() => window.markerSync", timeout=10000)

    # Add a marker -> creates the markers issue on the fast cadence.
    pg.evaluate("window.previewState.currentTime = 3; window.previewState.lastText = 'Sub one';")
    pg.evaluate("SPA.addMarker()")

    def _created():
        return [c for c in calls if c["method"] == "POST" and c["url"].split("?")[0].endswith("/issues")]

    for _ in range(60):
        if _created():
            break
        pg.wait_for_timeout(100)
    created = _created()
    assert created, "adding a marker must create the markers issue"
    body = created[-1]["body"]
    assert body["title"] == f"Markers: {TALK_ID} / {VIDEO_SLUG}"
    assert body["labels"] == ["markers"]
    assert "<!-- sy-markers:" in body["body"], "issue body must carry the structured block"
    pg.wait_for_selector("#marker-chip", state="visible", timeout=5000)
    number = pg.evaluate("window.markerSync.getInfo().issueNumber")

    # Remove the only marker -> teardown closes the same issue.
    pg.evaluate("SPA.removeMarker(0)")

    def _closed():
        return [
            c
            for c in calls
            if c["method"] == "PATCH"
            and c["url"].split("?")[0].endswith(f"/issues/{number}")
            and (c["body"] or {}).get("state") == "closed"
        ]

    for _ in range(60):
        if _closed():
            break
        pg.wait_for_timeout(100)
    assert _closed(), "emptying the markers must close the issue"
    pg.wait_for_selector("#marker-chip", state="hidden", timeout=5000)
    ctx.close()


def test_deleted_markers_stay_deleted_when_github_answers_with_an_old_body(server, browser):
    calls = []
    stale_issue_bodies = []
    ctx, pg = _page(
        browser,
        calls,
        REVIEW_STATUS_UNASSIGNED,
        {"get_mode": "404", "stale_issue_bodies": stale_issue_bodies},
        signed_in=True,
    )
    _open_preview_marker(pg, server)
    pg.evaluate("SPA.setPreviewMode('marker')")
    pg.wait_for_function("() => window.markerSync", timeout=10000)

    def _sync():
        pg.evaluate("window.markerSync.flush({ force: true })")

    def _issue_writes():
        return [c for c in calls if "/issues" in c["url"] and c["method"] in ("POST", "PATCH")]

    def _written_marker_texts():
        return pg.evaluate("(body) => parseMarkersBlock(body).map((m) => m.text)", _issue_writes()[-1]["body"]["body"])

    for seconds, text in ((3, "Sub one"), (6, "Sub two"), (9, "Sub three")):
        # One evaluate: the preview's own tick rewrites lastText between two.
        pg.evaluate(
            """([time, text]) => {
                window.previewState.currentTime = time;
                window.previewState.lastText = text;
                SPA.addMarker();
            }""",
            [seconds, text],
        )
    _sync()
    assert _written_marker_texts() == ["Sub one", "Sub two", "Sub three"]
    body_with_all_three = _issue_writes()[-1]["body"]["body"]

    pg.evaluate("SPA.removeMarker(0)")
    _sync()
    assert _written_marker_texts() == ["Sub two", "Sub three"]

    stale_issue_bodies.append(body_with_all_three)
    pg.evaluate("SPA.removeMarker(0)")
    _sync()

    assert not stale_issue_bodies, "the flush must have consumed the lagging read"
    assert pg.evaluate("window.previewState.markers.map((m) => m.text)") == ["Sub three"]
    assert pg.locator(".marker-item").count() == 1
    assert _written_marker_texts() == ["Sub three"]
    ctx.close()


def test_marker_deleted_in_one_tab_leaves_the_other_tab_and_is_not_written_back(server, browser):
    calls = []
    sync_opts = {"get_mode": "404"}
    ctx, first_tab = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, sync_opts, signed_in=True)

    def _open_marker_mode(pg):
        _open_preview_marker(pg, server)
        pg.evaluate("SPA.setPreviewMode('marker')")
        pg.wait_for_function("() => window.markerSync", timeout=10000)

    def _sync(pg):
        pg.evaluate("window.markerSync.flush({ force: true })")

    def _marker_texts(pg):
        return pg.evaluate("window.previewState.markers.map((m) => m.text)")

    def _last_written_marker_texts():
        writes = [c for c in calls if "/issues" in c["url"] and c["method"] in ("POST", "PATCH")]
        return first_tab.evaluate("(body) => parseMarkersBlock(body).map((m) => m.text)", writes[-1]["body"]["body"])

    _open_marker_mode(first_tab)
    for seconds, text in ((3, "Sub one"), (6, "Sub two"), (9, "Sub three")):
        first_tab.evaluate(
            """([time, text]) => {
                window.previewState.currentTime = time;
                window.previewState.lastText = text;
                SPA.addMarker();
            }""",
            [seconds, text],
        )
    _sync(first_tab)

    second_tab = _tab(ctx, calls, REVIEW_STATUS_UNASSIGNED, sync_opts, signed_in=True)
    _open_marker_mode(second_tab)
    second_tab.wait_for_function("() => window.markerSync.getInfo().status === 'synced'", timeout=10000)
    assert _marker_texts(second_tab) == ["Sub one", "Sub two", "Sub three"]

    first_tab.evaluate("SPA.removeMarker(0)")
    _sync(first_tab)
    assert _last_written_marker_texts() == ["Sub two", "Sub three"]

    second_tab.wait_for_function("() => window.previewState.markers.length === 2", timeout=5000)
    assert _marker_texts(second_tab) == ["Sub two", "Sub three"]
    assert second_tab.locator(".marker-item").count() == 2
    _sync(second_tab)
    assert _last_written_marker_texts() == ["Sub two", "Sub three"]
    ctx.close()


def test_two_tabs_stop_exchanging_storage_events(server, browser):
    """Two tabs of one talk must not answer each other's `storage` events for ever.

    Each tab keeps its own base of merged markers, so the tabs differ as soon as one
    of them syncs something the other has not pulled. A `storage` listener that
    answers such an event with a write of its own turns that difference into a loop
    of thousands of events a second. Whatever the tabs hold, the events have to stop.
    """
    calls = []
    sync_opts = {"get_mode": "404"}
    count_marker_storage_events = """
        window.__markerStorageEvents = 0;
        window.addEventListener('storage', function (e) {
            if (e.key && e.key.indexOf('sy_marker_') === 0) window.__markerStorageEvents += 1;
        });
    """
    ctx, first_tab = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, sync_opts, signed_in=True)
    first_tab.add_init_script(count_marker_storage_events)

    def _open_marker_mode(pg):
        _open_preview_marker(pg, server)
        pg.evaluate("SPA.setPreviewMode('marker')")
        pg.wait_for_function("() => window.markerSync", timeout=10000)

    def _add(pg, seconds, text):
        pg.evaluate(
            """([time, text]) => {
                window.previewState.currentTime = time;
                window.previewState.lastText = text;
                SPA.addMarker();
            }""",
            [seconds, text],
        )

    def _sync(pg):
        pg.evaluate("window.markerSync.flush({ force: true })")
        pg.wait_for_function("() => window.markerSync.getInfo().status === 'synced'", timeout=10000)

    def _events():
        return [pg.evaluate("window.__markerStorageEvents") for pg in (first_tab, second_tab)]

    def _assert_quiet(after):
        # A loop runs at thousands of events a second; half a second tells them apart.
        first_tab.wait_for_timeout(300)
        seen = _events()
        first_tab.wait_for_timeout(500)
        assert _events() == seen, f"the tabs are still exchanging storage events {after}"
        assert sum(seen) < 40, f"{seen} storage events {after}: far more than the handful an action costs"

    _open_marker_mode(first_tab)
    _add(first_tab, 3, "Sub one")
    _add(first_tab, 6, "Sub two")
    _sync(first_tab)

    second_tab = _tab(ctx, calls, REVIEW_STATUS_UNASSIGNED, sync_opts, signed_in=True)
    second_tab.add_init_script(count_marker_storage_events)
    _open_marker_mode(second_tab)
    second_tab.wait_for_function("() => window.markerSync.getInfo().status === 'synced'", timeout=10000)
    _assert_quiet("after the second tab opened")

    # The first tab syncs a marker the second has not pulled: their bases differ now.
    _add(first_tab, 9, "Sub three")
    _sync(first_tab)
    _assert_quiet("after one tab synced a marker the other has not pulled")

    # The same marker with a different comment in each tab: a conflict neither gives up.
    first_tab.evaluate("window.previewState.markers[0].comment = 'from the first tab'; markerNotify();")
    second_tab.evaluate("window.previewState.markers[0].comment = 'from the second tab'; markerNotify();")
    _sync(first_tab)
    _sync(second_tab)
    _assert_quiet("after a comment conflict")

    first_tab.evaluate("SPA.removeMarker(1)")
    second_tab.wait_for_function("() => window.previewState.markers.every((m) => m.text !== 'Sub two')", timeout=5000)
    _assert_quiet("after a deletion")
    _sync(first_tab)
    _sync(second_tab)
    _assert_quiet("after both tabs synced the deletion")
    ctx.close()


def test_marker_comment_keeps_focus_through_the_sync_round_trip(server, browser):
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=True)
    _open_preview_marker(pg, server)
    pg.evaluate("SPA.setPreviewMode('marker')")
    pg.wait_for_function("() => window.markerSync", timeout=10000)
    pg.evaluate("window.previewState.currentTime = 3; window.previewState.lastText = 'Sub one';")
    pg.evaluate("SPA.addMarker()")
    pg.keyboard.type("before sync")
    pg.wait_for_function("() => window.markerSync.getInfo().status === 'synced'", timeout=10000)
    pg.evaluate("window.markerSync.flush({ force: true })")
    pg.wait_for_function("() => window.markerSync.getInfo().status === 'synced'", timeout=10000)
    pg.keyboard.type(", after")

    comment = pg.locator(".marker-item .comment").first
    assert pg.evaluate("document.activeElement.className") == "comment"
    assert comment.input_value() == "before sync, after"
    ctx.close()


# ---------------------------------------------------------------------------
# 10. Preview chip hygiene: one chip per mode, and marker actions never touch
#     the edit engine (regressions the user reported live).
# ---------------------------------------------------------------------------


def test_marker_action_does_not_dirty_the_edit_engine(server, browser):
    # Bug 2: savePreviewState no longer nudges editSync, so a marker add must not
    # mark the edit engine dirty (which would flash a spurious edit chip / draft
    # an edit PR with no edits).
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=True)
    _open_preview_marker(pg, server)
    pg.evaluate("SPA.setPreviewMode('marker')")
    pg.wait_for_function("() => window.markerSync", timeout=10000)
    # editSync attaches for the preview SRT target regardless of mode.
    pg.wait_for_function("() => window.editSync", timeout=10000)

    pg.evaluate("window.previewState.currentTime = 3; window.previewState.lastText = 'Sub one';")
    pg.evaluate("SPA.addMarker()")
    pg.wait_for_timeout(300)

    assert pg.evaluate("() => window.editSync.getInfo().dirty") is False, (
        "a marker action must not dirty the edit engine (Bug 2)"
    )
    assert not pg.locator("#sync-chip").is_visible(), "the edit chip must not appear for a marker action"
    ctx.close()


def test_edit_chip_is_hidden_in_marker_mode(server, browser):
    # Bug 1: the edit sync chip and the marker chip must not stack. In marker mode
    # the edit chip is suppressed even with pending edits; it returns in edit mode.
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=True)
    pg.goto(f"{server}{SPA_URL}#/preview/{TALK_ID}/{VIDEO_SLUG}")
    pg.wait_for_selector("#mock-player", state="visible", timeout=10000)
    pg.wait_for_function(
        "() => window.previewState && (window.previewState.subtitles || []).length > 0",
        timeout=10000,
    )

    # Make a real edit so the edit engine has a live chip.
    pg.evaluate("SPA.setPreviewMode('edit')")
    pg.evaluate("window._vimeoPlayer._currentTime = 3; window.previewState.currentTime = 3;")
    pg.evaluate("SPA.addEdit()")
    cell = pg.locator(".edit-item .edited").first
    cell.click()
    cell.press("End")
    cell.type(" X")
    cell.press("Tab")  # blur -> flushSoon
    pg.wait_for_selector("#sync-chip", state="visible", timeout=5000)

    # Switch to marker mode -> the edit chip hides (one chip per mode).
    pg.evaluate("SPA.setPreviewMode('marker')")
    pg.wait_for_selector("#sync-chip", state="hidden", timeout=5000)

    # Back to edit mode -> the edit chip returns.
    pg.evaluate("SPA.setPreviewMode('edit')")
    pg.wait_for_selector("#sync-chip", state="visible", timeout=5000)
    ctx.close()


def test_cloud_chip_dom_contract(server, browser):
    # The status chip is one elegant cloud with three tones: blue progress
    # (pending folds in), green ok (ready folds in), red error. The state word
    # stays in the DOM as an sr-only accessible name (present but not shown).
    calls = []
    ctx, pg = _page(browser, calls, REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=True)
    pg.goto(f"{server}{SPA_URL}#/review/{TALK_ID}")
    pg.wait_for_function("() => typeof paintSyncChip === 'function'", timeout=10000)

    # Drive each status synchronously so an async engine re-render can't race us.
    result = pg.evaluate(
        """() => {
          const icon = document.getElementById('sync-chip-icon');
          const chip = document.getElementById('sync-chip');
          const txt = document.getElementById('sync-chip-text');
          const snap = (status) => {
            paintSyncChip('sync', status);
            return {
              cls: icon.className,
              svg: !!icon.querySelector('svg'),
              display: chip.style.display,
              label: txt.textContent,
              textW: txt.getBoundingClientRect().width,
            };
          };
          return { syncing: snap('syncing'), pending: snap('pending'),
                   synced: snap('synced'), ready: snap('ready'),
                   error: snap('error'), idle: snap('idle') };
        }"""
    )
    # The tone lives on the reusable .sync-cloud component (icon), not the button,
    # so styleguide.html can render the same component. pending folds into the
    # progress tone (no waiting glyph); ready folds into ok.
    for st in ("syncing", "pending"):
        assert "sync-cloud--progress" in result[st]["cls"], st
        assert result[st]["display"] != "none", st
    for st in ("synced", "ready"):
        assert "sync-cloud--ok" in result[st]["cls"], st
    assert "sync-cloud--error" in result["error"]["cls"]
    # A cloud svg is always painted for a visible tone.
    assert result["synced"]["svg"] is True
    # The label is present (accessible name) but visually hidden (sr-only).
    assert result["synced"]["label"]
    assert result["synced"]["textW"] < 2
    # idle hides the whole chip.
    assert result["idle"]["display"] == "none"
    ctx.close()


# ---------------------------------------------------------------------------
# Index meta.yaml hydration: one GraphQL batch signed in, raw fetches otherwise.
# ---------------------------------------------------------------------------


def _open_index_recording_meta_reads(browser, server, signed_in):
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED, {"get_mode": "404"}, signed_in=signed_in)
    reads = {"graphql": [], "raw": []}

    def on_request(req):
        if req.url.endswith("/graphql") and "object(expression" in (req.post_data or ""):
            reads["graphql"].append(req)
        elif urlparse(req.url).hostname == "raw.githubusercontent.com" and urlparse(req.url).path.endswith(
            "/meta.yaml"
        ):
            reads["raw"].append(req)

    pg.on("request", on_request)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_function(
        "document.body.innerText.indexOf('Test Talk: Subtitle Preview') !== -1",
        timeout=10000,
    )
    return ctx, reads


def test_signed_in_index_reads_meta_in_one_graphql_batch(server, browser):
    ctx, reads = _open_index_recording_meta_reads(browser, server, signed_in=True)
    assert len(reads["graphql"]) == 1
    batch = json.loads(reads["graphql"][0].post_data)
    assert batch["variables"]["m0"].endswith(f":talks/{TALK_ID}/meta.yaml")
    assert reads["graphql"][0].headers["authorization"] == "Bearer gho_e2e"
    assert reads["raw"] == []
    ctx.close()


def test_signed_out_index_reads_meta_over_raw_without_credentials(server, browser):
    ctx, reads = _open_index_recording_meta_reads(browser, server, signed_in=False)
    assert reads["graphql"] == []
    assert len(reads["raw"]) == 1
    assert "authorization" not in reads["raw"][0].headers
    ctx.close()
