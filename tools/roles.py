"""Project roles from roles.yaml (repo root).

The SPA and the talk-operator workflow both read this file; identity is the
numeric GitHub user id, never the login (see roles.yaml).

    python -m tools.roles operator-login
"""

import argparse
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
    return operators


def operator_login(path: Path = ROLES_FILE) -> str:
    return load_operators(path)[0]["login"]


def is_operator(user_id: int, path: Path = ROLES_FILE) -> bool:
    return any(o["id"] == user_id for o in load_operators(path))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Read project roles from roles.yaml")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("operator-login", help="print the login of the first operator")
    parser.parse_args(argv)
    print(operator_login())


if __name__ == "__main__":
    main()
