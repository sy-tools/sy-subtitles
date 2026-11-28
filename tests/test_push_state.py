"""`push-state.sh` lands generated data on a data-only branch with a plain push.

No pull request reviews that push and nothing serializes it but the remote
itself, so the script is held to three things:

* the branch is created when missing, as an orphan that holds no code;
* a push the remote refuses (the branch moved since it was read) is never
  sent again as it is: the generator runs again on top of what landed, so no
  update is lost and an older result never replaces a newer one;
* the checkout the script runs from is not disturbed.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
PUSH_STATE = REPO_ROOT / ".github" / "scripts" / "push-state.sh"
BRANCH = "state"
FILE = "review-status.json"

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git required")

APPENDING_GENERATOR = """
import os, subprocess, sys
from pathlib import Path

log = Path(os.environ["GEN_LOG"])
runs_logged = len(log.read_text().splitlines()) if log.exists() else 0
earlier_runs = runs_logged - int(os.environ["GEN_RUNS_BEFORE_THIS_CALL"])
log.write_text((log.read_text() if log.exists() else "") + "run\\n")

if os.environ.get("GEN_FAILS"):
    sys.exit(3)

rival_lands = os.environ.get("RIVAL_LANDS_DURING", "never")
if rival_lands == "every-run" or (rival_lands == "first-run" and earlier_runs == 0):
    subprocess.run(
        [sys.executable, os.environ["RIVAL_WRITER"], os.environ["RIVAL_CLONE"], f"rival{earlier_runs}"],
        check=True,
    )

target = Path(os.environ["STATE_DIR"]) / "review-status.json"
found = target.read_text() if target.exists() else ""
if os.environ.get("GEN_LEAVES_EXISTING_DATA") and found:
    sys.exit(0)
target.write_text(found + os.environ["GEN_VALUE"] + "\\n")
"""

RIVAL_WRITER = """
import subprocess, sys
from pathlib import Path

clone, value = Path(sys.argv[1]), sys.argv[2]

def git(*args, check=True):
    return subprocess.run(["git", *args], cwd=clone, check=check, capture_output=True, text=True)

if git("fetch", "origin", "state", check=False).returncode == 0:
    git("checkout", "-B", "state", "FETCH_HEAD")
else:
    git("checkout", "--orphan", "state")
    git("rm", "-rf", "--quiet", ".", check=False)
