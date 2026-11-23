"""Workflow wiring for EN captions of YouTube videos (tools.amruta_captions).

Two places fetch them, for one reason each:

* ``new-talk.yml`` — when the add-talk PR opens, next to the Vimeo download it
  already does for Vimeo videos. Its ref gate has to admit YouTube refs first,
  or the PR is refused before the step is reached.
* ``subtitle-pipeline.yml`` — amruta's captions repository is filled daily, so
  a talk added before its captions landed would never get them from the PR
  workflow. The pipeline asks again before it resolves the timing source, and
  ships what it finds with its results.

The new-talk steps are inline Python; they are executed here, not grepped, so
the provider branch is exercised for real.
"""

import json
import re
import subprocess
import sys
import types
from pathlib import Path

import pytest
import yaml

from tools import amruta_captions
from tools.vimeo_codec import encode_video_ref

REPO_ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = REPO_ROOT / ".github" / "workflows"

YT_ID = "AbCdEfGhIjK"
YT_REF = encode_video_ref(f"https://www.youtube.com/watch?v={YT_ID}")
VIMEO_URL = "https://vimeo.com/123456789/abcdef0123"
VIMEO_REF = encode_video_ref(VIMEO_URL)
GD_REF = encode_video_ref("https://drive.google.com/file/d/" + "A" * 33 + "/view")
TALK_ID = "2001-01-01_Test-Talk"


def _workflow(name: str) -> dict:
    return yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))


def _step(job: dict, name: str) -> dict:
    for step in job["steps"]:
        if step.get("name") == name:
            return step
    raise AssertionError(f"step {name!r} not found")


def _step_index(job: dict, name: str) -> int:
    return job["steps"].index(_step(job, name))


def _inline_python(step: dict) -> str:
    match = re.search(r"python3 << 'PYEOF'\n(.*?)\nPYEOF", step["run"], re.DOTALL)
    assert match, "step no longer runs an inline python heredoc"
    return match.group(1)


# ── new-talk.yml: the ref gate ───────────────────────────────────


def _run_detect(tmp_path, monkeypatch, videos: list[dict]) -> str:
    """Run new-talk.yml's detect script over one added talk; return GITHUB_OUTPUT."""
    code = _inline_python(_step(_workflow("new-talk.yml")["jobs"]["detect"], "Detect new talks"))
    meta = tmp_path / "talks" / TALK_ID / "meta.yaml"
    meta.parent.mkdir(parents=True)
    meta.write_text(yaml.safe_dump({"title": "T", "videos": videos}), encoding="utf-8")
    output = tmp_path / "github_output"
    output.touch()
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("PR_BASE_SHA", "base")
    monkeypatch.setenv("PR_HEAD_SHA", "head")
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    diff = types.SimpleNamespace(stdout=f"talks/{TALK_ID}/meta.yaml\n")
    monkeypatch.setattr(subprocess, "run", lambda *a, **k: diff)
    exec(compile(code, "new-talk.yml:detect", "exec"), {"__name__": "__main__"})  # noqa: S102
    return output.read_text(encoding="utf-8")


def test_new_talk_gate_accepts_a_youtube_ref(tmp_path, monkeypatch):
    out = _run_detect(tmp_path, monkeypatch, [{"slug": "Talk", "video_ref": YT_REF}])
    assert "has_new=true" in out


def test_new_talk_gate_still_accepts_a_vimeo_ref(tmp_path, monkeypatch):
    out = _run_detect(tmp_path, monkeypatch, [{"slug": "Talk", "video_ref": VIMEO_REF}])
    assert "has_new=true" in out


def test_new_talk_gate_refuses_a_drive_ref_as_the_video(tmp_path, monkeypatch):
    """Drive is a download mirror (``media_refs``), never the video itself."""
    with pytest.raises(SystemExit) as e:
        _run_detect(tmp_path, monkeypatch, [{"slug": "Talk", "video_ref": GD_REF}])
    assert e.value.code == 1


