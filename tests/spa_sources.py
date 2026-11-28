"""The app's JavaScript as the browser gets it: index.html and every script it loads.

A guard that says "nowhere in the app" has to read all of it. One that reads
index.html alone stops seeing a line the day it moves into a module, and stays
green.

JS twin: tests/spa_sources.js.
"""

import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
INDEX = "index.html"
# Third-party code answers to none of the app's conventions.
VENDOR = "js/vendor/"

# Tolerant of other attributes (`defer`, `type="module"`), as the precache
# lockstep in test_sw_precache.js is.
_SCRIPT_TAG = re.compile(r'<script\b[^>]*\bsrc="(js/[^"]+\.js)"')


def index_html() -> str:
    return (SITE / INDEX).read_text(encoding="utf-8")


def loaded_script_paths(html: str) -> list[str]:
    """The local scripts a page loads, in tag order — read from the tags, never listed by hand."""
    return [src for src in _SCRIPT_TAG.findall(html) if not src.startswith(VENDOR)]


def spa_sources() -> list[tuple[str, str]]:
    """(name, text) pairs: index.html first, then the scripts in load order."""
    html = index_html()
    scripts = [(name, (SITE / name).read_text(encoding="utf-8")) for name in loaded_script_paths(html)]
    return [(INDEX, html), *scripts]


def sources_mentioning(needle: str, except_: tuple[str, ...] = ()) -> list[str]:
    """The names of the sources `needle` occurs in.

    `except_` names the one module that owns the thing and so may spell it out.
    """
    return [name for name, text in spa_sources() if name not in except_ and needle in text]
