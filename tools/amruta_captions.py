"""EN captions for YouTube videos, from amruta's ``captions_zip`` repository.

A Vimeo video gets ``source/en.srt`` from Vimeo's own text tracks. A YouTube
video has no such track we can read from a runner, but amruta publishes its
curated captions as ``<youtube id>.zip`` — one WebVTT file per language — in
the public ``amrutadotorg/captions_zip`` repository. This module turns the
English one into the SRT the pipeline times against.

The repository is filled daily, so a talk can be added before its captions
exist. Missing captions are therefore an ordinary answer, not an error: the
CLI reports them and exits 0, and the pipeline falls back to whisper timing.
A network failure is treated the same way, as a warning — nothing here may
stop a pipeline run.

Nothing printed names a YouTube id or the zip URL: ``meta.yaml`` stores links
obfuscated, and a public Actions log must not undo that.
"""

from __future__ import annotations

import argparse
import io
import os
import re
import sys
import urllib.error
import urllib.request
import zipfile
from collections.abc import Callable
from pathlib import Path

import yaml

from tools.vimeo_codec import decode_video_source
from tools.workflow_validation import (
    YOUTUBE_ID_RE,
    InvalidWorkflowInput,
    die,
    validate_talk_id,
    validate_video_slug,
)

CAPTIONS_ZIP_URL = "https://raw.githubusercontent.com/amrutadotorg/captions_zip/master/{id}.zip"

# A caption track is tens of kilobytes; anything near this is not one.
_MAX_VTT_BYTES = 5 * 1024 * 1024

_TIMESTAMP = r"(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})"
_TIMING_RE = re.compile(rf"^\s*{_TIMESTAMP}\s+-->\s+{_TIMESTAMP}(?:\s.*)?$")
# A non-cue block is its keyword followed by whitespace or the end of the
# line; "NOTEBOOK" above a timing line is an ordinary cue identifier.
_NON_CUE_BLOCK_RE = re.compile(r"^(NOTE|STYLE|REGION)(\s|$)")


def _srt_time(hours: str | None, minutes: str, seconds: str, millis: str) -> str:
    return f"{int(hours or 0):02d}:{minutes}:{seconds},{millis}"


def vtt_to_srt(text: str) -> str:
    """Convert a WebVTT document to SRT.

    The header, ``NOTE``/``STYLE``/``REGION`` blocks, cue identifiers and cue
    settings are dropped; cues are numbered from 1 in order; cue text is kept
    as written. Raises ``ValueError`` if ``text`` is not WebVTT.
    """
    text = text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")
    if not text.startswith("WEBVTT"):
        raise ValueError("not a WebVTT document")

    cues: list[str] = []
    for block in re.split(r"\n{2,}", text):
        lines = [line for line in block.split("\n") if line.strip()]
        if not lines or _NON_CUE_BLOCK_RE.match(lines[0]):
            continue
        # A cue may carry an identifier line above its timing line.
        for at in (0, 1):
            match = _TIMING_RE.match(lines[at]) if at < len(lines) else None
            if match:
                break
        else:
            continue  # the WEBVTT header, or anything else that is not a cue
        body = lines[at + 1 :]
        if not body:
            continue
        groups = match.groups()
        timing = f"{_srt_time(*groups[:4])} --> {_srt_time(*groups[4:])}"
        cues.append(f"{len(cues) + 1}\n{timing}\n" + "\n".join(body) + "\n\n")
    return "".join(cues)


def _http_get(url: str) -> bytes | None:
    """GET ``url``; ``None`` for a 404, an exception for any other failure."""
    request = urllib.request.Request(url, headers={"User-Agent": "sy-subtitles"})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:  # noqa: S310 - fixed https host
            return response.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def fetch_en_srt(
    youtube_id: str,
    out_path: Path,
    *,
    fetch: Callable[[str], bytes | None] | None = None,
) -> bool:
    """Write the English captions of ``youtube_id`` to ``out_path`` as SRT.

    Returns ``False``, writing nothing, when amruta has no zip for the video
    or the zip has no (non-empty) English track. Raises on a network failure
    or a corrupt archive, and ``ValueError`` on an id that is not a YouTube id.
    """
    if not YOUTUBE_ID_RE.fullmatch(youtube_id or ""):
        raise ValueError("not a YouTube id")
    fetch = fetch or _http_get
    payload = fetch(CAPTIONS_ZIP_URL.format(id=youtube_id))
    if payload is None:
        return False
    member = f"{youtube_id}.en.vtt"
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        try:
            info = archive.getinfo(member)
        except KeyError:
            return False
        if info.file_size > _MAX_VTT_BYTES:
            raise ValueError("EN caption track is implausibly large")
        vtt = archive.read(info).decode("utf-8")
    srt = vtt_to_srt(vtt)
    if not srt:
        return False
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(srt, encoding="utf-8", newline="\n")
    return True


def _youtube_id(video: dict) -> str | None:
    """The YouTube id of a ``meta.yaml`` video entry, or ``None`` if it has none."""
    try:
        source = decode_video_source(video.get("video_ref") or "")
    except ValueError:
        return None
    return source.id if source.provider == "yt" else None


def fill_talk(talk_dir: Path) -> None:
    """Fetch ``source/en.srt`` for every YouTube video of a talk lacking one.

    Prints one line per video. Never raises for a missing track or a failed
    fetch — the caller is a pipeline that has to go on without captions.
    """
    meta_path = talk_dir / "meta.yaml"
    if not meta_path.is_file():
        print(f"::warning::{talk_dir.name}: no meta.yaml — EN captions not fetched")
        return
    meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}
    on_runner = os.environ.get("GITHUB_ACTIONS") == "true"
    for video in meta.get("videos") or []:
        slug = video.get("slug", "")
        try:
            validate_video_slug(slug)
        except InvalidWorkflowInput:
            # The slug becomes a path below; one that fails the repo's own
            # rule is not written to.
            print(f"::warning::{talk_dir.name}: invalid video slug in meta.yaml — skip")
            continue
        youtube_id = _youtube_id(video)
        en_srt = talk_dir / slug / "source" / "en.srt"
        if youtube_id is None:
            print(f"{slug}: not a YouTube video — skip")
        elif en_srt.exists():
            print(f"{slug}: en.srt exists — skip")
        else:
            if on_runner:
                # Before anything that could echo it: the runner then redacts
                # the id from every later log line of the job.
                print(f"::add-mask::{youtube_id}", flush=True)
            try:
                fetched = fetch_en_srt(youtube_id, en_srt)
            except Exception as e:  # noqa: BLE001 - captions are optional; whisper timing remains
                # The type only: a network error's message can carry the URL.
                print(f"::warning::{slug}: EN captions fetch failed ({type(e).__name__}) — continuing without")
                continue
            print(f"{slug}: fetched en.srt" if fetched else f"{slug}: no EN captions published yet")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--talk-id", required=True, help="talk folder name under the talks root")
    parser.add_argument("--talks-root", default="talks", help="directory holding the talk folders")
    args = parser.parse_args(argv)
    try:
        validate_talk_id(args.talk_id)
    except InvalidWorkflowInput as e:
        die(str(e))
    fill_talk(Path(args.talks_root) / args.talk_id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
