"""Tests for tools.align_uk."""

import json
import subprocess
import sys
from types import SimpleNamespace

from tools.align_uk import (
    align,
    align_words,
    build_word_alignment_prompt,
    call_claude_for_alignment,
    distribute_text_to_segments,
    group_whisper_by_pauses,
    load_transcript,
    main,
    map_paragraphs_to_segments,
    validate_segments,
    write_uk_whisper,
)

# --- load_transcript ---


def test_load_transcript_en_strips_header(sample_transcript_en_path):
    paragraphs = load_transcript(sample_transcript_en_path)
    assert len(paragraphs) == 5
    # Header lines should be stripped
    assert not any("Talk Language" in p for p in paragraphs)
    assert paragraphs[0].startswith("I bow to all")


def test_load_transcript_uk_double_spaced(sample_transcript_uk_path):
    paragraphs = load_transcript(sample_transcript_uk_path)
    assert len(paragraphs) == 5
    assert paragraphs[0].startswith("Я вклоняюся")


def test_load_transcript_uk_with_header(tmp_path):
    """UK transcript with translated header should have header stripped."""
    path = tmp_path / "transcript_uk.txt"
    path.write_text(
        "19 вересня 1993\n"
        "Пуджа Ґанеші\n"
        "Кампус, Кабелла-Ліґуре (Італія)\n"
        "Мова промови: англійська | Транскрипт (українська)\n"
        "\n"
        "Перший абзац.\n"
        "\n"
        "Другий абзац.\n",
        encoding="utf-8",
    )
    paragraphs = load_transcript(path)
    assert paragraphs == ["Перший абзац.", "Другий абзац."]


def test_load_transcript_short_first_paragraph(tmp_path):
    path = tmp_path / "short.txt"
    path.write_text("Hi.\n\nSecond paragraph here.\n\nThird one.", encoding="utf-8")
    paragraphs = load_transcript(path)
    assert len(paragraphs) == 3
    assert paragraphs[0] == "Hi."


# --- group_whisper_by_pauses ---


def test_group_whisper_by_pauses_single_group(sample_whisper_segments):
    groups = group_whisper_by_pauses(sample_whisper_segments, 1)
    assert len(groups) == 1
    assert len(groups[0]) == len(sample_whisper_segments)


def test_group_whisper_by_pauses_n_groups(sample_whisper_segments):
    n = 3
    groups = group_whisper_by_pauses(sample_whisper_segments, n)
    assert len(groups) == n
    total_segs = sum(len(g) for g in groups)
    assert total_segs == len(sample_whisper_segments)


def test_group_whisper_by_pauses_more_than_segments():
    segments = [
        {"id": 0, "start": 0, "end": 1},
        {"id": 1, "start": 2, "end": 3},
    ]
    groups = group_whisper_by_pauses(segments, 5)
    # Can't make more groups than segments
    assert len(groups) == 2


# --- map_paragraphs_to_segments ---


def test_map_paragraphs_equal_count(sample_whisper_segments):
    paragraphs = [f"Para {i}" for i in range(len(sample_whisper_segments))]
    mappings = map_paragraphs_to_segments(paragraphs, sample_whisper_segments)
    assert len(mappings) == len(sample_whisper_segments)
    assert all(m["uk_text"] for m in mappings)


def test_map_paragraphs_more_than_segments(sample_whisper_segments):
    paragraphs = [f"Para {i}" for i in range(len(sample_whisper_segments) + 5)]
    mappings = map_paragraphs_to_segments(paragraphs, sample_whisper_segments)
    # Extra paragraphs merged into last mapping
    assert len(mappings) == len(sample_whisper_segments)
    assert "Para" in mappings[-1]["uk_text"]


def test_map_paragraphs_empty():
    assert map_paragraphs_to_segments([], []) == []


# --- distribute_text_to_segments ---


def test_distribute_single_segment():
    mappings = [
        {
            "uk_text": "Весь текст тут.",
            "segments": [{"id": 0, "start": 0, "end": 5, "text": "All text here."}],
            "en_text": "All text here.",
        }
    ]
    result = distribute_text_to_segments(mappings)
    assert len(result) == 1
    assert result[0]["text"] == "Весь текст тут."


