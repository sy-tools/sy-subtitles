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

from tools.text_normalize import _read_text, check_text, is_scanned_path, is_uk_content_path

_ROOT = Path(__file__).resolve().parent.parent


def _tracked_text_files(root: Path = _ROOT) -> list[str]:
    out = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True, check=True).stdout.splitlines()
    return [p for p in out if p and is_scanned_path(p)]


def _scan(root: Path) -> list[str]:
    """Every hygiene offence in the tree, `path: issue` per line.

    Shares tools.text_normalize._read_text with the CLI so a mis-encoded file
    is an offence in both places, not a silent skip in one of them.
    """
    offenders = []
    for path in _tracked_text_files(root):
        text, problem = _read_text(str(root / path))
        if problem:
            offenders.append(f"{path}: {problem}")
            continue
        if text is None:
            continue
        for issue in check_text(text, uk=is_uk_content_path(path)):
            offenders.append(f"{path}: {issue}")
    return offenders


def test_no_hygiene_violations_in_tracked_files():
    offenders = _scan(_ROOT)
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
    assert check_text("слово - слово", uk=True), "hyphen-as-dash not detected"
    assert not check_text("м’ясо", uk=True), "clean UK text falsely flagged"


def test_the_guard_flags_a_non_utf8_tracked_file(tmp_path):
    """A mis-encoded text file must be an offence, not a silent skip."""
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    bad = tmp_path / "transcript_uk.txt"
    bad.write_bytes("Привіт світ\n".encode("cp1251"))
    subprocess.run(["git", "-C", str(tmp_path), "add", "transcript_uk.txt"], check=True)
    assert _scan(tmp_path) == ["transcript_uk.txt: not valid UTF-8"]


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
