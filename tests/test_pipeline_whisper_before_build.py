"""whisper.json must be on main before the build reads it.

The build jobs take whisper.json from `git pull`, while whisper.yml lands it
through a bot PR. So the whisper commit waits for that PR to merge, and
build-timecodes refuses to build without the file when this run's whisper job
produced it or when whisper is the timing source. A whisper.json committed
earlier is simply in the checkout.
"""

import os
import subprocess
from pathlib import Path

import pytest
import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"
TALK = "2000-01-01_Talk"
SLUG = "Video"


def _workflow(name: str) -> dict:
    return yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))


def _step(steps: list[dict], name: str) -> dict:
    for step in steps:
        if step.get("name") == name:
            return step
    raise AssertionError(f"step {name!r} not found")


def _build_steps() -> list[dict]:
    return _workflow("subtitle-pipeline.yml")["jobs"]["build-timecodes"]["steps"]


def test_whisper_commit_waits_for_its_pr_to_merge() -> None:
    step = _step(_workflow("whisper.yml")["jobs"]["commit"]["steps"], "Commit via PR")
    # Only with the App token: a GITHUB_TOKEN PR waits for a person, and the
    # build guard below turns that case into a loud failure instead.
    assert step["env"].get("BOT_PR_WAIT_MERGE_SECONDS") == "${{ steps.bot-token.outputs.token != '' && '600' || '' }}"


def test_build_timecodes_sees_the_whisper_result() -> None:
    needs = _workflow("subtitle-pipeline.yml")["jobs"]["build-timecodes"]["needs"]
    needs = [needs] if isinstance(needs, str) else needs
    assert "whisper" in needs


def test_whisper_check_runs_before_anything_reads_whisper() -> None:
    names = [s.get("name") for s in _build_steps()]
    assert names.index("Check whisper timings") < names.index("Prepare timing data")


def _run_check(tmp_path: Path, *, committed: bool, whisper_result: str, timing_source: str):
    if committed:
        src = tmp_path / "talks" / TALK / SLUG / "source"
        src.mkdir(parents=True)
        (src / "whisper.json").write_text("{}", encoding="utf-8")
    step = _step(_build_steps(), "Check whisper timings")
    env = {
        **os.environ,
        "TALK_ID": TALK,
        "VIDEO_SLUG": SLUG,
        "WHISPER_RESULT": whisper_result,
        "TIMING_SOURCE": timing_source,
    }
    return subprocess.run(
        ["bash", "-e", "-c", step["run"]], cwd=tmp_path, env=env, capture_output=True, text=True, check=False
    )


@pytest.mark.parametrize("whisper_result", ["success", "skipped"])
@pytest.mark.parametrize("timing_source", ["en-srt", "whisper"])
def test_present_whisper_passes(tmp_path: Path, whisper_result: str, timing_source: str) -> None:
    result = _run_check(tmp_path, committed=True, whisper_result=whisper_result, timing_source=timing_source)
    assert result.returncode == 0, result.stdout + result.stderr


def test_missing_after_this_runs_whisper_fails(tmp_path: Path) -> None:
    result = _run_check(tmp_path, committed=False, whisper_result="success", timing_source="en-srt")
    assert result.returncode != 0
    assert "::error::" in result.stdout


def test_missing_in_whisper_mode_fails(tmp_path: Path) -> None:
    result = _run_check(tmp_path, committed=False, whisper_result="skipped", timing_source="whisper")
    assert result.returncode != 0
    assert "::error::" in result.stdout


def test_missing_when_whisper_was_not_run_only_warns(tmp_path: Path) -> None:
    result = _run_check(tmp_path, committed=False, whisper_result="skipped", timing_source="en-srt")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "::warning::" in result.stdout
