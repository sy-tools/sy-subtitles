#!/usr/bin/env python3
"""Rebuild review-status.json from GitHub review-tracking issues.

Source of truth: issues labeled `talk-review` (the translator's
`Review: {talk_id}`, created by the pipeline) and `talk-operator` (the
operator's `Operator: {talk_id}`, see tools/talk_operator.py).

`status` stays the translator's state because the SPA reads it; the operator
issue adds `operator_stage`, `operator` and `operator_issue` to the entry.

Preserves manually-set entries for talk_ids not covered by any issue.

Run from a checkout of `main`: `talks/` there says which talks exist. The file
itself is published on a data branch (.github/scripts/push-state.sh), so
`--status-file` names it; `--seed` is what a status file that does not exist
yet starts from.

Requires GH_TOKEN in env (for `gh issue list`).
"""

import argparse
import copy
import json
import subprocess
import sys
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
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


def read_status(path: Path | None) -> dict:
    if path is None or not path.exists():
        return {}
    try:
        document = json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}
    return document if isinstance(document, dict) else {}


def stamp_after(previous: str | None) -> str:
    """Now, or just past `previous` when the clock has not got there yet.

    Readers keep whichever copy carries the later `updated_at`, so along the
    branch it may only grow — also when this runner's clock trails the one
    that wrote the commit before.
    """
    now = datetime.now(UTC)
    try:
        floor = datetime.fromisoformat(previous) if previous else None
    except ValueError:
        floor = None
    if floor is not None and floor.tzinfo is not None and now <= floor:
        now = floor + timedelta(microseconds=1)
    return now.isoformat()


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


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rebuild review-status.json from GitHub review-tracking issues.")
    parser.add_argument("--status-file", type=Path, default=STATUS_FILE, help="the file to rebuild")
    parser.add_argument("--seed", type=Path, help="statuses to start from while --status-file does not exist")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or [])
    published = args.status_file.exists()
    base = read_status(args.status_file if published else args.seed)

    talks = copy.deepcopy(base.get("talks", {}))
    issues = fetch_issues()
    apply_issues(talks, issues)

    # Rewriting an unchanged file would only move its stamp: a commit on the
    # data branch for nothing, and every reader's cached copy thrown away.
    if published and talks == base.get("talks"):
        print(f"Statuses unchanged ({len(talks)} talks, {len(issues)} issues)")
        return 0

    output = {
        "version": 1,
        "updated_at": stamp_after(base.get("updated_at")),
        "talks": talks,
    }
    args.status_file.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"Synced {len(talks)} talk statuses ({len(issues)} from issues)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
