"""Tests for tools.optimize_srt."""

import json
import sys

import pytest

from tools.config import OptimizeConfig
from tools.optimize_srt import (
    build_blocks_from_uk_whisper,
    cascade_redistribute,
    enforce_drift_cap,
    find_best_split_point,
    find_block_split_point,
    fix_overlaps,
    main,
    merge_short_blocks,
    merge_sparse_blocks,
    optimize,
    optimize_readability,
    split_blocks_by_duration,
    split_blocks_by_size,
    tag_anchors,
)
from tools.srt_utils import parse_srt

# --- find_best_split_point ---


def test_find_best_split_point_short_text():
    assert find_best_split_point("Short", 42) is None


def test_find_best_split_point_long_text():
    text = "This is a sentence that is quite long. And continues with more words after that."
    pos = find_best_split_point(text, 42)
    assert pos is not None
    assert len(text[:pos]) <= 42
    assert len(text[pos + 1 :]) <= 42


def test_find_best_split_point_prefers_punctuation():
    text = "First sentence ends here and more. Second sentence comes after this."
    pos = find_best_split_point(text, 42)
    assert pos is not None
    # Should split after the period
    assert text[:pos].endswith(".")


# --- find_block_split_point ---


def test_find_block_split_point_sentence_boundary():
    text = "First sentence here. Second sentence there."
    pos = find_block_split_point(text)
    assert pos is not None
    part1 = text[:pos].strip()
    part2 = text[pos:].strip()
    assert part1.endswith(".")
    assert len(part2) > 0


def test_find_block_split_point_clause_boundary():
    text = "One long clause without ending, but another part follows here"
    pos = find_block_split_point(text)
    assert pos is not None
    assert 0 < pos < len(text)


def test_find_block_split_point_word_fallback():
    text = "word1 word2 word3 word4 word5 word6"
    pos = find_block_split_point(text)
    assert pos is not None
    assert 0 < pos < len(text)


# --- split_blocks_by_duration ---


def test_split_blocks_by_duration_under_limit():
    config = OptimizeConfig(max_duration_ms=7000)
    blocks = [{"idx": 1, "start_ms": 0, "end_ms": 5000, "text": "Short block."}]
    result, splits = split_blocks_by_duration(blocks, config)
    assert splits == 0
    assert len(result) == 1


def test_split_blocks_by_duration_over_limit():
    config = OptimizeConfig(max_duration_ms=7000, min_duration_ms=1000)
    text = "First sentence here. Second sentence continues with more words to fill."
    blocks = [{"idx": 1, "start_ms": 0, "end_ms": 15000, "text": text}]
    result, splits = split_blocks_by_duration(blocks, config)
    assert splits > 0
    assert len(result) > 1
    # Text preserved across split
    combined = " ".join(b["text"] for b in result)
    assert combined.replace("  ", " ").strip() == text.strip()


# --- split_blocks_by_size ---


def test_split_blocks_by_size_under_limit():
    config = OptimizeConfig()
    blocks = [{"idx": 1, "start_ms": 0, "end_ms": 5000, "text": "Short text."}]
    result, splits = split_blocks_by_size(blocks, config)
    assert splits == 0
    assert len(result) == 1


def test_split_blocks_by_size_over_limit():
    config = OptimizeConfig(max_chars_block=40)
    text = "This is a very long block of text. It exceeds the character limit by quite a lot."
    blocks = [{"idx": 1, "start_ms": 0, "end_ms": 6000, "text": text}]
    result, splits = split_blocks_by_size(blocks, config)
    assert splits > 0
    assert len(result) > 1


# --- merge_short_blocks ---


def test_merge_short_blocks_merges_two_short():
    config = OptimizeConfig(min_duration_ms=1200)
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 800, "text": "Hi"},
        {"idx": 2, "start_ms": 900, "end_ms": 1700, "text": "there"},
    ]
    result, merged = merge_short_blocks(blocks, config)
    assert merged > 0
    assert len(result) == 1
    assert "Hi" in result[0]["text"]
    assert "there" in result[0]["text"]


