import pytest

from tools import talk_operator as op

TALK = "1987-04-19_Easter-Puja-Materialism"
BRANCH = f"sync/IrynaFilSY/{TALK}--transcript-uk"
OPERATOR_ID = 11644864  # SlavaSubotskiy in roles.yaml
TRANSLATOR_ID = 424242  # anyone else with triage access


class FakeGh:
    def __init__(self, issues=(), open_prs=()):
        self.issues = {i["number"]: dict(i, labels=set(i["labels"])) for i in issues}
        self.open_prs = list(open_prs)
        self.calls = []
        self._next = 1000

    def find_issue(self, title, label):
        hits = [i for i in self.issues.values() if i["title"] == title and label in i["labels"]]
        return max(hits, key=lambda i: i["number"]) if hits else None

    def get_issue(self, number):
        return self.issues[number]

    def create_issue(self, title, body, labels, assignee):
        self._next += 1
        self.issues[self._next] = {"number": self._next, "title": title, "state": "OPEN", "labels": set(labels)}
        self.calls.append(("create", title, tuple(sorted(labels)), assignee, body))
        return self._next

    def edit_labels(self, number, add, remove):
        self.issues[number]["labels"] = (self.issues[number]["labels"] - set(remove)) | set(add)
        self.calls.append(("labels", number, frozenset(add), frozenset(remove)))

    def comment(self, number, body):
        self.calls.append(("comment", number, body))

    def close(self, number, reason="completed"):
        self.issues[number]["state"] = "CLOSED"
        self.calls.append(("close", number, reason))

    def reopen(self, number):
        self.issues[number]["state"] = "OPEN"
        self.calls.append(("reopen", number))

    def open_sync_prs(self, talk_id):
        return [p for p in self.open_prs if op.talk_id_from_branch(p["headRefName"]) == talk_id]


def _operator_issue(number, labels, state="OPEN"):
    return {"number": number, "title": f"Operator: {TALK}", "state": state, "labels": ["talk-operator", *labels]}


def _review_issue(number=411, labels=("review:in-progress",), state="OPEN"):
    return {"number": number, "title": f"Review: {TALK}", "state": state, "labels": ["talk-review", *labels]}


def test_branch_parsing():
    long_id = "1997-05-25_Adi-Shakti-Puja-Respect-the-Mother-Earth-Why-are-we-in-Sahaja-Yoga"
    assert op.talk_id_from_branch(f"sync/IrynaFilSY/{long_id}--transcript-uk") == long_id
    assert op.talk_id_from_branch("fix/easter-puja-1987-blessing") is None
    assert op.talk_id_from_branch("sync/IrynaFilSY/no-target") is None


def test_next_labels_pr_ready_on_new_talk():
    assert op.next_labels(set(), "pr-ready") == ({"op:review"}, set())


@pytest.mark.parametrize("stage", ["op:qa", "op:ready"])
def test_next_labels_pr_ready_after_qa_goes_back_to_review(stage):
    assert op.next_labels({stage, "op:qa-passed"}, "pr-ready") == (
        {"op:review"},
        {"op:qa", "op:ready", "op:qa-passed"},
    )


@pytest.mark.parametrize("event", ["pr-ready", "pr-merged"])
def test_next_labels_delivered_ignores_pr_events(event):
    assert op.next_labels({"op:delivered"}, event) is None


def test_next_labels_pr_merged_moves_to_qa():
    assert op.next_labels({"op:review"}, "pr-merged") == ({"op:qa"}, {"op:review"})


def test_next_labels_pr_merged_waits_for_other_ready_prs():
    assert op.next_labels({"op:review"}, "pr-merged", other_open_ready_prs=True) is None


def test_next_labels_packaged_moves_to_ready():
    assert op.next_labels({"op:qa", "op:qa-passed"}, "packaged") == ({"op:ready"}, {"op:qa", "op:qa-passed"})


def test_next_labels_closed_from_ready_is_delivered():
    assert op.next_labels({"op:ready"}, "closed") == ({"op:delivered"}, {"op:ready"})


@pytest.mark.parametrize("labels", [set(), {"op:review"}, {"op:qa"}])
def test_next_labels_closed_elsewhere_changes_nothing(labels):
    assert op.next_labels(labels, "closed") is None


def test_pr_ready_creates_issue_assigned_to_operator():
    gh = FakeGh()
    op.on_pr_ready(gh, BRANCH, 1240)
    kind, title, labels, assignee, body = gh.calls[0]
    assert (kind, title, labels, assignee) == (
        "create",
        f"Operator: {TALK}",
        ("op:review", "talk-operator"),
        "SlavaSubotskiy",
    )
    assert "#1240" in body
    assert "op:qa-passed" in body


def test_pr_ready_reopens_closed_undelivered_issue():
    gh = FakeGh([_operator_issue(7, ["op:qa"], state="CLOSED")])
    op.on_pr_ready(gh, BRANCH, 1240)
    assert ("reopen", 7) in gh.calls
    assert gh.issues[7]["labels"] == {"talk-operator", "op:review"}


