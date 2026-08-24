"""Two-pass sync driver for the sync-subtitles PR workflow.

Given a base git SHA and a list of changed transcript/SRT paths, this
script runs the reverse-then-forward sync that the workflow used to do
in bash:

  Step A (SRT → transcript): for each changed uk.srt, diff it against
  the base-SHA version and apply the text changes to transcript_uk.txt
  in-place. Accumulates across all changed SRTs in a talk.

  Step B (transcript → SRT): for each video in each affected talk,
  diff the (possibly Step-A-updated) transcript against a per-video
  effective-old baseline and apply the result to that video's uk.srt.

The per-video effective-old baseline is the key fix for mixed PRs
(transcript edited AND a uk.srt edited in the same commit). Without
it, Step B would try to match the BASE transcript's text in the
already-edited SRT — find_paragraph_blocks fails because the old text
is no longer there. With it, each video gets a baseline that matches
its current SRT state: base_transcript + that video's own Step A
edits, which is exactly what the SRT now represents. The diff that
Step B then applies contains only the work Step A couldn't already
do for that video (direct transcript edits and other videos' SRT
edits, which still need to propagate here).

Invocation:
    python -m tools.sync_pr [--baseline SHA]

The baseline defaults to the last bot sync commit on this branch (see
resolve_baseline) — NOT the PR base, which would replay every edit the
bot has already applied. The tool takes the diff itself, scoped to the
sync pathspecs, so the workflow doesn't need to pre-filter. Exits 0 on success, 1 on any
sync/validate failure (with a GitHub Actions ::error:: line per
failure). Intentionally mutates the working tree (the workflow then
commits whatever changed).
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

from .sync_common import load_base_from_git
from .sync_srt_to_transcript import sync_srt_to_transcript
from .sync_transcript_to_srt import sync_transcript
from .validate_subtitles import manifest_validate_flags
from .validate_subtitles import validate as validate_subtitles


def _gha_error(msg: str) -> None:
    print(f"::error::{msg}", file=sys.stderr)


def _run_git(*args: str) -> str:
    result = subprocess.run(["git", *args], capture_output=True, text=True, check=True)
    return result.stdout


SYNC_TRAILER = "Sync-Bot: v1"
BOT_AUTHOR = "github-actions[bot]"

# Only these paths can carry a human edit; everything else in a diff is
# noise (a merge from main, a docs change riding along in a manual PR).
SYNC_PATHSPECS = ("talks/*/transcript_uk.txt", "talks/*/*/final/uk.srt")


def resolve_baseline(head: str = "HEAD", remote_main: str = "origin/main") -> str:
    """Return the commit a human edit should be measured against.

    The last bot sync commit on THIS branch if there is one, otherwise the
    point where the branch diverged from main. Never the PR's base tip: a
    two-dot diff against a non-ancestor reports every file that moved on
    main as a reversed change, and the sync would dutifully un-edit and
    commit them.

    The search is bounded by `remote_main..head` and walks --first-parent,
    so bot commits belonging to other PRs that arrived through a merge are
    not candidates. Author and trailer must BOTH match: the trailer alone
    is text a human can type.
    """
    sep = "\x1f"
    out = _run_git(
        "log",
        "--first-parent",
        f"{remote_main}..{head}",
        f"--format=%H{sep}%an{sep}%B%x1e",
    )
    for entry in out.split("\x1e"):
        entry = entry.strip()
        if not entry:
            continue
        sha, author, body = entry.split(sep, 2)
        if author == BOT_AUTHOR and SYNC_TRAILER in body:
            return sha
    return _run_git("merge-base", remote_main, head).strip()


def _list_changed(baseline: str) -> list[str]:
    try:
        out = _run_git("diff", "--name-only", baseline, "HEAD", "--", *SYNC_PATHSPECS)
    except subprocess.CalledProcessError as exc:
        _gha_error(f"git diff failed: {exc.stderr}")
        return []
    return [line for line in out.splitlines() if line.strip()]


# _show_base was lifted into tools.sync_common.load_base_from_git.
_show_base = load_base_from_git


def _list_video_slugs(meta_path: Path) -> list[str]:
    if not meta_path.exists():
        return []
    with meta_path.open(encoding="utf-8") as f:
        meta = yaml.safe_load(f) or {}
    return [v["slug"] for v in meta.get("videos", []) if "slug" in v]


def _classify(changed: list[str]) -> tuple[dict[str, list[str]], dict[str, bool]]:
    """Partition changed files into:
      talks_with_srt_edits: {talk_dir: [srt_path, ...]}
      talks_with_transcript_edit: {talk_dir: True}
    Returns both maps. A talk can appear in either or both.
    """
    srt_by_talk: dict[str, list[str]] = {}
    transcript_talks: dict[str, bool] = {}
    for path in changed:
        parts = path.split("/")
        if len(parts) < 2 or parts[0] != "talks":
            continue
        talk_dir = "/".join(parts[:2])
        if path.endswith("/transcript_uk.txt") and len(parts) == 3:
            transcript_talks[talk_dir] = True
        elif path.endswith("/final/uk.srt") and len(parts) == 5:
            srt_by_talk.setdefault(talk_dir, []).append(path)
    return srt_by_talk, transcript_talks


def _process_talk(
    talk_dir: str,
    srt_paths: list[str],
    baseline: str,
    tmp: Path,
) -> bool:
    """Process a single talk. Returns True on success, False on failure.

    Flow:
      1. Snapshot base_transcript → tmp.
      2. For each changed SRT:
         a. Snapshot its base_srt → tmp.
         b. Run sync_srt_to_transcript on the WORKING transcript (accumulating).
         c. Run sync_srt_to_transcript on a COPY of base_transcript (per-video
            effective-old baseline).
      3. For each video in the talk (per meta.yaml):
         a. Pick old_transcript = effective_old_for_video[slug] if it exists,
            else base_transcript.
         b. Run sync_transcript_to_srt(old_transcript, working_transcript).
         c. Optimize if block count changed.
         d. Validate. (Deferred — workflow still runs validate separately.)
    """
    talk_id = Path(talk_dir).name
    transcript_path = Path(talk_dir) / "transcript_uk.txt"
    if not transcript_path.exists():
        print(f"  [{talk_id}] no transcript_uk.txt — skip", file=sys.stderr)
        return True

    base_transcript = tmp / f"{talk_id}.base_transcript.txt"
    if not _show_base(baseline, str(transcript_path), base_transcript):
        print(f"  [{talk_id}] transcript is new in this PR — skip", file=sys.stderr)
        return True

    # Step A: propagate each changed SRT's edits onto the real transcript AND
    # onto a per-video copy of the base transcript (effective-old baseline).
    effective_old: dict[str, Path] = {}
    step_a_failed = False
    for srt in srt_paths:
        video_slug = srt.split("/")[2]
        if not Path(srt).exists():
            # `git diff --name-only` also lists deletions — nothing to sync
            print(f"  [{talk_id}/{video_slug}] SRT deleted in this PR — skip", file=sys.stderr)
            continue
        base_srt = tmp / f"{talk_id}__{video_slug}.base.srt"
        if not _show_base(baseline, srt, base_srt):
            print(f"  [{talk_id}/{video_slug}] SRT is new in this PR — skip", file=sys.stderr)
            continue

        print(f"  [{talk_id}/{video_slug}] SRT → transcript (accumulate)", file=sys.stderr)
        result = sync_srt_to_transcript(
            old_srt=str(base_srt),
            new_srt=srt,
            transcript=str(transcript_path),
        )
        if "error" in result:
            _gha_error(f"{srt}: {result['error']}")
            step_a_failed = True
            continue

        # Per-video baseline: apply this SRT's diff to a fresh copy of
        # base_transcript. The result is what the transcript would look
        # like if THIS video's SRT edits were the only change — exactly
        # what find_paragraph_blocks needs to match against the already-
        # edited SRT in Step B.
        effective = tmp / f"{talk_id}__{video_slug}.effective_old.txt"
        shutil.copyfile(base_transcript, effective)
        baseline_result = sync_srt_to_transcript(
            old_srt=str(base_srt),
            new_srt=srt,
            transcript=str(effective),
        )
        if "error" in baseline_result:
            # Shouldn't normally differ from the accumulate run, but bail
            # loudly if it does.
            _gha_error(f"{srt}: effective-old baseline failed: {baseline_result['error']}")
            step_a_failed = True
            continue
        effective_old[video_slug] = effective

    if step_a_failed:
        return False

    # Step B: sync the (possibly-updated) transcript out to every video's SRT
    # using either the per-video effective-old (for videos whose SRT was
    # edited) or plain base_transcript (for videos whose SRT is untouched).
    meta_path = Path(talk_dir) / "meta.yaml"
    slugs = _list_video_slugs(meta_path)
    if not slugs:
        print(f"  [{talk_id}] meta.yaml has no videos — skip Step B", file=sys.stderr)
        return True

    step_b_failed = False
    for slug in slugs:
        srt_file = Path(talk_dir) / slug / "final" / "uk.srt"
        if not srt_file.exists():
            print(f"  [{talk_id}/{slug}] no uk.srt — skip", file=sys.stderr)
            continue

        old_transcript = effective_old.get(slug, base_transcript)
        baseline_label = "effective-old" if slug in effective_old else "base"
        print(f"  [{talk_id}/{slug}] transcript → SRT (old={baseline_label})", file=sys.stderr)

        result = sync_transcript(
            talk_dir=talk_dir,
            video_slug=slug,
            old_transcript=str(old_transcript),
            new_transcript=str(transcript_path),
        )
        if "error" in result:
            _gha_error(f"{talk_id}/{slug}: {result['error']} — needs full pipeline rebuild")
            step_b_failed = True
            continue

        # Block-count-changed edits (sync_transcript returns error) no longer
        # auto-optimize — the pipeline rebuilds timing properly via whisper.
        # See feedback_no_proportional: approximate timing is banned.

        # Validate the updated SRT against the updated transcript. Matches
        # the old bash step's flags: we skip time/duration checks because
        # Step B doesn't touch timecodes (except via optimize, which
        # recomputes them safely). On top of that, apply the build mode
        # flags from build_manifest.yaml — en-srt primaries legitimately
        # drop transcript-only blocks and secondaries are derivative, so
        # validating stricter than the pipeline would reject its outputs.
        print(f"  [{talk_id}/{slug}] validate", file=sys.stderr)
        flags = {"skip_time_check": True, "skip_duration_check": True}
        flags.update(manifest_validate_flags(srt_file))
        try:
            passed, _report = validate_subtitles(
                srt_path=str(srt_file),
                transcript_path=str(transcript_path),
                **flags,
            )
        except Exception as exc:  # noqa: BLE001
            _gha_error(f"{talk_id}/{slug}: validate raised: {exc}")
            step_b_failed = True
            continue
        if not passed:
            _gha_error(f"{talk_id}/{slug}: validation failed — needs full subtitle rebuild via pipeline")
            step_b_failed = True

    return not step_b_failed


def run(baseline: str | None = None) -> int:
    if baseline is None:
        baseline = resolve_baseline()
    changed = _list_changed(baseline)
    srt_by_talk, transcript_talks = _classify(changed)
    all_talks = sorted(set(srt_by_talk) | set(transcript_talks))
    if not all_talks:
        print("No transcript or SRT changes", file=sys.stderr)
        return 0

    tmp = Path("/tmp/sync_pr")
    tmp.mkdir(parents=True, exist_ok=True)

    overall_ok = True
    for talk_dir in all_talks:
        srt_paths = srt_by_talk.get(talk_dir, [])
        talk_id = Path(talk_dir).name
        print("\n========================================", file=sys.stderr)
        print(f"  {talk_id}", file=sys.stderr)
        print("========================================", file=sys.stderr)
        ok = _process_talk(talk_dir, srt_paths, baseline, tmp)
        overall_ok = overall_ok and ok

    return 0 if overall_ok else 1


def main() -> None:
    p = argparse.ArgumentParser(description="Two-pass sync driver for sync-subtitles PRs")
    p.add_argument(
        "--baseline",
        default=None,
        help="Commit to diff against (default: last bot sync commit, else merge-base with origin/main)",
    )
    args = p.parse_args()
    sys.exit(run(args.baseline))


if __name__ == "__main__":
    main()
