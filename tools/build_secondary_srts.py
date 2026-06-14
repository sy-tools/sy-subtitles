"""Build UK SRTs for the secondary videos of a multi-video talk.

A talk can have several videos (different recordings of the same event). One is
the *primary* (built by the LLM from the transcript); the others are *secondary*
and derive their UK SRT from the primary's by re-timing it onto their own
timeline. The bridge between the two timelines is built from matched words in
the two ``source/en.srt`` files — a constant time offset when the recordings
differ only by a head/tail shift (``offset_srt``), or a word-level warp when one
covers a subset of the other (``resync_srt``).

The derivation therefore needs ``source/en.srt`` on BOTH the primary and the
secondary, regardless of the talk's ``timing_source``. A secondary without
``en.srt`` (a raw recording with no English subtitles — e.g. a yogi-intro or a
silent havan) simply has nothing to derive from and is **skipped**, not treated
as a build failure. Likewise, if the primary has no ``en.srt`` (a true
whisper-mode talk), there is no bridge to build and every secondary is skipped.

Usage:
    python -m tools.build_secondary_srts --talk-dir PATH --primary-slug SLUG \
        [--run-id ID]
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


def build_secondary_srts(talk_dir, primary_slug: str, run_id=None) -> list[dict]:
    """Derive a UK SRT for every secondary video that can have one.

    Returns one result dict per non-primary video:
        {"slug", "status": "built"|"skipped", "mode": str|None, "reason": str|None}
    Skipping (missing en.srt) is a normal outcome, not an error.
    """
    talk_dir = Path(talk_dir)
    primary_en = talk_dir / primary_slug / "source" / "en.srt"
    primary_uk = talk_dir / primary_slug / "final" / "uk.srt"

    results: list[dict] = []
    for slug in _video_slugs(talk_dir):
        if slug == primary_slug:
            continue

        secondary_en = talk_dir / slug / "source" / "en.srt"
        final_dir = talk_dir / slug / "final"
        out = final_dir / "uk.srt"

        if not primary_en.exists():
            reason = f"primary {primary_slug} has no source/en.srt — no bridge to derive from"
            print(f"SKIP {slug}: {reason}", file=sys.stderr)
            results.append({"slug": slug, "status": "skipped", "mode": None, "reason": reason})
            continue
        if not secondary_en.exists():
            reason = "no source/en.srt (raw recording, no English subtitles)"
            print(f"SKIP {slug}: {reason}", file=sys.stderr)
            results.append({"slug": slug, "status": "skipped", "mode": None, "reason": reason})
            continue

        final_dir.mkdir(parents=True, exist_ok=True)
        offset = detect_offset(str(primary_en), str(secondary_en))
        if offset is not None:
            print(f"=== {slug}: constant offset {offset}ms → offset_srt apply", file=sys.stderr)
            apply_offset(str(primary_uk), offset, str(out))
            mode = "secondary-offset"
        else:
            print(f"=== {slug}: no constant offset → resync via en.srt word alignment", file=sys.stderr)
            resync(str(primary_uk), str(primary_en), str(secondary_en), str(out))
            mode = "secondary-resync"

        _write_manifest(final_dir / "build_manifest.yaml", mode, primary_slug, run_id)
        results.append({"slug": slug, "status": "built", "mode": mode, "reason": None})

    built = sum(1 for r in results if r["status"] == "built")
    skipped = sum(1 for r in results if r["status"] == "skipped")
    print(f"Secondary build: {built} built, {skipped} skipped", file=sys.stderr)
    return results


def main() -> None:
    p = argparse.ArgumentParser(description="Build UK SRTs for secondary videos of a multi-video talk")
    p.add_argument("--talk-dir", required=True, help="Path to the talk directory (contains meta.yaml)")
    p.add_argument("--primary-slug", required=True, help="Slug of the primary video")
    p.add_argument("--run-id", default=None, help="CI run id, recorded in build_manifest.yaml")
    args = p.parse_args()

    run_id = args.run_id
    if run_id is not None:
        with contextlib.suppress(TypeError, ValueError):
            run_id = int(run_id)

    build_secondary_srts(args.talk_dir, args.primary_slug, run_id=run_id)


if __name__ == "__main__":
    main()