def test_merge_short_blocks_keeps_long():
    config = OptimizeConfig(min_duration_ms=1200)
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 3000, "text": "This is long enough to stay."},
        {"idx": 2, "start_ms": 3200, "end_ms": 6200, "text": "And so is this block."},
    ]
    result, merged = merge_short_blocks(blocks, config)
    assert merged == 0
    assert len(result) == 2


# --- build_blocks_from_uk_whisper ---


def test_build_blocks_from_uk_whisper(tmp_path):
    data = {
        "language": "uk",
        "segments": [
            {"id": 0, "start": 1.0, "end": 4.0, "text": "Перший блок."},
            {"id": 1, "start": 4.5, "end": 7.5, "text": "Другий блок."},
            {"id": 2, "start": 8.0, "end": 11.0, "text": ""},
        ],
    }
    path = tmp_path / "uk_whisper.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    blocks = build_blocks_from_uk_whisper(path)
    assert len(blocks) == 2  # empty segment skipped
    assert blocks[0]["text"] == "Перший блок."
    assert blocks[0]["start_ms"] == 1000
    assert blocks[1]["text"] == "Другий блок."


# --- optimize() full pipeline ---


def test_optimize_text_preserved(sample_srt_path, sample_whisper_path, tmp_srt):
    optimize(
        srt_path=str(sample_srt_path),
        json_path=str(sample_whisper_path),
        output_path=str(tmp_srt),
    )
    from tools.srt_utils import parse_srt

    original = parse_srt(sample_srt_path)
    optimized = parse_srt(tmp_srt)
    orig_text = " ".join(b["text"].replace("\n", " ") for b in original)
    opt_text = " ".join(b["text"].replace("\n", " ") for b in optimized)
    # Normalize whitespace for comparison
    import re

    orig_norm = re.sub(r"\s+", " ", orig_text).strip()
    opt_norm = re.sub(r"\s+", " ", opt_text).strip()
    assert orig_norm == opt_norm


def test_optimize_output_written(sample_srt_path, sample_whisper_path, tmp_srt):
    optimize(
        srt_path=str(sample_srt_path),
        json_path=str(sample_whisper_path),
        output_path=str(tmp_srt),
    )
    assert tmp_srt.exists()
    assert tmp_srt.stat().st_size > 0


def test_optimize_with_uk_json(sample_whisper_path, tmp_path):
    uk_data = {
        "language": "uk",
        "segments": [
            {"id": 0, "start": 1.0, "end": 4.0, "text": "Перший блок тексту."},
            {"id": 1, "start": 4.5, "end": 7.5, "text": "Другий блок з текстом."},
        ],
    }
    uk_json = tmp_path / "uk_whisper.json"
    uk_json.write_text(json.dumps(uk_data, ensure_ascii=False), encoding="utf-8")
    output = tmp_path / "uk.srt"

    optimize(
        srt_path=None,
        json_path=str(sample_whisper_path),
        output_path=str(output),
        uk_json_path=str(uk_json),
    )
    assert output.exists()
    from tools.srt_utils import parse_srt

    blocks = parse_srt(output)
    full_text = " ".join(b["text"] for b in blocks)
    assert "Перший" in full_text
    assert "Другий" in full_text


def test_optimize_idempotent_with_small_max_duration(tmp_path):
    """CPS extension must not grow a block past the duration-split cap.

    With a small --max-duration, extend_cps used to stretch a high-CPS block
    toward chars/target_cps (past the cap); the SECOND run's Phase 1b then
    split it — the issue #739 non-idempotency class, reachable via CLI flags
    (any --max-duration < max_chars_block/target_cps*1000 - 1000). The same
    chars/cps growth bound guards cascade_redistribute and absorb_large_gaps.
    """
    config = OptimizeConfig(max_duration_ms=4000)
    text = "This sentence runs long enough to need more reading time. Second part is here."
    # 78 chars over 4.9s: CPS 15.9 > target 15, so extend_cps wants
    # 78/15 = 5200ms — past the 5000ms split cap (max_duration + 1000).
    assert len(text) == 78
    src = tmp_path / "in.srt"
    src.write_text(f"1\n00:00:00,000 --> 00:00:04,900\n{text}\n\n", encoding="utf-8")
    out1 = tmp_path / "out1.srt"
    out2 = tmp_path / "out2.srt"
    optimize(srt_path=str(src), json_path=None, output_path=str(out1), config=config)
    optimize(srt_path=str(out1), json_path=None, output_path=str(out2), config=config)

    key = [(b["start_ms"], b["end_ms"], b["text"]) for b in parse_srt(out1)]
    key2 = [(b["start_ms"], b["end_ms"], b["text"]) for b in parse_srt(out2)]
    assert key == key2


