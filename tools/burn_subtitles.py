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

import argparse
import contextlib
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from .srt_utils import parse_srt

# Vendored rather than apt-installed: the typeface was chosen because its
# Ukrainian text is 101% of Georgia's width, so line breaks match the preview.
# A silent substitution would re-wrap the entire corpus.
# Source: Google Fonts static Roboto Regular v51, Apache-2.0 (LICENSE-Roboto.txt).
# Its Win metrics (upm 2048, ascent 1946, descent 512) are what make
# ROBOTO_WIN_FACTOR correct and are pinned by tests.
# Absolute: the CLI is run from wherever the caller stands, and a relative
# default would only resolve from the repo root.
DEFAULT_FONT_FILE = str(Path(__file__).resolve().parents[1] / "assets" / "fonts" / "Roboto-Regular.ttf")
DEFAULT_FONT_NAME = "Roboto"

# Fullscreen's 10% horizontal insets.
SIDE_INSET_RATIO = 0.10

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


def css_font_px(font_ratio, height):
    """The em size in CSS pixels — what the overlay renders at on screen.

    This, not `font_size_for`, is what a text measurer wants: Pillow's
    `ImageFont.truetype(size=...)` takes the em size, so feeding it the ASS
    FontSize would inflate every width by the Win-metric factor (~20%) and wrap
    cues a word early. The clamp lives here so both sizes share it.
    """
    if height <= 0:
        raise ValueError(f"height must be positive, got {height}")
    ratio = max(FONT_RATIO_MIN, min(FONT_RATIO_MAX, float(font_ratio)))
    return ratio * height


def font_size_for(font_ratio, height, win_factor=ROBOTO_WIN_FACTOR):
    """ASS FontSize for a font-height-to-frame-height ratio."""
    return round(css_font_px(font_ratio, height) * win_factor)


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


def build_ass_document(
    cues,
    width,
    height,
    font_ratio,
    padtop_ratio,
    padbot_ratio,
    measure,
    font_name=DEFAULT_FONT_NAME,
    steps=DEFAULT_GRADIENT_STEPS,
):
    """Assemble the full ASS document for a cue list.

    Each cue contributes its band — one Layer-0 event per gradient strip — and
    then a single Layer-1 text event, all sharing the cue's timings. Cues whose
    text is blank are skipped entirely: a band with nothing on it would flash a
    dark strip across an otherwise clean frame.
    """
    font_size = font_size_for(font_ratio, height)
    margin_h = round(SIDE_INSET_RATIO * width)
    margin_v = round(padbot_ratio * height)
    padtop_px = round(padtop_ratio * height)
    wrap_width = width - 2 * margin_h

    lines = [build_ass_header(width, height, font_size, font_name, margin_h, margin_v)]
    for cue in cues:
        # Escape first: wrapping then measures the escaped form, so the one
        # backslash each escaped brace adds is counted although libass will not
        # draw it. Braces are vanishingly rare here, and the 2% wrap safety
        # margin absorbs it; measuring the raw text would instead let a line
        # grow past the margin.
        text = escape_ass_text(cue["text"])
        if not text:
            continue
        wrapped = wrap_text(text, measure, wrap_width)
        band_top, band_height = band_geometry(height, font_size, len(wrapped), margin_v, padtop_px)
        lines.extend(band_event(cue["start_ms"], cue["end_ms"], width, band_top, band_height, steps))
        lines.append(dialogue_event(cue["start_ms"], cue["end_ms"], wrapped, font_size))
    return "\n".join(lines) + "\n"


def build_ffmpeg_command(video, ass_path, output, fonts_dir, progress_file=None):
    """ffmpeg argv. Audio is copied, never re-encoded.

    `progress_file` turns on ffmpeg's own machine-readable `-progress` channel.
    The workflow points it at a file the render-gate steps poll, which is how the
    SPA learns the true encode percentage — see tools/render_gate.py for why that
    detour exists. `-nostats` rides along so the periodic human status line stops
    flooding the job log now that the same numbers go to the file.
    """
    cmd = ["ffmpeg", "-nostdin", "-y"]
    if progress_file:
        # -progress and -nostats are global options, so they belong with the
        # other globals and, crucially, ahead of the output path: after it
        # ffmpeg would parse them as options of a second output file.
        cmd += ["-progress", progress_file, "-nostats"]
    cmd += [
        "-i",
        video,
        "-vf",
        f"ass={ass_path}:fontsdir={fonts_dir}",
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
        output,
    ]
    return cmd


# libass logs the face it settled on as "fontselect: (<request>) -> <path>, <index>,
# <face>". ffmpeg prefixes the line with "[Parsed_ass_0 @ 0x...]".
_FONTSELECT_RESULT = re.compile(r"fontselect:\s*\([^)]*\)\s*->\s*(?P<result>.+)")

# Supplementary to the positive check below, not a substitute for it: these are
# the three trouble messages libass 0.17.5 emits (ass_fontselect.c). The first
# two are also caught by the face comparison; the third is not, because the
# family resolves correctly and only a single glyph has nowhere to come from —
# which still puts a tofu box on screen.
_FONTSELECT_TROUBLE = (
    "Using default font family",
    "Using default font:",
    "failed to find any fallback with glyph",
)


