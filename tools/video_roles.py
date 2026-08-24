"""How each of a talk's videos participates in subtitle sync.

The model used to be guessed afresh in three places that disagreed: the
pipeline picked whichever video had the most words in whisper.json,
build_secondary_srts took a --primary-slug argument from outside, and
build_manifest.yaml recorded a role after the fact. sync_pr knew nothing
about any of it and treated every SRT as an equal source of truth.

Roles are declared per video in meta.yaml under `sync:` and read here.
This module is the ONLY interpreter of that key.

    primary      Authoritative subtitle text. Exactly one per talk.
    derived      Mirrors the primary's text positionally; its own timing.
    independent  Its own slice of the transcript; synced with the
                 transcript directly, never against the primary.
    ignored      Never read, never written.

A multi-video talk MUST declare. There is deliberately no default: a
default in a resolver is seen by nobody and fires in CI, which is the
silent guessing this module exists to remove. The single exception is a
talk that has never had more than one subtitled video and declares
nothing — there is nothing there to disambiguate.

    python -m tools.video_roles --talk-dir talks/1992-07-19_Guru-Puja --role primary
"""

import argparse
import sys
from pathlib import Path

import yaml

ROLES = ("primary", "derived", "independent", "ignored")


class RoleError(Exception):
    """A talk's sync model is missing, ambiguous, or invalid."""


def _load_videos(talk_dir: Path) -> list[dict]:
    meta_path = talk_dir / "meta.yaml"
    if not meta_path.is_file():
        raise RoleError(f"{talk_dir.name}: no meta.yaml")
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}
    return [v for v in meta.get("videos", []) if v.get("slug")]


def _has_subtitles(talk_dir: Path, slug: str) -> bool:
    return (talk_dir / slug / "final" / "uk.srt").is_file()


def resolve_roles(talk_dir: str | Path) -> dict[str, str]:
    """Return {slug: role} for every video in the talk."""
    talk_dir = Path(talk_dir)
    videos = _load_videos(talk_dir)
    if not videos:
        # Letters and other text-only talks. Nothing to disambiguate, so
        # nothing to declare; callers needing a primary fail below.
        return {}

    for v in videos:
        role = v.get("sync")
        if role is not None and role not in ROLES:
            raise RoleError(
                f"{talk_dir.name}/{v['slug']}: unknown sync role {role!r} (expected one of {', '.join(ROLES)})"
            )

    subtitled = [v["slug"] for v in videos if _has_subtitles(talk_dir, v["slug"])]

    # A talk that declares nothing and has at most one subtitled video has
    # nothing to disambiguate. A declaration always outranks this: a
    # derived video whose SRT has not been built yet is still derived.
    if not any(v.get("sync") for v in videos) and len(subtitled) <= 1:
        return {v["slug"]: ("primary" if v["slug"] in subtitled else "ignored") for v in videos}

    undeclared = [v["slug"] for v in videos if v["slug"] in subtitled and not v.get("sync")]
    if undeclared:
        raise RoleError(
            f"{talk_dir.name}: {len(subtitled)} videos carry subtitles but "
            f"{', '.join(undeclared)} have no `sync:` in meta.yaml. "
            f"Declare one of {', '.join(ROLES)} for each."
        )

    roles = {v["slug"]: v.get("sync", "ignored") for v in videos}

    primaries = [s for s, r in roles.items() if r == "primary"]
    if len(primaries) != 1:
        raise RoleError(
            f"{talk_dir.name}: expected exactly one video with `sync: primary`, "
            f"found {len(primaries)}" + (f" ({', '.join(primaries)})" if primaries else "")
        )
    return roles


def primary_slug(talk_dir: str | Path) -> str:
    roles = resolve_roles(talk_dir)
    primary = next((s for s, r in roles.items() if r == "primary"), None)
    if primary is None:
        raise RoleError(f"{Path(talk_dir).name}: no video is `sync: primary`")
    return primary


def derived_slugs(talk_dir: str | Path) -> list[str]:
    return [s for s, r in resolve_roles(talk_dir).items() if r == "derived"]


def main() -> None:
    p = argparse.ArgumentParser(description="Resolve a talk's subtitle sync roles")
    p.add_argument("--talk-dir", required=True)
    p.add_argument("--role", choices=ROLES, help="Print only slugs with this role")
    args = p.parse_args()
    try:
        roles = resolve_roles(args.talk_dir)
    except RoleError as exc:
        print(f"::error::{exc}", file=sys.stderr)
        sys.exit(1)
    for slug, role in roles.items():
        if args.role is None:
            print(f"{slug}\t{role}")
        elif role == args.role:
            print(slug)


if __name__ == "__main__":
    main()
