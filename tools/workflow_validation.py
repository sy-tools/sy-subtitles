"""Validators for values that flow from PR-controlled inputs into workflow shell/Python.

Used by workflows that build matrices from meta.yaml or accept free-form inputs.
Reject anything outside a strict allowlist — fail loud before values reach `run:`.
"""

from __future__ import annotations

import re
import sys

TALK_ID_RE = re.compile(r"^\d{4}-\d{2}-\d{2}_[A-Za-z0-9_.-]{1,80}$")
VIDEO_SLUG_RE = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
VIMEO_URL_RE = re.compile(r"^https://(?:www\.)?(?:vimeo\.com|player\.vimeo\.com/video)/\d+(?:/[0-9a-f]+)?/?$")


class InvalidWorkflowInput(ValueError):
    pass


def validate_talk_id(value: str) -> str:
    if not TALK_ID_RE.fullmatch(value):
        raise InvalidWorkflowInput(f"invalid talk_id: {value!r}")
    return value


def validate_video_slug(value: str) -> str:
    if not VIDEO_SLUG_RE.fullmatch(value):
        raise InvalidWorkflowInput(f"invalid video slug: {value!r}")
    return value


def validate_vimeo_url(value: str) -> str:
    if not VIMEO_URL_RE.fullmatch(value):
        raise InvalidWorkflowInput(f"invalid vimeo_url: {value!r}")
    return value


def validate_video_ref(value: str) -> str:
    """Validate an obfuscated ``video_ref`` (see tools/vimeo_codec.py).

    Decodes the ref and re-checks the resulting URL against ``VIMEO_URL_RE`` so
    the injection protection survives the obfuscation layer. Returns the ref
    unchanged on success.
    """
    # Imported lazily to keep this module's import graph light for workflows.
    from tools.vimeo_codec import decode_video_ref

    try:
        url = decode_video_ref(value)
    except ValueError as e:
        raise InvalidWorkflowInput(f"invalid video_ref: {value!r} ({e})") from None
    if not VIMEO_URL_RE.fullmatch(url):
        raise InvalidWorkflowInput(f"video_ref {value!r} decodes to invalid vimeo_url: {url!r}")
    return value


def die(msg: str) -> None:
    print(f"::error::{msg}", file=sys.stderr)
    sys.exit(1)
