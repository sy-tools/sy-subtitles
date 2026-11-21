"""Lifecycle of a talk's `Operator: {talk_id}` issue.

The issue's `op:*` label is the talk's operator stage:

    op:pipeline   the talk was added; the subtitle pipeline has not finished
                  (how far it got is read from the artifacts, not a label)
    op:translator the pipeline created `Review:`; the translator has the talk
    op:review     a translator sync PR is ready and awaits the operator
    op:qa         the translator's edits are merged; the operator runs QA
    op:qa-passed  set by the operator: QA done, build the Amruta package
    op:ready      package committed, e-mail link posted
    op:delivered  the operator closed the issue after sending the e-mail

Changes made with the workflow's GITHUB_TOKEN fire no other workflow, so
when this module closes the `Review:` issue it also sets `review:approved`
itself instead of relying on the sync-review-status close handler.

    python -m tools.talk_operator talk-added --talk T       # a new meta.yaml on main
    python -m tools.talk_operator review-created --talk T   # the pipeline's Review: step
    python -m tools.talk_operator migrate-pipeline [--apply]
    python -m tools.talk_operator pr-ready --branch B --pr N
    python -m tools.talk_operator pr-merged --branch B --pr N
    python -m tools.talk_operator qa-passed --issue N      # prints package|skip
    python -m tools.talk_operator packaged --issue N --comment-file F
    python -m tools.talk_operator closed --issue N         # prints deliver|skip
    python -m tools.talk_operator delivered --issue N      # after the record landed
"""

import argparse
import json
import re
import subprocess
from pathlib import Path

import yaml

from tools.roles import is_operator, operator_login
from tools.video_roles import RoleError
from tools.video_roles import text_only as _talk_dir_text_only
from tools.workflow_validation import TALK_ID_RE

ROOT = Path(__file__).resolve().parents[1]

OPERATOR_LABEL = "talk-operator"
REVIEW_LABEL = "talk-review"
STAGES = ("op:pipeline", "op:translator", "op:review", "op:qa", "op:ready", "op:delivered")
PRE_PHASE = {"op:pipeline", "op:translator"}
QA_PASSED = "op:qa-passed"
# Trigger label: the operator takes a talk from the translator to QA with no
# translator PR (the edits landed some other way). The bot removes it.
TAKE = "op:take"
SYNC_BRANCH = re.compile(r"^sync/[^/]+/(?P<talk>.+?)--[^/]+$")


def talk_id_from_branch(branch: str) -> str | None:
    m = SYNC_BRANCH.match(branch or "")
    if not m or not TALK_ID_RE.fullmatch(m.group("talk")):
        return None
    return m.group("talk")


def talk_exists(talk_id: str) -> bool:
    return (ROOT / "talks" / talk_id / "meta.yaml").is_file()


def talk_text_only(talk_id: str) -> bool:
    """A text-only talk: no counted video, so the issue copy speaks of the transcript.

    Only the wording depends on it, so a meta.yaml that cannot be read or
    parsed falls back to the video copy rather than failing the handler.
    """
    try:
        return _talk_dir_text_only(ROOT / "talks" / talk_id)
    except (RoleError, OSError, ValueError, TypeError, yaml.YAMLError):
        return False


def operator_title(talk_id: str) -> str:
    return f"Operator: {talk_id}"


def next_labels(
    current: set[str], event: str, *, other_open_ready_prs: bool = False
) -> tuple[set[str], set[str]] | None:
    if "op:delivered" in current and event in ("pr-ready", "pr-merged"):
        return None
    if event == "pr-ready":
        if "op:review" in current:
            return None
        later = {"op:qa", "op:ready", QA_PASSED}
        return {"op:review"}, (later if current & later else set()) | (current & PRE_PHASE)
    if event == "pr-merged":
        if other_open_ready_prs or "op:qa" in current or "op:ready" in current:
            return None
        return {"op:qa"}, current & ({"op:review"} | PRE_PHASE)
    if event == "review-created":
        if "op:pipeline" in current:
            return {"op:translator"}, {"op:pipeline"}
        return None
    if event == "packaged":
        if QA_PASSED in current:
            return {"op:ready"}, {"op:qa", QA_PASSED}
        return None
    if event == "take":
        if "op:translator" in current:
            return {"op:qa"}, {"op:translator", TAKE}
        return None
    if event == "closed":
        if "op:ready" in current:
            return {"op:delivered"}, {"op:ready"}
        return None
    raise ValueError(f"unknown event {event!r}")


