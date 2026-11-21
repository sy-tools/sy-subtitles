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

    def titles(self, label, state="all"):
        return {
            i["title"]
            for i in self.issues.values()
            if label in i["labels"] and (state == "all" or i["state"] == state.upper())
        }


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


# --- pre-phase: the issue from the moment a talk is added -----------------


def test_next_labels_review_created_moves_the_pipeline_to_the_translator():
    assert op.next_labels({"op:pipeline"}, "review-created") == ({"op:translator"}, {"op:pipeline"})


@pytest.mark.parametrize("stage", ["op:translator", "op:review", "op:qa", "op:ready", "op:delivered"])
def test_next_labels_review_created_later_changes_nothing(stage):
    assert op.next_labels({stage}, "review-created") is None


@pytest.mark.parametrize("stage", ["op:pipeline", "op:translator"])
def test_next_labels_pr_ready_leaves_the_pre_phase(stage):
    assert op.next_labels({stage}, "pr-ready") == ({"op:review"}, {stage})


def test_next_labels_pr_merged_without_a_ready_event_leaves_the_translator():
    assert op.next_labels({"op:translator"}, "pr-merged") == ({"op:qa"}, {"op:translator"})


def test_talk_added_creates_the_issue_at_pipeline():
    gh = FakeGh()
    op.on_talk_added(gh, TALK, talk_exists=lambda t: True)
    (call,) = gh.calls
    assert call[:4] == ("create", f"Operator: {TALK}", ("op:pipeline", "talk-operator"), "SlavaSubotskiy")


@pytest.mark.parametrize("state", ["OPEN", "CLOSED"])
def test_talk_added_twice_creates_nothing(state):
    gh = FakeGh([_operator_issue(5, ["op:delivered"], state=state)])
    op.on_talk_added(gh, TALK, talk_exists=lambda t: True)
    assert gh.calls == []


def test_talk_added_for_an_unknown_talk_is_ignored():
    gh = FakeGh()
    op.on_talk_added(gh, TALK, talk_exists=lambda t: False)
    assert gh.calls == []


def test_review_created_moves_pipeline_to_translator():
    gh = FakeGh([_operator_issue(5, ["op:pipeline"])])
    op.on_review_created(gh, TALK, talk_exists=lambda t: True)
    assert gh.issues[5]["labels"] == {"talk-operator", "op:translator"}


def test_review_created_without_an_issue_creates_it_at_translator():
    gh = FakeGh()
    op.on_review_created(gh, TALK, talk_exists=lambda t: True)
    (call,) = gh.calls
    assert call[:3] == ("create", f"Operator: {TALK}", ("op:translator", "talk-operator"))


@pytest.mark.parametrize("stage", ["op:qa", "op:ready", "op:delivered"])
def test_a_rebuild_past_the_translator_changes_no_operator_label(stage):
    gh = FakeGh([_operator_issue(5, [stage], state="CLOSED" if stage == "op:delivered" else "OPEN")])
    op.on_review_created(gh, TALK, talk_exists=lambda t: True)
    assert gh.calls == []


def test_migration_lists_only_talks_without_review_or_operator_issue():
    other = "1977-11-01_You-all-are-Shri-Kalki"
    reviewed = "1980-03-23_Birthday-Puja"
    gh = FakeGh(
        [_review_issue(), {"number": 6, "title": f"Review: {reviewed}", "state": "OPEN", "labels": ["talk-review"]}]
    )
    assert op.migrate_pipeline(gh, [TALK, other, reviewed], apply=False) == [other]
    assert gh.calls == []


def test_migration_apply_creates_issues_at_pipeline():
    other = "1977-11-01_You-all-are-Shri-Kalki"
    gh = FakeGh()
    assert op.migrate_pipeline(gh, [other], apply=True) == [other]
    assert gh.calls[0][:3] == ("create", f"Operator: {other}", ("op:pipeline", "talk-operator"))


def test_migration_skips_folders_that_are_not_talk_ids():
    gh = FakeGh()
    assert op.migrate_pipeline(gh, ["_SAHAJ_TIMES_PODCAST_S.3_E.15", TALK], apply=False) == [TALK]


def test_review_created_for_an_older_talk_says_the_pipeline_is_done():
    gh = FakeGh()
    op.on_review_created(gh, TALK, talk_exists=lambda t: True)
    body = gh.calls[0][4]
    assert "subtitles are built" in body
    assert "- [ ] Run" not in body


# A text-only talk has no video and no subtitles: the operator
# reads the transcript instead of watching anything, and the pipeline builds
# a translation, not subtitles.
TEXT_ONLY_TALK = "2001-02-03_Text-Only-Talk"
TEXT_ONLY_BRANCH = f"sync/IrynaFilSY/{TEXT_ONLY_TALK}--transcript-uk"


def _text_only(_talk_id):
    return True


def test_text_only_qa_checklist_reads_the_transcript():
    body = op._issue_body(TEXT_ONLY_TALK, 7, text_only=True)
    assert "- [ ] Transcript read in full against the English" in body
    assert "video" not in body.lower()
    assert "subtitle" not in body.lower()
    assert "op:qa-passed" in body


