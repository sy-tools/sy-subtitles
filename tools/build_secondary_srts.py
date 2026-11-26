"""Build UK SRTs for the secondary videos of a multi-video talk.

A talk can have several videos (different recordings of the same event). One is
the *primary* (built by the LLM from the transcript); the videos declared
``sync: derived`` in meta.yaml take their UK SRT from it by re-timing it onto
their own timeline. Roles come from tools.video_roles, so this is not
"everything that is not the primary" — ``independent`` and ``ignored`` videos
are never built here. The bridge between the two timelines is built from matched words in
the two EN SRTs (``srt_utils.timing_en_srt``: the corrected ``final/en.srt`` when
there is one, else ``source/en.srt``) — a constant time offset when the recordings
differ only by a head/tail shift (``offset_srt``), or a word-level warp when one
covers a subset of the other (``resync_srt``).

The derivation therefore needs an EN SRT on BOTH the primary and the
secondary, regardless of the talk's ``timing_source``. A secondary without
``en.srt`` (a raw recording with no English subtitles — e.g. a yogi-intro or a
silent havan) simply has nothing to derive from and is **skipped**, not treated
as a build failure. Likewise, if the primary has no ``en.srt`` (a true
whisper-mode talk), there is no bridge to build and every secondary is skipped.

Usage:
    python -m tools.build_secondary_srts --talk-dir PATH [--primary-slug SLUG] \
        [--run-id ID]

``--primary-slug`` is an override for the declared primary and must agree with
meta.yaml; a contradiction is an error, not a preference.
"""

from __future__ import annotations

import argparse
import contextlib
import sys
from datetime import UTC, datetime
from pathlib import Path

import yaml

from .offset_srt import apply_offset, detect_offset
from .resync_srt import resync
from .srt_utils import clamp_to_media_end, load_media_end_ms, ms_to_time, parse_srt, timing_en_srt, write_srt
from .video_roles import RoleError, resolve_roles
from .video_roles import primary_slug as resolve_primary


def _end_at_media_end(srt_path: Path, video_dir: Path) -> None:
    """Cut the derived SRT at its OWN video's end.

    A clip's caption track can run on past the clip with the rest of the
    recording, and every primary block carried onto that stretch is text the
    clip does not hold — so, unlike a primary build, a block that STARTS at or
    past the end is dropped, not kept with a warning. The one straddling the
    end is clamped to it.

    The end is whisper.json's `duration` and nothing else: the clip's own
    caption track is what overruns, the build job has no media to probe, and
    whisper's last segment only bounds the end from below — derived blocks in
    the corpus legitimately start up to 9 s after it, and a sung ending may
    have no segment at all. A video without a recorded duration is warned
    about; `python -m tools.local_whisper --duration-only` records it.
    """
    media_end_ms = load_media_end_ms(video_dir / "source" / "whisper.json")
    if media_end_ms is None:
        print(
            f"::warning::{video_dir.parent.name}/{video_dir.name}: source/whisper.json records no duration, "
            "so the derived uk.srt is not cut at the video's end; record it with "
            f"`python -m tools.local_whisper --talk-id {video_dir.parent.name} --video-slug {video_dir.name} "
            "--duration-only`",
            file=sys.stderr,
        )
        return
    blocks = parse_srt(str(srt_path))
    kept = [b for b in blocks if b["start_ms"] < media_end_ms]
    dropped = len(blocks) - len(kept)
    if dropped:
        print(
            f"=== {video_dir.name}: dropped {dropped} block(s) starting at or past the video's end "
            f"{ms_to_time(media_end_ms)}",
            file=sys.stderr,
        )
    if clamp_to_media_end(kept, media_end_ms) or dropped:
        write_srt(kept, str(srt_path))


def _video_slugs(talk_dir: Path) -> list[str]:
    with open(talk_dir / "meta.yaml", encoding="utf-8") as f:
        meta = yaml.safe_load(f)
    return [v["slug"] for v in (meta.get("videos") or [])]


def _write_manifest(path: Path, mode: str, primary_slug: str, run_id) -> None:
    manifest = {
        "role": "secondary",
        "mode": mode,
        "primary_slug": primary_slug,
        "built_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "run_id": run_id,
    }
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(manifest, f, default_flow_style=False, sort_keys=False)


def _corrects_download(video_dir: Path) -> bool:
    """True when final/en.srt re-times a downloaded source/en.srt.

    A final/en.srt with no download beside it, a byte-identical copy of one,
    or one that moves every cue by the same amount (a download published
    against another cut of the video) keeps the download's cue-to-cue
    timing, so a constant offset between the two videos still holds.
    """
    final, source = video_dir / "final" / "en.srt", video_dir / "source" / "en.srt"
    if not (final.is_file() and source.is_file()):
        return False
    fixed, raw = parse_srt(str(final)), parse_srt(str(source))
    if len(fixed) != len(raw):
        return True
    pairs = list(zip(fixed, raw, strict=True))
    if any(f["text"] != r["text"] for f, r in pairs):
        return True
    shifts = {f["start_ms"] - r["start_ms"] for f, r in pairs} | {f["end_ms"] - r["end_ms"] for f, r in pairs}
    return len(shifts) != 1


