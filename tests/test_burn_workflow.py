"""Guards on burn-subtitles.yml — the SPA depends on its run-name and step names."""

import os
import subprocess

import pytest
import yaml

WORKFLOW = ".github/workflows/burn-subtitles.yml"

# The progress model in the SPA maps these strings to progress stages.
CONTRACT_STEPS = [
    "Install dependencies",
    "Validate inputs",
    "Download video",
    "Burn subtitles",
    "Upload result",
]


def _raw():
    with open(WORKFLOW, encoding="utf-8") as f:
        return f.read()


def _doc():
    return yaml.safe_load(_raw())


def _steps():
    return [s for job in _doc()["jobs"].values() for s in job["steps"]]


def _step(name):
    return next(s for s in _steps() if s.get("name") == name)


def _runs():
    return [s["run"] for s in _steps() if s.get("run")]


class TestInputs:
    def test_declares_every_input_the_spa_sends(self):
        inputs = _doc()[True]["workflow_dispatch"]["inputs"]
        assert set(inputs) == {
            "talk_id",
            "video_slug",
            "font_ratio",
            "padtop_ratio",
            "padbot_ratio",
            "request_id",
        }

    def test_run_name_embeds_request_id(self):
        # workflow_dispatch returns no run id; this is how the SPA finds its run.
        assert "inputs.request_id" in _doc()["run-name"]

    def test_only_needs_read_access(self):
        assert _doc()["permissions"] == {"contents": "read"}


class TestSteps:
    def test_named_steps_match_the_contract_exactly(self):
        # Task 8 keys progress off these names, in this order, with nothing
        # named wedged in between.
        names = [s["name"] for s in _steps() if s.get("name")]
        assert names == CONTRACT_STEPS

    def test_validates_inputs_before_doing_work(self):
        names = [s.get("name") for s in _steps()]
        assert names.index("Validate inputs") < names.index("Download video")

    def test_installs_ffmpeg(self):
        assert any("install -y ffmpeg" in run for run in _runs())

    def test_installs_yt_dlp(self):
        # An actual install command, not a passing mention in a comment.
        assert "pip install yt-dlp" in _step("Install dependencies")["run"]

    def test_does_not_apt_install_a_font(self):
        # Roboto is vendored under assets/fonts/ and handed to libass via fontsdir.
        joined = "\n".join(_runs())
        assert "fonts-" not in joined

    def test_every_run_block_is_strict(self):
        for run in _runs():
            assert "set -euo pipefail" in run, run

    def test_no_step_masks_a_non_zero_exit(self):
        # A font that libass cannot resolve must fail the run loudly.
        joined = "\n".join(_runs())
        for masker in ("|| true", "|| :", "set +e"):
            assert masker not in joined, masker
        assert "continue-on-error" not in _raw()


class TestValidation:
    def test_guard_cli_checks_talk_and_video(self):
        run = _step("Validate inputs")["run"]
        assert "tools.workflow_validation_cli" in run
        assert "--talk-id" in run
        assert "--video-slug" in run

    def test_requires_the_ukrainian_srt_to_exist(self):
        assert "final/uk.srt" in _step("Validate inputs")["run"]

    @pytest.mark.integration
    @pytest.mark.parametrize(
        ("ratios", "exit_code"),
        [
            (("0.0711", "0.0741", "0.0333"), 0),  # the SPA defaults
            (("0.02", "0.0", "0.0"), 0),  # lower bounds are inclusive
            (("0.12", "0.5", "0.5"), 0),  # upper bounds are inclusive
            (("abc", "0.0741", "0.0333"), 1),
            (("", "0.0741", "0.0333"), 1),
            (("nan", "0.0741", "0.0333"), 1),
            (("inf", "0.0741", "0.0333"), 1),
            (("-0.05", "0.0741", "0.0333"), 1),
            (("0.5", "0.0741", "0.0333"), 1),  # font_ratio clamp is 0.12
            (("0.0711", "0.9", "0.0333"), 1),
            (("0.0711", "0.0741", "-0.1"), 1),
        ],
    )
    def test_ratio_guard_accepts_sane_values_and_rejects_the_rest(self, ratios, exit_code):
        # Execute the real guard, not a grep over it: bounds written backwards
        # would sail past a string check.
        run = _step("Validate inputs")["run"]
        script = "set -euo pipefail\n" + run[run.index("python3 - <<") :]
        env = dict(
            os.environ,
            FONT_RATIO=ratios[0],
            PADTOP_RATIO=ratios[1],
            PADBOT_RATIO=ratios[2],
        )
        done = subprocess.run(["bash", "-c", script], env=env, capture_output=True, text=True)
        assert done.returncode == exit_code, f"{ratios} -> {done.returncode}: {done.stdout}"


class TestDownload:
    def test_masks_the_decoded_video_url(self):
        run = _step("Download video")["run"]
        assert "vimeo_codec decode" in run
        assert "::add-mask::" in run, "the plaintext URL must never reach the logs"

    def test_decodes_to_the_player_form(self):
        # Vimeo answers 401 on the internal API yt-dlp uses for canonical
        # vimeo.com/<id>/<hash> links; --player emits the resolvable form.
        assert "vimeo_codec decode --player" in _step("Download video")["run"]

    def test_downloads_with_the_amruta_referer(self):
        assert '--referer "https://www.amruta.org/"' in _step("Download video")["run"]

    def test_forces_the_mp4_container(self):
        # Without this yt-dlp may merge into source.mkv, exit 0, and leave the
        # empty-file check complaining about an .mp4 that was never written.
        assert "--merge-output-format mp4" in _step("Download video")["run"]

    def test_download_failure_is_loud(self):
        # A silent empty file would produce a video with no audio track.
        run = _step("Download video")["run"]
        assert "set -euo pipefail" in run
        assert "test -s" in run
        assert run.count("::error::") >= 2


class TestBurn:
    def test_passes_the_browser_measured_ratios(self):
        run = _step("Burn subtitles")["run"]
        assert "tools.burn_subtitles" in run
        for flag in ("--font-ratio", "--padtop-ratio", "--padbot-ratio"):
            assert flag in run, flag

    def test_burns_the_validated_ukrainian_srt(self):
        assert "final/uk.srt" in _step("Burn subtitles")["run"]


class TestArtifact:
    def _upload(self):
        return _step("Upload result")

    def test_retains_for_seven_days(self):
        assert self._upload()["with"]["retention-days"] == 7

    def test_stores_uncompressed_for_client_side_extraction(self):
        # compression-level 0 lets the SPA slice the MP4 straight out of the ZIP.
        assert self._upload()["with"]["compression-level"] == 0

    def test_artifact_name_uses_double_underscore_delimiter(self):
        # talk_id contains hyphens, so '-' cannot delimit.
        assert "__" in self._upload()["with"]["name"]

    def test_an_empty_artifact_fails_the_job(self):
        # The MP4 IS the deliverable: the default 'warn' would report success
        # and hand the SPA a zero-entry ZIP.
        assert self._upload()["with"]["if-no-files-found"] == "error"


class TestPinnedActions:
    def test_uses_the_versions_the_rest_of_the_repo_pins(self):
        raw = _raw()
        for action in (
            "actions/checkout@v7",
            "actions/setup-python@v6",
            "actions/cache@v6",
            "actions/upload-artifact@v7",
        ):
            assert action in raw, action
