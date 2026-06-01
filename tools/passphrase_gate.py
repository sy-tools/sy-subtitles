"""Passphrase-gate hash — Python twin of site/js/passphrase_gate.js.

Used by .github/workflows/deploy-pages.yml to turn the GATE_PASSPHRASE secret
into the PBKDF2 hash injected into the SPA (var APP_GATE_HASH). The literal
passphrase is NEVER printed or committed; only the hash is emitted.

This is a SOFT gate, NOT encryption: the hash ships publicly in the deployed
site and the content behind the gate is public on GitHub regardless. The JS
twin (site/js/passphrase_gate.js) must produce identical output, enforced by
the shared vectors in tests/fixtures/passphrase_gate_vectors.json.
"""

from __future__ import annotations

import hashlib


def derive_hash(phrase: str, salt_hex: str, iterations: int) -> str:
    """PBKDF2-HMAC-SHA256(phrase, salt) -> 32-byte digest as lowercase hex."""
    dk = hashlib.pbkdf2_hmac("sha256", phrase.encode("utf-8"), bytes.fromhex(salt_hex), iterations, dklen=32)
    return dk.hex()


def main(argv: list[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Compute the passphrase-gate hash.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hash", help="phrase -> PBKDF2 hex hash")
    h.add_argument("phrase")
    h.add_argument("--salt", required=True, help="salt as hex")
    h.add_argument("--iterations", type=int, required=True)
    args = parser.parse_args(argv)

    if args.cmd == "hash":
        print(derive_hash(args.phrase, args.salt, args.iterations))


if __name__ == "__main__":
    main()
