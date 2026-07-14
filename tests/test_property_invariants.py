"""Level 3 property-based invariants.

Hypothesis-generated SRT/segmentation corpora run through tools/* to prove
invariants that must hold for ANY input, not just the handful we hand-wrote.

Scope kept tight deliberately: property tests are cheap when invariants are
obvious, catastrophic when they're not. Every property here has a single
line of rationale and fails loud with a minimal example.
"""

from __future__ import annotations

from dataclasses import dataclass

from hypothesis import HealthCheck, assume, example, given, settings
from hypothesis import strategies as st

from tools.config import OptimizeConfig
from tools.offset_srt import apply_offset
from tools.optimize_srt import optimize
from tools.resync_srt import _remap, resync
from tools.snap_srt_to_whisper import snap_to_whisper
from tools.srt_utils import calc_stats, ms_to_time, parse_srt, time_to_ms, write_srt
from tools.text_segmentation import MAX_CPL, build_blocks_from_paragraphs
from tools.validate_subtitles import validate


@dataclass(frozen=True)
class Block:
    """Minimal SRT-block fixture for property tests (was tools.uk_map.Block)."""

    idx: int
    start_ms: int
    end_ms: int
    text: str

    def as_dict(self) -> dict:
        return {"idx": self.idx, "start_ms": self.start_ms, "end_ms": self.end_ms, "text": self.text}


# ---------------------------------------------------------------------------
# Strategies
# ---------------------------------------------------------------------------

# Readable Ukrainian-ish words: letters only so split-on-punctuation logic
# doesn't drown the invariant in punctuation edge cases that are already
# covered by unit tests.
_words = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Ll")),
    min_size=1,
    max_size=8,
)
_sentences = st.lists(_words, min_size=1, max_size=12).map(lambda ws: " ".join(ws) + ".")
_paragraphs = st.lists(_sentences, min_size=1, max_size=5).map(" ".join)
paragraphs_strategy = st.lists(_paragraphs, min_size=1, max_size=10)


@st.composite
def uk_map_blocks(draw) -> list[Block]:
    """Generate a strictly-ordered block sequence satisfying CPS/duration/CPL
    invariants — valid end-to-end for build_srt / validate_subtitles."""
    config = OptimizeConfig()
    count = draw(st.integers(min_value=1, max_value=30))
    out: list[Block] = []
    cursor = draw(st.integers(min_value=0, max_value=5000))
    for i in range(count):
        raw_text = draw(_sentences)
        # Parser strips leading/trailing whitespace so roundtrip must match.
        text = (raw_text[: MAX_CPL - 1] or ".").strip() or "."
        # Guarantee CPS ≤ hard_max_cps AND duration ≥ min_duration_ms so the
        # generated block survives strict validation.
        cps_min_ms = int(len(text) * 1000 / config.hard_max_cps) + 50
        min_duration = max(config.min_duration_ms, cps_min_ms)
        duration = draw(st.integers(min_value=min_duration, max_value=min_duration + 5000))
        gap = draw(st.integers(min_value=config.min_gap_ms, max_value=500))
        start = cursor
        end = start + duration
        out.append(Block(idx=i + 1, start_ms=start, end_ms=end, text=text))
        cursor = end + gap
    return out


def _write_srt(blocks: list[Block], path) -> None:
    write_srt([b.as_dict() for b in blocks], str(path))


# ---------------------------------------------------------------------------
# Invariant 1: canonical segmentation respects CPL for all paragraph inputs
# ---------------------------------------------------------------------------


