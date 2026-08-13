"""Duplicate `talk-review` issues must not corrupt a talk's review status.

Two issues can carry the same `Review: <talk_id>` title — the pipeline creates
one, and the SPA's "take for review" can create another when its cached
review-status has no issue number for the talk. That happened for
2004-07-04_Guru-Puja-Follow-My-Message-of-Love (#954 open/pending vs #957
closed/approved/assigned): the sync wrote both entries in list order and the
stale one landed last, so an approved, claimed talk rendered as "needs review"
with no reviewer.

The sync must pick a winner deterministically — the issue with the freshest
activity (`updatedAt`, then the higher number) — and say out loud that it
dropped a duplicate, so the leftover issue gets cleaned up.
"""

import importlib.util
import json
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / ".github" / "scripts" / "sync-review-status.py"


def _load_module():
    spec = importlib.util.spec_from_file_location("sync_review_status", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def sync(tmp_path, monkeypatch):
    """The script module, rooted in a scratch cwd so it writes a throwaway file."""
    monkeypatch.chdir(tmp_path)
    return _load_module()


def _issue(number, talk_id, *, labels=(), assignees=(), updated_at="2026-08-12T07:08:06Z"):
    return {
        "number": number,
        "title": f"Review: {talk_id}",
        "labels": [{"name": name} for name in labels],
        "assignees": [{"login": login} for login in assignees],
        "updatedAt": updated_at,
    }


def _run(sync, monkeypatch, issues):
    monkeypatch.setattr(sync, "fetch_issues", lambda: issues)
    assert sync.main() == 0
    return json.loads(sync.STATUS_FILE.read_text())["talks"]


TALK = "2004-07-04_Guru-Puja-Follow-My-Message-of-Love"

# `gh issue list` returns newest-created first, so the stale duplicate trails
# the live one — exactly the order that made last-write-wins pick the wrong one.
STALE = _issue(954, TALK, labels=["review:pending"], updated_at="2026-08-12T07:08:06Z")
LIVE = _issue(
    957,
    TALK,
    labels=["review:approved"],
    assignees=["SlavaSubotskiy"],
    updated_at="2026-08-12T21:57:55Z",
)


def test_freshest_duplicate_wins_regardless_of_list_order(sync, monkeypatch):
    for order in ([LIVE, STALE], [STALE, LIVE]):
        talks = _run(sync, monkeypatch, order)
        assert talks[TALK] == {
            "status": "approved",
            "reviewer": "SlavaSubotskiy",
            "issue_number": 957,
            "updated_at": "2026-08-12T21:57:55Z",
        }, f"stale duplicate #954 won for list order {[i['number'] for i in order]}"


def test_equal_timestamps_break_the_tie_on_issue_number(sync, monkeypatch):
    same = "2026-08-12T21:57:55Z"
    older = _issue(954, TALK, labels=["review:pending"], updated_at=same)
    newer = _issue(957, TALK, labels=["review:approved"], assignees=["Sy"], updated_at=same)
    talks = _run(sync, monkeypatch, [newer, older])
    assert talks[TALK]["issue_number"] == 957


def test_duplicate_is_reported_on_stderr(sync, monkeypatch, capsys):
    _run(sync, monkeypatch, [LIVE, STALE])
    err = capsys.readouterr().err
    assert "954" in err and "957" in err, f"duplicate not reported: {err!r}"
    assert TALK in err


def test_single_issue_is_unaffected(sync, monkeypatch):
    talks = _run(sync, monkeypatch, [LIVE])
    assert talks[TALK]["issue_number"] == 957
    assert talks[TALK]["status"] == "approved"
