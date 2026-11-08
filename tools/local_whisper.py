"""Run the pipeline's whisper step on this machine instead of a GitHub runner.

Vimeo and YouTube refuse some videos to datacenter IPs (Vimeo answers 401,
YouTube asks to "confirm you're not a bot") while the very same request
succeeds from a residential connection. So the step runs where the IP is
accepted, and its output lands where the pipeline looks: with
``source/whisper.json`` present, the pipeline's discover step skips whisper
for that video.

Only the audio track is downloaded, into a temporary directory that is
removed afterwards. The model and the language rule are those of
``whisper.yml``.
"""

import argparse
import importlib.util
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import yaml

from tools.schemas import SchemaError, validate_whisper_json
from tools.vimeo_codec import decode_video_ref, to_player_url

REFERER = "https://www.amruta.org/"
MODEL = "medium"


class PlanError(Exception):
    pass


class DownloadError(Exception):
    pass


@dataclass(frozen=True)
class Job:
    slug: str
    url: str
    output: Path


def load_meta(talk_dir: Path) -> dict:
    meta_path = talk_dir / "meta.yaml"
    if not meta_path.is_file():
        raise PlanError(f"{meta_path}: no meta.yaml")
    return yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}


def plan(talk_dir, video_slug=None, source_url=None, force=False) -> list[Job]:
    talk_dir = Path(talk_dir)
    videos = [v for v in load_meta(talk_dir).get("videos", []) if v.get("slug")]
    if video_slug is not None:
        videos = [v for v in videos if v["slug"] == video_slug]
        if not videos:
            raise PlanError(f"{talk_dir.name}: no video '{video_slug}' in meta.yaml")
    if source_url and len(videos) != 1:
        raise PlanError("--source-url replaces one video's link: name that video with --video-slug")

    jobs = []
    for v in videos:
        output = talk_dir / v["slug"] / "source" / "whisper.json"
        if output.exists() and not force:
            continue
        url = source_url or to_player_url(decode_video_ref(v["video_ref"]))
        jobs.append(Job(v["slug"], url, output))
    return jobs


def whisper_language(meta: dict):
    """None lets whisper detect the language, for talks that mix languages."""
    if meta.get("other_languages"):
        return None
    return meta.get("language", "en")


def check_downloader() -> None:
    """Fail early unless yt-dlp can impersonate a browser.

    Without that, Vimeo answers 401 even to a home connection. Importing
    curl_cffi is not proof: a version yt-dlp does not support imports fine and
    is then silently unused, so yt-dlp itself is asked.
    """
    listing = subprocess.run(
        [sys.executable, "-m", "yt_dlp", "--list-impersonate-targets"], capture_output=True, text=True
    )
    usable = [line for line in listing.stdout.splitlines() if "curl_cffi" in line and "(unavailable)" not in line]
    if listing.returncode != 0 or not usable:
        raise DownloadError(
            f"yt-dlp for {sys.executable} cannot impersonate a browser, so Vimeo will refuse it; "
            "run: pip install -r requirements.txt"
        )


def download_audio(url: str, dest_dir) -> Path:
    # The interpreter check_downloader vetted, not whatever yt-dlp is on PATH.
    argv = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--no-progress",
        "--referer",
        REFERER,
        "-f",
        "bestaudio/best",
        "-o",
        str(Path(dest_dir) / "audio.%(ext)s"),
        url,
    ]
    if subprocess.run(argv).returncode != 0:
        raise DownloadError(f"yt-dlp could not download {url}")
    files = sorted(Path(dest_dir).glob("audio.*"))
    if not files:
        raise DownloadError(f"yt-dlp reported success but wrote no audio for {url}")
    return files[0]


def check_whisper() -> None:
    if importlib.util.find_spec("faster_whisper") is None:
        raise DownloadError(
            f"faster-whisper not installed for {sys.executable}; run: pip install 'faster-whisper>=1.2.1'"
        )


def transcribe(audio, output, model, language):
    from tools.whisper_run import run_whisper

    run_whisper(str(audio), str(output), model, language)


def run_job(job: Job, language) -> None:
    work = Path(tempfile.mkdtemp(prefix="local_whisper_"))
    try:
        audio = download_audio(job.url, work)
        candidate = work / "whisper.json"
        transcribe(audio, candidate, MODEL, language)
        validate_whisper_json(str(candidate))
        job.output.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(candidate), job.output)
    finally:
        shutil.rmtree(work, ignore_errors=True)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Run the whisper step locally and write talks/<id>/<video>/source/whisper.json"
    )
    parser.add_argument("--talk-id", required=True)
    parser.add_argument("--video-slug", help="only this video (default: every video without whisper.json)")
    parser.add_argument(
        "--source-url",
        help="download from this URL instead of the video's Vimeo link, e.g. a YouTube copy of the "
        "same recording; requires --video-slug when the talk has several videos",
    )
    parser.add_argument("--force", action="store_true", help="redo videos that already have whisper.json")
    parser.add_argument("--root", default=".", help="repository root (default: current directory)")
    args = parser.parse_args(argv)

    talk_dir = Path(args.root) / "talks" / args.talk_id
    try:
        meta = load_meta(talk_dir)
        jobs = plan(talk_dir, args.video_slug, args.source_url, args.force)
    except PlanError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    if not jobs:
        print(f"{args.talk_id}: every video already has whisper.json (use --force to redo)")
        return 0

    try:
        check_downloader()
        check_whisper()
    except DownloadError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    language = whisper_language(meta)
    for job in jobs:
        print(f"== {args.talk_id}/{job.slug}", flush=True)
        try:
            run_job(job, language)
        except (DownloadError, SchemaError) as e:
            print(f"ERROR: {job.slug}: {e}", file=sys.stderr)
            return 1
        print(f"OK: {job.output}")

    print("\nNext: commit the whisper.json file(s) through a PR, then re-run subtitle-pipeline.yml for this talk.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
