"""Tests for burn_subtitles.py — SRT to ASS conversion for burned-in subtitles."""

import os
import re
import subprocess
from pathlib import Path

import pytest

from tools import burn_subtitles
from tools.burn_subtitles import (
    DEFAULT_FONT_FILE,
    DEFAULT_FONT_NAME,
    DEFAULT_GRADIENT_STEPS,
    FONT_PROBE_FLOOR,
    FONT_PROBE_MAX_CHARS,
    FONT_RATIO_MAX,
    FONT_RATIO_MIN,
    PT_SERIF_WIN_FACTOR,
    SIDE_INSET_RATIO,
    WRAP_SAFETY,
    ass_alpha_byte,
    ass_timestamp,
    band_event,
    band_geometry,
    build_ass_document,
    build_ass_header,
    build_ffmpeg_command,
    build_font_probe_command,
    css_font_px,
    dialogue_event,
    escape_ass_text,
    font_probe_document,
    font_selection_error,
    font_size_for,
    gradient_alpha_at,
    main,
    probe_dimensions,
    probe_text_for,
    text_measurer,
    wrap_text,
    wrap_width_for,
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
        assert escape_ass_text("one\u00a0two") == "one two"

    def test_collapses_runs_of_whitespace(self):
        assert escape_ass_text("one   two") == "one two"

    def test_a_backslash_is_refused_not_passed_through(self):
        # ASS has no escape for a backslash: passed through, libass reads a
        # typed \N as a hard line break the wrapper never counted, so the band
        # is sized for one line while two are drawn. Escaping the brace after
        # it (a\{b}) makes it worse — \\ then reads as a literal backslash and
        # {b\} as an override block that swallows the text. Refuse loudly.
        with pytest.raises(ValueError, match="backslash"):
            escape_ass_text(r"a \N b")


class TestSizingConstants:
    """Pin the literals themselves.

    These constants set the on-screen size of every subtitle this project burns.
    Tests that recompute an expectation from the constant under test cannot
    detect a drifted or typo'd value, so the values are asserted directly.
    """

    def test_win_factor_matches_pt_serif_win_metrics(self):
        # FontSize = css_px * (usWinAscent + usWinDescent) / unitsPerEm.
        assert pytest.approx((1039 + 286) / 1000, abs=1e-4) == PT_SERIF_WIN_FACTOR

    def test_ratio_clamp_bounds(self):
        assert FONT_RATIO_MIN == 0.02
        assert FONT_RATIO_MAX == 0.12


class TestFontSizeFor:
    def test_applies_win_metric_factor(self):
        # ASS FontSize is the font's Win cell height, not CSS pixels.
        assert font_size_for(0.0711, 1080) == round(0.0711 * 1080 * PT_SERIF_WIN_FACTOR, 2)

    def test_pins_size_for_1080p(self):
        # 0.0711 * 1080 * 1.325 = 101.74. Independent of the constants, so a
        # drift in any of them fails here.
        assert font_size_for(0.0711, 1080) == 101.74

    def test_is_not_rounded_to_a_whole_size(self):
        # libass takes a fractional FontSize. Rounded, a 640x480 frame at the
        # handle's 0.6x (15.36px, FontSize 20.35) drew its text at 20 — 1.7%
        # narrower than the preview showed it.
        assert font_size_for(0.032, 480) == 20.35

    def test_pins_clamped_sizes(self):
        assert font_size_for(0.001, 1000) == 26.5  # 0.02 * 1000 * 1.325
        assert font_size_for(0.9, 1000) == 159.0  # 0.12 * 1000 * 1.325

    def test_clamps_below_minimum(self):
        assert font_size_for(0.001, 1000) == round(FONT_RATIO_MIN * 1000 * PT_SERIF_WIN_FACTOR, 2)

    def test_clamps_above_maximum(self):
        assert font_size_for(0.9, 1000) == round(FONT_RATIO_MAX * 1000 * PT_SERIF_WIN_FACTOR, 2)

    def test_rejects_non_positive_height(self):
        with pytest.raises(ValueError):
            font_size_for(0.05, 0)


class TestBuildAssHeader:
    def _header(self):
        return build_ass_header(
            width=1920,
            height=1080,
            font_size=92,
            font_name="PT Serif",
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

    def test_kerns_as_the_browser_does(self):
        # libass leaves kerning off unless the script asks; the preview kerns,
        # so without it every burned line ran 0.45% wider than the preview's.
        assert "Kerning: yes" in self._header()

    def test_declares_default_and_band_styles(self):
        h = self._header()
        assert "Style: Default," in h
        assert "Style: Band," in h

    def test_default_style_is_bottom_centered_with_margins(self):
        fields = self._default_style_fields()
        assert fields[1] == "PT Serif"
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


def kerned_measure(text):
    # 10 units a character, and a comma followed by a space kerns 3 units
    # tighter — as PT Serif's comma/space pair really does (2.3px at 57.6px).
    return 10 * len(text) - 3 * text.count(", ")


class TestWrapText:
    def test_a_line_carries_the_kern_into_the_space_after_it(self):
        # A browser shapes before it breaks, so a comma that ends a line still
        # carries its kern with the space that follows — and fits a word the
        # bare line (80) would not. "aa bbbb, " is 87 - 10 for the space = 77.
        assert wrap_text("aa bbbb, cc", kerned_measure, 78 / WRAP_SAFETY) == ["aa bbbb,", "cc"]

    def test_the_last_word_has_no_space_to_kern_with(self):
        assert wrap_text("aa bbbb,", kerned_measure, 78 / WRAP_SAFETY) == ["aa", "bbbb,"]

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
    def test_a_fractional_font_size_still_gives_whole_pixel_edges(self):
        # The strips are positioned with \\pos in whole pixels.
        top, band_h = band_geometry(480, 20.35, 2, 16, 36)
        assert (top, band_h) == (480 - 93, 93)  # 36 + 2 * 20.35 + 16 = 92.7

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

    def test_side_inset_ratio_is_seven_percent(self):
        # Fullscreen's horizontal insets; also the wrap width the SPA showed.
        assert SIDE_INSET_RATIO == 0.07

    def test_font_defaults_point_at_the_vendored_pt_serif(self):
        assert DEFAULT_FONT_FILE.endswith(os.path.join("site", "fonts", "PT_Serif-Web-Regular.ttf"))

    def test_the_preview_loads_the_very_file_the_burn_renders_with(self):
        # One file, not a copy: the fullscreen preview's @font-face must resolve
        # to DEFAULT_FONT_FILE, or the two can drift apart again (Georgia vs PT
        # Serif re-wrapped cues by ~6% of a line).
        css_dir = Path(__file__).resolve().parents[1] / "site" / "css"
        css = (css_dir / "tokens.css").read_text(encoding="utf-8")
        face = re.search(r"@font-face\s*\{[^}]*font-family:\s*'SY Subtitle Serif'[^}]*\}", css)
        assert face, "tokens.css declares no 'SY Subtitle Serif' face"
        src = re.search(r"url\('([^']+)'\)", face.group(0)).group(1)
        assert (css_dir / src).resolve() == Path(DEFAULT_FONT_FILE).resolve()
        assert DEFAULT_FONT_NAME == "PT Serif"

    def test_default_font_path_is_absolute(self):
        # `python -m tools.burn_subtitles` runs from wherever the caller stands;
        # a CWD-relative default fails inside Pillow anywhere but the repo root.
        assert os.path.isabs(DEFAULT_FONT_FILE)


class TestWrapGeometry:
    """The wrap limit and the measurer are what the preview is held to
    (tests/test_spa_fs_subtitle_box.py compares line breaks cue by cue), so
    neither may carry pixel rounding the browser does not do."""

    def test_wrap_width_is_the_unrounded_inset(self):
        # The ASS margins are whole pixels (round(100.8) = 101 on a 1440 frame),
        # but the width a line may fill must not inherit that rounding: 0.4px
        # was enough to wrap a cue the preview showed on one line.
        assert wrap_width_for(1440) == pytest.approx(1440 * (1 - 2 * SIDE_INSET_RATIO))

    def test_measures_unhinted_advances(self):
        # FreeType hints the advances at small sizes, rounding every glyph to a
        # whole pixel; libass (no hinting) and the browser do not. Measured at a
        # large size and scaled, the width is the design width.
        from PIL import ImageFont

        text = "знає про свого чоловіка, що з ним не так, але"
        big = ImageFont.truetype(DEFAULT_FONT_FILE, 1000).getlength(text)
        assert text_measurer(DEFAULT_FONT_FILE, 57.6)(text) == pytest.approx(big * 57.6 / 1000, abs=0.01)


class TestCssFontPx:
    """The module carries two sizes; conflating them mis-wraps every cue.

    CSS px is the real em size on screen and is what Pillow's `truetype(size=)`
    wants; the ASS FontSize is that value scaled by the Win-metric factor.
    """

    def test_pins_the_fullscreen_baseline(self):
        # 0.0711 * 1080 = 76.788 — the SPA's measured 76.8px overlay font.
        assert css_font_px(0.0711, 1080) == pytest.approx(76.788)

    def test_font_size_is_css_px_times_the_win_factor(self):
        for ratio, height in ((0.0711, 1080), (0.05, 480), (0.11, 2160)):
            assert font_size_for(ratio, height) == round(css_font_px(ratio, height) * PT_SERIF_WIN_FACTOR, 2)

    def test_shares_the_clamp_with_font_size_for(self):
        assert css_font_px(0.001, 1000) == pytest.approx(FONT_RATIO_MIN * 1000)
        assert css_font_px(0.9, 1000) == pytest.approx(FONT_RATIO_MAX * 1000)

    def test_rejects_non_positive_height(self):
        with pytest.raises(ValueError):
            css_font_px(0.05, 0)


CUES = [
    {"idx": 1, "start_ms": 0, "end_ms": 2000, "text": "Перше речення."},
    {"idx": 2, "start_ms": 2000, "end_ms": 4000, "text": "Друге {речення}."},
]


def _doc(cues=None, width=1920, height=1080):
    return build_ass_document(
        cues if cues is not None else CUES,
        width=width,
        height=height,
        font_ratio=0.0711,
        padtop_ratio=0.0741,
        padbot_ratio=0.0333,
        measure=fake_measure,
        font_name="PT Serif",
        steps=DEFAULT_GRADIENT_STEPS,
    )


class TestBuildAssDocument:
    def test_emits_a_full_band_and_one_text_event_per_cue(self):
        doc = _doc()
        assert doc.count("Dialogue: 1,") == 2  # text
        # One Layer-0 event per gradient strip, not one per cue: libass lays
        # several drawings inside one event out horizontally, off the frame.
        assert doc.count("Dialogue: 0,") == 2 * DEFAULT_GRADIENT_STEPS

    def test_events_interleave_band_group_then_text_per_cue(self):
        layers = [ln.split(",")[0] for ln in _doc().splitlines() if ln.startswith("Dialogue:")]
        assert layers == (["Dialogue: 0"] * DEFAULT_GRADIENT_STEPS + ["Dialogue: 1"]) * 2

    def test_band_and_text_share_exact_timings_when_cues_touch(self):
        # CUES are back-to-back, so bridging has nothing to add: the band
        # still starts and ends exactly with its text.
        band_times = None
        checked = 0
        for line in _doc().splitlines():
            if line.startswith("Dialogue: 0,"):
                band_times = line.split(",")[1:3]
            if line.startswith("Dialogue: 1,"):
                assert line.split(",")[1:3] == band_times
                checked += 1
        assert checked == 2

    def test_escapes_braces_in_cue_text(self):
        assert r"\{речення\}" in _doc()

    def test_wraps_long_cues_itself(self):
        # 200 chars at 10 units each = 2000 > the 1652 px wrap width.
        long_cue = [{"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "аб " * 100}]
        text_line = next(ln for ln in _doc(long_cue).splitlines() if ln.startswith("Dialogue: 1,"))
        assert "\\N" in text_line

    def test_taller_cues_get_a_taller_band(self):
        one = _doc([{"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "аб"}])
        many = _doc([{"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "аб " * 100}])

        def band_top(doc):
            first = next(ln for ln in doc.splitlines() if ln.startswith("Dialogue: 0,"))
            return int(re.search(r"\\pos\(0,(\d+)\)", first).group(1))

        assert band_top(many) < band_top(one)

    def test_side_margins_are_seven_percent_of_width(self):
        line = next(ln for ln in _doc().splitlines() if ln.startswith("Style: Default,"))
        assert line.split(",")[19] == "134"  # MarginL, 7% of 1920 = 134.4

    def test_skips_cues_with_no_text(self):
        doc = _doc([{"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "   "}])
        assert "Dialogue:" not in doc

    def test_header_precedes_events(self):
        doc = _doc()
        assert doc.index("[Events]") < doc.index("Dialogue:")


def _event_times(doc):
    """(layer, start, end) per Dialogue line, in document order."""
    times = []
    for line in doc.splitlines():
        if line.startswith("Dialogue:"):
            layer, start, end = line.split(",")[0:3]
            times.append((layer, start, end))
    return times


class TestBandBridgesGaps:
    """The band must hold through the gap between cues, as the SPA does.

    The web overlay pins its height when a cue ends, so the gradient stays up
    through the deliberate 80ms gaps instead of flashing off and on. The ASS
    counterpart: a cue's band runs until the next visible cue starts; only the
    text keeps the cue's exact timings.
    """

    GAPPED = [
        {"idx": 1, "start_ms": 0, "end_ms": 2000, "text": "Перше речення."},
        {"idx": 2, "start_ms": 2080, "end_ms": 4000, "text": "Друге речення."},
    ]

    def test_band_extends_to_next_cue_start(self):
        events = _event_times(_doc(self.GAPPED))
        first_bands = [e for e in events if e[0] == "Dialogue: 0"][:DEFAULT_GRADIENT_STEPS]
        assert all(e[1] == "0:00:00.00" and e[2] == "0:00:02.08" for e in first_bands)

    def test_text_keeps_the_cue_timings(self):
        events = _event_times(_doc(self.GAPPED))
        texts = [e for e in events if e[0] == "Dialogue: 1"]
        assert texts[0] == ("Dialogue: 1", "0:00:00.00", "0:00:02.00")
        assert texts[1] == ("Dialogue: 1", "0:00:02.08", "0:00:04.00")

    def test_last_cue_band_ends_with_its_text(self):
        events = _event_times(_doc(self.GAPPED))
        last_bands = [e for e in events if e[0] == "Dialogue: 0"][DEFAULT_GRADIENT_STEPS:]
        assert all(e[2] == "0:00:04.00" for e in last_bands)

    def test_blank_cue_is_not_a_bridge_anchor(self):
        # A blank cue draws nothing, so bridging to its start would end the
        # band on an invisible event and reintroduce the flash.
        cues = [
            {"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "Перше."},
            {"idx": 2, "start_ms": 1500, "end_ms": 1600, "text": "   "},
            {"idx": 3, "start_ms": 3000, "end_ms": 4000, "text": "Третє."},
        ]
        events = _event_times(_doc(cues))
        first_bands = [e for e in events if e[0] == "Dialogue: 0"][:DEFAULT_GRADIENT_STEPS]
        assert all(e[2] == "0:00:03.00" for e in first_bands)

    def test_overlapping_cues_never_shrink_the_band(self):
        # Pathological SRT where the next cue starts before this one ends:
        # the band must still cover its own text.
        cues = [
            {"idx": 1, "start_ms": 0, "end_ms": 2000, "text": "Перше."},
            {"idx": 2, "start_ms": 1000, "end_ms": 3000, "text": "Друге."},
        ]
        events = _event_times(_doc(cues))
        first_bands = [e for e in events if e[0] == "Dialogue: 0"][:DEFAULT_GRADIENT_STEPS]
        assert all(e[2] == "0:00:02.00" for e in first_bands)

    def test_ends_with_a_newline(self):
        assert _doc().endswith("\n")


class TestBuildFfmpegCommand:
    def _cmd(self):
        return build_ffmpeg_command("in.mp4", "subs.ass", "out.mp4", "assets/fonts")

    def test_burns_via_the_ass_filter_with_fontsdir(self):
        assert "ass=subs.ass:fontsdir=assets/fonts" in " ".join(self._cmd())

    def test_copies_audio_untouched(self):
        cmd = self._cmd()
        assert cmd[cmd.index("-c:a") + 1] == "copy"

    def test_uses_the_agreed_video_settings(self):
        joined = " ".join(self._cmd())
        for flag in ("-c:v libx264", "-preset veryfast", "-crf 20", "-pix_fmt yuv420p", "-movflags +faststart"):
            assert flag in joined

    def test_input_and_output_present_and_ordered(self):
        cmd = self._cmd()
        assert cmd[cmd.index("-i") + 1] == "in.mp4"
        assert cmd[-1] == "out.mp4"

    def test_build_ffmpeg_command_omits_progress_by_default(self):
        cmd = burn_subtitles.build_ffmpeg_command("in.mp4", "s.ass", "out.mp4", "/fonts")
        assert "-progress" not in cmd

    def test_the_whole_video_argv_is_pinned(self):
        # No seek, audio copied: a clip must leave the full render exactly as it was.
        assert build_ffmpeg_command("in.mp4", "subs.ass", "out.mp4", "fonts", progress_file="p.txt") == [
            "ffmpeg",
            "-nostdin",
            "-y",
            "-progress",
            "p.txt",
            "-nostats",
            "-i",
            "in.mp4",
            "-vf",
            "ass=subs.ass:fontsdir=fonts",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            "out.mp4",
        ]

    def test_the_clip_argv_is_pinned(self):
        # -ss/-t BEFORE -i: an input-side seek, so the output clock starts at
        # zero where the re-based cues do. Audio is re-encoded, because a copied
        # stream starts at a packet of the source, not at the seek point.
        cmd = build_ffmpeg_command("in.mp4", "subs.ass", "out.mp4", "fonts", progress_file="p.txt", clip=(2000, 5000))
        assert cmd == [
            "ffmpeg",
            "-nostdin",
            "-y",
            "-progress",
            "p.txt",
            "-nostats",
            "-ss",
            "2.000",
            "-t",
            "3.000",
            "-i",
            "in.mp4",
            "-vf",
            "ass=subs.ass:fontsdir=fonts",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            "out.mp4",
        ]

    def test_clip_seconds_are_exact_to_the_millisecond(self):
        cmd = build_ffmpeg_command("in.mp4", "s.ass", "out.mp4", "/fonts", clip=(1_234_567, 1_300_001))
        assert cmd[cmd.index("-ss") + 1] == "1234.567"
        assert cmd[cmd.index("-t") + 1] == "65.434"

    def test_build_ffmpeg_command_writes_progress_to_the_given_file(self):
        cmd = burn_subtitles.build_ffmpeg_command("in.mp4", "s.ass", "out.mp4", "/fonts", progress_file="/tmp/p.txt")
        assert cmd[cmd.index("-progress") + 1] == "/tmp/p.txt"
        # -nostats keeps the periodic status line out of the log; the progress file
        # is the machine-readable channel and the log stays readable.
        assert "-nostats" in cmd
        # The flags must precede the output path, or ffmpeg treats them as output options.
        assert cmd.index("-progress") < cmd.index("out.mp4")


class TestProbeDimensions:
    def test_reads_the_first_video_stream(self, monkeypatch):
        payload = '{"streams": [{"width": 854, "height": 480}]}'
        monkeypatch.setattr(
            burn_subtitles.subprocess,
            "run",
            lambda cmd, **kw: subprocess.CompletedProcess(cmd, 0, payload, ""),
        )
        assert probe_dimensions("in.mp4") == (854, 480)


# The libass 0.17.5 message bodies are verbatim, captured locally by rendering
# this project's own probe .ass through mpv; only the line prefix was adapted,
# because the capture came through mpv ("[sub/ass] ") while production reads
# ffmpeg's stderr ("[Parsed_ass_0 @ 0x...] ").
#
# The substitution: captured with a fonts dir holding Georgia instead of our
# face and `--sub-font-provider=none`, which is exactly the shape of the
# accident this guard exists for — Georgia is what the SPA's own preview falls
# back to, and burning in it instead of PT Serif would re-wrap silently.
# Both lines are emitted: the warning, then a resolution naming the wrong face.
LIBASS_FALLBACK_STDERR = (
    "[Parsed_ass_0 @ 0x7f8e1c] fontselect: Using default font family: "
    "(PT Serif, 400, 0) -> Georgia, 0, Georgia\n"
    "[Parsed_ass_0 @ 0x7f8e1c] fontselect: (PT Serif, 400, 0) -> Georgia, 0, Georgia\n"
)

# The success case, captured the same way with --sub-fonts-dir=assets/fonts.
LIBASS_SUCCESS_STDERR = (
    "[Parsed_ass_0 @ 0x7f8e1c] fontselect: (PT Serif, 400, 0) -> PTSerif-Regular, 0, PTSerif-Regular\n"
)

# Third of libass 0.17.5's trouble messages (ass_fontselect.c): the family
# resolved, but nothing loaded can draw one character. Captured against an
# empty fonts dir, hence glyph 0x0.
LIBASS_MISSING_GLYPH_STDERR = (
    LIBASS_SUCCESS_STDERR
    + "[Parsed_ass_0 @ 0x7f8e1c] fontselect: failed to find any fallback with glyph 0x0 for font: (PT Serif, 400, 0)\n"
)


# A glyph-level fallback: the primary family resolved to OUR font, then libass
# asked for one more font because a single character (0x950 is ॐ) has no glyph
# in it. Twelve of the corpus's videos carry Sanskrit mantras in Devanagari,
# which PT Serif does not cover — treating this sequence as a substitution made
# every one of them permanently unrenderable.
LIBASS_GLYPH_FALLBACK_STDERR = (
    LIBASS_SUCCESS_STDERR
    + "[Parsed_ass_0 @ 0x7f8e1c] Glyph 0x950 not found, selecting one more font for (PT Serif, 400, 0)\n"
    + "[Parsed_ass_0 @ 0x7f8e1c] fontselect: (PT Serif, 400, 0) -> "
    "/System/Library/Fonts/Supplemental/ITFDevanagari.ttc, -1, ITFDevanagari-Book\n"
)


class TestFontSelectionError:
    """The only net under a silent font substitution.

    Checked positively — libass's *failure* wording moves between versions,
    while the resolution line it logs on success is stable — because a
    substitution silently moves every line break in every burned video.
    """

    def test_default_family_warning_is_fatal(self):
        assert font_selection_error(LIBASS_FALLBACK_STDERR, "PT Serif")

    def test_resolution_to_the_requested_face_passes(self):
        assert font_selection_error(LIBASS_SUCCESS_STDERR, "PT Serif") is None

    def test_resolution_to_another_face_is_fatal(self):
        # The warning line alone is not what we key on: a resolution naming a
        # different face must fail even if the wording of the warning changes.
        only_resolution = LIBASS_FALLBACK_STDERR.splitlines()[1]
        assert font_selection_error(only_resolution, "PT Serif")

    def test_the_second_default_font_wording_is_fatal(self):
        # libass 0.17.5 has two of these, checked in ass_fontselect.c:
        # "Using default font family: ..." and "Using default font: ...".
        stderr = (
            "fontselect: Using default font: (PT Serif, 400, 0) -> /System/Library/Fonts/Helvetica.ttc, -1, Helvetica"
        )
        assert font_selection_error(stderr, "PT Serif")

    def test_a_missing_glyph_is_fatal_even_when_the_family_resolved(self):
        # The face is right, so the positive check alone would pass this — but
        # the frame would show tofu where Ґ should be.
        stderr = (
            LIBASS_SUCCESS_STDERR
            + "fontselect: failed to find any fallback with glyph 0x490 for font: (PT Serif, 400, 0)\n"
        )
        assert font_selection_error(stderr, "PT Serif")

    def test_silence_is_not_success(self):
        # No fontselect lines at all = no proof. Refuse rather than assume.
        assert font_selection_error("", "PT Serif")

    def test_a_glyph_fallback_for_a_character_our_font_lacks_is_not_substitution(self):
        # The primary selection IS our font; the extra face exists only because
        # one mantra character has no glyph in PT Serif. The layout metrics all
        # come from the primary, so nothing re-wraps — refusing here vetoed a
        # two-hour render over a two-cue mantra.
        assert font_selection_error(LIBASS_GLYPH_FALLBACK_STDERR, "PT Serif") is None

    def test_a_fallback_face_without_a_primary_selection_is_still_no_proof(self):
        # Only the fallback resolution, no primary: the one face named arrived
        # through the glyph path, so the font the LAYOUT used is still unproven.
        lines = LIBASS_GLYPH_FALLBACK_STDERR.splitlines()
        stderr = "\n".join(lines[1:]) + "\n"
        assert font_selection_error(stderr, "PT Serif")

    def test_a_substituted_primary_is_fatal_even_with_a_glyph_fallback_after_it(self):
        # The tolerance is for the glyph path only — a wrong PRIMARY face still
        # moves every line break, fallback or no fallback.
        stderr = LIBASS_FALLBACK_STDERR + LIBASS_GLYPH_FALLBACK_STDERR.split("\n", 1)[1]
        assert font_selection_error(stderr, "PT Serif")

    def test_a_missing_glyph_stays_fatal_alongside_the_fallback_tolerance(self):
        # "failed to find any fallback" means tofu on screen: the runner has no
        # face at all for the character. The tolerance above must not eat it.
        assert font_selection_error(LIBASS_MISSING_GLYPH_STDERR, "PT Serif")

    def test_silence_can_be_tolerated_where_evidence_is_optional(self):
        # The encode runs at ffmpeg's default log level, which may withhold the
        # resolution line; the pre-flight probe is where proof is demanded.
        assert font_selection_error("", "PT Serif", require_evidence=False) is None

    def test_ignores_the_case_and_hyphenation_of_the_face_name(self):
        assert font_selection_error(LIBASS_SUCCESS_STDERR, "pt-serif") is None

    def test_message_names_the_offending_face(self):
        assert "Georgia" in font_selection_error(LIBASS_FALLBACK_STDERR, "PT Serif")

    def test_a_wider_relative_of_the_family_is_rejected(self):
        # The whole point of the guard. "PT Serif Caption" begins with "PT Serif"
        # and sets 12.6% wider (it is cut for small sizes), so a prefix match
        # would wave through exactly the corpus-wide re-wrap this exists to
        # prevent. Same for the other ParaType siblings.
        for face in ("PT Serif Caption", "PT Sans", "PT Mono", "PT Serifesque"):
            stderr = f"fontselect: (PT Serif, 400, 0) -> /usr/share/fonts/x.ttf, 0, {face}"
            assert font_selection_error(stderr, "PT Serif"), f"{face} must not pass as PT Serif"

    def test_accepts_the_face_names_read_from_the_font_file(self):
        # With the TTF in hand the accepted names come from the file itself
        # (family + "family style"), not from a pattern over the requested name.
        assert font_selection_error(LIBASS_SUCCESS_STDERR, "PT Serif", font_file=DEFAULT_FONT_FILE) is None

    def test_rejects_a_relative_of_the_family_against_the_font_file_too(self):
        stderr = "fontselect: (PT Serif, 400, 0) -> /usr/share/fonts/x.ttf, 0, PT Serif Caption"
        assert font_selection_error(stderr, "PT Serif", font_file=DEFAULT_FONT_FILE)

    def test_rejects_another_weight_of_the_same_family(self):
        # PT Serif Bold sets 8.6% wider than PT Serif Regular; the vendored file
        # is Regular, so anything else is not what Pillow measured with.
        stderr = "fontselect: (PT Serif, 400, 0) -> /usr/share/fonts/x.ttf, 0, PT Serif Bold"
        assert font_selection_error(stderr, "PT Serif", font_file=DEFAULT_FONT_FILE)


class TestFontProbeCommand:
    def _cmd(self):
        return build_font_probe_command("probe.ass", "assets/fonts")

    def test_pins_the_log_level_so_font_selection_is_visible(self):
        # The check reads ffmpeg's stderr; an inherited quieter level would turn
        # a verifiable fallback into silence.
        cmd = self._cmd()
        assert cmd[cmd.index("-v") + 1] == "verbose"

    def test_renders_a_single_frame_to_the_null_muxer(self):
        cmd = self._cmd()
        assert cmd[cmd.index("-frames:v") + 1] == "1"
        assert cmd[cmd.index("-f", cmd.index("-frames:v")) + 1] == "null"
        assert cmd[-1] == "-"

    def test_uses_the_same_ass_filter_and_fontsdir(self):
        assert "ass=probe.ass:fontsdir=assets/fonts" in " ".join(self._cmd())

    def test_font_probe_command_never_carries_progress(self):
        """The pre-flight is a one-frame probe; progress from it would be noise."""
        cmd = burn_subtitles.build_font_probe_command("probe.ass", "/fonts")
        assert "-progress" not in cmd


class TestProbeTextFor:
    """The pre-flight must cover the characters actually being burned.

    A fixed probe string proves the family and nine Ukrainian letters; a stray
    № or ♪ in one cue out of four hundred would then only surface after a
    twenty-minute encode.
    """

    def test_includes_characters_taken_from_the_cues(self):
        text = probe_text_for([{"text": "Слово № 5 — ось"}])
        for ch in "№5—ось":
            assert ch in text

    def test_keeps_the_ukrainian_floor_for_an_ascii_only_srt(self):
        text = probe_text_for([{"text": "hello"}])
        for ch in FONT_PROBE_FLOOR:
            assert ch in text

    def test_is_deduplicated_and_deterministic(self):
        text = probe_text_for([{"text": "ааабббв"}])
        assert len(text) == len(set(text))
        assert text == probe_text_for([{"text": "вбааабб"}])

    def test_drops_whitespace_and_ass_syntax_characters(self):
        text = probe_text_for([{"text": "a b\tc\\d{e}f"}])
        assert not any(ch.isspace() for ch in text)
        for ch in "{}\\":
            assert ch not in text

    def test_is_capped_so_a_pathological_file_cannot_bloat_the_probe(self):
        cues = [{"text": "".join(chr(0x4E00 + i) for i in range(2000))}]
        assert len(probe_text_for(cues)) <= FONT_PROBE_MAX_CHARS


class TestFontProbeDocument:
    def test_names_the_requested_font(self):
        assert "Style: Default,PT Serif," in font_probe_document("PT Serif")

    def test_draws_ukrainian_glyphs_so_a_partial_font_is_caught_too(self):
        doc = font_probe_document("PT Serif")
        text = next(ln for ln in doc.splitlines() if ln.startswith("Dialogue: 1,"))
        for ch in FONT_PROBE_FLOOR:
            assert ch in text

    def test_draws_the_text_it_is_given(self):
        doc = font_probe_document("PT Serif", "№♪")
        text = next(ln for ln in doc.splitlines() if ln.startswith("Dialogue: 1,"))
        assert "№" in text and "♪" in text

    def test_breaks_long_probe_text_into_lines(self):
        # One 400-character line would run off the probe frame; every glyph must
        # be rasterized, not merely shaped.
        doc = font_probe_document("PT Serif", "я" * 200)
        text = next(ln for ln in doc.splitlines() if ln.startswith("Dialogue: 1,"))
        assert "\\N" in text

    def test_starts_at_zero_so_the_first_frame_renders_it(self):
        assert "Dialogue: 1,0:00:00.00," in font_probe_document("PT Serif")


class TestMain:
    """Wiring checks: the parts no unit test above can see."""

    def _harness(
        self,
        tmp_path,
        monkeypatch,
        extra_args=(),
        returncode=0,
        stderr="",
        probe_returncode=0,
        probe_stderr=LIBASS_SUCCESS_STDERR,
        cue_text="Перше речення.",
        missing_glyph=None,
        srt_text=None,
    ):
        """Return (run, state); state survives a SystemExit raised inside main.

        `missing_glyph` stands in for libass: if the probe document contains that
        character, the fake probe answers the way libass does when no font can
        supply it. `srt_text` replaces the one-cue SRT built from `cue_text`.
        """
        srt = tmp_path / "uk.srt"
        srt.write_text(srt_text or f"1\n00:00:00,000 --> 00:00:02,000\n{cue_text}\n\n", encoding="utf-8")
        ass_out = tmp_path / "subs.ass"
        output = tmp_path / "out.mp4"
        state = {"seen": {}, "commands": [], "ass_out": ass_out, "output": output}

        def fake_measurer(font_file, font_px):
            state["seen"]["font_file"] = font_file
            state["seen"]["font_px"] = font_px
            return fake_measure

        def fake_run(cmd, **kwargs):
            state["commands"].append(cmd)
            if "-frames:v" in cmd:  # the pre-flight font probe
                probe_ass = cmd[cmd.index("-vf") + 1].split("ass=")[1].split(":fontsdir=")[0]
                with open(probe_ass, encoding="utf-8") as probe:
                    state["probe_document"] = probe.read()
                if missing_glyph and missing_glyph in state["probe_document"]:
                    return subprocess.CompletedProcess(cmd, 0, "", LIBASS_MISSING_GLYPH_STDERR)
                return subprocess.CompletedProcess(cmd, probe_returncode, "", probe_stderr)
            output.write_bytes(b"encoded")  # ffmpeg would have written the file by now
            return subprocess.CompletedProcess(cmd, returncode, "", stderr)

        monkeypatch.setattr(burn_subtitles, "text_measurer", fake_measurer)
        monkeypatch.setattr(burn_subtitles, "probe_dimensions", lambda video: (1920, 1080))
        monkeypatch.setattr(burn_subtitles.subprocess, "run", fake_run)

        def run():
            main(
                [
                    "--srt",
                    str(srt),
                    "--video",
                    "in.mp4",
                    "--output",
                    str(output),
                    "--font-ratio",
                    "0.0711",
                    "--padtop-ratio",
                    "0.0741",
                    "--padbot-ratio",
                    "0.0333",
                    "--ass-out",
                    str(ass_out),
                    *extra_args,
                ]
            )

        return run, state

    def _invoke(self, tmp_path, monkeypatch, **kwargs):
        run, state = self._harness(tmp_path, monkeypatch, **kwargs)
        run()
        return state["seen"], state["commands"], state["ass_out"]

    def _encode_command(self, commands):
        return next(cmd for cmd in commands if "-frames:v" not in cmd)

    def test_measures_in_css_pixels_not_in_ass_font_size(self, tmp_path, monkeypatch):
        # Pillow's truetype(size=) takes the CSS em size. Handing it the ASS
        # FontSize would inflate every measurement by ~20% and wrap a word early.
        seen, _, _ = self._invoke(tmp_path, monkeypatch)
        assert seen["font_px"] == pytest.approx(css_font_px(0.0711, 1080))
        assert seen["font_px"] != font_size_for(0.0711, 1080)

    def test_measures_with_the_font_that_will_be_rendered(self, tmp_path, monkeypatch):
        seen, _, _ = self._invoke(tmp_path, monkeypatch)
        assert seen["font_file"] == DEFAULT_FONT_FILE

    def test_writes_the_ass_document_and_runs_ffmpeg(self, tmp_path, monkeypatch):
        _, commands, ass_out = self._invoke(tmp_path, monkeypatch)
        doc = ass_out.read_text(encoding="utf-8")
        assert "[Events]" in doc and "Dialogue: 1," in doc
        encode = self._encode_command(commands)
        assert encode[0] == "ffmpeg"
        assert str(ass_out) in " ".join(encode)

    def test_points_fontsdir_at_the_font_file_directory(self, tmp_path, monkeypatch):
        _, commands, _ = self._invoke(tmp_path, monkeypatch)
        expected = f"fontsdir={os.path.dirname(os.path.abspath(DEFAULT_FONT_FILE))}"
        assert all(expected in " ".join(cmd) for cmd in commands)

    def test_probes_the_font_before_encoding(self, tmp_path, monkeypatch):
        # Pre-flight, not post-mortem: a fallback caught after the encode has
        # already written a wrongly-wrapped file.
        _, commands, _ = self._invoke(tmp_path, monkeypatch)
        assert "-frames:v" in commands[0]
        assert len(commands) == 2

    def test_probe_fallback_aborts_before_the_encode(self, tmp_path, monkeypatch):
        run, state = self._harness(tmp_path, monkeypatch, probe_stderr=LIBASS_FALLBACK_STDERR)
        with pytest.raises(SystemExit):
            run()
        assert len(state["commands"]) == 1  # nothing was encoded
        assert not state["output"].exists()

    def test_probe_without_font_evidence_aborts(self, tmp_path, monkeypatch):
        # Silence at verbose level means the check could not be made. Refuse.
        run, state = self._harness(tmp_path, monkeypatch, probe_stderr="")
        with pytest.raises(SystemExit):
            run()
        assert len(state["commands"]) == 1

    def test_probe_failure_is_fatal(self, tmp_path, monkeypatch):
        run, state = self._harness(tmp_path, monkeypatch, probe_returncode=1, probe_stderr="boom")
        with pytest.raises(SystemExit):
            run()
        assert len(state["commands"]) == 1

    def test_ffmpeg_failure_is_fatal(self, tmp_path, monkeypatch):
        run, _ = self._harness(tmp_path, monkeypatch, returncode=1, stderr="boom")
        with pytest.raises(SystemExit):
            run()

    def test_font_fallback_is_fatal(self, tmp_path, monkeypatch):
        # A silent substitution re-wraps every line; it must never pass as success.
        run, _ = self._harness(tmp_path, monkeypatch, stderr=LIBASS_FALLBACK_STDERR)
        with pytest.raises(SystemExit):
            run()

    def test_a_fallback_during_the_encode_leaves_no_output_behind(self, tmp_path, monkeypatch):
        # A wrongly-wrapped MP4 on disk is worse than no MP4: it looks finished.
        run, state = self._harness(tmp_path, monkeypatch, stderr=LIBASS_FALLBACK_STDERR)
        with pytest.raises(SystemExit):
            run()
        assert not state["output"].exists()

    def test_probe_covers_the_characters_of_the_subtitles(self, tmp_path, monkeypatch):
        run, state = self._harness(tmp_path, monkeypatch, cue_text="Слово № 5 — ось")
        run()
        for ch in "№5—ось":
            assert ch in state["probe_document"], f"{ch!r} was never probed"

    def test_a_character_missing_from_the_font_is_caught_before_encoding(self, tmp_path, monkeypatch):
        # One stray ♪ in one cue must cost a second, not a whole encode.
        run, state = self._harness(tmp_path, monkeypatch, cue_text="Перше ♪ речення.", missing_glyph="♪")
        with pytest.raises(SystemExit):
            run()
        assert len(state["commands"]) == 1  # the probe; nothing was encoded
        assert not state["output"].exists()

    def test_silence_from_the_encode_is_not_treated_as_a_fallback(self, tmp_path, monkeypatch):
        # ffmpeg's default log level may withhold the resolution line; the probe
        # already proved the font, so silence here must not fail the run.
        _, _, _ = self._invoke(tmp_path, monkeypatch, stderr="frame= 1 fps=0.0\n")

    def test_a_backslash_in_a_cue_is_refused_before_anything_runs(self, tmp_path, monkeypatch):
        # A typed \N reaches libass as a hard line break the wrapper never
        # counted — text spills above the band. The message must name the cue,
        # or the reviewer is left grepping four hundred of them.
        run, state = self._harness(tmp_path, monkeypatch, cue_text=r"Перше \N речення.")
        with pytest.raises(SystemExit, match=r"(?s)backslash.*1|1.*backslash"):
            run()
        assert state["commands"] == []  # refused before the probe, not after it

    # Rendered as --clip=2000-5000: one cue before the clip, one straddling each
    # edge, one inside, one starting exactly at its end. ♪ and № appear only in
    # the two cues the clip drops.
    CLIP_SRT = (
        "1\n00:00:00,000 --> 00:00:01,500\nПерше ♪\n\n"
        "2\n00:00:01,500 --> 00:00:02,500\nДруге\n\n"
        "3\n00:00:03,000 --> 00:00:04,000\nТретє\n\n"
        "4\n00:00:04,500 --> 00:00:06,000\nЧетверте\n\n"
        "5\n00:00:05,000 --> 00:00:07,000\nП’яте №\n\n"
    )

    def _text_events(self, doc):
        """(start, end, text) of every Layer-1 text event."""
        events = []
        for line in doc.splitlines():
            if line.startswith("Dialogue: 1,"):
                _, start, end = line.split(",")[0:3]
                events.append((start, end, line.rsplit("}", 1)[1]))
        return events

    def test_a_clip_seeks_the_input_and_renders_only_its_span(self, tmp_path, monkeypatch):
        _, commands, _ = self._invoke(tmp_path, monkeypatch, srt_text=self.CLIP_SRT, extra_args=["--clip=2000-5000"])
        encode = self._encode_command(commands)
        assert encode[encode.index("-ss") + 1] == "2.000"
        assert encode[encode.index("-t") + 1] == "3.000"
        assert encode.index("-t") < encode.index("-i")
        assert encode[encode.index("-c:a") + 1] == "aac"

    def test_a_clip_rebases_the_cues_onto_the_fragment(self, tmp_path, monkeypatch):
        _, _, ass_out = self._invoke(tmp_path, monkeypatch, srt_text=self.CLIP_SRT, extra_args=["--clip=2000-5000"])
        assert self._text_events(ass_out.read_text(encoding="utf-8")) == [
            ("0:00:00.00", "0:00:00.50", "Друге"),
            ("0:00:01.00", "0:00:02.00", "Третє"),
            ("0:00:02.50", "0:00:03.00", "Четверте"),
        ]

    def test_the_probe_covers_only_what_the_clip_draws(self, tmp_path, monkeypatch):
        # The characters of cues outside the clip never reach the frame, so a
        # glyph missing from them must not veto the fragment.
        run, state = self._harness(
            tmp_path, monkeypatch, srt_text=self.CLIP_SRT, extra_args=["--clip=2000-5000"], missing_glyph="♪"
        )
        run()
        assert "Т" in state["probe_document"]
        assert "♪" not in state["probe_document"] and "№" not in state["probe_document"]

    def test_the_clip_log_counts_only_cues_that_draw(self, tmp_path, monkeypatch, capsys):
        # build_ass_document skips a blank cue, so counting one would report a
        # subtitle on screen that never appears. parse_srt drops blank blocks
        # from a file, so the blank cue is injected past it.
        cues = [
            {"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "Перше"},
            {"idx": 2, "start_ms": 3000, "end_ms": 4000, "text": "Третє"},
            {"idx": 3, "start_ms": 3500, "end_ms": 3800, "text": "   "},
        ]
        run, _ = self._harness(tmp_path, monkeypatch, extra_args=["--clip=2000-5000"])
        monkeypatch.setattr(burn_subtitles, "parse_srt", lambda path: [dict(cue) for cue in cues])
        run()
        assert "[burn] clip 2000-5000 ms: 1 of 3 cues on screen" in capsys.readouterr().out

    def test_a_backslash_outside_the_clip_does_not_block_it(self, tmp_path, monkeypatch):
        # The refusal protects the frame, and this cue never reaches one.
        srt_text = self.CLIP_SRT.replace("Перше ♪", r"Перше \N ♪")
        _, commands, _ = self._invoke(tmp_path, monkeypatch, srt_text=srt_text, extra_args=["--clip=2000-5000"])
        assert len(commands) == 2

    def test_a_backslash_inside_the_clip_is_refused_by_name(self, tmp_path, monkeypatch):
        # The clip's cue count escapes every cue, and escaping raises on a
        # backslash without naming the cue — so the refusal has to come first.
        srt_text = self.CLIP_SRT.replace("Третє", r"Третє \N")
        run, state = self._harness(tmp_path, monkeypatch, srt_text=srt_text, extra_args=["--clip=2000-5000"])
        with pytest.raises(SystemExit, match="cue 3"):
            run()
        assert state["commands"] == []

    def test_an_invalid_clip_is_refused_before_anything_runs(self, tmp_path, monkeypatch):
        run, state = self._harness(tmp_path, monkeypatch, extra_args=["--clip=3000-1000"])
        with pytest.raises(SystemExit, match="before"):
            run()
        assert state["commands"] == []

    def test_an_empty_clip_renders_the_whole_video(self, tmp_path, monkeypatch):
        # The workflow input's default is "", and the workflow passes it through.
        _, commands, _ = self._invoke(tmp_path, monkeypatch, extra_args=["--clip="])
        encode = self._encode_command(commands)
        assert "-ss" not in encode and "-t" not in encode
        assert encode[encode.index("-c:a") + 1] == "copy"

    def test_a_clean_encode_still_surfaces_ffmpegs_complaints(self, tmp_path, monkeypatch, capsys):
        # ffmpeg can truncate on a damaged source and still exit 0. Its stderr
        # was captured and thrown away on success, so a green job with a short
        # file left no evidence anywhere of why.
        warning = "[mov,mp4 @ 0x1] Packet corrupt (stream = 0, dts = 8): Truncating packet"
        self._invoke(tmp_path, monkeypatch, stderr=LIBASS_SUCCESS_STDERR + warning + "\n")
        assert warning in capsys.readouterr().err


class TestTextMeasurer:
    def test_returns_a_callable_measuring_the_real_font(self):
        measure = text_measurer(DEFAULT_FONT_FILE, css_font_px(0.0711, 1080))
        assert callable(measure)
        assert measure("Слово") > 0

    def test_measurements_grow_with_string_length(self):
        measure = text_measurer(DEFAULT_FONT_FILE, 76.788)
        assert measure("Слово слово") > measure("Слово") > measure("С")

    def test_measurements_scale_with_the_font_size(self):
        small = text_measurer(DEFAULT_FONT_FILE, 40)("Слово")
        large = text_measurer(DEFAULT_FONT_FILE, 80)("Слово")
        assert large == pytest.approx(2 * small, rel=0.05)


class TestVendoredFont:
    def test_font_file_is_committed(self):
        import os

        assert os.path.exists(DEFAULT_FONT_FILE), (
            "the vendored TTF must be committed: a silent libass fallback would change every line break"
        )

    def test_font_family_name_matches_the_style(self):
        from fontTools.ttLib import TTFont

        assert TTFont(DEFAULT_FONT_FILE)["name"].getDebugName(1) == DEFAULT_FONT_NAME

    def test_font_win_metrics_back_the_size_factor(self):
        # PT_SERIF_WIN_FACTOR is derived from these three numbers; a font swap
        # that changed them would silently resize every burned subtitle.
        from fontTools.ttLib import TTFont

        font = TTFont(DEFAULT_FONT_FILE)
        assert font["head"].unitsPerEm == 1000
        assert font["OS/2"].usWinAscent == 1039
        assert font["OS/2"].usWinDescent == 286

    def test_font_covers_ukrainian(self):
        from fontTools.ttLib import TTFont

        cmap = TTFont(DEFAULT_FONT_FILE).getBestCmap()
        for cp in (0x0404, 0x0454, 0x0406, 0x0456, 0x0407, 0x0457, 0x0490, 0x0491, 0x02BC):
            assert cp in cmap, f"missing U+{cp:04X}"

    def test_font_covers_the_typography_the_corpus_is_set_in(self):
        # The preview's stack is `'Fraunces', Georgia, …` and Fraunces carries
        # no Cyrillic, so what the screen shows is the fallback. A vendored
        # face that quietly dropped «», the em dash or the right apostrophe
        # would repeat that trap where libass has no Georgia to fall back to.
        from fontTools.ttLib import TTFont

        cmap = TTFont(DEFAULT_FONT_FILE).getBestCmap()
        for char in "«»—’…":
            assert ord(char) in cmap, f"missing {char!r}"
