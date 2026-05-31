"""E2E coverage for the service worker (site/sw.js).

The SPA skips SW registration on localhost (index.html guards on hostname),
so the Playwright suite never exercised the worker. These tests register
sw.js directly and drive the real install / activate / fetch-handler chain in
Chromium, covering the caching strategy (cache-first for immutable assets,
network-first for navigation — the branch where isApiOrRaw/isNavigation live)
and the activate-time purge of stale version caches.

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

# SW install/activate/claim and the fetch chain are timing-sensitive under
# `pytest -n auto` on a 2-core CI runner. The assertions are deterministic;
# only the scheduling is not — so retry rather than widen the timeout forever.
pytestmark = pytest.mark.flaky(reruns=2, reruns_delay=2)

CACHE = "sy-subtitles-c3"  # CACHE_NAME in sw.js (CACHE_VERSION = 3)
SW_WAIT_MS = 15000


def _register_sw(page, server):  # noqa: F811
    """Register sw.js and wait until it controls the page (clients.claim())."""
    page.goto(f"{server}/index.html")
    page.evaluate("() => navigator.serviceWorker.register('sw.js')")
    page.wait_for_function("() => !!navigator.serviceWorker.controller", timeout=SW_WAIT_MS)


class TestServiceWorker:
    def test_registers_activates_and_controls_page(self, server, page):  # noqa: F811
        _register_sw(page, server)
        script_url = page.evaluate("() => navigator.serviceWorker.controller.scriptURL")
        assert script_url.endswith("/sw.js"), script_url

    def test_immutable_asset_populates_versioned_cache(self, server, page):  # noqa: F811
        _register_sw(page, server)
        page.evaluate("() => fetch('icon.png')")
        page.wait_for_function(
            "async () => { const c = await caches.open('sy-subtitles-c3');"
            " return !!(await c.match(location.origin + '/icon.png')); }",
            timeout=10000,
        )
        assert CACHE in page.evaluate("() => caches.keys()")

    def test_immutable_asset_is_served_cache_first(self, server, page):  # noqa: F811
        _register_sw(page, server)
        # Seed a sentinel under the icon.png key; cache-first must return it
        # without going to the network.
        page.evaluate(
            "async () => { const c = await caches.open('sy-subtitles-c3');"
            " await c.put(location.origin + '/icon.png',"
            " new Response('SENTINEL', {headers: {'content-type': 'text/plain'}})); }"
        )
        body = page.evaluate("async () => (await (await fetch('icon.png')).text())")
        assert body == "SENTINEL", f"icon.png was not served cache-first: {body[:80]!r}"

    def test_navigation_is_network_first_over_stale_cache(self, server, page):  # noqa: F811
        _register_sw(page, server)
        # Seed a stale sentinel for index.html; network-first must prefer the
        # live response when the network is reachable.
        page.evaluate(
            "async () => { const c = await caches.open('sy-subtitles-c3');"
            " await c.put(location.origin + '/index.html',"
            " new Response('STALE', {headers: {'content-type': 'text/html'}})); }"
        )
        body = page.evaluate("async () => (await (await fetch('index.html')).text())")
        assert "STALE" not in body, "index.html was served from stale cache (should be network-first)"
        assert "<" in body, f"expected the real index.html, got: {body[:80]!r}"

    def test_activate_purges_stale_version_caches(self, server, page):  # noqa: F811
        page.goto(f"{server}/index.html")
        # Seed an OLD version cache before the worker activates.
        page.evaluate(
            "async () => { const c = await caches.open('sy-subtitles-c2');"
            " await c.put(location.origin + '/old', new Response('x')); }"
        )
        page.evaluate("() => navigator.serviceWorker.register('sw.js')")
        page.wait_for_function("() => !!navigator.serviceWorker.controller", timeout=SW_WAIT_MS)
        # The activate handler deletes every cache whose name != CACHE_NAME.
        page.wait_for_function(
            "async () => !(await caches.keys()).includes('sy-subtitles-c2')",
            timeout=10000,
        )
        assert "sy-subtitles-c2" not in page.evaluate("() => caches.keys()")
