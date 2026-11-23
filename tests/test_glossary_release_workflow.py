"""Structural guards for the glossary release workflow.

A release must follow ANY change under `glossary/`: the translator rules
(`AGENTS.md`), its README and every dictionary are read by the agents that
translate and review, so each of them is part of what a glossary version is.

The workflow file itself is a trigger too, so that a change to how releases
are cut produces one on merge, and `workflow_dispatch` lets a missed release
be cut by hand.
"""

import os
import subprocess
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
WF = ROOT / ".github" / "workflows" / "glossary-release.yml"


def _on() -> dict:
    data = yaml.safe_load(WF.read_text(encoding="utf-8"))
    return data[True] if True in data else data["on"]  # bare `on:` parses as True


def test_releases_on_any_glossary_change() -> None:
    paths = _on()["push"]["paths"]
    assert "glossary/**" in paths
    assert not any(p.startswith("!") for p in paths), "no glossary file is excluded"


def test_releases_when_the_workflow_itself_changes() -> None:
    assert ".github/workflows/glossary-release.yml" in _on()["push"]["paths"]


def test_push_trigger_is_main_only() -> None:
    assert _on()["push"]["branches"] == ["main"]


def test_can_be_dispatched_by_hand() -> None:
    assert "workflow_dispatch" in _on()


def _steps() -> dict:
    data = yaml.safe_load(WF.read_text(encoding="utf-8"))
    return {s.get("id") or s.get("name"): s for s in data["jobs"]["release"]["steps"]}


def _git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True).stdout


def _commit(repo: Path, path: str, subject: str) -> None:
    f = repo / path
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(f.read_text() + subject if f.exists() else subject, encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", subject)


def _run_release(repo: Path, tmp_path: Path) -> tuple[dict, str | None]:
    """Run the workflow's version and release steps; return outputs and gh's argv."""
    steps = _steps()
    out_file = tmp_path / "out"
    out_file.write_text("")
    env = {**os.environ, "GITHUB_OUTPUT": str(out_file)}
    subprocess.run(["bash", "-e", "-c", steps["version"]["run"]], cwd=repo, env=env, check=True)
    outputs = dict(line.split("=", 1) for line in out_file.read_text().splitlines() if "=" in line)

    release = steps["Create release"]
    if release["if"] != "steps.version.outputs.changed == 'true'":
        raise AssertionError(f"unexpected release condition: {release['if']}")
    if outputs.get("changed") != "true":
        return outputs, None

    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    gh_log = tmp_path / "gh_args"
    (bin_dir / "gh").write_text(f'#!/bin/bash\nprintf "%s\\n" "$@" > {gh_log}\n')
    (bin_dir / "gh").chmod(0o755)
    step_env = {
        k: v.replace("${{ steps.version.outputs.tag }}", outputs["tag"]).replace(
            "${{ steps.version.outputs.previous }}", outputs.get("previous", "")
        )
        for k, v in release["env"].items()
        if k != "GH_TOKEN"
    }
    env = {**os.environ, **step_env, "PATH": f"{bin_dir}:{os.environ['PATH']}"}
    subprocess.run(["bash", "-e", "-c", release["run"]], cwd=repo, env=env, check=True)
    return outputs, gh_log.read_text()


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    r = tmp_path / "repo"
    r.mkdir()
    _git(r, "init", "-q", "-b", "main")
    _git(r, "config", "user.email", "t@example.com")
    _git(r, "config", "user.name", "t")
    _git(r, "config", "commit.gpgsign", "false")
    _git(r, "config", "tag.gpgsign", "false")
    return r


def test_notes_list_only_glossary_commits_since_previous_release(repo: Path, tmp_path: Path) -> None:
    _commit(repo, "glossary/terms_lookup.yaml", "already released")
    _git(repo, "tag", "glossary-v3")
    _commit(repo, "glossary/AGENTS.md", "new rule")
    _commit(repo, "tools/x.py", "unrelated tool change")

    outputs, gh_args = _run_release(repo, tmp_path)

    assert outputs["tag"] == "glossary-v4"
    assert gh_args is not None
    assert "new rule" in gh_args
    assert "already released" not in gh_args
    assert "unrelated tool change" not in gh_args


def test_no_release_when_glossary_unchanged_since_previous_release(repo: Path, tmp_path: Path) -> None:
    _commit(repo, "glossary/terms_lookup.yaml", "already released")
    _git(repo, "tag", "glossary-v4")
    _commit(repo, ".github/workflows/glossary-release.yml", "workflow tweak")

    outputs, gh_args = _run_release(repo, tmp_path)

    assert outputs["changed"] == "false"
    assert gh_args is None


def test_first_release_lists_glossary_history(repo: Path, tmp_path: Path) -> None:
    _commit(repo, "glossary/terms_lookup.yaml", "initial glossary")

    outputs, gh_args = _run_release(repo, tmp_path)

    assert outputs["tag"] == "glossary-v1"
    assert gh_args is not None and "initial glossary" in gh_args
