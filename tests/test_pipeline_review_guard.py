"""Structural guard: the review step must prove it completed.

When the Claude CLI hits a usage limit (session or weekly) mid-review, it
stops cleanly: the final assistant message is the limit notice and the exit
code is 0, so claude-code-action — and therefore the job — succeeds. The
transcript may already contain a partial set of corrections while
``review_report.md`` was never rewritten (observed on run 29572341492:
7 edits applied, then "You've hit your session limit", report left stale,
pipeline green).

The workflow must therefore verify a postcondition: the review step rewrote
``review_report.md`` during this run. A sentinel file is stamped before the
review step; afterwards the report must be newer than the sentinel (mtime
comparison — byte-identical rewrites still pass, absent writes fail).
"""

from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"


def _review_job_steps() -> list[dict]:
    wf = yaml.safe_load((WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8"))
    return wf["jobs"]["translate-and-review"]["steps"]


def _step_index(steps: list[dict], name: str) -> int:
    for i, step in enumerate(steps):
        if step.get("name") == name:
            return i
    raise AssertionError(f"step {name!r} not found in translate-and-review")


def test_sentinel_is_stamped_before_review_step() -> None:
    steps = _review_job_steps()
    stamp = _step_index(steps, "Stamp review sentinel")
    review = _step_index(steps, "Review translation (2+1)")
    assert stamp < review, "sentinel must be stamped before the review step"
    assert "touch" in steps[stamp]["run"], "sentinel step must touch a marker file"


def test_review_outputs_are_verified_after_review_step() -> None:
    steps = _review_job_steps()
    review = _step_index(steps, "Review translation (2+1)")
    verify = _step_index(steps, "Verify review outputs")
    assert review < verify, "verification must run after the review step"

    step = steps[verify]
    cond = str(step.get("if", ""))
    assert "inputs.review != false" in cond, "guard must run only when review is enabled"
    assert "inputs.dry_run != true" in cond, "guard must not run in dry-run replays"

    run = step["run"]
    assert "review_report.md" in run, "guard must check review_report.md"
    assert "-nt" in run, "guard must compare mtime against the sentinel (-nt)"
    assert "exit 1" in run, "guard must fail the job when the report was not rewritten"
    assert "::error::" in run, "guard must emit a workflow error annotation"


def test_review_prompt_makes_report_the_final_action() -> None:
    steps = _review_job_steps()
    review = _review_job_steps()[_step_index(steps, "Review translation (2+1)")]
    prompt = review["with"]["prompt"]
    assert "final action" in prompt.lower(), (
        "prompt must instruct the agent to save the report as its FINAL action, "
        "so a fresh report implies the correction pass completed"
    )