def test_distribute_multiple_segments_proportional():
    mappings = [
        {
            "uk_text": "Перше слово друге слово третє слово четверте слово",
            "segments": [
                {"id": 0, "start": 0, "end": 2, "text": "Short"},
                {"id": 1, "start": 2, "end": 5, "text": "A longer segment text"},
            ],
            "en_text": "Short A longer segment text",
        }
    ]
    result = distribute_text_to_segments(mappings)
    assert len(result) == 2
    # Both segments should have text
    assert result[0]["text"]
    assert result[1]["text"]
    # Combined text preserved
    combined = result[0]["text"] + " " + result[1]["text"]
    assert combined == "Перше слово друге слово третє слово четверте слово"


def test_distribute_empty_mapping_skipped():
    mappings = [
        {
            "uk_text": "Text",
            "segments": [],
            "en_text": "",
        }
    ]
    result = distribute_text_to_segments(mappings)
    assert len(result) == 0


# --- validate_segments ---


def test_validate_clean_segments():
    segments = [
        {
            "id": 0,
            "start": 0.0,
            "end": 5.0,
            "text": "Hello world",
            "words": [
                {"start": 0.0, "end": 2.0, "word": "Hello"},
                {"start": 2.0, "end": 5.0, "word": "world"},
            ],
        }
    ]
    warnings = validate_segments(segments)
    assert len(warnings) == 0


def test_validate_out_of_bounds():
    segments = [
        {
            "id": 0,
            "start": 1.0,
            "end": 3.0,
            "text": "Hello",
            "words": [
                {"start": 0.5, "end": 3.0, "word": "Hello"},
            ],
        }
    ]
    warnings = validate_segments(segments)
    assert any("starts before segment" in w for w in warnings)


def test_validate_non_monotonic():
    segments = [
        {
            "id": 0,
            "start": 0.0,
            "end": 5.0,
            "text": "Hello world",
            "words": [
                {"start": 3.0, "end": 4.0, "word": "Hello"},
                {"start": 1.0, "end": 2.0, "word": "world"},
            ],
        }
    ]
    warnings = validate_segments(segments)
    assert any("non-monotonic" in w for w in warnings)


# --- build_word_alignment_prompt ---


def test_build_prompt_contains_segment_words_and_format():
    batch = [
        {
            "id": 3,
            "start": 1.0,
            "end": 2.0,
            "uk_text": "привіт світ",
            "en_words": [{"start": 1.0, "end": 2.0, "word": "hello"}],
        }
    ]
    prompt = build_word_alignment_prompt(batch)
    assert "Segment 3" in prompt
    assert "привіт світ" in prompt
    assert "hello" in prompt
    assert "JSON" in prompt  # output-format instruction present


# --- call_claude_for_alignment (subprocess boundary mocked) ---


def _fake_run(stdout="", returncode=0, stderr=""):
    return lambda *a, **k: SimpleNamespace(stdout=stdout, returncode=returncode, stderr=stderr)


def test_call_claude_parses_json_array(monkeypatch):
    monkeypatch.setattr(
        "tools.align_uk.subprocess.run",
        _fake_run(stdout='preamble [{"id": 1, "words": []}] trailing'),
    )
    assert call_claude_for_alignment("p") == [{"id": 1, "words": []}]


def test_call_claude_nonzero_returns_none(monkeypatch):
    monkeypatch.setattr("tools.align_uk.subprocess.run", _fake_run(returncode=1, stderr="boom"))
    assert call_claude_for_alignment("p") is None


def test_call_claude_no_json_returns_none(monkeypatch):
    monkeypatch.setattr("tools.align_uk.subprocess.run", _fake_run(stdout="no json here"))
    assert call_claude_for_alignment("p") is None


def test_call_claude_timeout_returns_none(monkeypatch):
    def _boom(*a, **k):
        raise subprocess.TimeoutExpired(cmd="claude", timeout=120)

    monkeypatch.setattr("tools.align_uk.subprocess.run", _boom)
    assert call_claude_for_alignment("p") is None


def test_call_claude_missing_cli_returns_none(monkeypatch):
    def _boom(*a, **k):
        raise FileNotFoundError("claude")

    monkeypatch.setattr("tools.align_uk.subprocess.run", _boom)
    assert call_claude_for_alignment("p") is None


# --- align_words (Claude call mocked) ---


