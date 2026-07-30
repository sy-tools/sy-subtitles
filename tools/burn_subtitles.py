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

# Rendering measures glyph advances slightly differently from our layout maths;
# 2% of headroom keeps a line from spilling a hair past the margin.
WRAP_SAFETY = 0.98

_WS_RUN = re.compile(r"\s+")

# The CSS band: linear-gradient(rgba(0,0,0,0) 0%, .35 35%, .72 70%, .92 100%).
GRADIENT_STOPS = ((0.0, 0.0), (0.35, 0.35), (0.70, 0.72), (1.0, 0.92))

# 64 strips put the alpha step at ~3.7/255 — below visibility over moving
# video, and the CSS gradient is quantized to the same 8-bit levels anyway.
DEFAULT_GRADIENT_STEPS = 64


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
    # The literal below is U+00A0. _WS_RUN would fold it too, so this replace
    # is redundant today and spelled out on purpose: if anyone ever narrows the
    # regex to [ \t]+, NBSP handling must not disappear silently with it.
    flat = text.replace(" ", " ")
    flat = _WS_RUN.sub(" ", flat).strip()
    return flat.replace("{", r"\{").replace("}", r"\}")


def font_size_for(font_ratio, height, win_factor=ROBOTO_WIN_FACTOR):
    """ASS FontSize for a font-height-to-frame-height ratio."""
    if height <= 0:
        raise ValueError(f"height must be positive, got {height}")
    ratio = max(FONT_RATIO_MIN, min(FONT_RATIO_MAX, float(font_ratio)))
    return round(ratio * height * win_factor)


def wrap_text(text, measure, max_width):
    """Wrap greedily, the way CSS does, using a caller-supplied measurer.

    `measure` takes a string and returns its rendered width. Injecting it keeps
    the wrapping logic testable without a font file.

    A word wider than the whole line is kept on a line of its own rather than
    dropped or split: overflowing by a few pixels beats losing the word.
    """
    limit = max_width * WRAP_SAFETY
    words = text.split()
    if not words:
        # Callers count lines to size the band behind the text, so an empty
        # cue must still be one line, not zero.
        return [""]
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if not current or measure(candidate) <= limit:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def text_measurer(font_file, font_px):
    """Width measurer backed by the very TTF libass will render with."""
    # Imported lazily so the pure-logic helpers stay usable without Pillow.
    from PIL import ImageFont

    font = ImageFont.truetype(font_file, font_px)
    return font.getlength


def build_ass_header(width, height, font_size, font_name, margin_h, margin_v):
    r"""Script/style header. PlayRes equals the real frame so units are pixels.

    Two styles. Default draws the text with a thin, near-opaque outline — the
    ASS counterpart of the SPA's `0 0 2px rgba(0,0,0,.9)` halo; the gradient
    band behind the text does the rest of the legibility work. Its Shadow field
    is 0 on purpose, not by oversight: the soft vertical drop shadow is applied
    per event in Task 3 through `{\blur...\xshad0\yshad...}` override tags, and
    a style-level offset here would draw a second, unblurred copy underneath.
    Band draws the gradient rectangles with no border or shadow of its own.
    """
    # The CSS halo is 0 0 2px at a ~77px font — ~2.5% of the font size, which
    # is 2 px at font_size 92. The max(1, ...) floor keeps a visible edge on
    # small frames, where the ratio alone would round to nothing.
    outline = max(1, round(font_size * 0.025))
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
            # OutlineColour alpha 1A ~ the CSS 0 0 2px rgba(0,0,0,.9) halo.
            # BackColour (alpha 26 ~ the 0 2px 8px rgba(0,0,0,.85) drop shadow)
            # is the shadow's colour. It draws nothing while the Shadow field
            # below is 0, and comes alive when Task 3's per-event \yshad
            # override gives the shadow a non-zero offset — it is not dead.
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


def gradient_alpha_at(u):
    """CSS opacity at relative depth u (0 = band top, 1 = frame bottom)."""
    u = max(0.0, min(1.0, float(u)))
    for (u0, a0), (u1, a1) in zip(GRADIENT_STOPS, GRADIENT_STOPS[1:], strict=False):
        if u0 <= u <= u1:
            span = u1 - u0
            t = (u - u0) / span if span else 0.0
            return a0 + (a1 - a0) * t
    return GRADIENT_STOPS[-1][1]


def ass_alpha_byte(alpha):
    """ASS alpha is inverted: 00 fully opaque, FF fully transparent."""
    alpha = max(0.0, min(1.0, float(alpha)))
    return f"{round((1.0 - alpha) * 255):02X}"


def band_geometry(height, font_size, line_count, margin_v, padtop_px):
    """Return (band_top, band_height) in frame pixels.

    libass advances one FontSize per line, so text height is line_count *
    font_size — not the CSS line-height. Clamped into the frame so a cue that
    wrapped unusually wide cannot place the band off-screen.
    """
    text_h = max(1, line_count) * font_size
    band_h = min(height, padtop_px + text_h + margin_v)
    return height - band_h, band_h


def band_event(start_ms, end_ms, width, band_top, band_height, steps=DEFAULT_GRADIENT_STEPS):
    """Return the LIST of Layer-0 events drawing the gradient band, one per strip.

    One event per strip, not one event holding every strip: libass lays each
    drawing out like a glyph and advances the pen by its bounding-box width, so
    strips packed into a single event render at x=0, W, 2W, ... and all but the
    first fall off the frame. Rendered through libass 0.17.5 on a grey 1920x1080
    clip, three strips in one event drew only the first, while the same three as
    separate \\pos-ed events drew the full-width gradient correctly. Each strip
    therefore draws from its own origin and carries its absolute frame Y in \\pos.

    All strips share the cue's exact timings, which reproduces the CSS behaviour
    of the band being visible only while a subtitle is on screen. The caller
    joins them into the document with the rest of the events.
    """
    if steps < 1:
        raise ValueError(f"steps must be >= 1, got {steps}")
    start, end = ass_timestamp(start_ms), ass_timestamp(end_ms)
    events = []
    prev_bottom = 0
    for i in range(steps):
        # Integer edges shared between neighbours: no seams, no double-coverage.
        bottom = round(band_height * (i + 1) / steps)
        if bottom <= prev_bottom:
            continue
        centre = (prev_bottom + bottom) / 2 / band_height
        alpha = ass_alpha_byte(gradient_alpha_at(centre))
        strip_h = bottom - prev_bottom
        events.append(
            f"Dialogue: 0,{start},{end},Band,,0,0,0,,"
            f"{{\\an7\\pos(0,{band_top + prev_bottom})\\bord0\\shad0\\1c&H000000&\\1a&H{alpha}&\\p1}}"
            f"m 0 0 l {width} 0 {width} {strip_h} 0 {strip_h}{{\\p0}}"
        )
        prev_bottom = bottom
    return events


def dialogue_event(start_ms, end_ms, lines, font_size):
    """The text event, with the CSS soft drop shadow expressed in ASS.

    The style Shadow field offsets diagonally, so a purely vertical CSS shadow
    needs an explicit \\xshad0 plus \\yshad override.
    """
    blur = max(1, round(font_size * 0.045))
    yshad = max(1, round(font_size * 0.033))
    text = "\\N".join(lines)
    return (
        f"Dialogue: 1,{ass_timestamp(start_ms)},{ass_timestamp(end_ms)},Default,,"
        f"0,0,0,,{{\\blur{blur}\\xshad0\\yshad{yshad}}}{text}"
    )
