"""sync-review-status.py rebuilds a status file that lives outside the checkout.

The file is published on a data branch (push-state.sh), while the script and
the `talks/` it checks issue titles against come from `main`. So the file it
rewrites is named, not assumed to sit in the current directory.

Two properties the readers lean on:

* statuses that did not change leave the file byte-identical, so no commit is
  published and whatever a reader cached stays valid;
* `updated_at` only ever grows along the branch — the SPA keeps the copy with
  the later stamp, which is how a stale answer never replaces a fresh one.
"""

import importlib.util
import json
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / ".github" / "scripts" / "sync-review-status.py"
TALK = "1987-04-19_Easter-Puja-Materialism"
ISSUELESS_TALK = "1970-01-01_Entered-By-Hand"
FAR_FUTURE = "2099-01-01T00:00:00+00:00"


@pytest.fixture
def sync(tmp_path, monkeypatch):
    checkout = tmp_path / "checkout"
    (checkout / "talks" / TALK).mkdir(parents=True)
    monkeypatch.chdir(checkout)
    spec = importlib.util.spec_from_file_location("sync_review_status", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def state_file(tmp_path):
    state_dir = tmp_path / "state"
    state_dir.mkdir()
    return state_dir / "review-status.json"


def _review_issue(label="review:pending"):
    return {
        "number": 411,
        "title": f"Review: {TALK}",
        "labels": [{"name": "talk-review"}, {"name": label}],
        "assignees": [],
        "updatedAt": "2026-11-15T10:00:00Z",
    }


def _status_doc(talks, updated_at="2026-11-01T00:00:00+00:00"):
    return json.dumps({"version": 1, "updated_at": updated_at, "talks": talks})


def _hand_entry():
    return {"status": "approved", "reviewer": "someone", "issue_number": None, "updated_at": "2026-01-01T00:00:00Z"}


def _run(sync, monkeypatch, issues, *argv):
    monkeypatch.setattr(sync, "fetch_issues", lambda: issues)
    assert sync.main([str(a) for a in argv]) == 0


def test_rebuilds_the_named_file_and_leaves_the_checkout_copy_alone(sync, monkeypatch, state_file):
    Path("review-status.json").write_text(_status_doc({}), encoding="utf-8")
    checkout_copy = Path("review-status.json").read_bytes()

    _run(sync, monkeypatch, [_review_issue()], "--status-file", state_file)

    assert json.loads(state_file.read_text())["talks"][TALK]["status"] == "pending"
    assert Path("review-status.json").read_bytes() == checkout_copy


def test_a_missing_status_file_starts_from_the_seed(sync, monkeypatch, state_file):
    Path("review-status.json").write_text(_status_doc({ISSUELESS_TALK: _hand_entry()}), encoding="utf-8")

    _run(sync, monkeypatch, [_review_issue()], "--status-file", state_file, "--seed", "review-status.json")

    talks = json.loads(state_file.read_text())["talks"]
    assert talks[ISSUELESS_TALK] == _hand_entry(), "an entry no issue covers was dropped on the first run"
    assert talks[TALK]["status"] == "pending"


def test_the_seed_is_not_consulted_once_the_status_file_exists(sync, monkeypatch, state_file):
    state_file.write_text(_status_doc({}), encoding="utf-8")
    Path("review-status.json").write_text(_status_doc({ISSUELESS_TALK: _hand_entry()}), encoding="utf-8")

    _run(sync, monkeypatch, [_review_issue()], "--status-file", state_file, "--seed", "review-status.json")

    assert ISSUELESS_TALK not in json.loads(state_file.read_text())["talks"], (
        "an entry removed from the status file came back from the seed"
    )


def test_a_first_run_that_changes_nothing_still_creates_the_file(sync, monkeypatch, state_file):
    Path("review-status.json").write_text(_status_doc({ISSUELESS_TALK: _hand_entry()}), encoding="utf-8")

    _run(sync, monkeypatch, [], "--status-file", state_file, "--seed", "review-status.json")

    assert json.loads(state_file.read_text())["talks"] == {ISSUELESS_TALK: _hand_entry()}


def test_unchanged_statuses_leave_the_file_byte_identical(sync, monkeypatch, state_file):
    _run(sync, monkeypatch, [_review_issue()], "--status-file", state_file)
    first = state_file.read_bytes()

    _run(sync, monkeypatch, [_review_issue()], "--status-file", state_file)

    assert state_file.read_bytes() == first


def test_a_changed_status_rewrites_the_file(sync, monkeypatch, state_file):
    _run(sync, monkeypatch, [_review_issue("review:pending")], "--status-file", state_file)

    _run(sync, monkeypatch, [_review_issue("review:approved")], "--status-file", state_file)

    assert json.loads(state_file.read_text())["talks"][TALK]["status"] == "approved"


def test_a_rewrite_is_stamped_later_than_the_file_it_replaces(sync, monkeypatch, state_file):
    """A runner whose clock trails the one that wrote the previous commit must
    not publish an older stamp: readers would then keep the previous copy."""
    state_file.write_text(_status_doc({}, updated_at=FAR_FUTURE), encoding="utf-8")

    _run(sync, monkeypatch, [_review_issue()], "--status-file", state_file)

    assert json.loads(state_file.read_text())["updated_at"] > FAR_FUTURE


def test_the_first_file_is_stamped_later_than_its_seed(sync, monkeypatch, state_file):
    Path("review-status.json").write_text(_status_doc({}, updated_at=FAR_FUTURE), encoding="utf-8")

    _run(sync, monkeypatch, [_review_issue()], "--status-file", state_file, "--seed", "review-status.json")

    assert json.loads(state_file.read_text())["updated_at"] > FAR_FUTURE
