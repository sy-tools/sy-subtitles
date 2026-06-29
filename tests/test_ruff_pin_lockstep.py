"""CI guard: the ruff version must be pinned in lockstep across all 3 places.

ruff is declared in three files that Dependabot updates independently:

* ``requirements-dev.txt`` — ``ruff>=X.Y.Z`` (the local-dev / test-job floor)
* ``.github/workflows/ci.yml`` — ``pip install ruff==X.Y.Z`` (the lint job's exact pin)
* ``.pre-commit-config.yaml`` — ``rev: vX.Y.Z`` on the ruff-pre-commit hook

When these drift apart, the lint job enforces one version while developers and
the test job run another, so formatting that passes locally can fail in CI (or
vice versa). Dependabot only ever bumps one of the three, so this test fails
loudly until a human brings the other two up to the same version.

Runs under the normal ``python -m pytest tests/`` step in ci.yml.
"""

import re
from pathlib import Path

import yaml

_ROOT = Path(__file__).resolve().parent.parent

_REQ_RE = re.compile(r"^ruff\s*[<>=!~]+\s*([\d.]+)", re.MULTILINE)
_CI_RE = re.compile(r"ruff==([\d.]+)")


def _req_version() -> str:
    text = (_ROOT / "requirements-dev.txt").read_text(encoding="utf-8")
    match = _REQ_RE.search(text)
    assert match, "no `ruff` requirement found in requirements-dev.txt"
    return match.group(1)


def _ci_version() -> str:
    text = (_ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    match = _CI_RE.search(text)
    assert match, "no `pip install ruff==X.Y.Z` pin found in ci.yml"
    return match.group(1)


def _precommit_version() -> str:
    config = yaml.safe_load((_ROOT / ".pre-commit-config.yaml").read_text(encoding="utf-8"))
    for repo in config["repos"]:
        if "ruff-pre-commit" in repo["repo"]:
            return str(repo["rev"]).lstrip("v")
    raise AssertionError("no ruff-pre-commit repo found in .pre-commit-config.yaml")


def test_parsers_extract_versions():
    """Sanity-check the parsers against a known shape before asserting equality."""
    assert _REQ_RE.search("ruff>=0.15.20").group(1) == "0.15.20"
    assert _CI_RE.search("pip install ruff==0.15.20").group(1) == "0.15.20"


def test_ruff_pinned_in_lockstep():
    versions = {
        "requirements-dev.txt": _req_version(),
        ".github/workflows/ci.yml": _ci_version(),
        ".pre-commit-config.yaml": _precommit_version(),
    }
    assert len(set(versions.values())) == 1, (
        "ruff version drifted across pin locations — bump all three together:\n"
        + "\n".join(f"  {where}: {ver}" for where, ver in versions.items())
    )
