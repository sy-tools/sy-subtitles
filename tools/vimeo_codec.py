"""Reversible obfuscation codec for Vimeo links stored in meta.yaml.

Private Vimeo links (``https://vimeo.com/<id>/<hash>``) must not appear as
plaintext in this public repository. This module encodes the link into an
opaque ``video_ref`` value and decodes it back.

**This is obfuscation, not encryption.** The decode runs client-side in the
public SPA, so the algorithm and key below are themselves public. The goal is
only to break plaintext harvesting (GitHub code search, scrapers) and to make a
naive ``base64 -d`` yield garbage rather than a recognizable URL. It does not
protect against anyone who reads this file.

The JS twin lives at ``site/js/vimeo_codec.js`` and must stay byte-identical —
the shared vectors in ``tests/fixtures/vimeo_codec_vectors.json`` enforce that.

Format::

    video_ref: r1<base64url( reverse( xor(<id>/<hash>, KEY) ) )>

``r1`` is the scheme version (also guarantees the value starts with a letter,
so it never reads as YAML structure). The decode is the exact inverse — both
``reverse`` and ``xor`` are their own inverse, so ``decode(encode(x)) == x``.
"""

import base64
import re

# Fixed project constant. Not a secret (it ships in the public client) — it
# only diffuses the bytes so a naive base64 decode reveals nothing useful.
_KEY = b"sahaja-yoga-subtitles"
_VERSION = "r1"

# Capture the path after ``vimeo.com/`` — tolerant of protocol/www/trailing
# slash. The decode always reconstructs the canonical ``https://vimeo.com/...``.
_PATH_RE = re.compile(r"^(?:https?://)?(?:www\.)?vimeo\.com/(.+?)/?$", re.IGNORECASE)


def _xor(data: bytes) -> bytes:
    return bytes(b ^ _KEY[i % len(_KEY)] for i, b in enumerate(data))


def encode_video_ref(url: str) -> str:
    """Encode a Vimeo URL into an opaque ``video_ref`` string.

    Raises ``ValueError`` if ``url`` is not a Vimeo link.
    """
    match = _PATH_RE.match((url or "").strip())
    if not match:
        raise ValueError(f"not a vimeo url: {url!r}")
    path = match.group(1)
    transformed = _xor(path.encode("utf-8"))[::-1]
    payload = base64.urlsafe_b64encode(transformed).rstrip(b"=").decode("ascii")
    return _VERSION + payload


def decode_video_ref(ref: str) -> str:
    """Decode a ``video_ref`` string back to its canonical Vimeo URL.

    Raises ``ValueError`` if ``ref`` is not a recognized version.
    """
    ref = (ref or "").strip()
    if not ref.startswith(_VERSION):
        raise ValueError(f"unknown video_ref version: {ref!r}")
    payload = ref[len(_VERSION) :]
    padding = "=" * (-len(payload) % 4)
    raw = base64.urlsafe_b64decode(payload + padding)
    path = _xor(raw[::-1]).decode("utf-8")
    return "https://vimeo.com/" + path


def main(argv: list[str] | None = None) -> None:
    """CLI used by workflows: ``vimeo_codec encode <url>`` / ``decode <ref>``.

    The value is taken as a positional argument (never interpolated into a
    shell ``-c``), so it is safe to pass a PR-controlled string.
    """
    import argparse

    parser = argparse.ArgumentParser(description="Encode/decode Vimeo video_ref values.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    enc = sub.add_parser("encode", help="vimeo url -> video_ref")
    enc.add_argument("url")
    dec = sub.add_parser("decode", help="video_ref -> vimeo url")
    dec.add_argument("ref")
    args = parser.parse_args(argv)

    if args.cmd == "encode":
        print(encode_video_ref(args.url))
    else:
        print(decode_video_ref(args.ref))


if __name__ == "__main__":
    main()