target = clone / "review-status.json"
target.write_text((target.read_text() if target.exists() else "") + value + "\\n")
git("add", "review-status.json")
git("commit", "-m", "rival " + value)
git("push", "origin", "state")
"""


def _env_without_user_git_config() -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env.update(
        GIT_CONFIG_GLOBAL=os.devnull,
        GIT_CONFIG_NOSYSTEM="1",
        GIT_AUTHOR_NAME="t",
        GIT_AUTHOR_EMAIL="t@t",
        GIT_COMMITTER_NAME="t",
        GIT_COMMITTER_EMAIL="t@t",
    )
    return env


def _git(*args: str, cwd: Path) -> str:
    result = subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True, env=_env_without_user_git_config()
    )
    return result.stdout.strip()


class Sandbox:
    def __init__(self, tmp_path: Path) -> None:
        self.tmp = tmp_path
        self.origin = tmp_path / "origin.git"
        subprocess.run(
            ["git", "init", "--bare", "-b", "main", str(self.origin)],
            check=True,
            capture_output=True,
            env=_env_without_user_git_config(),
        )
        self.main_checkout = self._clone("main_checkout", with_main_pushed=True)
        self.rival_clone = self._clone("rival_clone")
        self.generator = tmp_path / "generator.py"
        self.generator.write_text(APPENDING_GENERATOR, encoding="utf-8")
        self.rival_writer = tmp_path / "rival_writer.py"
        self.rival_writer.write_text(RIVAL_WRITER, encoding="utf-8")
        self.generator_log = tmp_path / "generator.log"

    def _clone(self, name: str, with_main_pushed: bool = False) -> Path:
        clone = self.tmp / name
        clone.mkdir()
        _git("init", "-b", "main", cwd=clone)
        _git("remote", "add", "origin", str(self.origin), cwd=clone)
        if with_main_pushed:
            (clone / "tools.py").write_text("code\n", encoding="utf-8")
            (clone / FILE).write_text("frozen copy on main\n", encoding="utf-8")
            _git("add", "-A", cwd=clone)
            _git("commit", "-m", "init", cwd=clone)
            _git("push", "-u", "origin", "main", cwd=clone)
        return clone

    def push_state(self, value: str, **env_overrides: str) -> subprocess.CompletedProcess:
        env = {
            **_env_without_user_git_config(),
            "GEN_LOG": str(self.generator_log),
            "GEN_RUNS_BEFORE_THIS_CALL": str(self.generator_runs()),
            "GEN_VALUE": value,
            "RIVAL_WRITER": str(self.rival_writer),
            "RIVAL_CLONE": str(self.rival_clone),
            "STATE_PUSH_RETRY_SECONDS": "0",
            **env_overrides,
        }
        return subprocess.run(
            ["bash", str(PUSH_STATE), BRANCH, "Update review status", sys.executable, str(self.generator)],
            cwd=self.main_checkout,
            env=env,
            capture_output=True,
            text=True,
        )

    def generator_runs(self) -> int:
        return len(self.generator_log.read_text().splitlines()) if self.generator_log.exists() else 0

    def origin_git(self, *args: str) -> str:
        return _git(*args, cwd=self.origin)

    def branch_exists(self) -> bool:
        return bool(self.origin_git("for-each-ref", f"refs/heads/{BRANCH}"))

    def published(self) -> str:
        return self.origin_git("show", f"{BRANCH}:{FILE}")

    def commit_subjects_newest_first(self) -> list[str]:
        return self.origin_git("log", "--format=%s", BRANCH).splitlines()


@pytest.fixture
def sandbox(tmp_path: Path) -> Sandbox:
    return Sandbox(tmp_path)


def _succeeded(result: subprocess.CompletedProcess) -> None:
    assert result.returncode == 0, f"push-state.sh failed:\n{result.stdout}\n{result.stderr}"


def test_first_run_creates_the_branch_as_an_orphan_holding_only_the_data(sandbox: Sandbox) -> None:
    _succeeded(sandbox.push_state("first"))

    assert sandbox.published() == "first"
    assert sandbox.origin_git("rev-list", "--count", BRANCH) == "1", "the data branch must not carry main's history"
    assert sandbox.origin_git("ls-tree", "-r", "--name-only", BRANCH) == FILE, "the data branch holds no code"
    assert sandbox.commit_subjects_newest_first() == ["Update review status"]


def test_generator_starts_from_what_the_branch_holds(sandbox: Sandbox) -> None:
    _succeeded(sandbox.push_state("first"))
    _succeeded(sandbox.push_state("second"))

    assert sandbox.published() == "first\nsecond"
    assert sandbox.origin_git("rev-list", "--count", BRANCH) == "2"


def test_unchanged_data_pushes_no_commit(sandbox: Sandbox) -> None:
    _succeeded(sandbox.push_state("first"))
    tip = sandbox.origin_git("rev-parse", BRANCH)

    _succeeded(sandbox.push_state("ignored", GEN_LEAVES_EXISTING_DATA="1"))

    assert sandbox.origin_git("rev-parse", BRANCH) == tip


def test_a_refused_push_regenerates_on_top_of_the_commit_that_won(sandbox: Sandbox) -> None:
    """Sending the first result again — rebased or forced — would publish data
    generated before the commit it lands on, undoing that commit's update."""
    _succeeded(sandbox.push_state("first"))

    _succeeded(sandbox.push_state("mine", RIVAL_LANDS_DURING="first-run"))

    assert sandbox.published() == "first\nrival0\nmine", "the rival's update was lost, or the result predates it"
    assert sandbox.generator_runs() == 3, "one run for the first push, two for the contested one"
    assert sandbox.commit_subjects_newest_first() == ["Update review status", "rival rival0", "Update review status"]


def test_two_first_runs_racing_to_create_the_branch_both_land(sandbox: Sandbox) -> None:
    _succeeded(sandbox.push_state("mine", RIVAL_LANDS_DURING="first-run"))

    assert sandbox.published() == "rival0\nmine"
    assert sandbox.origin_git("rev-list", "--max-parents=0", "--count", BRANCH) == "1", "one root, not two histories"


def test_gives_up_loudly_when_every_push_is_refused(sandbox: Sandbox) -> None:
    result = sandbox.push_state("mine", RIVAL_LANDS_DURING="every-run", STATE_PUSH_ATTEMPTS="3")

    assert result.returncode != 0
    assert "::error::" in result.stdout + result.stderr
    assert sandbox.generator_runs() == 3
    assert "mine" not in sandbox.published(), "a refused result must not reach the branch"


def test_a_failing_generator_publishes_nothing(sandbox: Sandbox) -> None:
    result = sandbox.push_state("mine", GEN_FAILS="1")

    assert result.returncode != 0
    assert not sandbox.branch_exists()


def test_an_unreadable_remote_is_an_error_not_a_missing_branch(sandbox: Sandbox) -> None:
    """Taking "could not ask" for "no such branch" would hand the generator an
    empty start and try to publish the result as a new root."""
    _succeeded(sandbox.push_state("first"))
    _git("remote", "set-url", "origin", str(sandbox.tmp / "gone.git"), cwd=sandbox.main_checkout)

    result = sandbox.push_state("mine")

    assert result.returncode != 0
    assert sandbox.generator_runs() == 1, "the generator ran against a branch that was never read"


def test_the_checkout_it_runs_from_is_left_as_it_was(sandbox: Sandbox) -> None:
    head = _git("rev-parse", "HEAD", cwd=sandbox.main_checkout)

    _succeeded(sandbox.push_state("first"))
    _succeeded(sandbox.push_state("second"))

    assert _git("rev-parse", "--abbrev-ref", "HEAD", cwd=sandbox.main_checkout) == "main"
    assert _git("rev-parse", "HEAD", cwd=sandbox.main_checkout) == head
    assert _git("status", "--porcelain", cwd=sandbox.main_checkout) == ""
    assert (sandbox.main_checkout / FILE).read_text(encoding="utf-8") == "frozen copy on main\n"
