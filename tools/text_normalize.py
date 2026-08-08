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

import argparse
import re
import subprocess
import sys
from pathlib import Path

# Spaces that are not a plain space. Folded to U+0020.
ODD_SPACES = "\u00a0\u202f\u2002\u2003\u2007\u2009\u3000"

# Characters that carry no width. Deleted outright. U+FEFF is included; a
# LEADING byte-order mark is restored separately by sanitize_file_text.
ZERO_WIDTH = "\u200b\u00ad\ufeff"

# ZWNJ/ZWJ are deleted only OUTSIDE Devanagari: between Devanagari characters
# they are orthographic (conjunct control -- e.g. the eyelash ra in Shri), and
# the repo carries Hindi transcripts and subtitles. Kept when EITHER neighbour
# is in U+0900-U+097F.
ZW_JOINERS = "\u200c\u200d"

_ODD_SPACE_RE = re.compile(f"[{ODD_SPACES}]")
_ZERO_WIDTH_RE = re.compile(f"[{ZERO_WIDTH}]")
_ZW_JOINER_RE = re.compile(f"(?<![\u0900-\u097f])[{ZW_JOINERS}](?![\u0900-\u097f])")
# Tabs are folded together with line breaks: a field value is a single line.
_FIELD_BREAK_RE = re.compile("[\t\n\r\u2028\u2029]+")
_SPACE_RUN_RE = re.compile(" {2,}")


def sanitize_invisible(text: str) -> str:
    """Fold odd spaces to U+0020 and delete zero-width characters.

    Character-level only: newlines, tabs and whitespace runs are preserved, so
    this is the only variant safe to apply to whole file contents.
    """
    text = _ODD_SPACE_RE.sub(" ", text)
    text = _ZW_JOINER_RE.sub("", text)
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


def sanitize_pasted_text(text: str) -> str:
    """Normalize a pasted FRAGMENT: invisible cleanup + flattened breaks only.

    No trim, no space-run collapse, no typography: a fragment has no caret
    context -- a leading space may be intended, and a leading straight quote
    may need to close rather than open. The store-level sanitize on the next
    input event and the focusout reconciliation finish the job.
    """
    text = sanitize_invisible(text)
    return _FIELD_BREAK_RE.sub(" ", text)


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


# --- Ukrainian typography (glossary/CLAUDE.md) --------------------------------

_APOSTROPHE_RE = re.compile("['‘ʼ]")
_DASH_RE = re.compile("[—‒−―]")
# A hyphen standing in for a dash: both sides open (space/tab or a line
# boundary). One-sided hyphens stay — `будь-хто` is a word, `-5` a number.
_HYPHEN_DASH_RE = re.compile(r"(?m)(?:(?<=[ \t])|^)-(?=[ \t]|$)")
# Horizontal whitespace only, so running this over a whole file cannot join
# lines. Restricted to a word character on the left: unrestricted stripping
# would glue the ellipsis onto a preceding dash.
_ELLIPSIS_SPACE_RE = re.compile(r"(?<=\w)[ \t]+\.\.\.")

# A straight quote following one of these opens; anything else closes. Includes
# the opening guillemet itself so that consecutive quotes nest rather than
# alternate.
_QUOTE_OPENS_AFTER = set(" \t\n\r([{«–")


def _resolve_straight_quotes(text: str) -> str:
    """Turn U+0022 into an opening or closing guillemet from its left neighbour.

    Counting cannot work here: quote state does not carry across subtitle
    blocks, so a counter is wrong whenever a quotation spans a block boundary.
    The neighbour rule is stateless and therefore block-independent. It reads
    the ALREADY-CONVERTED previous character, which is what makes two straight
    quotes in a row nest instead of alternating.
    """
    out: list[str] = []
    for ch in text:
        if ch == '"':
            prev = out[-1] if out else ""
            out.append("«" if prev == "" or prev in _QUOTE_OPENS_AFTER else "»")
        else:
            out.append(ch)
    return "".join(out)


