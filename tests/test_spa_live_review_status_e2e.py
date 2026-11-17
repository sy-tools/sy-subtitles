"""E2E for live review statuses: a signed-in session overlays what the Issues
API says onto review-status.json; anyone else, and any failure, keeps the file.
GitHub is mocked with page.route on top of test_spa_auth_actions_e2e's wiring.
"""

import json

import pytest

from tests.test_spa_auth_actions_e2e import REVIEW_STATUS_UNASSIGNED, SPA_URL, _page, server  # noqa: F401

pytestmark = pytest.mark.e2e

TALK = "2001-01-01_Test-Talk"
IN_REVIEW_COUNT = ".stat-card[data-filter='in-review'] .num"
ISSUES_BY_LABEL = "**/api.github.com/repos/**/issues?labels=talk-*"


def _issue(labels, assignees=(), number=42, title=f"Review: {TALK}"):
    return {
        "number": number,
        "title": title,
        "state": "open",
        "labels": [{"name": n} for n in labels],
        "assignees": [{"login": a} for a in assignees],
        "updated_at": "2026-11-18T09:00:00Z",
    }


CLAIMED_ON_GITHUB = [_issue(["talk-review", "review:in-progress"], ["someone"])]


def _serve_issues(pg, seen, review_issues, etag='"live1"', status=200):
    exposed = {"ETag": etag, "Access-Control-Expose-Headers": "ETag, Link", "Access-Control-Allow-Origin": "*"}

    def handle(route):
        req = route.request
        seen.append({"url": req.url, "if_none_match": req.headers.get("if-none-match")})
        if status != 200:
            route.fulfill(status=status, content_type="application/json", body=json.dumps({"message": "nope"}))
            return
        if req.headers.get("if-none-match") == etag:
            route.fulfill(status=304, headers=exposed)
            return
        rows = review_issues if "labels=talk-review" in req.url else []
        route.fulfill(status=200, content_type="application/json", headers=exposed, body=json.dumps(rows))

    pg.route(ISSUES_BY_LABEL, handle)


def _in_review_count(pg):
    return pg.locator(IN_REVIEW_COUNT).text_content().strip()


def _wait_in_review(pg, count):
    pg.wait_for_function(
        f'document.querySelector("{IN_REVIEW_COUNT}")'
        f' && document.querySelector("{IN_REVIEW_COUNT}").textContent.trim() === "{count}"',
        timeout=10000,
    )


def test_signed_in_index_shows_the_status_github_has_not_the_stale_file(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB)
    pg.goto(f"{server}{SPA_URL}")
    _wait_in_review(pg, 1)
    assert pg.locator(".take-review-btn").count() == 0
    labels = sorted(s["url"].split("labels=")[1].split("&")[0] for s in seen)
    assert labels == ["talk-operator", "talk-review"]
    ctx.close()


def test_signed_out_index_reads_only_the_file(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED, signed_in=False)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(IN_REVIEW_COUNT, timeout=10000)
    pg.wait_for_timeout(500)
    assert _in_review_count(pg) == "0"
    assert seen == []
    ctx.close()


def test_a_failing_issues_api_keeps_the_file_statuses_and_the_session(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB, status=500)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    pg.wait_for_timeout(500)
    assert seen, "the live path was tried"
    assert _in_review_count(pg) == "0"
    assert pg.locator(".take-review-btn").count() == 1
    assert pg.evaluate("localStorage.getItem('sy_gh_token')") == "gho_e2e"
    ctx.close()


def test_a_revoked_token_signs_out_and_keeps_the_file_statuses(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB, status=401)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_function("localStorage.getItem('sy_gh_token') === null", timeout=10000)
    assert _in_review_count(pg) == "0"
    ctx.close()


def test_a_reload_revalidates_with_the_etag_and_a_304_still_overlays(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB)
    pg.goto(f"{server}{SPA_URL}")
    _wait_in_review(pg, 1)
    del seen[:]
    pg.reload()
    _wait_in_review(pg, 1)
    assert seen and all(s["if_none_match"] == '"live1"' for s in seen)
    ctx.close()


def test_a_taken_talk_stays_in_review_while_github_has_the_assignee_but_not_the_label(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    assigned_not_yet_labelled = [_issue(["talk-review"], ["tester"])]
    state = {"rows": [_issue(["talk-review"])]}

    def handle(route):
        seen.append(route.request.url)
        rows = state["rows"] if "labels=talk-review" in route.request.url else []
        route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))

    pg.route(ISSUES_BY_LABEL, handle)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    pg.click(".take-review-btn")
    _wait_in_review(pg, 1)
    state["rows"] = assigned_not_yet_labelled
    before = len(seen)
    pg.evaluate("SPA.refreshManifest()")
    pg.wait_for_timeout(1000)
    assert len(seen) > before, "the refresh asked GitHub again"
    assert _in_review_count(pg) == "1"
    ctx.close()
