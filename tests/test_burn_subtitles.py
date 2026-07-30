"""Tests for burn_subtitles.py — SRT to ASS conversion for burned-in subtitles."""

import os
import re
import subprocess

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
    ROBOTO_WIN_FACTOR,
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

    def test_side_inset_ratio_is_ten_percent(self):
        # Fullscreen's horizontal insets; also the wrap width the SPA showed.
        assert SIDE_INSET_RATIO == 0.10

    def test_font_defaults_point_at_the_vendored_roboto(self):
        assert DEFAULT_FONT_FILE.endswith(os.path.join("assets", "fonts", "Roboto-Regular.ttf"))
        assert DEFAULT_FONT_NAME == "Roboto"

    def test_default_font_path_is_absolute(self):
        # `python -m tools.burn_subtitles` runs from wherever the caller stands;
        # a CWD-relative default fails inside Pillow anywhere but the repo root.
        assert os.path.isabs(DEFAULT_FONT_FILE)


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
            assert font_size_for(ratio, height) == round(css_font_px(ratio, height) * ROBOTO_WIN_FACTOR)

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
        font_name="Roboto",
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

    def test_band_and_text_share_exact_timings(self):
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
        # 200 chars at 10 units each = 2000 > the 1536 px wrap width.
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

    def test_side_margins_are_ten_percent_of_width(self):
        line = next(ln for ln in _doc().splitlines() if ln.startswith("Style: Default,"))
        assert line.split(",")[19] == "192"  # MarginL, 10% of 1920

    def test_skips_cues_with_no_text(self):
        doc = _doc([{"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "   "}])
        assert "Dialogue:" not in doc

    def test_header_precedes_events(self):
        doc = _doc()
        assert doc.index("[Events]") < doc.index("Dialogue:")

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
# this project's own .ass on a machine without Roboto installed; only the line
# prefix was adapted, because the capture came through mpv ("[sub/ass] ") while
# production reads ffmpeg's stderr ("[Parsed_ass_0 @ 0x...] "). Both lines are
# emitted on a fallback: the warning, then a resolution naming the wrong face.
LIBASS_FALLBACK_STDERR = (
    "[Parsed_ass_0 @ 0x7f8e1c] fontselect: Using default font family: "
    "(Roboto, 400, 0) -> /System/Library/Fonts/Helvetica.ttc, -1, Helvetica\n"
    "[Parsed_ass_0 @ 0x7f8e1c] fontselect: (Roboto, 400, 0) -> "
    "/System/Library/Fonts/Helvetica.ttc, -1, Helvetica\n"
)

# The success case, captured the same way with --sub-fonts-dir=assets/fonts.
LIBASS_SUCCESS_STDERR = "[Parsed_ass_0 @ 0x7f8e1c] fontselect: (Roboto, 400, 0) -> Roboto-Regular, 0, Roboto-Regular\n"

# Third of libass 0.17.5's trouble messages (ass_fontselect.c): the family
# resolved, but nothing on the system can draw one character. 0x490 is Ґ.
LIBASS_MISSING_GLYPH_STDERR = (
    LIBASS_SUCCESS_STDERR
    + "[Parsed_ass_0 @ 0x7f8e1c] fontselect: failed to find any fallback with glyph 0x490 for font: (Roboto, 400, 0)\n"
)


class TestFontSelectionError:
    """The only net under a silent font substitution.

    Checked positively — libass's *failure* wording moves between versions,
    while the resolution line it logs on success is stable — because a
    substitution silently moves every line break in every burned video.
    """

    def test_default_family_warning_is_fatal(self):
        assert font_selection_error(LIBASS_FALLBACK_STDERR, "Roboto")

    def test_resolution_to_the_requested_face_passes(self):
        assert font_selection_error(LIBASS_SUCCESS_STDERR, "Roboto") is None

    def test_resolution_to_another_face_is_fatal(self):
        # The warning line alone is not what we key on: a resolution naming a
        # different face must fail even if the wording of the warning changes.
        only_resolution = LIBASS_FALLBACK_STDERR.splitlines()[1]
        assert font_selection_error(only_resolution, "Roboto")

    def test_the_second_default_font_wording_is_fatal(self):
        # libass 0.17.5 has two of these, checked in ass_fontselect.c:
        # "Using default font family: ..." and "Using default font: ...".
        stderr = (
            "fontselect: Using default font: (Roboto, 400, 0) -> /System/Library/Fonts/Helvetica.ttc, -1, Helvetica"
        )
        assert font_selection_error(stderr, "Roboto")

    def test_a_missing_glyph_is_fatal_even_when_the_family_resolved(self):
        # The face is right, so the positive check alone would pass this — but
        # the frame would show tofu where Ґ should be.
        stderr = (
            LIBASS_SUCCESS_STDERR
            + "fontselect: failed to find any fallback with glyph 0x490 for font: (Roboto, 400, 0)\n"
        )
        assert font_selection_error(stderr, "Roboto")

    def test_silence_is_not_success(self):
        # No fontselect lines at all = no proof. Refuse rather than assume.
        assert font_selection_error("", "Roboto")

    def test_silence_can_be_tolerated_where_evidence_is_optional(self):
        # The encode runs at ffmpeg's default log level, which may withhold the
        # resolution line; the pre-flight probe is where proof is demanded.
        assert font_selection_error("", "Roboto", require_evidence=False) is None

    def test_ignores_the_case_and_hyphenation_of_the_face_name(self):
        assert font_selection_error(LIBASS_SUCCESS_STDERR, "roboto") is None

    def test_message_names_the_offending_face(self):
        assert "Helvetica" in font_selection_error(LIBASS_FALLBACK_STDERR, "Roboto")

    def test_a_narrower_relative_of_the_family_is_rejected(self):
        # The whole point of the guard. "Roboto Condensed" begins with "Roboto"
        # and is 10-15% narrower, so a prefix match would wave through exactly
        # the corpus-wide re-wrap this exists to prevent. Same for Roboto Slab.
        for face in ("Roboto Condensed", "Roboto Slab", "Roboto Mono", "Robotoesque"):
            stderr = f"fontselect: (Roboto, 400, 0) -> /usr/share/fonts/x.ttf, 0, {face}"
            assert font_selection_error(stderr, "Roboto"), f"{face} must not pass as Roboto"

    def test_accepts_the_face_names_read_from_the_font_file(self):
        # With the TTF in hand the accepted names come from the file itself
        # (family + "family style"), not from a pattern over the requested name.
        assert font_selection_error(LIBASS_SUCCESS_STDERR, "Roboto", font_file=DEFAULT_FONT_FILE) is None

    def test_rejects_a_relative_of_the_family_against_the_font_file_too(self):
        stderr = "fontselect: (Roboto, 400, 0) -> /usr/share/fonts/x.ttf, 0, Roboto Condensed"
        assert font_selection_error(stderr, "Roboto", font_file=DEFAULT_FONT_FILE)

    def test_rejects_another_weight_of_the_same_family(self):
        # Roboto Light is narrower than Roboto Regular; the vendored file is
        # Regular, so anything else is not what Pillow measured with.
        stderr = "fontselect: (Roboto, 400, 0) -> /usr/share/fonts/x.ttf, 0, Roboto Light"
        assert font_selection_error(stderr, "Roboto", font_file=DEFAULT_FONT_FILE)


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
        assert "Style: Default,Roboto," in font_probe_document("Roboto")

    def test_draws_ukrainian_glyphs_so_a_partial_font_is_caught_too(self):
        doc = font_probe_document("Roboto")
        text = next(ln for ln in doc.splitlines() if ln.startswith("Dialogue: 1,"))
        for ch in FONT_PROBE_FLOOR:
            assert ch in text

    def test_draws_the_text_it_is_given(self):
        doc = font_probe_document("Roboto", "№♪")
        text = next(ln for ln in doc.splitlines() if ln.startswith("Dialogue: 1,"))
        assert "№" in text and "♪" in text

    def test_breaks_long_probe_text_into_lines(self):
        # One 400-character line would run off the probe frame; every glyph must
        # be rasterized, not merely shaped.
        doc = font_probe_document("Roboto", "я" * 200)
        text = next(ln for ln in doc.splitlines() if ln.startswith("Dialogue: 1,"))
        assert "\\N" in text

    def test_starts_at_zero_so_the_first_frame_renders_it(self):
        assert "Dialogue: 1,0:00:00.00," in font_probe_document("Roboto")


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
    ):
        """Return (run, state); state survives a SystemExit raised inside main.

        `missing_glyph` stands in for libass: if the probe document contains that
        character, the fake probe answers the way libass does when no font can
        supply it.
        """
        srt = tmp_path / "uk.srt"
        srt.write_text(f"1\n00:00:00,000 --> 00:00:02,000\n{cue_text}\n\n", encoding="utf-8")
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
        # ROBOTO_WIN_FACTOR is derived from these three numbers; a font swap
        # that changed them would silently resize every burned subtitle.
        from fontTools.ttLib import TTFont

        font = TTFont(DEFAULT_FONT_FILE)
        assert font["head"].unitsPerEm == 2048
        assert font["OS/2"].usWinAscent == 1946
        assert font["OS/2"].usWinDescent == 512

    def test_font_covers_ukrainian(self):
        from fontTools.ttLib import TTFont

        cmap = TTFont(DEFAULT_FONT_FILE).getBestCmap()
        for cp in (0x0404, 0x0454, 0x0406, 0x0456, 0x0407, 0x0457, 0x0490, 0x0491, 0x02BC):
            assert cp in cmap, f"missing U+{cp:04X}"
