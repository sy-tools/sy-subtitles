"""Tests for tools.snap_srt_to_whisper — forced word-level alignment of an
English SRT to whisper word timestamps (same-language sync)."""

from tools.snap_srt_to_whisper import align_blocks_to_words, snap_to_whisper


def _segs(words):
    """words: list of (word, start_ms, end_ms)."""
    return [{"words": [{"word": w, "start": s / 1000.0, "end": e / 1000.0} for w, s, e in words]}]


def test_snaps_block_to_its_word_span():
    """A block whose builder time is 2.6s off the speech is re-timed to its words."""
    segs = _segs([("As", 59000, 59300), ("Rustom", 59300, 59600), ("says", 59600, 60000)])
    blocks = [{"idx": 1, "start_ms": 56000, "end_ms": 58000, "text": "As Rustom says"}]
    out, unmatched = snap_to_whisper(blocks, segs, min_gap_ms=80, min_duration_ms=0)
    assert out[0]["start_ms"] == 59000
    assert out[0]["end_ms"] == 60000
    assert unmatched == []


def test_block_with_no_whisper_match_is_kept_and_flagged():
    segs = _segs([("hello", 1000, 1500)])
    blocks = [
        {"idx": 1, "start_ms": 1000, "end_ms": 1500, "text": "hello"},
        {"idx": 2, "start_ms": 5000, "end_ms": 7000, "text": "qwxz frobnitz"},
    ]
    out, unmatched = snap_to_whisper(blocks, segs, min_gap_ms=80, min_duration_ms=0)
    assert unmatched == [2]
    assert out[1]["start_ms"] == 5000 and out[1]["end_ms"] == 7000


def test_min_duration_extends_into_silence_only():
    """A too-short block grows into the following pause, never over the next block's speech."""
    segs = _segs([("hi", 1000, 1300), ("there", 5000, 6000)])
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 500, "text": "hi"},
        {"idx": 2, "start_ms": 4000, "end_ms": 6500, "text": "there"},
    ]
    out, _ = snap_to_whisper(blocks, segs, min_gap_ms=80, min_duration_ms=1000)
    assert out[0]["start_ms"] == 1000
    assert out[0]["end_ms"] == 2000  # 1000ms duration, all gained from the 1.3s–5.0s silence
    assert out[1]["start_ms"] == 5000  # next block stays on its speech


def test_high_cps_block_extends_into_silence_toward_target():
    """A dense block grows into the following pause toward target_cps, but never
    past the next block's speech onset."""
    # 29-char block spoken in 1.0s (CPS 29); long silence before next speech.
    segs = _segs(
        [
            ("aaaaa", 1000, 1200),
            ("bbbbb", 1200, 1400),
            ("ccccc", 1400, 1600),
            ("ddddd", 1600, 1800),
            ("eeeee", 1800, 2000),
            ("zzz", 8000, 8200),
        ]
    )
    blocks = [
        {"idx": 1, "start_ms": 1000, "end_ms": 2000, "text": "aaaaa bbbbb ccccc ddddd eeeee"},  # 29 chars
        {"idx": 2, "start_ms": 8000, "end_ms": 8200, "text": "zzz"},
    ]
    out, _ = snap_to_whisper(blocks, segs, min_gap_ms=80, min_duration_ms=1000, target_cps=15)
    # desired ≈ 29/15*1000 = 1933ms; speech 1000-2000 → extend end into the pause to 2933ms
    assert out[0]["start_ms"] == 1000
    assert out[0]["end_ms"] == 2933
    assert out[1]["start_ms"] == 8000  # next speech untouched


def test_no_overlap_after_snap():
    segs = _segs([("one", 1000, 1900), ("two", 1950, 2800)])
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "one"},
        {"idx": 2, "start_ms": 1000, "end_ms": 2000, "text": "two"},
    ]
    out, _ = snap_to_whisper(blocks, segs, min_gap_ms=80, min_duration_ms=0)
    assert out[0]["end_ms"] + 80 <= out[1]["start_ms"]


def test_short_paraphrase_block_borrows_next_lead_at_pause():
    """A short paraphrase block (only its first word is in the audio, the next
    block's speech starts immediately) borrows time by moving the boundary to
    the next real pause, so the next subtitle doesn't flash up over it."""
    segs = _segs(
        [
            ("ok", 1000, 1200),
            ("you", 1250, 1400),
            ("take", 1450, 1600),  # PAUSE 1600..3000
            ("mine", 3000, 3400),
            ("food", 3500, 4000),
        ]
    )
    blocks = [
        {"idx": 1, "start_ms": 1000, "end_ms": 1200, "text": "ok plus some paraphrase here"},
        {"idx": 2, "start_ms": 1250, "end_ms": 4000, "text": "you take mine food"},
    ]
    out, _ = snap_to_whisper(blocks, segs, min_gap_ms=80, min_duration_ms=1000, target_cps=15)
    assert out[0]["end_ms"] > 2000  # block 1 extended into the take→mine pause
    assert out[1]["start_ms"] > 2000  # block 2 pushed to after the pause
    assert out[0]["end_ms"] < out[1]["start_ms"]  # no overlap


def test_align_blocks_to_words_monotonic_with_repeats():
    """Repeated common words must not cause back-jumps (monotonic alignment)."""
    segs = _segs(
        [("the", 1000, 1100), ("cat", 1100, 1400), ("sat", 1400, 1700), ("the", 5000, 5100), ("mat", 5100, 5500)]
    )
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 1, "text": "the cat sat"},
        {"idx": 2, "start_ms": 0, "end_ms": 1, "text": "the mat"},
    ]
    wwords = [(w["start"] * 1000, w["end"] * 1000, w["word"].lower()) for w in segs[0]["words"]]
    spans = align_blocks_to_words(blocks, [(int(s), int(e), w) for s, e, w in wwords])
    assert spans[0][0] == 1000 and spans[0][1] == 1700
    assert spans[1][0] == 5000 and spans[1][1] == 5500
