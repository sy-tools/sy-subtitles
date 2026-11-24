"""Guards for what a change is made of, and which CI lanes that earns it.

The `changes` job in ci.yml sorts a change into two classes, and each lane
says which it serves:

* `data` — `talks/`. Runs the unit lane, which holds every guard over shipped
  talk data (text hygiene, the meta.yaml / whisper.json schemas, the
  plaintext-link scan, the golden corpus). A talk-only PR that skipped it put a
  hygiene violation on main (#1686).
* `code` — everything else on the watched list. Runs every lane.

A change carrying both runs everything, as does one whose range is unknown.

Lint, the JS suite and the browser shards open no file under `talks/`, so a
data-only change does not start them: a pipeline or whisper PR is pure data,
and a browser shard that times out loading its own local page must not be able
to fail the pipeline run waiting to merge it (#1713).
"""

import re
from pathlib import Path

import pytest
import yaml

from tests.test_pipeline_wordlist_refresh import _detect, two_commits  # noqa: F401 — fixture re-export

REPO_ROOT = Path(__file__).resolve().parents[1]
TESTS = REPO_ROOT / "tests"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "ci.yml"

NEEDS_CODE = "needs.changes.outputs.code == 'true'"
NEEDS_DATA = "needs.changes.outputs.data == 'true'"

LANES_THAT_READ_NO_TALK_DATA = ("lint", "test-e2e", "test-js")

DATA_ONLY_CHANGES = [
    pytest.param(("talks/2000-01-01_x/main/source/whisper.json",), id="whisper"),
    pytest.param(
        (
            "talks/2000-01-01_x/main/final/uk.srt",
            "talks/2000-01-01_x/main/work/timecodes.txt",
            "talks/2000-01-01_x/main/final/report.md",
        ),
        id="pipeline-build",
    ),
    pytest.param(
        (
            "talks/2000-01-01_x/transcript_uk.txt",
            "talks/2000-01-01_x/review_report.md",
            "talks/2000-01-01_x/glossary.json",
        ),
        id="translation",
    ),
    pytest.param(
        (
            "talks/2000-01-01_x/meta.yaml",
            "talks/2000-01-01_x/transcript_en.txt",
            "talks/2000-01-01_x/main/source/en.srt",
        ),
        id="add-talk",
    ),
    pytest.param(("talks/2000-01-01_x/_for_Amruta/main_uk.srt",), id="amruta-package"),
]

CODE_CHANGES = [
    "tools/optimize_srt.py",
    "tests/test_optimize.py",
    "site/js/preview_state.js",
    "site/dict/words_uk.txt",
    "requirements.txt",
    "ruff.toml",
    ".pre-commit-config.yaml",
    ".github/workflows/ci.yml",
]


def _jobs() -> dict:
    return yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))["jobs"]


def _detect_script() -> str:
    return next(s for s in _jobs()["changes"]["steps"] if s.get("id") == "detect")["run"]


def _path_list(name: str) -> list[str]:
    body = re.search(rf"^{name}=\(\n(.*?)^\)", _detect_script(), re.S | re.M)
    assert body, f"the detector no longer declares {name}"
    return re.findall(r"^\s*'([^']+)'\s*$", body.group(1), re.M)


@pytest.mark.parametrize("paths", DATA_ONLY_CHANGES)
def test_a_talk_data_pr_is_data_and_not_code(two_commits, tmp_path, paths):  # noqa: F811
    repo, base, head = two_commits(*paths)
    outputs = _detect(repo, tmp_path, "pull_request", base, head)
    assert outputs["data"] == "true", "the unit lane holds the shipped-data guards; it must run"
    assert outputs["code"] == "false", "no code moved: lint, JS and the browser shards have nothing to check"


@pytest.mark.parametrize("path", CODE_CHANGES)
def test_a_code_pr_is_code_and_not_data(two_commits, tmp_path, path):  # noqa: F811
    repo, base, head = two_commits(path)
    outputs = _detect(repo, tmp_path, "pull_request", base, head)
    assert outputs["code"] == "true"
    assert outputs["data"] == "false"


def test_a_pr_carrying_both_is_both(two_commits, tmp_path):  # noqa: F811
    """One code file is enough to earn every lane, whatever else rides along."""
    repo, base, head = two_commits("talks/2000-01-01_x/main/final/uk.srt", "tools/optimize_srt.py")
    outputs = _detect(repo, tmp_path, "pull_request", base, head)
    assert (outputs["code"], outputs["data"]) == ("true", "true")


def test_a_pr_outside_the_watched_paths_is_neither(two_commits, tmp_path):  # noqa: F811
    repo, base, head = two_commits("review-status.json", "README.md")
    outputs = _detect(repo, tmp_path, "pull_request", base, head)
    assert (outputs["code"], outputs["data"]) == ("false", "false")


def test_a_data_merge_onto_main_is_classified_like_its_pr(two_commits, tmp_path):  # noqa: F811
    """The merge commit of a bot PR starts a second run, on main. Without the
    same split there, every merged talk would still pay for the full matrix —
    and take its runners from the PRs queued behind it."""
    repo, base, head = two_commits("talks/2000-01-01_x/main/source/whisper.json")
    outputs = _detect(repo, tmp_path, "push", base, head)
    assert (outputs["code"], outputs["data"]) == ("false", "true")


