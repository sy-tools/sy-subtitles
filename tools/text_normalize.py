"""Canonical text hygiene rules -- Python twin of site/js/text_sanitize.js.

Two independent concerns live here and are deliberately NOT merged:

* **Invisible characters** -- non-breaking and other odd spaces, zero-width
  characters, stray BOMs. These are noise in every language and may be applied
  to whole files.
* **Ukrainian typography** -- the quote/dash/apostrophe/ellipsis rules from
  glossary/CLAUDE.md. These apply to Ukrainian text ONLY; English legitimately
  uses `"` and an em dash, and YAML/JSON use `"` as syntax.

Keep this byte-for-byte equivalent to ``site/js/text_sanitize.js``. Both are
tested against the shared fixture ``tests/fixtures/text_hygiene_cases.json``
(tests/test_text_normalize_parity.py + tests/test_text_sanitize.js), so the two
cannot drift.

Every invisible character is written as an escape: this repository bans literal
NBSP in source, and a literal here would be unreadable anyway.
"""

import re

# Spaces that are not a plain space. Folded to U+0020.
ODD_SPACES = "\u00a0\u202f\u2002\u2003\u2007\u2009\u3000"

# Characters that carry no width. Deleted outright. U+FEFF is included; a
# LEADING byte-order mark is restored separately by sanitize_file_text.
ZERO_WIDTH = "\u200b\u200c\u200d\u00ad\ufeff"

_ODD_SPACE_RE = re.compile(f"[{ODD_SPACES}]")
_ZERO_WIDTH_RE = re.compile(f"[{ZERO_WIDTH}]")
# Tabs are folded together with line breaks: a field value is a single line.
_FIELD_BREAK_RE = re.compile("[\t\n\r\u2028\u2029]+")
_SPACE_RUN_RE = re.compile(" {2,}")


def sanitize_invisible(text: str) -> str:
    """Fold odd spaces to U+0020 and delete zero-width characters.

    Character-level only: newlines, tabs and whitespace runs are preserved, so
    this is the only variant safe to apply to whole file contents.
    """
    text = _ODD_SPACE_RE.sub(" ", text)
    return _ZERO_WIDTH_RE.sub("", text)


def sanitize_field_text(text: str) -> str:
    """Normalize a single-line field value (a subtitle block, a paragraph).

    On top of sanitize_invisible, line breaks and tabs become spaces, space runs
    collapse to one, and the ends are trimmed. Subtitles are single-line by
    project rule and transcripts are one line per paragraph, so a break inside a
    field value is always damage.
    """
    text = sanitize_invisible(text)
    text = _FIELD_BREAK_RE.sub(" ", text)
    return _SPACE_RUN_RE.sub(" ", text).strip()


def sanitize_file_text(text: str) -> str:
    """Normalize whole file contents: invisible characters and line endings.

    A LEADING byte-order mark is preserved -- the project's SRT format allows
    one -- while a BOM anywhere else is deleted as the stray it is.
    """
    bom = ""
    if text.startswith("\ufeff"):
        bom, text = "\ufeff", text[1:]
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return bom + sanitize_invisible(text)
