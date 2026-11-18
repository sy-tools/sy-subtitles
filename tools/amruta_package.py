"""Build a talk's delivery package for Amruta and the e-mail that goes with it.

The package is `talks/{talk_id}/_for_Amruta/`: the Ukrainian transcript and
the Ukrainian SRT of every subtitled video, plus any other-language file the
project edited. Amruta renders transcripts as HTML, where a blank line
between paragraphs reads better, so every transcript is double-spaced.

"Edited" is measured from the commit that first built the talk's subtitles,
not from a file's first commit: early commits predate parser fixes,
re-downloads and the corpus-wide hygiene rewrite, so comparing against them
would ship files nobody touched.

    python -m tools.amruta_package build --talk ID [--comment-out FILE] [--repo-slug OWNER/NAME]
    python -m tools.amruta_package mark-delivered --talk ID --date YYYY-MM-DD --commit SHA
"""

import argparse
import os
import shutil
import subprocess
import sys
from collections.abc import Mapping
from pathlib import Path
from urllib.parse import quote, urlencode

import yaml

from tools.text_normalize import fix_text
from tools.video_roles import declared_ignored_slugs, text_only

ROOT = Path(__file__).resolve().parents[1]
PACKAGE_DIR = "_for_Amruta"
GMAIL_COMPOSE = "https://mail.google.com/mail/"
SUBJECT = "Transcript and subtitles for the {title}"
BODY = "Jai Shri Mataji!\n\nPlease upload transcript and subtitles for the {title}\n{url}"


class PackageError(Exception):
    pass


def double_space(text: str) -> str:
    text = text.lstrip("\ufeff").replace("\r\n", "\n")
    lines = text.split("\n")
    if "" in lines:
        cut = lines.index("")
        header, body = lines[:cut], lines[cut + 1 :]
    else:
        header, body = [], lines
    paragraphs = [line for line in body if line.strip()]
    parts = ["\n".join(header)] if header else []
    parts += paragraphs
    return "\n\n".join(parts) + "\n"


def _git(repo: Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True)


def build_baseline(repo: Path, talk_id: str) -> str:
    # A text-only talk is never built: its translation landing is
    # what "the first build" means for it.
    if text_only(Path(repo) / "talks" / talk_id):
        target, missing = (
            f"talks/{talk_id}/transcript_uk.txt",
            "a transcript_uk.txt — the text-only talk was never translated",
        )
    else:
        target, missing = f"talks/{talk_id}/*/final/uk.srt", "a final/uk.srt — the talk was never built"
    out = _git(repo, "log", "--diff-filter=A", "--reverse", "--format=%H", "--", target)
    shas = out.stdout.split()
    if out.returncode != 0 or not shas:
        raise PackageError(f"{talk_id}: no commit ever added {missing}")
    return shas[0]


def _fold(text: str) -> str:
    return " ".join(fix_text(text, uk=False).split())


def edited_since(repo: Path, rel_path: str, baseline: str) -> bool:
    before = _git(repo, "show", f"{baseline}:{rel_path}")
    if before.returncode != 0:
        return True
    now = (repo / rel_path).read_text(encoding="utf-8-sig")
    return _fold(before.stdout) != _fold(now)


def _videos(talk_dir: Path) -> list[str]:
    meta = yaml.safe_load((talk_dir / "meta.yaml").read_text(encoding="utf-8")) or {}
    ignored = declared_ignored_slugs(talk_dir)
    return [v["slug"] for v in meta.get("videos") or [] if v["slug"] not in ignored]


def package_files(repo: Path, talk_id: str) -> dict[str, str]:
    repo = Path(repo)
    talk_dir = repo / "talks" / talk_id
    baseline = build_baseline(repo, talk_id)
    files: dict[str, str] = {}

    for transcript in sorted(talk_dir.glob("transcript_*.txt")):
        lang = transcript.stem.removeprefix("transcript_")
        if lang == "uk" or edited_since(repo, transcript.relative_to(repo).as_posix(), baseline):
            files[transcript.name] = double_space(transcript.read_text(encoding="utf-8-sig"))

    for slug in _videos(talk_dir):
        uk = talk_dir / slug / "final" / "uk.srt"
        if uk.exists():
            files[f"{slug}_uk.srt"] = uk.read_text(encoding="utf-8-sig")
        langs = {p.stem for d in ("final", "source") for p in (talk_dir / slug / d).glob("*.srt")} - {"uk"}
        for lang in sorted(langs):
            srt = talk_dir / slug / "final" / f"{lang}.srt"
            if not srt.exists():
                srt = talk_dir / slug / "source" / f"{lang}.srt"
            if edited_since(repo, srt.relative_to(repo).as_posix(), baseline):
                files[f"{slug}_{lang}.srt"] = srt.read_text(encoding="utf-8-sig")
    return files


