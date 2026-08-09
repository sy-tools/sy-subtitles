"""Guard: e2e suites must share conftest's session-scoped ``browser`` fixture.

Launching chromium (plus the playwright driver) costs seconds. With
``pytest -n auto`` (dist=load) a per-module fixture or an inline
playwright-sync-API block makes every xdist worker pay that launch once
per module it happens to pick tests from — profiling showed a ladder of
10s+ setups from exactly this. One session-scoped browser per worker keeps
the cost constant; per-test isolation comes from browser *contexts*, which
stay per-test.

Runs under the normal ``python -m pytest tests/`` step in ci.yml.
"""

from pathlib import Path

TESTS = Path(__file__).parent

# Built by concatenation so this guard's own source never matches itself.
LAUNCH_MARKER = "sync_" + "playwright"


def test_only_conftest_starts_playwright() -> None:
    offenders = sorted(p.name for p in TESTS.glob("test_*.py") if LAUNCH_MARKER in p.read_text(encoding="utf-8"))
    assert offenders == [], (
        "these modules start their own playwright/chromium instead of using "
        f"the shared session-scoped `browser` fixture from conftest.py: {offenders}"
    )