# --- trim_blocks_to_speech (silence guard) ---


def _whisper_words(*spans):
    """Build a minimal whisper payload from (start_s, end_s, word) triples."""
    return [
        {
            "start": spans[0][0],
            "end": spans[-1][1],
            "words": [{"start": s, "end": e, "word": w} for s, e, w in spans],
        }
    ]


def test_merge_sparse_blocks_does_not_bridge_a_speech_pause():
    """Touching timecodes are not proof of touching speech.

    A block inherited from a padded EN SRT ends long after its last word, so
    the SRT-level gap to the next block reads as ~0 while the speaker was
    actually silent for seconds. Merging there puts one subtitle over the
    pause (2000-07-23 Guru Puja, "Що робить Ґуру? Все, що у вас є…", 26s).
    """
    config = OptimizeConfig()
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 12000, "text": "Сьогодні ми тут."},
        {"idx": 2, "start_ms": 12100, "end_ms": 22000, "text": "Що робить Ґуру?"},
    ]
    # Speech stops at 3.0s and resumes at 12.1s — a 9.1s pause.
    words = [(0, 3000), (12100, 14000)]

    result, merged = merge_sparse_blocks(blocks, config, word_intervals=words)

    assert merged == 0
    assert len(result) == 2


def test_merge_sparse_blocks_merges_when_speech_is_continuous():
    """The pause guard must not block ordinary merges of adjacent speech."""
    config = OptimizeConfig()
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 3000, "text": "Сьогодні ми тут."},
        {"idx": 2, "start_ms": 3100, "end_ms": 5700, "text": "Ґуру."},
    ]
    # Words fill both blocks end to end — no silence anywhere to merge over.
    words = [(0, 3000), (3100, 5700)]

    result, merged = merge_sparse_blocks(blocks, config, word_intervals=words)

    assert merged == 1
    assert len(result) == 1


def test_merge_sparse_blocks_does_not_absorb_a_block_that_covers_silence():
    """A block already sitting over a pause must not grow by absorbing a
    neighbour — the merged subtitle would span the whole silence.

    Real case: "Усе знання, вся духовність, вся радість – все там." (speech
    ends at 431.2s) merged with "Якраз вчасно!" (speech 431.3–433.7s, then
    9.7s of laughter) into one 23.8s subtitle.
    """
    config = OptimizeConfig()
    blocks = [
        {"idx": 1, "start_ms": 419560, "end_ms": 431240, "text": "Усе знання, вся радість – все там."},
        {"idx": 2, "start_ms": 431320, "end_ms": 443370, "text": "Якраз вчасно!"},
    ]
    # Speech is continuous across the boundary, but block 2 runs 9.7s past its
    # last word.
    words = [(419560, 431240), (431320, 433700)]

    result, merged = merge_sparse_blocks(blocks, config, word_intervals=words)

    assert merged == 0
    assert len(result) == 2


def test_merge_short_blocks_does_not_bridge_a_speech_pause():
    config = OptimizeConfig(min_duration_ms=1200)
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 12000, "text": "Привіт."},
        {"idx": 2, "start_ms": 12100, "end_ms": 12900, "text": "Ґуру."},
    ]
    words = [(0, 3000), (12100, 12900)]

    result, merged = merge_short_blocks(blocks, config, word_intervals=words)

    assert merged == 0
    assert len(result) == 2


