"""Artifact-boundary schema validators.

Every non-trivial file that crosses a pipeline phase boundary has a strict
contract enforced here. Call the validators directly from pipeline steps
(`python -m tools.validate_artifacts ...`) so contract violations fail loud
in the fastest-failing phase instead of mutating into silent bad SRTs.

Schemas covered:
  * whisper.json — speech-detection output shared with build_map/align_uk
  * meta.yaml    — talk manifest, consumed by every workflow

timecodes.txt is validated inline inside tools.validate_artifacts — the
format is simple enough (`#N | start | end` per line) that a regex suffices.
"""

from __future__ import annotations

import json
from typing import Any

import yaml

from .vimeo_codec import decode_video_source
from .workflow_validation import (
    InvalidWorkflowInput,
    validate_talk_id,
    validate_video_ref,
    validate_video_slug,
)


class SchemaError(ValueError):
    def __init__(self, source: str, path: str, message: str) -> None:
        super().__init__(f"{source} {path}: {message}")
        self.source = source
        self.path = path
        self.message = message


def _require(obj: Any, key: str, expected_type: type, source: str, path: str) -> Any:
    if not isinstance(obj, dict):
        raise SchemaError(source, path, f"expected object, got {type(obj).__name__}")
    if key not in obj:
        raise SchemaError(source, path, f"missing required field '{key}'")
    value = obj[key]
    if not isinstance(value, expected_type):
        expected = (
            "/".join(t.__name__ for t in expected_type) if isinstance(expected_type, tuple) else expected_type.__name__
        )
        raise SchemaError(
            source,
            f"{path}.{key}",
            f"expected {expected}, got {type(value).__name__}",
        )
    return value


# ---------------------------------------------------------------------------
# whisper.json
# ---------------------------------------------------------------------------


def validate_whisper_json(path: str) -> dict:
    """Validate a whisper.json file and return its parsed contents."""
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise SchemaError("whisper.json", path, f"cannot read/parse: {e}") from None

    # `language` is informational — older whisper outputs omitted it and the
    # downstream tools tolerate absence, so we only type-check when present.
    if "language" in data and not isinstance(data["language"], str):
        raise SchemaError("whisper.json", path, "language must be a string when present")
    # `duration` (seconds of decoded audio) is missing from files written
    # before it was recorded; consumers then leave the subtitle tail unbounded.
    if "duration" in data:
        duration = data["duration"]
        if isinstance(duration, bool) or not isinstance(duration, (int, float)) or duration <= 0:
            raise SchemaError(
                "whisper.json", path, f"duration must be a positive number when present, got {duration!r}"
            )
    segments = _require(data, "segments", list, "whisper.json", "")

    if not segments:
        raise SchemaError("whisper.json", path, "segments[] is empty")

    prev_end = -1.0
    for i, seg in enumerate(segments):
        seg_path = f"segments[{i}]"
        if not isinstance(seg, dict):
            raise SchemaError("whisper.json", path, f"{seg_path} is not an object")
        start = _require(seg, "start", (int, float), "whisper.json", seg_path)
        end = _require(seg, "end", (int, float), "whisper.json", seg_path)
        _require(seg, "text", str, "whisper.json", seg_path)
        if start < 0:
            raise SchemaError("whisper.json", path, f"{seg_path}.start={start} negative")
        if end < start:
            raise SchemaError("whisper.json", path, f"{seg_path}: end {end} < start {start}")
        # Whisper legitimately produces overlapping segments (multi-speaker,
        # silence trimming, VAD re-ordering). Only flag *catastrophic* rewinds
        # that indicate a corrupt file.
        if start < prev_end - 20.0:
            raise SchemaError(
                "whisper.json",
                path,
                f"{seg_path}.start={start} < previous end={prev_end} (backward jump > 20s)",
            )
        prev_end = max(prev_end, end)

        words = seg.get("words", [])
        if not isinstance(words, list):
            raise SchemaError("whisper.json", path, f"{seg_path}.words must be a list")
        for j, w in enumerate(words):
            w_path = f"{seg_path}.words[{j}]"
            if not isinstance(w, dict):
                raise SchemaError("whisper.json", path, f"{w_path} is not an object")
            if "word" not in w or not isinstance(w["word"], str):
                raise SchemaError("whisper.json", path, f"{w_path}.word missing")
            if "start" in w and "end" in w and w["end"] < w["start"]:
                raise SchemaError("whisper.json", path, f"{w_path}: end < start")

    return data


# ---------------------------------------------------------------------------
# meta.yaml
# ---------------------------------------------------------------------------

ALLOWED_LANGUAGES = frozenset({"en", "hi", "mr", "fr", "it", "es", "de", "pt", "ru"})
DATE_RE_LEN = 10  # YYYY-MM-DD


