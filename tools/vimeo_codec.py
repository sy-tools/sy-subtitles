"""Reversible obfuscation codec for video links stored in meta.yaml.

Private Vimeo links (``https://vimeo.com/<id>/<hash>``) must not appear as
plaintext in this public repository, and neither may the YouTube, Google
Drive and Bunny Stream ids that came after them. This module encodes a link into an opaque
``video_ref`` value and decodes it back. (The module is still named after
Vimeo, the only provider it had for a long time.)

**This is obfuscation, not encryption.** The decode runs client-side in the
public SPA, so the algorithm and key below are themselves public. The goal is
only to break plaintext harvesting (GitHub code search, scrapers) and to make a
naive ``base64 -d`` yield garbage rather than a recognizable URL. It does not
protect against anyone who reads this file.

The JS twin lives at ``site/js/vimeo_codec.js`` and must stay behaviorally
identical (produce identical output for the same input) — the shared vectors in
``tests/fixtures/vimeo_codec_vectors.json`` enforce that from both languages.

Format — the two-character version prefix selects the payload::

    r1<base64url( reverse( xor("<id>[/<hash>]", KEY) ) )>     Vimeo
    r2<base64url( reverse( xor("<provider>:<id>", KEY) ) )>   yt | gd | bn

The prefix also guarantees the value starts with a letter, so it never reads
as YAML structure. The decode is the exact inverse — both ``reverse`` and
``xor`` are their own inverse — so for a canonical URL
``decode(encode(url)) == url``. Non-canonical inputs (http/www/trailing slash,
``youtu.be``, embed links, extra query) normalize to the provider's canonical
watch URL on decode.

``r1`` carries no provider tag because it predates the idea of one; it stays
exactly as it was, so every ref already stored keeps decoding. ``r2`` is
strict where ``r1`` is not: its id must match the provider's pattern, so a
decoded ``r2`` value is safe to place in a URL or a command line as is.
"""

import base64
import re
from dataclasses import dataclass

from tools.workflow_validation import BUNNY_ID_RE, DRIVE_ID_RE, YOUTUBE_ID_RE

# Fixed project constant. Not a secret (it ships in the public client) — it
# only diffuses the bytes so a naive base64 decode reveals nothing useful.
_KEY = b"sahaja-yoga-subtitles"
_V1 = "r1"  # Vimeo path
_V2 = "r2"  # "<provider>:<id>"

# Capture the path after ``vimeo.com/`` — tolerant of protocol/www/trailing
# slash. The decode always reconstructs the canonical ``https://vimeo.com/...``.
_PATH_RE = re.compile(r"^(?:https?://)?(?:www\.)?vimeo\.com/(.+?)/?$", re.IGNORECASE)

# Canonical decoded form: numeric id plus an optional private hash.
_CANONICAL_RE = re.compile(r"^(?:https?://)?(?:www\.)?vimeo\.com/(\d+)(?:/([0-9a-z]+))?/?$", re.IGNORECASE)

# r2 URL shapes. They only ever see printable ASCII (``_PRINTABLE_ASCII_RE``
# gates them), which is what lets ``.``, ``[^#]`` and IGNORECASE mean the same
# thing here and in the JS twin: outside ASCII the two regex engines disagree
# on case folding and on what ``.`` excludes. The lazy quantifiers pick the
# FIRST ``v=`` / ``id=`` of a query that repeats it, as the sites themselves do.
_PRINTABLE_ASCII_RE = re.compile(r"[!-~]+")
_YT = r"([A-Za-z0-9_-]{11})"
_GD = r"([A-Za-z0-9_-]{25,64})"
_BN = r"([0-9]{1,12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"
_URL_SHAPES: tuple[tuple[str, re.Pattern[str]], ...] = tuple(
    (provider, re.compile(pattern, re.IGNORECASE))
    for provider, pattern in (
        ("yt", r"(?:https?://)?(?:www\.|m\.)?youtube\.com/watch\?(?:[^#]*?&)??v=" + _YT + r"(?:[&#].*)?"),
        ("yt", r"(?:https?://)?youtu\.be/" + _YT + r"/?(?:[?#].*)?"),
        ("yt", r"(?:https?://)?(?:www\.)?youtube(?:-nocookie)?\.com/embed/" + _YT + r"/?(?:[?#].*)?"),
        ("gd", r"(?:https?://)?drive\.google\.com/file/d/" + _GD + r"(?:[/?#].*)?"),
        ("gd", r"(?:https?://)?drive\.google\.com/open\?(?:[^#]*?&)??id=" + _GD + r"(?:[&#].*)?"),
        # amruta's page carries both: the player iframe (embed) and the
        # "Watch on Bunny" link (play). iframe. is Bunny's older player host.
        ("bn", r"(?:https?://)?(?:player|iframe)\.mediadelivery\.net/(?:embed|play)/" + _BN + r"/?(?:[?#].*)?"),
    )
)

# Providers whose id has no meaningful case: it is folded on encode so a
# stored id has one spelling. Safe to fold here, the shapes only see ASCII.
_CASE_FOLDED = frozenset({"bn"})

# provider -> (id pattern, canonical watch URL template)
_PROVIDERS: dict[str, tuple[re.Pattern[str], str]] = {
    "yt": (YOUTUBE_ID_RE, "https://www.youtube.com/watch?v={id}"),
    "gd": (DRIVE_ID_RE, "https://drive.google.com/file/d/{id}/view"),
    # The "Watch on Bunny" link amruta publishes. A download source only: the
    # player refuses any referrer but amruta's own, so it is never embedded.
    "bn": (BUNNY_ID_RE, "https://player.mediadelivery.net/play/{id}"),
}


