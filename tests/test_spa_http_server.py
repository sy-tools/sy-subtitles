"""The SPA is served from `tools.serve_auth_local.SpaHTTPServer`, stand and tests alike.

A bare `http.server.HTTPServer` or `socketserver.TCPServer` is single-threaded
with a listen backlog of 5, and the page fetches its ~40 scripts at once: the
excess connections are reset (macOS) or dropped into SYN retransmits (Linux),
so a module silently fails to load or the load outlasts `Page.goto`'s timeout —
a red shard that passes on a rerun and looks like a flake.
"""

import ast
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


def _top_level_functions(tree):
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            yield from (n for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)))
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            yield node


def _unclosed_shutdowns(source):
    """Lines where a function shuts a server down and never closes it.

    `shutdown()` only stops the serve loop; the listening socket stays open
    until `server_close()`, or until garbage collection gets to it. A server
    bound by `with ... as` is closed on the way out, so it needs no call.

    The unit is a top-level function or method with its closures, since a
    fixture may stop its server from a nested helper or hand `httpd.shutdown`
    to a finalizer. A `shutdown(...)` with arguments is a socket's or an
    executor's, not a server's.
    """
    unclosed = set()
    for fn in _top_level_functions(ast.parse(source)):
        nodes = list(ast.walk(fn))
        managed = set()
        for node in nodes:
            if isinstance(node, (ast.With, ast.AsyncWith)):
                for item in node.items:
                    target = item.optional_vars
                    names = target.elts if isinstance(target, ast.Tuple) else [target] if target else []
                    managed.update(ast.unparse(name) for name in names)
        with_args = {id(node.func) for node in nodes if isinstance(node, ast.Call) and (node.args or node.keywords)}
        seen = {"shutdown": {}, "server_close": {}}
        for node in nodes:
            if isinstance(node, ast.Attribute) and node.attr in seen and id(node) not in with_args:
                seen[node.attr].setdefault(ast.unparse(node.value), node.lineno)
        for receiver, line in seen["shutdown"].items():
            if receiver not in managed and receiver not in seen["server_close"]:
                unclosed.add(line)
    return sorted(unclosed)


def test_every_server_a_test_shuts_down_is_also_closed():
    offenders = [
        f"{path.name}:{line}"
        for path in sorted(TESTS.glob("*.py"))
        for line in _unclosed_shutdowns(path.read_text(encoding="utf-8"))
    ]
    assert offenders == [], f"follow httpd.shutdown() with httpd.server_close(): {offenders}"


@pytest.mark.parametrize(
    "source",
    [
        "def f():\n    httpd.shutdown()\n",
        "def f():\n    self.httpd.shutdown()\n",
        "def f():\n    httpd.shutdown()  # stop\n\n    other.server_close()\n",
        "def f(request):\n    request.addfinalizer(httpd.shutdown)\n",
        "class T:\n    def stop(self):\n        self.httpd.shutdown()\n",
    ],
)
def test_the_close_guard_sees_a_server_left_open(source):
    assert _unclosed_shutdowns(source)


@pytest.mark.parametrize(
    "source",
    [
        "def f():\n    httpd.shutdown()\n    httpd.server_close()\n",
        "def f():\n    self.httpd.shutdown()\n\n    self.httpd.server_close()  # free the port\n",
        "def f():\n    with Server() as httpd:\n        httpd.shutdown()\n",
        "async def f():\n    async with Server() as (httpd, port):\n        httpd.shutdown()\n",
        "def f():\n    def stop():\n        httpd.shutdown()\n    stop()\n    httpd.server_close()\n",
        "def f(request):\n    request.addfinalizer(httpd.shutdown)\n    request.addfinalizer(httpd.server_close)\n",
        "def f():\n    sock.shutdown(socket.SHUT_WR)\n",
        "def f():\n    pool.shutdown(wait=True)\n",
    ],
)
def test_the_close_guard_accepts_a_closed_server(source):
    assert not _unclosed_shutdowns(source)
