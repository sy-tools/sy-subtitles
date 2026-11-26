"""Run the pipeline's whisper step on this machine instead of a GitHub runner.

Vimeo and YouTube refuse some videos to datacenter IPs (Vimeo answers 401,
YouTube asks to "confirm you're not a bot") while the very same request
succeeds from a residential connection. So the step runs where the IP is
accepted — trying what ``tools.video_media`` offers off CI, which for a
YouTube video is its Bunny and Drive mirrors and then YouTube itself — and its output
lands where the pipeline looks: with
``source/whisper.json`` present, the pipeline's discover step skips whisper
for that video.

Only the audio track is downloaded, into a temporary directory that is
removed afterwards. The model and the language rule are those of
``whisper.yml``.
"""

import argparse
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import yaml

from tools.schemas import SchemaError, validate_whisper_json
from tools.video_media import download_candidates, transport_args

MODEL = "medium"


class PlanError(Exception):
    pass


class DownloadError(Exception):
    pass


@dataclass(frozen=True)
class Job:
    slug: str
    urls: list[str]
    output: Path


def load_meta(talk_dir: Path) -> dict:
    meta_path = talk_dir / "meta.yaml"
    if not meta_path.is_file():
        raise PlanError(f"{meta_path}: no meta.yaml")
    return yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}


def _records_duration(whisper_path: Path) -> bool:
    return bool(json.loads(whisper_path.read_text(encoding="utf-8")).get("duration"))


def _needs_work(output: Path, force: bool, duration_only: bool) -> bool:
    if duration_only:
        return output.exists() and (force or not _records_duration(output))
    return force or not output.exists()


def plan(talk_dir, video_slug=None, source_url=None, force=False, duration_only=False) -> list[Job]:
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
        if not _needs_work(output, force, duration_only):
            continue
        urls = [source_url] if source_url else download_candidates(v, ci=False)
        if not urls:
            continue
        jobs.append(Job(v["slug"], urls, output))
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
        *provider_flags(url),
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


def provider_flags(url: str) -> list[str]:
    """A --source-url may point anywhere; only a known provider gets its flags."""
    try:
        return transport_args(url)
    except ValueError:
        return []


def check_whisper() -> None:
    if importlib.util.find_spec("faster_whisper") is None:
        raise DownloadError(
            f"faster-whisper not installed for {sys.executable}; run: pip install 'faster-whisper>=1.2.1'"
        )


def transcribe(audio, output, model, language):
    from tools.whisper_run import run_whisper

    run_whisper(str(audio), str(output), model, language)


def download_first(urls: list[str], dest_dir) -> Path:
    # One directory per attempt: a failed try's leftovers (audio.*.part) would
    # otherwise be what the next one's glob for audio.* picks up.
    failures = []
    for attempt, url in enumerate(urls):
        attempt_dir = Path(dest_dir) / f"try{attempt}"
        attempt_dir.mkdir()
        try:
            return download_audio(url, attempt_dir)
        except DownloadError as e:
            print(f"WARNING: {e}", file=sys.stderr)
            failures.append(str(e))
    raise DownloadError("no source could be downloaded: " + "; ".join(failures))


def probe_duration(audio) -> float:
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio)],
        capture_output=True,
        text=True,
    )
    try:
        return float(probe.stdout.strip())
    except ValueError:
        raise DownloadError(f"ffprobe could not read the duration of {audio}") from None


def record_duration(job: Job) -> None:
    """Add the media's length to a whisper.json written before whisper_run recorded it.

    The derived build cuts a clip's subtitles at this value, and the build job
    has no media to measure it from. Everything else in the file is kept.
    """
    work = Path(tempfile.mkdtemp(prefix="local_whisper_"))
    try:
        duration = probe_duration(download_first(job.urls, work))
    finally:
        shutil.rmtree(work, ignore_errors=True)
    data = json.loads(job.output.read_text(encoding="utf-8"))
    data.pop("duration", None)
    head = {k: data.pop(k) for k in ("language",) if k in data}
    data = {**head, "duration": round(duration, 3), **data}
    job.output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    validate_whisper_json(str(job.output))


def run_job(job: Job, language) -> None:
    work = Path(tempfile.mkdtemp(prefix="local_whisper_"))
    try:
        audio = download_first(job.urls, work)
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
        help="download from this URL instead of the video's own link and mirrors, e.g. another copy "
        "of the same recording; requires --video-slug when the talk has several videos",
    )
    parser.add_argument("--force", action="store_true", help="redo videos that already have whisper.json")
    parser.add_argument(
        "--duration-only",
        action="store_true",
        help="no transcription: add the measured media length to whisper.json files that lack `duration` "
        "(with --force, re-measure every one)",
    )
    parser.add_argument("--root", default=".", help="repository root (default: current directory)")
    args = parser.parse_args(argv)

    talk_dir = Path(args.root) / "talks" / args.talk_id
    try:
        meta = load_meta(talk_dir)
        jobs = plan(talk_dir, args.video_slug, args.source_url, args.force, args.duration_only)
    except PlanError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    if not jobs:
        done = "a whisper.json with a duration" if args.duration_only else "whisper.json"
        print(f"{args.talk_id}: every video already has {done} (use --force to redo)")
        return 0

    try:
        check_downloader()
        if not args.duration_only:
            check_whisper()
    except DownloadError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1

    language = whisper_language(meta)
    for job in jobs:
        print(f"== {args.talk_id}/{job.slug}", flush=True)
        try:
            if args.duration_only:
                record_duration(job)
            else:
                run_job(job, language)
        except (DownloadError, SchemaError) as e:
            print(f"ERROR: {job.slug}: {e}", file=sys.stderr)
            return 1
        print(f"OK: {job.output}")

    print("\nNext: commit the whisper.json file(s) through a PR, then re-run subtitle-pipeline.yml for this talk.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
