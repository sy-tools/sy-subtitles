"""A text-only talk (no counted video) runs the pipeline without a build.

It has no video, so there is no whisper and no primary for `prepare-build`
to resolve — which used to fail the run red on "no video declares
'sync: primary'". The talk is recognised once, in discover, through
tools.video_roles; a talk that has videos but no primary must keep failing.
"""

import os
import subprocess
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "subtitle-pipeline.yml"


def _wf() -> dict:
    return yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))


def _find_step() -> dict:
    return next(s for s in _wf()["jobs"]["discover"]["steps"] if s.get("id") == "find")


def _discover(tmp_path: Path, meta: dict, talk_id: str = "2001-02-03_Text-Only-Talk") -> dict:
    talk = tmp_path / "talks" / talk_id
    talk.mkdir(parents=True)
    (talk / "meta.yaml").write_text(yaml.safe_dump(meta), encoding="utf-8")
    out = tmp_path / "github_output"
    out.write_text("", encoding="utf-8")
    env = {
        **os.environ,
        "INPUT_TALK_ID": talk_id,
        "GITHUB_OUTPUT": str(out),
        "PYTHONPATH": str(ROOT),
    }
    subprocess.run(["bash", "-e", "-c", _find_step()["run"]], cwd=tmp_path, env=env, check=True, capture_output=True)
    return dict(line.split("=", 1) for line in out.read_text(encoding="utf-8").splitlines())


def test_discover_exposes_text_only() -> None:
    outputs = _wf()["jobs"]["discover"]["outputs"]
    assert outputs["text_only"] == "${{ steps.find.outputs.text_only }}"


def test_discover_marks_a_talk_without_videos_text_only(tmp_path: Path) -> None:
    assert _discover(tmp_path, {"title": "Text-only talk"})["text_only"] == "true"


def test_discover_does_not_mark_a_video_talk_text_only(tmp_path: Path) -> None:
    meta = {"title": "Talk", "videos": [{"slug": "Talk", "vimeo_url": "https://vimeo.com/1"}]}
    assert _discover(tmp_path, meta, "2000-01-01_Talk")["text_only"] == "false"


def test_a_text_only_talk_skips_the_build() -> None:
    cond = _wf()["jobs"]["prepare-build"]["if"]
    assert "needs.discover.outputs.text_only != 'true'" in cond
    # The skip is added, nothing else is relaxed.
    for clause in (
        "inputs.build != false",
        "needs.discover.result == 'success'",
        "needs.whisper.result == 'success' || needs.whisper.result == 'skipped'",
    ):
        assert clause in cond


def test_the_review_gate_reads_text_only_and_the_translation_result() -> None:
    step = next(s for s in _wf()["jobs"]["commit"]["steps"] if s.get("id") == "review-gate")
    assert step["env"]["TEXT_ONLY"] == "${{ needs.discover.outputs.text_only }}"
    assert step["env"]["TRANSLATE_RESULT"] == "${{ needs.translate-and-review.result }}"


def test_the_review_issue_step_knows_the_talk_is_text_only() -> None:
    step = next(s for s in _wf()["jobs"]["commit"]["steps"] if s.get("name") == "Create review tracking issue")
    assert step["env"]["TEXT_ONLY"] == "${{ needs.discover.outputs.text_only }}"