def test_pr_ready_ignores_non_sync_branch():
    gh = FakeGh()
    op.on_pr_ready(gh, "fix/something", 1)
    assert gh.calls == []


def test_pr_merged_closes_review_issue_with_approved_label():
    gh = FakeGh([_operator_issue(7, ["op:review"]), _review_issue()])
    op.on_pr_merged(gh, BRANCH, 1240)
    assert gh.issues[7]["labels"] == {"talk-operator", "op:qa"}
    assert gh.issues[411]["labels"] == {"talk-review", "review:approved"}
    assert ("close", 411, "completed") in gh.calls


def test_pr_merged_with_other_ready_pr_keeps_review_open():
    other = {"number": 1300, "headRefName": f"sync/IrynaFilSY/{TALK}--uk-srt"}
    gh = FakeGh([_operator_issue(7, ["op:review"]), _review_issue()], open_prs=[other])
    op.on_pr_merged(gh, BRANCH, 1240)
    assert gh.issues[7]["labels"] == {"talk-operator", "op:review"}
    assert gh.issues[411]["state"] == "OPEN"


def test_pr_merged_creates_issue_if_missing():
    gh = FakeGh([_review_issue()])
    op.on_pr_merged(gh, BRANCH, 1240)
    created = [c for c in gh.calls if c[0] == "create"]
    assert created and created[0][2] == ("op:qa", "talk-operator")


def test_qa_passed_in_qa_packages():
    gh = FakeGh([_operator_issue(7, ["op:qa", "op:qa-passed"])])
    assert op.on_qa_passed(gh, 7, OPERATOR_ID) is True


def test_qa_passed_while_in_review_does_not_package():
    gh = FakeGh([_operator_issue(7, ["op:review", "op:qa-passed"])])
    assert op.on_qa_passed(gh, 7, OPERATOR_ID) is False
    assert "op:qa-passed" not in gh.issues[7]["labels"]
    assert any(c[0] == "comment" for c in gh.calls)


def test_packaged_sets_ready_and_posts_comment():
    gh = FakeGh([_operator_issue(7, ["op:qa", "op:qa-passed"])])
    op.on_packaged(gh, 7, "### Ready for Amruta")
    assert gh.issues[7]["labels"] == {"talk-operator", "op:ready"}
    assert ("comment", 7, "### Ready for Amruta") in gh.calls


def test_closed_from_ready_asks_for_delivery_record_without_labelling_yet():
    gh = FakeGh([_operator_issue(7, ["op:ready"], state="CLOSED")])
    assert op.on_closed(gh, 7, OPERATOR_ID) is True
    assert gh.issues[7]["labels"] == {"talk-operator", "op:ready"}


def test_delivered_sets_label_after_the_record_lands():
    gh = FakeGh([_operator_issue(7, ["op:ready"], state="CLOSED")])
    op.on_delivered(gh, 7)
    assert gh.issues[7]["labels"] == {"talk-operator", "op:delivered"}


def test_branch_with_invalid_talk_id_is_ignored():
    assert op.talk_id_from_branch("sync/x/../../etc--y") is None
    assert op.talk_id_from_branch("sync/x/not-a-talk--y") is None


@pytest.mark.parametrize("handler", ["on_pr_ready", "on_pr_merged"])
def test_pr_event_for_unknown_talk_is_ignored(handler):
    gh = FakeGh()
    getattr(op, handler)(gh, BRANCH, 1, talk_exists=lambda talk_id: False)
    assert gh.calls == []


def test_closed_from_qa_records_nothing():
    gh = FakeGh([_operator_issue(7, ["op:qa"], state="CLOSED")])
    assert op.on_closed(gh, 7, OPERATOR_ID) is False
    assert gh.calls == []


def test_qa_passed_by_a_non_operator_is_undone():
    gh = FakeGh([_operator_issue(7, ["op:qa", "op:qa-passed"])])
    assert op.on_qa_passed(gh, 7, TRANSLATOR_ID) is False
    assert gh.issues[7]["labels"] == {"talk-operator", "op:qa"}
    assert any(c[0] == "comment" and "operator" in c[2] for c in gh.calls)


def test_close_at_ready_by_a_non_operator_reopens_and_records_nothing():
    gh = FakeGh([_operator_issue(7, ["op:ready"], state="CLOSED")])
    assert op.on_closed(gh, 7, TRANSLATOR_ID) is False
    assert gh.issues[7]["state"] == "OPEN"
    assert gh.issues[7]["labels"] == {"talk-operator", "op:ready"}
    assert any(c[0] == "comment" and "operator" in c[2] for c in gh.calls)


def test_close_elsewhere_by_a_non_operator_is_left_alone():
    gh = FakeGh([_operator_issue(7, ["op:delivered"], state="CLOSED")])
    assert op.on_closed(gh, 7, TRANSLATOR_ID) is False
    assert gh.calls == []
