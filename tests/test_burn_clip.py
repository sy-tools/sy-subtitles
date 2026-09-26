"""Tests for tools/burn_clip.py — what a fragment render means, in one place.

The same "START_MS-END_MS" string is read by the input guard, by the burner and
by the step that tells the render gates how long the render is. One parser is
what keeps those three from ever disagreeing about which clips exist.
"""

import pytest

from tools import burn_clip
from tools.burn_clip import (
    CLIP_MAX_DIGITS,
    CLIP_MIN_MS,
    ClipError,
    parse_clip,
    rebase_cues,
    rendered_span_seconds,
    seconds_text,
)


class TestSecondsText:
    """Whole milliseconds as exact seconds text — ffmpeg's -ss/-t and the messages alike."""

    @pytest.mark.parametrize(("ms", "text"), [(0, "0.000"), (61, "0.061"), (2500, "2.500"), (1_234_567, "1234.567")])
    def test_formats_without_float_rounding(self, ms, text):
        assert seconds_text(ms) == text


class TestParseClip:
    @pytest.mark.parametrize(
        ("value", "expected"),
        [
            ("0-1000", (0, 1000)),
            ("2000-5000", (2000, 5000)),
            ("1000-2000", (1000, 2000)),  # exactly the shortest span
            ("7200000-7260000", (7200000, 7260000)),  # two hours into a talk
            ("0-999999999", (0, 999999999)),  # nine digits, the longest bound
        ],
    )
    def test_accepts_two_whole_millisecond_counts(self, value, expected):
        assert parse_clip(value) == expected

    @pytest.mark.parametrize(
        "value",
        [
            "",  # "the whole video" is the caller's decision, never a clip
            "1000",
            "1000-",
            "-1000",
            "-5-3000",  # a sign — and the shape argparse mistakes for an option
            "+1000-3000",
            "1000-+3000",
            "01000-3000",
            "00-1000",
            "1000-03000",
            "1000-2000-3000",
            " 1000-3000",
            "1000-3000\n",  # what a `$` anchor would have let through
            "1000 - 3000",
            "1000–3000",  # an en dash
            "1.5-3000",
            "1e3-3000",
            "0x10-3000",
            # Arabic-Indic digits: both `\d` and int() accept them.
            "١٠٠٠-٣٠٠٠",
        ],
    )
    def test_rejects_anything_but_two_plain_integers(self, value):
        with pytest.raises(ClipError):
            parse_clip(value)

    def test_the_message_names_the_value_and_the_expected_shape(self):
        with pytest.raises(ClipError, match=r"START_MS-END_MS.*'1\.5-3000'"):
            parse_clip("1.5-3000")

    @pytest.mark.parametrize("value", ["3000-1000", "1000-1000"])
    def test_a_clip_must_start_before_it_ends(self, value):
        with pytest.raises(ClipError, match="before"):
            parse_clip(value)

    def test_refuses_a_span_under_the_minimum(self):
        with pytest.raises(ClipError, match=f"{CLIP_MIN_MS} ms"):
            parse_clip("1000-1999")

    @pytest.mark.parametrize("value", ["0-1000000000", "1000000000-1000001000", "0-9999999999999999"])
    def test_a_bound_past_nine_digits_is_refused_by_name(self, value):
        # 0-9999999999999999 used to pass the guard, be clamped for the gates,
        # and then kill ffmpeg after the whole download: "Invalid duration for
        # option t ... Result too large". The message must say what the limit is.
        with pytest.raises(ClipError, match="9 digits"):
            parse_clip(value)

    def test_a_bound_is_at_most_nine_digits(self):
        # ~277 hours, and the cap the SPA's run-title parser applies, so the
        # two sides accept the same clips. A literal, like CLIP_MIN_MS.
        assert CLIP_MAX_DIGITS == 9

    def test_the_minimum_is_one_second(self):
        # A literal, not a recomputation: the SPA offers clips against the same
        # bound, so a drifted value here must fail on its own.
        assert CLIP_MIN_MS == 1000


def _cue(idx, start_ms, end_ms, text="x"):
    return {"idx": idx, "start_ms": start_ms, "end_ms": end_ms, "text": text}


