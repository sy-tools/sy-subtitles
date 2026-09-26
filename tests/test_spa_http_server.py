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
STAND = TESTS.parent / "tools" / "serve_auth_local.py"
# A server constructed from the standard library directly, however imported —
# but not a subclass's `class X(http.server.ThreadingHTTPServer):` line.
BARE_SERVER = re.compile(r"(?<![\w])(?:(?:http\.server|socketserver)\.)?(?:Threading)?(?:HTTPServer|TCPServer)\(")


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


def test_the_stand_holds_no_bare_server_either():
    assert not BARE_SERVER.search(STAND.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "line",
    [
        "httpd = http.server.HTTPServer(addr, Handler)",
        "httpd = HTTPServer(addr, Handler)",
        "with socketserver.TCPServer(addr, handler) as httpd:",
        "httpd = ThreadingHTTPServer(addr, Handler)",
    ],
)
def test_the_guard_sees_a_bare_server_however_it_is_imported(line):
    assert BARE_SERVER.search(line)


def test_the_guard_lets_the_shared_server_through():
    assert not BARE_SERVER.search("httpd = SpaHTTPServer(addr, Handler)")
    assert not BARE_SERVER.search("class SpaHTTPServer(http.server.ThreadingHTTPServer):")


# `shutdown()` only stops the serve loop; the listening socket stays open until
# `server_close()`, one leaked descriptor per module-scoped fixture.
UNCLOSED_SHUTDOWN = re.compile(r"^([ \t]*)(\w+)\.shutdown\(\)\n(?!\1\2\.server_close\(\)$)", re.M)


def test_every_server_a_test_stops_is_also_closed():
    offenders = [
        f"{path.name}:{text[: match.start()].count(chr(10)) + 1}"
        for path in sorted(TESTS.glob("*.py"))
        for text in [path.read_text(encoding="utf-8")]
        for match in UNCLOSED_SHUTDOWN.finditer(text)
    ]
    assert offenders == [], f"follow httpd.shutdown() with httpd.server_close(): {offenders}"


def test_the_close_guard_accepts_a_closed_server_only():
    assert UNCLOSED_SHUTDOWN.search("    httpd.shutdown()\n\n")
    assert not UNCLOSED_SHUTDOWN.search("    httpd.shutdown()\n    httpd.server_close()\n")
