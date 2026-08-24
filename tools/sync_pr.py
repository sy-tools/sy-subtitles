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
sync pathspecs, so the workflow doesn't need to pre-filter. Exits 0 on
success, 1 on any sync/validate failure (with a GitHub Actions ::error::
line per failure).

Every talk is synced against a shadow copy of itself and the working tree
is written only once every target of every talk has succeeded, so a
non-zero exit leaves nothing for the workflow to commit.
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

from .srt_utils import parse_srt, write_srt
from .sync_common import load_base_from_git
from .sync_invariants import check_writes
from .sync_plan import SyncPlan, apply_plan, collect_writes, shadow_talk
from .sync_propagate import propagate_primary_to_derived
from .sync_srt_to_transcript import sync_srt_to_transcript
from .sync_transcript_to_srt import sync_transcript
from .validate_subtitles import manifest_validate_flags
from .validate_subtitles import validate as validate_subtitles
from .video_roles import RoleError, resolve_roles


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
    """Paths this PR touched, or raise.

    A swallowed failure here is indistinguishable from a clean PR: the run
    would print "No transcript or SRT changes" and exit 0, leaving every
    human edit unsynced under a green check. `::error::` only annotates —
    it does not set an exit status — so the exception must propagate.
    """
    out = _run_git("diff", "--name-only", baseline, "HEAD", "--", *SYNC_PATHSPECS)
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


def _plan_talk(
    talk_dir: str,
    srt_paths: list[str],
    baseline: str,
    tmp: Path,
) -> SyncPlan:
    """Compute every write this talk needs. Never touches the working tree.

    The talk's sync-relevant files are copied into a shadow directory and
    the sync steps run against the copy; whatever they changed there
    becomes the plan. Nothing is collected unless every target succeeded.

    Flow:
      1. Snapshot base_transcript → tmp.
      2. For each changed SRT:
         a. Snapshot its base_srt → tmp.
         b. Run sync_srt_to_transcript on the SHADOW transcript (accumulating).
         c. Run sync_srt_to_transcript on a COPY of base_transcript (per-video
            effective-old baseline).
      3. For each video in the talk (per meta.yaml):
         a. Pick old_transcript = effective_old_for_video[slug] if it exists,
            else base_transcript.
         b. Run sync_transcript_to_srt(old_transcript, shadow transcript).
         c. Validate the resulting SRT against the resulting transcript.
    """
    plan = SyncPlan()
    talk_id = Path(talk_dir).name
    real_transcript = Path(talk_dir) / "transcript_uk.txt"
    if not real_transcript.exists():
        print(f"  [{talk_id}] no transcript_uk.txt — skip", file=sys.stderr)
        return plan

    base_transcript = tmp / f"{talk_id}.base_transcript.txt"
    if not _show_base(baseline, str(real_transcript), base_transcript):
        print(f"  [{talk_id}] transcript is new in this PR — skip", file=sys.stderr)
        return plan

    shadow = shadow_talk(talk_dir, tmp / "shadow")
    transcript_path = shadow / "transcript_uk.txt"

    try:
        roles = resolve_roles(shadow)
    except RoleError as exc:
        plan.failures.append(str(exc))
        return plan

    # Step A: propagate each changed SRT's edits onto the shadow transcript
    # AND onto a per-video copy of the base transcript (effective-old
    # baseline).
    effective_old: dict[str, Path] = {}
    for srt in srt_paths:
        video_slug = srt.split("/")[2]
        if roles.get(video_slug, "ignored") == "ignored":
            print(f"  [{talk_id}/{video_slug}] sync: ignored — skip", file=sys.stderr)
            continue
        if not Path(srt).exists():
            # `git diff --name-only` also lists deletions — nothing to sync
            print(f"  [{talk_id}/{video_slug}] SRT deleted in this PR — skip", file=sys.stderr)
            continue
        base_srt = tmp / f"{talk_id}__{video_slug}.base.srt"
        if not _show_base(baseline, srt, base_srt):
            print(f"  [{talk_id}/{video_slug}] SRT is new in this PR — skip", file=sys.stderr)
            continue

        print(f"  [{talk_id}/{video_slug}] SRT → transcript (accumulate)", file=sys.stderr)
        shadow_srt = shadow / video_slug / "final" / "uk.srt"
        result = sync_srt_to_transcript(
            old_srt=str(base_srt),
            new_srt=str(shadow_srt),
            transcript=str(transcript_path),
            talk_dir=str(shadow),
        )
        if "error" in result:
            plan.failures.append(f"{srt}: {result['error']}")
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
            new_srt=str(shadow_srt),
            transcript=str(effective),
            talk_dir=str(shadow),
        )
        if "error" in baseline_result:
            # Shouldn't normally differ from the accumulate run, but bail
            # loudly if it does.
            plan.failures.append(f"{srt}: effective-old baseline failed: {baseline_result['error']}")
            continue
        effective_old[video_slug] = effective

    # Step B runs even when Step A failed, so one run reports every problem
    # instead of hiding the later ones behind the first. A single failure
    # still blocks the whole write.
    slugs = _list_video_slugs(shadow / "meta.yaml")
    if not slugs:
        print(f"  [{talk_id}] meta.yaml has no videos — skip Step B", file=sys.stderr)
        return plan

    derived = [s for s in slugs if roles.get(s) == "derived"]
    primary = next((s for s, r in roles.items() if r == "primary"), None)
    if derived and not (primary and (shadow / primary / "final" / "uk.srt").exists()):
        # Nothing to mirror: the primary has no subtitles in this PR. The
        # transcript is the only source left, so the derived videos take the
        # independent path this once rather than going unsynced.
        print(f"  [{talk_id}] primary has no uk.srt — derived videos sync from the transcript", file=sys.stderr)
        derived = []
    for slug in slugs:
        role = roles.get(slug, "ignored")
        if role == "ignored" or (role == "derived" and slug in derived):
            # Ignored videos are never written. Derived ones take their text
            # from the primary below, not from a character diff against a
            # block cut that was never the transcript's.
            continue
        srt_file = shadow / slug / "final" / "uk.srt"
        if not srt_file.exists():
            print(f"  [{talk_id}/{slug}] no uk.srt — skip", file=sys.stderr)
            continue

        old_transcript = effective_old.get(slug, base_transcript)
        baseline_label = "effective-old" if slug in effective_old else "base"
        print(f"  [{talk_id}/{slug}] transcript → SRT (old={baseline_label})", file=sys.stderr)

        result = sync_transcript(
            talk_dir=str(shadow),
            video_slug=slug,
            old_transcript=str(old_transcript),
            new_transcript=str(transcript_path),
        )
        if "error" in result:
            plan.failures.append(f"{talk_id}/{slug}: {result['error']} — needs full pipeline rebuild")
            continue

        # Block-count-changed edits (sync_transcript returns error) no longer
        # auto-optimize — the pipeline rebuilds timing properly via whisper.
        # See feedback_no_proportional: approximate timing is banned.

        # Validate the updated SRT against the updated transcript. Matches
        # the old bash step's flags: we skip time/duration checks because
        # Step B doesn't touch timecodes. On top of that, apply the build
        # mode flags from build_manifest.yaml — en-srt primaries legitimately
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
            plan.failures.append(f"{talk_id}/{slug}: validate raised: {exc}")
            continue
        if not passed:
            plan.failures.append(f"{talk_id}/{slug}: validation failed — needs full subtitle rebuild via pipeline")

    if derived:
        _plan_derived(plan, talk_dir, shadow, roles, derived, baseline, tmp)

    if plan.ok:
        plan.writes.update(collect_writes(shadow, talk_dir))
    return plan


