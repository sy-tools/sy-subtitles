"""Lifecycle of a talk's `Operator: {talk_id}` issue.

The issue's `op:*` label is the talk's operator stage:

    op:review     a translator sync PR is ready and awaits the operator
    op:qa         the translator's edits are merged; the operator runs QA
    op:qa-passed  set by the operator: QA done, build the Amruta package
    op:ready      package committed, e-mail link posted
    op:delivered  the operator closed the issue after sending the e-mail

Changes made with the workflow's GITHUB_TOKEN fire no other workflow, so
when this module closes the `Review:` issue it also sets `review:approved`
itself instead of relying on the sync-review-status close handler.

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

from tools.roles import is_operator, operator_login
from tools.workflow_validation import TALK_ID_RE

ROOT = Path(__file__).resolve().parents[1]

OPERATOR_LABEL = "talk-operator"
REVIEW_LABEL = "talk-review"
STAGES = ("op:review", "op:qa", "op:ready", "op:delivered")
QA_PASSED = "op:qa-passed"
SYNC_BRANCH = re.compile(r"^sync/[^/]+/(?P<talk>.+?)--[^/]+$")


def talk_id_from_branch(branch: str) -> str | None:
    m = SYNC_BRANCH.match(branch or "")
    if not m or not TALK_ID_RE.fullmatch(m.group("talk")):
        return None
    return m.group("talk")


def talk_exists(talk_id: str) -> bool:
    return (ROOT / "talks" / talk_id / "meta.yaml").is_file()


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
        return {"op:review"}, later if current & later else set()
    if event == "pr-merged":
        if other_open_ready_prs or "op:qa" in current or "op:ready" in current:
            return None
        return {"op:qa"}, current & {"op:review"}
    if event == "packaged":
        if QA_PASSED in current:
            return {"op:ready"}, {"op:qa", QA_PASSED}
        return None
    if event == "closed":
        if "op:ready" in current:
            return {"op:delivered"}, {"op:ready"}
        return None
    raise ValueError(f"unknown event {event!r}")


def _issue_body(talk_id: str, pr_number: int) -> str:
    return (
        f"Operator work on `{talk_id}`.\n\n"
        f"Translator PR: #{pr_number}\n\n"
        "### QA\n"
        "- [ ] First video watched in full with subtitles\n"
        "- [ ] Other videos: subtitles present and in sync\n\n"
        f"When QA is done, add the label `{QA_PASSED}`.\n"
    )


def _apply(gh, issue: dict, change) -> None:
    if change:
        add, remove = change
        gh.edit_labels(issue["number"], add, remove)


def _approve_review(gh, talk_id: str) -> None:
    review = gh.find_issue(f"Review: {talk_id}", REVIEW_LABEL)
    if review and review["state"] == "OPEN":
        gh.edit_labels(review["number"], {"review:approved"}, {"review:pending", "review:in-progress"})
        gh.close(review["number"])


def on_pr_ready(gh, branch: str, pr_number: int, talk_exists=talk_exists) -> None:
    talk_id = talk_id_from_branch(branch)
    if not talk_id or not talk_exists(talk_id):
        return
    issue = gh.find_issue(operator_title(talk_id), OPERATOR_LABEL)
    if issue is None:
        gh.create_issue(
            operator_title(talk_id), _issue_body(talk_id, pr_number), [OPERATOR_LABEL, "op:review"], operator_login()
        )
        return
    change = next_labels(issue["labels"], "pr-ready")
    if change is None:
        return
    if issue["state"] != "OPEN":
        gh.reopen(issue["number"])
    _apply(gh, issue, change)
    gh.comment(issue["number"], f"Translator PR #{pr_number} is ready for review.")


def on_pr_merged(gh, branch: str, pr_number: int, talk_exists=talk_exists) -> None:
    talk_id = talk_id_from_branch(branch)
    if not talk_id or not talk_exists(talk_id):
        return
    others = [p for p in gh.open_sync_prs(talk_id) if p["number"] != pr_number]
    issue = gh.find_issue(operator_title(talk_id), OPERATOR_LABEL)
    if issue is None:
        stage = "op:review" if others else "op:qa"
        gh.create_issue(
            operator_title(talk_id), _issue_body(talk_id, pr_number), [OPERATOR_LABEL, stage], operator_login()
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
    for name in ("qa-passed", "closed", "delivered"):
        p = sub.add_parser(name, help=f"handle an Operator: issue event ({name})")
        p.add_argument("--issue", type=int, required=True)
        if name != "delivered":
            p.add_argument(
                "--sender-id", type=int, required=True, help="numeric id of the user who labelled or closed the issue"
            )
    p = sub.add_parser("packaged", help="mark the package committed and post the e-mail comment")
    p.add_argument("--issue", type=int, required=True)
    p.add_argument("--comment-file", required=True, help="markdown written by amruta_package --comment-out")
    args = parser.parse_args(argv)

    gh = Gh()
    if args.cmd == "pr-ready":
        on_pr_ready(gh, args.branch, args.pr)
    elif args.cmd == "pr-merged":
        on_pr_merged(gh, args.branch, args.pr)
    elif args.cmd == "qa-passed":
        print("package" if on_qa_passed(gh, args.issue, args.sender_id) else "skip")
    elif args.cmd == "packaged":
        on_packaged(gh, args.issue, Path(args.comment_file).read_text(encoding="utf-8"))
    elif args.cmd == "closed":
        print("deliver" if on_closed(gh, args.issue, args.sender_id) else "skip")
    elif args.cmd == "delivered":
        on_delivered(gh, args.issue)


if __name__ == "__main__":
    main()
