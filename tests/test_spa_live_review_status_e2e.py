"""E2E for live review statuses: a signed-in session overlays what the Issues
API says onto review-status.json; anyone else, and any failure, keeps the file.
GitHub is mocked with page.route on top of test_spa_auth_actions_e2e's wiring.
"""

import json
import time

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


UNCLAIMED = [_issue(["talk-review"])]
OPERATOR_AT_REVIEW = [_issue(["talk-operator", "op:review"], number=43, title=f"Operator: {TALK}")]


def _serve_current_issue_state(pg, state, seen):
    def handle(route):
        seen.append(route.request.url)
        rows = state["review"] if "labels=talk-review" in route.request.url else state.get("operator", [])
        route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))

    pg.route(ISSUES_BY_LABEL, handle)


def _wait_for_requests(pg, requests, count):
    for _ in range(100):
        if len(requests) >= count:
            break
        pg.wait_for_timeout(50)
    assert len(requests) == count


def _take_the_talk(pg, base_url):
    pg.goto(f"{base_url}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    assert pg.evaluate("refreshLiveReviewStatus()")["ok"], "the load's own live request has settled"
    pg.click(".take-review-btn")
    _wait_in_review(pg, 1)


def _status_entry(pg):
    return pg.evaluate(f"reviewStatus.talks['{TALK}']")


def test_a_taken_talk_stays_in_review_while_github_has_the_assignee_but_not_the_label(server, browser):  # noqa: F811
    seen = []
    state = {"review": UNCLAIMED}
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_current_issue_state(pg, state, seen)
    _take_the_talk(pg, server)

    state["review"] = [_issue(["talk-review"], ["tester"])]
    state["operator"] = OPERATOR_AT_REVIEW
    del seen[:]
    pg.evaluate("SPA.refreshManifest()")

    assert len(seen) == 2, "the refresh asked GitHub again"
    entry = _status_entry(pg)
    assert entry["operator_stage"] == "review", "the live answer was applied"
    assert entry["status"] == "in-progress"
    assert entry["reviewer"] == "tester"
    assert _in_review_count(pg) == "1"
    assert pg.locator(".take-review-btn").count() == 0
    ctx.close()


@pytest.mark.parametrize("assignees", [[], ["someone-else"]], ids=["nobody", "another-reviewer"])
def test_a_taken_talk_goes_back_to_pending_when_github_names_no_or_another_reviewer(server, browser, assignees):  # noqa: F811
    seen = []
    state = {"review": UNCLAIMED}
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_current_issue_state(pg, state, seen)
    _take_the_talk(pg, server)

    state["review"] = [_issue(["talk-review"], assignees)]
    del seen[:]
    pg.evaluate("SPA.refreshManifest()")

    assert len(seen) == 2, "the refresh asked GitHub again"
    entry = _status_entry(pg)
    assert entry["status"] == "pending"
    assert entry["reviewer"] == (assignees[0] if assignees else None)
    assert pg.evaluate("Object.keys(reviewClaims)") == []
    assert _in_review_count(pg) == "0"
    assert pg.locator(".take-review-btn").count() == (0 if assignees else 1)
    ctx.close()


def test_an_answer_to_a_request_sent_before_the_talk_was_taken_does_not_undo_the_claim(server, browser):  # noqa: F811
    held = []
    gate = {"hold": False}
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)

    def answer(route):
        rows = UNCLAIMED if "labels=talk-review" in route.request.url else []
        route.fulfill(status=200, content_type="application/json", body=json.dumps(rows))

    pg.route(ISSUES_BY_LABEL, lambda route: held.append(route) if gate["hold"] else answer(route))
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    assert pg.evaluate("refreshLiveReviewStatus()")["ok"]

    gate["hold"] = True
    pg.evaluate("window.__sentBeforeTheClaim = refreshLiveReviewStatus().then(JSON.stringify); undefined")
    _wait_for_requests(pg, held, 2)

    pg.click(".take-review-btn")
    _wait_in_review(pg, 1)
    for route in held:
        answer(route)
    assert json.loads(pg.evaluate("window.__sentBeforeTheClaim"))["ok"], "the held answer was applied"

    assert _status_entry(pg)["status"] == "in-progress"
    assert _in_review_count(pg) == "1"
    assert pg.locator(".take-review-btn").count() == 0
    ctx.close()


def test_a_manual_refresh_asks_the_issues_api_once(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB)
    pg.goto(f"{server}{SPA_URL}")
    _wait_in_review(pg, 1)
    assert pg.evaluate("refreshLiveReviewStatus()")["ok"]
    pg.evaluate(
        "window.__liveFetches = 0;"
        "var realFetchLiveIssues = fetchLiveIssues;"
        "fetchLiveIssues = function (opts) { window.__liveFetches++; return realFetchLiveIssues(opts); }; undefined"
    )
    pg.evaluate("SPA.refreshManifest()")
    assert pg.evaluate("window.__liveFetches") == 1
    assert _in_review_count(pg) == "1"
    ctx.close()


def test_callers_arriving_while_a_live_request_is_in_flight_share_it(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB)
    pg.goto(f"{server}{SPA_URL}")
    _wait_in_review(pg, 1)
    assert pg.evaluate("refreshLiveReviewStatus()")["ok"]
    del seen[:]
    results = pg.evaluate(
        "Promise.all([refreshLiveReviewStatus(), repaintIndexOnLiveStatus(), refreshLiveReviewStatus()])"
    )
    assert results[0]["ok"] and results[2]["ok"]
    assert len(seen) == 2, "one request per label, not per caller"
    ctx.close()