@dataclass(frozen=True)
class VideoSource:
    """What a ``video_ref`` points at.

    ``provider`` is ``"vimeo"``, ``"yt"``, ``"gd"`` or ``"bn"``. ``id`` is the
    provider's own id — for Vimeo ``<id>`` or ``<id>/<hash>``, for Bunny
    ``<library>/<guid>`` — and ``watch_url`` the canonical page for it.
    """

    provider: str
    id: str
    watch_url: str


def _xor(data: bytes) -> bytes:
    return bytes(b ^ _KEY[i % len(_KEY)] for i, b in enumerate(data))


def _encode_payload(version: str, text: str) -> str:
    transformed = _xor(text.encode("utf-8"))[::-1]
    return version + base64.urlsafe_b64encode(transformed).rstrip(b"=").decode("ascii")


def _decode_payload(ref: str, version: str) -> str:
    payload = ref[len(version) :]
    padding = "=" * (-len(payload) % 4)
    raw = base64.urlsafe_b64decode(payload + padding)
    return _xor(raw[::-1]).decode("utf-8")


def encode_video_ref(url: str) -> str:
    """Encode a video URL into an opaque ``video_ref`` string.

    A Vimeo URL becomes an ``r1`` ref; a YouTube, Google Drive file or Bunny
    Stream player URL an ``r2`` ref. Raises ``ValueError`` for anything else.
    """
    text = (url or "").strip()
    match = _PATH_RE.match(text)
    if match:
        return _encode_payload(_V1, match.group(1))
    if _PRINTABLE_ASCII_RE.fullmatch(text):
        for provider, shape in _URL_SHAPES:
            match = shape.fullmatch(text)
            if match:
                video_id = match.group(1).lower() if provider in _CASE_FOLDED else match.group(1)
                return _encode_payload(_V2, f"{provider}:{video_id}")
    raise ValueError(f"not a supported video url: {url!r}")


def decode_video_source(ref: str) -> VideoSource:
    """Decode a ``video_ref`` string into its provider, id and watch URL.

    Raises ``ValueError`` if ``ref`` is not a recognized version, names an
    unknown provider, or carries an id that does not fit the provider.
    """
    ref = (ref or "").strip()
    if ref.startswith(_V1):
        path = _decode_payload(ref, _V1)
        return VideoSource("vimeo", path, "https://vimeo.com/" + path)
    if ref.startswith(_V2):
        provider, sep, video_id = _decode_payload(ref, _V2).partition(":")
        if not sep or provider not in _PROVIDERS:
            raise ValueError(f"unknown video_ref provider: {ref!r}")
        id_re, watch_url = _PROVIDERS[provider]
        if not id_re.fullmatch(video_id):
            raise ValueError(f"invalid {provider} id in video_ref: {ref!r}")
        return VideoSource(provider, video_id, watch_url.format(id=video_id))
    raise ValueError(f"unknown video_ref version: {ref!r}")


def decode_video_ref(ref: str) -> str:
    """Decode a ``video_ref`` string back to its canonical watch URL.

    Raises ``ValueError`` on the same inputs as ``decode_video_source``.
    """
    return decode_video_source(ref).watch_url


def to_player_url(url: str) -> str:
    """Convert a canonical Vimeo URL into the ``player.vimeo.com`` embed form.

    ``https://vimeo.com/<id>/<hash>`` → ``https://player.vimeo.com/video/<id>?h=<hash>``

    This is the form to hand to yt-dlp: for the canonical form yt-dlp goes
    through Vimeo's internal "macos" API, which now answers ``401 Unauthorized``,
    while the embed form resolves via the player config endpoint. URLs that do
    not match the canonical form (including already-embed ones) are returned
    unchanged.
    """
    match = _CANONICAL_RE.match((url or "").strip())
    if not match:
        return url
    video_id, private_hash = match.group(1), match.group(2)
    return f"https://player.vimeo.com/video/{video_id}" + (f"?h={private_hash}" if private_hash else "")


def main(argv: list[str] | None = None) -> None:
    """CLI used by workflows: ``vimeo_codec encode <url>`` / ``decode <ref>``.

    The value is taken as a positional argument (never interpolated into a
    shell ``-c``), so it is safe to pass a PR-controlled string.
    """
    import argparse

    parser = argparse.ArgumentParser(description="Encode/decode video_ref values.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    enc = sub.add_parser("encode", help="video url -> video_ref")
    enc.add_argument("url")
    dec = sub.add_parser("decode", help="video_ref -> watch url")
    dec.add_argument("ref")
    form = dec.add_mutually_exclusive_group()
    form.add_argument(
        "--player",
        action="store_true",
        help="for Vimeo, emit the player.vimeo.com embed form (the one yt-dlp can resolve)",
    )
    form.add_argument(
        "--provider",
        action="store_true",
        help="print only the provider: vimeo, yt, gd or bn",
    )
    args = parser.parse_args(argv)

    if args.cmd == "encode":
        print(encode_video_ref(args.url))
        return
    source = decode_video_source(args.ref)
    if args.provider:
        print(source.provider)
    else:
        print(to_player_url(source.watch_url) if args.player else source.watch_url)


if __name__ == "__main__":
    main()