def _normalized_face(name):
    """Fold a face name for comparison: 'Roboto-Regular' ~ 'Roboto Regular'."""
    return re.sub(r"[\s_-]+", "", name).casefold()


# Style words that name the plain cut of a family, so "Roboto" and
# "Roboto Regular" mean the same face. Deliberately short: "Light" and
# "Condensed" are *different* widths and must not be folded away.
_NEUTRAL_STYLE_WORDS = ("regular", "book", "roman", "normal")


def accepted_faces(font_name, font_file=None):
    """Folded names a font provider may legitimately report for our font.

    Read out of the TTF when we have it, because a name that merely *looks*
    related is not evidence: "Roboto Condensed" and "Roboto Slab" both begin
    with "Roboto", and Condensed is 10-15% narrower — the very corpus-wide
    re-wrap this module exists to prevent. Matching is exact over this set.

    Pillow reads the family, not fontTools: fontTools is a test-only dependency,
    and Pillow is already required at run time to measure with this same file.
    """
    if font_file:
        from PIL import ImageFont

        family, style = ImageFont.truetype(font_file, 16).getname()
        names = {family}
        if style:
            names.add(f"{family} {style}")
        return {_normalized_face(name) for name in names}
    # No file to read: accept the requested family and its plain cuts only.
    folded = _normalized_face(font_name)
    return {folded} | {folded + word for word in _NEUTRAL_STYLE_WORDS}


def font_selection_error(stderr, font_name, font_file=None, require_evidence=True):
    """Return a message if libass did not render with `font_name`, else None.

    Checked *positively* — the resolution line libass logs on success is stable
    across versions, whereas the wording it uses on a miss is not: 0.17.5 says
    "Using default font family", which contains none of the words an earlier
    blocklist-style check looked for. Since a substituted face changes every
    measured width, and therefore every line break in every burned video, a
    result that cannot be proven correct is treated as a failure.

    `require_evidence` is the one deliberate exception, used after the encode:
    the pre-flight probe has already proven the font by then, so a log that
    happens to carry no fontselect line — a quieter build, a truncated capture —
    must not condemn a finished render. Proof is demanded where it is free.
    """
    faces = [m.group("result").split(",")[-1].strip() for m in _FONTSELECT_RESULT.finditer(stderr)]
    trouble = [phrase for phrase in _FONTSELECT_TROUBLE if phrase in stderr]
    if trouble:
        used = ", ".join(sorted(set(faces))) or "an unknown face"
        return f"libass could not render with {font_name} ({'; '.join(trouble)}; resolved to {used})"
    if not faces:
        if require_evidence:
            return f"could not verify that libass selected {font_name}: no fontselect lines in the log"
        return None
    wanted = accepted_faces(font_name, font_file)
    unexpected = sorted({face for face in faces if _normalized_face(face) not in wanted})
    if unexpected:
        return f"libass resolved {font_name} to {', '.join(unexpected)}"
    return None


# A throwaway frame, sized so a capped probe text fits inside it: every probed
# glyph should be rasterized, not merely shaped.
FONT_PROBE_WIDTH = 640
FONT_PROBE_HEIGHT = 480
FONT_PROBE_FONT_SIZE = 24
FONT_PROBE_LINE_CHARS = 32

# The letters unique to Ukrainian, always probed even if the subtitles happen
# not to use them: if the font resolves but lacks them, libass reaches for
# another face and the probe sees it.
FONT_PROBE_FLOOR = "ҐґЄєІіЇїʼ"

# Purely a guard against a pathological file; a Ukrainian talk uses ~100 distinct
# characters, so this never bites in practice.
FONT_PROBE_MAX_CHARS = 400

# Braces and backslashes are ASS syntax rather than text, and every font has
# them; probing them would mean escaping them.
_PROBE_EXCLUDED = set("{}\\")


def probe_text_for(cues, floor=FONT_PROBE_FLOOR, limit=FONT_PROBE_MAX_CHARS):
    """The distinct characters to prove the font can draw, for these subtitles.

    Probing a fixed string would only prove the family plus a handful of letters;
    a stray № or ♪ in one cue out of four hundred would then surface only after
    a full encode. Sorted, so the probe document is deterministic.
    """
    chars = {ch for cue in cues for ch in cue.get("text", "")} | set(floor)
    usable = sorted(ch for ch in chars if not ch.isspace() and ch not in _PROBE_EXCLUDED)
    return "".join(usable[:limit])


def font_probe_document(font_name, probe_text=FONT_PROBE_FLOOR, font_size=FONT_PROBE_FONT_SIZE):
    """A one-cue ASS document whose only job is to make libass resolve a font.

    It starts at t=0 so the very first rendered frame draws it — the probe would
    otherwise have nothing to report on — and the text is broken into short
    lines so it stays on the probe frame.
    """
    lines = [probe_text[i : i + FONT_PROBE_LINE_CHARS] for i in range(0, len(probe_text), FONT_PROBE_LINE_CHARS)] or [
        ""
    ]
    header = build_ass_header(FONT_PROBE_WIDTH, FONT_PROBE_HEIGHT, font_size, font_name, 0, 0)
    return header + "\n" + dialogue_event(0, 1000, lines, font_size) + "\n"


