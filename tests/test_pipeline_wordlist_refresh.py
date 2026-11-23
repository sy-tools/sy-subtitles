"""Structural guard: the typo-hint wordlist is refreshed on main, after merge.

``site/dict/words_uk.txt`` is generated from the corpus — every
``talks/*/transcript_uk.txt``, every ``talks/*/*/final/uk.srt`` and the
glossary — and committed. It is one sorted file shared by every talk.

The pipeline's commit job used to rebuild it and ship it inside each talk's bot
PR. Twenty talks run in parallel; each rebuilt the list from the same old main,
and their new words landed on neighbouring lines of the sorted file. Once the
first PR merged, the rest went `dirty` on that file alone and their auto-merge
never fired (#1583, #1602, #1605 on 2026-11-23 had to be rebuilt by hand).

So the per-talk PR carries only the talk's own files, and
``wordlist-refresh.yml`` rebuilds the list from the latest main once those land,
one serialized bot PR at a time. ``ci.yml`` checks the list only on a pull
request that touches the list's own inputs other than talks: a talk-only PR
whose base is momentarily behind the refresh must not go red for it.
"""

import os
import shlex
import subprocess
from pathlib import Path

import pytest
import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = REPO_ROOT / ".github" / "workflows"
WORDLIST = "site/dict/words_uk.txt"
REFRESH_WORKFLOW = "wordlist-refresh.yml"
CHECK_STEP = "Typo-hint wordlist is current"


def _load(name: str) -> dict:
    return yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))


def _refresh_job() -> dict:
    return _load(REFRESH_WORKFLOW)["jobs"]["refresh"]


def _index(steps: list[dict], pred) -> int:
    for i, step in enumerate(steps):
        if pred(step):
            return i
    raise AssertionError("step not found")


def _runs(text: str):
    return lambda step: text in str(step.get("run", ""))


def test_pipeline_commit_job_does_not_rebuild_the_shared_wordlist() -> None:
    steps = _load("subtitle-pipeline.yml")["jobs"]["commit"]["steps"]
    assert not any("build_wordlist" in str(s.get("run", "")) for s in steps), (
        "a per-talk rebuild of the shared list is what made parallel pipeline PRs conflict"
    )


def test_pipeline_bot_pr_does_not_stage_the_shared_wordlist() -> None:
    steps = _load("subtitle-pipeline.yml")["jobs"]["commit"]["steps"]
    bot_pr = steps[_index(steps, _runs("bot-pr.sh"))]["run"]
    assert WORDLIST not in bot_pr, "the talk PR must carry only the talk's files"


def test_refresh_runs_when_its_inputs_land_on_main() -> None:
    on = _load(REFRESH_WORKFLOW)[True]
    assert on["push"]["branches"] == ["main"]
    assert set(on["push"]["paths"]) == {
        "talks/*/transcript_uk.txt",
        "talks/*/*/final/uk.srt",
        "glossary/**",
    }
    assert "workflow_dispatch" in on, "a merge made with GITHUB_TOKEN starts no push run; a person must be able to"


def test_refresh_does_not_trigger_itself() -> None:
    paths = _load(REFRESH_WORKFLOW)[True]["push"]["paths"]
    assert not any(p.startswith("site/") for p in paths), "its own PR merging must not wake it again"


def test_refresh_runs_are_serialized_and_a_burst_collapses() -> None:
    """One running, at most one pending — GitHub replaces a pending run with a
    newer one. The running one is NOT cancelled: it may already have opened its
    PR, and a newer PR built beside it would conflict with it on this very file."""
    concurrency = _refresh_job()["concurrency"]
    assert concurrency["group"] == "wordlist-refresh"
    assert concurrency["cancel-in-progress"] is False


def test_refresh_builds_from_the_live_main_tip() -> None:
    steps = _refresh_job()["steps"]
    checkout = steps[_index(steps, lambda s: str(s.get("uses", "")).startswith("actions/checkout@"))]
    assert checkout["with"]["ref"] == "main", "a queued run must see every talk merged while it waited"


def test_refresh_writes_the_list_and_fails_loudly() -> None:
    steps = _refresh_job()["steps"]
    build = steps[_index(steps, _runs("tools.build_wordlist"))]
    assert "--check" not in build["run"], "the refresh must WRITE the list, not merely assert it"
    assert not build.get("continue-on-error")
    installs = _index(steps, _runs("pip install -r requirements.txt"))
    assert installs < _index(steps, _runs("tools.build_wordlist"))


def test_refresh_commits_only_the_wordlist_and_waits_for_the_merge() -> None:
    steps = _refresh_job()["steps"]
    build = _index(steps, _runs("tools.build_wordlist"))
    bot_pr_i = _index(steps, _runs("bot-pr.sh"))
    assert build < bot_pr_i
    bot_pr = steps[bot_pr_i]
    script, branch_prefix, _message, *staged = shlex.split(bot_pr["run"])
    assert script.endswith("bot-pr.sh")
    assert branch_prefix == "bot/wordlist"
    assert staged == [WORDLIST]
    assert bot_pr["env"]["BOT_PR_WAIT_MERGE_SECONDS"] == "${{ steps.bot-token.outputs.token != '' && '600' || '' }}", (
        "the next queued run must branch off a main that already has this list"
    )


