"""Tests for the passphrase-gate hash (tools/passphrase_gate.py).

Twin of site/js/passphrase_gate.js. SOFT gate, not encryption: the hash ships
publicly and the gated content is public on GitHub regardless. These tests pin
the PBKDF2 output and the cross-language vectors shared with the JS twin.
"""

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