def normalize_uk_typography(text: str) -> str:
    """Apply the Ukrainian orthography rules from glossary/CLAUDE.md.

    UKRAINIAN TEXT ONLY. English prose legitimately uses `"` and an em dash,
    and YAML/JSON use `"` as syntax; applying this to them corrupts them.
    """
    text = text.replace("“", "«").replace("„", "«").replace("”", "»")
    # Dashes before quotes: _QUOTE_OPENS_AFTER knows only the canonical en
    # dash, so a quote sitting right after an unconverted em dash would
    # resolve as closing.
    text = _DASH_RE.sub("–", text)
    text = _HYPHEN_DASH_RE.sub("–", text)
    text = _resolve_straight_quotes(text)
    text = _APOSTROPHE_RE.sub("’", text)
    text = text.replace("…", "...")
    return _ELLIPSIS_SPACE_RE.sub("...", text)


def sanitize_edited_text(text: str, lang: str) -> str:
    """Normalize one edited field value. The entry point the SPA mirrors.

    Invisible-character cleanup runs for every language; typography runs for
    Ukrainian only.
    """
    text = sanitize_field_text(text)
    if lang == "uk":
        text = normalize_uk_typography(text)
    return text


# --- Path classification -------------------------------------------------------

# Ukrainian content carrying prose. Everything else -- English and Hindi
# transcripts, meta.yaml, JSON artefacts, source code -- gets invisible-character
# cleanup only. No Ukrainian JSON artefact is tracked under talks/ today; the
# only uk_blocks.json files live under tests/fixtures, which is not scanned.
_UK_CONTENT_RE = re.compile(r"(^|/)(transcript_uk\.txt|uk\.txt|[^/]*uk[^/]*\.srt)$")

# Fixtures are captured raw input -- amruta page dumps, pipeline snapshots. They
# contain dirty text BY DESIGN and must never be rewritten or flagged.
_UNSCANNED_PREFIXES = ("tests/fixtures/",)


def is_uk_content_path(path: str) -> bool:
    """True when Ukrainian typography rules apply to this file."""
    return bool(_UK_CONTENT_RE.search(path.replace("\\", "/")))


def is_scanned_path(path: str) -> bool:
    """True when the file is subject to the hygiene guard at all."""
    return not path.replace("\\", "/").startswith(_UNSCANNED_PREFIXES)


# --- Whole-file check / fix ----------------------------------------------------


def _normalize_uk_file(text: str) -> str:
    """Whole-file typography: the leading BOM must not act as a character.

    Without stripping it first, a straight quote right after the BOM would see
    U+FEFF as its left neighbour and resolve as CLOSING. Used by both fix_text
    and the check_text gate so the two stay in agreement by construction.
    """
    bom = ""
    if text.startswith("\ufeff"):
        bom, text = "\ufeff", text[1:]
    return bom + normalize_uk_typography(text)


def fix_text(text: str, *, uk: bool) -> str:
    """Return ``text`` with every hygiene rule that applies to it enforced."""
    text = sanitize_file_text(text)
    if uk:
        text = _normalize_uk_file(text)
    return text


_UK_BANNED = (
    ('"', "straight double quote"),
    ("'", "straight apostrophe"),
    ("‘", "left single quote"),
    ("ʼ", "modifier apostrophe"),
    ("“", "left double quote"),
    ("”", "right double quote"),
    ("„", "low double quote"),
    ("—", "em dash"),
    ("‒", "figure dash"),
    ("−", "minus sign"),
    ("―", "horizontal bar"),
    ("…", "ellipsis character"),
)


