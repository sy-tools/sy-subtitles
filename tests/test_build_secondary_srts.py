"""Tests for tools.build_secondary_srts.

Secondary videos of a multi-video talk derive their UK SRT from the primary's
UK SRT. The derivation bridges the two timelines via en.srt word matching
(offset when the shift is constant, resync otherwise), so it needs source/en.srt
on BOTH the primary and the secondary — independent of the talk's timing_source.
A secondary without en.srt (a raw recording, no English subtitles) is skipped,
not a build failure.
"""

from __future__ import annotations

from pathlib import Path

import yaml

from tests.srt_helpers import write_srt_ms as _write_srt
from tools.build_secondary_srts import build_secondary_srts
from tools.srt_utils import parse_srt

_EN_TEXT = [f"This is sentence number {i} of the talk today." for i in range(1, 13)]
_UK_TEXT = [f"Це речення номер {i} сьогоднішньої промови." for i in range(1, 13)]


def _blocks(texts: list[str], offset_ms: int = 0, jitter: int = 0, dur: int = 2000, gap: int = 1000):
    out = []
    t = offset_ms
    for i, txt in enumerate(texts):
        start = t + (jitter * i)
        out.append((start, start + dur, txt))
        t += dur + gap
    return out


def _setup_talk(tmp_path: Path, videos: dict[str, dict]) -> Path:
    """Create a talk dir.

    videos: ordered dict slug -> {"en": blocks|None, "uk": blocks|None}.
    The first slug is treated as the primary by the caller.
    """
    talk = tmp_path / "talk"
    talk.mkdir(parents=True)
    meta = {
        "title": "Test Talk",
        "date": "1982-01-01",
        "language": "en",
        "videos": [{"slug": s, "title": s, "video_ref": "r1x"} for s in videos],
    }
    (talk / "meta.yaml").write_text(yaml.dump(meta, sort_keys=False), encoding="utf-8")
    (talk / "transcript_uk.txt").write_text("Текст промови.", encoding="utf-8")
    for slug, cfg in videos.items():
        if cfg.get("en") is not None:
            _write_srt(talk / slug / "source" / "en.srt", cfg["en"])
        if cfg.get("uk") is not None:
            _write_srt(talk / slug / "final" / "uk.srt", cfg["uk"])
    return talk


def _result_for(results: list[dict], slug: str) -> dict:
    return next(r for r in results if r["slug"] == slug)


# ---------------------------------------------------------------------------
#  Regression for the #524/#525 crash: mixed secondaries, one without en.srt
# ---------------------------------------------------------------------------


def test_mixed_secondaries_builds_with_ensrt_skips_without(tmp_path):
    """A secondary with en.srt gets a uk.srt; a secondary without en.srt is
    skipped — and the run does NOT crash (the bug that failed #524/#525)."""
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"en": _blocks(_EN_TEXT), "uk": _blocks(_UK_TEXT)},  # primary
            "vid2": {"en": _blocks(_EN_TEXT, offset_ms=5000)},  # constant offset
            "vid3": {},  # raw recording, no en.srt
        },
    )

    results = build_secondary_srts(talk, "vid1")

    r2 = _result_for(results, "vid2")
    r3 = _result_for(results, "vid3")
    assert r2["status"] == "built"
    assert r2["mode"] == "secondary-offset"
    assert (talk / "vid2" / "final" / "uk.srt").exists()
    assert len(parse_srt(str(talk / "vid2" / "final" / "uk.srt"))) > 0

    assert r3["status"] == "skipped"
    assert "en.srt" in (r3["reason"] or "")
    assert not (talk / "vid3" / "final" / "uk.srt").exists()


# ---------------------------------------------------------------------------
#  offset vs resync selection
# ---------------------------------------------------------------------------


def test_constant_offset_uses_offset_mode(tmp_path):
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"en": _blocks(_EN_TEXT), "uk": _blocks(_UK_TEXT)},
            "vid2": {"en": _blocks(_EN_TEXT, offset_ms=7000)},
        },
    )
    results = build_secondary_srts(talk, "vid1")
    assert _result_for(results, "vid2")["mode"] == "secondary-offset"


def test_inconsistent_offset_falls_back_to_resync(tmp_path):
    """When the shift is not constant (per-block jitter beyond tolerance),
    detect_offset returns None and the tool resyncs instead."""
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"en": _blocks(_EN_TEXT), "uk": _blocks(_UK_TEXT)},
            "vid2": {"en": _blocks(_EN_TEXT, offset_ms=5000, jitter=900)},
        },
    )
    results = build_secondary_srts(talk, "vid1")
    r2 = _result_for(results, "vid2")
    assert r2["status"] == "built"
    assert r2["mode"] == "secondary-resync"
    assert (talk / "vid2" / "final" / "uk.srt").exists()


# ---------------------------------------------------------------------------
#  Gate is en.srt presence, independent of mode
# ---------------------------------------------------------------------------


def test_secondary_without_ensrt_is_skipped(tmp_path):
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"en": _blocks(_EN_TEXT), "uk": _blocks(_UK_TEXT)},
            "vid2": {},  # no en.srt
        },
    )
    results = build_secondary_srts(talk, "vid1")
    r2 = _result_for(results, "vid2")
    assert r2["status"] == "skipped"
    assert not (talk / "vid2" / "final" / "uk.srt").exists()


def test_primary_without_ensrt_skips_all_secondaries(tmp_path):
    """True whisper-mode talk (no en.srt anywhere): the en.srt bridge can't be
    built from the primary, so every secondary is skipped — without crashing."""
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"uk": _blocks(_UK_TEXT)},  # primary, no en.srt
            "vid2": {"en": _blocks(_EN_TEXT, offset_ms=5000)},
        },
    )
    results = build_secondary_srts(talk, "vid1")
    r2 = _result_for(results, "vid2")
    assert r2["status"] == "skipped"
    assert "primary" in (r2["reason"] or "").lower()
    assert not (talk / "vid2" / "final" / "uk.srt").exists()


# ---------------------------------------------------------------------------
#  build_manifest.yaml
# ---------------------------------------------------------------------------


def test_builds_secondary_manifest(tmp_path):
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"en": _blocks(_EN_TEXT), "uk": _blocks(_UK_TEXT)},
            "vid2": {"en": _blocks(_EN_TEXT, offset_ms=5000)},
        },
    )
    build_secondary_srts(talk, "vid1", run_id=12345)
    manifest_path = talk / "vid2" / "final" / "build_manifest.yaml"
    assert manifest_path.exists()
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    assert manifest["role"] == "secondary"
    assert manifest["mode"] == "secondary-offset"
    assert manifest["primary_slug"] == "vid1"
    assert manifest["run_id"] == 12345


def test_no_manifest_for_skipped_secondary(tmp_path):
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"en": _blocks(_EN_TEXT), "uk": _blocks(_UK_TEXT)},
            "vid2": {},
        },
    )
    build_secondary_srts(talk, "vid1")
    assert not (talk / "vid2" / "final" / "build_manifest.yaml").exists()


def test_returns_one_result_per_secondary(tmp_path):
    talk = _setup_talk(
        tmp_path,
        {
            "vid1": {"en": _blocks(_EN_TEXT), "uk": _blocks(_UK_TEXT)},
            "vid2": {"en": _blocks(_EN_TEXT, offset_ms=5000)},
            "vid3": {},
        },
    )
    results = build_secondary_srts(talk, "vid1")
    assert {r["slug"] for r in results} == {"vid2", "vid3"}
