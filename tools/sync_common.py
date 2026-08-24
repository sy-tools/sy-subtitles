"""Shared helpers for the sync_srt_to_transcript / sync_transcript_to_srt
pair and the sync_pr driver on top of them.

Keeps git-base lookups and transcript text-splicing primitives in one
place so no single sync tool owns logic that another needs to call.
"""

import subprocess
from pathlib import Path


def load_base_from_git(sha: str, path: str, dest: Path) -> bool:
    """Write the `sha:path` version of a file to `dest`.

    Returns False ONLY when the file genuinely did not exist at that SHA
    (e.g. it was added in this PR). Uses `git show` with binary capture so
    content round-trips untouched.

    Any other git failure is raised. `git show` cannot say why it failed, and
    reading every failure as "the file is new" turns an unresolvable baseline
    into the sentence _plan_talk renders as "transcript is new in this PR —
    skip": an empty plan, exit 0, a green check, and not one human edit
    synced. That is the same failure-looks-like-success shape as a swallowed
    `git diff`, so the two possibilities are told apart explicitly.
    """
    try:
        data = subprocess.run(
            ["git", "show", f"{sha}:{path}"],
            capture_output=True,
            check=True,
        ).stdout
    except subprocess.CalledProcessError as exc:
        commit_resolves = (
            subprocess.run(
                ["git", "rev-parse", "--verify", "--quiet", f"{sha}^{{commit}}"],
                capture_output=True,
            ).returncode
            == 0
        )
        path_is_there = (
            subprocess.run(
                ["git", "cat-file", "-e", f"{sha}:{path}"],
                capture_output=True,
            ).returncode
            == 0
        )
        if commit_resolves and not path_is_there:
            return False
        raise RuntimeError(f"git show {sha}:{path} failed: {exc.stderr.decode('utf-8', 'replace').strip()}") from exc
    dest.write_bytes(data)
    return True


def find_in_text(text: str, needle: str, cursor: int) -> int:
    """Return position of `needle` in `text` starting at `cursor`, or -1.

    Thin wrapper around str.find with a consistent signature across the
    sync tools.
    """
    return text.find(needle, cursor)


def find_in_text_lenient(text: str, needle: str, cursor: int) -> int:
    """find_in_text, falling back to a case-insensitive search.

    Used for cursor tracking across blocks with benign case drift
    (manual capitalization edits) — a stalled cursor makes later
    duplicate-text operations pick the wrong occurrence.
    """
    pos = text.find(needle, cursor)
    if pos != -1:
        return pos
    return text.lower().find(needle.lower(), cursor)


def delete_from_text(text: str, cursor: int, needle: str) -> dict:
    """Remove the first occurrence of `needle` in `text` at/after `cursor`.

    Trims one adjacent space (if present) to avoid double-spaces. Returns
    a dict with `action` ("removed" or "skipped"), plus `text` and
    `cursor` when removed. Skipped means the text wasn't found — caller
    decides how to handle it.
    """
    pos = find_in_text(text, needle, cursor)
    if pos == -1:
        return {"action": "skipped"}
    end = pos + len(needle)
    if pos > 0 and text[pos - 1] == " ":
        pos -= 1
    elif end < len(text) and text[end] == " ":
        end += 1
    return {"action": "removed", "text": text[:pos] + text[end:], "cursor": pos}
