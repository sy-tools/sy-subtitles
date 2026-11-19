"""E2E for operator mode: who sees it, the stage chips, and the card actions
(QA passed, package files, Open e-mail, Sent — close). GitHub is mocked with
page.route on top of the signed-in wiring of test_spa_auth_actions_e2e."""

import base64
import json

import pytest

from tests.test_spa_auth_actions_e2e import MOCK_TREE, SPA_URL, _wire, server  # noqa: F401

pytestmark = pytest.mark.e2e

OPERATOR_ID = 11644864
QA_TALK = "2001-01-01_Test-Talk"
READY_TALK = "2002-02-02_Ready-Talk"
GMAIL = "https://mail.google.com/mail/?view=cm&fs=1&to=help%40amruta.org&su=Transcript"
ROLES = f"operators:\n- login: SlavaSubotskiy\n  id: {OPERATOR_ID}\n  llm: true\n"
NEW_TALK = "2003-03-03_New-Talk"

TREE = {
    "sha": "op1",
    "tree": MOCK_TREE["tree"]
    + [
        {"path": f"talks/{READY_TALK}/Test-Video/final/uk.srt", "type": "blob"},
        {"path": f"talks/{READY_TALK}/meta.yaml", "type": "blob"},
        {"path": f"talks/{READY_TALK}/transcript_en.txt", "type": "blob"},
        {"path": f"talks/{READY_TALK}/transcript_uk.txt", "type": "blob"},
        {"path": f"talks/{READY_TALK}/_for_Amruta/Test-Video_uk.srt", "type": "blob"},
        {"path": f"talks/{READY_TALK}/_for_Amruta/transcript_uk.txt", "type": "blob"},
        {"path": f"talks/{NEW_TALK}/meta.yaml", "type": "blob"},
    ],
}

STATUS = {
    "version": 1,
    "talks": {
        QA_TALK: {
            "status": "approved",
            "reviewer": "IrynaFilSY",
            "issue_number": None,
            "operator_stage": "qa",
            "operator": "SlavaSubotskiy",
            "operator_issue": 1279,
        },
        READY_TALK: {
            "status": "approved",
            "reviewer": "IrynaFilSY",
            "issue_number": None,
            "operator_stage": "ready",
            "operator": "SlavaSubotskiy",
            "operator_issue": 1300,
        },
    },
}

BOT_COMMENTS = [
    {"user": {"login": "IrynaFilSY"}, "body": "### Ready for Amruta\n[x](https://mail.google.com/mail/?evil)"},
    {
        "user": {"login": "github-actions[bot]"},
        "body": f"### Ready for Amruta\n\n**[Open the e-mail in Gmail]({GMAIL})**\n",
    },
]


def _json(route, status, payload):
    route.fulfill(status=status, content_type="application/json", body=json.dumps(payload))


def _page(browser, calls, user, roles=ROLES):
    ctx = browser.new_context(accept_downloads=True)
    pg = ctx.new_page()
    _wire(pg, calls, STATUS, tree=TREE)
    pg.route(
        "**/raw.githubusercontent.com/**/roles.yaml",
        lambda r: (
            r.fulfill(status=200, content_type="text/plain", body=roles)
            if roles is not None
            else r.fulfill(status=404, body="nf")
        ),
    )
    pg.route(
        "**/raw.githubusercontent.com/**/_for_Amruta/*",
        lambda r: r.fulfill(status=200, content_type="text/plain", body="1\n00:00:01,000 --> 00:00:02,000\nТекст\n"),
    )
    pg.route(
        "**/api.github.com/user",
        lambda r: _json(r, 200, {"login": "SlavaSubotskiy", "avatar_url": "icon.png", "id": OPERATOR_ID}),
    )

    def record(status, payload):
        def handle(route):
            req = route.request
            calls.append({"method": req.method, "url": req.url, "body": req.post_data and json.loads(req.post_data)})
            _json(route, status, payload)

        return handle

    def issue(route):
        req = route.request
        calls.append({"method": req.method, "url": req.url, "body": req.post_data and json.loads(req.post_data)})
        _json(route, 200, {"number": 1279, "state": "open", "labels": [{"name": "op:qa"}]})

    pg.route("**/api.github.com/repos/**/issues/1279", issue)
    pg.route("**/api.github.com/repos/**/issues/1279/labels", record(200, []))
    pg.route("**/api.github.com/repos/**/issues/1300", record(200, {"number": 1300, "state": "closed"}))
    pg.route("**/api.github.com/repos/**/issues/1300/comments*", lambda r: _json(r, 200, BOT_COMMENTS))
    pg.add_init_script(
        "localStorage.removeItem('sy_tree_cache__main');localStorage.removeItem('sy_review_status__main');"
        "localStorage.setItem('sy_gh_token', 'gho_e2e');"
        f"localStorage.setItem('sy_gh_user', JSON.stringify({json.dumps(user)}));"
    )
    return ctx, pg


