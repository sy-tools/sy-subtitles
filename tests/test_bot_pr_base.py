"""`bot-pr.sh` must open its PR against the ref the workflow ran from.

The base was hardcoded to `main`. Dispatching a workflow from a feature branch
therefore cut the bot branch off that feature branch and opened a PR from it
into `main` — auto-merged, so the *whole* feature branch landed on main as a
side effect of asking for a build. That happened on 2026-07-31: a build-only
pipeline run dispatched from `rebuild/2000-07-23-guru-puja` merged an entire
unreviewed tooling PR into main.

Artifacts belong on the branch that asked for them.
"""

import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
BOT_PR = REPO_ROOT / ".github" / "scripts" / "bot-pr.sh"

# Records every argv it is called with, one call per line, then answers the
# two questions bot-pr.sh asks: the PR URL, and whether merging worked.
FAKE_GH = """#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$GH_CALL_LOG"
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  echo "https://github.com/o/r/pull/1"
fi
exit 0
"""


def _git(*args: str, cwd: Path) -> None:
    subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True)


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    """A work repo on branch `feature/x`, with a bare `origin` to push to."""
    origin = tmp_path / "origin.git"
    subprocess.run(["git", "init", "--bare", "-b", "main", str(origin)], check=True, capture_output=True)

    work = tmp_path / "work"
    work.mkdir()
    _git("init", "-b", "main", cwd=work)
    _git("config", "user.email", "t@t", cwd=work)
    _git("config", "user.name", "t", cwd=work)
    (work / "review-status.json").write_text("{}\n", encoding="utf-8")
    _git("add", "-A", cwd=work)
    _git("commit", "-m", "init", cwd=work)
    _git("remote", "add", "origin", str(origin), cwd=work)
    _git("push", "-u", "origin", "main", cwd=work)

    _git("checkout", "-b", "feature/x", cwd=work)
    (work / "review-status.json").write_text('{"changed": true}\n', encoding="utf-8")
    return work


def _run_bot_pr(repo: Path, tmp_path: Path, **env_overrides: str) -> list[str]:
    """Run bot-pr.sh with a fake `gh`; return the argv line of each gh call."""
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
        "GH_TOKEN": "fake",
    }
    env.pop("GITHUB_REF_NAME", None)
    env.pop("BOT_PR_BASE", None)
    env.update(env_overrides)

    result = subprocess.run(
        ["bash", str(BOT_PR), "bot/test", "Test commit", "review-status.json"],
        cwd=repo,
        env=env,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"bot-pr.sh failed:\n{result.stdout}\n{result.stderr}"
    return [ln for ln in log.read_text(encoding="utf-8").splitlines() if ln.strip()]


def _pr_create_call(calls: list[str]) -> str:
    matches = [c for c in calls if c.startswith("pr create")]
    assert len(matches) == 1, f"expected exactly one `gh pr create`, got: {calls}"
    return matches[0]


@pytest.mark.skipif(shutil.which("git") is None, reason="git required")
def test_pr_base_is_the_dispatch_ref_not_main(repo: Path, tmp_path: Path) -> None:
    """Dispatched from a feature branch → the PR targets that branch.

    Regression: `--base main` merged the entire dispatch branch into main.
    """
    calls = _run_bot_pr(repo, tmp_path, GITHUB_REF_NAME="feature/x")
    assert "--base feature/x" in _pr_create_call(calls)


@pytest.mark.skipif(shutil.which("git") is None, reason="git required")
def test_pr_base_is_main_when_running_on_main(repo: Path, tmp_path: Path) -> None:
    """The normal path is unchanged: on main, the PR targets main."""
    _git("checkout", "main", cwd=repo)
    (repo / "review-status.json").write_text('{"changed": true}\n', encoding="utf-8")
    calls = _run_bot_pr(repo, tmp_path, GITHUB_REF_NAME="main")
    assert "--base main" in _pr_create_call(calls)


@pytest.mark.skipif(shutil.which("git") is None, reason="git required")
def test_pr_base_falls_back_to_main_outside_actions(repo: Path, tmp_path: Path) -> None:
    """No GITHUB_REF_NAME (a local run) → main, as before."""
    calls = _run_bot_pr(repo, tmp_path)
    assert "--base main" in _pr_create_call(calls)


@pytest.mark.skipif(shutil.which("git") is None, reason="git required")
def test_pr_base_can_be_overridden_explicitly(repo: Path, tmp_path: Path) -> None:
    """A caller that genuinely wants another target can say so."""
    calls = _run_bot_pr(repo, tmp_path, GITHUB_REF_NAME="feature/x", BOT_PR_BASE="main")
    assert "--base main" in _pr_create_call(calls)


@pytest.mark.skipif(shutil.which("git") is None, reason="git required")
def test_pr_base_ignores_a_pull_request_merge_ref(repo: Path, tmp_path: Path) -> None:
    """On a `pull_request` event GITHUB_REF_NAME is `123/merge`, which is not a
    branch anyone can merge into. Fall back to main rather than open a PR
    against a ref that cannot be a base."""
    calls = _run_bot_pr(repo, tmp_path, GITHUB_REF_NAME="123/merge")
    assert "--base main" in _pr_create_call(calls)


@pytest.mark.skipif(shutil.which("git") is None, reason="git required")
def test_bot_branch_is_pushed_before_the_pr_is_opened(repo: Path, tmp_path: Path) -> None:
    """Sanity: the script still does its job end to end under the fake gh."""
    calls = _run_bot_pr(repo, tmp_path, GITHUB_REF_NAME="feature/x")
    assert any(c.startswith("pr merge") for c in calls), calls
    branches = subprocess.run(["git", "branch", "-r"], cwd=repo, capture_output=True, text=True, check=True).stdout
    assert "origin/bot/test/" in branches, branches
