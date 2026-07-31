"""Serve the SPA locally with the GitHub-auth runtime hooks already injected.

Signing in locally needs `window.__SY_GH_EXCHANGE_URL` pointed at a
`wrangler dev` Worker. Typing it into the console does not work for the full
round trip: the OAuth callback handler in index.html runs during page load, so
by the time a human can retype the hook the callback has already been consumed.
This server injects the hooks as the first thing in <head>, so they exist
before any app code runs.

Usage:
    cd workers/oauth-exchange && npx wrangler dev     # Worker on :8787
    python -m tools.serve_auth_local                  # SPA on :8000
    open 'http://localhost:8000/?repo=sy-tools/sy-subtitles'

`http://localhost:8000` must be in the App's callback URLs and in the Worker's
ALLOWED_ORIGINS (workers/oauth-exchange/.dev.vars). See docs/github-app-setup.md.

Local development only — the injected hooks never ship; the deployed app uses
the constants in site/index.html.
"""

import argparse
import contextlib
import functools
import http.server
import os
import socketserver

SITE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site")

DEFAULT_EXCHANGE_URL = "http://localhost:8787/exchange"


def injection(exchange_url, client_id):
    """The <script> that overrides the shipped auth constants.

    Only the exchange URL is required: the client id in index.html is public
    and correct for this App, so it is overridden only when explicitly given
    (e.g. to test against a second App).
    """
    lines = [f"window.__SY_GH_EXCHANGE_URL={_js_string(exchange_url)};"]
    if client_id:
        lines.append(f"window.__SY_GH_CLIENT_ID={_js_string(client_id)};")
    return "<script>" + "".join(lines) + "</script>"


def _js_string(value):
    """Quote a value for embedding in a <script> block.

    `</script>` inside a JS string literal would still close the element, so
    the slash is escaped. These values come from a developer's own command
    line rather than a network peer, but a server that mangles its own page on
    an odd argument is a bad way to spend an afternoon.
    """
    escaped = (
        str(value).replace("\\", "\\\\").replace("'", "\\'").replace("<", "\\x3c").replace("\n", "").replace("\r", "")
    )
    return "'" + escaped + "'"


def inject_into_head(html, script):
    """Put `script` first inside <head> so it runs before any app code."""
    marker = "<head>"
    at = html.find(marker)
    if at < 0:
        raise SystemExit("site/index.html has no <head> to inject into")
    at += len(marker)
    return html[:at] + script + html[at:]


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves site/ verbatim, except index.html, which gets the hooks."""

    script = ""

    def do_GET(self):  # noqa: N802 - BaseHTTPRequestHandler's spelling
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        if path in ("/", "/index.html"):
            self._send_injected_index()
            return
        super().do_GET()

    def _send_injected_index(self):
        with open(os.path.join(SITE_DIR, "index.html"), encoding="utf-8") as f:
            body = inject_into_head(f.read(), self.script).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        # The injected copy must never be cached: a stale one would silently
        # send a later session to the deployed Worker, which rejects localhost.
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # One line per request, without the noisy default timestamp prefix.
        print(f"{self.address_string()} - {fmt % args}")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--exchange-url", default=DEFAULT_EXCHANGE_URL)
    parser.add_argument(
        "--client-id",
        default="",
        help="override the App client id (defaults to the one in index.html)",
    )
    args = parser.parse_args(argv)

    Handler.script = injection(args.exchange_url, args.client_id)
    handler = functools.partial(Handler, directory=SITE_DIR)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        print(f"SPA        http://localhost:{args.port}/?repo=sy-tools/sy-subtitles")
        print(f"exchange   {args.exchange_url}")
        print("Ctrl-C to stop.")
        with contextlib.suppress(KeyboardInterrupt):
            httpd.serve_forever()


if __name__ == "__main__":
    main()