def _texts(path: Path) -> list[str]:
    return [b["text"] for b in parse_srt(str(path))]


def _plan_derived(
    plan: SyncPlan,
    talk_dir: str,
    shadow: Path,
    roles: dict[str, str],
    derived: list[str],
    baseline: str,
    tmp: Path,
) -> None:
    """Copy the primary's text onto every derived video, positionally.

    The correspondence between the two cuts is taken from their BASELINE
    texts, so the edit being propagated cannot break the alignment it travels
    along. 66 of the corpus's 68 derived videos match their primary block for
    block; the two that do not are pre-secondary-machinery talks, where an
    unmatched block simply has nothing to receive.
    """
    talk_id = Path(talk_dir).name
    primary = next((s for s, r in roles.items() if r == "primary"), None)
    if primary is None:
        plan.failures.append(f"{talk_id}: no video is `sync: primary` — cannot update derived videos")
        return

    primary_srt = shadow / primary / "final" / "uk.srt"
    if not primary_srt.exists():
        print(f"  [{talk_id}/{primary}] primary has no uk.srt — skip derived", file=sys.stderr)
        return

    base_primary = tmp / f"{talk_id}__{primary}.propagate_base.srt"
    if not _show_base(baseline, f"{talk_dir}/{primary}/final/uk.srt", base_primary):
        print(f"  [{talk_id}/{primary}] primary is new in this PR — skip derived", file=sys.stderr)
        return

    primary_old = _texts(base_primary)
    primary_new = _texts(primary_srt)

    for slug in derived:
        srt_file = shadow / slug / "final" / "uk.srt"
        if not srt_file.exists():
            print(f"  [{talk_id}/{slug}] no uk.srt — skip", file=sys.stderr)
            continue

        base_derived = tmp / f"{talk_id}__{slug}.propagate_base.srt"
        derived_old = (
            _texts(base_derived)
            if _show_base(baseline, f"{talk_dir}/{slug}/final/uk.srt", base_derived)
            else _texts(srt_file)
        )

        print(f"  [{talk_id}/{slug}] {primary} → SRT (derived, positional)", file=sys.stderr)
        blocks = parse_srt(str(srt_file))
        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, blocks)
        if "error" in result:
            plan.failures.append(f"{talk_id}/{slug}: {result['error']}")
            continue
        if result["changed"] or result["removed"]:
            write_srt(blocks, str(srt_file))
        print(
            f"  [{talk_id}/{slug}] changed {result['changed']}, removed {result['removed']}",
            file=sys.stderr,
        )


def run(baseline: str | None = None) -> int:
    if baseline is None:
        baseline = resolve_baseline()
    changed = _list_changed(baseline)
    srt_by_talk, transcript_talks = _classify(changed)
    all_talks = sorted(set(srt_by_talk) | set(transcript_talks))
    if not all_talks:
        print("No transcript or SRT changes", file=sys.stderr)
        return 0

    tmp = Path(tempfile.mkdtemp(prefix="sync_pr_"))
    plan = SyncPlan()
    for talk_dir in all_talks:
        talk_id = Path(talk_dir).name
        print("\n========================================", file=sys.stderr)
        print(f"  {talk_id}", file=sys.stderr)
        print("========================================", file=sys.stderr)
        plan.merge(_plan_talk(talk_dir, srt_by_talk.get(talk_dir, []), baseline, tmp))

    # The gate runs on planned content, before anything reaches disk: a text
    # sync may rewrite what a subtitle says and drop a block, never retime one.
    plan.failures.extend(check_writes(plan.writes))

    if not plan.ok:
        for failure in plan.failures:
            _gha_error(failure)
        print(f"{len(plan.failures)} target(s) failed — nothing written", file=sys.stderr)
        return 1

    written = apply_plan(plan)
    print(f"Wrote {len(written)} file(s)", file=sys.stderr)
    return 0


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
