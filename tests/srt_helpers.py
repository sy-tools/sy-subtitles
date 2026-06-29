"""Shared SRT-writing helpers for tests — single source for fixture SRTs.

Two call styles, matching how tests already author SRTs:

- ``write_srt_timecodes`` takes ``(idx, start, end, text)`` rows where start/end
  are SRT timecode strings (``"00:00:01,000"``). Use when the test cares about
  exact, hand-written timecodes.
- ``write_srt_ms`` takes ``(start_ms, end_ms, text)`` rows and auto-numbers from
  1, formatting milliseconds into timecodes. Use when the test works in ms.

Both write byte-identical output to the per-file helpers they replaced.
"""

from __future__ import annotations

from pathlib import Path


def _fmt_ms(ms: int) -> str:
    h = ms // 3600000
    ms %= 3600000
    m = ms // 60000
    ms %= 60000
    s = ms // 1000
    ms %= 1000
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt_timecodes(path, rows: list[tuple[int, str, str, str]]) -> None:
    """Write an SRT from ``(idx, start_timecode, end_timecode, text)`` rows."""
    lines: list[str] = []
    for idx, start, end, text in rows:
        lines += [str(idx), f"{start} --> {end}", text, ""]
    Path(path).write_text("\n".join(lines), encoding="utf-8")


def write_srt_ms(path, blocks: list[tuple[int, int, str]]) -> None:
    """Write an SRT from ``(start_ms, end_ms, text)`` blocks, numbered from 1."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    for i, (start_ms, end_ms, text) in enumerate(blocks, 1):
        lines += [str(i), f"{_fmt_ms(start_ms)} --> {_fmt_ms(end_ms)}", text, ""]
    p.write_text("\n".join(lines), encoding="utf-8")
