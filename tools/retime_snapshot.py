"""Carry a dry-run snapshot's recorded timings over to the current block list.

`tests/fixtures/pipeline_snapshots/*/work/timecodes.txt` is the builder
agent's answer for one specific cut of the transcript into blocks. Change how
that cut is made — a new sentence boundary, a newly declared omitted remark —
and the ids stop lining up: `build_map assemble` drops every block without a
timecode and the replay fails text preservation.

Re-recording those answers would need the LLM. Re-timing them does not: the
text is the same, only its block boundaries moved. This tool maps the current
blocks back onto the recorded ones word by word and

  * copies the recorded span when a block is unchanged,
  * splits a recorded span at the widest real whisper pauses inside it when
    one block became several,
  * drops a recorded span whose text is no longer shipped.

Splits land on silence in the audio, never on a character ratio. When a span
holds no usable pause the split falls back to even division — reported in the
result so a fixture is never quietly built on a guess.

Usage:
    python -m tools.retime_snapshot \\
        --snapshot tests/fixtures/pipeline_snapshots/TALK/VIDEO \\
        --whisper talks/TALK/VIDEO/source/whisper.json [--check]
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from .srt_utils import ms_to_time, time_to_ms
from .text_segmentation import build_blocks_from_paragraphs, load_transcript

TC_RE = re.compile(r"#(\d+)\s*\|\s*([\d:,]+)\s*\|\s*([\d:,]+)")

# A pause must be at least this long to be treated as a sentence boundary, and
# each side of a split must keep at least this much time.
MIN_PAUSE_MS = 120
MIN_PART_MS = 200


@dataclass
class RetimeResult:
    n_blocks_before: int
    n_blocks_after: int
    splits: int = 0
    dropped: int = 0
    fallback_splits: list[int] = field(default_factory=list)

    @property
    def changed(self) -> bool:
        return self.n_blocks_before != self.n_blocks_after or bool(self.splits) or bool(self.dropped)


def _words(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower(), flags=re.UNICODE)


def _read_timecodes(path: Path) -> dict[int, tuple[int, int]]:
    spans: dict[int, tuple[int, int]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = TC_RE.search(line)
        if m:
            spans[int(m.group(1))] = (time_to_ms(m.group(2)), time_to_ms(m.group(3)))
    return spans


def _load_pauses(whisper_path: Path) -> list[tuple[int, int]]:
    """Silence gaps between consecutive whisper words, in ms."""
    data = json.loads(whisper_path.read_text(encoding="utf-8"))
    times: list[tuple[int, int]] = []
    for seg in data.get("segments", []):
        for w in seg.get("words", []):
            if w.get("word", "").strip():
                times.append((int(w["start"] * 1000), int(w["end"] * 1000)))
    times.sort()
    return [(end, start) for (_, end), (start, _) in zip(times, times[1:], strict=False) if start - end >= MIN_PAUSE_MS]


def _map_new_blocks_to_old(old_blocks: list[dict], new_blocks: list[dict]) -> list[list[int]]:
    """For each new block, the old block indices its words came from.

    Both lists spell out the same transcript, so a word-level opcode diff
    tells us which recorded block each surviving word belonged to. Words that
    are new (there are none — the text only ever shrinks) map to nothing.
    """
    old_words, old_owner = [], []
    for i, b in enumerate(old_blocks):
        for w in _words(b["text"]):
            old_words.append(w)
            old_owner.append(i)

    new_words, new_owner = [], []
    for i, b in enumerate(new_blocks):
        for w in _words(b["text"]):
            new_words.append(w)
            new_owner.append(i)

    sources: list[list[int]] = [[] for _ in new_blocks]
    matcher = difflib.SequenceMatcher(None, old_words, new_words, autojunk=False)
    for old_i, new_i, size in matcher.get_matching_blocks():
        for k in range(size):
            seen = sources[new_owner[new_i + k]]
            if old_owner[old_i + k] not in seen:
                seen.append(old_owner[old_i + k])
    return sources


def _split_span(span: tuple[int, int], parts: int, pauses: list[tuple[int, int]]) -> tuple[list[tuple[int, int]], bool]:
    """Cut one recorded span into `parts`, preferring real whisper pauses.

    Returns the parts and whether a pause was actually available.
    """
    start, end = span
    inside = [
        (gap_start, gap_end)
        for gap_start, gap_end in pauses
        if start + MIN_PART_MS <= gap_start and gap_end <= end - MIN_PART_MS
    ]
    inside.sort(key=lambda g: g[1] - g[0], reverse=True)
    chosen = sorted(inside[: parts - 1])

    if len(chosen) < parts - 1:
        step = (end - start) // parts
        cuts = [(start + step * i, start + step * i) for i in range(1, parts)]
        return _cuts_to_parts(start, end, cuts), False
    return _cuts_to_parts(start, end, chosen), True


def _cuts_to_parts(start: int, end: int, cuts: list[tuple[int, int]]) -> list[tuple[int, int]]:
    parts, cursor = [], start
    for gap_start, gap_end in cuts:
        parts.append((cursor, gap_start))
        cursor = gap_end
    parts.append((cursor, end))
    return parts


def retime_snapshot(snapshot: Path, whisper: Path, check: bool = False) -> RetimeResult:
    """Rewrite a snapshot's uk_blocks.json/timecodes.txt for the current cut."""
    snapshot, whisper = Path(snapshot), Path(whisper)
    work = snapshot / "work"
    old_blocks = json.loads((work / "uk_blocks.json").read_text(encoding="utf-8"))
    old_spans = _read_timecodes(work / "timecodes.txt")

    new_blocks = build_blocks_from_paragraphs(load_transcript(str(snapshot / "expected" / "transcript_uk.txt")))
    sources = _map_new_blocks_to_old(old_blocks, new_blocks)
    pauses = _load_pauses(whisper)

    result = RetimeResult(n_blocks_before=len(old_blocks), n_blocks_after=len(new_blocks))
    result.dropped = len({i for i in range(len(old_blocks))} - {i for src in sources for i in src})

    # Blocks sharing a single recorded span must split it between them.
    share_count: dict[int, int] = {}
    for src in sources:
        if len(src) == 1:
            share_count[src[0]] = share_count.get(src[0], 0) + 1

    split_parts: dict[int, list[tuple[int, int]]] = {}
    for old_idx, count in share_count.items():
        if count < 2:
            continue
        old_id = old_blocks[old_idx]["id"]
        if old_id not in old_spans:
            continue
        parts, from_pause = _split_span(old_spans[old_id], count, pauses)
        split_parts[old_idx] = parts
        result.splits += count - 1
        if not from_pause:
            result.fallback_splits.append(old_id)

    taken: dict[int, int] = {}
    lines, blocks_out = [], []
    for new_idx, (block, src) in enumerate(zip(new_blocks, sources, strict=True), start=1):
        span = _span_for(block, src, old_blocks, old_spans, split_parts, taken)
        if span is None:
            continue
        blocks_out.append({"id": new_idx, "text": block["text"], "para_idx": block["para_idx"]})
        lines.append(f"#{new_idx} | {ms_to_time(span[0])} | {ms_to_time(span[1])}")

    # Renumber: a dropped block must not leave a hole in the id sequence.
    for i, b in enumerate(blocks_out, start=1):
        b["id"] = i
    lines = [re.sub(r"^#\d+", f"#{i}", line) for i, line in enumerate(lines, start=1)]
    result.n_blocks_after = len(blocks_out)

    if not check:
        (work / "uk_blocks.json").write_text(
            json.dumps(blocks_out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        (work / "timecodes.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        manifest_path = snapshot / "manifest.json"
        if manifest_path.is_file():
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["n_blocks"] = len(blocks_out)
            manifest["directly_timed"] = len(blocks_out)
            manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return result


def _span_for(block, src, old_blocks, old_spans, split_parts, taken):
    """The (start, end) a current block inherits from the recorded ones."""
    if not src:
        return None
    if len(src) == 1 and src[0] in split_parts:
        old_idx = src[0]
        part = split_parts[old_idx][taken.get(old_idx, 0)]
        taken[old_idx] = taken.get(old_idx, 0) + 1
        return part
    spans = [old_spans[old_blocks[i]["id"]] for i in src if old_blocks[i]["id"] in old_spans]
    if not spans:
        return None
    return min(s for s, _ in spans), max(e for _, e in spans)


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-time a dry-run snapshot for the current block list")
    parser.add_argument("--snapshot", required=True, help="Snapshot directory (TALK/VIDEO)")
    parser.add_argument("--whisper", required=True, help="whisper.json for that video")
    parser.add_argument("--check", action="store_true", help="Report drift without writing")
    args = parser.parse_args()

    result = retime_snapshot(Path(args.snapshot), Path(args.whisper), check=args.check)
    print(
        f"{args.snapshot}: {result.n_blocks_before} → {result.n_blocks_after} blocks "
        f"({result.splits} split, {result.dropped} dropped)"
    )
    if result.fallback_splits:
        print(
            f"  WARNING: no whisper pause inside blocks {result.fallback_splits} — split evenly",
            file=sys.stderr,
        )
    if args.check and result.changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
