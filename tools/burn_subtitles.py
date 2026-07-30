"""Burn Ukrainian subtitles into a video, matching the SPA's fullscreen look.

Converts an SRT into an ASS subtitle file and invokes ffmpeg with libass.
Replaces the Pillow-PNG-per-subtitle workaround used when the local ffmpeg
lacks libass.

Sizing is driven by dimensionless ratios measured by the SPA against the
displayed video, never by pixels: fullscreen derives its font size from the
viewport width, so raw pixels would make the output depend on the monitor that
happened to trigger the render.

See docs/superpowers/specs/2026-07-30-burned-in-subtitle-video-design.md.
"""

import re

# ASS FontSize is mapped onto the font's Win cell height, not CSS pixels:
#   FontSize = css_px * (usWinAscent + usWinDescent) / unitsPerEm
# Roboto: (1946 + 512) / 2048. Its hhea metrics disagree by 2.4%, so rendered
# glyph height must be confirmed on a real frame, not trusted from arithmetic.
ROBOTO_WIN_FACTOR = 1.2002

# Guards against a pathological measurement arriving from the browser.
FONT_RATIO_MIN = 0.02
FONT_RATIO_MAX = 0.12

_WS_RUN = re.compile(r"\s+")


def ass_timestamp(ms):
    """Format milliseconds as an ASS timestamp (H:MM:SS.cc, centiseconds)."""
    if ms < 0:
        raise ValueError(f"negative timestamp: {ms}")
    cs_total = ms // 10
    cs = cs_total % 100
    seconds = (cs_total // 100) % 60
    minutes = (cs_total // 6_000) % 60
    hours = cs_total // 360_000
    return f"{hours}:{minutes:02d}:{seconds:02d}.{cs:02d}"


def escape_ass_text(text):
    """Flatten a cue to a single escaped line.

    Braces would otherwise be read as an override block and disappear. Incoming
    line breaks are dropped because the generator re-wraps the text itself.
    """
    flat = text.replace(" ", " ")
    flat = _WS_RUN.sub(" ", flat).strip()
    return flat.replace("{", r"\{").replace("}", r"\}")


def font_size_for(font_ratio, height, win_factor=ROBOTO_WIN_FACTOR):
    """ASS FontSize for a font-height-to-frame-height ratio."""
    if height <= 0:
        raise ValueError(f"height must be positive, got {height}")
    ratio = max(FONT_RATIO_MIN, min(FONT_RATIO_MAX, float(font_ratio)))
    return round(ratio * height * win_factor)


def build_ass_header(width, height, font_size, font_name, margin_h, margin_v):
    """Script/style header. PlayRes equals the real frame so units are pixels.

    Two styles: Default draws the text (soft blurred shadow, no hard outline —
    the gradient band behind it does the legibility work), Band draws the
    gradient rectangles with no border or shadow of its own.
    """
    outline = max(1, round(font_size * 0.07))
    return "\n".join(
        [
            "[Script Info]",
            "ScriptType: v4.00+",
            f"PlayResX: {width}",
            f"PlayResY: {height}",
            # The generator emits explicit \N; libass must not re-wrap, or the band
            # height computed from the line count would no longer match.
            "WrapStyle: 2",
            # libass >= 0.15 defaults this to no, which would shrink border/shadow.
            "ScaledBorderAndShadow: yes",
            "YCbCr Matrix: None",
            "",
            "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
            "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
            "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
            "Alignment, MarginL, MarginR, MarginV, Encoding",
            # OutlineColour alpha 1A ~ the CSS 0 0 2px rgba(0,0,0,.9) halo;
            # BackColour alpha 26 ~ the 0 2px 8px rgba(0,0,0,.85) drop shadow.
            f"Style: Default,{font_name},{font_size},&H00FFFFFF,&H00FFFFFF,"
            f"&H1A000000,&H26000000,0,0,0,0,100,100,0,0,1,{outline},0,"
            f"2,{margin_h},{margin_h},{margin_v},1",
            f"Style: Band,{font_name},{font_size},&H00FFFFFF,&H00FFFFFF,"
            "&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,"
            "7,0,0,0,1",
            "",
            "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        ]
    )
