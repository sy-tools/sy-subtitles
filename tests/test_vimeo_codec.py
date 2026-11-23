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

from tools.vimeo_codec import (
    VideoSource,
    _encode_payload,
    decode_video_ref,
    decode_video_source,
    encode_video_ref,
    main,
    to_player_url,
)

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


def test_to_player_url_moves_private_hash_into_query():
    """yt-dlp must be handed the embed form.

    Vimeo answers 401 on the internal "macos" API that yt-dlp uses for the
    ``vimeo.com/<id>/<hash>`` form; the ``player.vimeo.com`` form goes through
    the player config endpoint and still works.
    """
    assert (
        to_player_url("https://vimeo.com/111111111/aaaaaaaaaa")
        == "https://player.vimeo.com/video/111111111?h=aaaaaaaaaa"
    )


def test_to_player_url_without_private_hash():
    assert to_player_url("https://vimeo.com/123456789") == "https://player.vimeo.com/video/123456789"


def test_to_player_url_is_idempotent():
    player = "https://player.vimeo.com/video/111111111?h=aaaaaaaaaa"
    assert to_player_url(player) == player


def test_to_player_url_leaves_unrecognized_urls_unchanged():
    # Never silently rewrite something we do not understand — let yt-dlp decide.
    assert to_player_url("https://example.com/video/1") == "https://example.com/video/1"


def test_cli_decode_player_emits_embed_url(capsys):
    # The workflows call `python -m tools.vimeo_codec decode --player "$VIDEO_REF"`.
    ref = encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa")
    main(["decode", "--player", ref])
    assert capsys.readouterr().out.strip() == "https://player.vimeo.com/video/111111111?h=aaaaaaaaaa"


def _vectors():
    return json.loads(VECTORS_PATH.read_text(encoding="utf-8"))


def _expected_watch_url(vec):
    if vec.get("provider") == "yt":
        return "https://www.youtube.com/watch?v=" + vec["id"]
    if vec.get("provider") == "gd":
        return "https://drive.google.com/file/d/" + vec["id"] + "/view"
    return vec["url"]  # r1 vectors are canonical Vimeo URLs


def test_cross_language_vectors_match():
    """Frozen vectors shared byte-for-byte with tests/test_vimeo_codec.js.

    This is the contract that keeps the Python and JS codecs identical.
    """
    vectors = _vectors()
    assert vectors, "vectors file must not be empty"
    for vec in vectors:
        assert encode_video_ref(vec["url"]) == vec["ref"], vec["url"]
        assert decode_video_ref(vec["ref"]) == _expected_watch_url(vec), vec["ref"]
        source = decode_video_source(vec["ref"])
        assert source.provider == vec.get("provider", "vimeo")
        assert source.watch_url == _expected_watch_url(vec)
        if "id" in vec:
            assert source.id == vec["id"]


def test_vectors_cover_every_provider_and_url_shape():
    # The vector file is the twin contract; an r2 branch with no vector would
    # be a branch the two languages could disagree on unnoticed.
    vectors = _vectors()
    assert [v["ref"] for v in vectors[:4]] == [
        "r1BA0VCBUDFBJMAEheSBxQW1BZUEI",
        "r1Bw4WCxYAFxFPA0hdSx9TWFNaU0E",
        "r1Bg8XChcBFhBOAkhcSh5SWVJbUkA",
        "r1VkEaV19VW1NC",
    ]
    yt = [v for v in vectors if v.get("provider") == "yt"]
    gd = [v for v in vectors if v.get("provider") == "gd"]
    assert len(yt) >= 4 and len({v["ref"] for v in yt}) == 1, "all YouTube URL shapes encode to one ref"
    assert len(gd) >= 2 and len({v["ref"] for v in gd}) == 1, "both Drive URL shapes encode to one ref"
    assert all(v["ref"].startswith("r2") for v in yt + gd)


# r2: provider-tagged refs (YouTube, Google Drive) -----------------------------

# Synthetic ids only — never a real video or file id.
YT_ID = "AbCdEfGhIjK"
GD_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345"


def test_decode_video_source_for_r1_keeps_id_and_hash():
    ref = encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa")
    assert decode_video_source(ref) == VideoSource(
        provider="vimeo", id="111111111/aaaaaaaaaa", watch_url="https://vimeo.com/111111111/aaaaaaaaaa"
    )


