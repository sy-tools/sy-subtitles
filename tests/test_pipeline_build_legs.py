"""The pipeline builds one leg per build video, and ships the legs that pass.

A talk recorded as several equal parts (a workshop on four tapes) has no
primary: every part is `independent` and is built as its own slice of the
one transcript. These run the workflow's own step scripts.
"""

import fnmatch
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = ROOT / ".github" / "workflows" / "subtitle-pipeline.yml"


def _jobs() -> dict:
    return yaml.safe_load(PIPELINE.read_text(encoding="utf-8"))["jobs"]


def _step(job: str, name: str) -> dict:
    return next(st for st in _jobs()[job]["steps"] if st.get("name") == name)


def _run(tmp_path: Path, script: str, env: dict) -> dict:
    out = tmp_path / "github_output"
    out.write_text("", encoding="utf-8")
    path = f"{Path(sys.executable).parent}{os.pathsep}{os.environ.get('PATH', '')}"
    full_env = {
        **os.environ,
        **env,
        "GITHUB_OUTPUT": str(out),
        "GITHUB_ENV": str(tmp_path / "github_env"),
        "PYTHONPATH": str(ROOT),
        "PATH": path,
    }
    subprocess.run(["bash", "-e", "-c", script], cwd=tmp_path, env=full_env, check=True, capture_output=True)
    return dict(line.split("=", 1) for line in out.read_text(encoding="utf-8").splitlines() if "=" in line)


def _meta(tmp_path: Path, videos: list[dict]) -> Path:
    talk = tmp_path / "talks" / "T"
    talk.mkdir(parents=True)
    (talk / "meta.yaml").write_text(yaml.safe_dump({"videos": videos}), encoding="utf-8")
    return talk


def _legs(tmp_path: Path) -> list[dict]:
    out = _run(tmp_path, _step("prepare-build", "Resolve timing source")["run"], {"TALK_ID": "T"})
    return json.loads(out["build_matrix"])["include"]


def test_a_talk_of_equal_parts_builds_every_part_as_a_slice(tmp_path):
    _meta(tmp_path, [{"slug": f"Part-{i}", "sync": "independent"} for i in (1, 2)])
    assert _legs(tmp_path) == [
        {"video_slug": "Part-1", "role": "independent", "timing_source": "whisper", "slice": True},
        {"video_slug": "Part-2", "role": "independent", "timing_source": "whisper", "slice": True},
    ]


def test_a_primary_beside_an_independent_video_is_a_slice_too(tmp_path):
    _meta(
        tmp_path,
        [
            {"slug": "Puja", "sync": "primary"},
            {"slug": "Puja-Talk", "sync": "derived"},
            {"slug": "Talk-After", "sync": "independent"},
        ],
    )
    legs = _legs(tmp_path)
    assert [(leg["video_slug"], leg["role"], leg["slice"]) for leg in legs] == [
        ("Puja", "primary", True),
        ("Talk-After", "independent", True),
    ]


def test_a_primary_with_derived_videos_is_one_whole_build(tmp_path):
    _meta(tmp_path, [{"slug": "Puja", "sync": "primary"}, {"slug": "Puja-Talk", "sync": "derived"}])
    assert [(leg["video_slug"], leg["slice"]) for leg in _legs(tmp_path)] == [("Puja", False)]


def test_build_timecodes_runs_one_leg_per_build_video_and_lets_the_others_finish():
    job = _jobs()["build-timecodes"]
    assert job["strategy"]["fail-fast"] is False
    assert "needs.prepare-build.outputs.build_matrix" in job["strategy"]["matrix"]


def test_only_the_primary_leg_builds_derived_videos():
    assert _step("build-timecodes", "Build secondary-video SRTs")["if"] == "matrix.role == 'primary'"


