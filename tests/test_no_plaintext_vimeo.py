"""CI guard: no meta.yaml may contain a plaintext Vimeo link.

Links are stored obfuscated as ``video_ref`` (see tools/vimeo_codec.py). This
test fails loudly if a hand-edited or regressed ``talks/*/meta.yaml`` reintroduces
a plaintext ``vimeo.com/<id>`` or ``player.vimeo.com`` link — the thing the whole
obfuscation scheme exists to prevent.

Scoped to meta.yaml so synthetic example URLs in tests/fixtures don't trip it.
Runs under the normal ``python -m pytest tests/`` step in ci.yml.
"""

import re
from pathlib import Path

# A real Vimeo link: vimeo.com/<digits> or player.vimeo.com/video/<digits>.
_PLAINTEXT_VIMEO_RE = re.compile(r"(?:player\.)?vimeo\.com/(?:video/)?\d+", re.IGNORECASE)

_ROOT = Path(__file__).resolve().parent.parent


def _scan(text: str) -> list[str]:
    return _PLAINTEXT_VIMEO_RE.findall(text)


def test_guard_detects_a_planted_link():
    """Sanity-check the detector itself catches a plaintext link."""
    assert _scan("  vimeo_url: https://vimeo.com/12345/abc")
    assert _scan("https://player.vimeo.com/video/12345?h=deadbeef")
    assert _scan("  video_ref: r1XFgVXRABQBEcV0hdTxhVW1JZVEE") == []


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
