"""Tests for the passphrase-gate hash (tools/passphrase_gate.py).

Twin of site/js/passphrase_gate.js. SOFT gate, not encryption: the hash ships
publicly and the gated content is public on GitHub regardless. These tests pin
the PBKDF2 output and the cross-language vectors shared with the JS twin.
"""

import json
from pathlib import Path

from tools.passphrase_gate import derive_hash, main

SALT = "a3f1c92e6b4d80571e2c9f3a6d8b0e47"
ITERS = 200000
VECTORS_PATH = Path(__file__).parent / "fixtures" / "passphrase_gate_vectors.json"


def test_derive_hash_matches_known_reference():
    assert (
        derive_hash("test-passphrase", SALT, ITERS)
        == "289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f"
    )


def test_derive_hash_is_64_hex_chars():
    h = derive_hash("anything", SALT, ITERS)
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_cli_hash_prints_only_the_hash(capsys):
    main(["hash", "--salt", SALT, "--iterations", str(ITERS), "test-passphrase"])
    out = capsys.readouterr().out.strip()
    assert out == "289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f"
    # The phrase must never leak to stdout.
    assert "test-passphrase" not in out


def test_cross_language_vectors_match():
    """Frozen vectors shared byte-for-byte with tests/test_passphrase_gate.js.

    This is the contract that keeps the Python and JS hashes identical. Phrases
    are synthetic — NEVER the real passphrase.
    """
    data = json.loads(VECTORS_PATH.read_text(encoding="utf-8"))
    assert data["salt"] == SALT
    assert data["iterations"] == ITERS
    assert data["vectors"], "vectors file must not be empty"
    for vec in data["vectors"]:
        assert derive_hash(vec["phrase"], data["salt"], data["iterations"]) == vec["hash"]


def test_js_module_constants_match_vectors():
    """The JS twin's GATE_SALT/GATE_ITERATIONS must match the fixture, so the
    deploy workflow (which greps them out of the JS) computes the right hash."""
    js = (Path(__file__).parent.parent / "site" / "js" / "passphrase_gate.js").read_text()
    data = json.loads(VECTORS_PATH.read_text(encoding="utf-8"))
    assert f"GATE_SALT = '{data['salt']}'" in js
    assert f"GATE_ITERATIONS = {data['iterations']}" in js


def test_index_html_has_gate_hash_placeholder():
    """The deploy workflow seds this exact line; if it ever changes, the deploy
    silently ships an empty (disabled) gate. Pin the sed target."""
    idx = (Path(__file__).parent.parent / "site" / "index.html").read_text()
    assert "var APP_GATE_HASH = '';" in idx
    assert "js/passphrase_gate.js" in idx
