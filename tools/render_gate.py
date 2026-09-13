"""Block until a detached ffmpeg encode passes a percentage of the source.

Why this exists at all: the preview SPA wants a true render percentage, and a
GitHub Actions job offers exactly one live channel to the browser. Measured on
2026-07-31 against a running job:

  * ``GET /actions/jobs/{id}/logs``          -> 404 BlobNotFound mid-run
  * ``GET /check-runs/{id}/annotations``     -> empty until the job finalises
  * ``GET /actions/runs/{id}/artifacts``     -> live, but each upload costs seconds
  * ``GET /actions/runs/{id}/jobs`` .steps[] -> live status/started_at/completed_at

Only the last one is both live and free, and the SPA already polls it. So the
workflow runs ffmpeg **once**, detached, writing its own ``-progress`` file, and
then declares a series of cheap named steps that each block here until the
encode passes a threshold. Every step that completes is a progress tick the SPA
sees without any new API surface.

The module is split deliberately: the parsing helpers are pure so they can be
tested against captured ffmpeg output, and the waiting loop takes an injected
clock and sleep so the ten-minute stall window costs nothing in tests.
"""

import argparse
import sys
import time
from dataclasses import dataclass

# Polled often enough that a gate is not the bottleneck, rarely enough that
# twenty gates cost no meaningful runner CPU.
DEFAULT_POLL_SECONDS = 5.0

# ffmpeg emits a progress block roughly every half second; ten minutes without
# out_time advancing means the encode is wedged, not merely slow. Applies to the
# threshold gates only — see wait_for on why --await-exit is exempt.
DEFAULT_STALL_SECONDS = 600.0

# Exit codes. A failed render propagates ffmpeg's own code instead, so these two
# are the only ones this module invents.
EXIT_SETUP_ERROR = 1
EXIT_STALLED = 3
EXIT_TRUNCATED = 4

# The least of the source a clean exit may leave encoded. Container durations
# are approximate — a stream legitimately runs a fraction of a second short of
# the declared length — but 2% of a 149-minute talk is three minutes, which is
# not rounding, it is a truncated video handed over as a finished one.
COMPLETE_FRACTION_FLOOR = 0.98

# The floor's absolute counterpart, for renders short enough that their last
# frames outweigh 2%; either condition passes. A complete render's final
# out_time still falls short of its span, by an amount the ffmpeg build sets:
#   * the runner (ubuntu-24.04, ffmpeg 6.1.1, run 34774278171) reported 14.99 s
#     for a 15.000 s clip with audio: out_time there is the latest packet
#     across streams, so the audio brings it within one AAC frame (~21 ms);
#   * ffmpeg 8.1, measured locally, stopped two video frames short with or
#     without audio: 83 ms at 24 fps, 400 ms at 5 fps.
# 0.2 s covers the first with audio at any frame rate and the second above
# 10 fps. A video-only source is shorter by whole frames on either build (on 6.1
# three, from the encoder's delay: 200 ms at 15 fps), so below ~15 fps without
# audio a complete short render can read as cut; talks carry audio. It
# refuses what 0.5 s let through: a 1 s clip that exited 0 with half its frames
# missing. From 10 s up the 98% floor is the looser test (2% >= 0.2 s), so only
# shorter renders are ever decided here.
COMPLETE_SLACK_SECONDS = 0.2

# How much of the detached render's log to echo when a gate fails.
LOG_TAIL_CHARS = 4000


@dataclass
class GateOutcome:
    """Why a gate stopped waiting.

    ``status`` is one of "reached", "failed" or "stalled". ``exit_code`` carries
    the render process's own code when it has one, so a failure can be
    propagated rather than flattened into a generic 1.
    """

    status: str
    exit_code: int = None
    fraction: float = None


def _complete_lines(text):
    """The lines of an append-only file that are certainly whole.

    ffmpeg appends progress blocks while we read, so the final line of a poll
    can be a half-written ``out_tim``. Everything before the last newline is
    committed; anything after it is discarded rather than parsed as zero.
    """
    if not text:
        return []
    return text.split("\n")[:-1]


