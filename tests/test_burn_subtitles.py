"""Tests for burn_subtitles.py — SRT to ASS conversion for burned-in subtitles."""

import re

import pytest

from tools.burn_subtitles import (
    DEFAULT_GRADIENT_STEPS,
    FONT_RATIO_MAX,
    FONT_RATIO_MIN,
    ROBOTO_WIN_FACTOR,
    WRAP_SAFETY,
    ass_alpha_byte,
    ass_timestamp,
    band_event,
    band_geometry,
    build_ass_header,
    dialogue_event,
    escape_ass_text,
    font_size_for,
    gradient_alpha_at,
    wrap_text,
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


class TestSizingConstants:
    """Pin the literals themselves.

    These constants set the on-screen size of every subtitle this project burns.
    Tests that recompute an expectation from the constant under test cannot
    detect a drifted or typo'd value, so the values are asserted directly.
    """

    def test_win_factor_matches_roboto_win_metrics(self):
        # FontSize = css_px * (usWinAscent + usWinDescent) / unitsPerEm.
        assert pytest.approx((1946 + 512) / 2048, abs=1e-4) == ROBOTO_WIN_FACTOR

    def test_ratio_clamp_bounds(self):
        assert FONT_RATIO_MIN == 0.02
        assert FONT_RATIO_MAX == 0.12


class TestFontSizeFor:
    def test_applies_win_metric_factor(self):
        # ASS FontSize is the font's Win cell height, not CSS pixels.
        assert font_size_for(0.0711, 1080) == round(0.0711 * 1080 * ROBOTO_WIN_FACTOR)

    def test_pins_size_for_1080p(self):
        # 0.0711 * 1080 * 1.2002 = 92.2 -> 92. Independent of the constants,
        # so a drift in any of them fails here.
        assert font_size_for(0.0711, 1080) == 92

    def test_pins_clamped_sizes(self):
        assert font_size_for(0.001, 1000) == 24  # 0.02 * 1000 * 1.2002
        assert font_size_for(0.9, 1000) == 144  # 0.12 * 1000 * 1.2002

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

    def _default_style_fields(self):
        line = next(ln for ln in self._header().splitlines() if ln.startswith("Style: Default,"))
        return line.split(",")

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
        fields = self._default_style_fields()
        assert fields[1] == "Roboto"
        assert fields[2] == "92"
        assert fields[18] == "2"  # Alignment 2 = bottom centre
        assert fields[-2] == "36"  # MarginV

    def test_default_style_outline_is_a_thin_halo(self):
        # Reproduces the SPA's 0 0 2px halo at a ~77px CSS font: ~2.5% of the
        # font size, i.e. 2 px at font_size 92 — not a heavy display stroke.
        assert self._default_style_fields()[16] == "2"

    def test_default_style_shadow_offset_is_left_to_events(self):
        # Task 3 sets the soft drop shadow per event via \blur/\yshad overrides;
        # a style-level offset here would double it.
        assert self._default_style_fields()[17] == "0"


def fake_measure(text):
    """10 units per character — makes expected break points obvious."""
    return len(text) * 10


class TestWrapText:
    def test_short_text_stays_one_line(self):
        assert wrap_text("abc def", fake_measure, 1000) == ["abc def"]

    def test_breaks_greedily_not_balanced(self):
        # Greedy fills the first line as far as it fits: "aaa bbb" (70 units)
        # then "cc". A balancing wrapper would even the lines out instead.
        assert wrap_text("aaa bbb cc", fake_measure, 75 / WRAP_SAFETY) == ["aaa bbb", "cc"]

    def test_three_lines(self):
        assert wrap_text("aaaa bbbb cccc", fake_measure, 45 / WRAP_SAFETY) == [
            "aaaa",
            "bbbb",
            "cccc",
        ]

    def test_word_longer_than_line_is_not_dropped(self):
        assert wrap_text("aaaaaaaaaa bb", fake_measure, 50 / WRAP_SAFETY) == [
            "aaaaaaaaaa",
            "bb",
        ]

    def test_applies_safety_margin(self):
        # Exactly at the raw limit must still wrap, because the effective
        # width is max_width * WRAP_SAFETY.
        assert wrap_text("aaa bbb", fake_measure, 70) == ["aaa", "bbb"]

    def test_empty_text_yields_single_empty_line(self):
        assert wrap_text("", fake_measure, 100) == [""]


class TestGradientAlpha:
    def test_transparent_at_top(self):
        assert gradient_alpha_at(0.0) == pytest.approx(0.0)

    def test_matches_css_stops(self):
        assert gradient_alpha_at(0.35) == pytest.approx(0.35)
        assert gradient_alpha_at(0.70) == pytest.approx(0.72)
        assert gradient_alpha_at(1.0) == pytest.approx(0.92)

    def test_interpolates_between_stops(self):
        # Midway between (0.35, 0.35) and (0.70, 0.72).
        assert gradient_alpha_at(0.525) == pytest.approx(0.535, abs=1e-3)

    def test_monotonically_increases(self):
        values = [gradient_alpha_at(i / 100) for i in range(101)]
        assert all(b >= a for a, b in zip(values, values[1:], strict=False))


class TestAssAlphaByte:
    def test_inverted_relative_to_css(self):
        # ASS: 00 = opaque, FF = transparent — the opposite of CSS opacity.
        assert ass_alpha_byte(1.0) == "00"
        assert ass_alpha_byte(0.0) == "FF"

    def test_css_checkpoints(self):
        assert ass_alpha_byte(0.35) == "A6"
        assert ass_alpha_byte(0.72) == "47"
        assert ass_alpha_byte(0.92) == "14"

    def test_always_two_uppercase_hex_digits(self):
        for i in range(101):
            byte = ass_alpha_byte(i / 100)
            assert len(byte) == 2 and byte == byte.upper()


class TestBandGeometry:
    def test_band_encloses_text_and_padding(self):
        top, height = band_geometry(
            height=1080,
            font_size=92,
            line_count=2,
            margin_v=36,
            padtop_px=80,
        )
        # libass line advance is FontSize, so text occupies line_count * 92.
        assert height == 80 + 2 * 92 + 36
        assert top == 1080 - height

    def test_more_lines_grow_the_band_upward(self):
        one_top, one_h = band_geometry(1080, 92, 1, 36, 80)
        two_top, two_h = band_geometry(1080, 92, 2, 36, 80)
        assert two_h == one_h + 92
        assert two_top < one_top

    def test_band_is_clamped_into_the_frame(self):
        top, height = band_geometry(480, 92, 8, 36, 80)
        assert top == 0
        assert height == 480


class TestBandEvent:
    def _events(self, steps=4):
        return band_event(1000, 2000, width=1920, band_top=800, band_height=200, steps=steps)

    def _strips(self, steps=8):
        """Parse each strip's absolute top and its height out of the emitted events."""
        strips = []
        for ev in self._events(steps=steps):
            pos_y = int(re.search(r"\\pos\(0,(\d+)\)", ev).group(1))
            height = int(re.search(r"m 0 0 l \d+ 0 \d+ (\d+) 0 \d+", ev).group(1))
            strips.append((pos_y, height))
        return strips

    def test_emits_one_event_per_strip(self):
        # libass lays consecutive drawings out horizontally like glyphs, so N
        # strips crammed into a single event march off the right edge of the
        # frame and the band vanishes. Verified by rendering through libass
        # 0.17.5: three strips in one event drew only the first.
        events = self._events(steps=4)
        assert isinstance(events, list)
        assert len(events) == 4

    def test_every_event_holds_exactly_one_drawing(self):
        # The invariant that breaks if anyone re-merges the strips into one event.
        for ev in self._events(steps=8):
            assert ev.count(r"\p1") == 1

    def test_degenerate_strips_are_dropped_not_emitted(self):
        # 64 steps over a 10px band: only 10 strips can have a non-zero height.
        assert len(band_event(0, 1000, 1920, 800, 10, steps=64)) == 10

    def test_is_layer_zero_band_style_with_cue_timings(self):
        assert all(ev.startswith("Dialogue: 0,0:00:01.00,0:00:02.00,Band,") for ev in self._events())

    def test_all_strips_share_the_cue_timings(self):
        # A strip that outlived its cue would leave part of the band on a bare frame.
        stamps = {tuple(ev.split(",")[1:3]) for ev in self._events(steps=8)}
        assert stamps == {("0:00:01.00", "0:00:02.00")}

    def test_first_strip_is_positioned_at_the_band_top_from_the_corner(self):
        assert r"\an7\pos(0,800)" in self._events()[0]

    def test_spans_full_width(self):
        assert all("l 1920 " in ev for ev in self._events())

    def test_each_strip_is_drawn_from_its_own_origin(self):
        # Vertical placement lives in \pos, not in the path, so every path starts at 0 0.
        assert all("m 0 0 l " in ev for ev in self._events())

    def test_strip_positions_tile_without_gaps(self):
        # Each strip's absolute top must equal the previous strip's bottom, or seams show.
        strips = self._strips(steps=8)
        tops = [y for y, _ in strips]
        bottoms = [y + h for y, h in strips]
        assert tops[0] == 800
        assert bottoms[-1] == 800 + 200
        assert tops[1:] == bottoms[:-1]

    def test_strip_positions_strictly_increase(self):
        tops = [y for y, _ in self._strips(steps=8)]
        assert all(b > a for a, b in zip(tops, tops[1:], strict=False))

    def test_alpha_darkens_toward_the_bottom(self):
        values = [int(re.search(r"\\1a&H([0-9A-F]{2})&", ev).group(1), 16) for ev in self._events(steps=8)]
        # Inverted alpha: smaller byte = more opaque, so it must decrease.
        assert all(b <= a for a, b in zip(values, values[1:], strict=False))

    def test_rejects_too_few_steps(self):
        with pytest.raises(ValueError):
            band_event(0, 1000, 1920, 800, 200, steps=0)


class TestDialogueEvent:
    def test_joins_lines_with_hard_break(self):
        ev = dialogue_event(1000, 2000, ["one", "two"], font_size=92)
        assert ev.endswith("one\\Ntwo")

    def test_is_layer_one_default_style(self):
        ev = dialogue_event(0, 1000, ["x"], font_size=92)
        assert ev.startswith("Dialogue: 1,0:00:00.00,0:00:01.00,Default,")

    def test_carries_vertical_only_blurred_shadow(self):
        # The style Shadow field offsets diagonally; CSS is purely vertical.
        ev = dialogue_event(0, 1000, ["x"], font_size=92)
        assert r"\xshad0" in ev
        assert r"\yshad" in ev
        assert r"\blur" in ev


class TestDefaults:
    def test_gradient_steps_default_is_64(self):
        assert DEFAULT_GRADIENT_STEPS == 64