def test_a_run_without_a_range_is_treated_as_both(two_commits, tmp_path):  # noqa: F811
    """A dispatch, a first push, a force-push: test it rather than guess."""
    repo, _, _ = two_commits("talks/2000-01-01_x/transcript_uk.txt")
    outputs = _detect(repo, tmp_path, "workflow_dispatch")
    assert (outputs["code"], outputs["data"]) == ("true", "true")


def test_every_watched_path_belongs_to_exactly_one_class() -> None:
    """A path in both lists would make every talk PR a code PR again."""
    code, data = _path_list("PATHS"), _path_list("DATA_PATHS")
    assert data == ["talks/"], f"the data class is the talk tree and nothing else: {data}"
    assert not set(code) & set(data), f"listed under both classes: {set(code) & set(data)}"
    for path in data:
        covering = [c for c in code if path.startswith(c) or c.startswith(path)]
        assert not covering, f"{path} overlaps the code path(s) {covering}"


def test_the_detector_publishes_both_classes() -> None:
    outputs = _jobs()["changes"]["outputs"]
    assert outputs["code"] == "${{ steps.detect.outputs.code }}"
    assert outputs["data"] == "${{ steps.detect.outputs.data }}"


@pytest.mark.parametrize("lane", LANES_THAT_READ_NO_TALK_DATA)
def test_a_lane_that_reads_no_talk_data_runs_for_code_only(lane: str) -> None:
    assert _jobs()[lane]["if"] == NEEDS_CODE, f"{lane} must not start for a data-only change"


def test_the_unit_lane_runs_for_either_class() -> None:
    """#1686: a talk-only PR skipped the unit lane and a hygiene violation
    reached main. The lane holds every guard over shipped talk data."""
    condition = _jobs()["test-unit"]["if"]
    assert NEEDS_CODE in condition and NEEDS_DATA in condition and "||" in condition, condition


def test_every_lane_is_gated_on_a_class_the_detector_publishes() -> None:
    """A lane keyed on an output nobody sets reads '' and is skipped forever —
    and `gate` counts a skipped lane as a pass."""
    jobs = _jobs()
    published = set(jobs["changes"]["outputs"])
    for name, job in jobs.items():
        if name in ("changes", "gate"):
            continue
        used = set(re.findall(r"needs\.changes\.outputs\.(\w+)", job.get("if", "")))
        assert used, f"{name} runs regardless of what changed"
        assert used <= published, f"{name} is gated on unpublished output(s) {used - published}"


# A real read of the talk tree, as opposed to a `talks/...` URL in a mocked
# GitHub response or a "talks" key in a fixture manifest.
_PY_TALK_READ = re.compile(
    r"""/\s*["']talks["']"""  # pathlib: ROOT / "talks"
    r"""|["']talks["']\s*[,)]"""  # os.path.join(root, "talks") / Path("talks")
    r"""|(?:open|glob|iglob|rglob|listdir|scandir|Path)\(\s*f?["']talks/"""
    r"""|\bTALKS(?:_DIR|_ROOT)?\b"""
)
_JS_TALK_READ = re.compile(
    r"""["']talks["']\s*[,)]"""  # path.join(ROOT, 'talks')
    r"""|(?:readFileSync|readdirSync|existsSync|statSync)\(\s*[`"']talks/"""
)
_BROWSER_MARK = re.compile(r"pytest\.mark\.(?:e2e|smoke)\b")


def _browser_modules() -> list[Path]:
    modules = [p for p in sorted(TESTS.glob("test_*.py")) if _BROWSER_MARK.search(p.read_text(encoding="utf-8"))]
    assert len(modules) >= 10, "the browser-test scan found almost nothing — its marker pattern has gone stale"
    return [*modules, TESTS / "conftest.py"]


def _talk_reads(path: Path, pattern: re.Pattern) -> list[str]:
    lines = path.read_text(encoding="utf-8").splitlines()
    return [f"{path.name}:{n}: {line.strip()}" for n, line in enumerate(lines, 1) if pattern.search(line)]


def test_no_browser_test_reads_the_talk_tree() -> None:
    """The premise of skipping test-e2e for talk data: the browser suite runs
    the SPA against mocked GitHub responses and never opens a real talk. A
    browser test that starts reading `talks/` breaks that premise — move the
    read into the unit lane, or make the e2e lane run for `data` too."""
    found = [hit for module in _browser_modules() for hit in _talk_reads(module, _PY_TALK_READ)]
    assert not found, "browser tests read real talk data, but test-e2e is skipped for it:\n" + "\n".join(found)


def test_no_js_test_reads_the_talk_tree() -> None:
    """Same premise for test-js: the Node suite exercises site/js modules."""
    suites = sorted(TESTS.glob("test_*.js"))
    assert suites, "no JS suites found"
    found = [hit for suite in suites for hit in _talk_reads(suite, _JS_TALK_READ)]
    assert not found, "JS tests read real talk data, but test-js is skipped for it:\n" + "\n".join(found)


def test_the_talk_read_patterns_recognise_a_real_read() -> None:
    """A scan that matches nothing proves nothing."""
    for line in ('TALKS = REPO_ROOT / "talks"', 'os.path.join(root, "talks")', "for p in glob('talks/*/meta.yaml'):"):
        assert _PY_TALK_READ.search(line), line
    for line in ("path.join(ROOT, 'talks')", "fs.readdirSync('talks/')"):
        assert _JS_TALK_READ.search(line), line
    for line in ('"talks": {', '{"path": "talks/2001-01-01_Test-Talk/meta.yaml", "type": "blob"},'):
        assert not _PY_TALK_READ.search(line), line
