"""The Review:/Operator: issue steps behind the `review_issue` checkbox.

A run that built the subtitles creates the Review: issue or resets it to
review:pending, as before. A run that built nothing (subtitles landed by
hand after a failed build) may still open a missing issue, but must never
reset an existing one: that would wipe a real review status on every
whisper- or translate-only run, the checkbox being on by default. A failed
build announces nothing.
"""

import json
import os
import stat
import subprocess
from pathlib import Path

import pytest
import yaml

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "subtitle-pipeline.yml"
TALK = "2000-01-01_Talk"


def _wf() -> dict:
    return yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))


def _commit_step(name: str) -> dict:
    for step in _wf()["jobs"]["commit"]["steps"]:
        if step.get("name") == name:
            return step
    raise AssertionError(f"step {name!r} not found in the commit job")


@pytest.mark.parametrize("trigger", ["workflow_dispatch", "workflow_call"])
def test_review_issue_checkbox_is_on_by_default(trigger: str) -> None:
    spec = _wf()[True][trigger]["inputs"]["review_issue"]
    assert spec["type"] == "boolean"
    assert spec["default"] is True


def _gate(
    tmp_path: Path,
    *,
    wanted: str,
    build: str,
    subtitles: bool,
    text_only: str = "false",
    translate: str = "skipped",
    transcript: bool = False,
) -> str:
    if transcript:
        talk = tmp_path / "talks" / TALK
        talk.mkdir(parents=True, exist_ok=True)
        (talk / "transcript_uk.txt").write_text("Лист.\n", encoding="utf-8")
    if subtitles:
        final = tmp_path / "talks" / TALK / "Video" / "final"
        final.mkdir(parents=True)
        (final / "uk.srt").write_text("1\n", encoding="utf-8")
    out = tmp_path / "github_output"
    out.write_text("", encoding="utf-8")
    step = _commit_step("Decide review issue")
    env = {
        **os.environ,
        "TALK_ID": TALK,
        "WANTED": wanted,
        "BUILD_RESULT": build,
        "TEXT_ONLY": text_only,
        "TRANSLATE_RESULT": translate,
        "GITHUB_OUTPUT": str(out),
    }
    subprocess.run(["bash", "-e", "-c", step["run"]], cwd=tmp_path, env=env, check=True)
    return dict(line.split("=", 1) for line in out.read_text(encoding="utf-8").split())["mode"]


@pytest.mark.parametrize(
    ("wanted", "build", "subtitles", "mode"),
    [
        ("true", "success", True, "rebuilt"),
        ("", "success", True, "rebuilt"),
        ("true", "skipped", True, "existing"),
        ("true", "skipped", False, "none"),
        ("true", "failure", True, "none"),
        ("false", "success", True, "none"),
        ("false", "skipped", True, "none"),
    ],
)
def test_gate_decides_from_checkbox_build_and_subtitles(
    tmp_path: Path, wanted: str, build: str, subtitles: bool, mode: str
) -> None:
    assert _gate(tmp_path, wanted=wanted, build=build, subtitles=subtitles) == mode


# A text-only talk has no build at all — build-timecodes is always
# skipped for it — so the transcript is what ships to review. A translation
# made this run resets the issue like a rebuild; one already on disk only opens
# a missing issue; a failed translation announces nothing.
@pytest.mark.parametrize(
    ("wanted", "translate", "transcript", "mode"),
    [
        ("true", "success", True, "rebuilt"),
        ("", "success", True, "rebuilt"),
        ("true", "skipped", True, "existing"),
        ("true", "failure", True, "none"),
        ("true", "success", False, "none"),
        ("true", "skipped", False, "none"),
        ("false", "success", True, "none"),
    ],
)
def test_gate_for_a_text_only_talk_follows_the_transcript(
    tmp_path: Path, wanted: str, translate: str, transcript: bool, mode: str
) -> None:
    got = _gate(
        tmp_path,
        wanted=wanted,
        build="skipped",
        subtitles=False,
        text_only="true",
        translate=translate,
        transcript=transcript,
    )
    assert got == mode


@pytest.mark.parametrize("name", ["Create review tracking issue", "Move the Operator issue to the translator"])
def test_issue_steps_follow_the_gate_and_stay_on_main(name: str) -> None:
    cond = _commit_step(name)["if"]
    assert "steps.review-gate.outputs.mode != 'none'" in cond
    assert "github.ref_name == 'main'" in cond