def test_the_manifest_records_the_role_and_the_slice(tmp_path):
    (tmp_path / "talks" / "T" / "Part-2" / "final").mkdir(parents=True)
    work = tmp_path / "talks" / "T" / "Part-2" / "work"
    work.mkdir(parents=True)
    blocks = [{"id": i, "text": f"b{i}", "para_idx": p} for i, p in enumerate([0, 1, 1, 2], start=1)]
    (work / "uk_blocks.json").write_text(json.dumps(blocks), encoding="utf-8")
    (tmp_path / "talks" / "T" / "transcript_uk.txt").write_text(
        "Мова: англійська\n\nПерший.\n\nДругий.\n\nТретій.\n", encoding="utf-8"
    )
    (work / "timecodes.txt").write_text("#2 | 00:00:01,000 | 00:00:02,000\n#3 | 00:00:02,000 | 00:00:03,000\n")
    _run(
        tmp_path,
        _step("build-timecodes", "Write build manifest")["run"],
        {
            "TALK_ID": "T",
            "VIDEO_SLUG": "Part-2",
            "TIMING_SOURCE": "whisper",
            "ROLE": "independent",
            "SLICE": "true",
            "RUN_ID": "42",
        },
    )
    manifest = yaml.safe_load((tmp_path / "talks/T/Part-2/final/build_manifest.yaml").read_text(encoding="utf-8"))
    assert manifest["role"] == "independent"
    assert manifest["mode"] == "whisper"
    assert manifest["slice"] is True
    assert manifest["paragraphs"] == [[2, 2]]
    assert manifest["paragraph_count"] == 3


def test_a_slice_leg_lets_the_builder_skip_ids():
    step = _step("build-timecodes", "Validate timecodes format")
    assert step["env"]["SLICE"] == "${{ matrix.slice }}"
    assert '[ "$SLICE" = "true" ]' in step["run"]


def test_a_leg_stages_only_its_own_videos(tmp_path):
    talk = _meta(tmp_path, [{"slug": "Part-1", "sync": "independent"}, {"slug": "Part-2", "sync": "independent"}])
    for slug in ("Part-1", "Part-2"):
        (talk / slug / "final").mkdir(parents=True)
        (talk / slug / "final" / "uk.srt").write_text(slug, encoding="utf-8")
    runner_temp = tmp_path / "runner"
    _run(
        tmp_path,
        _step("build-timecodes", "Stage leg outputs")["run"],
        {"TALK_ID": "T", "VIDEO_SLUG": "Part-2", "LEG_VIDEOS": "Part-2", "RUNNER_TEMP": str(runner_temp)},
    )
    staged = sorted(str(p.relative_to(runner_temp)) for p in runner_temp.rglob("*") if p.is_file())
    assert staged == ["leg/Part-2/final/uk.srt"]


def _leg(root: Path, slug: str, passed: bool) -> None:
    (root / slug / "final").mkdir(parents=True)
    (root / slug / "final" / "uk.srt").write_text(slug, encoding="utf-8")
    if passed:
        (root / slug / "leg_ok").write_text(slug, encoding="utf-8")


def _place(tmp_path: Path, downloads: Path, build_result: str, build_videos=None) -> dict:
    (tmp_path / "talks" / "T").mkdir(parents=True, exist_ok=True)
    if build_videos is None:
        build_videos = sorted(p.parent.name for p in downloads.rglob("leg_ok")) or ["Puja"]
    matrix = json.dumps({"include": [{"video_slug": slug} for slug in build_videos]})
    script = _step("commit", "Place artifacts into talk directories")["run"].replace("/tmp/subtitles", str(downloads))
    return _run(
        tmp_path,
        script,
        {"TALK_ID": "T", "BUILD_RESULT": build_result, "TRANSLATE_RESULT": "skipped", "BUILD_MATRIX": matrix},
    )


def test_commit_ships_the_legs_that_passed_and_drops_the_one_that_failed(tmp_path):
    downloads = tmp_path / "subtitles"
    _leg(downloads / "subtitles__T__video__Part-1", "Part-1", passed=True)
    _leg(downloads / "subtitles__T__video__Part-2", "Part-2", passed=False)

    out = _place(tmp_path, downloads, "failure")

    assert (tmp_path / "talks/T/Part-1/final/uk.srt").read_text(encoding="utf-8") == "Part-1"
    assert not (tmp_path / "talks/T/Part-2/final/uk.srt").exists()
    assert out["shipped"] == "true"


