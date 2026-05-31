"""Tests for the one-time meta.yaml migration (tools/mask_video_refs.py)."""

import re

from tools.mask_video_refs import mask_meta_text
from tools.vimeo_codec import decode_video_ref

SAMPLE = """title: Test Talk
date: '2001-01-01'
location: Somewhere
amruta_url: https://www.amruta.org/x/
language: en
videos:
- slug: A
  title: A
  vimeo_url: https://vimeo.com/111111111/aaaaaaaaaa
- slug: B
  title: B
  vimeo_url: https://vimeo.com/222222222/bbbbbbbbbb
"""


def test_converts_vimeo_url_to_video_ref():
    out = mask_meta_text(SAMPLE)
    assert "vimeo_url" not in out
    assert "vimeo.com" not in out
    refs = re.findall(r"^  video_ref: (r1\S+)$", out, flags=re.MULTILINE)
    assert len(refs) == 2
    assert decode_video_ref(refs[0]) == "https://vimeo.com/111111111/aaaaaaaaaa"
    assert decode_video_ref(refs[1]) == "https://vimeo.com/222222222/bbbbbbbbbb"
    # Every other line is preserved verbatim (only the link lines changed).
    assert "- slug: A" in out
    assert "  title: A" in out
    assert "amruta_url: https://www.amruta.org/x/" in out


def test_idempotent():
    once = mask_meta_text(SAMPLE)
    twice = mask_meta_text(once)
    assert once == twice


def test_empty_vimeo_url_line_dropped():
    src = "videos:\n- slug: A\n  title: A\n  vimeo_url: ''\n"
    out = mask_meta_text(src)
    assert "vimeo_url" not in out
    assert "video_ref" not in out
    assert "- slug: A" in out


def test_quoted_vimeo_url_handled():
    src = "videos:\n- slug: A\n  title: A\n  vimeo_url: 'https://vimeo.com/111111111/aaaaaaaaaa'\n"
    out = mask_meta_text(src)
    ref = re.search(r"video_ref: (r1\S+)", out).group(1)
    assert decode_video_ref(ref) == "https://vimeo.com/111111111/aaaaaaaaaa"


def test_no_videos_unchanged():
    src = "title: T\ndate: '2001-01-01'\nlanguage: en\n"
    assert mask_meta_text(src) == src
