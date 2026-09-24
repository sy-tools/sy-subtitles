"""Every browser test has a deadline of its own.

Playwright's `page.evaluate` has no timeout: a promise the page never settles
(a real Vimeo player that stops answering) blocks the test, the xdist worker
and the CI shard until the job's own deadline. With a per-test deadline the
test fails with its stack instead, and the rest of the shard runs.
"""

import pytest

import tests.conftest as conftest


class _Item:
    def __init__(self, *markers):
        self.markers = {m.name: m for m in markers}

    def get_closest_marker(self, name):
        return self.markers.get(name)

    def add_marker(self, marker):
        self.markers[marker.mark.name] = marker.mark


def test_a_browser_test_gets_the_e2e_deadline():
    item = _Item(pytest.mark.e2e.mark)
    conftest.pytest_collection_modifyitems(None, [item])
    deadline = item.get_closest_marker("timeout")
    assert deadline.args == (conftest.E2E_TEST_TIMEOUT_S,)


def test_every_deadline_ends_the_test_by_the_thread_method(pytestconfig):
    """The default SIGALRM never interrupts a test blocked in Playwright, and a
    test carrying its own @pytest.mark.timeout gets the method from here too."""
    assert pytestconfig.getini("timeout_method") == "thread"


def test_a_test_with_its_own_deadline_keeps_it():
    item = _Item(pytest.mark.e2e.mark, pytest.mark.timeout(600).mark)
    conftest.pytest_collection_modifyitems(None, [item])
    assert item.get_closest_marker("timeout").args == (600,)


def test_a_unit_test_is_left_alone():
    item = _Item()
    conftest.pytest_collection_modifyitems(None, [item])
    assert item.get_closest_marker("timeout") is None


def test_the_deadline_plugin_is_installed():
    import pytest_timeout  # noqa: F401 — the marker is inert without it