# ── new-talk.yml: the EN-subtitle step ───────────────────────────


class _FakeDownloader:
    vimeo_calls: list[tuple[str, str]] = []

    def download_vimeo_subs(self, url, source_dir):
        type(self).vimeo_calls.append((url, source_dir))
        return []


def _run_setup(tmp_path, monkeypatch, videos: list[dict], fetch_en_srt):
    code = _inline_python(_step(_workflow("new-talk.yml")["jobs"]["setup"], "Process new talks"))
    meta = tmp_path / "talks" / TALK_ID / "meta.yaml"
    meta.parent.mkdir(parents=True, exist_ok=True)
    meta.write_text(yaml.safe_dump({"title": "T", "date": "2001-01-01", "videos": videos}), encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("NEW_METAS", json.dumps([f"talks/{TALK_ID}/meta.yaml"]))
    _FakeDownloader.vimeo_calls = []
    # tools.download pulls in the scraping stack; the step only needs the class.
    monkeypatch.setitem(sys.modules, "tools.download", types.SimpleNamespace(AmrutaDownloader=_FakeDownloader))
    monkeypatch.setattr(amruta_captions, "fetch_en_srt", fetch_en_srt)
    exec(compile(code, "new-talk.yml:setup", "exec"), {"__name__": "__main__"})  # noqa: S102
    return tmp_path / "talks" / TALK_ID


def test_new_talk_fetches_captions_for_a_youtube_video(tmp_path, monkeypatch, capsys):
    calls = []

    def fetch_en_srt(youtube_id, out_path, **kwargs):
        calls.append((youtube_id, Path(out_path)))
        return True

    _run_setup(tmp_path, monkeypatch, [{"slug": "Talk", "video_ref": YT_REF}], fetch_en_srt)

    assert calls == [(YT_ID, Path("talks") / TALK_ID / "Talk" / "source" / "en.srt")]
    assert _FakeDownloader.vimeo_calls == [], "a YouTube video must not be sent to the Vimeo downloader"
    out = capsys.readouterr().out
    assert out.index(f"::add-mask::{YT_ID}") < out.index("Talk: "), "mask before the first line about the video"
    assert YT_ID not in out.replace(f"::add-mask::{YT_ID}", "")
    assert "youtube.com" not in out


def test_new_talk_keeps_the_vimeo_download_for_a_vimeo_video(tmp_path, monkeypatch):
    def fetch_en_srt(*args, **kwargs):
        raise AssertionError("a Vimeo video must not be looked up in captions_zip")

    _run_setup(tmp_path, monkeypatch, [{"slug": "Talk", "video_ref": VIMEO_REF}], fetch_en_srt)

    assert _FakeDownloader.vimeo_calls == [(VIMEO_URL, f"talks/{TALK_ID}/Talk/source")]


def test_new_talk_survives_a_failed_captions_fetch(tmp_path, monkeypatch, capsys):
    def fetch_en_srt(youtube_id, out_path, **kwargs):
        raise OSError(f"reset while fetching https://example.invalid/{youtube_id}.zip")

    talk = _run_setup(
        tmp_path,
        monkeypatch,
        [{"slug": "Yt", "video_ref": YT_REF}, {"slug": "Vimeo", "video_ref": VIMEO_REF}],
        fetch_en_srt,
    )

    assert (talk / "Vimeo" / "source").is_dir()
    assert len(_FakeDownloader.vimeo_calls) == 1, "the next video is still processed"
    out = capsys.readouterr().out
    assert "example.invalid" not in out, "an error message can carry the URL"


def test_new_talk_leaves_an_existing_en_srt_alone(tmp_path, monkeypatch):
    def fetch_en_srt(*args, **kwargs):
        raise AssertionError("en.srt exists — nothing to fetch")

    existing = tmp_path / "talks" / TALK_ID / "Talk" / "source" / "en.srt"
    existing.parent.mkdir(parents=True)
    existing.write_text("kept\n", encoding="utf-8")

    _run_setup(tmp_path, monkeypatch, [{"slug": "Talk", "video_ref": YT_REF}], fetch_en_srt)

    assert existing.read_text(encoding="utf-8") == "kept\n"


# ── subtitle-pipeline.yml: late captions ─────────────────────────

FETCH_STEP = "Fetch late EN captions"
UPLOAD_STEP = "Upload fetched EN captions"
DOWNLOAD_STEP = "Download fetched EN captions"
CAPTIONS_GLOB = "talks/*/*/source/en.srt"


def _pipeline_jobs() -> dict:
    return _workflow("subtitle-pipeline.yml")["jobs"]


def test_pipeline_fetches_captions_before_resolving_the_timing_source():
    job = _pipeline_jobs()["prepare-build"]
    fetch = _step(job, FETCH_STEP)
    assert "python -m tools.amruta_captions --talk-id" in fetch["run"]
    assert _step_index(job, FETCH_STEP) < _step_index(job, "Resolve timing source")
    assert _step_index(job, FETCH_STEP) < _step_index(job, "Prepare UK blocks")


def test_pipeline_caption_fetch_can_never_fail_the_run():
    fetch = _step(_pipeline_jobs()["prepare-build"], FETCH_STEP)
    assert fetch.get("continue-on-error") is True


def test_pipeline_caption_fetch_is_skipped_on_a_dry_run():
    """A dry run replays snapshots; it must not depend on the network."""
    fetch = _step(_pipeline_jobs()["prepare-build"], FETCH_STEP)
    assert "inputs.dry_run" in str(fetch.get("if", ""))


def test_pipeline_hands_only_newly_fetched_captions_to_later_jobs():
    """An en.srt already in the repo may be newer on main by commit time —
    re-shipping the prepare-build copy would revert it."""
    job = _pipeline_jobs()["prepare-build"]
    fetch = _step(job, FETCH_STEP)
    assert "git ls-files --others" in fetch["run"]
    upload = _step(job, UPLOAD_STEP)
    assert upload["with"]["name"].startswith("captions__")
    assert "steps.captions.outputs.fetched == 'true'" in upload["if"]
    assert "steps.captions.outputs.fetched" in job["outputs"]["captions_fetched"]


@pytest.mark.parametrize("job_name", ["build-timecodes", "commit"])
def test_jobs_with_their_own_checkout_receive_the_fetched_captions(job_name):
    job = _pipeline_jobs()[job_name]
    assert "prepare-build" in job["needs"]
    download = _step(job, DOWNLOAD_STEP)
    assert "needs.prepare-build.outputs.captions_fetched == 'true'" in download["if"]
    assert download["with"]["name"].startswith("captions__")
    assert download["with"]["path"].startswith("talks/")
    # Into a fresh tree: `git pull --rebase` refuses untracked files in its way.
    pulls = [i for i, s in enumerate(job["steps"]) if "git pull --rebase" in str(s.get("run", ""))]
    assert pulls and max(pulls) < _step_index(job, DOWNLOAD_STEP)


def test_build_gets_the_captions_before_it_times_against_them():
    job = _pipeline_jobs()["build-timecodes"]
    first_python = next(i for i, s in enumerate(job["steps"]) if "python" in str(s.get("run", "")))
    assert _step_index(job, DOWNLOAD_STEP) < first_python


def test_pipeline_commits_fetched_captions_with_its_results():
    job = _pipeline_jobs()["commit"]
    commit = _step(job, "Commit via PR")
    assert f'"{CAPTIONS_GLOB}"' in commit["run"]
    assert _step_index(job, DOWNLOAD_STEP) < _step_index(job, "Commit via PR")


def test_pipeline_never_decodes_a_ref_in_shell():
    """The id stays inside the tool, which masks it; no workflow line echoes it."""
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    assert "captions_zip" not in text
