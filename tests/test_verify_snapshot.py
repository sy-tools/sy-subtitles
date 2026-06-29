"""Tests for tools.verify_snapshot — behavioural dry-run snapshot verification.

verify_snapshot is the gate that decides whether a fake-LLM dry-run replay
reproduced the snapshot's expected behaviour. It is only happy-path-adjacent
in production, so these tests prove it actually REJECTS each failure mode
(missing artifacts, text drift, overlaps, baseline drift) as well as accepting
a clean replay.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tools.config import OptimizeConfig
from tools.srt_utils import calc_stats, parse_srt, write_srt
from tools.verify_snapshot import main, verify_build, verify_translate

# A clean 2-block SRT whose text matches TRANSCRIPT exactly, no overlaps.
_BLOCKS = [
    {"idx": 1, "start_ms": 0, "end_ms": 3000, "text": "Привіт усім."},
    {"idx": 2, "start_ms": 3100, "end_ms": 7000, "text": "Друге речення тут."},
]
TRANSCRIPT = "Привіт усім. Друге речення тут."


def _make_snapshot(tmp_path: Path, blocks=_BLOCKS, transcript=TRANSCRIPT, baseline="auto"):
    """Build a talk_dir + snapshot pair. Returns (talk_dir, video_slug, snapshot)."""
    talk_dir = tmp_path / "talk"
    video_slug = "Vid"
    srt = talk_dir / video_slug / "final" / "uk.srt"
    srt.parent.mkdir(parents=True)
    write_srt(blocks, str(srt))
    (talk_dir / "transcript_uk.txt").write_text(transcript, encoding="utf-8")

    snapshot = tmp_path / "snapshot"
    (snapshot / "expected").mkdir(parents=True)
    (snapshot / "expected" / "transcript_uk.txt").write_text(transcript, encoding="utf-8")

    if baseline == "auto":
        stats = calc_stats(parse_srt(str(srt)), OptimizeConfig())
        baseline = {
            "n_blocks": len(blocks),
            "avg_cps": round(float(stats["avg_cps"]), 2),
            "cps_over_hard": int(stats["cps_over_hard"]),
            "duration_under_min": int(stats["duration_under_min"]),
        }
    manifest = {"baseline": baseline} if baseline is not None else {}
    (snapshot / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return talk_dir, video_slug, snapshot


# --- verify_translate ---


def test_verify_translate_accepts_matching_transcript(tmp_path, capsys):
    talk_dir, _, snapshot = _make_snapshot(tmp_path)
    verify_translate(talk_dir, snapshot)
    assert "[OK] translate" in capsys.readouterr().out


def test_verify_translate_rejects_missing_produced(tmp_path):
    talk_dir, _, snapshot = _make_snapshot(tmp_path)
    (talk_dir / "transcript_uk.txt").unlink()
    with pytest.raises(SystemExit):
        verify_translate(talk_dir, snapshot)


def test_verify_translate_rejects_missing_expected(tmp_path):
    talk_dir, _, snapshot = _make_snapshot(tmp_path)
    (snapshot / "expected" / "transcript_uk.txt").unlink()
    with pytest.raises(SystemExit):
        verify_translate(talk_dir, snapshot)


def test_verify_translate_rejects_drift(tmp_path):
    talk_dir, _, snapshot = _make_snapshot(tmp_path)
    (talk_dir / "transcript_uk.txt").write_text("Зовсім інший текст.", encoding="utf-8")
    with pytest.raises(SystemExit):
        verify_translate(talk_dir, snapshot)


# --- verify_build ---


def test_verify_build_accepts_clean_replay(tmp_path, capsys):
    talk_dir, slug, snapshot = _make_snapshot(tmp_path)
    verify_build(talk_dir, slug, snapshot)
    assert "[OK] build" in capsys.readouterr().out


def test_verify_build_rejects_missing_srt(tmp_path):
    talk_dir, slug, snapshot = _make_snapshot(tmp_path)
    (talk_dir / slug / "final" / "uk.srt").unlink()
    with pytest.raises(SystemExit):
        verify_build(talk_dir, slug, snapshot)


def test_verify_build_rejects_missing_manifest(tmp_path):
    talk_dir, slug, snapshot = _make_snapshot(tmp_path)
    (snapshot / "manifest.json").unlink()
    with pytest.raises(SystemExit):
        verify_build(talk_dir, slug, snapshot)


def test_verify_build_rejects_manifest_without_baseline(tmp_path):
    talk_dir, slug, snapshot = _make_snapshot(tmp_path, baseline=None)
    with pytest.raises(SystemExit):
        verify_build(talk_dir, slug, snapshot)


def test_verify_build_rejects_text_drift(tmp_path):
    # SRT text no longer matches the expected transcript.
    bad = [
        {"idx": 1, "start_ms": 0, "end_ms": 3000, "text": "Зовсім."},
        {"idx": 2, "start_ms": 3100, "end_ms": 7000, "text": "Інші слова геть."},
    ]
    talk_dir, slug, snapshot = _make_snapshot(tmp_path, blocks=bad)
    # expected transcript stays the original, so text preservation must fail
    (snapshot / "expected" / "transcript_uk.txt").write_text(TRANSCRIPT, encoding="utf-8")
    with pytest.raises(SystemExit):
        verify_build(talk_dir, slug, snapshot)


def test_verify_build_rejects_overlaps(tmp_path):
    overlapping = [
        {"idx": 1, "start_ms": 0, "end_ms": 4000, "text": "Привіт усім."},
        {"idx": 2, "start_ms": 3000, "end_ms": 7000, "text": "Друге речення тут."},
    ]
    talk_dir, slug, snapshot = _make_snapshot(tmp_path, blocks=overlapping)
    with pytest.raises(SystemExit):
        verify_build(talk_dir, slug, snapshot)


def test_verify_build_rejects_baseline_block_drift(tmp_path):
    talk_dir, slug, snapshot = _make_snapshot(
        tmp_path,
        baseline={"n_blocks": 100, "avg_cps": 5.0, "cps_over_hard": 0, "duration_under_min": 0},
    )
    with pytest.raises(SystemExit):
        verify_build(talk_dir, slug, snapshot)


def test_verify_build_rejects_avg_cps_drift(tmp_path):
    # Correct block count but a wildly different avg CPS → baseline drift.
    talk_dir, slug, snapshot = _make_snapshot(
        tmp_path,
        baseline={"n_blocks": 2, "avg_cps": 50.0, "cps_over_hard": 0, "duration_under_min": 0},
    )
    with pytest.raises(SystemExit):
        verify_build(talk_dir, slug, snapshot)


# --- main() CLI ---


def test_main_runs_translate_and_build(tmp_path, monkeypatch, capsys):
    import sys

    talk_dir, slug, snapshot = _make_snapshot(tmp_path)
    monkeypatch.setattr(
        sys,
        "argv",
        ["verify_snapshot", "--talk-dir", str(talk_dir), "--video-slug", slug, "--snapshot", str(snapshot)],
    )
    main()
    assert "all phases passed" in capsys.readouterr().out


def test_main_requires_args(monkeypatch):
    import sys

    monkeypatch.setattr(sys, "argv", ["verify_snapshot"])
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 2
