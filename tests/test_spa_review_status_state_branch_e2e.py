"""E2E: the index takes review statuses from the `state` data branch.

The file is read from raw.githubusercontent by branch name, so a page load
spends no API request on it — and the raw CDN may answer with a copy up to
five minutes old. Three things follow, and each is held here in a browser:

* the data branch wins over the copy the viewed branch carries;
* while the data branch does not exist, that copy is what is shown;
* an answer older than the statuses this browser already holds — a lagging
  CDN, or the fallback copy during an outage — never replaces them.
"""

import base64
import json
from urllib.parse import urlparse

import pytest

from tests.test_spa_auth_actions_e2e import SPA_URL, _wire, server  # noqa: F401

pytestmark = pytest.mark.e2e

TALK = "2001-01-01_Test-Talk"
STATE_FILE = "**/raw.githubusercontent.com/*/*/state/review-status.json"
STATUS_CONTENTS_API = "**/api.github.com/repos/**/contents/review-status.json*"


def _statuses(status, updated_at):
    return {
        "version": 1,
        "updated_at": updated_at,
        "talks": {
            TALK: {
                "status": status,
                "reviewer": "IrynaFilSY" if status != "pending" else None,
                "issue_number": 42,
                "updated_at": "2026-07-12T00:00:00Z",
            }
        },
    }


COPY_ON_MAIN = _statuses("pending", "2026-11-28T06:11:38.128059+00:00")
PUBLISHED_EARLIER = _statuses("in-progress", "2026-11-28T09:00:00.000000+00:00")
PUBLISHED_LATER = _statuses("approved", "2026-11-28T09:30:00.000000+00:00")


class DataBranch:
    def __init__(self, pg):
        self.http_status = 404
        self.document = None
        self.requests = 0
        pg.route(STATE_FILE, self._answer)

    def holds(self, document):
        self.http_status, self.document = 200, document

    def answers(self, http_status):
        self.http_status, self.document = http_status, None

    def _answer(self, route):
        self.requests += 1
        if self.http_status != 200:
            route.fulfill(status=self.http_status, body="nope")
            return
        route.fulfill(status=200, content_type="application/json", body=json.dumps(self.document))


@pytest.fixture
def anonymous_page(browser):
    ctx = browser.new_context()
    pg = ctx.new_page()
    _wire(pg, [], COPY_ON_MAIN)
    yield pg
    ctx.close()


def _open_index(pg, server):  # noqa: F811
    pg.goto(f"{server}{SPA_URL}")
    pg.wait_for_selector(".stat-card", timeout=10000)


def _shown_status(pg):
    return pg.evaluate("t => reviewStatus.talks[t].status", TALK)


def test_index_shows_the_data_branch_over_the_copy_on_main(server, anonymous_page):  # noqa: F811
    data_branch = DataBranch(anonymous_page)
    data_branch.holds(PUBLISHED_EARLIER)

    _open_index(anonymous_page, server)

    assert _shown_status(anonymous_page) == "in-progress"
    assert data_branch.requests == 1


def test_an_anonymous_load_spends_no_api_request_on_statuses(server, anonymous_page):  # noqa: F811
    """An anonymous visitor has 60 API requests an hour, and GitHub counts a
    conditional one answered 304 against them too."""
    api_requests = []
    anonymous_page.on(
        "request",
        lambda req: api_requests.append(req.url) if urlparse(req.url).hostname == "api.github.com" else None,
    )
    DataBranch(anonymous_page).holds(PUBLISHED_EARLIER)

    _open_index(anonymous_page, server)
    anonymous_page.wait_for_timeout(500)

    assert [u for u in api_requests if "review-status" in u or "/state" in u] == []
    assert [u for u in api_requests if "/git/trees/" in u], "the tree listing is the one request a load is allowed"


def test_missing_data_branch_shows_the_copy_on_main(server, anonymous_page):  # noqa: F811
    DataBranch(anonymous_page).answers(404)

    _open_index(anonymous_page, server)

    assert _shown_status(anonymous_page) == "pending"


def test_a_lagging_cdn_answer_does_not_roll_statuses_back(server, anonymous_page):  # noqa: F811
    data_branch = DataBranch(anonymous_page)
    data_branch.holds(PUBLISHED_LATER)
    _open_index(anonymous_page, server)
    assert _shown_status(anonymous_page) == "approved"

    data_branch.holds(PUBLISHED_EARLIER)
    anonymous_page.reload()
    anonymous_page.wait_for_selector(".stat-card", timeout=10000)

    assert _shown_status(anonymous_page) == "approved"


def test_an_outage_of_the_data_branch_keeps_the_statuses_already_read(server, anonymous_page):  # noqa: F811
    """The copy on main is the fallback, and it is the oldest of all: shown
    during an outage it would undo every status published since it froze."""
    data_branch = DataBranch(anonymous_page)
    data_branch.holds(PUBLISHED_LATER)
    _open_index(anonymous_page, server)

    data_branch.answers(503)
    anonymous_page.reload()
    anonymous_page.wait_for_selector(".stat-card", timeout=10000)

    assert _shown_status(anonymous_page) == "approved"


def test_a_later_publication_replaces_what_the_browser_holds(server, anonymous_page):  # noqa: F811
    data_branch = DataBranch(anonymous_page)
    data_branch.holds(PUBLISHED_EARLIER)
    _open_index(anonymous_page, server)

    data_branch.holds(PUBLISHED_LATER)
    anonymous_page.reload()
    anonymous_page.wait_for_selector(".stat-card", timeout=10000)

    assert _shown_status(anonymous_page) == "approved"


def test_refresh_button_rereads_the_data_branch(server, anonymous_page):  # noqa: F811
    data_branch = DataBranch(anonymous_page)
    data_branch.holds(PUBLISHED_EARLIER)
    _open_index(anonymous_page, server)

    data_branch.holds(PUBLISHED_LATER)
    anonymous_page.evaluate("() => SPA.refreshManifest()")
    anonymous_page.wait_for_function("t => reviewStatus.talks[t].status === 'approved'", arg=TALK, timeout=5000)


def test_operator_poll_reads_the_data_branch_through_the_api_when_signed_in(server, browser):  # noqa: F811
    """The poll waits on a bot that has just written: the raw CDN could keep
    its answer back for five minutes, the API cannot."""
    ctx = browser.new_context()
    pg = ctx.new_page()
    _wire(pg, [], COPY_ON_MAIN)
    pg.add_init_script(
        "localStorage.setItem('sy_gh_token', 'gho_e2e');"
        "localStorage.setItem('sy_gh_user', JSON.stringify({login: 'tester', avatar_url: 'icon.png'}));"
    )
    DataBranch(pg).holds(PUBLISHED_EARLIER)
    asked_refs = []

    def contents(route):
        asked_refs.append(route.request.url.split("ref=")[1])
        encoded = base64.b64encode(json.dumps(PUBLISHED_LATER).encode()).decode()
        route.fulfill(
            status=200, content_type="application/json", body=json.dumps({"content": encoded, "sha": "blob1"})
        )

    pg.route(STATUS_CONTENTS_API, contents)
    _open_index(pg, server)

    fetched = pg.evaluate("t => fetchFreshReviewStatus().then(d => d.talks[t].status)", TALK)

    assert fetched == "approved"
    assert asked_refs == ["state"]
    ctx.close()