def test_optimize_does_not_merge_across_a_speech_pause(tmp_path):
    """Two blocks separated by real silence must stay separate.

    Sparse-block merging used to bridge them whenever their SRT timecodes
    happened to touch — producing one subtitle covering a multi-second pause
    (2000-07-23 Guru Puja: "Що робить Ґуру? Все, що у вас є…", 26s on screen).
    """
    config = OptimizeConfig()
    src = tmp_path / "in.srt"
    src.write_text(
        "1\n00:00:00,000 --> 00:00:12,000\nСьогодні ми тут, щоб пізнати Принцип Ґуру.\n\n"
        "2\n00:00:12,100 --> 00:00:22,000\nЩо робить Ґуру?\n\n",
        encoding="utf-8",
    )
    whisper = tmp_path / "whisper.json"
    whisper.write_text(
        json.dumps(
            {
                "segments": [
                    {
                        "start": 0.0,
                        "end": 3.0,
                        "words": [{"start": 0.0, "end": 3.0, "word": "Today"}],
                    },
                    {
                        "start": 12.1,
                        "end": 14.0,
                        "words": [{"start": 12.1, "end": 14.0, "word": "What"}],
                    },
                ]
            }
        ),
        encoding="utf-8",
    )
    out = tmp_path / "out.srt"

    optimize(srt_path=str(src), json_path=str(whisper), output_path=str(out), config=config)

    blocks = parse_srt(out)
    assert len(blocks) == 2, f"blocks were merged across a pause: {blocks}"
    # Not merging is the whole fix — the timings themselves stay untouched.
    assert [(b["start_ms"], b["end_ms"]) for b in blocks] == [(0, 12000), (12100, 22000)]


def test_optimize_without_whisper_json(sample_srt_path, tmp_srt):
    optimize(
        srt_path=str(sample_srt_path),
        json_path=None,
        output_path=str(tmp_srt),
    )
    assert tmp_srt.exists()
    from tools.srt_utils import parse_srt

    blocks = parse_srt(tmp_srt)
    assert len(blocks) > 0


# --- cascade_redistribute ---


def _cps(block):
    chars = len(block["text"].replace("\n", ""))
    return chars / ((block["end_ms"] - block["start_ms"]) / 1000.0)


def test_cascade_redistribute_hard_max_rescue_uses_dense_donors():
    """A block above hard_max_cps surrounded only by above-target neighbors
    must still be rescued: donors with slack up to (just below) hard_max_cps
    are eligible, not only sub-target ones."""
    config = OptimizeConfig()  # target 15, hard max 20
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 3200, "text": "a" * 50},  # CPS 15.6
        {"idx": 2, "start_ms": 3280, "end_ms": 6480, "text": "b" * 50},  # CPS 15.6
        {"idx": 3, "start_ms": 6560, "end_ms": 8760, "text": "c" * 62},  # CPS 28.2
        {"idx": 4, "start_ms": 8840, "end_ms": 12040, "text": "d" * 50},  # CPS 15.6
        {"idx": 5, "start_ms": 12120, "end_ms": 15320, "text": "e" * 50},  # CPS 15.6
    ]
    result = cascade_redistribute(blocks, config, [])
    assert all(_cps(b) <= config.hard_max_cps for b in result), [round(_cps(b), 1) for b in result]


def test_cascade_redistribute_leaves_soft_blocks_untouched():
    """Blocks between target and hard max must NOT be densified by the
    hard-max rescue tier — it only fixes hard violations."""
    config = OptimizeConfig()
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 3400, "text": "a" * 55},  # CPS 16.2
        {"idx": 2, "start_ms": 3480, "end_ms": 6980, "text": "b" * 60},  # CPS 17.1
        {"idx": 3, "start_ms": 7060, "end_ms": 10460, "text": "c" * 55},  # CPS 16.2
    ]
    before = [(b["start_ms"], b["end_ms"]) for b in blocks]
    result = cascade_redistribute(blocks, config, [])
    assert [(b["start_ms"], b["end_ms"]) for b in result] == before


