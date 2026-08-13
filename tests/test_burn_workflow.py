"""Guards on burn-subtitles.yml — the SPA depends on its run-name and step names."""

import os
import re
import subprocess
from pathlib import Path

import pytest
import yaml

WORKFLOW = ".github/workflows/burn-subtitles.yml"
REPO_ROOT = Path(__file__).resolve().parent.parent


def _commands(run):
    """A run: block with its comment lines removed.

    These guards assert what the step EXECUTES. A comment that merely mentions
    a command must neither satisfy one nor trip another — the original
    test_installs_yt_dlp said as much, and then this file's own explanatory
    comment broke it.
    """
    return "\n".join(ln for ln in run.splitlines() if not ln.lstrip().startswith("#"))


# The progress model in the SPA maps these strings to progress stages.
CONTRACT_STEPS = [
    "Install dependencies",
    "Validate inputs",
    "Download video",
    "Start render",
    "Render 5%",
    "Render 10%",
    "Render 15%",
    "Render 20%",
    "Render 25%",
    "Render 30%",
    "Render 35%",
    "Render 40%",
    "Render 45%",
    "Render 50%",
    "Render 55%",
    "Render 60%",
    "Render 65%",
    "Render 70%",
    "Render 75%",
    "Render 80%",
    "Render 85%",
    "Render 90%",
    "Render 95%",
    "Finish render",
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
            "source_ref",
            "run_label",
        }

    def test_run_name_embeds_request_id(self):
        # workflow_dispatch returns no run id; this is how the SPA finds its run.
        assert "inputs.request_id" in _doc()["run-name"]

    def test_run_name_leads_with_the_human_label(self):
        # A run is found by eye in the Actions list, the way a PR is found by
        # its title. The talk_id/video_slug fallback keeps a hand-started run
        # from being nameless.
        run_name = _doc()["run-name"]
        assert "inputs.run_label" in run_name
        assert "inputs.talk_id" in run_name and "inputs.video_slug" in run_name
        assert run_name.index("inputs.run_label") < run_name.index("inputs.request_id")

    def test_the_content_ref_defaults_to_the_published_subtitles(self):
        # A hand-started run that names no ref renders what is on main, which is
        # the same thing the SPA does for a talk with no edits.
        assert _doc()[True]["workflow_dispatch"]["inputs"]["source_ref"]["default"] == "main"