def test_a_primary_rate_limit_stops_live_requests_until_its_reset(server, browser):  # noqa: F811
    seen = []
    reset_s = int(time.time()) + 600
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    pg.clock.install()

    def rate_limited(route):
        seen.append(route.request.url)
        route.fulfill(
            status=403,
            content_type="application/json",
            headers={
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_s),
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Expose-Headers": "X-RateLimit-Remaining, X-RateLimit-Reset",
            },
            body=json.dumps({"message": "API rate limit exceeded"}),
        )

    pg.route(ISSUES_BY_LABEL, rate_limited)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    pg.wait_for_function("liveStatusBlockedUntil > 0", timeout=10000)
    assert pg.evaluate("liveStatusBlockedUntil") == reset_s * 1000
    _wait_for_requests(pg, seen, 2)
    del seen[:]

    assert pg.evaluate("refreshLiveReviewStatus()") == {"ok": False, "changed": False}
    assert seen == [], "no request while the limit stands"
    assert pg.evaluate("localStorage.getItem('sy_gh_token')") == "gho_e2e"

    pg.clock.fast_forward(601_000)
    pg.evaluate("refreshLiveReviewStatus()")
    assert len(seen) == 2, "asked again once the reset has passed"
    ctx.close()


def test_returning_to_the_index_after_a_manual_refresh_asks_the_issues_api_again(server, browser):  # noqa: F811
    seen = []
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_issues(pg, seen, CLAIMED_ON_GITHUB)
    pg.goto(f"{server}{SPA_URL}")
    _wait_in_review(pg, 1)
    assert pg.evaluate("refreshLiveReviewStatus()")["ok"]

    del seen[:]
    pg.evaluate("SPA.refreshManifest()")
    assert len(seen) == 2, "the refresh itself asked once"

    del seen[:]
    pg.evaluate("showIndex()")
    _wait_for_requests(pg, seen, 2)
    ctx.close()


def _hold_the_claim(pg, posts, held):
    def hold(route):
        posts.append(route.request.url)
        held.append(route)

    pg.route("**/api.github.com/repos/**/issues/42/assignees", hold)


def _repaint_while_the_claim_is_in_flight(pg, base_url, state, posts):
    """Click "take", then let a live answer rebuild the cards under the POST."""
    pg.goto(f"{base_url}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    assert pg.evaluate("refreshLiveReviewStatus()")["ok"], "the load's own live request has settled"
    pg.click(".take-review-btn")
    _wait_for_requests(pg, posts, 1)

    pg.evaluate("document.querySelector('.take-review-btn').dataset.beforeRepaint = '1'")
    state["operator"] = OPERATOR_AT_REVIEW
    pg.evaluate("repaintIndexOnLiveStatus()")
    assert pg.evaluate("document.querySelector('.take-review-btn').dataset.beforeRepaint") is None, (
        "the repaint rebuilt the card"
    )


def test_a_live_repaint_keeps_the_take_button_busy_while_the_claim_is_in_flight(server, browser):  # noqa: F811
    posts, held = [], []
    state = {"review": UNCLAIMED}
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_current_issue_state(pg, state, [])
    _hold_the_claim(pg, posts, held)
    _repaint_while_the_claim_is_in_flight(pg, server, state, posts)

    assert pg.evaluate("document.querySelector('.take-review-btn').disabled") is True
    pg.evaluate("document.querySelector('.take-review-btn').click()")
    pg.evaluate(f"SPA.takeForReview('{TALK}'); undefined")
    pg.wait_for_timeout(300)
    assert len(posts) == 1, "a second click sends no second claim"

    held[0].fulfill(
        status=201, content_type="application/json", body=json.dumps({"number": 42, "assignees": [{"login": "tester"}]})
    )
    _wait_in_review(pg, 1)
    assert pg.locator(".take-review-btn").count() == 0
    assert pg.evaluate("Object.keys(claimsInFlight)") == []
    ctx.close()


def test_a_failed_claim_frees_the_take_button_a_live_repaint_rebuilt(server, browser):  # noqa: F811
    posts, held = [], []
    state = {"review": UNCLAIMED}
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    _serve_current_issue_state(pg, state, [])
    _hold_the_claim(pg, posts, held)
    _repaint_while_the_claim_is_in_flight(pg, server, state, posts)

    held[0].fulfill(status=403, content_type="application/json", body=json.dumps({"message": "nope"}))
    pg.wait_for_function(
        "document.querySelector('.take-review-btn') && !document.querySelector('.take-review-btn').disabled",
        timeout=5000,
    )
    assert pg.evaluate("Object.keys(claimsInFlight)") == []
    ctx.close()


def test_a_repaint_that_throws_is_logged_not_left_as_an_unhandled_rejection(server, browser):  # noqa: F811
    logged = []
    state = {"review": UNCLAIMED}
    ctx, pg = _page(browser, [], REVIEW_STATUS_UNASSIGNED)
    pg.on("console", lambda msg: logged.append(msg.text))
    _serve_current_issue_state(pg, state, [])
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".take-review-btn", timeout=10000)
    assert pg.evaluate("refreshLiveReviewStatus()")["ok"]

    state["operator"] = OPERATOR_AT_REVIEW
    pg.evaluate("renderIndex = function () { throw new Error('boom'); }; undefined")
    assert pg.evaluate("repaintIndexOnLiveStatus().then(function () { return 'settled'; })") == "settled"
    assert any("live status repaint failed" in line for line in logged)
    ctx.close()