def test_align_words_uniform_when_segment_has_no_en_words():
    segs = [{"id": 1, "start": 0.0, "end": 2.0, "text": "слово два", "words": []}]
    whisper = [{"id": 1, "start": 0.0, "end": 2.0, "words": []}]
    out = align_words(segs, whisper)
    assert [w["word"] for w in out[0]["words"]] == ["слово", "два"]
    assert out[0]["words"][0]["start"] == 0.0
    assert out[0]["words"][-1]["end"] == 2.0


def test_align_words_skips_empty_text_segment(monkeypatch):
    segs = [{"id": 1, "start": 0.0, "end": 2.0, "text": "", "words": []}]
    whisper = [{"id": 1, "start": 0.0, "end": 2.0, "words": []}]
    monkeypatch.setattr("tools.align_uk.call_claude_for_alignment", lambda prompt: None)
    out = align_words(segs, whisper)
    assert out[0]["words"] == []  # untouched — nothing to align


def test_align_words_applies_claude_result(monkeypatch):
    segs = [{"id": 1, "start": 0.0, "end": 2.0, "text": "aa bb", "words": []}]
    whisper = [
        {"id": 1, "start": 0.0, "end": 2.0, "words": [{"start": 0.0, "end": 2.0, "word": "x"}]},
    ]
    canned = [{"id": 1, "words": [{"start": 0.0, "end": 1.0, "word": "aa"}, {"start": 1.0, "end": 2.0, "word": "bb"}]}]
    monkeypatch.setattr("tools.align_uk.call_claude_for_alignment", lambda prompt: canned)
    out = align_words(segs, whisper)
    assert out[0]["words"] == canned[0]["words"]


def test_align_words_falls_back_to_uniform_on_claude_failure(monkeypatch):
    segs = [{"id": 1, "start": 0.0, "end": 2.0, "text": "aa bb", "words": []}]
    whisper = [{"id": 1, "start": 0.0, "end": 2.0, "words": [{"start": 0.0, "end": 2.0, "word": "x"}]}]
    monkeypatch.setattr("tools.align_uk.call_claude_for_alignment", lambda prompt: None)
    out = align_words(segs, whisper)
    assert [w["word"] for w in out[0]["words"]] == ["aa", "bb"]  # uniform fallback


# --- write_uk_whisper ---


def test_write_uk_whisper_writes_language_and_segments(tmp_path):
    segs = [{"id": 1, "start": 0.0, "end": 1.0, "text": "x", "words": []}]
    out = tmp_path / "uk_whisper.json"
    write_uk_whisper(segs, str(out))
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["language"] == "uk"
    assert data["segments"] == segs


# --- align() + main() end-to-end (no Claude: --skip-word-align) ---


def test_align_skip_word_align_writes_output(tmp_path, sample_transcript_uk_path, sample_whisper_path):
    out = tmp_path / "uk_whisper.json"
    segments = align(
        str(sample_transcript_uk_path),
        str(sample_whisper_path),
        str(out),
        skip_word_align=True,
    )
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["language"] == "uk"
    assert len(data["segments"]) == len(segments)
    # uniform word timestamps were assigned for non-empty segments
    assert any(seg.get("words") for seg in data["segments"])


def test_align_runs_word_alignment_when_not_skipped(
    tmp_path, monkeypatch, sample_transcript_uk_path, sample_whisper_path
):
    # Mock the Claude boundary so the word-alignment path runs without a CLI.
    monkeypatch.setattr("tools.align_uk.call_claude_for_alignment", lambda prompt: None)
    out = tmp_path / "uk_whisper.json"
    segments = align(
        str(sample_transcript_uk_path),
        str(sample_whisper_path),
        str(out),
        skip_word_align=False,
    )
    assert out.is_file()
    assert len(segments) > 0


def test_main_cli_skip_word_align(tmp_path, monkeypatch, sample_transcript_uk_path, sample_whisper_path):
    out = tmp_path / "uk_whisper.json"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "align_uk",
            "--transcript",
            str(sample_transcript_uk_path),
            "--whisper-json",
            str(sample_whisper_path),
            "--output",
            str(out),
            "--skip-word-align",
        ],
    )
    main()
    assert out.is_file()
    assert json.loads(out.read_text(encoding="utf-8"))["language"] == "uk"
