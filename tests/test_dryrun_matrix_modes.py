"""Every cell of pipeline-matrix-dryrun.yml, replayed locally.

`test_dryrun_matrix.py` replays each snapshot in full mode only. The workflow
also runs build-only and en-srt cells, which pin the transcript instead of
translating and (for en-srt) time and validate against the EN SRT. Each cell
here mirrors the pipeline's steps, validate_subtitles included, and the cells
are read from the workflow itself so the two cannot disagree about coverage.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from tools.srt_utils import timing_en_srt
from tools.video_roles import primary_slug

pytestmark = pytest.mark.integration

ROOT = Path(__file__).resolve().parent.parent
MATRIX_WORKFLOW = ROOT / ".github" / "workflows" / "pipeline-matrix-dryrun.yml"
SNAPSHOT_ROOT = ROOT / "tests" / "fixtures" / "pipeline_snapshots"


def _cells() -> list[tuple[str, str, str]]:
    jobs = yaml.safe_load(MATRIX_WORKFLOW.read_text(encoding="utf-8"))["jobs"]
    cells = []
    for mode in ("full", "build-only", "en-srt"):
        job = jobs[mode]
        for talk_id in job["strategy"]["matrix"]["talk_id"]:
            cells.append((mode, talk_id, job["with"]["timing_source"]))
    return cells


def _run(cmd: list[str], label: str) -> None:
    r = subprocess.run([sys.executable, "-m", *cmd], capture_output=True, text=True, cwd=ROOT, check=False)
    assert r.returncode == 0, (
        f"{label} failed:\nCMD: {' '.join(cmd)}\nSTDOUT: {r.stdout[-2500:]}\nSTDERR: {r.stderr[-1500:]}"
    )


def test_the_matrix_has_cells_for_every_mode():
    modes = {mode for mode, _, _ in _cells()}
    assert modes == {"full", "build-only", "en-srt"}


@pytest.mark.parametrize(("mode", "talk_id", "timing_source"), _cells(), ids=lambda v: str(v))
def test_dryrun_cell_replays_green(mode: str, talk_id: str, timing_source: str, tmp_path: Path) -> None:
    talk = tmp_path / talk_id
    shutil.copytree(ROOT / "talks" / talk_id, talk)
    video_slug = primary_slug(talk)
    video = talk / video_slug
    snapshot = SNAPSHOT_ROOT / talk_id / video_slug
    assert snapshot.is_dir(), f"no snapshot for the primary video {talk_id}/{video_slug}"
    shutil.rmtree(video / "work", ignore_errors=True)
    (video / "final" / "uk.srt").unlink(missing_ok=True)

    if mode == "full":
        (talk / "transcript_uk.txt").unlink()
        _run(["tools.fake_llm", "translate", "--snapshot", str(snapshot), "--talk-dir", str(talk)], "translate")
        _run(["tools.fake_llm", "review", "--snapshot", str(snapshot), "--talk-dir", str(talk)], "review")
    else:
        _run(["tools.fake_llm", "pin-transcript", "--snapshot", str(snapshot), "--talk-dir", str(talk)], "pin")

    _run(["tools.build_map", "prepare", "--talk-dir", str(talk), "--video-slug", video_slug], "prepare")
    _run(
        [
            "tools.build_map",
            "prepare-timing",
            "--talk-dir",
            str(talk),
            "--video-slug",
            video_slug,
            "--timing-source",
            timing_source,
        ],
        "prepare-timing",
    )
    work = video / "work"
    _run(
        [
            "tools.fake_llm",
            "build-timecodes",
            "--snapshot",
            str(snapshot),
            "--work-dir",
            str(work),
            "--timing-source",
            timing_source,
        ],
        "build-timecodes",
    )

    n_blocks = str(len(json.loads((work / "uk_blocks.json").read_text(encoding="utf-8"))))
    count_flags = (
        ["--max-blocks", n_blocks, "--allow-skipped-ids"]
        if timing_source == "en-srt"
        else ["--expected-blocks", n_blocks]
    )
    _run(["tools.validate_artifacts", "--timecodes", str(work / "timecodes.txt"), *count_flags], "timecodes format")
    _run(["tools.build_map", "assemble", "--talk-dir", str(talk), "--video-slug", video_slug], "assemble")

    srt = video / "final" / "uk.srt"
    whisper = video / "source" / "whisper.json"
    whisper_flag = ["--json", str(whisper)] if whisper.is_file() else []
    _run(
        [
            "tools.optimize_srt",
            "--srt",
            str(srt),
            "--output",
            str(srt),
            *whisper_flag,
            "--anchors",
            str(work / "timecodes.txt"),
            "--max-drift-ms",
            "2000",
            "--skip-duration-split",
            "--skip-cps-split",
        ],
        "optimize",
    )

    if timing_source == "en-srt":
        anchor = ["--en-srt", str(timing_en_srt(video)), "--skip-text-check", "--compare-block-count"]
    else:
        anchor = ["--whisper-json", str(whisper)]
    _run(
        [
            "tools.validate_subtitles",
            "--srt",
            str(srt),
            "--transcript",
            str(talk / "transcript_uk.txt"),
            *anchor,
            "--skip-duration-check",
            "--report",
            str(video / "final" / "report.txt"),
        ],
        "validate_subtitles",
    )

    phases = "translate,build" if mode == "full" else "build"
    _run(
        [
            "tools.verify_snapshot",
            "--talk-dir",
            str(talk),
            "--video-slug",
            video_slug,
            "--snapshot",
            str(snapshot),
            "--phases",
            phases,
        ],
        "verify_snapshot",
    )
