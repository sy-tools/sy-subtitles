"""Project roles from roles.yaml (repo root).

The SPA and the talk-operator workflow both read this file; identity is the
numeric GitHub user id, never the login (see roles.yaml).

    python -m tools.roles operator-login
    python -m tools.roles may-spend-llm --login L    # exit 1 unless allowed
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

import yaml

ROLES_FILE = Path(__file__).resolve().parents[1] / "roles.yaml"


def load_operators(path: Path = ROLES_FILE) -> list[dict]:
    data = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or {}
    operators = data.get("operators") or []
    if not operators:
        raise ValueError(f"{path}: no operators declared")
    for entry in operators:
        if not isinstance(entry.get("login"), str) or not entry["login"]:
            raise ValueError(f"{path}: operator entry without a login: {entry!r}")
        if not isinstance(entry.get("id"), int):
            raise ValueError(f"{path}: operator {entry.get('login')!r} needs a numeric id")
        if not isinstance(entry.get("llm", False), bool):
            raise ValueError(f"{path}: operator {entry['login']!r}: llm must be true or false")
    return operators


def operator_login(path: Path = ROLES_FILE) -> str:
    return load_operators(path)[0]["login"]


def is_operator(user_id: int, path: Path = ROLES_FILE) -> bool:
    return any(o["id"] == user_id for o in load_operators(path))


def may_spend_llm(user_id: int, path: Path = ROLES_FILE) -> bool:
    """Only an operator flagged `llm: true` may start a run that spends Claude tokens."""
    return any(o["id"] == user_id and o.get("llm", False) for o in load_operators(path))


def _user_id(login: str) -> int:
    out = subprocess.run(["gh", "api", f"users/{login}"], capture_output=True, text=True, check=True).stdout
    return json.loads(out)["id"]


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Read project roles from roles.yaml")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("operator-login", help="print the login of the first operator")
    spend = sub.add_parser("may-spend-llm", help="exit 1 unless the user may start a token-spending run")
    who = spend.add_mutually_exclusive_group(required=True)
    who.add_argument("--login", help="GitHub login, resolved to its numeric id through `gh api`")
    who.add_argument("--user-id", type=int, help="numeric GitHub user id")
    args = parser.parse_args(argv)
    if args.cmd == "operator-login":
        print(operator_login())
        return
    user_id = args.user_id if args.user_id is not None else _user_id(args.login)
    if not may_spend_llm(user_id):
        who = args.login or user_id
        print(
            f"::error::{who} may not start a run that spends Claude tokens: "
            "only an operator with `llm: true` in roles.yaml may (or use dry_run / whisper only)"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