def test_text_only_new_talk_body_builds_no_subtitles():
    body = op._new_talk_body(TEXT_ONLY_TALK, text_only=True)
    assert "- [ ] Translation and review built" in body
    assert "whisper" not in body.lower()
    assert "subtitle" not in body.lower().replace("subtitle-pipeline.yml", "")


def test_text_only_translator_body_mentions_the_translation():
    body = op._translator_body(TEXT_ONLY_TALK, text_only=True)
    assert "the translation is done" in body
    assert "subtitles" not in body


def test_pr_ready_on_a_text_only_talk_creates_the_text_only_issue():
    gh = FakeGh()
    op.on_pr_ready(gh, TEXT_ONLY_BRANCH, 7, talk_exists=lambda _: True, text_only=_text_only)
    body = gh.calls[0][4]
    assert "Transcript read in full" in body


def test_pr_merged_on_a_text_only_talk_creates_the_text_only_issue():
    gh = FakeGh()
    op.on_pr_merged(gh, TEXT_ONLY_BRANCH, 7, talk_exists=lambda _: True, text_only=_text_only)
    body = next(c for c in gh.calls if c[0] == "create")[4]
    assert "Transcript read in full" in body


def test_talk_added_and_review_created_use_the_text_only_copy():
    gh = FakeGh()
    op.on_talk_added(gh, TEXT_ONLY_TALK, talk_exists=lambda _: True, text_only=_text_only)
    assert "Translation and review built" in gh.calls[0][4]
    gh = FakeGh()
    op.on_review_created(gh, TEXT_ONLY_TALK, talk_exists=lambda _: True, text_only=_text_only)
    assert "the translation is done" in gh.calls[0][4]


def test_talk_text_only_reads_the_talk_folder(tmp_path, monkeypatch):
    (tmp_path / "talks" / TEXT_ONLY_TALK).mkdir(parents=True)
    (tmp_path / "talks" / TEXT_ONLY_TALK / "meta.yaml").write_text("title: Text-only talk\n", encoding="utf-8")
    monkeypatch.setattr(op, "ROOT", tmp_path)
    assert op.talk_text_only(TEXT_ONLY_TALK) is True
    assert op.talk_text_only("2000-01-01_Missing") is False


@pytest.mark.parametrize("meta", ["title: [unclosed\n", "title: T\nvideos:\n"])
def test_talk_text_only_treats_a_broken_meta_as_a_video_talk(tmp_path, monkeypatch, meta):
    """The issue copy is not worth crashing the operator bot over: before
    the text-only check the handlers never parsed meta.yaml at all."""
    (tmp_path / "talks" / TEXT_ONLY_TALK).mkdir(parents=True)
    (tmp_path / "talks" / TEXT_ONLY_TALK / "meta.yaml").write_text(meta, encoding="utf-8")
    monkeypatch.setattr(op, "ROOT", tmp_path)
    assert op.talk_text_only(TEXT_ONLY_TALK) is False


# --- take: the operator takes a talk to QA without a translator PR ---


def test_next_labels_take_from_translator_moves_to_qa():
    assert op.next_labels({"talk-operator", "op:translator", "op:take"}, "take") == (
        {"op:qa"},
        {"op:translator", "op:take"},
    )


@pytest.mark.parametrize("stage", ["op:pipeline", "op:review", "op:qa", "op:ready", "op:delivered"])
def test_next_labels_take_elsewhere_is_none(stage):
    assert op.next_labels({"talk-operator", stage, "op:take"}, "take") is None


def test_take_moves_to_qa_and_closes_review():
    gh = FakeGh([_operator_issue(7, ["op:translator", "op:take"]), _review_issue()])
    assert op.on_take(gh, 7, OPERATOR_ID) is True
    assert gh.issues[7]["labels"] == {"talk-operator", "op:qa"}
    assert "review:approved" in gh.issues[411]["labels"]
    assert "review:in-progress" not in gh.issues[411]["labels"]
    assert gh.issues[411]["state"] == "CLOSED"
    comments = [c for c in gh.calls if c[0] == "comment" and c[1] == 7]
    assert len(comments) == 1 and "without a translator PR" in comments[0][2]


def test_take_by_a_non_operator_is_undone():
    gh = FakeGh([_operator_issue(7, ["op:translator", "op:take"]), _review_issue()])
    assert op.on_take(gh, 7, TRANSLATOR_ID) is False
    assert gh.issues[7]["labels"] == {"talk-operator", "op:translator"}
    assert any(c[0] == "comment" and c[1] == 7 and "roles.yaml" in c[2] for c in gh.calls)
    assert gh.issues[411]["state"] == "OPEN"


def test_take_outside_translator_is_undone():
    gh = FakeGh([_operator_issue(7, ["op:review", "op:take"]), _review_issue()])
    assert op.on_take(gh, 7, OPERATOR_ID) is False
    assert gh.issues[7]["labels"] == {"talk-operator", "op:review"}
    assert any(c[0] == "comment" and c[1] == 7 and "op:translator" in c[2] for c in gh.calls)
    assert gh.issues[411]["state"] == "OPEN"