def parse_out_time_us(text):
    """Microseconds of source encoded so far, or None if nothing usable yet.

    Reads ``out_time_us``, never ``out_time_ms``: ffmpeg writes *microseconds*
    into the field named ms (a long-standing upstream misnomer), so a reader
    that trusted the name would be 1000x wrong. The file repeats its blocks, so
    the last parseable value wins — and a trailing ``N/A``, which ffmpeg emits
    before it has decoded anything, does not erase a real earlier sample.
    """
    last = None
    for line in _complete_lines(text):
        key, sep, value = line.partition("=")
        if not sep or key.strip() != "out_time_us":
            continue
        try:
            last = int(value.strip())
        except ValueError:
            # "N/A" before the first frame, or a value we cannot trust.
            continue
    return last


def is_finished(text):
    """True once ffmpeg has written its terminal ``progress=end`` block.

    Note this means the *encoder* is done, not that the process has exited:
    ``-movflags +faststart`` rewrites the moov atom afterwards. Gates use this
    to release; the final "await the exit code" wait deliberately does not.
    """
    return any(line.strip() == "progress=end" for line in _complete_lines(text))


def progress_fraction(text, total_seconds):
    """Share of the source encoded so far in [0, 1], or None if unknowable.

    Clamped at 1.0 because a container's declared duration is approximate and a
    stream can legitimately run a fraction of a second past it.
    """
    if not total_seconds or total_seconds <= 0:
        return None
    out_time_us = parse_out_time_us(text)
    if out_time_us is None:
        return None
    return min(1.0, out_time_us / 1_000_000.0 / total_seconds)


def encoded_completely(fraction, total_seconds):
    """True when a render that exited 0 left nothing a viewer would miss.

    No progress at all is never complete: a gate must not vouch for what it
    cannot see, and a total under the slack would otherwise pass anything.
    """
    if fraction is None:
        return False
    return fraction >= COMPLETE_FRACTION_FLOOR or total_seconds * (1.0 - fraction) <= COMPLETE_SLACK_SECONDS


def wait_for(
    threshold,
    read_progress,
    read_exit_code,
    now,
    sleep,
    total_seconds,
    poll_seconds=DEFAULT_POLL_SECONDS,
    stall_seconds=DEFAULT_STALL_SECONDS,
):
    """Block until the encode passes `threshold`, dies, or stops moving.

    `threshold` is a fraction in [0, 1]; ``None`` means "ignore the percentage
    and wait for the process to exit" — what the final step does, because
    ``progress=end`` arrives before the muxer has finished. That mode is also
    exempt from `stall_seconds`: the phase it covers emits no progress at all,
    so a progress-driven stall detector there measures nothing.

    `read_progress` returns the progress file's current text (empty string if it
    does not exist yet — the launcher and the first gate legitimately race).
    `read_exit_code` returns the render's exit code once it has one, else None.

    `now` and `sleep` are injected so the whole loop is testable without real
    time passing.
    """
    last_us = None
    last_advance = now()
    while True:
        text = read_progress()
        exit_code = read_exit_code()

        # A dead render fails the very next gate, loudly. Marching the remaining
        # gates through on already-recorded progress would bury the failure ten
        # steps deeper in the job.
        if exit_code is not None and exit_code != 0:
            return GateOutcome("failed", exit_code=exit_code)

        out_time_us = parse_out_time_us(text)
        if out_time_us is not None and (last_us is None or out_time_us > last_us):
            last_us = out_time_us
            last_advance = now()

        fraction = progress_fraction(text, total_seconds)
        if threshold is not None:
            if fraction is not None and fraction >= threshold:
                return GateOutcome("reached", fraction=fraction)
            # The encode can outrun the poller between two gates; without this a
            # gate above the last observed percentage would wait forever.
            if is_finished(text):
                return GateOutcome("reached", fraction=fraction)

        if exit_code is not None:
            # The final gate is the one place truncation is checkable: ffmpeg
            # can hit a damaged packet partway, stop, and still exit 0 — and
            # every threshold gate would then release on the progress already
            # recorded, sending a 20-minute file for a 149-minute talk out as a
            # green job. Both operands are here: the declared duration and the
            # last out_time. No progress at all is the same verdict — a gate
            # must not vouch for what it cannot see.
            if threshold is None and not encoded_completely(fraction, total_seconds):
                return GateOutcome("truncated", exit_code=exit_code, fraction=fraction)
            # Zero: the render is over and this gate's threshold was simply
            # never observed. Release it rather than hang.
            return GateOutcome("reached", exit_code=exit_code, fraction=fraction)

        # The stall window is progress-driven, so it only means anything while
        # something is expected to write progress. In --await-exit mode nothing
        # is: ffmpeg emits progress=end BEFORE `-movflags +faststart` starts
        # rewriting the moov atom, and that rewrite — whose duration scales with
        # output size — is silent by construction. Policing it there would fail a
        # job whose render succeeded. The terminating condition of that wait is
        # the exit-code file, and the job's own timeout-minutes is the right
        # outer bound for a phase that is legitimately quiet.
        if threshold is not None and now() - last_advance > stall_seconds:
            return GateOutcome("stalled", fraction=fraction)

        sleep(poll_seconds)