@pytest.mark.parametrize(
    "url",
    [
        f"https://www.youtube.com/watch?v={YT_ID}",
        f"https://youtube.com/watch?v={YT_ID}&t=42s",
        f"https://www.youtube.com/watch?feature=share&v={YT_ID}",
        f"https://m.youtube.com/watch?v={YT_ID}",
        f"https://youtu.be/{YT_ID}",
        f"https://youtu.be/{YT_ID}?si=abc",
        f"https://www.youtube.com/embed/{YT_ID}",
        f"https://www.youtube.com/embed/{YT_ID}?rel=0",
        f"https://www.youtube-nocookie.com/embed/{YT_ID}",
        f"youtube.com/watch?v={YT_ID}",
        f"https://youtu.be/{YT_ID}/",
        f"https://www.youtube.com/embed/{YT_ID}/",
        # A repeated v= resolves to the first one, as YouTube itself does.
        f"https://www.youtube.com/watch?v={YT_ID}&v=ZZZZZZZZZZZ",
        f"HTTPS://WWW.YouTube.com/watch?v={YT_ID}#t=1",
    ],
)
def test_youtube_url_shapes_encode_to_one_r2_ref(url):
    ref = encode_video_ref(url)
    assert ref == encode_video_ref(f"https://www.youtube.com/watch?v={YT_ID}")
    assert ref.startswith("r2")
    assert decode_video_source(ref) == VideoSource(
        provider="yt", id=YT_ID, watch_url=f"https://www.youtube.com/watch?v={YT_ID}"
    )


@pytest.mark.parametrize(
    "url",
    [
        f"https://drive.google.com/file/d/{GD_ID}/view",
        f"https://drive.google.com/file/d/{GD_ID}/view?usp=sharing",
        f"https://drive.google.com/file/d/{GD_ID}",
        f"https://drive.google.com/open?id={GD_ID}",
        f"https://drive.google.com/open?usp=sharing&id={GD_ID}",
    ],
)
def test_drive_url_shapes_encode_to_one_r2_ref(url):
    ref = encode_video_ref(url)
    assert ref == encode_video_ref(f"https://drive.google.com/file/d/{GD_ID}/view")
    assert ref.startswith("r2")
    assert decode_video_source(ref) == VideoSource(
        provider="gd", id=GD_ID, watch_url=f"https://drive.google.com/file/d/{GD_ID}/view"
    )


def test_r2_stored_form_has_no_plaintext_id():
    for url, needle in (
        (f"https://youtu.be/{YT_ID}", YT_ID),
        (f"https://drive.google.com/file/d/{GD_ID}/view", GD_ID),
    ):
        ref = encode_video_ref(url)
        assert re.fullmatch(r"r2[A-Za-z0-9_-]+", ref)
        assert needle not in ref
        assert "youtu" not in ref.lower() and "drive" not in ref.lower()


@pytest.mark.parametrize(
    "payload",
    [
        f"xx:{YT_ID}",  # unknown provider
        "yt:short",  # id is not 11 chars
        f"yt:{YT_ID}x",  # 12 chars
        f"yt:{YT_ID[:-1]};",  # shell metacharacter in the id
        "gd:tooshort",
        f"gd:{GD_ID[:-1]}/",
        YT_ID,  # no provider tag at all
        f"vimeo:{YT_ID}",  # vimeo is r1-only
    ],
)
def test_decode_rejects_bad_r2_payload(payload):
    with pytest.raises(ValueError):
        decode_video_source(_encode_payload("r2", payload))
    with pytest.raises(ValueError):
        decode_video_ref(_encode_payload("r2", payload))


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/x",
        "https://www.youtube.com/watch?v=short",
        f"https://www.youtube.com/watch?v={YT_ID}x",
        f"https://www.youtube.com/watch?list={YT_ID}",
        f"https://evil.com/?u=https://youtu.be/{YT_ID}",
        "https://drive.google.com/file/d/tooshort/view",
        f"https://drive.google.com/drive/folders/{GD_ID}",
        "",
    ],
)
def test_encode_rejects_unsupported_url(url):
    with pytest.raises(ValueError, match="not a supported video url"):
        encode_video_ref(url)


def test_decode_source_rejects_unknown_version():
    with pytest.raises(ValueError):
        decode_video_source("r9zzzz")


def test_cli_decode_provider_prints_provider_only(capsys):
    for url, provider in (
        ("https://vimeo.com/111111111/aaaaaaaaaa", "vimeo"),
        (f"https://youtu.be/{YT_ID}", "yt"),
        (f"https://drive.google.com/file/d/{GD_ID}/view", "gd"),
    ):
        main(["decode", encode_video_ref(url), "--provider"])
        assert capsys.readouterr().out.strip() == provider


def test_cli_round_trips_a_youtube_url(capsys):
    main(["encode", f"https://youtu.be/{YT_ID}"])
    ref = capsys.readouterr().out.strip()
    main(["decode", ref])
    assert capsys.readouterr().out.strip() == f"https://www.youtube.com/watch?v={YT_ID}"
    # --player only rewrites Vimeo; any other provider passes through.
    main(["decode", "--player", ref])
    assert capsys.readouterr().out.strip() == f"https://www.youtube.com/watch?v={YT_ID}"