def _issue_body(talk_id: str, pr_number: int, text_only: bool = False) -> str:
    checks = (
        "- [ ] Transcript read in full against the English\n\n"
        if text_only
        else "- [ ] First video watched in full with subtitles\n- [ ] Other videos: subtitles present and in sync\n\n"
    )
    return (
        f"Operator work on `{talk_id}`.\n\n"
        f"Translator PR: #{pr_number}\n\n"
        "### QA\n"
        f"{checks}"
        f"When QA is done, add the label `{QA_PASSED}`.\n"
    )


def _new_talk_body(talk_id: str, text_only: bool = False) -> str:
    built = "Translation and review built" if text_only else "Whisper, translation, review and subtitles built"
    return (
        f"Operator work on `{talk_id}`.\n\n"
        "### Before the translator\n"
        f"- [ ] Run `subtitle-pipeline.yml` for `{talk_id}` (the SPA's Run pipeline)\n"
        f"- [ ] {built}\n\n"
        "The pipeline moves this issue to `op:translator` when it opens the `Review:` issue.\n"
    )


def _translator_body(talk_id: str, text_only: bool = False) -> str:
    done = "the translation is done" if text_only else "subtitles are built"
    return (
        f"Operator work on `{talk_id}`.\n\n"
        f"The subtitle pipeline is done: {done} and the `Review:` issue is open.\n"
        "This issue moves to `op:review` when the translator's sync PR is ready.\n"
    )


def _create(gh, talk_id: str, stage: str, body: str) -> int:
    return gh.create_issue(operator_title(talk_id), body, [OPERATOR_LABEL, stage], operator_login())


def on_talk_added(gh, talk_id: str, talk_exists=talk_exists, text_only=talk_text_only) -> None:
    if not TALK_ID_RE.fullmatch(talk_id or "") or not talk_exists(talk_id):
        return
    if gh.find_issue(operator_title(talk_id), OPERATOR_LABEL) is None:
        _create(gh, talk_id, "op:pipeline", _new_talk_body(talk_id, text_only(talk_id)))


def on_review_created(gh, talk_id: str, talk_exists=talk_exists, text_only=talk_text_only) -> None:
    # Existing talks predate the pre-phase: their issue starts here. A rebuild
    # of a talk past the translator is the operator's own act and moves nothing.
    if not TALK_ID_RE.fullmatch(talk_id or "") or not talk_exists(talk_id):
        return
    issue = gh.find_issue(operator_title(talk_id), OPERATOR_LABEL)
    if issue is None:
        _create(gh, talk_id, "op:translator", _translator_body(talk_id, text_only(talk_id)))
        return
    _apply(gh, issue, next_labels(issue["labels"], "review-created"))


def migrate_pipeline(gh, talk_ids: list[str], apply: bool) -> list[str]:
    """Talks still before the pipeline's end (no `Review:` yet) with no
    `Operator:` issue; with apply, open one at op:pipeline for each."""
    reviewed = gh.titles(REVIEW_LABEL)
    operated = gh.titles(OPERATOR_LABEL)
    waiting = [
        t
        for t in talk_ids
        if TALK_ID_RE.fullmatch(t) and f"Review: {t}" not in reviewed and operator_title(t) not in operated
    ]
    if apply:
        for t in waiting:
            _create(gh, t, "op:pipeline", _new_talk_body(t, talk_text_only(t)))
    return waiting


def _apply(gh, issue: dict, change) -> None:
    if change:
        add, remove = change
        gh.edit_labels(issue["number"], add, remove)


def _approve_review(gh, talk_id: str) -> None:
    review = gh.find_issue(f"Review: {talk_id}", REVIEW_LABEL)
    if review and review["state"] == "OPEN":
        gh.edit_labels(review["number"], {"review:approved"}, {"review:pending", "review:in-progress"})
        gh.close(review["number"])


def on_pr_ready(gh, branch: str, pr_number: int, talk_exists=talk_exists, text_only=talk_text_only) -> None:
    talk_id = talk_id_from_branch(branch)
    if not talk_id or not talk_exists(talk_id):
        return
    issue = gh.find_issue(operator_title(talk_id), OPERATOR_LABEL)
    if issue is None:
        gh.create_issue(
            operator_title(talk_id),
            _issue_body(talk_id, pr_number, text_only(talk_id)),
            [OPERATOR_LABEL, "op:review"],
            operator_login(),
        )
        return
    change = next_labels(issue["labels"], "pr-ready")
    if change is None:
        return
    if issue["state"] != "OPEN":
        gh.reopen(issue["number"])
    _apply(gh, issue, change)
    gh.comment(issue["number"], f"Translator PR #{pr_number} is ready for review.")