def _read_text(path):
    """A file's text, or "" when it does not exist yet."""
    if not path:
        return ""
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def _read_exit_code(path):
    """The render's exit code once the launcher has written it, else None."""
    raw = _read_text(path).strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        # A half-written file on this poll; it will be complete on the next one.
        return None


def read_duration_seconds(path):
    """Rendered duration in seconds — the source's, or a clip's span — or raise SystemExit.

    Deliberately fatal: without a duration there is no percentage, and a gate
    that quietly opened anyway would be a gate that lies about the render.
    """
    raw = _read_text(path).strip()
    if not raw:
        raise SystemExit(f"render gate: no render duration in {path!r}; cannot compute a percentage")
    try:
        seconds = float(raw)
    except ValueError:
        raise SystemExit(f"render gate: render duration {raw!r} in {path!r} is not a number") from None
    if seconds <= 0:
        raise SystemExit(f"render gate: render duration {seconds} in {path!r} is not positive")
    return seconds


def main(argv=None):
    parser = argparse.ArgumentParser(description="Block until a detached ffmpeg render passes a threshold.")
    parser.add_argument("--progress-file", required=True, help="ffmpeg's -progress output")
    parser.add_argument(
        "--duration-file",
        required=True,
        help="file holding the rendered duration in seconds: the source's, or a clip's span",
    )
    parser.add_argument("--exit-file", required=True, help="written by the launcher when the render exits")
    parser.add_argument("--log-file", help="the detached render's combined output; tailed on failure")
    parser.add_argument("--percent", type=float, default=0.0, help="threshold; 0 returns on the first sample")
    parser.add_argument(
        "--await-exit",
        action="store_true",
        help=(
            "ignore the percentage and block until the render exits, adopting its exit code; "
            "exempt from --stall-seconds, which measures a channel this phase does not use"
        ),
    )
    parser.add_argument("--poll-seconds", type=float, default=DEFAULT_POLL_SECONDS)
    parser.add_argument("--stall-seconds", type=float, default=DEFAULT_STALL_SECONDS)
    args = parser.parse_args(argv)

    total_seconds = read_duration_seconds(args.duration_file)
    threshold = None if args.await_exit else args.percent / 100.0

    outcome = wait_for(
        threshold,
        lambda: _read_text(args.progress_file),
        lambda: _read_exit_code(args.exit_file),
        now=time.monotonic,
        sleep=time.sleep,
        total_seconds=total_seconds,
        poll_seconds=args.poll_seconds,
        stall_seconds=args.stall_seconds,
    )

    if outcome.status == "reached":
        return 0
    if outcome.status == "failed":
        print(f"::error::the render exited with code {outcome.exit_code}")
        code = outcome.exit_code or EXIT_SETUP_ERROR
    elif outcome.status == "truncated":
        encoded = "no progress at all" if outcome.fraction is None else f"only {outcome.fraction:.0%} of its duration"
        print(f"::error::the render exited cleanly having encoded {encoded} — the video is truncated")
        code = EXIT_TRUNCATED
    else:
        print(f"::error::no encode progress for {args.stall_seconds:.0f}s; giving up")
        code = EXIT_STALLED
    # The job's own log blob is unavailable from the API until the job
    # finalises, so a failure nobody echoes here is invisible until the end.
    tail = _read_text(args.log_file)[-LOG_TAIL_CHARS:]
    if tail:
        print("--- render log (tail) ---")
        print(tail)
    return code


if __name__ == "__main__":
    sys.exit(main())
