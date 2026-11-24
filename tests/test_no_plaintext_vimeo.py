"""CI guard: no meta.yaml may contain a plaintext video link.

Links are stored obfuscated as ``video_ref`` (see tools/vimeo_codec.py). This
test fails loudly if a hand-edited or regressed ``talks/*/meta.yaml`` reintroduces
a plaintext ``vimeo.com/<id>`` or ``player.vimeo.com`` link — the thing the whole
obfuscation scheme exists to prevent — or, since r2 refs, a plaintext YouTube,
Google Drive file or Bunny Stream link.

Scoped to meta.yaml so synthetic example URLs in tests/fixtures don't trip it.
Runs under the normal ``python -m pytest tests/`` step in ci.yml.
"""

import re
from pathlib import Path

# A real Vimeo link: vimeo.com/<digits> or player.vimeo.com/video/<digits>.
_PLAINTEXT_VIMEO_RE = re.compile(r"(?:player\.)?vimeo\.com/(?:video/)?\d+", re.IGNORECASE)

_ROOT = Path(__file__).resolve().parent.parent


# The same rule for the providers that came after Vimeo (r2 refs): a YouTube
# watch / short / embed link, or a Google Drive file link.
_PLAINTEXT_YOUTUBE_RE = re.compile(
    r"(?:youtube(?:-nocookie)?\.com/(?:watch\?|embed/|shorts/|live/)|youtu\.be/)\S*", re.IGNORECASE
)
_PLAINTEXT_DRIVE_RE = re.compile(r"drive\.google\.com/(?:file/d/|open\?)\S*", re.IGNORECASE)
# A Bunny Stream player link, or the HLS playlist it streams from (a guid
# path on a *.b-cdn.net host).
_PLAINTEXT_BUNNY_RE = re.compile(
    r"mediadelivery\.net/(?:embed|play)/\S*|b-cdn\.net/[0-9a-f]{8}-[0-9a-f]{4}-\S*", re.IGNORECASE
)

# The one place a plaintext YouTube link is legitimate: the talk-level
# ``youtube_url:`` key of a podcast talk, which is a public episode link and
# not a video the pipeline plays or downloads. Talk-level means column 0 — the
# same key nested under ``videos:`` is still a leak.
_TALK_LEVEL_YOUTUBE_URL_RE = re.compile(r"^youtube_url:")


def _scan(text: str) -> list[str]:
    return _PLAINTEXT_VIMEO_RE.findall(text)


def _scan_other_providers(text: str) -> list[str]:
    hits: list[str] = []
    for line in text.splitlines():
        hits += _PLAINTEXT_DRIVE_RE.findall(line)
        hits += _PLAINTEXT_BUNNY_RE.findall(line)
        if not _TALK_LEVEL_YOUTUBE_URL_RE.match(line):
            hits += _PLAINTEXT_YOUTUBE_RE.findall(line)
    return hits


def test_guard_detects_a_planted_link():
    """Sanity-check the detector itself catches a plaintext link."""
    assert _scan("  vimeo_url: https://vimeo.com/12345/abc")
    assert _scan("https://player.vimeo.com/video/12345?h=deadbeef")
    assert _scan("  video_ref: r1XFgVXRABQBEcV0hdTxhVW1JZVEE") == []


def test_guard_detects_a_planted_youtube_link():
    # Synthetic ids only.
    for planted in (
        "  video_url: https://www.youtube.com/watch?v=AbCdEfGhIjK",
        "  - https://youtu.be/AbCdEfGhIjK",
        "    embed: https://www.youtube.com/embed/AbCdEfGhIjK",
        "    embed: https://www.youtube-nocookie.com/embed/AbCdEfGhIjK",
        # Nested under a video, the exempt key name is no excuse.
        "    youtube_url: https://www.youtube.com/watch?v=AbCdEfGhIjK",
    ):
        assert _scan_other_providers(planted), planted
    assert _scan_other_providers("youtube_url: https://www.youtube.com/watch?v=AbCdEfGhIjK") == []
    assert _scan_other_providers("  video_ref: r2PhlkCSAJPEkiCCBSFQo") == []


def test_guard_detects_a_planted_drive_link():
    for planted in (
        "  - https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view",
        "  media: https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345",
        # The talk-level youtube_url exemption covers YouTube only.
        "youtube_url: https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view",
    ):
        assert _scan_other_providers(planted), planted
    assert _scan_other_providers("  media_refs: [r2V0FAH1BXFSBVNhw0HDIBIhUjGiQYKR86RSYBKh1uAytQUgUU]") == []


def test_guard_detects_a_planted_bunny_link():
    # Synthetic ids only.
    for planted in (
        "  - https://player.mediadelivery.net/play/123456/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
        "    embed: https://player.mediadelivery.net/embed/123456/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d?autoplay=false",
        "    embed: https://iframe.mediadelivery.net/embed/123456/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
        "    hls: https://vz-0a1b2c3d-123.b-cdn.net/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d/playlist.m3u8",
        "youtube_url: https://player.mediadelivery.net/play/123456/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    ):
        assert _scan_other_providers(planted), planted


def test_no_shipped_meta_yaml_contains_plaintext_vimeo_link():
    offenders = {}
    for meta in sorted((_ROOT / "talks").glob("*/meta.yaml")):
        hits = _scan(meta.read_text(encoding="utf-8"))
        if hits:
            offenders[str(meta.relative_to(_ROOT))] = hits
    assert not offenders, (
        "Plaintext Vimeo links found in meta.yaml (store them as video_ref via "
        "`python -m tools.mask_video_refs`):\n" + "\n".join(f"  {path}: {hits}" for path, hits in offenders.items())
    )


def test_no_shipped_meta_yaml_contains_plaintext_youtube_or_drive_link():
    offenders = {}
    for meta in sorted((_ROOT / "talks").glob("*/meta.yaml")):
        hits = _scan_other_providers(meta.read_text(encoding="utf-8"))
        if hits:
            offenders[str(meta.relative_to(_ROOT))] = hits
    assert not offenders, (
        "Plaintext YouTube / Google Drive / Bunny links found in meta.yaml (store them as an r2 video_ref / "
        "media_refs via `python -m tools.vimeo_codec encode <url>`):\n"
        + "\n".join(f"  {path}: {hits}" for path, hits in offenders.items())
    )
