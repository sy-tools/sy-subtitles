"""Re-timing a dry-run snapshot after a segmentation change.

`tests/fixtures/pipeline_snapshots/*/work/timecodes.txt` pins the builder
agent's answer for one specific block list. Change how transcripts are cut
into blocks — a new sentence boundary, a newly declared omitted remark — and
those ids no longer line up: blocks without a timecode are dropped and the
replay fails text preservation.

`tools.retime_snapshot` carries the recorded timings over to the current
block list, splitting a block's span at real whisper pauses.
"""

import json
from pathlib import Path

import pytest

from tools.retime_snapshot import retime_snapshot

# Current code cuts this into 3 blocks (the `?»` boundary is a sentence end);
# the snapshot below was recorded when it was still 2.
TRANSCRIPT = (
    "Мова промови: англійська\n\nВін спитав: «Хто ти?» Якщо всі релігії однакові, чому сваряться? Далі текст.\n"
)

OLD_BLOCKS = [
    {"id": 1, "text": "Він спитав: «Хто ти?» Якщо всі релігії однакові, чому сваряться?", "para_idx": 0},
    {"id": 2, "text": "Далі текст.", "para_idx": 0},
]

OLD_TIMECODES = "#1 | 00:00:00,000 | 00:00:10,000\n#2 | 00:00:10,000 | 00:00:13,000\n"

# One unmistakable pause inside block 1: 4.0s → 5.0s.
WHISPER = {
    "language": "en",
    "segments": [
        {
            "id": 0,
            "start": 0.0,
            "end": 10.0,
            "text": "a b c d",
            "words": [
                {"start": 0.0, "end": 2.0, "word": "He"},
                {"start": 2.0, "end": 4.0, "word": "asked"},
                {"start": 5.0, "end": 7.0, "word": "If"},
                {"start": 7.0, "end": 10.0, "word": "religions"},
            ],
        }
    ],
}


def _parse_timecodes(path: Path) -> list[tuple[int, str, str]]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("#"):
            n, start, end = (p.strip() for p in line.lstrip("#").split("|"))
            rows.append((int(n), start, end))
    return rows


@pytest.fixture
def snapshot(tmp_path: Path) -> Path:
    snap = tmp_path / "snapshot"
    (snap / "work").mkdir(parents=True)
    (snap / "expected").mkdir(parents=True)
    (snap / "expected" / "transcript_uk.txt").write_text(TRANSCRIPT, encoding="utf-8")
    (snap / "work" / "uk_blocks.json").write_text(json.dumps(OLD_BLOCKS, ensure_ascii=False), encoding="utf-8")
    (snap / "work" / "timecodes.txt").write_text(OLD_TIMECODES, encoding="utf-8")
    (snap / "manifest.json").write_text(
        json.dumps({"talk_id": "T", "video_slug": "V", "n_blocks": 2, "directly_timed": 2}), encoding="utf-8"
    )
    (tmp_path / "whisper.json").write_text(json.dumps(WHISPER), encoding="utf-8")
    return snap


def test_retime_writes_a_timecode_for_every_current_block(snapshot: Path) -> None:
    result = retime_snapshot(snapshot, snapshot.parent / "whisper.json")

    blocks = json.loads((snapshot / "work" / "uk_blocks.json").read_text(encoding="utf-8"))
    rows = _parse_timecodes(snapshot / "work" / "timecodes.txt")
    assert [b["id"] for b in blocks] == [1, 2, 3]
    assert [r[0] for r in rows] == [1, 2, 3]
    assert result.n_blocks_before == 2
    assert result.n_blocks_after == 3


def test_retime_splits_a_block_at_the_whisper_pause(snapshot: Path) -> None:
    """The split lands on real silence (4.0s–5.0s), not on a character ratio."""
    retime_snapshot(snapshot, snapshot.parent / "whisper.json")
    rows = _parse_timecodes(snapshot / "work" / "timecodes.txt")

    assert rows[0] == (1, "00:00:00,000", "00:00:04,000")
    assert rows[1] == (2, "00:00:05,000", "00:00:10,000")


def test_retime_leaves_untouched_blocks_on_their_recorded_times(snapshot: Path) -> None:
    retime_snapshot(snapshot, snapshot.parent / "whisper.json")
    rows = _parse_timecodes(snapshot / "work" / "timecodes.txt")
    assert rows[2] == (3, "00:00:10,000", "00:00:13,000")


def test_retime_output_is_monotonic_and_non_overlapping(snapshot: Path) -> None:
    retime_snapshot(snapshot, snapshot.parent / "whisper.json")
    rows = _parse_timecodes(snapshot / "work" / "timecodes.txt")
    for _, s, e in rows:
        assert s < e
    for (_, _, prev_end), (_, next_start, _) in zip(rows, rows[1:], strict=False):
        assert prev_end <= next_start


def test_retime_updates_the_manifest_block_count(snapshot: Path) -> None:
    retime_snapshot(snapshot, snapshot.parent / "whisper.json")
    manifest = json.loads((snapshot / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["n_blocks"] == 3
    assert manifest["directly_timed"] == 3


def test_retime_check_mode_reports_without_writing(snapshot: Path) -> None:
    before = (snapshot / "work" / "timecodes.txt").read_text(encoding="utf-8")
    result = retime_snapshot(snapshot, snapshot.parent / "whisper.json", check=True)
    assert result.n_blocks_after == 3
    assert (snapshot / "work" / "timecodes.txt").read_text(encoding="utf-8") == before


def test_retime_is_idempotent(snapshot: Path) -> None:
    """Re-running against an already-current snapshot changes nothing."""
    retime_snapshot(snapshot, snapshot.parent / "whisper.json")
    first = (snapshot / "work" / "timecodes.txt").read_text(encoding="utf-8")
    result = retime_snapshot(snapshot, snapshot.parent / "whisper.json")
    assert (snapshot / "work" / "timecodes.txt").read_text(encoding="utf-8") == first
    assert result.n_blocks_before == result.n_blocks_after == 3


def test_retime_drops_blocks_whose_text_is_now_omitted(tmp_path: Path) -> None:
    """A block that was nothing but a declared remark disappears; the blocks
    around it keep their recorded times."""
    snap = tmp_path / "snapshot"
    (snap / "work").mkdir(parents=True)
    (snap / "expected").mkdir(parents=True)
    (snap / "expected" / "transcript_uk.txt").write_text(
        "Мова промови: англійська\n\nПерший абзац.\n\n(сміх)\n\nТретій абзац.\n", encoding="utf-8"
    )
    (snap / "work" / "uk_blocks.json").write_text(
        json.dumps(
            [
                {"id": 1, "text": "Перший абзац.", "para_idx": 0},
                {"id": 2, "text": "(сміх)", "para_idx": 1},
                {"id": 3, "text": "Третій абзац.", "para_idx": 2},
            ],
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (snap / "work" / "timecodes.txt").write_text(
        "#1 | 00:00:00,000 | 00:00:05,000\n#2 | 00:00:05,000 | 00:00:06,000\n#3 | 00:00:07,000 | 00:00:12,000\n",
        encoding="utf-8",
    )
    (snap / "manifest.json").write_text(json.dumps({"n_blocks": 3, "directly_timed": 3}), encoding="utf-8")
    (tmp_path / "whisper.json").write_text(json.dumps(WHISPER), encoding="utf-8")

    retime_snapshot(snap, tmp_path / "whisper.json")

    rows = _parse_timecodes(snap / "work" / "timecodes.txt")
    assert rows == [(1, "00:00:00,000", "00:00:05,000"), (2, "00:00:07,000", "00:00:12,000")]