def _card(pg, talk_id):
    return pg.locator(f".talk-item[data-talk-id='{talk_id}']")


OPERATOR = {"login": "SlavaSubotskiy", "avatar_url": "icon.png", "id": OPERATOR_ID}


def test_operator_sees_stage_chips_and_the_switch(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='op-all']", timeout=10000)
    filters = pg.eval_on_selector_all(".stat-card", "els => els.map(e => e.dataset.filter)")
    assert filters == [
        "op-all",
        "op-new",
        "op-pipeline",
        "op-translator",
        "op-review",
        "op-qa",
        "op-ready",
        "op-delivered",
    ]
    assert pg.evaluate("!document.getElementById('prefs-operator-row').hidden")
    assert pg.evaluate("!document.getElementById('operator-flag').hidden")
    assert _card(pg, QA_TALK).count() == 1 and _card(pg, READY_TALK).count() == 1
    ctx.close()


def test_switching_operator_mode_off_brings_back_the_ordinary_view(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='op-all']", timeout=10000)
    pg.evaluate("SPA.toggleOperator()")
    pg.wait_for_selector(".stat-card[data-filter='needs-review']", timeout=5000)
    assert pg.locator(".stat-card[data-filter='op-all']").count() == 0
    assert pg.evaluate("localStorage.getItem('sy_operator_mode')") == "0"
    ctx.close()


def test_non_operator_sees_no_operator_ui(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], {"login": "IrynaFilSY", "avatar_url": "icon.png", "id": 5})
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card", timeout=10000)
    pg.wait_for_timeout(300)
    assert pg.locator(".stat-card[data-filter='op-all']").count() == 0
    assert pg.evaluate("document.getElementById('prefs-operator-row').hidden")
    assert pg.locator(".op-qa-btn").count() == 0
    ctx.close()


def test_missing_roles_file_means_no_operator(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR, roles=None)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card", timeout=10000)
    pg.wait_for_timeout(300)
    assert pg.locator(".stat-card[data-filter='op-all']").count() == 0
    ctx.close()


def test_a_cached_session_without_id_is_refreshed_into_operator_mode(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], {"login": "SlavaSubotskiy", "avatar_url": "icon.png"})
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='op-all']", timeout=10000)
    assert json.loads(pg.evaluate("localStorage.getItem('sy_gh_user')"))["id"] == OPERATOR_ID
    ctx.close()


