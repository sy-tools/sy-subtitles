"""The EN SRT that times a build: final/en.srt when the project has one, else source/en.srt.

source/en.srt is the English subtitle file as downloaded and stays untouched.
When its timing is wrong, the corrected English goes to final/en.srt, which is
also what amruta_package ships and what the SPA's EN track shows, so a rebuild
times the Ukrainian from it too.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import yaml

from tests.srt_helpers import write_srt_ms
from tools.build_map import cmd_prepare_timing
from tools.build_secondary_srts import build_secondary_srts
from tools.srt_utils import timing_en_srt
from tools.sync_plan import shadow_talk
from tools.validate_subtitles import manifest_validate_flags

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = ROOT / ".github" / "workflows" / "subtitle-pipeline.yml"


def _write(path: Path, blocks) -> Path:
    write_srt_ms(path, blocks)
    return path


def test_final_en_srt_wins_over_source(tmp_path):
    _write(tmp_path / "source" / "en.srt", [(0, 1000, "As downloaded.")])
    final = _write(tmp_path / "final" / "en.srt", [(500, 1500, "As downloaded.")])
    assert timing_en_srt(tmp_path) == final


def test_source_en_srt_is_used_when_there_is_no_final(tmp_path):
    source = _write(tmp_path / "source" / "en.srt", [(0, 1000, "As downloaded.")])
    assert timing_en_srt(tmp_path) == source


def test_a_final_en_srt_alone_is_enough(tmp_path):
    final = _write(tmp_path / "final" / "en.srt", [(0, 1000, "Built from whisper.")])
    assert timing_en_srt(tmp_path) == final


def test_no_en_srt_at_all_resolves_to_none(tmp_path):
    (tmp_path / "source").mkdir()
    assert timing_en_srt(tmp_path) is None


def test_prepare_timing_reads_the_corrected_final_en_srt(tmp_path):
    video = tmp_path / "talk" / "video1"
    _write(video / "source" / "en.srt", [(1000, 3000, "Hello world")])
    _write(video / "final" / "en.srt", [(4000, 6000, "Hello world")])

    cmd_prepare_timing(argparse.Namespace(talk_dir=str(tmp_path / "talk"), video_slug="video1", timing_source="en-srt"))

    data = json.loads((video / "work" / "timing.json").read_text(encoding="utf-8"))
    assert [(b["s"], b["e"]) for b in data["blocks"]] == [(4000, 6000)]


_EN = [f"This is sentence number {i} of the talk today." for i in range(1, 13)]
_UK = [f"Це речення номер {i} сьогоднішньої промови." for i in range(1, 13)]


def _blocks(texts, offset_ms=0, jitter=0):
    return [
        (offset_ms + i * 3000 + jitter * i, offset_ms + i * 3000 + jitter * i + 2000, t) for i, t in enumerate(texts)
    ]


def _two_video_talk(tmp_path: Path) -> Path:
    talk = tmp_path / "talk"
    talk.mkdir()
    meta = {
        "title": "T",
        "date": "1987-01-01",
        "language": "en",
        "videos": [
            {"slug": "vid1", "title": "vid1", "video_ref": "r1x", "sync": "primary"},
            {"slug": "vid2", "title": "vid2", "video_ref": "r1x", "sync": "derived"},
        ],
    }
    (talk / "meta.yaml").write_text(yaml.dump(meta, sort_keys=False), encoding="utf-8")
    (talk / "transcript_uk.txt").write_text("Текст.", encoding="utf-8")
    _write(talk / "vid1" / "final" / "uk.srt", _blocks(_UK))
    return talk


def test_the_secondary_bridge_uses_the_final_en_srts(tmp_path):
    talk = _two_video_talk(tmp_path)
    drifting = _blocks(_EN, offset_ms=5000, jitter=900)
    _write(talk / "vid1" / "source" / "en.srt", _blocks(_EN))
    _write(talk / "vid2" / "source" / "en.srt", drifting)
    _write(talk / "vid1" / "final" / "en.srt", _blocks(_EN))
    _write(talk / "vid2" / "final" / "en.srt", _blocks(_EN, offset_ms=7000))

    [result] = build_secondary_srts(talk, "vid1")

    assert result["mode"] == "secondary-offset"


def test_a_secondary_with_only_a_final_en_srt_is_built(tmp_path):
    talk = _two_video_talk(tmp_path)
    _write(talk / "vid1" / "source" / "en.srt", _blocks(_EN))
    _write(talk / "vid2" / "final" / "en.srt", _blocks(_EN, offset_ms=7000))

    [result] = build_secondary_srts(talk, "vid1")

    assert result["status"] == "built"


def test_revalidation_compares_against_the_final_en_srt(tmp_path):
    video = tmp_path / "vid1"
    _write(video / "source" / "en.srt", [(0, 1000, "As downloaded.")])
    final_en = _write(video / "final" / "en.srt", [(500, 1500, "As downloaded.")])
    uk = _write(video / "final" / "uk.srt", [(500, 1500, "Як завантажено.")])
    (video / "final" / "build_manifest.yaml").write_text("role: primary\nmode: en-srt\n", encoding="utf-8")

    flags = manifest_validate_flags(uk)

    assert flags["en_srt_path"] == str(final_en)


def test_the_sync_shadow_carries_the_final_en_srt(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    talk = tmp_path / "talks" / "1990-01-01_Some-Talk"
    (talk / "meta.yaml").parent.mkdir(parents=True)
    (talk / "meta.yaml").write_text("videos:\n  - slug: Video1\n", encoding="utf-8")
    _write(talk / "Video1" / "final" / "uk.srt", [(0, 1000, "Абзац.")])
    _write(talk / "Video1" / "source" / "en.srt", [(0, 1000, "Paragraph.")])
    _write(talk / "Video1" / "final" / "en.srt", [(200, 1000, "Paragraph.")])

    shadow = shadow_talk("talks/1990-01-01_Some-Talk", tmp_path / "tmp")

    assert (shadow / "Video1" / "final" / "en.srt").is_file(), "the shadowed validate would read source/en.srt"


def test_the_pipeline_never_names_source_en_srt_as_the_timing_file():
    text = PIPELINE.read_text(encoding="utf-8")
    code = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
    assert not re.search(r"source/en\.srt", code), "subtitle-pipeline.yml hard-codes source/en.srt"
    assert code.count("timing_en_srt") >= 2, "both the auto resolution and the validation anchor use the resolver"
