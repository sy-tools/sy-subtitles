"""The video the real YouTube e2e gate plays must be one the project plays.

The gate is on by default, so its pin is checked against `talks/` — here, in
the unit lane, because a talk-data PR runs no browser shard
(tests/test_ci_change_classes.py) and could otherwise remove the pinned talk
unnoticed. The pin is read from the e2e module's source, not imported: that
module pulls in Playwright fixtures.
"""

from __future__ import annotations

import ast
from pathlib import Path

import yaml

from tools.vimeo_codec import decode_video_source

ROOT = Path(__file__).resolve().parent.parent
E2E_MODULE = ROOT / "tests" / "test_sync_player_integration.py"


def _module_constant(path: Path, name: str) -> str:
    for node in ast.parse(path.read_text(encoding="utf-8")).body:
        if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise AssertionError(f"{name} is not assigned at module level in {path.name}")


def _corpus_video_refs() -> set[str]:
    return {
        video.get("video_ref")
        for meta in (ROOT / "talks").glob("*/meta.yaml")
        for video in (yaml.safe_load(meta.read_text(encoding="utf-8")) or {}).get("videos") or []
    }


def test_the_pinned_youtube_video_is_a_corpus_talk():
    pin = _module_constant(E2E_MODULE, "TEST_YOUTUBE_REF")
    assert decode_video_source(pin).provider == "yt"
    assert pin in _corpus_video_refs(), "pin a video_ref that a talk in talks/ carries"
