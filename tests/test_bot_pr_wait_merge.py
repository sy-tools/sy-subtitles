"""`bot-pr.sh` can hold its job until the PR it opened has actually merged.

sync-review-status serializes its runs, but a run that ends the moment it
enables auto-merge ends before the PR merges. Issue events arrive in bursts (an
issue created with two labels fires two `labeled` events), so the next run
would check out a `main` without the previous status and rewrite the same lines
(`updated_at` always changes); once the first PR merged, the second would
conflict and its auto-merge would never fire. Waiting makes the serialization
real.
"""

import os
import shutil
import subprocess
from pathlib import Path

import pytest

from tests.test_bot_pr_base import BOT_PR, repo  # noqa: F401  — fixture re-export

# Answers `pr view` with the next state from GH_PR_STATES (the last one repeats).
FAKE_GH = """#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_CALL_LOG"
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  echo "https://github.com/o/r/pull/1"
elif [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  n=$(cat "$GH_VIEW_COUNT" 2>/dev/null || echo 0)
  IFS=, read -ra states <<< "$GH_PR_STATES"
  i=$(( n < ${#states[@]} ? n : ${#states[@]} - 1 ))
  echo $((n + 1)) > "$GH_VIEW_COUNT"
  echo "${states[$i]}"
fi
exit 0
"""


def _run(repo: Path, tmp_path: Path, **env_overrides: str) -> tuple[subprocess.CompletedProcess, list[str]]:  # noqa: F811
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    gh = bin_dir / "gh"
    gh.write_text(FAKE_GH, encoding="utf-8")
    gh.chmod(0o755)
    log = tmp_path / "gh_calls.log"
    log.write_text("", encoding="utf-8")

    env = {
        **os.environ,
        "PATH": f"{bin_dir}{os.pathsep}{os.environ['PATH']}",
        "GH_CALL_LOG": str(log),
        "GH_VIEW_COUNT": str(tmp_path / "view_count"),
        "GH_TOKEN": "fake",
        "GITHUB_REF_NAME": "feature/x",
        "BOT_PR_POLL_SECONDS": "0",
    }
    env.pop("BOT_PR_BASE", None)
    env.pop("BOT_PR_WAIT_MERGE_SECONDS", None)
    env.update(env_overrides)
    result = subprocess.run(
        ["bash", str(BOT_PR), "bot/test", "Test commit", "review-status.json"],
        cwd=repo,
        env=env,
        capture_output=True,
        text=True,
    )
    calls = [ln for ln in log.read_text(encoding="utf-8").splitlines() if ln.strip()]
    return result, calls


def _views(calls: list[str]) -> list[str]:
    return [c for c in calls if c.startswith("pr view")]


pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git required")


def test_without_the_wait_setting_the_script_does_not_poll(repo: Path, tmp_path: Path) -> None:  # noqa: F811
    result, calls = _run(repo, tmp_path, GH_PR_STATES="OPEN")
    assert result.returncode == 0, result.stderr
    assert _views(calls) == []


def test_waits_until_the_pr_has_merged(repo: Path, tmp_path: Path) -> None:  # noqa: F811
    result, calls = _run(repo, tmp_path, BOT_PR_WAIT_MERGE_SECONDS="60", GH_PR_STATES="OPEN,OPEN,MERGED")
    assert result.returncode == 0, result.stdout + result.stderr
    assert len(_views(calls)) == 3


def test_a_pr_closed_without_merging_fails_the_job(repo: Path, tmp_path: Path) -> None:  # noqa: F811
    result, _ = _run(repo, tmp_path, BOT_PR_WAIT_MERGE_SECONDS="60", GH_PR_STATES="OPEN,CLOSED")
    assert result.returncode != 0
    assert "::error::" in result.stdout


def test_a_pr_that_never_merges_fails_at_the_deadline(repo: Path, tmp_path: Path) -> None:  # noqa: F811
    result, calls = _run(repo, tmp_path, BOT_PR_WAIT_MERGE_SECONDS="0", GH_PR_STATES="OPEN")
    assert result.returncode != 0
    assert "::error::" in result.stdout
    assert len(_views(calls)) >= 1