def test_commit_ships_a_lone_leg_that_download_artifact_extracted_flat(tmp_path):
    """With one matching artifact download-artifact drops the per-artifact
    directory, so the leg's files sit straight under the download path."""
    downloads = tmp_path / "subtitles"
    _leg(downloads, "Puja", passed=True)
    _leg(downloads, "Puja-Talk", passed=True)

    out = _place(tmp_path, downloads, "success", build_videos=["Puja"])

    assert (tmp_path / "talks/T/Puja/final/uk.srt").read_text(encoding="utf-8") == "Puja"
    assert (tmp_path / "talks/T/Puja-Talk/final/uk.srt").read_text(encoding="utf-8") == "Puja-Talk"
    assert out["shipped"] == "true"


def test_commit_ships_nothing_when_no_leg_passed(tmp_path):
    downloads = tmp_path / "subtitles"
    _leg(downloads, "Puja", passed=False)

    out = _place(tmp_path, downloads, "failure")

    assert not (tmp_path / "talks/T/Puja/final/uk.srt").exists()
    assert out["shipped"] == "false"


def test_a_leg_marks_every_video_it_staged_only_when_it_passed(tmp_path):
    talk = _meta(tmp_path, [{"slug": "Puja", "sync": "primary"}, {"slug": "Puja-Talk", "sync": "derived"}])
    for slug in ("Puja", "Puja-Talk"):
        (talk / slug / "final").mkdir(parents=True)
        (talk / slug / "final" / "uk.srt").write_text(slug, encoding="utf-8")
    runner_temp = tmp_path / "runner"
    runner_temp.mkdir()
    env = {"TALK_ID": "T", "VIDEO_SLUG": "Puja", "LEG_VIDEOS": "Puja Puja-Talk", "RUNNER_TEMP": str(runner_temp)}
    _run(tmp_path, _step("build-timecodes", "Mark leg passed")["run"], env)
    _run(tmp_path, _step("build-timecodes", "Stage leg outputs")["run"], env)
    assert (runner_temp / "leg/Puja/leg_ok").is_file()
    assert (runner_temp / "leg/Puja-Talk/leg_ok").is_file()


def test_a_leg_that_failed_stages_no_marker(tmp_path):
    talk = _meta(tmp_path, [{"slug": "Part-1", "sync": "independent"}])
    (talk / "Part-1" / "final").mkdir(parents=True)
    (talk / "Part-1" / "final" / "uk.srt").write_text("x", encoding="utf-8")
    runner_temp = tmp_path / "runner"
    env = {"TALK_ID": "T", "VIDEO_SLUG": "Part-1", "LEG_VIDEOS": "Part-1", "RUNNER_TEMP": str(runner_temp)}
    _run(tmp_path, _step("build-timecodes", "Stage leg outputs")["run"], env)
    assert not list(runner_temp.rglob("leg_ok"))


def test_commit_fails_when_a_successful_build_placed_nothing(tmp_path):
    downloads = tmp_path / "subtitles"
    _leg(downloads, "Puja", passed=False)
    with pytest.raises(subprocess.CalledProcessError):
        _place(tmp_path, downloads, "success")


def test_commit_fails_when_a_successful_build_is_missing_one_part(tmp_path):
    """Every leg passed, yet one part's artifact did not arrive: shipping the
    rest green would leave that part silently absent."""
    downloads = tmp_path / "subtitles"
    _leg(downloads / "subtitles__T__video__Part-1", "Part-1", passed=True)
    _leg(downloads / "subtitles__T__video__Part-2", "Part-2", passed=True)
    with pytest.raises(subprocess.CalledProcessError):
        _place(tmp_path, downloads, "success", build_videos=["Part-1", "Part-2", "Part-3"])


