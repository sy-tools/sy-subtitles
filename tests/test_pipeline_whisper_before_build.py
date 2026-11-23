"""whisper.json must be on main before the build reads it.

The build jobs take whisper.json from `git pull`, while whisper.yml lands it
through a bot PR. So the whisper commit waits for that PR to merge, and
build-timecodes refuses to build without the file when this run's whisper job
produced it or when whisper is the timing source. A whisper.json committed
earlier is simply in the checkout.
"""

import os
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from tools.vimeo_codec import encode_video_ref

REPO = Path(__file__).resolve().parents[1]
WORKFLOWS = REPO / ".github" / "workflows"
TALK = "2000-01-01_Talk"
SLUG = "Video"
VIMEO = {"video_ref": encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa")}
YT_NO_MIRROR = {"video_ref": encode_video_ref("https://www.youtube.com/watch?v=AbCdEfGhIjK")}
LOCAL_WHISPER = f"python -m tools.local_whisper --talk-id {TALK} --video-slug {SLUG}"


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


def _run_check(tmp_path: Path, *, committed: bool, whisper_result: str, timing_source: str, video: dict | None = None):
    talk = tmp_path / "talks" / TALK
    talk.mkdir(parents=True)
    meta = {
        "title": "Talk",
        "date": "2000-01-01",
        "language": "en",
        "videos": [{"slug": SLUG, "title": SLUG, **(video or VIMEO)}],
    }
    (talk / "meta.yaml").write_text(yaml.safe_dump(meta), encoding="utf-8")
    if committed:
        src = talk / SLUG / "source"
        src.mkdir(parents=True)
        (src / "whisper.json").write_text("{}", encoding="utf-8")
    step = _step(_build_steps(), "Check whisper timings")
    env = {
        **os.environ,
        # The step calls `python -m tools.video_media` from the checkout root.
        "PATH": f"{Path(sys.executable).parent}{os.pathsep}{os.environ['PATH']}",
        "PYTHONPATH": str(REPO),
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
    assert "has not reached main" in result.stdout
    assert LOCAL_WHISPER in result.stdout


def test_missing_in_whisper_mode_fails(tmp_path: Path) -> None:
    result = _run_check(tmp_path, committed=False, whisper_result="skipped", timing_source="whisper")
    assert result.returncode != 0
    assert "::error::" in result.stdout
    assert LOCAL_WHISPER in result.stdout


def test_missing_when_whisper_was_not_run_only_warns(tmp_path: Path) -> None:
    result = _run_check(tmp_path, committed=False, whisper_result="skipped", timing_source="en-srt")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "::warning::" in result.stdout


def test_a_meta_that_does_not_validate_fails_with_its_reason(tmp_path: Path) -> None:
    """The fetchability question must not swallow a broken meta.yaml and
    answer "whisper did not run" instead."""
    result = _run_check(tmp_path, committed=False, whisper_result="success", timing_source="en-srt")
    (tmp_path / "talks" / TALK / "meta.yaml").write_text("title: Talk\n", encoding="utf-8")
    step = _step(_build_steps(), "Check whisper timings")
    env = {
        **os.environ,
        "PATH": f"{Path(sys.executable).parent}{os.pathsep}{os.environ['PATH']}",
        "PYTHONPATH": str(REPO),
        "TALK_ID": TALK,
        "VIDEO_SLUG": SLUG,
        "WHISPER_RESULT": "skipped",
        "TIMING_SOURCE": "en-srt",
    }
    result = subprocess.run(["bash", "-e", "-c", step["run"]], cwd=tmp_path, env=env, capture_output=True, text=True)
    assert result.returncode != 0
    assert "::error::" in result.stdout
    assert "meta.yaml" in result.stdout


# A YouTube video with no Drive mirror is never sent to whisper (a runner
# cannot fetch it), so a whisper job that succeeded in this run succeeded for
# the talk's OTHER videos and says nothing about this one.


def test_unfetchable_video_builds_on_en_srt_even_if_whisper_ran_for_a_sibling(tmp_path: Path) -> None:
    result = _run_check(tmp_path, committed=False, whisper_result="success", timing_source="en-srt", video=YT_NO_MIRROR)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "::warning::" in result.stdout
    assert "has not reached main" not in result.stdout


@pytest.mark.parametrize("whisper_result", ["success", "skipped"])
def test_unfetchable_video_without_captions_fails_with_the_way_out(tmp_path: Path, whisper_result: str) -> None:
    result = _run_check(
        tmp_path, committed=False, whisper_result=whisper_result, timing_source="whisper", video=YT_NO_MIRROR
    )
    assert result.returncode != 0
    assert "has not reached main" not in result.stdout
    assert LOCAL_WHISPER in result.stdout
    # No link, id or ref in the log.
    assert "AbCdEfGhIjK" not in result.stdout + result.stderr
    assert YT_NO_MIRROR["video_ref"] not in result.stdout + result.stderr