def test_refresh_closes_a_superseded_wordlist_pr_before_opening_its_own() -> None:
    """A predecessor whose PR went red or timed out leaves it open; once the
    fresh one merges it can only ever be `dirty`."""
    steps = _refresh_job()["steps"]
    close = _index(steps, _runs("gh pr close"))
    assert close < _index(steps, _runs("bot-pr.sh"))
    assert "head:bot/wordlist" in steps[close]["run"]


def _detect_script() -> str:
    steps = _load("ci.yml")["jobs"]["changes"]["steps"]
    return next(s for s in steps if s.get("id") == "detect")["run"]


def test_the_wordlist_check_runs_only_when_the_detector_asks_for_it() -> None:
    jobs = _load("ci.yml")["jobs"]
    assert jobs["changes"]["outputs"]["wordlist"] == "${{ steps.detect.outputs.wordlist }}"
    check = next(s for s in jobs["test-unit"]["steps"] if s.get("name") == CHECK_STEP)
    assert check["if"] == "needs.changes.outputs.wordlist == 'true'"
    assert "tools.build_wordlist --check" in check["run"]


def _git(cwd: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=cwd, check=True, capture_output=True, text=True).stdout.strip()


@pytest.fixture
def two_commits(tmp_path: Path):
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "config", "user.email", "t@example.com")
    _git(repo, "config", "user.name", "t")
    _git(repo, "config", "commit.gpgsign", "false")
    (repo / "README").write_text("x\n", encoding="utf-8")
    _git(repo, "add", ".")
    _git(repo, "commit", "-q", "-m", "base")
    base = _git(repo, "rev-parse", "HEAD")

    def change(*paths: str) -> tuple[Path, str, str]:
        for p in paths:
            f = repo / p
            f.parent.mkdir(parents=True, exist_ok=True)
            f.write_text("changed\n", encoding="utf-8")
        _git(repo, "add", ".")
        _git(repo, "commit", "-q", "-m", "change")
        return repo, base, _git(repo, "rev-parse", "HEAD")

    return change


def _detect(repo: Path, tmp_path: Path, event: str, base: str = "", head: str = "") -> dict[str, str]:
    out = tmp_path / "github_output"
    out.write_text("", encoding="utf-8")
    env = {
        **os.environ,
        "GITHUB_OUTPUT": str(out),
        "EVENT": event,
        "BASE_SHA": base if event == "pull_request" else "",
        "HEAD_SHA": head if event == "pull_request" else "",
        "BEFORE": base if event == "push" else "",
        "AFTER": head if event == "push" else "",
    }
    subprocess.run(["bash", "-c", _detect_script()], cwd=repo, env=env, check=True, capture_output=True)
    return dict(line.split("=", 1) for line in out.read_text(encoding="utf-8").splitlines() if "=" in line)


@pytest.mark.parametrize(
    "paths",
    [
        ("talks/2000-01-01_x/transcript_uk.txt", "talks/2000-01-01_x/review_report.md"),
        ("talks/2000-01-01_x/main/final/uk.srt", "tools/optimize_srt.py"),
    ],
)
def test_a_pr_that_leaves_the_list_and_glossary_alone_is_not_wordlist_checked(two_commits, tmp_path, paths):
    repo, base, head = two_commits(*paths)
    assert _detect(repo, tmp_path, "pull_request", base, head)["wordlist"] == "false"


@pytest.mark.parametrize(
    "path", [WORDLIST, "glossary/terms_lookup.yaml", "tools/build_wordlist.py", "site/dict/uk_UA.dic"]
)
def test_a_pr_touching_the_list_or_its_non_talk_inputs_is_wordlist_checked(two_commits, tmp_path, path):
    repo, base, head = two_commits(path)
    assert _detect(repo, tmp_path, "pull_request", base, head)["wordlist"] == "true"


def test_a_push_to_main_is_not_wordlist_checked(two_commits, tmp_path):
    """Between a talk merge and the refresh that follows it, main is behind by
    design; a red run there would be noise, not news."""
    repo, base, head = two_commits(WORDLIST)
    assert _detect(repo, tmp_path, "push", base, head)["wordlist"] == "false"


def test_a_dispatched_run_without_a_range_is_not_wordlist_checked(two_commits, tmp_path):
    repo, _, _ = two_commits("talks/2000-01-01_x/transcript_uk.txt")
    outputs = _detect(repo, tmp_path, "workflow_dispatch")
    assert outputs["code"] == "true", "the other lanes still run when the range is unknown"
    assert outputs["wordlist"] == "false"


def test_wordlist_generator_deps_are_runtime_requirements() -> None:
    """The refresh job installs requirements.txt only.

    ``tools.build_wordlist`` spell-checks against the vendored hunspell
    dictionary through spylls; with spylls confined to requirements-dev.txt the
    refresh would die on an ImportError.
    """
    runtime = (REPO_ROOT / "requirements.txt").read_text(encoding="utf-8")
    assert "spylls" in runtime, "spylls is imported by tools.build_wordlist at runtime"


@pytest.mark.parametrize(
    "path",
    [
        "talks/2000-01-01_x/transcript_uk.txt",
        "talks/2000-01-01_x/main/final/uk.srt",
        "talks/2000-01-01_x/review_report.md",
    ],
)
def test_a_talk_only_pr_still_runs_the_unit_lane(two_commits, tmp_path, path):
    """A talk PR carries no site/ file, yet the unit lane holds the repo-wide
    text-hygiene guard over talk text."""
    repo, base, head = two_commits(path)
    assert _detect(repo, tmp_path, "pull_request", base, head)["code"] == "true"
