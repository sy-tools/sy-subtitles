"""`Operator: {talk_id}` issues add the operator stage to review-status.json.

`status` keeps its meaning (the translator's `Review:` issue) because the SPA
reads it; the operator stage travels in its own fields.
"""

import importlib.util
import json
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / ".github" / "scripts" / "sync-review-status.py"
TALK = "1987-04-19_Easter-Puja-Materialism"


@pytest.fixture
def sync(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    spec = importlib.util.spec_from_file_location("sync_review_status", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _issue(number, title, labels, assignees=(), updated_at="2026-11-15T10:00:00Z"):
    return {
        "number": number,
        "title": title,
        "labels": [{"name": n} for n in labels],
        "assignees": [{"login": a} for a in assignees],
        "updatedAt": updated_at,
    }


def _review(labels=("review:approved",)):
    return _issue(411, f"Review: {TALK}", ["talk-review", *labels], ["SlavaSubotskiy"])


def _operator(labels, number=1300, updated_at="2026-11-15T10:00:00Z"):
    return _issue(number, f"Operator: {TALK}", ["talk-operator", *labels], ["SlavaSubotskiy"], updated_at)


def _run(sync, monkeypatch, issues):
    monkeypatch.setattr(sync, "fetch_issues", lambda: issues)
    assert sync.main() == 0
    return json.loads(sync.STATUS_FILE.read_text())["talks"]


@pytest.mark.parametrize(
    ("labels", "stage"),
    [
        (["op:review"], "review"),
        (["op:qa"], "qa"),
        (["op:qa", "op:qa-passed"], "qa"),
        (["op:ready"], "ready"),
        (["op:delivered"], "delivered"),
    ],
)
def test_operator_stage_from_label(sync, monkeypatch, labels, stage):
    entry = _run(sync, monkeypatch, [_review(), _operator(labels)])[TALK]
    assert entry["operator_stage"] == stage
    assert entry["operator"] == "SlavaSubotskiy"
    assert entry["operator_issue"] == 1300


def test_no_operator_issue_adds_no_operator_fields(sync, monkeypatch):
    entry = _run(sync, monkeypatch, [_review()])[TALK]
    assert "operator_stage" not in entry


def test_status_unchanged_by_operator_issue(sync, monkeypatch):
    entry = _run(sync, monkeypatch, [_review(), _operator(["op:ready"])])[TALK]
    assert entry["status"] == "approved"
    assert entry["issue_number"] == 411


def test_operator_issue_without_review_issue_never_claims_approval(sync, monkeypatch):
    entry = _run(sync, monkeypatch, [_operator(["op:delivered"])])[TALK]
    assert entry["status"] == "pending"
    assert entry["operator_stage"] == "delivered"


def test_operator_title_without_operator_label_is_not_an_operator_issue(sync, monkeypatch):
    impostor = _issue(1400, f"Operator: {TALK}", ["talk-review", "op:delivered"])
    talks = _run(sync, monkeypatch, [_review(), impostor])
    assert "operator_stage" not in talks.get(TALK, {})


def test_operator_duplicates_pick_freshest(sync, monkeypatch):
    stale = _operator(["op:qa"], number=1300, updated_at="2026-11-15T09:00:00Z")
    live = _operator(["op:ready"], number=1310, updated_at="2026-11-15T11:00:00Z")
    entry = _run(sync, monkeypatch, [stale, _review(), live])[TALK]
    assert (entry["operator_stage"], entry["operator_issue"]) == ("ready", 1310)


def test_fetch_asks_for_both_issue_labels(sync, monkeypatch):
    seen = {}

    class Done:
        stdout = "[]"

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        return Done()

    monkeypatch.setattr(sync.subprocess, "run", fake_run)
    sync.fetch_issues()
    assert "label:talk-review,talk-operator" in seen["cmd"]
