"""E2E for a text-only talk (a letter): no video, only transcripts.

It must reach "needs review" in normal mode, wear a "Text" tag, offer only
the transcript review, draw a pipeline without whisper/subtitle nodes in
expert mode, and turn a preview deep link into the review page instead of a
blank player.
"""

import pytest

from tests.test_spa_auth_actions_e2e import MOCK_TREE, SPA_URL, _page, server  # noqa: F401

pytestmark = pytest.mark.e2e

LETTER = "1979-01-01_Letter"
LETTER_META = "title: Letter\ndate: '1979-01-01'\nlocation: London (England)\nlanguage: en\n"

TREE = {
    "sha": "letter1",
    "tree": MOCK_TREE["tree"]
    + [
        {"path": f"talks/{LETTER}/meta.yaml", "type": "blob"},
        {"path": f"talks/{LETTER}/review_report.md", "type": "blob"},
        {"path": f"talks/{LETTER}/transcript_en.txt", "type": "blob"},
        {"path": f"talks/{LETTER}/transcript_uk.txt", "type": "blob"},
    ],
}

STATUS = {
    "version": 1,
    "updated_at": "2026-11-17T00:00:00Z",
    "talks": {
        "2001-01-01_Test-Talk": {"status": "pending", "reviewer": None, "issue_number": 42},
        LETTER: {"status": "pending", "reviewer": None, "issue_number": 325},
    },
}


def _letter_page(browser, calls, expert=False):
    ctx, pg = _page(browser, calls, STATUS, tree=TREE)
    pg.route(
        f"**/raw.githubusercontent.com/**/{LETTER}/meta.yaml",
        lambda r: r.fulfill(status=200, content_type="text/plain", body=LETTER_META),
    )
    if expert:
        pg.add_init_script(
            "localStorage.setItem('sy_expert_mode', '1');localStorage.setItem('sy_filter_expert', 'all');"
        )
    return ctx, pg


def _card(pg):
    return pg.locator(f".talk-item[data-talk-id='{LETTER}']")


def test_a_translated_letter_with_an_issue_is_listed_as_needing_review(server, browser):  # noqa: F811
    ctx, pg = _letter_page(browser, [])
    pg.goto(f"{server}{SPA_URL}")
    card = _card(pg)
    card.wait_for(timeout=10000)
    assert card.locator(".review-badge.ready-for-review").count() == 1
    assert card.locator(".talk-kind").count() == 1
    assert card.locator(".review-link").count() == 1
    assert card.locator(".preview-link").count() == 0
    ctx.close()


def test_a_video_talk_wears_no_text_tag(server, browser):  # noqa: F811
    ctx, pg = _letter_page(browser, [])
    pg.goto(f"{server}{SPA_URL}")
    card = pg.locator(".talk-item[data-talk-id='2001-01-01_Test-Talk']")
    card.wait_for(timeout=10000)
    assert card.locator(".talk-kind").count() == 0
    ctx.close()


def test_expert_pipeline_of_a_letter_has_no_whisper_or_subtitle_nodes(server, browser):  # noqa: F811
    ctx, pg = _letter_page(browser, [], expert=True)
    pg.goto(f"{server}{SPA_URL}")
    card = _card(pg)
    card.wait_for(timeout=10000)
    card.click()
    dag = card.locator(".pipe-dag")
    dag.wait_for(timeout=5000)
    labels = [s.strip().lower() for s in dag.locator(".pipe-node").all_text_contents()]
    assert labels == ["added", "ai-translated", "ai-reviewed", "issue", "review", "approved"], labels
    ctx.close()


def test_a_preview_link_to_a_letter_opens_its_review(server, browser):  # noqa: F811
    ctx, pg = _letter_page(browser, [])
    pg.goto(f"{server}{SPA_URL}#/preview/{LETTER}/Anything")
    pg.wait_for_function(f"location.hash === '#/review/{LETTER}'", timeout=10000)
    assert pg.locator("#view-review.active").count() == 1
    toast = pg.locator("#toast.show")
    assert toast.count() == 1
    assert "video" in toast.text_content().lower() or "відео" in toast.text_content().lower()
    ctx.close()