def check_text(text: str, *, uk: bool) -> list[str]:
    """Describe every hygiene violation in ``text``; empty list means clean.

    Kept in exact agreement with fix_text by
    tests/test_text_normalize.py::TestCheckFixAgreement -- a guard that demanded
    something the fixer does not produce would leave the corpus un-cleanable.
    That is why the typography branch is gated on fix_text actually changing
    something; the loop below only turns that single fact into readable text.
    """
    issues: list[str] = []
    if "\r" in text:
        issues.append("CRLF or CR line endings")
    body = text[1:] if text.startswith("\ufeff") else text
    for ch in sorted(set(body)):
        if ch in ODD_SPACES:
            issues.append(f"U+{ord(ch):04X} non-plain space")
        elif ch in ZERO_WIDTH:
            issues.append(f"U+{ord(ch):04X} zero-width character")
    # ZWNJ/ZWJ are contextual: an offence only where the fixer would delete
    # them (outside Devanagari), or check and fix would disagree.
    for ch in sorted(set(_ZW_JOINER_RE.findall(body))):
        issues.append(f"U+{ord(ch):04X} zero-width joiner outside Devanagari")
    if uk:
        cleaned = sanitize_file_text(text)
        if _normalize_uk_file(cleaned) != cleaned:
            for ch, label in _UK_BANNED:
                if ch in text:
                    issues.append(f"U+{ord(ch):04X} {label} (use the glossary form)")
            # Not a banned CHARACTER — a hyphen is legitimate inside words and
            # numbers — so it gets its own positional check.
            if _HYPHEN_DASH_RE.search(cleaned):
                issues.append("hyphen standing in for a dash (use – U+2013)")
            if _ELLIPSIS_SPACE_RE.search(cleaned):
                issues.append("space before an ellipsis")
    return issues


# --- CLI -----------------------------------------------------------------------


def _relativize(path: str) -> str:
    """Repo-relative form of ``path`` when it lies under the CWD, else as-is.

    Classification is prefix-based, so an absolute path to a fixture would
    silently dodge the exemption without this.
    """
    try:
        return Path(path).resolve().relative_to(Path.cwd()).as_posix()
    except ValueError:
        return path


def _iter_paths(paths: list[str]) -> list[str]:
    """Expand the given paths, or every git-tracked file when none are given."""
    if paths:
        return [p for p in paths if is_scanned_path(_relativize(p))]
    tracked = subprocess.run(["git", "ls-files"], capture_output=True, text=True, check=True).stdout.splitlines()
    return [p for p in tracked if p and is_scanned_path(p)]


def _read_text(path: str) -> tuple[str | None, str | None]:
    """Return ``(text, problem)`` for the file.

    ``(text, None)`` — decoded UTF-8 text. ``(None, None)`` — binary or
    unreadable, not this tool's business. ``(None, message)`` — a text file
    that is not valid UTF-8: the guard must flag it, not skip it silently.
    """
    try:
        raw = Path(path).read_bytes()
    except OSError:
        return None, None
    # Sniff UTF-16 BOMs BEFORE the NUL check: UTF-16 text is full of NUL bytes
    # and would otherwise be classified as binary and silently skipped --
    # and UTF-16 is the most common Windows mis-encoding of a transcript.
    if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
        return None, "UTF-16 encoding (expected UTF-8)"
    if b"\x00" in raw[:8000]:
        return None, None
    try:
        return raw.decode("utf-8"), None
    except UnicodeDecodeError:
        return None, "not valid UTF-8"


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Check or fix text hygiene across the repository.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="report violations and exit 1 without writing")
    mode.add_argument("--fix", action="store_true", help="rewrite offending files in place")
    parser.add_argument("paths", nargs="*", help="files to process (default: every git-tracked file)")
    args = parser.parse_args(argv)

    offenders = 0
    for path in _iter_paths(args.paths):
        text, problem = _read_text(path)
        if problem:
            if args.check:
                offenders += 1
                print(f"{path}: {problem}")
            else:
                # The fixer cannot guess the encoding; warn instead of corrupt.
                print(f"cannot fix {path}: {problem}", file=sys.stderr)
            continue
        if text is None:
            continue
        uk = is_uk_content_path(path)
        if args.check:
            issues = check_text(text, uk=uk)
            if issues:
                offenders += 1
                for issue in issues:
                    print(f"{path}: {issue}")
        else:
            fixed = fix_text(text, uk=uk)
            if fixed != text:
                offenders += 1
                # newline="" is essential: without it Python re-expands \n to the
                # platform line ending and undoes the CRLF fix on Windows.
                Path(path).write_text(fixed, encoding="utf-8", newline="")
                print(f"fixed: {path}")

    verb = "violating" if args.check else "fixed"
    print(f"{offenders} file(s) {verb}")
    if args.check and offenders:
        print("run `python -m tools.text_normalize --fix` to repair")
        sys.exit(1)


if __name__ == "__main__":
    main()
