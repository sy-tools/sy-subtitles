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


def test_sync_review_status_unlabeled_checks_removed_label() -> None:
    """For an 'unlabeled' event github.event.issue.labels reflects the state
    AFTER removal, so removing the last review:* label used to skip the sync
    and leave review-status.json stale. The job gate must also look at the
    removed label itself (github.event.label.name)."""
    data = yaml.safe_load((WORKFLOWS / "sync-review-status.yml").read_text(encoding="utf-8"))
    cond = data["jobs"]["sync"]["if"]
    assert "github.event.label.name" in cond, f"gate ignores the removed label: {cond}"
