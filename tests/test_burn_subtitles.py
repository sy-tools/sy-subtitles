"""Tests for burn_subtitles.py — SRT to ASS conversion for burned-in subtitles."""

import pytest

from tools.burn_subtitles import (
    FONT_RATIO_MAX,
    FONT_RATIO_MIN,
    ROBOTO_WIN_FACTOR,
    ass_timestamp,
    build_ass_header,
    escape_ass_text,
    font_size_for,
)


class TestAssTimestamp:
    def test_zero(self):
        assert ass_timestamp(0) == "0:00:00.00"

    def test_centisecond_truncation(self):
        # ASS carries centiseconds; SRT carries milliseconds.
        assert ass_timestamp(1234) == "0:00:01.23"

    def test_hours_minutes_seconds(self):
        assert ass_timestamp(3_723_450) == "1:02:03.45"

    def test_does_not_zero_pad_hours(self):
        assert ass_timestamp(36_000_000).startswith("10:")


class TestEscapeAssText:
    def test_braces_escaped(self):
        # Unescaped braces would be parsed as an override block and vanish.
        assert escape_ass_text("a {b} c") == r"a \{b\} c"

    def test_internal_newlines_become_spaces(self):
        # We re-wrap ourselves (Task 2), so incoming line structure is dropped.
        assert escape_ass_text("one\ntwo") == "one two"

    def test_nbsp_normalized_to_space(self):
        assert escape_ass_text("one two") == "one two"

    def test_collapses_runs_of_whitespace(self):
        assert escape_ass_text("one   two") == "one two"


class TestFontSizeFor:
    def test_applies_win_metric_factor(self):
        # ASS FontSize is the font's Win cell height, not CSS pixels.
        assert font_size_for(0.0711, 1080) == round(0.0711 * 1080 * ROBOTO_WIN_FACTOR)

    def test_clamps_below_minimum(self):
        assert font_size_for(0.001, 1000) == round(FONT_RATIO_MIN * 1000 * ROBOTO_WIN_FACTOR)

    def test_clamps_above_maximum(self):
        assert font_size_for(0.9, 1000) == round(FONT_RATIO_MAX * 1000 * ROBOTO_WIN_FACTOR)

    def test_rejects_non_positive_height(self):
        with pytest.raises(ValueError):
            font_size_for(0.05, 0)


class TestBuildAssHeader:
    def _header(self):
        return build_ass_header(
            width=1920,
            height=1080,
            font_size=92,
            font_name="Roboto",
            margin_h=192,
            margin_v=36,
        )

    def test_playres_matches_video_pixels(self):
        h = self._header()
        assert "PlayResX: 1920" in h
        assert "PlayResY: 1080" in h

    def test_wrapstyle_2_disables_libass_wrapping(self):
        # The generator wraps; libass must never disagree with the band height.
        assert "WrapStyle: 2" in self._header()

    def test_scaled_border_and_shadow_enabled_explicitly(self):
        # libass >= 0.15 defaults this to no.
        assert "ScaledBorderAndShadow: yes" in self._header()

    def test_declares_default_and_band_styles(self):
        h = self._header()
        assert "Style: Default," in h
        assert "Style: Band," in h

    def test_default_style_is_bottom_centered_with_margins(self):
        line = next(ln for ln in self._header().splitlines() if ln.startswith("Style: Default,"))
        fields = line.split(",")
        assert fields[1] == "Roboto"
        assert fields[2] == "92"
        assert ",2," in line  # Alignment 2 = bottom centre
        assert fields[-2] == "36"  # MarginV
