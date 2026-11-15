"""Operator identity comes from roles.yaml, matched by numeric GitHub id.

Logins are unique but renameable (and then re-registrable by someone else);
the account's public e-mail is null. The id is the only stable key.
"""

import subprocess
import sys
from pathlib import Path

import pytest

from tools import roles

ROOT = Path(__file__).resolve().parents[1]


def test_operator_is_slava_by_id():
    assert roles.is_operator(11644864) is True
    assert roles.is_operator(1) is False


def test_operator_login_is_first_entry(tmp_path):
    f = tmp_path / "roles.yaml"
    f.write_text("operators:\n- login: First\n  id: 1\n- login: Second\n  id: 2\n", encoding="utf-8")
    assert roles.operator_login(f) == "First"
    assert [o["id"] for o in roles.load_operators(f)] == [1, 2]


def test_missing_id_is_rejected(tmp_path):
    f = tmp_path / "roles.yaml"
    f.write_text("operators:\n- login: NoId\n", encoding="utf-8")
    with pytest.raises(ValueError, match="id"):
        roles.load_operators(f)


def test_empty_operator_list_is_rejected(tmp_path):
    f = tmp_path / "roles.yaml"
    f.write_text("operators: []\n", encoding="utf-8")
    with pytest.raises(ValueError):
        roles.load_operators(f)


def test_cli_prints_login():
    out = subprocess.run(
        [sys.executable, "-m", "tools.roles", "operator-login"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout
    assert out == "SlavaSubotskiy\n"


def test_llm_spend_needs_an_operator_with_the_llm_flag(tmp_path):
    f = tmp_path / "roles.yaml"
    f.write_text(
        "operators:\n- login: Spender\n  id: 1\n  llm: true\n- login: Watcher\n  id: 2\n",
        encoding="utf-8",
    )
    assert roles.may_spend_llm(1, f) is True
    assert roles.may_spend_llm(2, f) is False
    assert roles.may_spend_llm(3, f) is False


def test_llm_flag_must_be_a_boolean(tmp_path):
    f = tmp_path / "roles.yaml"
    f.write_text("operators:\n- login: X\n  id: 1\n  llm: 'yes'\n", encoding="utf-8")
    with pytest.raises(ValueError, match="llm"):
        roles.load_operators(f)


def test_slava_may_spend_llm():
    assert roles.may_spend_llm(11644864) is True


@pytest.mark.parametrize(("user_id", "code"), [("11644864", 0), ("1", 1)])
def test_cli_may_spend_llm_exits_by_permission(user_id, code):
    result = subprocess.run(
        [sys.executable, "-m", "tools.roles", "may-spend-llm", "--user-id", user_id],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == code
    if code:
        assert "llm: true" in result.stdout + result.stderr