def on_pr_merged(gh, branch: str, pr_number: int, talk_exists=talk_exists, text_only=talk_text_only) -> None:
    talk_id = talk_id_from_branch(branch)
    if not talk_id or not talk_exists(talk_id):
        return
    others = [p for p in gh.open_sync_prs(talk_id) if p["number"] != pr_number]
    issue = gh.find_issue(operator_title(talk_id), OPERATOR_LABEL)
    if issue is None:
        stage = "op:review" if others else "op:qa"
        gh.create_issue(
            operator_title(talk_id),
            _issue_body(talk_id, pr_number, text_only(talk_id)),
            [OPERATOR_LABEL, stage],
            operator_login(),
        )
        if stage == "op:qa":
            _approve_review(gh, talk_id)
        return
    change = next_labels(issue["labels"], "pr-merged", other_open_ready_prs=bool(others))
    if change is None:
        return
    _apply(gh, issue, change)
    _approve_review(gh, talk_id)


def on_qa_passed(gh, issue_number: int, sender_id: int) -> bool:
    # Labels are open to anyone with triage access, translators included;
    # only an operator from roles.yaml may pass QA.
    issue = gh.get_issue(issue_number)
    if not is_operator(sender_id):
        gh.edit_labels(issue_number, set(), {QA_PASSED})
        gh.comment(issue_number, f"`{QA_PASSED}` removed: only an operator listed in roles.yaml can pass QA.")
        return False
    if "op:qa" in issue["labels"]:
        return True
    gh.edit_labels(issue_number, set(), {QA_PASSED})
    gh.comment(issue_number, f"`{QA_PASSED}` removed: QA can pass only at `op:qa`, after the translator PR is merged.")
    return False


def on_take(gh, issue_number: int, sender_id: int) -> bool:
    # Same trust rule as on_qa_passed: the label is open to anyone with triage
    # access, so only an operator from roles.yaml may move the stage with it.
    issue = gh.get_issue(issue_number)
    if not is_operator(sender_id):
        gh.edit_labels(issue_number, set(), {TAKE})
        gh.comment(issue_number, f"`{TAKE}` removed: only an operator listed in roles.yaml can take a talk to QA.")
        return False
    change = next_labels(issue["labels"], "take")
    if change is None:
        gh.edit_labels(issue_number, set(), {TAKE})
        gh.comment(issue_number, f"`{TAKE}` removed: a talk can be taken to QA only from `op:translator`.")
        return False
    _apply(gh, issue, change)
    _approve_review(gh, issue["title"].removeprefix("Operator: "))
    gh.comment(
        issue_number,
        "Taken to QA by the operator without a translator PR; the `Review:` issue is closed as approved.",
    )
    return True


def on_packaged(gh, issue_number: int, comment_md: str) -> None:
    issue = gh.get_issue(issue_number)
    _apply(gh, issue, next_labels(issue["labels"], "packaged"))
    gh.comment(issue_number, comment_md)


def on_closed(gh, issue_number: int, sender_id: int) -> bool:
    if next_labels(gh.get_issue(issue_number)["labels"], "closed") is None:
        return False
    if not is_operator(sender_id):
        gh.reopen(issue_number)
        gh.comment(
            issue_number,
            "Reopened: only an operator listed in roles.yaml can record the delivery by closing this issue.",
        )
        return False
    return True


def on_delivered(gh, issue_number: int) -> None:
    issue = gh.get_issue(issue_number)
    _apply(gh, issue, next_labels(issue["labels"], "closed"))