def test_qa_passed_adds_the_label_and_waits_for_the_bot(server, browser):  # noqa: F811
    calls = []
    ctx, pg = _page(browser, calls, OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    btn = _card(pg, QA_TALK).locator(".op-qa-btn")
    btn.wait_for(timeout=10000)
    btn.click()
    pg.wait_for_function(
        "document.querySelector(\".talk-item[data-talk-id='2001-01-01_Test-Talk'] .op-waiting\")", timeout=5000
    )
    posts = [c for c in calls if c["method"] == "POST" and c["url"].endswith("/issues/1279/labels")]
    assert posts and posts[0]["body"] == {"labels": ["op:qa-passed"]}
    assert _card(pg, QA_TALK).locator(".op-qa-btn").count() == 0
    ctx.close()


def test_open_email_is_a_new_tab_link_to_the_bot_gmail_url(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    link = _card(pg, READY_TALK).locator("a.op-mail-btn[href]")
    link.wait_for(timeout=10000)
    assert link.get_attribute("href") == GMAIL
    assert link.get_attribute("target") == "_blank"
    assert "noopener" in link.get_attribute("rel")
    ctx.close()


def test_package_file_is_saved_under_its_own_name(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    btn = _card(pg, READY_TALK).locator(".op-file-btn", has_text="transcript_uk.txt")
    btn.wait_for(timeout=10000)
    with pg.expect_download() as dl:
        btn.click()
    assert dl.value.suggested_filename == "transcript_uk.txt"
    ctx.close()


def test_sent_close_asks_first_and_closes_only_on_confirm(server, browser):  # noqa: F811
    calls = []
    ctx, pg = _page(browser, calls, OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    btn = _card(pg, READY_TALK).locator(".op-close-btn")
    btn.wait_for(timeout=10000)
    btn.click()
    pg.wait_for_selector(".sy-modal", timeout=3000)
    pg.click(".sy-modal-btn:not(.primary):not(.danger)")
    pg.wait_for_timeout(200)
    assert not [c for c in calls if c["method"] == "PATCH"]
    btn.click()
    pg.wait_for_selector(".sy-modal", timeout=3000)
    pg.click(".sy-modal-btn.primary, .sy-modal-btn.danger")
    pg.wait_for_function(
        "document.querySelector(\".talk-item[data-talk-id='2002-02-02_Ready-Talk'] .op-waiting\")", timeout=5000
    )
    patches = [c for c in calls if c["method"] == "PATCH"]
    assert len(patches) == 1 and patches[0]["url"].endswith("/issues/1300")
    assert patches[0]["body"] == {"state": "closed", "state_reason": "completed"}
    ctx.close()


def test_sent_close_shows_a_hostile_title_as_text(server, browser):  # noqa: F811
    hostile = "$& <img src=x onerror=window.__pwned=1>"
    ctx, pg = _page(browser, [], OPERATOR)
    pg.route(
        f"**/raw.githubusercontent.com/**/{READY_TALK}/meta.yaml",
        lambda r: r.fulfill(
            status=200,
            content_type="text/plain",
            body=f"title: {json.dumps(hostile)}\ndate: '2002-02-02'\nvideos:\n- slug: Test-Video\n  title: V\n  video_ref: r1DBtMTl9VW1NC\n",
        ),
    )
    pg.goto(f"{server}{SPA_URL}")
    btn = _card(pg, READY_TALK).locator(".op-close-btn")
    btn.wait_for(timeout=10000)
    btn.click()
    pg.wait_for_selector(".sy-modal-body", timeout=3000)
    assert pg.locator(".sy-modal-body img").count() == 0
    assert hostile in pg.locator(".sy-modal-body").text_content()
    assert pg.evaluate("window.__pwned") is None
    ctx.close()


def test_operator_mode_is_there_when_the_index_is_reached_from_another_view(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}#/review/{QA_TALK}")
    pg.wait_for_function("typeof manifest !== 'undefined' && !!manifest", timeout=10000)
    pg.evaluate("loadReviewStatus()")
    pg.wait_for_function("!!reviewStatus", timeout=5000)
    pg.evaluate("location.hash = ''")
    pg.wait_for_selector(".stat-card[data-filter='op-all']", timeout=10000)
    ctx.close()


PACKAGED_TREE = {
    "sha": "op2",
    "tree": TREE["tree"] + [{"path": f"talks/{QA_TALK}/_for_Amruta/transcript_uk.txt", "type": "blob"}],
}
OPERATOR_ISSUES = "**/api.github.com/repos/**/issues?labels=talk-operator*"


def _wait_on_the_bot_after_qa_passed(pg, base_url):
    pg.clock.install()
    pg.goto(f"{base_url}{SPA_URL}")
    btn = _card(pg, QA_TALK).locator(".op-qa-btn")
    btn.wait_for(timeout=10000)
    btn.click()
    _card(pg, QA_TALK).locator(".op-waiting").wait_for(timeout=5000)


def test_package_files_appear_once_the_bot_has_labelled_the_issue_ready(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    _wait_on_the_bot_after_qa_passed(pg, server)

    # review-status.json — raw and through the API alike — still says "qa":
    # the bot has only just put op:ready on the issue.
    ready_issue = {
        "number": 1279,
        "title": f"Operator: {QA_TALK}",
        "labels": [{"name": "talk-operator"}, {"name": "op:ready"}],
        "assignees": [{"login": "SlavaSubotskiy"}],
        "updated_at": "2026-11-18T10:00:00Z",
    }
    pg.route(OPERATOR_ISSUES, lambda r: _json(r, 200, [ready_issue]))
    pg.route("**/api.github.com/repos/**/git/trees/**", lambda r: _json(r, 200, PACKAGED_TREE))
    pg.clock.run_for(31000)
    _card(pg, QA_TALK).locator(".op-file-btn", has_text="transcript_uk.txt").wait_for(timeout=5000)
    ctx.close()


def test_package_files_appear_from_the_status_file_when_the_issues_api_fails(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.route(OPERATOR_ISSUES, lambda r: _json(r, 500, {"message": "boom"}))
    _wait_on_the_bot_after_qa_passed(pg, server)

    packaged = json.loads(json.dumps(STATUS))
    packaged["talks"][QA_TALK]["operator_stage"] = "ready"
    # raw.githubusercontent keeps serving the old file (its CDN ignores the
    # query string, so a cache buster does not help); only the API is fresh.
    pg.route("**/api.github.com/repos/**/contents/review-status.json*", lambda r: _json(r, 200, _contents(packaged)))
    pg.route("**/api.github.com/repos/**/git/trees/**", lambda r: _json(r, 200, PACKAGED_TREE))
    pg.clock.run_for(31000)
    _card(pg, QA_TALK).locator(".op-file-btn", has_text="transcript_uk.txt").wait_for(timeout=5000)
    ctx.close()


def _contents(payload):
    raw = json.dumps(payload).encode()
    return {"content": base64.b64encode(raw).decode(), "encoding": "base64", "sha": "rs2"}


def test_a_wait_on_the_bot_survives_a_reload(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    btn = _card(pg, QA_TALK).locator(".op-qa-btn")
    btn.wait_for(timeout=10000)
    btn.click()
    _card(pg, QA_TALK).locator(".op-waiting").wait_for(timeout=5000)

    pg.reload()
    _card(pg, QA_TALK).locator(".op-waiting").wait_for(timeout=10000)
    assert _card(pg, QA_TALK).locator(".op-qa-btn").count() == 0
    ctx.close()


def _chip(pg, f):
    return pg.locator(f".stat-card[data-filter='{f}'] .num").text_content()


def test_a_talk_without_artifacts_is_new_and_offers_run_pipeline(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='op-new']", timeout=10000)
    assert _chip(pg, "op-new") == "1"
    assert _chip(pg, "op-all") == "3"
    _card(pg, NEW_TALK).locator(".op-run-btn").wait_for(timeout=5000)
    assert _card(pg, QA_TALK).locator(".op-run-btn").count() == 0
    ctx.close()


def test_an_operator_without_the_llm_flag_gets_no_run_pipeline(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR, roles=ROLES.replace("  llm: true\n", ""))
    pg.goto(f"{server}{SPA_URL}")
    _card(pg, NEW_TALK).wait_for(timeout=10000)
    assert _card(pg, NEW_TALK).locator(".op-run-btn").count() == 0
    ctx.close()


def test_expert_chips_for_everyone_else(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], {"login": "IrynaFilSY", "avatar_url": "icon.png", "id": 5})
    pg.add_init_script(
        "localStorage.setItem('sy_expert_mode', '1'); localStorage.setItem('sy_filter_expert', 'pending');"
    )
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='approved']", timeout=10000)
    filters = pg.eval_on_selector_all(".stat-card", "els => els.map(e => e.dataset.filter)")
    assert filters[:5] == ["all", "pending", "needs-review", "in-review", "approved"]
    assert _chip(pg, "pending") == "3"
    assert _chip(pg, "approved") == "0"
    assert _card(pg, QA_TALK).count() == 1 and _card(pg, NEW_TALK).count() == 1
    assert _card(pg, QA_TALK).locator(".op-qa-btn").count() == 0
    ctx.close()


def test_operator_mode_makes_the_expert_switch_inactive(server, browser):  # noqa: F811
    ctx, pg = _page(browser, [], OPERATOR)
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card[data-filter='op-all']", timeout=10000)
    assert pg.evaluate("document.getElementById('prefs-expert').disabled")
    assert pg.evaluate("document.getElementById('prefs-expert').checked")
    pg.evaluate("SPA.toggleOperator()")
    pg.wait_for_selector(".stat-card[data-filter='needs-review']", timeout=5000)
    assert not pg.evaluate("document.getElementById('prefs-expert').disabled")
    assert not pg.evaluate("document.getElementById('prefs-expert').checked")
    ctx.close()


def test_expert_card_of_an_approved_talk_without_operator_stage(server, browser):  # noqa: F811
    status = json.loads(json.dumps(STATUS))
    status["talks"][NEW_TALK] = {"status": "approved", "reviewer": None, "issue_number": 77}
    ctx, pg = _page(browser, [], {"login": "IrynaFilSY", "avatar_url": "icon.png", "id": 5})
    pg.route("**/raw.githubusercontent.com/**/review-status.json", lambda r: _json(r, 200, status))
    pg.add_init_script(
        "localStorage.setItem('sy_expert_mode', '1'); localStorage.setItem('sy_filter_expert', 'pending');"
    )
    pg.goto(f"{server}{SPA_URL}")
    card = _card(pg, NEW_TALK)
    card.wait_for(timeout=10000)
    assert card.locator(".review-badge").text_content().strip() != ""
    assert card.locator(".take-review-btn").count() == 0
    ctx.close()
