"""What rendering a fragment of a talk video means, in one place.

burn-subtitles.yml takes an optional ``clip`` input, ``START_MS-END_MS``. Three
consumers read it: the input guard (tools/workflow_validation.py), the burner
(tools/burn_subtitles.py) and the Start render step, which must tell the render
gates how long the render will be before launching it. They share this parser
so they cannot disagree about which clips exist.

Stdlib-only: the guard runs before setup-python has installed anything.
"""

import argparse
import math
import re
import sys

# The shortest clip the workflow renders. The SPA offers clips against the same
# bound, which is why it is one named constant rather than a literal per site.
CLIP_MIN_MS = 1000

# [0-9], never \d: in a str pattern \d matches every Unicode decimal digit, and
# int() would then happily convert Arabic-Indic numerals. fullmatch, never $:
# $ also matches before a trailing newline.
_CLIP_RE = re.compile(r"(0|[1-9][0-9]*)-(0|[1-9][0-9]*)")


class ClipError(ValueError):
    """A clip that cannot be rendered, with a message fit for a ::error:: line."""


def _seconds(ms):
    """Whole milliseconds as exact seconds text: 2500 -> "2.500"."""
    return f"{ms // 1000}.{ms % 1000:03d}"


def parse_clip(value):
    """``"START_MS-END_MS"`` -> ``(start_ms, end_ms)``, or raise ClipError.

    Two non-negative decimal integers with no sign and no leading zeros (a lone
    "0" excepted), START before END, at least CLIP_MIN_MS apart. An empty value
    is refused here: "render the whole video" is the caller's branch, not a clip.
    """
    match = _CLIP_RE.fullmatch(value)
    if not match:
        raise ClipError(f"clip must be START_MS-END_MS in whole milliseconds, e.g. 60000-90000; got {value!r}")
    try:
        start_ms, end_ms = int(match.group(1)), int(match.group(2))
    except ValueError:
        # Past 4300 digits Python refuses the conversion in its own words.
        raise ClipError(f"clip {value!r} is not a usable millisecond count") from None
    if start_ms >= end_ms:
        raise ClipError(f"clip {value!r} must start before it ends")
    if end_ms - start_ms < CLIP_MIN_MS:
        raise ClipError(f"clip {value!r} spans {end_ms - start_ms} ms; the shortest clip is {CLIP_MIN_MS} ms")
    return start_ms, end_ms


def rebase_cues(cues, start_ms, end_ms):
    """The cues that play inside the clip, moved onto its clock (0 = START).

    ffmpeg seeks on the input side, so the frames reach the ass filter with
    their clock reset to zero; cues left on the source timeline would show
    START late. A cue straddling an edge is clamped to it. New dicts are
    returned, keeping every other key — `idx` above all, so an error about a
    cue still names the cue a reviewer can find in the SRT.
    """
    rebased = []
    for cue in cues:
        if cue["end_ms"] <= start_ms or cue["start_ms"] >= end_ms:
            continue
        cue_start = max(cue["start_ms"], start_ms) - start_ms
        cue_end = min(cue["end_ms"], end_ms) - start_ms
        if cue_end <= cue_start:
            continue
        rebased.append({**cue, "start_ms": cue_start, "end_ms": cue_end})
    return rebased


def rendered_span_seconds(start_ms, end_ms, source_seconds):
    """Seconds of video a clip will actually render: min(END, source) - START.

    An END past the source is not an error — ffmpeg stops at EOF — but the
    render gates must then expect the shorter span, or the percentage never
    nears 100 and Finish render fails the job as truncated. A clip that starts
    at or past the end, or keeps less than CLIP_MIN_MS once clamped, is refused
    so the step can fail before the render is launched.

    Worked in integer microseconds: in floats 1.13 - 0.13 is just under 1.0, and
    a clip leaving exactly the minimum would be refused for its representation.
    """
    if not math.isfinite(source_seconds) or source_seconds <= 0:
        raise ClipError(f"the source duration {source_seconds!r} is not a positive number of seconds")
    source_us = round(source_seconds * 1_000_000)
    start_us = start_ms * 1000
    if start_us >= source_us:
        raise ClipError(
            f"clip {start_ms}-{end_ms} starts at {_seconds(start_ms)} s, "
            f"past the end of the {source_seconds:.3f} s video"
        )
    span_us = min(end_ms * 1000, source_us) - start_us
    if span_us < CLIP_MIN_MS * 1000:
        raise ClipError(
            f"clip {start_ms}-{end_ms} leaves {span_us / 1_000_000:.3f} s of the {source_seconds:.3f} s video; "
            f"the shortest clip is {_seconds(CLIP_MIN_MS)} s"
        )
    return span_us / 1_000_000


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=(
            "Print the seconds a clip of the source will render — the duration the render gates measure against."
        )
    )
    parser.add_argument(
        "--clip",
        required=True,
        help="START_MS-END_MS; pass it as --clip=VALUE, or a value such as -5-3000 is read as an option",
    )
    parser.add_argument(
        "--source-duration-file",
        required=True,
        help="ffprobe's format=duration of the whole source, in seconds",
    )
    args = parser.parse_args(argv)
    try:
        start_ms, end_ms = parse_clip(args.clip)
        with open(args.source_duration_file, encoding="utf-8") as f:
            raw = f.read().strip()
        try:
            source_seconds = float(raw)
        except ValueError:
            raise ClipError(f"no source duration in {args.source_duration_file!r}: {raw!r}") from None
        span = rendered_span_seconds(start_ms, end_ms, source_seconds)
    except (ClipError, OSError) as e:
        # stderr: the workflow redirects stdout into the gates' duration file.
        print(f"::error::{e}", file=sys.stderr)
        return 1
    print(f"{span:.6f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
