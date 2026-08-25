"""The gate that runs on the plan, before anything is written.

Phase 1 made a failure leave the tree untouched. These checks decide what
counts as a failure: a sync may rewrite subtitle TEXT and it may drop blocks,
but it may never move a timecode or invent one. Timing comes from whisper or
from an EN SRT, never from a text sync (feedback_no_proportional).
"""

from pathlib import Path

from tools.sync_invariants import check_writes

SRT = """1
00:00:01,000 --> 00:00:03,000
Перше.

2
00:00:03,100 --> 00:00:05,000
Друге.

3
00:00:05,100 --> 00:00:07,000
Третє.
"""


def _write(tmp_path, text=SRT) -> str:
    path = tmp_path / "talks" / "t" / "V" / "final" / "uk.srt"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return str(path)


def test_a_text_only_rewrite_passes(tmp_path):
    path = _write(tmp_path)
    assert check_writes({path: SRT.replace("Друге.", "Змінене.")}) == []


def test_dropping_a_block_passes(tmp_path):
    path = _write(tmp_path)
    without_second = SRT.replace("2\n00:00:03,100 --> 00:00:05,000\nДруге.\n\n", "")
    assert check_writes({path: without_second}) == []


def test_a_moved_timecode_is_refused(tmp_path):
    path = _write(tmp_path)
    moved = SRT.replace("00:00:03,100 --> 00:00:05,000", "00:00:03,500 --> 00:00:05,400")
    failures = check_writes({path: moved})
    assert failures
    assert "timecode" in failures[0].lower()


def test_an_added_block_is_refused(tmp_path):
    path = _write(tmp_path)
    grown = SRT + "\n4\n00:00:07,100 --> 00:00:09,000\nЧетверте.\n"
    failures = check_writes({path: grown})
    assert failures
    assert "block" in failures[0].lower()


def test_a_transcript_write_is_not_checked(tmp_path):
    """Only subtitles carry timing."""
    path = tmp_path / "talks" / "t" / "transcript_uk.txt"
    path.parent.mkdir(parents=True)
    path.write_text("Абзац.\n", encoding="utf-8")
    assert check_writes({str(path): "Інший абзац.\n"}) == []


def test_a_brand_new_srt_is_not_checked(tmp_path):
    """Nothing to compare against; the pipeline produced it."""
    missing = str(Path(tmp_path) / "talks" / "t" / "V" / "final" / "uk.srt")
    assert check_writes({missing: SRT}) == []