class TestRebaseCues:
    """Cues move onto the fragment's own clock, which starts at zero.

    ffmpeg seeks on the input side, which resets the clock the ass filter reads.
    A cue left on the source's timeline would show START late — or never, for a
    clip taken from late in a talk.
    """

    def test_drops_cues_that_end_at_the_start_or_begin_at_the_end(self):
        assert rebase_cues([_cue(1, 0, 2000), _cue(2, 5000, 6000)], 2000, 5000) == []

    def test_shifts_a_cue_inside_the_clip_onto_the_clip_clock(self):
        assert rebase_cues([_cue(7, 3000, 4000, "Третє")], 2000, 5000) == [_cue(7, 1000, 2000, "Третє")]

    def test_clamps_cues_that_straddle_either_edge(self):
        cues = [_cue(1, 1500, 2500), _cue(2, 4500, 6000)]
        assert rebase_cues(cues, 2000, 5000) == [_cue(1, 0, 500), _cue(2, 2500, 3000)]

    def test_a_cue_covering_the_whole_clip_fills_it(self):
        assert rebase_cues([_cue(1, 0, 9000)], 2000, 5000) == [_cue(1, 0, 3000)]

    def test_drops_a_cue_left_with_no_duration(self):
        # A zero-length or reversed cue clamps to <= 0 ms; an ASS event that
        # ends before it starts is not something to hand to libass.
        assert rebase_cues([_cue(1, 3000, 3000), _cue(2, 4000, 3500)], 2000, 5000) == []

    def test_leaves_the_parsed_cues_untouched(self):
        cues = [_cue(1, 3000, 4000)]
        rebase_cues(cues, 2000, 5000)
        assert cues == [_cue(1, 3000, 4000)]


class TestRenderedSpanSeconds:
    """The duration the render gates measure a clip against."""

    def test_a_clip_inside_the_video_renders_its_own_length(self):
        assert rendered_span_seconds(2000, 5000, 10.0) == 3.0

    def test_an_end_past_the_video_stops_where_the_video_does(self):
        # Not an error: ffmpeg stops at EOF, so the gates must expect exactly
        # that much and no more, or Finish render calls the clip truncated.
        assert rendered_span_seconds(2000, 20000, 10.0) == 8.0

    @pytest.mark.parametrize("start_ms", [10000, 12000])
    def test_a_clip_starting_at_or_past_the_end_is_refused(self, start_ms):
        with pytest.raises(ClipError, match="past the end"):
            rendered_span_seconds(start_ms, start_ms + 5000, 10.0)

    def test_a_clamped_span_under_the_minimum_is_refused(self):
        with pytest.raises(ClipError, match="0.500 s"):
            rendered_span_seconds(9500, 20000, 10.0)

    def test_exactly_the_minimum_survives_a_float_duration(self):
        # 1.13 - 0.13 is 0.9999999999999999 in floating point. The clip leaves a
        # whole second and must not be refused for how the duration is stored.
        assert rendered_span_seconds(130, 20000, 1.13) == pytest.approx(1.0)

    @pytest.mark.parametrize("seconds", [0.0, -1.0, float("nan"), float("inf")])
    def test_refuses_a_source_duration_that_is_not_a_positive_number(self, seconds):
        with pytest.raises(ClipError):
            rendered_span_seconds(0, 5000, seconds)


class TestCli:
    def _duration_file(self, tmp_path, text):
        path = tmp_path / "duration_s.txt"
        path.write_text(text, encoding="utf-8")
        return str(path)

    def test_prints_the_rendered_span_in_seconds(self, tmp_path, capsys):
        argv = ["--clip=2000-20000", "--source-duration-file", self._duration_file(tmp_path, "10.000000\n")]
        assert burn_clip.main(argv) == 0
        assert float(capsys.readouterr().out) == 8.0

    @pytest.mark.parametrize(
        ("clip", "duration"),
        [
            ("12000-15000", "10.000000\n"),  # starts past the end
            ("-5-3000", "10.000000\n"),  # not a clip at all
            ("2000-5000", "N/A\n"),  # ffprobe had no duration to give
        ],
    )
    def test_a_refusal_is_a_legible_error_on_stderr_only(self, tmp_path, capsys, clip, duration):
        # stdout is redirected into the gates' duration file, so an error there
        # would be read as a number; it belongs on stderr, as an annotation.
        argv = [f"--clip={clip}", "--source-duration-file", self._duration_file(tmp_path, duration)]
        assert burn_clip.main(argv) != 0
        captured = capsys.readouterr()
        assert captured.out == ""
        assert captured.err.startswith("::error::")
