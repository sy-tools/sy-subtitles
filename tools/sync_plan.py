"""Planning half of the sync driver.

`sync_pr` used to write the transcript and each SRT as it went, and the
workflow committed whatever had landed even when the job failed
(`if: always()`). A run could therefore leave the transcript updated and a
second video untouched, then push that split state and go red.

Here the work happens against a *shadow* copy of the talk. The existing
sync steps write into the shadow as freely as they like; the working tree
is written only after every target of every talk has succeeded.
"""

import shutil
from dataclasses import dataclass, field
from pathlib import Path

# The shadow is a whitelist, not a copytree: `final/` also holds the
# burned-in mp4 (close to a gigabyte in the largest talk), and nothing in
# the sync reads it. Talk-level files first, then per-video ones.
SHADOW_TALK_FILES = ("meta.yaml", "transcript_uk.txt")
# source/en.srt is read, never written: validate_subtitles resolves it from
# the UK SRT it is handed, so a shadow without it silently drops
# compare_block_count — the last text guard on an en-srt primary.
SHADOW_VIDEO_FILES = ("final/uk.srt", "final/build_manifest.yaml", "source/en.srt")


@dataclass
class SyncPlan:
    """Every file the sync wants to write, plus every reason it cannot."""

    writes: dict[str, str] = field(default_factory=dict)
    failures: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failures

    def merge(self, other: "SyncPlan") -> None:
        self.writes.update(other.writes)
        self.failures.extend(other.failures)


def _video_slugs(talk: Path) -> list[str]:
    """Directory names, not meta.yaml: a video whose slug is missing from
    meta must still be shadowed if its SRT is what the PR edited."""
    return sorted(d.name for d in talk.iterdir() if d.is_dir())


def shadow_talk(talk_dir: str, dest: Path) -> Path:
    """Copy a talk's sync-relevant files into `dest`.

    Returns the shadow talk directory, laid out exactly like the real one so
    the sync steps can be pointed at it unchanged.
    """
    talk = Path(talk_dir)
    shadow = dest / talk.name
    if shadow.exists():
        shutil.rmtree(shadow)
    shadow.mkdir(parents=True)

    for name in SHADOW_TALK_FILES:
        src = talk / name
        if src.is_file():
            shutil.copy2(src, shadow / name)

    for slug in _video_slugs(talk):
        for rel in SHADOW_VIDEO_FILES:
            src = talk / slug / rel
            if not src.is_file():
                continue
            dst = shadow / slug / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    return shadow


def collect_writes(shadow: Path, talk_dir: str) -> dict[str, str]:
    """Repo-relative path -> new content, for every file the shadow changed."""
    writes: dict[str, str] = {}
    for path in sorted(shadow.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(shadow)
        real = Path(talk_dir) / rel
        new = path.read_text(encoding="utf-8")
        if not real.is_file() or real.read_text(encoding="utf-8") != new:
            writes[str(real)] = new
    return writes


def apply_plan(plan: SyncPlan) -> list[str]:
    """Write the plan. Refuses a plan that did not pass the gate."""
    if not plan.ok:
        raise RuntimeError(f"refusing to apply a plan with {len(plan.failures)} failure(s): {plan.failures}")
    for path, content in sorted(plan.writes.items()):
        Path(path).write_text(content, encoding="utf-8")
    return sorted(plan.writes)
