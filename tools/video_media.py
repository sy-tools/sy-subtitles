"""Download a talk's video: the one resolver every media download goes through.

A video's link decides where its file can come from:

- Vimeo: the player form of its link (Vimeo answers 401 on the internal API
  yt-dlp uses for the canonical ``vimeo.com/<id>/<hash>`` form).
- YouTube: its Drive mirrors (``media_refs``), in order — the Drive file is the
  very file the YouTube video was made from. YouTube itself comes last, and
  only off CI: it asks GitHub's runners to "confirm you're not a bot" on every
  client, while Drive serves them the full file.

The plaintext link never reaches a log: in GitHub Actions each candidate is
masked before it is tried, and the error messages name only the provider.

CLI: ``download`` fetches the file; ``check`` resolves the same candidates
without downloading, so a workflow can fail before it invests in a run.
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path

from tools.schemas import SchemaError, validate_meta_yaml
from tools.vimeo_codec import VideoSource, decode_video_source, to_player_url
from tools.workflow_validation import InvalidWorkflowInput, validate_talk_id, validate_video_slug

REFERER = "https://www.amruta.org/"

_PROVIDER_HOSTS = (
    ("vimeo", "vimeo.com/"),
    ("gd", "drive.google.com/"),
    ("yt", "youtube.com/"),
)

# Measured 2026-07-31 across two talks and two networks: some newer Vimeo
# uploads answer 401 from GitHub's Azure IPs while the SAME url+hash downloads
# fine from a home connection, with identical yt-dlp and impersonation. So a
# failure here is usually Vimeo refusing a data-centre IP, not a bad ref.
_VIMEO_FAILED = (
    "Vimeo refused the download (usually a 401). The url and hash are probably fine: "
    "Vimeo blocks some newer videos from data-centre IPs like GitHub's runners."
)
_YT_NO_MIRROR = "this YouTube video has no Drive mirror (media_refs), and YouTube refuses GitHub's runners."
_YT_FAILED = "no Drive mirror of this YouTube video could be downloaded."
_YT_HOME_FAILED = "neither the Drive mirrors nor YouTube itself could be downloaded."

# What to do once every source has failed depends on what the video was for:
# the whisper step can run on a home connection, a render has no such path.
PURPOSES = ("whisper", "burn")
_BURN_HINTS = {
    _VIMEO_FAILED: "Rendering this video needs a machine on a normal connection.",
    _YT_NO_MIRROR: "Add the Drive copy of this video to media_refs in meta.yaml.",
}


def _sources(video: dict, *, ci: bool) -> list[VideoSource]:
    ref = video.get("video_ref")
    if not ref:
        return []
    source = decode_video_source(ref)
    if source.provider == "vimeo":
        return [source]
    mirrors = [decode_video_source(m) for m in video.get("media_refs") or []]
    return mirrors if ci else [*mirrors, source]


def _url(source: VideoSource) -> str:
    return to_player_url(source.watch_url) if source.provider == "vimeo" else source.watch_url


def _mask_values(source: VideoSource) -> list[str]:
    """Every form of the source yt-dlp may log. Actions masks only exact
    registered strings, and yt-dlp names a video by its bare id
    ("[GoogleDrive] <id>: Downloading ..."), not by the URL it was given."""
    values = [_url(source), source.watch_url, source.id, *source.id.split("/")]
    return list(dict.fromkeys(v for v in values if v))


def download_candidates(video: dict, *, ci: bool) -> list[str]:
    """The URLs to try for ``video``, in order. ``[]`` when there is none."""
    return [_url(source) for source in _sources(video, ci=ci)]


def provider_of_url(url: str) -> str:
    for provider, host in _PROVIDER_HOSTS:
        if host in url:
            return provider
    raise ValueError("not a provider this resolver knows")


def referer_args(url: str) -> list[str]:
    """Vimeo checks the embedding page; the other providers get no referer."""
    return ["--referer", REFERER] if provider_of_url(url) == "vimeo" else []


def _fail(video: dict, reason: str, purpose: str, talk_id: str | None, video_slug: str | None) -> None:
    print(f"::error::Video download failed: {reason}")
    if purpose == "whisper":
        slug = video_slug or video.get("slug") or "<video-slug>"
        print(
            "::error::Run the whisper step on a home connection and commit the result through a PR: "
            f"python -m tools.local_whisper --talk-id {talk_id or '<talk-id>'} --video-slug {slug}"
        )
    elif reason in _BURN_HINTS:
        print(f"::error::{_BURN_HINTS[reason]}")
    raise SystemExit(1)


def _check_purpose(purpose: str) -> None:
    if purpose not in PURPOSES:
        raise ValueError(f"purpose must be one of {PURPOSES}, got {purpose!r}")


def _failure_reason(video: dict, ci: bool, tried: int) -> str:
    ref = video.get("video_ref")
    if not ref:
        return "this video has no link (video_ref)."
    if decode_video_source(ref).provider == "vimeo":
        return _VIMEO_FAILED
    if not tried:
        return _YT_NO_MIRROR
    return _YT_FAILED if ci else _YT_HOME_FAILED


def download(
    video: dict,
    out: Path,
    *,
    ci: bool,
    run=subprocess.run,
    purpose: str = "whisper",
    talk_id: str | None = None,
    video_slug: str | None = None,
) -> str:
    """Download ``video`` to ``out``; return the provider that served it.

    Raises ``SystemExit(1)`` with an ``::error::`` when no candidate succeeds;
    ``purpose`` (whisper | burn) picks the advice that follows it.
    """
    _check_purpose(purpose)
    out = Path(out)
    candidates = _sources(video, ci=ci)
    masking = bool(os.environ.get("GITHUB_ACTIONS"))
    for source in candidates:
        if masking:
            for value in _mask_values(source):
                print(f"::add-mask::{value}", flush=True)
        url = _url(source)
        provider = source.provider
        print(f"Trying {provider}…", flush=True)
        # A failed try can leave a whole-looking file or a .part behind; the
        # next mirror must start from nothing, not "resume" or skip as done.
        out.unlink(missing_ok=True)
        argv = [
            sys.executable,
            "-m",
            "yt_dlp",
            "--no-continue",
            *referer_args(url),
            "--merge-output-format",
            "mp4",
            "-o",
            str(out),
            url,
        ]
        result = run(argv)
        if result.returncode == 0 and out.is_file() and out.stat().st_size > 0:
            print(f"Downloaded from {provider}.")
            return provider
    _fail(video, _failure_reason(video, ci, len(candidates)), purpose, talk_id, video_slug)
    raise AssertionError("unreachable")


def load_video(root: Path, talk_id: str, video_slug: str) -> dict:
    """The meta.yaml entry for ``video_slug``, after schema-validating the file."""
    try:
        validate_talk_id(talk_id)
        validate_video_slug(video_slug)
    except InvalidWorkflowInput as e:
        print(f"::error::{e}")
        raise SystemExit(1) from None
    meta_path = Path(root) / "talks" / talk_id / "meta.yaml"
    try:
        meta = validate_meta_yaml(str(meta_path))
    except SchemaError as e:
        print(f"::error::{e}")
        raise SystemExit(1) from None
    for video in meta.get("videos") or []:
        if video.get("slug") == video_slug:
            return video
    print(f"::error::{talk_id}: no video {video_slug!r} in meta.yaml")
    raise SystemExit(1)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Download a talk's video from wherever it can be fetched.")
    sub = parser.add_subparsers(dest="command", required=True)
    for name, help_text in (
        ("download", "download the video file"),
        ("check", "fail unless the video has something to download from; downloads nothing"),
    ):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("--talk-id", required=True)
        p.add_argument("--video-slug", required=True)
        p.add_argument("--root", default=".", help="directory holding talks/ (default: current directory)")
        p.add_argument("--ci", action="store_true", help="on a GitHub runner: never try YouTube itself")
        p.add_argument(
            "--purpose", choices=PURPOSES, default="whisper", help="what the video is for; picks the failure advice"
        )
        if name == "download":
            p.add_argument("--out", required=True, help="where the .mp4 goes")
    args = parser.parse_args(argv)

    video = load_video(Path(args.root), args.talk_id, args.video_slug)
    if args.command == "check":
        if not download_candidates(video, ci=args.ci):
            _fail(video, _failure_reason(video, args.ci, 0), args.purpose, args.talk_id, args.video_slug)
        return
    download(
        video,
        Path(args.out),
        ci=args.ci,
        run=subprocess.run,
        purpose=args.purpose,
        talk_id=args.talk_id,
        video_slug=args.video_slug,
    )


if __name__ == "__main__":
    main()
