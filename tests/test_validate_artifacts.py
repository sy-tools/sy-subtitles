"""Tests for tools.validate_artifacts — timecode validation modes.

Covers the en-srt-mode relaxations added alongside the builder/validator
contract change: in en-srt mode the builder agent may drop UK blocks without an EN
counterpart, so the timecode artifact is allowed to have skipped IDs up
to a maximum block count, instead of a strict 1..N sequence.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest
import yaml

from tools.validate_artifacts import (
    _check_meta,
    _check_talk_dir,
    _check_timecodes,
    _check_whisper,
    main,
)

from .test_schemas import GOOD_META, GOOD_WHISPER


def _write(path: Path, ids_with_times: list[tuple[int, str, str]]) -> Path:
    path.write_text(
        "\n".join(f"#{i} | {s} | {e}" for i, s, e in ids_with_times),
        encoding="utf-8",
    )
    return path


# ---------------------------------------------------------------------------
#  Whisper-mode contract: strict sequential IDs, exact count
# ---------------------------------------------------------------------------


def test_sequential_ids_ok(tmp_path):
    p = _write(
        tmp_path / "tc.txt",
        [
            (1, "00:00:01,000", "00:00:03,000"),
            (2, "00:00:04,000", "00:00:06,000"),
            (3, "00:00:07,000", "00:00:09,000"),
        ],
    )
    _check_timecodes(str(p), expected_blocks=3)


def test_non_sequential_ids_rejected_by_default(tmp_path):
    p = _write(
        tmp_path / "tc.txt",
        [
            (1, "00:00:01,000", "00:00:03,000"),
            (3, "00:00:04,000", "00:00:06,000"),  # skips #2
        ],
    )
    with pytest.raises(SystemExit):
        _check_timecodes(str(p))


def test_expected_blocks_mismatch_rejected(tmp_path):
    p = _write(
        tmp_path / "tc.txt",
        [
            (1, "00:00:01,000", "00:00:03,000"),
            (2, "00:00:04,000", "00:00:06,000"),
        ],
    )
    with pytest.raises(SystemExit):
        _check_timecodes(str(p), expected_blocks=5)


# ---------------------------------------------------------------------------
#  En-srt-mode contract: ascending IDs may skip, count capped by max
# ---------------------------------------------------------------------------


def test_skipped_ids_accepted_when_allowed(tmp_path):
    p = _write(
        tmp_path / "tc.txt",
        [
            (1, "00:00:01,000", "00:00:03,000"),
            (3, "00:00:04,000", "00:00:06,000"),  # skips #2
            (7, "00:00:07,000", "00:00:09,000"),  # skips #4,5,6
        ],
    )
    _check_timecodes(str(p), allow_skipped_ids=True, max_blocks=7)


def test_skipped_ids_still_must_be_strictly_ascending(tmp_path):
    """`--allow-skipped-ids` relaxes sequential check, not monotonic."""
    p = _write(
        tmp_path / "tc.txt",
        [
            (3, "00:00:01,000", "00:00:03,000"),
            (2, "00:00:04,000", "00:00:06,000"),  # goes backward
        ],
    )
    with pytest.raises(SystemExit):
        _check_timecodes(str(p), allow_skipped_ids=True, max_blocks=10)


def test_duplicate_id_rejected_even_when_skip_allowed(tmp_path):
    p = _write(
        tmp_path / "tc.txt",
        [
            (1, "00:00:01,000", "00:00:03,000"),
            (1, "00:00:04,000", "00:00:06,000"),
        ],
    )
    with pytest.raises(SystemExit):
        _check_timecodes(str(p), allow_skipped_ids=True, max_blocks=10)


def test_max_blocks_enforced(tmp_path):
    p = _write(
        tmp_path / "tc.txt",
        [
            (1, "00:00:01,000", "00:00:03,000"),
            (2, "00:00:04,000", "00:00:06,000"),
            (3, "00:00:07,000", "00:00:09,000"),
            (4, "00:00:10,000", "00:00:12,000"),
        ],
    )
    # OK: under max
    _check_timecodes(str(p), allow_skipped_ids=True, max_blocks=5)
    # Fail: over max
    with pytest.raises(SystemExit):
        _check_timecodes(str(p), allow_skipped_ids=True, max_blocks=3)


# ---------------------------------------------------------------------------
#  _check_timecodes structural failures (the safety net must reject bad output)
# ---------------------------------------------------------------------------


def test_missing_timecodes_file_is_rejected(tmp_path):
    with pytest.raises(SystemExit):
        _check_timecodes(str(tmp_path / "absent.txt"))


def test_malformed_timecode_line_is_rejected(tmp_path):
    p = tmp_path / "tc.txt"
    p.write_text("#1 | not-a-timestamp | also-not\n", encoding="utf-8")
    with pytest.raises(SystemExit):
        _check_timecodes(str(p))


def test_start_not_before_end_is_rejected(tmp_path):
    # start == end is invalid (zero/negative duration block).
    p = _write(tmp_path / "tc.txt", [(1, "00:00:05,000", "00:00:05,000")])
    with pytest.raises(SystemExit):
        _check_timecodes(str(p))


def test_blank_only_timecodes_reports_no_blocks(tmp_path):
    p = tmp_path / "tc.txt"
    p.write_text("\n   \n\n", encoding="utf-8")
    with pytest.raises(SystemExit):
        _check_timecodes(str(p))


# ---------------------------------------------------------------------------
#  Whisper / meta schema gates
# ---------------------------------------------------------------------------


def test_check_whisper_accepts_valid(tmp_path, capsys):
    p = tmp_path / "whisper.json"
    p.write_text(json.dumps(GOOD_WHISPER), encoding="utf-8")
    _check_whisper(str(p))
    assert "OK: whisper" in capsys.readouterr().out


def test_check_whisper_rejects_missing_segments(tmp_path):
    p = tmp_path / "whisper.json"
    p.write_text(json.dumps({"language": "en"}), encoding="utf-8")
    with pytest.raises(SystemExit):
        _check_whisper(str(p))


def test_check_meta_accepts_valid(tmp_path, capsys):
    p = tmp_path / "meta.yaml"
    p.write_text(yaml.safe_dump(GOOD_META, allow_unicode=True), encoding="utf-8")
    _check_meta(str(p))
    assert "OK: meta" in capsys.readouterr().out


def test_check_meta_rejects_bad_date(tmp_path):
    p = tmp_path / "meta.yaml"
    p.write_text(yaml.safe_dump(dict(GOOD_META, date="not-a-date")), encoding="utf-8")
    with pytest.raises(SystemExit):
        _check_meta(str(p))


# ---------------------------------------------------------------------------
#  _check_talk_dir — whole-talk artifact sweep
# ---------------------------------------------------------------------------


def test_talk_dir_missing_meta_is_rejected(tmp_path):
    with pytest.raises(SystemExit):
        _check_talk_dir(str(tmp_path))


def test_talk_dir_validates_meta_whisper_and_timecodes(tmp_path, capsys):
    (tmp_path / "meta.yaml").write_text(yaml.safe_dump(GOOD_META, allow_unicode=True), encoding="utf-8")
    video = tmp_path / "Some-Video"
    (video / "source").mkdir(parents=True)
    (video / "work").mkdir(parents=True)
    (video / "source" / "whisper.json").write_text(json.dumps(GOOD_WHISPER), encoding="utf-8")
    _write(video / "work" / "timecodes.txt", [(1, "00:00:01,000", "00:00:03,000")])
    _check_talk_dir(str(tmp_path))
    out = capsys.readouterr().out
    assert "OK: meta" in out and "OK: whisper" in out and "OK: timecodes" in out


# ---------------------------------------------------------------------------
#  CLI entry point (argparse dispatch + exit codes)
# ---------------------------------------------------------------------------


def test_cli_requires_at_least_one_input(monkeypatch):
    monkeypatch.setattr(sys, "argv", ["validate_artifacts"])
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 2  # argparse parser.error


def test_cli_timecodes_ok_returns_cleanly(tmp_path, monkeypatch, capsys):
    p = _write(tmp_path / "tc.txt", [(1, "00:00:01,000", "00:00:03,000")])
    monkeypatch.setattr(sys, "argv", ["validate_artifacts", "--timecodes", str(p)])
    main()  # must not raise
    assert "OK: timecodes" in capsys.readouterr().out


def test_cli_bad_timecodes_exits_nonzero(tmp_path, monkeypatch):
    p = tmp_path / "tc.txt"
    p.write_text("garbage line\n", encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["validate_artifacts", "--timecodes", str(p)])
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 1  # _fail()


def test_cli_whisper_dispatch(tmp_path, monkeypatch, capsys):
    p = tmp_path / "whisper.json"
    p.write_text(json.dumps(GOOD_WHISPER), encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["validate_artifacts", "--whisper", str(p)])
    main()
    assert "OK: whisper" in capsys.readouterr().out


def test_cli_meta_dispatch(tmp_path, monkeypatch, capsys):
    p = tmp_path / "meta.yaml"
    p.write_text(yaml.safe_dump(GOOD_META, allow_unicode=True), encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["validate_artifacts", "--meta", str(p)])
    main()
    assert "OK: meta" in capsys.readouterr().out


def test_cli_talk_dir_dispatch(tmp_path, monkeypatch, capsys):
    (tmp_path / "meta.yaml").write_text(yaml.safe_dump(GOOD_META, allow_unicode=True), encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["validate_artifacts", "--talk-dir", str(tmp_path)])
    main()
    assert "OK: meta" in capsys.readouterr().out