def test_cascade_redistribute_keeps_a_following_donor_at_min_duration():
    config = OptimizeConfig()
    recipient_at_30_cps = {"idx": 1, "start_ms": 0, "end_ms": 2000, "text": "x" * 60}
    three_char_donor_at_1520ms = {"idx": 2, "start_ms": 2080, "end_ms": 3600, "text": "xxx"}

    result = cascade_redistribute([recipient_at_30_cps, three_char_donor_at_1520ms], config, [])

    assert result[1]["end_ms"] - result[1]["start_ms"] >= config.min_duration_ms


def test_cascade_redistribute_keeps_a_preceding_donor_at_min_duration():
    config = OptimizeConfig()
    three_char_donor_at_1520ms = {"idx": 1, "start_ms": 0, "end_ms": 1520, "text": "xxx"}
    recipient_at_30_cps = {"idx": 2, "start_ms": 1600, "end_ms": 3600, "text": "x" * 60}

    result = cascade_redistribute([three_char_donor_at_1520ms, recipient_at_30_cps], config, [])

    assert result[0]["end_ms"] - result[0]["start_ms"] >= config.min_duration_ms


# --- enforce_drift_cap ---


def test_enforce_drift_cap_is_off_unless_a_budget_is_configured():
    config = OptimizeConfig()
    eight_seconds_after_its_anchor = {"idx": 1, "start_ms": 8000, "end_ms": 10000, "text": "x" * 20, "anchor_ms": 0}

    enforce_drift_cap([eight_seconds_after_its_anchor], config)

    assert eight_seconds_after_its_anchor["start_ms"] == 8000


def test_enforce_drift_cap_pulls_a_late_block_back_to_the_edge_of_its_window():
    config = OptimizeConfig(max_drift_ms=1000)
    started_2500ms_after_its_anchor = {"idx": 1, "start_ms": 2500, "end_ms": 5000, "text": "x" * 20, "anchor_ms": 0}

    enforce_drift_cap([started_2500ms_after_its_anchor], config)

    assert started_2500ms_after_its_anchor["start_ms"] == 1000
    assert started_2500ms_after_its_anchor["end_ms"] == 5000


def test_enforce_drift_cap_pushes_an_early_block_forward_to_the_edge_of_its_window():
    config = OptimizeConfig(max_drift_ms=1000)
    started_2500ms_before_its_anchor = {"idx": 1, "start_ms": 0, "end_ms": 6000, "text": "x" * 20, "anchor_ms": 2500}

    enforce_drift_cap([started_2500ms_before_its_anchor], config)

    assert started_2500ms_before_its_anchor["start_ms"] == 1500


def test_enforce_drift_cap_keeps_a_block_it_pushed_forward_at_min_duration():
    config = OptimizeConfig(max_drift_ms=1000)
    early_block_with_little_room = {"idx": 1, "start_ms": 0, "end_ms": 2000, "text": "x" * 20, "anchor_ms": 2500}

    enforce_drift_cap([early_block_with_little_room], config)

    span = early_block_with_little_room["end_ms"] - early_block_with_little_room["start_ms"]
    assert span >= config.min_duration_ms


def test_enforce_drift_cap_leaves_a_block_that_carries_no_anchor():
    config = OptimizeConfig(max_drift_ms=1000)
    block_a_split_left_without_an_anchor = {"idx": 1, "start_ms": 9000, "end_ms": 11000, "text": "x" * 20}

    enforce_drift_cap([block_a_split_left_without_an_anchor], config)

    assert block_a_split_left_without_an_anchor["start_ms"] == 9000


def test_enforce_drift_cap_will_not_shorten_a_block_past_the_hard_cps_ceiling():
    config = OptimizeConfig(max_drift_ms=1000)
    early_block_that_the_budget_would_turn_dense = {
        "idx": 1,
        "start_ms": 0,
        "end_ms": 4000,
        "text": "x" * 60,
        "anchor_ms": 2500,
    }

    enforce_drift_cap([early_block_that_the_budget_would_turn_dense], config)

    b = early_block_that_the_budget_would_turn_dense
    assert 60 / ((b["end_ms"] - b["start_ms"]) / 1000) <= config.hard_max_cps


