"""The publish step of sync-review-status.yml, run as the workflow writes it.

The step's own `run:` script is taken from the workflow file and executed
against a local `origin`, with `gh` replaced by a double that lists issues.
Everything between the issues and the pushed commit is therefore the real
thing: the quoting that hands `$STATE_DIR` to the generator, push-state.sh,
sync-review-status.py and its seed.

The checkout is a `--depth=1` clone, as actions/checkout leaves it.
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from tests.test_push_state import _env_without_user_git_config, _git

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "sync-review-status.yml"
SCRIPTS = REPO_ROOT / ".github" / "scripts"
TALK = "1987-04-19_Easter-Puja-Materialism"
ISSUELESS_TALK = "1970-01-01_Entered-By-Hand"
SEED_STAMP = "2026-11-28T06:11:38.128059+00:00"

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git required")

FAKE_GH = """#!/usr/bin/env bash
if [ "$1" = "issue" ] && [ "$2" = "list" ]; then
  cat "$GH_ISSUES_JSON"
  exit 0
fi
echo "unexpected gh call: $*" >&2
exit 1
"""


def _publish_script() -> str:
    steps = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))["jobs"]["sync"]["steps"]
    return next(s["run"] for s in steps if "push-state.sh" in str(s.get("run", "")))


def _review_issue(label: str) -> dict:
    return {
        "number": 411,
        "title": f"Review: {TALK}",
        "labels": [{"name": "talk-review"}, {"name": label}],
        "assignees": [{"login": "IrynaFilSY"}],
        "updatedAt": "2026-11-28T09:00:00Z",
    }


class Runner:
    def __init__(self, tmp_path: Path) -> None:
        self.tmp = tmp_path
        self.origin = tmp_path / "origin.git"
        subprocess.run(
            ["git", "init", "--bare", "-b", "main", str(self.origin)],
            check=True,
            capture_output=True,
            env=_env_without_user_git_config(),
        )
        self._push_main()
        self.checkout = tmp_path / "checkout"
        _git("clone", "--depth=1", f"file://{self.origin}", str(self.checkout), cwd=tmp_path)
        self.issues_json = tmp_path / "issues.json"
        self.bin = tmp_path / "bin"
        self.bin.mkdir()
        (self.bin / "gh").write_text(FAKE_GH, encoding="utf-8")
        (self.bin / "gh").chmod(0o755)
        (self.bin / "python3").symlink_to(sys.executable)

    def _push_main(self) -> None:
        seed = self.tmp / "seed"
        seed.mkdir()
        _git("init", "-b", "main", cwd=seed)
        shutil.copytree(SCRIPTS, seed / ".github" / "scripts", ignore=shutil.ignore_patterns("__pycache__"))
        (seed / "talks" / TALK).mkdir(parents=True)
        (seed / "talks" / TALK / "meta.yaml").write_text("title: t\n", encoding="utf-8")
        frozen = {
            "version": 1,
            "updated_at": SEED_STAMP,
            "talks": {ISSUELESS_TALK: {"status": "approved", "reviewer": "someone", "issue_number": None}},
        }
        (seed / "review-status.json").write_text(json.dumps(frozen), encoding="utf-8")
        _git("add", "-A", cwd=seed)
        _git("commit", "-m", "init", cwd=seed)
        _git("remote", "add", "origin", str(self.origin), cwd=seed)
        _git("push", "origin", "main", cwd=seed)

    def publish(self, issues: list[dict]) -> subprocess.CompletedProcess:
        self.issues_json.write_text(json.dumps(issues), encoding="utf-8")
        env = {
            **_env_without_user_git_config(),
            "PATH": f"{self.bin}{os.pathsep}{os.environ['PATH']}",
            "GH_ISSUES_JSON": str(self.issues_json),
            "GH_TOKEN": "fake",
            "STATE_PUSH_RETRY_SECONDS": "0",
        }
        return subprocess.run(
            ["bash", "-e", "-o", "pipefail", "-c", _publish_script()],
            cwd=self.checkout,
            env=env,
            capture_output=True,
            text=True,
        )

    def published(self) -> dict:
        return json.loads(_git("show", "state:review-status.json", cwd=self.origin))

    def state_commits(self) -> int:
        return int(_git("rev-list", "--count", "state", cwd=self.origin))


@pytest.fixture
def runner(tmp_path: Path) -> Runner:
    return Runner(tmp_path)


def _succeeded(result: subprocess.CompletedProcess) -> None:
    assert result.returncode == 0, f"publish step failed:\n{result.stdout}\n{result.stderr}"


def test_first_run_creates_the_state_branch_seeded_from_the_copy_on_main(runner: Runner) -> None:
    _succeeded(runner.publish([_review_issue("review:in-progress")]))

    document = runner.published()
    assert document["talks"][TALK]["status"] == "in-progress"
    assert document["talks"][TALK]["reviewer"] == "IrynaFilSY"
    assert ISSUELESS_TALK in document["talks"], "the entry no issue covers was not carried over from main"
    assert document["updated_at"] > SEED_STAMP
    assert _git("ls-tree", "-r", "--name-only", "state", cwd=runner.origin) == "review-status.json"
    assert runner.state_commits() == 1


def test_a_label_change_lands_as_one_more_commit_on_the_branch(runner: Runner) -> None:
    _succeeded(runner.publish([_review_issue("review:in-progress")]))
    first_stamp = runner.published()["updated_at"]

    _succeeded(runner.publish([_review_issue("review:approved")]))

    document = runner.published()
    assert document["talks"][TALK]["status"] == "approved"
    assert document["updated_at"] > first_stamp
    assert runner.state_commits() == 2


def test_a_run_that_finds_nothing_changed_publishes_no_commit(runner: Runner) -> None:
    _succeeded(runner.publish([_review_issue("review:in-progress")]))
    first = runner.published()

    _succeeded(runner.publish([_review_issue("review:in-progress")]))

    assert runner.state_commits() == 1
    assert runner.published() == first


def test_main_is_never_touched(runner: Runner) -> None:
    main_before = _git("rev-parse", "main", cwd=runner.origin)

    _succeeded(runner.publish([_review_issue("review:in-progress")]))
    _succeeded(runner.publish([_review_issue("review:approved")]))

    assert _git("rev-parse", "main", cwd=runner.origin) == main_before
    assert _git("status", "--porcelain", cwd=runner.checkout) == ""