def write_package(talk_dir: Path, files: dict[str, str]) -> None:
    out = Path(talk_dir) / PACKAGE_DIR
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir(parents=True)
    for name, content in files.items():
        (out / name).write_text(content, encoding="utf-8", newline="\n")


def email(meta: dict) -> tuple[str, str]:
    title = meta["title"]
    return SUBJECT.format(title=title), BODY.format(title=title, url=meta["amruta_url"])


def email_addresses(env: Mapping[str, str] = os.environ) -> tuple[str, str]:
    to, cc = env.get("AMRUTA_EMAIL_TO", ""), env.get("AMRUTA_EMAIL_CC", "")
    if not to or not cc:
        raise PackageError("AMRUTA_EMAIL_TO and AMRUTA_EMAIL_CC must both be set (repo variables)")
    return to, cc


def gmail_url(subject: str, body: str, to: str, cc: str) -> str:
    query = urlencode({"view": "cm", "fs": "1", "to": to, "cc": cc, "su": subject, "body": body}, quote_via=quote)
    return f"{GMAIL_COMPOSE}?{query}"


def issue_comment(repo_slug: str, talk_id: str, filenames: list[str], url: str, ref: str = "main") -> str:
    links = "\n".join(
        f"- [{name}](https://github.com/{repo_slug}/raw/{ref}/talks/{talk_id}/{PACKAGE_DIR}/{name})"
        for name in filenames
    )
    return (
        "### Ready for Amruta\n\n"
        f"**[Open the e-mail in Gmail]({url})**\n\n"
        f"Files:\n{links}\n\n"
        "Attach the files, send, then close this issue.\n"
    )


def append_delivery(meta_path: Path, date: str, commit: str) -> None:
    meta_path = Path(meta_path)
    text = meta_path.read_text(encoding="utf-8")
    if not text.endswith("\n"):
        text += "\n"
    if "amruta_delivery" not in (yaml.safe_load(text) or {}):
        text += "amruta_delivery:\n"
    text += f"- date: '{date}'\n  commit: {commit}\n"
    meta_path.write_text(text, encoding="utf-8")


def _cmd_build(args: argparse.Namespace) -> None:
    talk_dir = ROOT / "talks" / args.talk
    files = package_files(ROOT, args.talk)
    write_package(talk_dir, files)
    meta = yaml.safe_load((talk_dir / "meta.yaml").read_text(encoding="utf-8"))
    url = gmail_url(*email(meta), *email_addresses())
    if args.comment_out:
        Path(args.comment_out).write_text(
            issue_comment(args.repo_slug, args.talk, sorted(files), url), encoding="utf-8"
        )
    print(f"Wrote {len(files)} file(s) to {talk_dir / PACKAGE_DIR}: {', '.join(sorted(files))}")
    print(url)


def _cmd_mark_delivered(args: argparse.Namespace) -> None:
    append_delivery(ROOT / "talks" / args.talk / "meta.yaml", args.date, args.commit)
    print(f"Recorded delivery of {args.talk} ({args.date}, {args.commit})")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Build the Amruta delivery package for a talk")
    sub = parser.add_subparsers(dest="cmd", required=True)
    build = sub.add_parser("build", help="write talks/{talk}/_for_Amruta and print the Gmail compose link")
    build.add_argument("--talk", required=True, help="talk id, e.g. 1987-04-19_Easter-Puja-Materialism")
    build.add_argument("--comment-out", help="also write the issue comment (markdown) to this file")
    build.add_argument("--repo-slug", default="sy-tools/sy-subtitles", help="OWNER/NAME for file links")
    mark = sub.add_parser("mark-delivered", help="append an amruta_delivery entry to meta.yaml")
    mark.add_argument("--talk", required=True)
    mark.add_argument("--date", required=True, help="YYYY-MM-DD")
    mark.add_argument("--commit", required=True, help="sha of the _for_Amruta commit on main")
    args = parser.parse_args(argv)
    try:
        {"build": _cmd_build, "mark-delivered": _cmd_mark_delivered}[args.cmd](args)
    except PackageError as e:
        sys.exit(f"error: {e}")


if __name__ == "__main__":
    main()