def test_enforce_drift_cap_will_not_crush_the_previous_block_to_pull_a_late_one_back():
    config = OptimizeConfig(max_drift_ms=1000)
    fifty_chars_readable_at_3s = {"idx": 1, "start_ms": 0, "end_ms": 3000, "text": "x" * 50, "anchor_ms": 0}
    started_2500ms_late = {"idx": 2, "start_ms": 3080, "end_ms": 6000, "text": "x" * 20, "anchor_ms": 580}
    blocks = [fifty_chars_readable_at_3s, started_2500ms_late]

    enforce_drift_cap(blocks, config)
    fix_overlaps(blocks, config)

    assert 50 / ((blocks[0]["end_ms"] - blocks[0]["start_ms"]) / 1000) <= config.hard_max_cps


def test_cascade_rescue_leaves_the_drift_budget_to_clear_the_hard_ceiling():
    config = OptimizeConfig(max_drift_ms=100)
    stuck_at_30_cps = {"idx": 1, "start_ms": 0, "end_ms": 2000, "text": "x" * 60, "anchor_ms": 0}
    donor_with_seconds_to_spare = {"idx": 2, "start_ms": 2080, "end_ms": 9000, "text": "xx", "anchor_ms": 2080}

    result = cascade_redistribute([stuck_at_30_cps, donor_with_seconds_to_spare], config, [])

    assert 60 / ((result[0]["end_ms"] - result[0]["start_ms"]) / 1000) <= config.hard_max_cps


def test_tag_anchors_tags_nothing_when_the_counts_disagree(tmp_path):
    timecodes = tmp_path / "timecodes.txt"
    timecodes.write_text("#1 | 00:00:01,000 | 00:00:04,000\n", encoding="utf-8")
    two_blocks_for_one_timecode = [
        {"idx": 1, "start_ms": 1000, "end_ms": 4000, "text": "x"},
        {"idx": 2, "start_ms": 5000, "end_ms": 8000, "text": "y"},
    ]

    line = tag_anchors(two_blocks_for_one_timecode, str(timecodes))

    assert "NOT APPLIED" in line
    assert all("anchor_ms" not in b for b in two_blocks_for_one_timecode)


def test_main_rejects_a_drift_budget_without_anchors(monkeypatch, tmp_path):
    src = tmp_path / "in.srt"
    src.write_text("1\n00:00:01,000 --> 00:00:05,000\nHello world\n\n", encoding="utf-8")
    monkeypatch.setattr(
        sys,
        "argv",
        ["optimize_srt", "--srt", str(src), "--output", str(tmp_path / "o.srt"), "--max-drift-ms", "2000"],
    )

    with pytest.raises(SystemExit) as exc:
        main()

    assert exc.value.code == 2


def test_optimize_readability_holds_every_anchored_block_inside_the_budget():
    config = OptimizeConfig(max_drift_ms=1000, skip_duration_split=True, skip_cps_split=True)
    crowded = [
        {"idx": i, "start_ms": i * 2000, "end_ms": i * 2000 + 1500, "text": "x" * 70, "anchor_ms": i * 2000}
        for i in range(1, 12)
    ]

    result = optimize_readability(crowded, [], config, [])

    assert all(abs(b["start_ms"] - b["anchor_ms"]) <= 1000 for b in result if "anchor_ms" in b)


# --- CLI entry point ---


def test_main_requires_srt_or_uk_json(monkeypatch, tmp_path):
    monkeypatch.setattr(sys, "argv", ["optimize_srt", "--output", str(tmp_path / "o.srt")])
    with pytest.raises(SystemExit) as exc:
        main()
    assert exc.value.code == 2  # argparse parser.error


def test_main_optimizes_srt_file(monkeypatch, tmp_path):
    src = tmp_path / "in.srt"
    src.write_text(
        "1\n00:00:01,000 --> 00:00:05,000\nHello world this is a sample subtitle line\n\n",
        encoding="utf-8",
    )
    out = tmp_path / "out.srt"
    monkeypatch.setattr(sys, "argv", ["optimize_srt", "--srt", str(src), "--output", str(out)])
    main()
    assert out.is_file()
    blocks = parse_srt(str(out))
    assert len(blocks) >= 1
    assert all(b["start_ms"] < b["end_ms"] for b in blocks)
