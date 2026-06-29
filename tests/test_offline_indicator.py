"""E2E for the offline UX: the freshness-bar offline badge and non-blocking
content failures. The user keeps working with cached data — no full-screen block.

Reuses the server/page fixtures from test_preview_spa.
"""

from __future__ import annotations

import pytest

from tests.test_preview_spa import (  # noqa: F401  — re-exported fixtures
    browser,
    mock_player_js,
    page,
    server,
    spa_path,
)

pytestmark = [pytest.mark.e2e, pytest.mark.flaky(reruns=2, reruns_delay=2)]


def _offline_text(locator):
    txt = locator.inner_text().lower()
    return "offline" in txt or "офлайн" in txt


class TestOfflineIndicator:
    def test_badge_tracks_connectivity_changes(self, server, page):  # noqa: F811
        # The freshness-bar badge reflects REAL device connectivity via the
        # online/offline listeners — not only a manifest-staleness check.
        page.goto(f"{server}/index.html")
        page.wait_for_function("() => !!document.getElementById('stale-indicator')")
        # Online at load: badge hidden.
        assert page.evaluate("() => document.getElementById('stale-indicator').style.display") == "none"
        page.context.set_offline(True)
        try:
            ind = page.locator("#stale-indicator")
            ind.wait_for(state="visible", timeout=5000)
            assert _offline_text(ind), ind.inner_text()
        finally:
            page.context.set_offline(False)
        # Back online with a fresh (mocked) manifest: badge clears again.
        page.wait_for_function(
            "() => document.getElementById('stale-indicator').style.display === 'none'",
            timeout=5000,
        )

    def test_badge_visible_while_working_in_a_preview(self, server, page):  # noqa: F811
        # The bar is sticky on every view, so going offline mid-work still surfaces
        # the badge on the preview page (not just the index).
        page.goto(f"{server}/index.html#/preview/2001-01-01_Test-Talk/Test-Video")
        page.wait_for_function("() => !!document.getElementById('stale-indicator')")
        page.context.set_offline(True)
        try:
            page.locator("#stale-indicator").wait_for(state="visible", timeout=5000)
        finally:
            page.context.set_offline(False)

    def test_offline_subtitle_failure_is_non_blocking(self, server, page):  # noqa: F811
        # An offline subtitle miss shows an inline note in the overlay and does NOT
        # throw up a full-screen block — the page stays usable.
        page.route(
            "**/raw.githubusercontent.com/**/final/uk.srt**",
            lambda route: route.abort("failed"),
        )
        page.goto(f"{server}/index.html#/preview/2001-01-01_Test-Talk/Test-Video")
        page.wait_for_function(
            "() => /offline|офлайн/i.test((document.getElementById('subtitle-overlay') || {}).textContent || '')",
            timeout=8000,
        )
        # No blocking overlay was introduced; the page chrome stays present.
        assert page.locator("#offline-screen").count() == 0
        assert page.locator("#freshness-bar").count() == 1

    def test_dismiss_cannot_hide_a_live_offline_badge(self, server, page):  # noqa: F811
        # Real offline is live device state: it is shown regardless of the manifest
        # dismiss flag (unlike a dismissable rate-limit notice).
        page.goto(f"{server}/index.html")
        page.evaluate("() => { _staleDismissed = true; }")
        page.context.set_offline(True)
        try:
            page.locator("#stale-indicator").wait_for(state="visible", timeout=5000)
        finally:
            page.context.set_offline(False)