def test_take_with_review_already_closed_still_moves():
    gh = FakeGh([_operator_issue(7, ["op:translator", "op:take"]), _review_issue(state="CLOSED")])
    assert op.on_take(gh, 7, OPERATOR_ID) is True
    assert "op:qa" in gh.issues[7]["labels"]


def test_cli_take_prints_decision(monkeypatch, capsys):
    gh = FakeGh([_operator_issue(7, ["op:translator", "op:take"]), _review_issue()])
    monkeypatch.setattr(op, "Gh", lambda: gh)
    op.main(["take", "--issue", "7", "--sender-id", str(OPERATOR_ID)])
    assert capsys.readouterr().out.strip() == "taken"


# --- migrate-translator: existing talks at the translator get an Operator: issue ---

OTHER = "1990-01-01_Other-Talk"
CLOSED_ONE = "1991-01-01_Closed-Review"


def _review_of(talk, number, state="OPEN"):
    return {"number": number, "title": f"Review: {talk}", "state": state, "labels": ["talk-review", "review:pending"]}


def _migration_gh():
    return FakeGh(
        [
            _operator_issue(7, ["op:translator"]),
            _review_issue(),
            _review_of(OTHER, 412),
            _review_of(CLOSED_ONE, 413, state="CLOSED"),
        ]
    )


def test_migrate_translator_lists_open_reviews_without_operator():
    gh = _migration_gh()
    assert op.migrate_translator(gh, [TALK, OTHER, CLOSED_ONE], apply=False) == [OTHER]
    assert not [c for c in gh.calls if c[0] == "create"]


def test_migrate_translator_apply_creates_translator_issue(monkeypatch):
    monkeypatch.setattr(op, "talk_text_only", lambda t: False)
    gh = _migration_gh()
    assert op.migrate_translator(gh, [TALK, OTHER, CLOSED_ONE], apply=True, sleep=lambda s: None) == [OTHER]
    creates = [c for c in gh.calls if c[0] == "create"]
    assert creates == [
        (
            "create",
            f"Operator: {OTHER}",
            ("op:translator", "talk-operator"),
            op.operator_login(),
            op._translator_body(OTHER, False),
        )
    ]


def test_migrate_translator_skips_existing_and_closed(monkeypatch):
    monkeypatch.setattr(op, "talk_text_only", lambda t: False)
    gh = _migration_gh()
    op.migrate_translator(gh, [TALK, OTHER, CLOSED_ONE], apply=True, sleep=lambda s: None)
    assert op.migrate_translator(gh, [TALK, OTHER, CLOSED_ONE], apply=True, sleep=lambda s: None) == []


def test_migrate_translator_skips_non_talk_ids():
    podcast = "_SAHAJ_TIMES_PODCAST_S.3_E.15"
    gh = FakeGh([_review_of(podcast, 414)])
    assert op.migrate_translator(gh, [podcast], apply=False) == []


def test_migrate_translator_pauses_between_creations(monkeypatch):
    monkeypatch.setattr(op, "talk_text_only", lambda t: False)
    third = "1992-01-01_Third-Talk"
    gh = FakeGh([_review_of(OTHER, 412), _review_of(third, 415)])
    pauses = []
    op.migrate_translator(gh, [OTHER, third], apply=True, sleep=pauses.append)
    assert 2.0 in pauses


def test_gh_titles_passes_the_state_filter(monkeypatch):
    seen = []
    monkeypatch.setattr(op.Gh, "_run", lambda self, *args: seen.append(args) or "Review: x\n")
    assert op.Gh().titles("talk-review", state="open") == {"Review: x"}
    assert "state=open" in seen[0]


def test_migrate_translator_puts_a_talk_with_a_ready_sync_pr_at_review(monkeypatch):
    # A ready translator PR will never fire pr-ready again, so op:translator
    # would hide the talk from the operator's review chip until it merges.
    monkeypatch.setattr(op, "talk_text_only", lambda t: False)
    ready = {"number": 1085, "headRefName": f"sync/anastasijka-prog/{OTHER}--transcript-uk", "isDraft": False}
    gh = FakeGh([_review_of(OTHER, 412)], open_prs=[ready])
    op.migrate_translator(gh, [OTHER], apply=True, sleep=lambda s: None)
    creates = [c for c in gh.calls if c[0] == "create"]
    assert creates == [
        (
            "create",
            f"Operator: {OTHER}",
            ("op:review", "talk-operator"),
            op.operator_login(),
            op._issue_body(OTHER, 1085, False),
        )
    ]


def test_take_that_fails_to_close_review_can_be_retried():
    # Review: first, labels second: a failed close leaves the issue at
    # op:translator, so re-adding op:take from the SPA retries the whole take.
    gh = FakeGh([_operator_issue(7, ["op:translator", "op:take"]), _review_issue()])

    def boom(number, reason="completed"):
        raise RuntimeError("gh failed")

    gh.close = boom
    with pytest.raises(RuntimeError):
        op.on_take(gh, 7, OPERATOR_ID)
    assert "op:translator" in gh.issues[7]["labels"]
    assert "op:qa" not in gh.issues[7]["labels"]
