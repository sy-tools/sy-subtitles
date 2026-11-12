"""A video declared `sync: ignored` is never queued for whisper.

Both discover steps used to queue every video that lacked a whisper.json,
whatever its role. A wordless video (1997 Adi Shakti Puja "Impressions")
yields an empty whisper.json, fails the contract, so is never committed —
and was therefore re-queued, and failed, on every run of the talk.

The tests run the workflows' real inline discover scripts against a fake
talks/ tree, so they cover the code that ships, not a copy of it.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[1]
WORKFLOWS = REPO / ".github" / "workflows"
TALK_ID = "1997-05-25_Test-Talk"
VIDEO_REF = "r1V1xFXUxWFEsVUUhXThxSWFVbVkA"


def _inline_python(workflow: str, job: str, step_name: str) -> str:
    wf = yaml.safe_load((WORKFLOWS / workflow).read_text(encoding="utf-8"))
    step = next(s for s in wf["jobs"][job]["steps"] if s.get("name") == step_name)
    match = re.search(r"python3 << 'PYEOF'\n(.*)\nPYEOF", step["run"], re.DOTALL)
    assert match, f"{workflow}: no inline python in step {step_name!r}"
    return match.group(1)


def _make_talk(root: Path, videos: list[dict]) -> None:
    talk = root / "talks" / TALK_ID
    talk.mkdir(parents=True)
    (talk / "meta.yaml").write_text(yaml.safe_dump({"videos": videos}), encoding="utf-8")


def _run_discover(root: Path, script: str) -> dict[str, str]:
    out = root / "github_output"
    out.write_text("", encoding="utf-8")
    env = {
        **os.environ,
        "PYTHONPATH": str(REPO),
        "GITHUB_OUTPUT": str(out),
        "INPUT_TALK_ID": TALK_ID,
        "INPUT_FORCE": "false",
    }
    proc = subprocess.run([sys.executable, "-c", script], cwd=root, env=env, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return dict(line.split("=", 1) for line in out.read_text(encoding="utf-8").splitlines())


def _video(slug: str, sync: str | None = None) -> dict:
    v = {"slug": slug, "video_ref": VIDEO_REF}
    if sync:
        v["sync"] = sync
    return v


def test_whisper_matrix_leaves_out_a_declared_ignored_video(tmp_path):
    _make_talk(tmp_path, [_video("Talk", "primary"), _video("Impressions", "ignored")])
    script = _inline_python("whisper.yml", "discover", "Build video matrix")

    outputs = _run_discover(tmp_path, script)

    slugs = [row["video_slug"] for row in json.loads(outputs["matrix"])["include"]]
    assert slugs == ["Talk"]


def test_whisper_matrix_keeps_every_video_of_an_undeclared_talk(tmp_path):
    _make_talk(tmp_path, [_video("A"), _video("B")])
    script = _inline_python("whisper.yml", "discover", "Build video matrix")

    outputs = _run_discover(tmp_path, script)

    slugs = [row["video_slug"] for row in json.loads(outputs["matrix"])["include"]]
    assert slugs == ["A", "B"]


def test_pipeline_does_not_need_whisper_for_a_declared_ignored_video(tmp_path):
    _make_talk(tmp_path, [_video("Talk", "primary"), _video("Impressions", "ignored")])
    ready = tmp_path / "talks" / TALK_ID / "Talk" / "source"
    ready.mkdir(parents=True)
    (ready / "whisper.json").write_text("{}", encoding="utf-8")
    script = _inline_python("subtitle-pipeline.yml", "discover", "Find talks, videos, and pending whisper")

    outputs = _run_discover(tmp_path, script)

    assert outputs["needs_whisper"] == "false"


def test_pipeline_still_needs_whisper_for_a_non_ignored_video(tmp_path):
    _make_talk(tmp_path, [_video("Talk", "primary"), _video("Short", "derived")])
    script = _inline_python("subtitle-pipeline.yml", "discover", "Find talks, videos, and pending whisper")

    outputs = _run_discover(tmp_path, script)

    assert outputs["needs_whisper"] == "true"
