"""The SPA is served from `tools.serve_auth_local.SpaHTTPServer`, stand and tests alike.

A bare `http.server.HTTPServer` or `socketserver.TCPServer` is single-threaded
with a listen backlog of 5, and the page fetches its ~40 scripts at once: the
excess connections are reset (macOS) or dropped into SYN retransmits (Linux),
so a module silently fails to load or the load outlasts `Page.goto`'s timeout —
a red shard that passes on a rerun and looks like a flake.
"""

import re
from pathlib import Path

import pytest

from tools import serve_auth_local
from tools.serve_auth_local import SpaHTTPServer

TESTS = Path(__file__).parent
BARE_SERVER = re.compile(r"(?:http\.server\.(?:Threading)?HTTPServer|socketserver\.TCPServer)\(")


def test_no_browser_test_serves_from_a_bare_server():
    offenders = [
        path.name
        for path in sorted(TESTS.glob("*.py"))
        if path.name != Path(__file__).name and BARE_SERVER.search(path.read_text(encoding="utf-8"))
    ]
    assert offenders == [], f"serve the SPA from tools.serve_auth_local.SpaHTTPServer instead: {offenders}"


def test_the_server_threads_and_queues_a_page_worth_of_requests():
    assert hasattr(SpaHTTPServer, "process_request_thread")
    assert SpaHTTPServer.daemon_threads
    assert SpaHTTPServer.request_queue_size >= 64
    assert SpaHTTPServer.allow_reuse_address


def test_the_local_stand_serves_from_it(monkeypatch):
    served = []

    class Recorder:
        def __init__(self, address, handler):
            served.append(address)

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def serve_forever(self):
            raise KeyboardInterrupt

    monkeypatch.setattr(serve_auth_local, "SpaHTTPServer", Recorder)
    serve_auth_local.main(["--port", "8123"])
    assert served == [("127.0.0.1", 8123)]


@pytest.mark.parametrize("path", ["tools/serve_auth_local.py"])
def test_the_stand_holds_no_bare_server_either(path):
    assert not BARE_SERVER.search(Path(path).read_text(encoding="utf-8"))
