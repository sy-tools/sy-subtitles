"""Tests for tools.extract_review — SRT → '[N] text' review format."""

from __future__ import annotations

import sys

from tools.extract_review import extract_review_text, main

SAMPLE_SRT = "1\n00:00:01,000 --> 00:00:02,000\nHello there\n\n2\n00:00:03,000 --> 00:00:04,000\nsecond line\n\n"


def test_extract_review_text_numbers_and_flattens():
    blocks = [
        {"idx": 1, "start_ms": 0, "end_ms": 1000, "text": "Hello there"},
        {"idx": 2, "start_ms": 2000, "end_ms": 3000, "text": "wrapped\nover two"},
    ]
    assert extract_review_text(blocks) == "[1] Hello there\n[2] wrapped over two"


def test_extract_review_text_empty_blocks():
    assert extract_review_text([]) == ""


def test_main_prints_to_stdout(tmp_path, monkeypatch, capsys):
    srt = tmp_path / "in.srt"
    srt.write_text(SAMPLE_SRT, encoding="utf-8")
    monkeypatch.setattr(sys, "argv", ["extract_review", "--srt", str(srt)])
    main()
    out = capsys.readouterr().out
    assert "[1] Hello there" in out
    assert "[2] second line" in out


def test_main_writes_output_file(tmp_path, monkeypatch):
    srt = tmp_path / "in.srt"
    srt.write_text(SAMPLE_SRT, encoding="utf-8")
    out = tmp_path / "review.txt"
    monkeypatch.setattr(sys, "argv", ["extract_review", "--srt", str(srt), "--output", str(out)])
    main()
    assert out.read_text(encoding="utf-8") == "[1] Hello there\n[2] second line\n"