def _review_step(
    tmp_path: Path, *, mode: str, existing: str, text_only: str = "false", listed: list | None = None
) -> list[str]:
    """Run the issue step under a stub gh. `existing` is the number of an
    issue titled exactly `Review: {TALK}`; `listed` overrides the whole search
    result, which GitHub tokenises — it is not an exact title match."""
    if listed is None:
        listed = [{"number": int(existing), "title": f"Review: {TALK}"}] if existing else []
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    log = tmp_path / "gh.log"
    (tmp_path / "listed.json").write_text(json.dumps(listed), encoding="utf-8")
    gh = bin_dir / "gh"
    gh.write_text(
        f'#!/bin/bash\necho "$*" >> "{log}"\n'
        f'if [ "$1 $2" = "issue list" ]; then cat "{tmp_path / "listed.json"}"; fi\n'
        'if [ "$1 $2" = "issue view" ]; then echo 0; fi\n',
        encoding="utf-8",
    )
    gh.chmod(gh.stat().st_mode | stat.S_IEXEC)
    (tmp_path / "talks" / TALK).mkdir(parents=True)
    (tmp_path / "talks" / TALK / "meta.yaml").write_text("title: T\n", encoding="utf-8")
    env = {
        **os.environ,
        "PATH": f"{bin_dir}:{os.environ['PATH']}",
        "TALK_ID": TALK,
        "REPO": "o/r",
        "OWNER": "o",
        "MODE": mode,
        "TEXT_ONLY": text_only,
    }
    step = _commit_step("Create review tracking issue")
    subprocess.run(["bash", "-e", "-c", step["run"]], cwd=tmp_path, env=env, check=True)
    return log.read_text(encoding="utf-8").splitlines()


def test_run_without_build_leaves_an_existing_review_issue_alone(tmp_path: Path) -> None:
    calls = _review_step(tmp_path, mode="existing", existing="42")
    assert not [c for c in calls if c.startswith(("issue edit", "issue reopen", "issue create"))]


def test_run_without_build_opens_a_missing_review_issue(tmp_path: Path) -> None:
    calls = _review_step(tmp_path, mode="existing", existing="")
    assert [c for c in calls if c.startswith("issue create")]


def test_rebuild_still_resets_an_existing_review_issue(tmp_path: Path) -> None:
    calls = _review_step(tmp_path, mode="rebuilt", existing="42")
    assert [c for c in calls if c.startswith("issue edit 42")]


def test_a_video_talk_issue_asks_to_watch_the_subtitles(tmp_path: Path) -> None:
    calls = " ".join(_review_step(tmp_path, mode="rebuilt", existing=""))
    assert "Watch the video with subtitles" in calls


def test_a_text_only_issue_asks_to_read_the_translation_not_watch_a_video(tmp_path: Path) -> None:
    calls = " ".join(_review_step(tmp_path, mode="rebuilt", existing="", text_only="true"))
    assert "Read the transcript side by side with the English" in calls
    assert "video" not in calls.lower()


def test_the_review_issue_is_matched_by_its_exact_title(tmp_path: Path) -> None:
    """`in:title` search is tokenised: for `1979-01-01_Letter` it also finds
    `Review: 1979-01-01_Letter-Human-Chitta-has-many-illusions`, and taking
    the first hit would reset that other talk's issue."""
    listed = [
        {"number": 726, "title": f"Review: {TALK}-Longer-Sibling"},
        {"number": 325, "title": f"Review: {TALK}"},
    ]
    calls = _review_step(tmp_path, mode="rebuilt", existing="", listed=listed)
    assert [c for c in calls if c.startswith("issue edit 325")]
    assert not [c for c in calls if "726" in c]


def test_only_a_longer_sibling_found_means_no_issue_yet(tmp_path: Path) -> None:
    listed = [{"number": 726, "title": f"Review: {TALK}-Longer-Sibling"}]
    calls = _review_step(tmp_path, mode="rebuilt", existing="", listed=listed)
    assert [c for c in calls if c.startswith("issue create")]
    assert not [c for c in calls if "726" in c]
