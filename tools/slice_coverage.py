"""Check how a talk's slices share its transcript between them.

When a talk builds several videos from one transcript (see
tools.video_roles.build_slugs), each builder keeps only the blocks its own
recording speaks. No single build can see a passage that no video claimed,
or one that two videos both claimed; this check looks across all of them.

It warns and never fails. The split between the parts is best effort, and
a person reviews it: a title line or a note about the tapes is legitimately
in no video at all.

    python -m tools.slice_coverage --talk-dir talks/1977-11-01_You-all-are-Shri-Kalki
"""

import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from .text_segmentation import build_blocks_from_paragraphs, load_transcript
from .video_roles import RoleError, build_slugs

_TIMECODE_ID = re.compile(r"^#(\d+)\s*\|")
_QUOTE_CHARS = 80


@dataclass
class Coverage:
    talk_id: str
    total: int
    texts: dict[int, str]
    claimed: dict[str, list[int]] = field(default_factory=dict)
    not_built: list[str] = field(default_factory=list)
    missing: list[tuple[int, int]] = field(default_factory=list)
    shared: list[tuple[int, list[str]]] = field(default_factory=list)


def _timecode_ids(path: Path) -> list[int]:
    ids = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        m = _TIMECODE_ID.match(line.strip())
        if m:
            ids.append(int(m.group(1)))
    return ids


def _runs(ids: list[int]) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    for i in ids:
        if runs and runs[-1][1] == i - 1:
            runs[-1] = (runs[-1][0], i)
        else:
            runs.append((i, i))
    return runs


def coverage(talk_dir: str | Path) -> Coverage:
    talk_dir = Path(talk_dir)
    # The same cut build_map prepare hands every builder, so block ids match.
    blocks = build_blocks_from_paragraphs(load_transcript(str(talk_dir / "transcript_uk.txt")))
    result = Coverage(talk_id=talk_dir.name, total=len(blocks), texts={b["id"]: b["text"] for b in blocks})

    owners: dict[int, list[str]] = {}
    for slug in build_slugs(talk_dir):
        timecodes = talk_dir / slug / "work" / "timecodes.txt"
        if not timecodes.is_file():
            result.not_built.append(slug)
            continue
        ids = _timecode_ids(timecodes)
        result.claimed[slug] = ids
        for i in ids:
            owners.setdefault(i, []).append(slug)

    result.missing = _runs([b["id"] for b in blocks if b["id"] not in owners])
    result.shared = [(i, owners[i]) for i in sorted(owners) if len(owners[i]) > 1]
    return result


def _quote(cov: Coverage, block_id: int) -> str:
    text = cov.texts.get(block_id, "")
    return text if len(text) <= _QUOTE_CHARS else text[: _QUOTE_CHARS - 1] + "…"


def _span(run: tuple[int, int]) -> str:
    return f"#{run[0]}" if run[0] == run[1] else f"#{run[0]}–#{run[1]}"


def render_summary(cov: Coverage) -> str:
    lines = [f"### Slice coverage — {cov.talk_id}", "", f"{cov.total} transcript blocks.", ""]
    for slug, ids in cov.claimed.items():
        span = f"#{min(ids)}–#{max(ids)}" if ids else "nothing"
        lines.append(f"- `{slug}`: {len(ids)} blocks, {span}")
    for slug in cov.not_built:
        lines.append(f"- `{slug}`: not built")
    if cov.missing:
        lines += ["", "**In no video** — check by ear whether a recording speaks them:", ""]
        lines += [f"- {_span(run)}: «{_quote(cov, run[0])}»" for run in cov.missing]
    if cov.shared:
        lines += ["", "**In more than one video:**", ""]
        lines += [f"- #{i} ({', '.join(slugs)}): «{_quote(cov, i)}»" for i, slugs in cov.shared]
    if not cov.missing and not cov.shared:
        lines += ["", "Every block is in exactly one video."]
    return "\n".join(lines) + "\n"


def main() -> None:
    p = argparse.ArgumentParser(description="Report how a talk's slices share its transcript")
    p.add_argument("--talk-dir", required=True)
    args = p.parse_args()
    try:
        if len(build_slugs(args.talk_dir)) < 2:
            print(f"{Path(args.talk_dir).name}: builds one video — no slices to compare", file=sys.stderr)
            return
        cov = coverage(args.talk_dir)
    except RoleError as exc:
        print(f"::warning::slice coverage not checked: {exc}", file=sys.stderr)
        return

    for slug in cov.not_built:
        print(f"::warning::{cov.talk_id}/{slug}: not built — its part of the transcript is unclaimed", file=sys.stderr)
    for run in cov.missing:
        print(
            f"::warning::{cov.talk_id}: blocks {_span(run)} are in no video: «{_quote(cov, run[0])}»", file=sys.stderr
        )
    for i, slugs in cov.shared:
        print(f"::warning::{cov.talk_id}: block #{i} is in {', '.join(slugs)}: «{_quote(cov, i)}»", file=sys.stderr)

    summary = render_summary(cov)
    print(summary, file=sys.stderr)
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as f:
            f.write(summary)


if __name__ == "__main__":
    main()
