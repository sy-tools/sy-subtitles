"""Tests for the video_ref codec (tools/vimeo_codec.py).

The codec masks private Vimeo links so they do not appear as plaintext in the
public repo. It is obfuscation, not encryption (the decode is public) — these
tests pin the round-trip, the stored-form properties, and a frozen set of
cross-language vectors shared with the JS implementation.
"""

import json
import re
from pathlib import Path

import pytest

from tools.vimeo_codec import decode_video_ref, encode_video_ref, main

VECTORS_PATH = Path(__file__).parent / "fixtures" / "vimeo_codec_vectors.json"

# Synthetic, obviously-fake placeholders only — never a real private link
# (this is a public repo; the whole point of the module is to keep real links
# out of plaintext).
CANONICAL_URLS = [
    "https://vimeo.com/111111111/aaaaaaaaaa",
    "https://vimeo.com/222222222/bbbbbbbbbb",
    "https://vimeo.com/123456789",  # public, no private hash
]


@pytest.mark.parametrize("url", CANONICAL_URLS)
def test_round_trip(url):
    assert decode_video_ref(encode_video_ref(url)) == url


@pytest.mark.parametrize("url", CANONICAL_URLS)
def test_stored_form_has_no_plaintext_link(url):
    ref = encode_video_ref(url)
    assert ref.startswith("r1")
    # The whole point: the encoded form must not leak the link to a grep.
    assert "vimeo" not in ref.lower()
    assert "/" not in ref
    assert "=" not in ref  # base64url, unpadded
    # base64url alphabet only, after the r1 prefix
    assert re.fullmatch(r"r1[A-Za-z0-9_-]+", ref)


def test_naive_base64_decode_does_not_reveal_url():
    # A curious human who strips r1 and base64-decodes must get garbage, not a
    # recognizable vimeo URL (that is what the xor+reverse steps buy us).
    import base64

    ref = encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa")
    payload = ref[2:]
    payload += "=" * (-len(payload) % 4)
    raw = base64.urlsafe_b64decode(payload)
    assert b"vimeo" not in raw
    assert b"111111111" not in raw


def test_encode_normalizes_non_canonical_input():
    # download.py normalizes before encoding, but the codec should be tolerant
    # of protocol/www/trailing-slash and always decode to the canonical form.
    for variant in (
        "http://vimeo.com/123/abc",
        "https://www.vimeo.com/123/abc/",
        "vimeo.com/123/abc",
    ):
        assert decode_video_ref(encode_video_ref(variant)) == "https://vimeo.com/123/abc"


def test_encode_rejects_non_vimeo_url():
    with pytest.raises(ValueError):
        encode_video_ref("https://evil.com/123/abc")


def test_decode_rejects_unknown_version():
    with pytest.raises(ValueError):
        decode_video_ref("r9zzzz")


def test_cli_encode_then_decode_round_trip(capsys):
    # The workflows call `python -m tools.vimeo_codec decode "$VIDEO_REF"`.
    url = "https://vimeo.com/111111111/aaaaaaaaaa"
    main(["encode", url])
    ref = capsys.readouterr().out.strip()
    assert ref.startswith("r1")
    main(["decode", ref])
    assert capsys.readouterr().out.strip() == url


def test_cross_language_vectors_match():
    """Frozen vectors shared byte-for-byte with tests/test_vimeo_codec.js.

    This is the contract that keeps the Python and JS codecs identical.
    """
    vectors = json.loads(VECTORS_PATH.read_text(encoding="utf-8"))
    assert vectors, "vectors file must not be empty"
    for vec in vectors:
        assert encode_video_ref(vec["url"]) == vec["ref"]
        assert decode_video_ref(vec["ref"]) == vec["url"]
