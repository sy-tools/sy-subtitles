"""Structural guards for workflow defects found by the 2026-07-02 audit.

Workflows can't be executed in the test suite, so these tests pin the
YAML structure the same way test_pipeline_talk_id_normalization does.
"""

import re
from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"


def test_commit_job_places_glossary_json() -> None:
    """The 'Record glossary version' step writes talks/<id>/glossary.json and
    the translation artifact carries it, but the commit job's placement loop
    used to copy only transcript_uk.txt + review_report.md — leaving
    glossary.json dead end-to-end. Every translation placement loop must
    include glossary.json."""
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    loops = re.findall(r"for f in ([^;]*transcript_uk\.txt[^;]*); do", text)
    assert loops, "no translation placement loops found"
    for loop in loops:
        assert "glossary.json" in loop, f"placement loop misses glossary.json: for f in {loop}"


def test_whisper_pip_version_spec_is_quoted() -> None:
    """`pip install faster-whisper>=1.2.1` unquoted is a shell redirection:
    the real command is `pip install faster-whisper` with stdout sent to a
    file named '=1.2.1' — the version floor silently vanishes."""
    text = (WORKFLOWS / "whisper.yml").read_text(encoding="utf-8")
    for line in text.splitlines():
        if "pip install" in line and "faster-whisper" in line:
            spec = line.strip()
            assert re.search(r"['\"]faster-whisper>=[^'\"]+['\"]", spec), (
                f"unquoted version spec (shell redirect): {spec}"
            )


def test_commit_job_places_build_manifest() -> None:
    """build_manifest.yaml is written during build, uploaded in the subtitles
    artifact, and listed in the bot-pr patterns — but the commit job's
    subtitle placement filter used to omit it, so it was never committed and
    sync_pr fell back to whisper-strict validation for en-srt talks."""
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    # the commit job's placement find is the one that also copies build_report.txt
    finds = [line for line in text.splitlines() if "find /tmp/subtitles" in line and "build_report.txt" in line]
    assert finds, "commit-job subtitle placement find not found"
    for line in finds:
        assert "build_manifest.yaml" in line, f"subtitle placement filter misses build_manifest.yaml: {line.strip()}"


def test_commit_job_gates_translation_on_translate_success() -> None:
    """The translate job has a hard verification gate (1:1 paragraph count);
    its artifact is uploaded even on failure so partial progress is
    inspectable. The commit job must NOT place a failed-verify transcript
    into talks/ — that would push a broken baseline to main (the same reason
    BUILD_RESULT gates the subtitle copy)."""
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    placement = re.search(r"- name: Place artifacts into talk directories.*?- name: ", text, re.S)
    assert placement, "placement step not found"
    step = placement.group(0)
    assert "TRANSLATE_RESULT" in step, "translation placement is not gated on translate-and-review result"


def test_review_issue_requires_built_subtitles() -> None:
    """The review tracking issue used to be created/reset to review:pending
    even when build-timecodes failed and the run committed no subtitles —
    if: success() only covers the commit job's own steps."""
    text = (WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8")
    start = text.find("- name: Create review tracking issue")
    assert start != -1, "issue step not found"
    nxt = text.find("- name: ", start + 1)
    step = text[start : nxt if nxt != -1 else len(text)]
    assert "needs.build-timecodes.result == 'success'" in step, "issue step does not require build-timecodes success"


def test_ci_paths_cover_precommit_config() -> None:
    """tests/test_ruff_pin_lockstep.py exists to catch a ruff bump in ONE of
    its three pinned places — but ci.yml's path filters omitted
    .pre-commit-config.yaml, so a PR bumping only the pre-commit rev never
    ran CI (and never ran the guard)."""
    data = yaml.safe_load((WORKFLOWS / "ci.yml").read_text(encoding="utf-8"))
    on = data.get("on") or data.get(True)  # yaml 1.1 parses bare `on` as True
    for trigger in ("push", "pull_request"):
        paths = on[trigger]["paths"]
        assert ".pre-commit-config.yaml" in paths, f"{trigger}.paths misses .pre-commit-config.yaml: {paths}"


def test_ci_paths_cover_shipped_talk_data_guards() -> None:
    """The suite has shipped-data guards (test_no_plaintext_vimeo, and
    test_schemas' all-shipped meta.yaml/whisper.json validation) — but ci.yml
    used to skip entirely on PRs that only touch talks/**, so a hand edit
    reintroducing a plaintext vimeo_url or a corrupt whisper.json shipped
    with no check running at all."""
    data = yaml.safe_load((WORKFLOWS / "ci.yml").read_text(encoding="utf-8"))
    on = data.get("on") or data.get(True)
    for trigger in ("push", "pull_request"):
        paths = on[trigger]["paths"]
        assert "talks/*/meta.yaml" in paths, f"{trigger}.paths misses talks/*/meta.yaml: {paths}"
        assert "talks/*/*/source/whisper.json" in paths, f"{trigger}.paths misses whisper.json: {paths}"


def test_sync_review_status_unlabeled_checks_removed_label() -> None:
    """For an 'unlabeled' event github.event.issue.labels reflects the state
    AFTER removal, so removing the last review:* label used to skip the sync
    and leave review-status.json stale. The job gate must also look at the
    removed label itself (github.event.label.name)."""
    data = yaml.safe_load((WORKFLOWS / "sync-review-status.yml").read_text(encoding="utf-8"))
    cond = data["jobs"]["sync"]["if"]
    assert "github.event.label.name" in cond, f"gate ignores the removed label: {cond}"
