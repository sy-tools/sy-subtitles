"""How subtitle-pipeline.yml wires a dry run (pipeline-matrix-dryrun.yml).

The recorded builder answer in a snapshot belongs to the snapshot's
transcript. A dry run that skips translation would otherwise build from the
transcript in the checkout — which reviewers keep editing — so every job that
reads the transcript must pin it to the snapshot's. And the verifier can only
judge the translate phase when it is handed what that phase produced.
"""

from pathlib import Path

import yaml

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "subtitle-pipeline.yml"
NO_TRANSLATION = "needs.translate-and-review.result != 'success'"


def _jobs() -> dict:
    return yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))["jobs"]


def _step(job: str, name: str) -> dict:
    for step in _jobs()[job]["steps"]:
        if step.get("name") == name:
            return step
    raise AssertionError(f"{job}: step {name!r} not found")


def _needs(job: str) -> list[str]:
    needs = _jobs()[job]["needs"]
    return [needs] if isinstance(needs, str) else needs


def test_prepare_build_pins_the_transcript_before_cutting_blocks():
    run = _step("prepare-build", "Prepare UK blocks")["run"]
    pin = run.index("tools.fake_llm pin-transcript")
    assert pin < run.index("tools.build_map prepare"), "blocks must be cut from the pinned transcript"
    assert '"${DRY_RUN}" = "true"' in run[:pin] and '"${TRANSLATED}" != "success"' in run[:pin]


def test_build_timecodes_pins_the_transcript_when_no_translation_was_made():
    assert "translate-and-review" in _needs("build-timecodes")
    step = _step("build-timecodes", "Pin transcript to snapshot (dry-run)")
    assert "inputs.dry_run == true" in step["if"] and NO_TRANSLATION in step["if"]
    assert "tools.fake_llm pin-transcript" in step["run"]
    names = [s.get("name") for s in _jobs()["build-timecodes"]["steps"]]
    assert names.index("Place translation artifacts") < names.index("Pin transcript to snapshot (dry-run)")
    assert names.index("Pin transcript to snapshot (dry-run)") < names.index("Validate subtitles")


def test_fake_builder_replays_the_answer_for_the_runs_timing_source():
    step = _step("build-timecodes", "Build timecodes (dry-run fake)")
    assert "needs.prepare-build.outputs.timing_source" in step["env"]["TIMING_SOURCE"]
    assert '--timing-source "${TIMING_SOURCE}"' in step["run"]


def test_verify_dryrun_judges_translation_only_from_the_translate_artifact():
    download = _step("verify-dryrun", "Download translation artifacts")
    assert download["if"] == "needs.translate-and-review.result == 'success'"
    assert "translation__" in download["with"]["name"]

    verify = _step("verify-dryrun", "Verify against snapshot")
    assert "needs.translate-and-review.result" in verify["env"]["TRANSLATED"]
    assert '--phases "${phases}"' in verify["run"]
    assert 'phases="translate,build"' in verify["run"] and 'phases="build"' in verify["run"]