class TestTwoRefs:
    """The renderer comes from the dispatched ref; the subtitles from an input.

    Edit-sync cuts its branch from main once and never fast-forwards it
    (site/js/edit_sync.js), so a reviewer's branch carries whatever workflow and
    tools main had on the day they first edited. Checking that branch out as the
    WORKFLOW would render with a months-old renderer — which is exactly how this
    was found: a render dispatched against a sync branch ran main's probe stub
    and returned a 12-byte placeholder .mp4.
    """

    def _content_checkout(self):
        for s in _steps():
            with_ = s.get("with") or {}
            if str(s.get("uses", "")).startswith("actions/checkout") and with_.get("ref"):
                return s
        raise AssertionError("no checkout of the content ref")

    def test_checks_the_subtitles_out_from_the_input_ref(self):
        with_ = self._content_checkout()["with"]
        assert "inputs.source_ref" in with_["ref"]
        assert with_["path"] == "content"

    def test_the_code_checkout_pins_no_ref(self):
        # Bare = the ref the dispatch names, i.e. the version the SPA asked for.
        first = next(s for s in _steps() if str(s.get("uses", "")).startswith("actions/checkout"))
        assert not (first.get("with") or {}).get("ref")

    def test_the_ref_is_validated_before_it_is_checked_out(self):
        steps = _steps()
        guard = next(i for i, s in enumerate(steps) if "--source-ref" in (s.get("run") or ""))
        checkout = steps.index(self._content_checkout())
        assert guard < checkout, "a ref must be rejected before anything fetches it"

    def test_both_checkouts_stay_unnamed(self):
        # Naming either would wedge a step into the list the SPA credits.
        for s in _steps():
            if str(s.get("uses", "")).startswith("actions/checkout"):
                assert "name" not in s

    def test_every_talk_file_is_read_from_the_content_checkout(self):
        # The regression guard: one unprefixed `talks/` is a render of the wrong
        # subtitles, and it looks like a success.
        for run in _runs():
            stray = re.search(r"(?<!content/)\btalks/", _commands(run))
            assert not stray, f"reads talks/ outside the content checkout:\n{run}"

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

    def test_installs_yt_dlp_from_requirements(self):
        """yt-dlp comes from requirements.txt, which pins the impersonation extra.

        A bare `pip install yt-dlp` alongside it would resolve the same package
        WITHOUT the extra and silently drop curl_cffi, which is the one thing
        newer Vimeo videos need (see test_yt_dlp_can_impersonate_a_browser).
        """
        run = _step("Install dependencies")["run"]
        assert "pip install -r requirements.txt" in _commands(run)
        assert "pip install yt-dlp" not in _commands(run)

    def test_installs_only_the_devanagari_fallback_font(self):
        # PT Serif is vendored under assets/fonts/ and handed to libass via
        # fontsdir; it must stay the PRIMARY face, and the probe proves it did.
        # Noto is here for the twelve videos whose subtitles carry Sanskrit
        # mantras in Devanagari — glyphs PT Serif does not have. Without a
        # fallback libass logs "failed to find any fallback" and the probe
        # rightly refuses to put tofu boxes in a final video.
        joined = "\n".join(_commands(run) for run in _runs())
        assert "fonts-noto-core" in joined
        stripped = joined.replace("fonts-noto-core", "")
        assert "fonts-" not in stripped, "no OTHER font package may be installed"

    def test_validates_the_video_ref_before_the_run_invests_in_it(self):
        # Two reasons, one step. A talk whose video has no video_ref used to
        # burn through the whole install before dying at Download video; and an
        # unvalidated ref decodes to vimeo.com/<arbitrary text> — multiline,
        # which defeats the line-based ::add-mask:: and hands the tail to the
        # runner as workflow commands. validate_video_ref re-checks the decoded
        # URL against the strict shape.
        validate = _commands(_step("Validate inputs")["run"])
        assert "video_ref" in validate, "Validate inputs must extract the video_ref"
        assert "--video-ref" in validate, "and reject a malformed one before any work"

    def test_the_download_validates_the_ref_before_decoding_it(self):
        # The hard guarantee lives where the value flows into add-mask/echo:
        # decode nothing that validation has not passed.
        download = _commands(_step("Download video")["run"])
        assert "--video-ref" in download
        assert download.index("--video-ref") < download.index("vimeo_codec decode"), (
            "the guard must run before the decode, or the mask sees the payload first"
        )

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

    def test_the_font_ratio_band_is_the_same_number_in_all_three_files(self):
        """YAML guard, Python clamp and browser clamp, or the SPA dispatches a refusal.

        The browser measures the ratio, the burner clamps it and this step
        rejects it. When those three disagree the failure lands in Actions,
        minutes after the click, with a generic message.
        """
        from tools import burn_subtitles

        run = _step("Validate inputs")["run"]
        match = re.search(r'"FONT_RATIO":\s*\(([0-9.]+),\s*([0-9.]+)\)', run)
        assert match, "the ratio bounds are no longer readable out of the guard"
        low, high = float(match.group(1)), float(match.group(2))
        assert (low, high) == (burn_subtitles.FONT_RATIO_MIN, burn_subtitles.FONT_RATIO_MAX)

        with open("site/js/burn_video.js", encoding="utf-8") as f:
            source = f.read()
        js = {name: float(value) for name, value in re.findall(r"var (FONT_RATIO_(?:MIN|MAX)) = ([0-9.]+);", source)}
        assert js == {"FONT_RATIO_MIN": low, "FONT_RATIO_MAX": high}


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
        run = _step("Start render")["run"]
        assert "tools.burn_subtitles" in run
        for flag in ("--font-ratio", "--padtop-ratio", "--padbot-ratio"):
            assert flag in run, flag

    def test_burns_the_validated_ukrainian_srt(self):
        assert "final/uk.srt" in _step("Start render")["run"]

    def test_the_render_writes_a_progress_file_for_the_gates(self):
        # Without this the gate steps have nothing to poll and every one of them
        # would stall out — the whole progress mechanism hangs off this flag.
        assert "--progress-file" in _step("Start render")["run"]

    def test_the_comment_counts_the_burn_log_lines_correctly(self):
        """The comment tells whoever is debugging a font failure what to look for.

        It used to promise two "[burn] ffmpeg ..." lines — a pre-flight and the
        encode — but the pre-flight runs under capture_output and echoes
        nothing, so only one is ever written. Pinning both halves keeps a reader
        from hunting for a line that does not exist.
        """
        with open("tools/burn_subtitles.py", encoding="utf-8") as f:
            source = f.read()
        assert source.count('print("[burn] ') == 1, "only the encode may echo its command"
        comment = _step("Start render")["run"]
        assert 'Exactly ONE "[burn] ffmpeg ..." line' in comment

    def test_probes_the_source_duration_before_launching(self):
        # out_time_us only becomes a percentage against a known duration.
        run = _step("Start render")["run"]
        assert "ffprobe" in run
        assert "format=duration" in run

    def test_the_launcher_always_records_an_exit_code(self):
        # The gates' unambiguous "the render is over" signal. If the wrapper
        # could skip it (a `set -e` inside, say), a failed render would leave
        # every remaining gate waiting for a stall timeout instead of failing.
        run = _step("Start render")["run"]
        assert "> /tmp/burn/exit_code" in run

    def test_every_gate_polls_the_same_four_files(self):
        for name in [f"Render {p}%" for p in range(10, 100, 10)] + ["Finish render"]:
            run = _step(name)["run"]
            assert "tools.render_gate" in run, name
            for flag in ("--progress-file", "--duration-file", "--exit-file", "--log-file"):
                assert flag in run, f"{name} {flag}"

    def test_the_gates_ask_for_ascending_thresholds(self):
        percents = []
        for name in [f"Render {p}%" for p in range(10, 100, 10)]:
            run = _step(name)["run"]
            percents.append(int(re.search(r"--percent (\d+)", run).group(1)))
        assert percents == sorted(percents) == list(range(10, 100, 10))

    def test_the_gate_threshold_matches_its_step_name(self):
        # A gate named 90% that waits for 20% would light the SPA's bar up in
        # the wrong order — and nothing else in the system would notice.
        for percent in range(10, 100, 10):
            run = _step(f"Render {percent}%")["run"]
            assert f"--percent {percent} " in run + " ", percent

    def test_the_final_step_waits_for_the_process_not_the_encoder(self):
        # progress=end arrives before +faststart has rewritten the moov atom.
        assert "--await-exit" in _step("Finish render")["run"]

    def test_the_final_step_surfaces_the_detached_log(self):
        # The render's output went to a file, so nothing reaches the job log
        # unless this step prints it.
        assert "cat /tmp/burn/render.log" in _step("Finish render")["run"]