@pytest.mark.parametrize(
    ("build_result", "shipped", "mode"),
    [("success", "true", "rebuilt"), ("failure", "true", "rebuilt"), ("failure", "false", "none")],
)
def test_a_partly_failed_build_that_shipped_parts_still_opens_review(tmp_path, build_result, shipped, mode):
    (tmp_path / "talks" / "T").mkdir(parents=True)
    out = _run(
        tmp_path,
        _step("commit", "Decide review issue")["run"],
        {
            "WANTED": "true",
            "BUILD_RESULT": build_result,
            "SHIPPED": shipped,
            "TRANSLATE_RESULT": "skipped",
            "TEXT_ONLY": "false",
            "TALK_ID": "T",
        },
    )
    assert out["mode"] == mode


def test_commit_checks_coverage_across_the_slices_without_failing_the_run():
    step = _step("commit", "Check slice coverage")
    assert step["continue-on-error"] is True
    assert "tools.slice_coverage" in step["run"]


def test_upload_name_matches_both_download_patterns():
    upload = _step("build-timecodes", "Upload build artifacts")["with"]["name"]
    leg = upload.replace("${{ matrix.video_slug }}", "Part-2").replace(
        "${{ needs.prepare-build.outputs.talk_id }}", "T"
    )
    for job in ("commit", "verify-dryrun"):
        pattern = _step(job, "Download subtitle artifacts")["with"]["pattern"]
        pattern = pattern.replace("${{ needs.discover.outputs.talk_id }}", "T")
        assert fnmatch.fnmatchcase(leg, pattern), f"{job} downloads {pattern!r}, the build uploads {leg!r}"


def test_verify_dryrun_merges_the_legs_into_one_tree():
    assert _step("verify-dryrun", "Download subtitle artifacts")["with"]["merge-multiple"] is True


def test_a_leg_is_marked_passed_only_when_every_step_before_it_passed():
    """A step without `if` runs on success() only. Any `if` here (always(),
    !cancelled()) would mark a leg that failed validation, and ship it."""
    steps = _jobs()["build-timecodes"]["steps"]
    names = [st.get("name") for st in steps]
    mark = steps[names.index("Mark leg passed")]
    assert "if" not in mark
    assert names.index("Mark leg passed") > names.index("Validate subtitles")


def test_commit_knows_which_videos_were_built():
    step = _step("commit", "Place artifacts into talk directories")
    assert step["env"]["BUILD_MATRIX"] == "${{ needs.prepare-build.outputs.build_matrix }}"


def test_the_builder_is_told_whether_it_builds_a_slice():
    prompt = _step("build-timecodes", "Build timecodes (Claude)")["with"]["prompt"]
    assert "SLICE: ${{ matrix.slice }}" in prompt


def _whisper(path: Path, words: list[tuple[float, float, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    segments = [{"start": s, "end": e, "text": w, "words": [{"word": w, "start": s, "end": e}]} for s, e, w in words]
    path.write_text(json.dumps({"segments": segments}), encoding="utf-8")


def test_a_whisper_slice_holding_only_its_own_part_passes_validation(tmp_path):
    talk = _meta(tmp_path, [{"slug": "Part-1", "sync": "independent"}, {"slug": "Part-2", "sync": "independent"}])
    (talk / "transcript_uk.txt").write_text(
        "Перша касета говорить це.\n\nДруга касета говорить інше.\n", encoding="utf-8"
    )
    (talk / "Part-2" / "final").mkdir(parents=True)
    (talk / "Part-2" / "final" / "uk.srt").write_text(
        "1\n00:00:01,000 --> 00:00:03,500\nДруга касета говорить інше.\n", encoding="utf-8"
    )
    _whisper(talk / "Part-2" / "source" / "whisper.json", [(1.0, 1.5, "The"), (1.5, 3.4, "second tape.")])
    env = {"TALK_ID": "T", "VIDEO_SLUG": "Part-2", "ROLE": "independent", "TIMING_SOURCE": "whisper"}

    _run(tmp_path, _step("build-timecodes", "Validate subtitles")["run"], {**env, "SLICE": "true"})

    with pytest.raises(subprocess.CalledProcessError):
        _run(tmp_path, _step("build-timecodes", "Validate subtitles")["run"], {**env, "SLICE": "false"})
