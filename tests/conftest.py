"""Shared test fixtures."""

import json
from pathlib import Path

import pytest

from tools.config import OptimizeConfig
from tools.srt_utils import parse_srt

# Seconds a browser test may run (tests/test_e2e_deadline.py says why); a test
# that needs longer carries its own @pytest.mark.timeout. The "thread" method,
# because the default SIGALRM never reaches a test blocked inside Playwright's
# event loop: this one dumps the stacks and ends the process — under xdist
# just the worker, so the test fails and the rest of the shard runs on.
E2E_TEST_TIMEOUT_S = 120


def pytest_collection_modifyitems(config, items):
    for item in items:
        if item.get_closest_marker("e2e") and not item.get_closest_marker("timeout"):
            item.add_marker(pytest.mark.timeout(E2E_TEST_TIMEOUT_S, method="thread"))


FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_srt_path():
    return FIXTURES / "sample.srt"


@pytest.fixture
def sample_whisper_path():
    return FIXTURES / "sample_whisper.json"


@pytest.fixture
def sample_transcript_en_path():
    return FIXTURES / "sample_transcript_en.txt"


@pytest.fixture
def sample_transcript_uk_path():
    return FIXTURES / "sample_transcript_uk.txt"


@pytest.fixture
def sample_blocks(sample_srt_path):
    return parse_srt(sample_srt_path)


@pytest.fixture
def sample_whisper_segments(sample_whisper_path):
    with open(sample_whisper_path) as f:
        data = json.load(f)
    return data["segments"]


@pytest.fixture
def default_config():
    return OptimizeConfig()


@pytest.fixture
def tmp_srt(tmp_path):
    return tmp_path / "output.srt"


@pytest.fixture
def tmp_json(tmp_path):
    return tmp_path / "output.json"


@pytest.fixture(scope="session")
def browser():
    """One chromium per xdist worker for the whole run.

    Session scope keeps the browser (and its driver process) alive across
    every e2e module a worker picks up; per-test isolation comes from the
    browser *contexts* the tests create, never from the browser itself.
    See test_e2e_browser_fixture_guard.py.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        pytest.skip("playwright not installed")
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()