class TestRenderLauncherInjection:
    """The detached body is single-quoted; the shell must splice nothing into it."""

    def _launcher(self, run, root):
        start = run.index("nohup bash -c")
        marker = "< /dev/null &"
        end = run.index(marker) + len(marker)
        return run[start:end].replace("/tmp/burn", root)

    @pytest.mark.integration
    def test_a_crafted_talk_id_cannot_execute_a_command(self, tmp_path):
        root = tmp_path / "burn"
        (root / "out").mkdir(parents=True)
        pwned = tmp_path / "pwned"
        # A stub `python` keeps the check about quoting, not about ffmpeg, and
        # its exit code proves the wrapper records one.
        bindir = tmp_path / "bin"
        bindir.mkdir()
        stub = bindir / "python"
        stub.write_text("#!/bin/sh\nexit 7\n", encoding="utf-8")
        stub.chmod(0o755)

        script = "set -euo pipefail\n" + self._launcher(_step("Start render")["run"], str(root)) + "\nwait\n"
        env = dict(
            os.environ,
            PATH=f"{bindir}{os.pathsep}{os.environ['PATH']}",
            TALK_ID=f'x"; touch {pwned}; #',
            VIDEO_SLUG=f"v'; touch {pwned}; #",
            FONT_RATIO="0.0711",
            PADTOP_RATIO="0.0741",
            PADBOT_RATIO="0.0333",
        )
        done = subprocess.run(["bash", "-c", script], env=env, capture_output=True, text=True)
        assert done.returncode == 0, done.stderr
        assert not pwned.exists(), "a crafted talk_id executed a command inside the detached body"
        assert (root / "exit_code").read_text().strip() == "7"


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
            "actions/setup-python@v7",
            "actions/cache@v6",
            "actions/upload-artifact@v7",
        ):
            assert action in raw, action


class TestVimeoImpersonation:
    """Newer Vimeo videos block yt-dlp on its TLS fingerprint.

    Measured 2026-07-31 on two real talks: the 2014-era video (id 104915825)
    downloads with a plain yt-dlp, while the 2025-era one (id 1065815961)
    answers 401 — and a real browser plays the very same URL and hash, which is
    what rules out a stale hash or a privacy setting. yt-dlp names the cause
    itself: "This request has been blocked due to its TLS fingerprint. Install
    a required impersonation dependency."

    That dependency is the `curl-cffi` extra, and it has to be on the
    requirement, not merely installed alongside: `pip install yt-dlp` resolves
    the already-satisfied bare package and installs no extra.
    """

    def test_requirements_pin_the_impersonation_extra(self):
        text = (REPO_ROOT / "requirements.txt").read_text(encoding="utf-8")
        line = next(ln for ln in text.splitlines() if ln.startswith("yt-dlp"))
        assert "curl-cffi" in line, "yt-dlp must carry the curl-cffi extra or newer Vimeo videos 401: " + line

    def test_every_workflow_installing_yt_dlp_gets_the_extra(self):
        """A second install site without the extra would undo the first."""
        offenders = []
        for path in sorted((REPO_ROOT / ".github" / "workflows").glob("*.yml")):
            for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if line.lstrip().startswith("#"):
                    continue  # prose about the install is not an install
                if "pip install" not in line or "yt-dlp" not in line:
                    continue
                if "curl-cffi" not in line:
                    offenders.append(f"{path.name}:{n}: {line.strip()}")
        assert not offenders, "install yt-dlp with its extra:\n" + "\n".join(offenders)
