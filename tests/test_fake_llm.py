"""tools.fake_llm — the dry-run stand-in for the pipeline's LLM steps."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _fake_llm(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "tools.fake_llm", *args],
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )


def _snapshot(tmp_path: Path) -> Path:
    snapshot = tmp_path / "snapshot"
    (snapshot / "work").mkdir(parents=True)
    (snapshot / "expected").mkdir()
    (snapshot / "expected" / "transcript_uk.txt").write_text("Snapshot text.\n", encoding="utf-8")
    (snapshot / "work" / "timecodes.txt").write_text("#1 | 00:00:01,000 | 00:00:02,000\n", encoding="utf-8")
    return snapshot


def test_pin_transcript_replaces_the_talks_edited_transcript_with_the_snapshots(tmp_path):
    snapshot = _snapshot(tmp_path)
    talk_dir = tmp_path / "talk"
    talk_dir.mkdir()
    (talk_dir / "transcript_uk.txt").write_text("Edited by a reviewer since.\n", encoding="utf-8")

    r = _fake_llm("pin-transcript", "--snapshot", str(snapshot), "--talk-dir", str(talk_dir))

    assert r.returncode == 0, r.stderr
    assert (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8") == "Snapshot text.\n"


def test_pin_transcript_fails_when_the_snapshot_has_no_expected_transcript(tmp_path):
    snapshot = _snapshot(tmp_path)
    (snapshot / "expected" / "transcript_uk.txt").unlink()
    talk_dir = tmp_path / "talk"
    talk_dir.mkdir()

    r = _fake_llm("pin-transcript", "--snapshot", str(snapshot), "--talk-dir", str(talk_dir))

    assert r.returncode != 0
    assert "snapshot missing" in r.stderr


def test_build_timecodes_replays_the_answer_recorded_for_that_timing_source(tmp_path):
    snapshot = _snapshot(tmp_path)
    en_srt_answer = "#1 | 00:19:38,000 | 00:19:43,881\n"
    (snapshot / "work" / "timecodes.en-srt.txt").write_text(en_srt_answer, encoding="utf-8")
    work = tmp_path / "work"

    r = _fake_llm("build-timecodes", "--snapshot", str(snapshot), "--work-dir", str(work), "--timing-source", "en-srt")

    assert r.returncode == 0, r.stderr
    assert (work / "timecodes.txt").read_text(encoding="utf-8") == en_srt_answer


def test_build_timecodes_falls_back_to_the_shared_answer_without_a_mode_specific_one(tmp_path):
    snapshot = _snapshot(tmp_path)
    work = tmp_path / "work"

    r = _fake_llm("build-timecodes", "--snapshot", str(snapshot), "--work-dir", str(work), "--timing-source", "en-srt")

    assert r.returncode == 0, r.stderr
    assert (work / "timecodes.txt").read_text(encoding="utf-8") == "#1 | 00:00:01,000 | 00:00:02,000\n"
