"""whisper.yml fetches a talk's video through tools/video_media.py.

The discover script is the real inline one, run against a fake talks/ tree.
"""

import json
import os
import subprocess
import sys

import yaml

from tests.test_whisper_discover_skips_ignored import (
    REPO,
    TALK_ID,
    WORKFLOWS,
    _inline_python,
    _make_talk,
    _run_discover,
)
from tools.vimeo_codec import encode_video_ref

YT_REF = encode_video_ref("https://www.youtube.com/watch?v=AbCdEfGhIjK")
GD_REF = encode_video_ref("https://drive.google.com/file/d/1Syntheticdriveid00abcdefghijklmn/view")
VIMEO_REF = encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa")


def _whisper_job() -> dict:
    return yaml.safe_load((WORKFLOWS / "whisper.yml").read_text(encoding="utf-8"))["jobs"]["whisper"]


def _step(name: str) -> dict:
    return next(s for s in _whisper_job()["steps"] if s.get("name") == name)


def _commands(run: str) -> str:
    return "\n".join(ln for ln in run.splitlines() if not ln.lstrip().startswith("#"))


def _matrix(tmp_path, videos):
    _make_talk(tmp_path, videos)
    outputs = _run_discover(tmp_path, _inline_python("whisper.yml", "discover", "Build video matrix"))
    return json.loads(outputs["matrix"])["include"]


def test_discover_queues_a_youtube_video_with_a_drive_mirror(tmp_path):
    rows = _matrix(tmp_path, [{"slug": "Talk", "video_ref": YT_REF, "media_refs": [GD_REF]}])
    assert [row["video_slug"] for row in rows] == ["Talk"]


def test_discover_skips_a_youtube_video_a_runner_cannot_fetch_with_a_warning(tmp_path):
    _make_talk(tmp_path, [{"slug": "Talk", "video_ref": YT_REF}, {"slug": "Other", "video_ref": VIMEO_REF}])
    out = tmp_path / "github_output"
    out.write_text("", encoding="utf-8")
    env = {**os.environ, "PYTHONPATH": str(REPO), "GITHUB_OUTPUT": str(out), "INPUT_TALK_ID": TALK_ID}
    proc = subprocess.run(
        [sys.executable, "-c", _inline_python("whisper.yml", "discover", "Build video matrix")],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    outputs = dict(line.split("=", 1) for line in out.read_text(encoding="utf-8").splitlines())
    assert [row["video_slug"] for row in json.loads(outputs["matrix"])["include"]] == ["Other"]
    warning = next(ln for ln in proc.stdout.splitlines() if ln.startswith("::warning::"))
    assert f"{TALK_ID}/Talk" in warning
    assert f"python -m tools.local_whisper --talk-id {TALK_ID} --video-slug Talk" in warning


def test_the_matrix_carries_no_video_ref(tmp_path):
    rows = _matrix(tmp_path, [{"slug": "Talk", "video_ref": VIMEO_REF}])
    assert rows == [{"talk_id": TALK_ID, "video_slug": "Talk"}]


def test_download_goes_through_the_resolver_as_ci():
    run = _commands(_step("Download video (temporary)")["run"])
    assert "python3 -m tools.video_media download" in run
    assert "--ci" in run
    assert '--talk-id "$TALK_ID"' in run
    assert '--video-slug "$VIDEO_SLUG"' in run
    assert "--out /tmp/whisper_work/video.mp4" in run
    assert "test -s /tmp/whisper_work/video.mp4" in run


def test_the_job_has_no_video_ref_input():
    assert "VIDEO_REF" not in json.dumps(_whisper_job())


# ── subtitle-pipeline.yml: its own discover decides who goes to whisper ──────


def _pipeline_discover(tmp_path, videos, with_whisper=()):
    _make_talk(tmp_path, videos)
    for slug in with_whisper:
        source = tmp_path / "talks" / TALK_ID / slug / "source"
        source.mkdir(parents=True)
        (source / "whisper.json").write_text("{}", encoding="utf-8")
    out = tmp_path / "github_output"
    out.write_text("", encoding="utf-8")
    env = {**os.environ, "PYTHONPATH": str(REPO), "GITHUB_OUTPUT": str(out), "INPUT_TALK_ID": TALK_ID}
    script = _inline_python("subtitle-pipeline.yml", "discover", "Find talks, videos, and pending whisper")
    proc = subprocess.run([sys.executable, "-c", script], cwd=tmp_path, env=env, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stdout + proc.stderr
    outputs = dict(line.split("=", 1) for line in out.read_text(encoding="utf-8").splitlines())
    return outputs, proc.stdout


def test_pipeline_does_not_send_an_unfetchable_youtube_video_to_whisper(tmp_path):
    """Queueing it only makes whisper.yml skip it, and the run then spends
    translate and review before the build finds no whisper.json."""
    outputs, stdout = _pipeline_discover(tmp_path, [{"slug": "Talk", "video_ref": YT_REF}])
    assert outputs["needs_whisper"] == "false"
    assert json.loads(outputs["whisper_matrix"])["include"] == []
    # The video is still built: only whisper is out of reach.
    assert json.loads(outputs["matrix"])["include"] == [{"talk_id": TALK_ID, "video_slug": "Talk"}]
    warning = next(ln for ln in stdout.splitlines() if ln.startswith("::warning::"))
    assert f"python -m tools.local_whisper --talk-id {TALK_ID} --video-slug Talk" in warning
    assert "AbCdEfGhIjK" not in stdout
    assert "youtube.com" not in stdout


def test_pipeline_sends_a_youtube_video_with_a_drive_mirror_to_whisper(tmp_path):
    outputs, stdout = _pipeline_discover(tmp_path, [{"slug": "Talk", "video_ref": YT_REF, "media_refs": [GD_REF]}])
    assert outputs["needs_whisper"] == "true"
    assert json.loads(outputs["whisper_matrix"])["include"] == [{"talk_id": TALK_ID}]
    assert "::warning::" not in stdout


def test_pipeline_sends_a_vimeo_video_to_whisper(tmp_path):
    outputs, _ = _pipeline_discover(tmp_path, [{"slug": "Talk", "video_ref": VIMEO_REF}])
    assert outputs["needs_whisper"] == "true"


def test_a_mixed_talk_is_not_sent_back_to_whisper_for_its_unfetchable_video(tmp_path):
    """Once the Vimeo video has its whisper.json, the YouTube one without a
    mirror must not send the talk to whisper again on every run."""
    videos = [{"slug": "Talk", "video_ref": YT_REF}, {"slug": "Other", "video_ref": VIMEO_REF}]
    outputs, _ = _pipeline_discover(tmp_path, videos, with_whisper=("Other",))
    assert outputs["needs_whisper"] == "false"


def test_a_mixed_talk_still_goes_to_whisper_for_its_fetchable_video(tmp_path):
    videos = [{"slug": "Talk", "video_ref": YT_REF}, {"slug": "Other", "video_ref": VIMEO_REF}]
    outputs, stdout = _pipeline_discover(tmp_path, videos)
    assert outputs["needs_whisper"] == "true"
    assert any(ln.startswith("::warning::") and "--video-slug Talk" in ln for ln in stdout.splitlines())
