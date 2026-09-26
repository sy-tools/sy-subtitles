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


def _units(tree):
    """The module's own code, then each outermost function with its closures."""
    module, functions = [], []

    def split(node):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions.append(list(ast.walk(child)))
            else:
                module.append(child)
                split(child)

    split(tree)
    return [module, *functions]


def _bound_names(target):
    if isinstance(target, (ast.Tuple, ast.List)):
        for element in target.elts:
            yield from _bound_names(element)
    elif target is not None:
        yield ast.unparse(target)


def _unclosed_shutdowns(source):
    """Lines where a server is shut down and never closed.

    `shutdown()` only stops the serve loop; the listening socket stays open
    until `server_close()`, or until garbage collection gets to it. A server
    bound by `with ... as` is closed on the way out, so it needs no call.

    The unit is an outermost function or method with its closures, since a
    fixture may stop its server from a nested helper or hand `httpd.shutdown`
    to a finalizer; code outside every function is a unit of its own. A
    `shutdown(...)` with arguments — a socket's half-close, an executor's
    `wait=` — is not a server's.
    """
    unclosed = set()
    for nodes in _units(ast.parse(source)):
        managed = {
            name
            for node in nodes
            if isinstance(node, (ast.With, ast.AsyncWith))
            for item in node.items
            for name in _bound_names(item.optional_vars)
        }
        with_args = {id(node.func) for node in nodes if isinstance(node, ast.Call) and (node.args or node.keywords)}
        seen = {"shutdown": {}, "server_close": {}}
        for node in nodes:
            if isinstance(node, ast.Attribute) and node.attr in seen and id(node) not in with_args:
                receiver = ast.unparse(node.value)
                seen[node.attr][receiver] = min(node.lineno, seen[node.attr].get(receiver, node.lineno))
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
        "class TestA:\n    class TestB:\n        def stop(self):\n            self.httpd.shutdown()\n",
        "if True:\n    def f():\n        httpd.shutdown()\n",
        "try:\n    import x\nexcept ImportError:\n    pass\nelse:\n    def f():\n        httpd.shutdown()\n",
        "httpd.shutdown()\n",
        "atexit.register(lambda: httpd.shutdown())\n",
        "def f():\n    httpd.server_close()\n\n\nhttpd.shutdown()\n",
        "async def f():\n    httpd.server_close()\n\n\nhttpd.shutdown()\n",
    ],
)
def test_the_close_guard_sees_a_server_left_open(source):
    assert _unclosed_shutdowns(source)


@pytest.mark.parametrize(
    ("source", "lines"),
    [
        ("def f():\n    a.shutdown()\n    b.shutdown()\n", [2, 3]),
        ("def f():\n    a.shutdown()\n\n\ndef g():\n    b.shutdown()\n", [2, 6]),
        ("a.shutdown()\n\n\ndef g():\n    b.shutdown()\n", [1, 5]),
    ],
)
def test_the_close_guard_names_every_server_left_open(source, lines):
    assert _unclosed_shutdowns(source) == lines


@pytest.mark.parametrize(
    "source",
    [
        "def f(r):\n    r.addfinalizer(httpd.shutdown)\n    httpd.shutdown()\n",
        "def f():\n    if x:\n        httpd.shutdown()\n    httpd.shutdown()\n",
    ],
)
def test_the_close_guard_names_the_first_line_that_stops_the_server(source):
    first = next(i for i, line in enumerate(source.splitlines(), 1) if "shutdown" in line)
    assert _unclosed_shutdowns(source) == [first]


@pytest.mark.parametrize(
    "source",
    [
        "def f():\n    httpd.shutdown()\n    httpd.server_close()\n",
        "def f():\n    self.httpd.shutdown()\n\n    self.httpd.server_close()  # free the port\n",
        "def f():\n    with Server() as httpd:\n        httpd.shutdown()\n",
        "async def f():\n    async with Server() as (httpd, port):\n        httpd.shutdown()\n",
        "def f():\n    with Server() as [httpd, port]:\n        httpd.shutdown()\n",
        "def f():\n    with Server() as ((httpd, port), *rest):\n        httpd.shutdown()\n",
        "def f():\n    def stop():\n        httpd.shutdown()\n    stop()\n    httpd.server_close()\n",
        "def f(request):\n    request.addfinalizer(httpd.shutdown)\n    request.addfinalizer(httpd.server_close)\n",
        "def f():\n    sock.shutdown(socket.SHUT_WR)\n",
        "def f():\n    pool.shutdown(wait=True)\n",
        "httpd.shutdown()\nhttpd.server_close()\n",
        "with Server() as httpd:\n    httpd.shutdown()\n",
    ],
)
def test_the_close_guard_accepts_a_closed_server(source):
    assert not _unclosed_shutdowns(source)