class Gh:
    """`gh` CLI against the repo in GH_REPO (set by the workflow)."""

    def _run(self, *args: str) -> str:
        return subprocess.run(["gh", *args], capture_output=True, text=True, check=True).stdout

    @staticmethod
    def _norm(issue: dict) -> dict:
        return {
            "number": issue["number"],
            "title": issue["title"],
            "state": issue["state"],
            "labels": {lbl["name"] for lbl in issue.get("labels", [])},
        }

    def find_issue(self, title: str, label: str) -> dict | None:
        # The REST list, not `gh issue list --search`: search goes through an
        # index that lags, and a lookup seconds after a create would miss it.
        out = self._run(
            "api",
            "-X",
            "GET",
            "repos/{owner}/{repo}/issues",
            "--paginate",
            "-f",
            f"labels={label}",
            "-f",
            "state=all",
            "-f",
            "per_page=100",
            "--jq",
            ".[] | {number, title, state, labels}",
        )
        issues = [json.loads(line) for line in out.splitlines() if line.strip()]
        hits = [dict(self._norm(i), state=i["state"].upper()) for i in issues if i["title"] == title]
        return max(hits, key=lambda i: i["number"]) if hits else None

    def get_issue(self, number: int) -> dict:
        return self._norm(json.loads(self._run("issue", "view", str(number), "--json", "number,title,state,labels")))

    def create_issue(self, title: str, body: str, labels: list[str], assignee: str) -> int:
        url = self._run(
            "issue", "create", "--title", title, "--body", body, "--label", ",".join(labels), "--assignee", assignee
        ).strip()
        return int(url.rsplit("/", 1)[-1])

    def edit_labels(self, number: int, add: set[str], remove: set[str]) -> None:
        args = ["issue", "edit", str(number)]
        if add:
            args += ["--add-label", ",".join(sorted(add))]
        if remove:
            args += ["--remove-label", ",".join(sorted(remove))]
        self._run(*args)

    def comment(self, number: int, body: str) -> None:
        self._run("issue", "comment", str(number), "--body", body)

    def close(self, number: int, reason: str = "completed") -> None:
        self._run("issue", "close", str(number), "--reason", reason)

    def reopen(self, number: int) -> None:
        self._run("issue", "reopen", str(number))

    def titles(self, label: str) -> set[str]:
        out = self._run(
            "api",
            "-X",
            "GET",
            "repos/{owner}/{repo}/issues",
            "--paginate",
            "-f",
            f"labels={label}",
            "-f",
            "state=all",
            "-f",
            "per_page=100",
            "--jq",
            ".[].title",
        )
        return {line for line in out.splitlines() if line.strip()}

    def open_sync_prs(self, talk_id: str) -> list[dict]:
        out = self._run("pr", "list", "--state", "open", "--json", "number,headRefName,isDraft", "--limit", "200")
        return [p for p in json.loads(out) if not p["isDraft"] and talk_id_from_branch(p["headRefName"]) == talk_id]


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Drive a talk's Operator: issue from PR and issue events")
    sub = parser.add_subparsers(dest="cmd", required=True)
    for name in ("pr-ready", "pr-merged"):
        p = sub.add_parser(name, help=f"handle a translator sync PR event ({name})")
        p.add_argument("--branch", required=True, help="PR head branch, sync/{login}/{talk_id}--{target}")
        p.add_argument("--pr", type=int, required=True, help="PR number")
    for name in ("qa-passed", "take", "closed", "delivered"):
        p = sub.add_parser(name, help=f"handle an Operator: issue event ({name})")
        p.add_argument("--issue", type=int, required=True)
        if name != "delivered":
            p.add_argument(
                "--sender-id", type=int, required=True, help="numeric id of the user who labelled or closed the issue"
            )
    for name in ("talk-added", "review-created"):
        p = sub.add_parser(name, help=f"open or move the Operator issue ({name})")
        p.add_argument("--talk", required=True, help="talk id")
    p = sub.add_parser("migrate-pipeline", help="open op:pipeline issues for talks the pipeline has not finished")
    p.add_argument("--apply", action="store_true", help="create the issues (default: only list them)")
    p = sub.add_parser("packaged", help="mark the package committed and post the e-mail comment")
    p.add_argument("--issue", type=int, required=True)
    p.add_argument("--comment-file", required=True, help="markdown written by amruta_package --comment-out")
    args = parser.parse_args(argv)

    gh = Gh()
    if args.cmd == "talk-added":
        on_talk_added(gh, args.talk)
    elif args.cmd == "review-created":
        on_review_created(gh, args.talk)
    elif args.cmd == "migrate-pipeline":
        talks = sorted(p.parent.name for p in (ROOT / "talks").glob("*/meta.yaml"))
        for t in migrate_pipeline(gh, talks, args.apply):
            print(("created " if args.apply else "would create ") + operator_title(t))
    elif args.cmd == "pr-ready":
        on_pr_ready(gh, args.branch, args.pr)
    elif args.cmd == "pr-merged":
        on_pr_merged(gh, args.branch, args.pr)
    elif args.cmd == "qa-passed":
        print("package" if on_qa_passed(gh, args.issue, args.sender_id) else "skip")
    elif args.cmd == "take":
        print("taken" if on_take(gh, args.issue, args.sender_id) else "skip")
    elif args.cmd == "packaged":
        on_packaged(gh, args.issue, Path(args.comment_file).read_text(encoding="utf-8"))
    elif args.cmd == "closed":
        print("deliver" if on_closed(gh, args.issue, args.sender_id) else "skip")
    elif args.cmd == "delivered":
        on_delivered(gh, args.issue)


if __name__ == "__main__":
    main()
