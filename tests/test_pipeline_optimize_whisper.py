"""Structural guard: the Optimize step must be given the whisper timings.

Without ``--whisper-json`` the optimizer has no word timestamps, so its merge
phases fall back to judging block adjacency by timecodes alone. A block
inherited from a padded EN SRT runs on past its last spoken word, making the
gap to the next block read as ~0 while the speaker was silent for seconds —
and the two blocks get merged into one subtitle stretched over the pause
(2000-07-23 Guru Puja: "Що робить Ґуру? Все, що у вас є…", 26s on screen).

The speech-gap guard in tools/optimize_srt.py only engages when the words are
actually passed in, so this wiring is part of the fix, not an extra.
"""

import re
from pathlib import Path

import yaml

from tools.optimize_srt import build_parser

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"


def _build_job_steps() -> list[dict]:
    wf = yaml.safe_load((WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8"))
    return wf["jobs"]["build-timecodes"]["steps"]


def _step(steps: list[dict], name: str) -> dict:
    for step in steps:
        if step.get("name") == name:
            return step
    raise AssertionError(f"step {name!r} not found in the build-timecodes job")


def _optimize_flags(run: str) -> list[str]:
    """Long options the step passes to tools.optimize_srt.

    Scans the whole script, not just whitespace-separated tokens: a flag built
    into a shell variable (FLAG="--json path") is still a flag at runtime.
    """
    return sorted(set(re.findall(r"--[a-z][a-z0-9-]+", run)))


def test_optimize_step_passes_whisper_json() -> None:
    run = _step(_build_job_steps(), "Optimize SRT")["run"]
    assert "source/whisper.json" in run, "optimizer must receive whisper word timings"


def test_optimize_step_uses_only_real_cli_flags() -> None:
    """Every flag in the step must exist in the optimizer's parser.

    A step that greps as "passes whisper" but spells the option wrong fails
    the job at runtime, not here — so check the names against argparse itself.
    """
    parser = build_parser()
    known = {opt for action in parser._actions for opt in action.option_strings}
    run = _step(_build_job_steps(), "Optimize SRT")["run"]
    unknown = [flag for flag in _optimize_flags(run) if flag not in known]
    assert not unknown, f"unknown optimize_srt flags in the pipeline: {unknown}"
