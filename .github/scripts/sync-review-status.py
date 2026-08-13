#!/usr/bin/env python3
"""Rebuild review-status.json from GitHub review-tracking issues.

Source of truth: issues labeled `talk-review`. Pipeline applies this label
when creating the initialization issue; no other issue type is tracked.

Preserves manually-set entries for talk_ids not covered by any issue.

Requires GH_TOKEN in env (for `gh issue list`).
"""

import json
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

STATUS_FILE = Path("review-status.json")
GATE_LABEL = "talk-review"
TITLE_PREFIX = "Review: "


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
            f"label:{GATE_LABEL}",
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


def main() -> int:
    talks = load_existing()
    issues = fetch_issues()

    # Group first: a talk can carry more than one `talk-review` issue (the
    # pipeline creates one; the SPA's "take for review" creates another when its
    # cached review-status has no issue number yet). One of them must win, and
    # the choice must not depend on list order.
    by_talk: dict[str, list[dict]] = {}
    for issue in issues:
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