def validate_meta_yaml(path: str) -> dict:
    """Validate a talk meta.yaml and return its parsed contents."""
    try:
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except (OSError, yaml.YAMLError) as e:
        raise SchemaError("meta.yaml", path, f"cannot read/parse: {e}") from None

    if not isinstance(data, dict):
        raise SchemaError("meta.yaml", path, f"root must be a mapping, got {type(data).__name__}")

    title = _require(data, "title", str, "meta.yaml", "")
    if not title.strip():
        raise SchemaError("meta.yaml", path, "title is empty")

    date = _require(data, "date", str, "meta.yaml", "")
    if len(date) != DATE_RE_LEN or date[4] != "-" or date[7] != "-":
        raise SchemaError("meta.yaml", path, f"date {date!r} must be YYYY-MM-DD")

    language = _require(data, "language", str, "meta.yaml", "")
    if language not in ALLOWED_LANGUAGES:
        raise SchemaError(
            "meta.yaml",
            path,
            f"language {language!r} not in allowed set {sorted(ALLOWED_LANGUAGES)}",
        )

    # Talk-level editorial remarks to keep out of the subtitles (see
    # glossary/subtitle_omit.yaml). Optional, but a malformed spec must fail
    # loudly — silently ignoring it ships the very remarks it was meant to strip.
    if "subtitle_omit" in data:
        omit = data["subtitle_omit"]
        if not isinstance(omit, list):
            raise SchemaError("meta.yaml", path, f"subtitle_omit must be a list, got {type(omit).__name__}")
        for i, phrase in enumerate(omit):
            if not isinstance(phrase, str) or not phrase.strip():
                raise SchemaError("meta.yaml", path, f"subtitle_omit[{i}] must be a non-empty string")

    # A talk may legitimately have no video — e.g. a letter or other text-only
    # translation. videos may be absent or empty; validate whatever is present.
    videos = data.get("videos", [])
    if not isinstance(videos, list):
        raise SchemaError("meta.yaml", path, f"videos must be a list, got {type(videos).__name__}")

    seen_slugs: set[str] = set()
    for i, video in enumerate(videos):
        v_path = f"videos[{i}]"
        if not isinstance(video, dict):
            raise SchemaError("meta.yaml", path, f"{v_path} is not an object")
        slug = _require(video, "slug", str, "meta.yaml", v_path)
        try:
            validate_video_slug(slug)
        except InvalidWorkflowInput as e:
            raise SchemaError("meta.yaml", path, f"{v_path}.slug: {e}") from None
        if slug in seen_slugs:
            raise SchemaError("meta.yaml", path, f"{v_path}.slug {slug!r} duplicated")
        seen_slugs.add(slug)

        _require(video, "title", str, "meta.yaml", v_path)
        # Links are stored obfuscated as `video_ref` (see tools/vimeo_codec.py).
        # A leftover plaintext `vimeo_url` (stale bookmarklet / hand edit) must
        # fail loudly here — the no-fallback reader would otherwise silently
        # drop it, leaving the link both unplayable and exposed in plaintext.
        if "vimeo_url" in video:
            raise SchemaError(
                "meta.yaml",
                path,
                f"{v_path}.vimeo_url is plaintext — store it obfuscated as video_ref (python -m tools.mask_video_refs)",
            )
        # validate_video_ref decodes the ref and checks it per provider: a
        # Vimeo URL against the vimeo_url allowlist, a YouTube id against its
        # pattern. What a viewer watches is Vimeo or YouTube, never a Drive
        # file. A video may legitimately have no link (text-only talk).
        video_ref = video.get("video_ref", "")
        if video_ref:
            try:
                validate_video_ref(video_ref, allowed=("vimeo", "yt"))
            except InvalidWorkflowInput as e:
                raise SchemaError("meta.yaml", path, f"{v_path}.video_ref: {e}") from None

        # Downloadable copies of a YouTube video (Drive files), in mirror
        # order. Only a YouTube video has them: a Vimeo one downloads from
        # Vimeo itself, and a video with no link has nothing to mirror.
        if "media_refs" in video:
            media_refs = video["media_refs"]
            if not isinstance(media_refs, list):
                raise SchemaError(
                    "meta.yaml", path, f"{v_path}.media_refs must be a list, got {type(media_refs).__name__}"
                )
            if not video_ref or decode_video_source(video_ref).provider != "yt":
                raise SchemaError("meta.yaml", path, f"{v_path}.media_refs is only allowed on a YouTube video")
            if not media_refs:
                raise SchemaError(
                    "meta.yaml", path, f"{v_path}.media_refs must not be empty — omit the key when there is no mirror"
                )
            seen_media_ids: set[str] = set()
            for j, media_ref in enumerate(media_refs):
                if not isinstance(media_ref, str):
                    raise SchemaError("meta.yaml", path, f"{v_path}.media_refs[{j}] must be a string")
                try:
                    validate_video_ref(media_ref, allowed=("gd",))
                except InvalidWorkflowInput as e:
                    raise SchemaError("meta.yaml", path, f"{v_path}.media_refs[{j}]: {e}") from None
                # Compared by decoded id, so the same file cannot hide behind a
                # differently written ref.
                media_id = decode_video_source(media_ref).id
                if media_id in seen_media_ids:
                    raise SchemaError("meta.yaml", path, f"{v_path}.media_refs[{j}] is a duplicate of an earlier entry")
                seen_media_ids.add(media_id)

    # The talk_id (directory name) isn't in the file but if the caller passes
    # a repo-relative path we can sanity-check it too.
    if "/talks/" in path or path.startswith("talks/"):
        parts = path.replace("\\", "/").split("/")
        try:
            talk_id = parts[parts.index("talks") + 1]
            validate_talk_id(talk_id)
        except (ValueError, IndexError, InvalidWorkflowInput):
            pass  # non-fatal — not every caller uses the canonical layout

    return data
