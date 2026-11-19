#!/usr/bin/env python3
"""Rebuild review-status.json from GitHub review-tracking issues.

Source of truth: issues labeled `talk-review` (the translator's
`Review: {talk_id}`, created by the pipeline) and `talk-operator` (the
operator's `Operator: {talk_id}`, see tools/talk_operator.py).

`status` stays the translator's state because the SPA reads it; the operator
issue adds `operator_stage`, `operator` and `operator_issue` to the entry.

Preserves manually-set entries for talk_ids not covered by any issue.

Requires GH_TOKEN in env (for `gh issue list`).
"""

import json
import subprocess
import sys
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

STATUS_FILE = Path("review-status.json")
GATE_LABEL = "talk-review"
TITLE_PREFIX = "Review: "
OPERATOR_LABEL = "talk-operator"
OPERATOR_PREFIX = "Operator: "
OPERATOR_STAGES = (
    ("op:delivered", "delivered"),
    ("op:ready", "ready"),
    ("op:qa", "qa"),
    ("op:review", "review"),
    ("op:translator", "translator"),
    ("op:pipeline", "pipeline"),
)


def load_existing() -> dict:
    if not STATUS_FILE.exists():
        return {}
    try:
        return json.loads(STATUS_FILE.read_text()).get("talks", {})
    except json.JSONDecodeError:
        return {}


def fetch_issues() -> list[dict]:
    result = subprocess.run(
        [
            "gh",
            "issue",
            "list",
            "--search",
            f"label:{GATE_LABEL},{OPERATOR_LABEL}",
            "--state",
            "all",
            "--json",
            "number,title,labels,assignees,updatedAt",
            "--limit",
            "500",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


def talk_id_from_title(title: str) -> str | None:
    if title.startswith(TITLE_PREFIX):
        return title[len(TITLE_PREFIX) :].strip()
    return None


def operator_stage(labels: list[str]) -> str | None:
    return next((stage for label, stage in OPERATOR_STAGES if label in labels), None)


def status_from_labels(labels: list[str]) -> str:
    if "review:approved" in labels:
        return "approved"
    if "review:in-progress" in labels:
        return "in-progress"
    return "pending"


def issue_rank(issue: dict) -> tuple[str, int]:
    """Sort key picking the live issue out of same-talk duplicates.

    Freshest activity wins (`updatedAt` is ISO-8601 Z, so it sorts as text);
    the higher number breaks a tie. Never rely on the order `gh issue list`
    returns — it is newest-created first, so a plain last-write-wins loop
    hands the talk to the *stalest* duplicate.
    """
    return (issue.get("updatedAt") or "", issue["number"])


def talk_dir_exists(talk_id: str) -> bool:
    return (Path("talks") / talk_id).is_dir()


def apply_issues(talks: dict, issues: list[dict], talk_exists: Callable[[str], bool] = talk_dir_exists) -> dict:
    """Overlay the statuses `issues` describe onto `talks`, in place.

    The mapping itself, free of `gh` and of the working directory, because it
    has a twin: site/js/review_status_live.js computes the same statuses in the
    SPA. tests/fixtures/review_status_mapping.json holds both to one answer.
    """
    # Group first: a talk can carry more than one `talk-review` issue (the
    # pipeline creates one; the SPA's "take for review" creates another when its
    # cached review-status has no issue number yet). One of them must win, and
    # the choice must not depend on list order.
    by_talk: dict[str, list[dict]] = {}
    by_talk_operator: dict[str, list[dict]] = {}
    for issue in issues:
        names = {lbl["name"] for lbl in issue.get("labels", [])}
        if issue["title"].startswith(OPERATOR_PREFIX) and OPERATOR_LABEL in names:
            by_talk_operator.setdefault(issue["title"][len(OPERATOR_PREFIX) :].strip(), []).append(issue)
            continue
        talk_id = talk_id_from_title(issue["title"])
        if not talk_id:
            print(
                f"warning: issue #{issue['number']} has `{GATE_LABEL}` label but "
                f"title does not start with `{TITLE_PREFIX}` — skipping: {issue['title']!r}",
                file=sys.stderr,
            )
            continue
        by_talk.setdefault(talk_id, []).append(issue)

    for talk_id, group in by_talk.items():
        winner, *duplicates = sorted(group, key=issue_rank, reverse=True)
        if duplicates:
            dropped = ", ".join(f"#{i['number']}" for i in duplicates)
            print(
                f"warning: talk `{talk_id}` has {len(group)} `{GATE_LABEL}` issues — "
                f"using #{winner['number']} (latest activity), ignoring {dropped}. "
                f"Remove the `{GATE_LABEL}` label from the stale ones.",
                file=sys.stderr,
            )
        labels = [lbl["name"] for lbl in winner.get("labels", [])]
        assignees = [a["login"] for a in winner.get("assignees", [])]
        talks[talk_id] = {
            "status": status_from_labels(labels),
            "reviewer": assignees[0] if assignees else None,
            "issue_number": winner["number"],
            "updated_at": winner["updatedAt"],
        }

    for talk_id, group in by_talk_operator.items():
        if not talk_exists(talk_id):
            print(f"warning: `Operator: {talk_id}` names no talk in talks/ — skipping", file=sys.stderr)
            continue
        winner = max(group, key=issue_rank)
        labels = [lbl["name"] for lbl in winner.get("labels", [])]
        assignees = [a["login"] for a in winner.get("assignees", [])]
        entry = talks.setdefault(
            talk_id,
            {"status": "pending", "reviewer": None, "issue_number": None, "updated_at": winner["updatedAt"]},
        )
        entry["operator_stage"] = operator_stage(labels)
        entry["operator"] = assignees[0] if assignees else None
        entry["operator_issue"] = winner["number"]

    return talks


def main() -> int:
    talks = load_existing()
    issues = fetch_issues()
    apply_issues(talks, issues)

    output = {
        "version": 1,
        "updated_at": datetime.now(UTC).isoformat(),
        "talks": talks,
    }
    STATUS_FILE.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"Synced {len(talks)} talk statuses ({len(issues)} from issues)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
