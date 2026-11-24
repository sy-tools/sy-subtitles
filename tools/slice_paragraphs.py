"""Which transcript paragraphs a slice's own recording speaks.

A video built as a slice of a shared transcript (see tools.video_roles
build_slugs) carries only part of it, and short lines repeat across slices.
The build is the one moment that knows exactly which blocks a slice timed, so
it records their paragraphs in `final/build_manifest.yaml` under
`paragraphs`, as 1-based inclusive ranges, beside `paragraph_count` — how
many paragraphs the transcript had then. The numbers mean nothing against a
transcript with a different count, so edit-sync refuses a slice whose
transcript no longer has that count, and refuses to re-paragraph one.

    python -m tools.slice_paragraphs --video-dir talks/<talk>/<video>
"""

import argparse
import json
import re
from pathlib import Path

import yaml

from .text_segmentation import load_transcript, strip_omitted_phrases

_TIMECODE_ID = re.compile(r"^#(\d+)\s*\|")


class SliceMapMissing(Exception):
    """A slice whose manifest does not say which paragraphs it carries."""


def paragraph_ranges(blocks: list[dict], timed_ids) -> list[list[int]]:
    """1-based inclusive paragraph ranges covered by the timed blocks."""
    para_of = {b["id"]: b["para_idx"] for b in blocks}
    unknown = [i for i in timed_ids if i not in para_of]
    if unknown:
        raise ValueError(f"timed block(s) {', '.join(f'#{i}' for i in unknown)} are not in this block cut")
    paras = sorted({para_of[i] + 1 for i in timed_ids})
    ranges: list[list[int]] = []
    for p in paras:
        if ranges and ranges[-1][1] == p - 1:
            ranges[-1][1] = p
        else:
            ranges.append([p, p])
    return ranges


def _manifest_path(video_dir: Path) -> Path:
    return Path(video_dir) / "final" / "build_manifest.yaml"


def write_paragraphs(video_dir: str | Path) -> list[list[int]]:
    video_dir = Path(video_dir)
    blocks = json.loads((video_dir / "work" / "uk_blocks.json").read_text(encoding="utf-8"))
    ids = []
    for line in (video_dir / "work" / "timecodes.txt").read_text(encoding="utf-8-sig").splitlines():
        m = _TIMECODE_ID.match(line.strip())
        if m:
            ids.append(int(m.group(1)))
    ranges = paragraph_ranges(blocks, ids)
    count = len(load_transcript(str(video_dir.parent / "transcript_uk.txt")))
    if any(hi > count for _lo, hi in ranges):
        raise ValueError(f"{video_dir.name}: blocks name paragraph {ranges[-1][1]}, the transcript has {count}")
    path = _manifest_path(video_dir)
    manifest = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    manifest["paragraphs"] = ranges
    manifest["paragraph_count"] = count
    path.write_text(yaml.safe_dump(manifest, default_flow_style=None, sort_keys=False), encoding="utf-8")
    return ranges


def recorded_paragraph_count(video_dir: str | Path) -> int:
    """How many transcript paragraphs the slice's map was recorded against."""
    manifest = yaml.safe_load(_manifest_path(Path(video_dir)).read_text(encoding="utf-8")) or {}
    count = manifest.get("paragraph_count")
    if not isinstance(count, int):
        raise SliceMapMissing(
            f"{Path(video_dir).name}: its paragraph map does not record the paragraph count it was made "
            "against — rebuild it, or run tools.slice_paragraphs on its build outputs"
        )
    return count


def own_paragraphs(video_dir: str | Path) -> set[int] | None:
    """0-based paragraph indices this slice carries; None when the video is not a slice."""
    path = _manifest_path(Path(video_dir))
    if not path.is_file():
        return None
    manifest = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    if not manifest.get("slice"):
        return None
    ranges = manifest.get("paragraphs")
    if not ranges:
        raise SliceMapMissing(
            f"{Path(video_dir).name}: built as a slice, but its build manifest does not record which "
            "transcript paragraphs it carries — rebuild it, or run tools.slice_paragraphs on its build outputs"
        )
    return {p - 1 for lo, hi in ranges for p in range(lo, hi + 1)}