def build_secondary_srts(talk_dir, primary_slug: str | None = None, run_id=None) -> list[dict]:
    """Derive a UK SRT for every DERIVED video that can have one.

    Which videos those are comes from meta.yaml's `sync:` model, read through
    tools.video_roles — not from "everything that is not the primary". An
    `independent` video is a separate recording that happens to share a date;
    offsetting the primary's subtitles onto it would be nonsense, and an
    `ignored` one is never written at all.

    Returns one result dict per derived video:
        {"slug", "status": "built"|"skipped", "mode": str|None, "reason": str|None}
    Skipping (missing en.srt) is a normal outcome, not an error.
    """
    talk_dir = Path(talk_dir)
    roles = resolve_roles(talk_dir)
    declared = resolve_primary(talk_dir)
    if primary_slug is not None and primary_slug != declared:
        # An override that disagrees with meta.yaml is a mistake, not a
        # preference: the `slug == primary_slug` skip below would then drop
        # the one video that should have been built and report success.
        raise RoleError(f"{talk_dir.name}: --primary-slug {primary_slug} contradicts meta.yaml's {declared}")
    primary_slug = declared
    primary_en = timing_en_srt(talk_dir / primary_slug)
    primary_uk = talk_dir / primary_slug / "final" / "uk.srt"

    results: list[dict] = []
    for slug in _video_slugs(talk_dir):
        if slug == primary_slug or roles.get(slug) != "derived":
            continue

        secondary_en = timing_en_srt(talk_dir / slug)
        final_dir = talk_dir / slug / "final"
        out = final_dir / "uk.srt"

        if primary_en is None:
            reason = f"primary {primary_slug} has no en.srt — no bridge to derive from"
            print(f"SKIP {slug}: {reason}", file=sys.stderr)
            results.append({"slug": slug, "status": "skipped", "mode": None, "reason": reason})
            continue
        if secondary_en is None:
            reason = "no en.srt (raw recording, no English subtitles)"
            print(f"SKIP {slug}: {reason}", file=sys.stderr)
            results.append({"slug": slug, "status": "skipped", "mode": None, "reason": reason})
            continue

        final_dir.mkdir(parents=True, exist_ok=True)
        # A corrected final/en.srt keeps the text and cue count of the download
        # beside it, and detect_offset reads only the first cues — so a pair
        # where only one side is corrected can pass as a constant shift and
        # the correction would be lost.
        primary_fixed = _corrects_download(talk_dir / primary_slug)
        mixed = primary_fixed != _corrects_download(talk_dir / slug)
        if mixed:
            fixed, raw = (primary_slug, slug) if primary_fixed else (slug, primary_slug)
            print(
                f"::warning::{talk_dir.name}/{slug}: {fixed} times from a corrected final/en.srt, "
                f"{raw} from its download; resyncing, so {slug} follows its own "
                f"{'corrected' if fixed == slug else 'uncorrected'} EN timeline",
                file=sys.stderr,
            )
        offset = None if mixed else detect_offset(str(primary_en), str(secondary_en))
        if offset is not None:
            print(f"=== {slug}: constant offset {offset}ms → offset_srt apply", file=sys.stderr)
            apply_offset(str(primary_uk), offset, str(out))
            mode = "secondary-offset"
        else:
            print(f"=== {slug}: no constant offset → resync via en.srt word alignment", file=sys.stderr)
            resync(str(primary_uk), str(primary_en), str(secondary_en), str(out))
            mode = "secondary-resync"
        _end_at_media_end(out, talk_dir / slug)

        _write_manifest(final_dir / "build_manifest.yaml", mode, primary_slug, run_id)
        results.append({"slug": slug, "status": "built", "mode": mode, "reason": None})

    built = sum(1 for r in results if r["status"] == "built")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    print(f"Secondary build: {built} built, {skipped} skipped", file=sys.stderr)
    return results


def main() -> None:
    p = argparse.ArgumentParser(description="Build UK SRTs for secondary videos of a multi-video talk")
    p.add_argument("--talk-dir", required=True, help="Path to the talk directory (contains meta.yaml)")
    p.add_argument(
        "--primary-slug",
        default=None,
        help="Override the primary declared in meta.yaml (`sync: primary`)",
    )
    p.add_argument("--run-id", default=None, help="CI run id, recorded in build_manifest.yaml")
    args = p.parse_args()

    run_id = args.run_id
    if run_id is not None:
        with contextlib.suppress(TypeError, ValueError):
            run_id = int(run_id)

    build_secondary_srts(args.talk_dir, args.primary_slug, run_id=run_id)


if __name__ == "__main__":
    main()
