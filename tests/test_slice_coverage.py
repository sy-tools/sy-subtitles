"""Coverage across the videos of a talk built as slices of one transcript.

Each part's builder decides on its own which blocks its recording speaks, so
nothing in a single build can see a passage no part claimed, or one that two
parts both claimed. This check looks across the parts after the build. It
warns and never fails: the split is best effort, and a person reviews it.
"""

import subprocess
import sys

import yaml

from tools.slice_coverage import coverage, render_summary

TRANSCRIPT = "Перше речення.\n\nДруге речення.\n\nТретє речення.\n\nЧетверте речення.\n\nПʼяте речення.\n"


def _talk(tmp_path, timecodes: dict[str, list[int] | None]):
    talk = tmp_path / "talks" / "1977-11-01_Workshop"
    talk.mkdir(parents=True)
    videos = [{"slug": slug, "sync": "independent"} for slug in timecodes]
    (talk / "meta.yaml").write_text(yaml.safe_dump({"videos": videos}), encoding="utf-8")
    (talk / "transcript_uk.txt").write_text(TRANSCRIPT, encoding="utf-8")
    for slug, ids in timecodes.items():
        if ids is None:
            continue
        work = talk / slug / "work"
        work.mkdir(parents=True)
        lines = [f"#{i} | 00:00:{i:02d},000 | 00:00:{i:02d},900" for i in ids]
        (work / "timecodes.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return talk


def test_parts_that_split_the_transcript_cleanly_report_nothing(tmp_path):
    talk = _talk(tmp_path, {"Part-1": [1, 2], "Part-2": [3, 4, 5]})
    result = coverage(talk)
    assert result.total == 5
    assert result.missing == []
    assert result.shared == []


def test_a_passage_no_part_claimed_is_reported_as_one_run(tmp_path):
    talk = _talk(tmp_path, {"Part-1": [1], "Part-2": [4, 5]})
    result = coverage(talk)
    assert result.missing == [(2, 3)]


def test_a_block_two_parts_claimed_is_reported_with_both(tmp_path):
    talk = _talk(tmp_path, {"Part-1": [1, 2, 3], "Part-2": [3, 4, 5]})
    assert coverage(talk).shared == [(3, ["Part-1", "Part-2"])]


def test_a_part_without_timecodes_is_listed_as_not_built(tmp_path):
    talk = _talk(tmp_path, {"Part-1": [1, 2], "Part-2": None})
    result = coverage(talk)
    assert result.not_built == ["Part-2"]
    assert result.missing == [(3, 5)]


def test_the_summary_quotes_the_first_unclaimed_block(tmp_path):
    talk = _talk(tmp_path, {"Part-1": [1], "Part-2": [4, 5]})
    summary = render_summary(coverage(talk))
    assert "#2–#3" in summary
    assert "Друге речення." in summary


def test_the_cli_warns_and_still_exits_zero(tmp_path):
    talk = _talk(tmp_path, {"Part-1": [1], "Part-2": [3, 4, 5]})
    out = subprocess.run(
        [sys.executable, "-m", "tools.slice_coverage", "--talk-dir", str(talk)],
        capture_output=True,
        text=True,
    )
    assert out.returncode == 0
    assert "::warning::" in out.stderr
    assert "#2" in out.stderr


def test_a_talk_that_builds_one_video_is_not_a_slice_and_is_skipped(tmp_path):
    talk = _talk(tmp_path, {"Part-1": [1, 2, 3, 4, 5]})
    out = subprocess.run(
        [sys.executable, "-m", "tools.slice_coverage", "--talk-dir", str(talk)],
        capture_output=True,
        text=True,
    )
    assert out.returncode == 0
    assert "::warning::" not in out.stderr