_MASK = "\x00"
_HEADER_MARKER = re.compile(r"(Talk Language:|Language:|Мова промови:|Мова:)")
_STAGE_LINE = re.compile(r"\[[^\[\]]+\]")


def paragraph_spans(text: str) -> list[tuple[int, int]]:
    """Where load_transcript's paragraphs sit in the raw `text`, as (start, end).

    The same cut as text_segmentation.load_transcript before declared remarks
    are stripped — header lines, whole bracketed lines dropped, blank-line or
    one-per-line paragraphs — measured as offsets instead of copied as
    strings. It must run on the raw text: load_transcript decides between
    the two paragraph shapes before stripping, and a paragraph that was only
    a remark leaves a blank line behind in the stripped text.
    """
    lines = []  # (start, end, line) for every line of text
    pos = 0
    for line in text.split("\n"):
        lines.append((pos, pos + len(line), line))
        pos += len(line) + 1
    body_start = 0
    for i, (_lo, _hi, line) in enumerate(lines[:5]):
        if _HEADER_MARKER.search(line):
            body_start = i + 1
            break
    kept = [ln for ln in lines[body_start:] if not (ln[2].strip() and _STAGE_LINE.fullmatch(ln[2].strip()))]
    blank_mode = any(ln[2] == "" for ln in kept[1:-1])

    groups: list[list[tuple[int, int, str]]] = []
    if blank_mode:
        current: list[tuple[int, int, str]] = []
        for ln in kept:
            if ln[2] == "":
                if current:
                    groups.append(current)
                current = []
            else:
                current.append(ln)
        if current:
            groups.append(current)
    else:
        groups = [[ln] for ln in kept]

    spans = []
    for group in groups:
        lo, hi = group[0][0], group[-1][1]
        chunk = text[lo:hi]
        if not chunk.strip():
            continue
        lo += len(chunk) - len(chunk.lstrip())
        hi -= len(chunk) - len(chunk.rstrip())
        spans.append((lo, hi))
    return spans


def mask_foreign(view: str, offsets: list[int], raw: str, own: set[int], expected: int, omit_phrases) -> str | None:
    """`view` with every paragraph this slice does not carry blanked out.

    `view` is the omit-stripped transcript and `offsets` maps each of its
    characters to `raw` (sync_common.strip_with_map). Paragraphs are cut on
    `raw`, the way load_transcript cuts them, and dropped when nothing but a
    remark is left, as load_transcript drops them. The result has the length
    of `view`, so positions found in it are positions in `view`. Whitespace
    stays, because a block may run across the gap between two of the slice's
    own paragraphs. None when `raw` does not yield `expected` paragraphs:
    a mask built from a different cut could not be trusted.
    """
    spans = [(lo, hi) for lo, hi in paragraph_spans(raw) if strip_omitted_phrases(raw[lo:hi], omit_phrases)]
    if len(spans) != expected:
        return None
    raw_own = [False] * (len(raw) + 1)
    for i in own:
        if i < len(spans):
            lo, hi = spans[i]
            raw_own[lo:hi] = [True] * (hi - lo)
    return "".join(c if raw_own[offsets[k]] or c.isspace() else _MASK for k, c in enumerate(view))


def main() -> None:
    p = argparse.ArgumentParser(description="Record which transcript paragraphs a slice carries")
    p.add_argument("--video-dir", required=True, help="talks/<talk>/<video>, with work/ and final/")
    args = p.parse_args()
    ranges = write_paragraphs(args.video_dir)
    print(f"{Path(args.video_dir).name}: paragraphs {ranges}")


if __name__ == "__main__":
    main()