@given(paragraphs_strategy)
@settings(max_examples=200, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_build_blocks_never_exceeds_cpl(paragraphs: list[str]) -> None:
    blocks = build_blocks_from_paragraphs(paragraphs)
    for b in blocks:
        assert len(b["text"]) <= MAX_CPL or len(b["text"].split()) == 1, f"block over CPL: {b['text']!r}"


@given(paragraphs_strategy)
@settings(max_examples=200, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_build_blocks_ids_sequential(paragraphs: list[str]) -> None:
    blocks = build_blocks_from_paragraphs(paragraphs)
    for i, b in enumerate(blocks, 1):
        assert b["id"] == i


# ---------------------------------------------------------------------------
# Invariant 2: offset_srt.apply_offset(0) is identity
# ---------------------------------------------------------------------------


@given(uk_map_blocks())
@settings(max_examples=50, deadline=None)
def test_offset_zero_is_identity(tmp_path_factory, blocks: list[Block]) -> None:
    src = tmp_path_factory.mktemp("offset_src") / "in.srt"
    dst = tmp_path_factory.mktemp("offset_dst") / "out.srt"
    _write_srt(blocks, src)
    apply_offset(str(src), 0, str(dst))
    a = parse_srt(str(src))
    b = parse_srt(str(dst))
    assert a == b


# ---------------------------------------------------------------------------
# Invariant 3: any structurally-valid block sequence writes an SRT that
# passes validate_subtitles on CPL/duration/gap axes.
# (Text-preservation is excluded because transcripts are not generated.)
# ---------------------------------------------------------------------------


@given(uk_map_blocks())
@settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_blocks_to_srt_satisfy_structural_validation(tmp_path_factory, blocks: list[Block]) -> None:
    srt_path = tmp_path_factory.mktemp("srt") / "out.srt"
    _write_srt(blocks, srt_path)
    # Minimal transcript: one paragraph with all block texts concatenated —
    # guarantees text_check passes even though the generator is naive.
    transcript_path = tmp_path_factory.mktemp("tr") / "transcript.txt"
    transcript_path.write_text("\n\n".join(b.text for b in blocks) + "\n", encoding="utf-8")
    passed, _ = validate(
        str(srt_path),
        str(transcript_path),
        whisper_json_path=None,
        skip_time_check=True,
    )
    assert passed, "structurally-valid generated blocks failed validation"


# ---------------------------------------------------------------------------
# Invariant 6: OptimizeConfig defaults stay mutually consistent
# ---------------------------------------------------------------------------


def test_config_invariants() -> None:
    c = OptimizeConfig()
    assert c.min_duration_ms < c.max_duration_ms
    assert c.target_cps < c.hard_max_cps
    assert c.min_gap_ms >= 0
    assert c.max_cpl > 0


# ---------------------------------------------------------------------------
# Invariant 7: srt_utils time/parse round-trips
# ---------------------------------------------------------------------------

# 0 .. 99:59:59,999 — the SRT timestamp range ms_to_time can render.
_MAX_SRT_MS = 99 * 3600_000 + 59 * 60_000 + 59 * 1000 + 999


@given(st.integers(min_value=0, max_value=_MAX_SRT_MS))
@settings(max_examples=300, deadline=None)
def test_time_ms_roundtrip_is_identity(ms: int) -> None:
    """time_to_ms ∘ ms_to_time == identity for every renderable millisecond."""
    assert time_to_ms(ms_to_time(ms)) == ms


@given(uk_map_blocks())
@settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_parse_write_srt_preserves_timing_and_text(tmp_path_factory, blocks: list[Block]) -> None:
    """write_srt → parse_srt preserves each block's start/end/text exactly."""
    path = tmp_path_factory.mktemp("rt") / "out.srt"
    _write_srt(blocks, path)
    parsed = parse_srt(str(path))
    assert [(b.start_ms, b.end_ms, b.text) for b in blocks] == [(d["start_ms"], d["end_ms"], d["text"]) for d in parsed]


def test_calc_stats_zero_duration_block_does_not_crash() -> None:
    """A zero-duration block yields the 999 CPS sentinel instead of ZeroDivisionError."""
    stats = calc_stats([{"idx": 1, "start_ms": 1000, "end_ms": 1000, "text": "hi"}])
    assert stats["cps_values"] == [999]
    assert stats["total_blocks"] == 1


# ---------------------------------------------------------------------------
# Invariant 8: optimize() is a safe, idempotent transform of valid input
# ---------------------------------------------------------------------------


def _run_optimize(tmp_path_factory, blocks: list[Block]) -> list[dict]:
    src = tmp_path_factory.mktemp("opt_in") / "in.srt"
    dst = tmp_path_factory.mktemp("opt_out") / "out.srt"
    _write_srt(blocks, src)
    optimize(str(src), None, str(dst))
    return parse_srt(str(dst))


@given(uk_map_blocks())
@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_optimize_produces_no_overlaps(tmp_path_factory, blocks: list[Block]) -> None:
    """No two output blocks overlap — overlaps are invisible until playback."""
    out = _run_optimize(tmp_path_factory, blocks)
    assert calc_stats(out)["overlaps"] == 0


@given(uk_map_blocks())
@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_optimize_output_is_monotonic_with_positive_duration(tmp_path_factory, blocks: list[Block]) -> None:
    """Every block has start < end and blocks stay ordered in time."""
    out = _run_optimize(tmp_path_factory, blocks)
    for d in out:
        assert d["start_ms"] < d["end_ms"], f"non-positive duration: {d}"
    for prev, nxt in zip(out, out[1:], strict=False):
        assert prev["end_ms"] <= nxt["start_ms"], "blocks out of order / overlapping"


@given(uk_map_blocks())
@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_optimize_preserves_word_sequence(tmp_path_factory, blocks: list[Block]) -> None:
    """Split/merge/redistribute never lose, duplicate, or reorder words."""
    out = _run_optimize(tmp_path_factory, blocks)
    before = " ".join(b.text for b in blocks).split()
    after = " ".join(d["text"] for d in out).split()
    assert before == after


@given(uk_map_blocks())
@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_optimize_introduces_no_hard_cps_violation(tmp_path_factory, blocks: list[Block]) -> None:
    """Given input already under hard_max_cps, the optimizer keeps it that way."""
    out = _run_optimize(tmp_path_factory, blocks)
    assert calc_stats(out)["cps_over_hard"] == 0


@given(uk_map_blocks())
# Issue #739 counterexample, pinned so every runner replays it (the shrunk
# example otherwise lives only in a local hypothesis DB): a dense run of
# short equal blocks that Phase 5 used to merge past Phase 1b's duration-split
# threshold — the NEXT run then split it, so optimize(optimize(X)) != optimize(X).
@example(
    blocks=[
        Block(idx=1, start_ms=0, end_ms=1200, text="A."),
        Block(idx=2, start_ms=1280, end_ms=2480, text="A."),
        Block(idx=3, start_ms=2560, end_ms=3760, text="A."),
        Block(idx=4, start_ms=3840, end_ms=5040, text="A."),
        Block(idx=5, start_ms=5120, end_ms=6320, text="A."),
        Block(idx=6, start_ms=6400, end_ms=7600, text="A."),
        Block(idx=7, start_ms=7680, end_ms=8880, text="A A."),
        Block(idx=8, start_ms=8960, end_ms=10160, text="A A A A A."),
        Block(idx=9, start_ms=10240, end_ms=11440, text="A A A."),
        Block(idx=10, start_ms=11520, end_ms=12720, text="A."),
        Block(idx=11, start_ms=12800, end_ms=14000, text="A."),
        Block(idx=12, start_ms=14080, end_ms=15280, text="A."),
        Block(idx=13, start_ms=15360, end_ms=16560, text="A A."),
        Block(idx=14, start_ms=16640, end_ms=17840, text="A A A A A A A A A."),
        Block(idx=15, start_ms=17920, end_ms=19120, text="A."),
        Block(idx=16, start_ms=19200, end_ms=20400, text="A A A A."),
        Block(idx=17, start_ms=20480, end_ms=21730, text="A A A A A A A A A A A."),
        Block(idx=18, start_ms=21810, end_ms=23010, text="A."),
        Block(idx=19, start_ms=23090, end_ms=24290, text="A A A."),
        Block(idx=20, start_ms=24370, end_ms=25570, text="A A A."),
        Block(idx=21, start_ms=25650, end_ms=27450, text="A A A A A A A A A A A."),
        Block(idx=22, start_ms=27530, end_ms=28730, text="A."),
        Block(idx=23, start_ms=28810, end_ms=30010, text="A."),
        Block(idx=24, start_ms=30090, end_ms=36105, text="A qêĘ."),
        Block(idx=25, start_ms=36243, end_ms=42258, text="ꭴȩæ𞤱Ź."),
        Block(idx=26, start_ms=42511, end_ms=45152, text="A."),
        Block(idx=27, start_ms=45326, end_ms=49292, text="A eŮ𝞟é ĿĈŦĘItÃᏢ A A A A."),
        Block(idx=28, start_ms=49718, end_ms=50918, text="A."),
        Block(idx=29, start_ms=50998, end_ms=52198, text="A."),
    ]
)
@settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_optimize_is_idempotent(tmp_path_factory, blocks: list[Block]) -> None:
    """optimize(optimize(X)) == optimize(X) — the output is a fixed point."""
    out1 = _run_optimize(tmp_path_factory, blocks)
    reblocks = [Block(idx=d["idx"], start_ms=d["start_ms"], end_ms=d["end_ms"], text=d["text"]) for d in out1]
    out2 = _run_optimize(tmp_path_factory, reblocks)
    key = lambda ds: [(d["start_ms"], d["end_ms"], d["text"]) for d in ds]  # noqa: E731
    assert key(out1) == key(out2)


# ---------------------------------------------------------------------------
# Invariant 9: resync onto an identical EN timeline is the identity
# ---------------------------------------------------------------------------


@given(uk_map_blocks())
@settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_resync_onto_identical_en_preserves_structure(tmp_path_factory, blocks: list[Block]) -> None:
    """Resyncing UK onto an identical EN timeline must not corrupt the output.

    resync is best-effort: it interpolates between word anchors and may DROP a
    block it cannot anchor (the tool reports "unmapped" as normal operation),
    and the ±2000ms tail extrapolation means it does not promise byte-exact
    timing identity (covered by the unit test on realistic data). What it must
    NEVER do is fabricate or reorder content, or emit a structurally-invalid
    SRT. So the always-true invariants are: output text is an ordered
    subsequence of the input (no invented/reordered blocks) and the output is
    structurally valid (positive durations, no overlaps). Scoped to ≥2 blocks:
    with a single anchor _remap is undefined, a regime real talks never hit."""
    assume(len(blocks) >= 2)
    d = tmp_path_factory.mktemp("resync")
    uk, primary_en, secondary_en, out = (d / n for n in ("uk.srt", "p_en.srt", "s_en.srt", "out.srt"))
    _write_srt(blocks, uk)
    _write_srt(blocks, primary_en)
    _write_srt(blocks, secondary_en)
    resync(str(uk), str(primary_en), str(secondary_en), str(out))
    result = parse_srt(str(out))
    # Output text is an ordered subsequence of the input — nothing invented or reordered.
    in_texts = [b.text for b in blocks]
    out_texts = [x["text"] for x in result]
    it = iter(in_texts)
    assert all(t in it for t in out_texts), f"resync output is not a subsequence of input: {out_texts} ⊄ {in_texts}"
    # Structurally valid: positive durations, no overlaps.
    for x in result:
        assert x["start_ms"] < x["end_ms"], f"non-positive duration: {x}"
    for prev, nxt in zip(result, result[1:], strict=False):
        assert prev["end_ms"] <= nxt["start_ms"], "resync introduced an overlap"


@st.composite
def _strict_anchors(draw) -> list[tuple[int, int]]:
    """Anchors strictly increasing in both primary and secondary coordinates."""
    n = draw(st.integers(min_value=2, max_value=12))
    px = draw(st.integers(min_value=0, max_value=2000))
    sx = draw(st.integers(min_value=0, max_value=2000))
    out: list[tuple[int, int]] = []
    for _ in range(n):
        px += draw(st.integers(min_value=1, max_value=2000))
        sx += draw(st.integers(min_value=1, max_value=2000))
        out.append((px, sx))
    return out


@given(_strict_anchors())
@settings(max_examples=100, deadline=None)
def test_remap_is_monotonic_within_anchor_range(anchors: list[tuple[int, int]]) -> None:
    """_remap preserves ordering: x1 < x2 ⇒ remap(x1) ≤ remap(x2)."""
    lo, hi = anchors[0][0], anchors[-1][0]
    step = max(1, (hi - lo) // 25)
    prev = None
    for x in range(lo, hi + 1, step):
        y = _remap(x, anchors)
        if y is None:
            continue
        if prev is not None:
            assert y >= prev, f"remap non-monotonic at {x}: {y} < {prev}"
        prev = y


# ---------------------------------------------------------------------------
# Invariant 10: snap_to_whisper only re-times — text and block count are fixed
# ---------------------------------------------------------------------------


@given(uk_map_blocks())
@settings(max_examples=40, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_snap_preserves_text_count_and_positive_duration(blocks: list[Block]) -> None:
    """Snapping changes only timing: never text, never block count, never start>end."""
    bdicts = [b.as_dict() for b in blocks]
    # Build a whisper segment whose words are exactly the block words, timed on
    # each block's own span, so every block matches and gets re-timed.
    words = [
        {"word": w, "start": b.start_ms / 1000.0, "end": b.end_ms / 1000.0} for b in blocks for w in b.text.split()
    ]
    out, _unmatched = snap_to_whisper(bdicts, [{"words": words}], min_gap_ms=80, min_duration_ms=0)
    assert len(out) == len(bdicts)
    assert [o["text"] for o in out] == [b["text"] for b in bdicts]
    for o in out:
        assert o["start_ms"] <= o["end_ms"], f"snap produced start>end: {o}"
