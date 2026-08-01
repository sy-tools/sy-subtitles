"""CI guard: no invisible characters anywhere, no typography drift in UK content.

Two vectors keep reintroducing non-breaking spaces. The SPA's `contenteditable`
fields inject them and commit straight to GitHub (stopped at the input layer in
site/js/text_sanitize.js); amruta downloads fetch .srt verbatim with CRLF, stray
BOMs and NBSP. This test is the backstop for every other path -- hand-integrated
translator documents, direct commits, GitHub's web editor.

Level A (invisible characters, CRLF) applies to every tracked text file.
Level B (Ukrainian typography per glossary/CLAUDE.md) applies to UK content only
-- English prose legitimately uses a straight double quote and an em dash.

tests/fixtures/** is excluded: those files hold captured dirty input BY DESIGN.
Deliberate invisible characters elsewhere must be written as escapes.
"""

import subprocess
from pathlib import Path

import pytest

from tools.text_normalize import check_text, is_scanned_path, is_uk_content_path

_ROOT = Path(__file__).resolve().parent.parent


def _tracked_text_files() -> list[str]:
    out = subprocess.run(["git", "ls-files"], cwd=_ROOT, capture_output=True, text=True, check=True).stdout.splitlines()
    return [p for p in out if p and is_scanned_path(p)]


def _read(path: str) -> str | None:
    """Return the file's UTF-8 text, or None when it is binary or unreadable."""
    try:
        raw = (_ROOT / path).read_bytes()
    except OSError:
        return None
    if b"\x00" in raw[:8000]:
        return None
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return None


def test_no_hygiene_violations_in_tracked_files():
    offenders = []
    for path in _tracked_text_files():
        text = _read(path)
        if text is None:
            continue
        for issue in check_text(text, uk=is_uk_content_path(path)):
            offenders.append(f"{path}: {issue}")
    assert not offenders, (
        "text hygiene violations found -- run `python -m tools.text_normalize --fix`:\n"
        + "\n".join(offenders[:40])
        + (f"\n... and {len(offenders) - 40} more" if len(offenders) > 40 else "")
    )


def test_the_guard_actually_detects_dirt():
    """A guard that matches nothing passes silently forever."""
    assert check_text("a\u00a0b", uk=False), "NBSP not detected"
    assert check_text("a\u200bb", uk=False), "ZWSP not detected"
    assert check_text("a\r\nb", uk=False), "CRLF not detected"
    assert check_text("м'ясо", uk=True), "UK typography drift not detected"
    assert not check_text("м’ясо", uk=True), "clean UK text falsely flagged"


def test_the_guard_scans_a_meaningful_number_of_files():
    """Guards against a path-classification bug silently emptying the scan."""
    assert len(_tracked_text_files()) > 500


def test_the_guard_covers_uk_content():
    """The level-B scan must actually reach Ukrainian files, not just level A."""
    uk = [p for p in _tracked_text_files() if is_uk_content_path(p)]
    assert len(uk) > 100, f"only {len(uk)} UK content files classified"


@pytest.mark.parametrize(
    "path,expected",
    [
        ("talks/x/transcript_uk.txt", True),
        ("talks/x/v/final/uk.srt", True),
        ("talks/x/transcript_en.txt", False),
        ("talks/x/v/source/en.srt", False),
        ("talks/x/meta.yaml", False),
    ],
)
def test_uk_classification(path, expected):
    assert is_uk_content_path(path) is expected