def build_font_probe_command(ass_path, fonts_dir):
    """One frame rendered to the null muxer, purely to read the font selection.

    ffmpeg maps libass MSGL_INFO to AV_LOG_INFO (vf_subtitles.c), so the
    resolution line is already visible at the default level; `-v verbose` is
    belt and braces, so an inherited quieter default cannot turn the check into
    silence. Rendering to `-f null -` costs a moment and, unlike a post-encode
    check, cannot leave a wrongly wrapped file on disk.
    """
    return [
        "ffmpeg",
        "-nostdin",
        "-v",
        "verbose",
        "-f",
        "lavfi",
        "-i",
        f"color=c=black:s={FONT_PROBE_WIDTH}x{FONT_PROBE_HEIGHT}:d=0.1",
        "-vf",
        f"ass={ass_path}:fontsdir={fonts_dir}",
        "-frames:v",
        "1",
        "-f",
        "null",
        "-",
    ]


def verify_font_selection(font_name, fonts_dir, font_file=None, probe_text=FONT_PROBE_FLOOR):
    """Fail before encoding if libass will not draw `probe_text` in `font_name`."""
    with tempfile.TemporaryDirectory() as tmp:
        probe_ass = os.path.join(tmp, "probe.ass")
        with open(probe_ass, "w", encoding="utf-8") as f:
            f.write(font_probe_document(font_name, probe_text))
        proc = subprocess.run(
            build_font_probe_command(probe_ass, fonts_dir),
            capture_output=True,
            text=True,
        )
    if proc.returncode != 0:
        raise SystemExit(f"font probe failed:\n{proc.stderr[-2000:]}")
    error = font_selection_error(proc.stderr, font_name, font_file=font_file)
    if error:
        raise SystemExit(f"{error}\nA substituted font re-wraps every line; refusing to burn.")


def probe_dimensions(video):
    """Real pixel dimensions of the first video stream."""
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
            video,
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    stream = json.loads(out)["streams"][0]
    return int(stream["width"]), int(stream["height"])


def main(argv=None):
    parser = argparse.ArgumentParser(description="Burn subtitles into a video.")
    parser.add_argument("--srt", required=True)
    parser.add_argument("--video", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--font-ratio", type=float, required=True)
    parser.add_argument("--padtop-ratio", type=float, required=True)
    parser.add_argument("--padbot-ratio", type=float, required=True)
    parser.add_argument("--font-file", default=DEFAULT_FONT_FILE)
    parser.add_argument("--font-name", default=DEFAULT_FONT_NAME)
    parser.add_argument("--gradient-steps", type=int, default=DEFAULT_GRADIENT_STEPS)
    parser.add_argument("--ass-out", help="keep the generated .ass for inspection")
    parser.add_argument(
        "--progress-file",
        help="write ffmpeg's machine-readable -progress stream here (polled by tools.render_gate)",
    )
    args = parser.parse_args(argv)

    width, height = probe_dimensions(args.video)
    font_size = font_size_for(args.font_ratio, height)
    # The measurer takes CSS pixels, not the ASS FontSize — see css_font_px.
    measure = text_measurer(args.font_file, css_font_px(args.font_ratio, height))
    cues = parse_srt(args.srt)
    doc = build_ass_document(
        cues,
        width,
        height,
        args.font_ratio,
        args.padtop_ratio,
        args.padbot_ratio,
        measure,
        args.font_name,
        args.gradient_steps,
    )

    ass_path = args.ass_out or os.path.join(tempfile.mkdtemp(), "subs.ass")
    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"[burn] {width}x{height}, FontSize {font_size}, ASS at {ass_path}")

    fonts_dir = os.path.dirname(os.path.abspath(args.font_file))
    # Pre-flight: prove the font can draw *these* subtitles before spending an
    # encode on them. Probing a fixed string would leave a stray character in
    # one cue to be discovered twenty minutes later.
    verify_font_selection(args.font_name, fonts_dir, args.font_file, probe_text_for(cues))

    cmd = build_ffmpeg_command(args.video, ass_path, args.output, fonts_dir, args.progress_file)
    print("[burn] " + " ".join(cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"ffmpeg failed:\n{proc.stderr[-4000:]}")
    # Second net, now that the probe covers the content too: this catches only
    # what a single frame of the real document could still differ on.
    # Silence is tolerated here — see font_selection_error.
    error = font_selection_error(proc.stderr, args.font_name, font_file=args.font_file, require_evidence=False)
    if error:
        # Never leave a wrongly wrapped file behind: it looks like a finished burn.
        with contextlib.suppress(OSError):
            os.remove(args.output)
        raise SystemExit(f"{error}\nA substituted font re-wraps every line; removed {args.output}.")
    print(f"[burn] wrote {args.output}")


if __name__ == "__main__":
    main()
