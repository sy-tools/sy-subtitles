"""Tests for tools.build_srt (internal timing passes)."""

from tools.build_srt import (
    _extend_block,
    apply_padding,
    balance_cps,
    enforce_duration,
    enforce_gaps,
)
from tools.config import OptimizeConfig


def _make_block(idx, start_ms, end_ms, text):
    return {"idx": idx, "start_ms": start_ms, "end_ms": end_ms, "text": text}


# ---------------------------------------------------------------------------
# enforce_gaps
# ---------------------------------------------------------------------------


def test_enforce_gaps_already_ok():
    blocks = [
        _make_block(1, 0, 2000, "A"),
        _make_block(2, 2200, 4000, "B"),
    ]
    config = OptimizeConfig(min_gap_ms=80)
    result = enforce_gaps(blocks, config)
    assert result[0]["end_ms"] == 2000
    assert result[1]["start_ms"] == 2200


def test_enforce_gaps_shrinks_previous():
    blocks = [
        _make_block(1, 0, 2050, "A"),
        _make_block(2, 2060, 4000, "B"),  # gap only 10ms
    ]
    config = OptimizeConfig(min_gap_ms=80)
    result = enforce_gaps(blocks, config)
    assert result[0]["end_ms"] == 2060 - 80  # shrunk to create 80ms gap


def test_enforce_gaps_forced_gap_keeps_start_before_end():
    # Block 2 nested inside block 1 (LLM mapping error): the forced-gap
    # fallback moves block 2's start forward and must not leave start > end.
    blocks = [
        _make_block(1, 1000, 5000, "A"),
        _make_block(2, 1010, 1500, "B"),
    ]
    config = OptimizeConfig(min_gap_ms=80, min_duration_ms=1200)
    result = enforce_gaps(blocks, config)
    for b in result:
        assert b["start_ms"] < b["end_ms"], f"block #{b['idx']} start >= end"
    # gap invariant still holds
    assert result[1]["start_ms"] - result[0]["end_ms"] >= 80


# ---------------------------------------------------------------------------
# apply_padding
# ---------------------------------------------------------------------------


def test_apply_padding_extends_into_silence():
    blocks = [
        _make_block(1, 0, 1000, "A"),
        _make_block(2, 5000, 6000, "B"),  # 4s gap
    ]
    config = OptimizeConfig(min_gap_ms=80)
    result = apply_padding(blocks, config)
    # Block 1 should extend into the gap
    assert result[0]["end_ms"] > 1000
    assert result[0]["end_ms"] < 5000


def test_apply_padding_respects_max_duration():
    blocks = [
        _make_block(1, 0, 1000, "A"),
        _make_block(2, 50000, 51000, "B"),  # huge gap
    ]
    config = OptimizeConfig(min_gap_ms=80, max_duration_ms=21000)
    result = apply_padding(blocks, config)
    # Should not exceed max_duration
    assert result[0]["end_ms"] - result[0]["start_ms"] <= 21000


# ---------------------------------------------------------------------------
# enforce_duration
# ---------------------------------------------------------------------------


def test_enforce_duration_extends_short_block():
    blocks = [
        _make_block(1, 0, 500, "Short"),  # only 500ms
        _make_block(2, 5000, 8000, "Normal"),
    ]
    config = OptimizeConfig(min_duration_ms=1200)
    result = enforce_duration(blocks, config)
    dur = result[0]["end_ms"] - result[0]["start_ms"]
    assert dur >= 1200


# ---------------------------------------------------------------------------
# _extend_block
# ---------------------------------------------------------------------------


def test_extend_block_consumes_adjacent_right_gap_without_shifting():
    # 5080ms silence right after block 1 — the deficit fits entirely there.
    blocks = [
        _make_block(1, 0, 1000, "A"),
        _make_block(2, 6080, 8000, "B"),
        _make_block(3, 8080, 9000, "C"),
    ]
    config = OptimizeConfig(min_gap_ms=80)
    remaining = _extend_block(blocks, 0, 5000, config)
    assert remaining == 0
    assert blocks[0]["end_ms"] == 6000  # ate the silence, left min_gap
    assert blocks[1]["start_ms"] == 6080  # neighbors stay on their audio
    assert blocks[1]["end_ms"] == 8000
    assert blocks[2]["start_ms"] == 8080
    assert blocks[2]["end_ms"] == 9000


def test_extend_block_consumes_adjacent_left_gap_without_shifting():
    blocks = [
        _make_block(1, 2000, 3000, "A"),
        _make_block(2, 8080, 9000, "B"),
    ]
    config = OptimizeConfig(min_gap_ms=80)
    remaining = _extend_block(blocks, 1, 5000, config)
    assert remaining == 0
    assert blocks[1]["start_ms"] == 3080  # ate the silence, left min_gap
    assert blocks[0]["start_ms"] == 2000  # left neighbor untouched
    assert blocks[0]["end_ms"] == 3000


def test_extend_block_cascades_only_for_remainder():
    # Adjacent gap holds 1000ms of slack; the other 2000ms must come from
    # shifting block 2 into the 6000ms silence behind it.
    blocks = [
        _make_block(1, 0, 1000, "A"),
        _make_block(2, 2080, 3000, "B"),
        _make_block(3, 9000, 10000, "C"),
    ]
    config = OptimizeConfig(min_gap_ms=80)
    remaining = _extend_block(blocks, 0, 3000, config)
    assert remaining == 0
    assert blocks[0]["end_ms"] == 4000
    # Block 2 shifted wholesale (duration preserved), min gap kept
    assert blocks[1]["start_ms"] == 4080
    assert blocks[1]["end_ms"] == 5000
    # Block 3 never needed to move
    assert blocks[2]["start_ms"] == 9000


def test_extend_block_reports_unfixable_remainder_without_moving_neighbors():
    blocks = [
        _make_block(1, 0, 1000, "A"),
        _make_block(2, 1160, 2000, "B"),  # only 80ms of slack anywhere
    ]
    config = OptimizeConfig(min_gap_ms=80)
    remaining = _extend_block(blocks, 0, 500, config)
    assert remaining == 420
    assert blocks[0]["end_ms"] == 1080
    assert blocks[1]["start_ms"] == 1160  # not shifted on a false promise
    assert blocks[1]["end_ms"] == 2000


# ---------------------------------------------------------------------------
# balance_cps
# ---------------------------------------------------------------------------


def test_balance_cps_extends_high_cps_block():
    # 40 chars in 1s = 40 CPS (way over 20 threshold)
    blocks = [
        _make_block(1, 0, 1000, "x" * 40),
        _make_block(2, 10000, 15000, "Normal text."),  # big gap before
    ]
    config = OptimizeConfig()
    result = balance_cps(blocks, config, threshold=20)
    # Block 1 should have been extended
    dur = result[0]["end_ms"] - result[0]["start_ms"]
    assert dur > 1000


def test_balance_cps_does_not_shift_neighbor_when_adjacent_silence_suffices():
    # 9s of silence sits right after the high-CPS block; the neighbor's
    # timing is audio-anchored and must not move.
    blocks = [
        _make_block(1, 0, 1000, "x" * 40),
        _make_block(2, 10000, 15000, "Normal text."),
    ]
    config = OptimizeConfig()
    result = balance_cps(blocks, config, threshold=20)
    assert result[1]["start_ms"] == 10000
    assert result[1]["end_ms"] == 15000
