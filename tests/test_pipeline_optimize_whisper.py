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

from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"


def _build_job_steps() -> list[dict]:
    wf = yaml.safe_load((WORKFLOWS / "subtitle-pipeline.yml").read_text(encoding="utf-8"))
    return wf["jobs"]["build-timecodes"]["steps"]


def _step(steps: list[dict], name: str) -> dict:
    for step in steps:
        if step.get("name") == name:
            return step
    raise AssertionError(f"step {name!r} not found in the build-timecodes job")


def test_optimize_step_passes_whisper_json() -> None:
    run = _step(_build_job_steps(), "Optimize SRT")["run"]
    assert "--whisper-json" in run, "optimizer must receive whisper word timings"
    assert "source/whisper.json" in run
