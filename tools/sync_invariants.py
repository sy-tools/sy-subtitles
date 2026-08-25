"""End-state checks that gate the sync commit.

Phase 1 made a failed run leave the working tree untouched. This decides what
counts as a failure. The sync is a TEXT tool: it may rewrite what a subtitle
says and it may drop a block whose sentence is gone, but it may never move a
timecode or invent one. Timing comes from whisper or from an EN SRT and is
never derived from a text edit (feedback_no_proportional).

The checks run on planned CONTENT, before anything reaches disk, so a
violation costs nothing.
"""

import tempfile
from pathlib import Path

from .srt_utils import parse_srt


def _cues(text: str, tmp: Path) -> list[tuple[int, int]]:
    tmp.write_text(text, encoding="utf-8")
    return [(b["start_ms"], b["end_ms"]) for b in parse_srt(str(tmp))]


def _is_subsequence(small: list, large: list) -> bool:
    it = iter(large)
    return all(item in it for item in small)


def check_writes(writes: dict[str, str], scratch: Path | None = None) -> list[str]:
    """Reasons the plan must not be applied. Empty means it may be.

    Only `uk.srt` writes are checked — nothing else carries timing.
    """
    failures: list[str] = []
    scratch_dir = scratch or Path(tempfile.mkdtemp(prefix="sync_invariants_"))
    scratch_dir.mkdir(parents=True, exist_ok=True)
    tmp = scratch_dir / "planned.srt"

    for path, content in sorted(writes.items()):
        if not path.endswith("uk.srt"):
            continue
        existing = Path(path)
        if not existing.is_file():
            continue  # new file: there is nothing it could have moved
        before = [(b["start_ms"], b["end_ms"]) for b in parse_srt(path)]
        after = _cues(content, tmp)

        if len(after) > len(before):
            failures.append(
                f"{path}: block count grew {len(before)} → {len(after)} — a text sync has no timing "
                f"for a new subtitle. Run the full pipeline."
            )
        elif not _is_subsequence(after, before):
            failures.append(
                f"{path}: a timecode moved. The sync may rewrite subtitle text and drop blocks, "
                f"never retime them. Run the full pipeline."
            )
    return failures
