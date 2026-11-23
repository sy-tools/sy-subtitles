"""Structural guards for the glossary release workflow.

A release must follow ANY change under `glossary/`: the translator rules
(`AGENTS.md`), its README and every dictionary are read by the agents that
translate and review, so each of them is part of what a glossary version is.

The workflow file itself is a trigger too, so that a change to how releases
are cut produces one on merge, and `workflow_dispatch` lets a missed release
be cut by hand.
"""

from pathlib import Path

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
