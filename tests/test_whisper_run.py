"""Tests for whisper_run hallucination filter and segment processing."""

import json
import sys
import types

import pytest

from tools.whisper_run import is_hallucination, run_whisper


class TestIsHallucination:
    """Test hallucination detection for whisper segments."""

    def test_empty_string(self):
        assert is_hallucination("") is True

    def test_whitespace_only(self):
        assert is_hallucination("   ") is True

    def test_single_dot(self):
        assert is_hallucination(".") is True

    def test_multiple_dots(self):
        assert is_hallucination("...") is True

    def test_dots_with_spaces(self):
        assert is_hallucination(". . .") is True

    def test_ellipsis_unicode(self):
        assert is_hallucination("…") is True

    def test_mixed_dots_ellipsis(self):
        assert is_hallucination("...… .") is True

    def test_real_speech(self):
        assert is_hallucination("Today is the nineteenth Sahasrara day.") is False

    def test_short_real_word(self):
        assert is_hallucination("Yes") is False

    def test_sentence_with_dots(self):
        assert is_hallucination("I have to tell you...") is False

    def test_single_word(self):
        assert is_hallucination("Kundalini") is False

    def test_dot_with_text(self):
        assert is_hallucination(". hello") is False

    def test_leading_trailing_spaces(self):
        assert is_hallucination("  .  ") is True

    def test_leading_trailing_real(self):
        assert is_hallucination("  hello  ") is False


class TestWhisperRunExecutesConfig:
    """Run run_whisper against a stub faster_whisper and assert the kwargs the
    REAL transcribe call receives — grep-of-source tests stayed green as long
    as the literal appeared anywhere in the function (even a comment), without
    ever executing the production path."""

    class _Word:
        def __init__(self, start, end, word):
            self.start, self.end, self.word = start, end, word

    class _Segment:
        def __init__(self, start, end, text, words=None):
            self.start, self.end, self.text, self.words = start, end, text, words or []

    @pytest.fixture
    def run(self, monkeypatch, tmp_path):
        """Execute run_whisper once with a capturing stub; return (transcribe
        kwargs, model-init args, parsed output JSON)."""
        captured = {}
        seg = self._Segment
        word = self._Word

        class WhisperModel:
            def __init__(self, model, device=None, compute_type=None):
                captured["init"] = {"model": model, "device": device, "compute_type": compute_type}

            def transcribe(self, path, **kwargs):
                captured["kwargs"] = kwargs
                segments = iter(
                    [
                        seg(0.0, 1.0, "..."),  # hallucination — must be filtered
                        seg(1.5, 3.0, "Real speech here.", [word(1.5, 2.0, "Real "), word(2.0, 3.0, "speech")]),
                    ]
                )
                info = types.SimpleNamespace(language="en")
                return segments, info

        fake = types.ModuleType("faster_whisper")
        fake.WhisperModel = WhisperModel
        monkeypatch.setitem(sys.modules, "faster_whisper", fake)

        out = tmp_path / "whisper.json"
        run_whisper(str(tmp_path / "video.mp4"), str(out), model="medium", language="en")
        return captured["kwargs"], captured["init"], json.loads(out.read_text(encoding="utf-8"))

    def test_anti_hallucination_transcribe_kwargs(self, run):
        kwargs, _init, _out = run
        assert kwargs["vad_filter"] is True
        assert kwargs["condition_on_previous_text"] is False  # default True LOOPS on long talks
        assert kwargs["word_timestamps"] is True
        assert kwargs["language"] == "en"
        assert kwargs["hallucination_silence_threshold"] > 0
        assert kwargs["repetition_penalty"] > 1
        assert kwargs["vad_parameters"]["min_silence_duration_ms"] > 0

    def test_model_instantiated_from_faster_whisper(self, run):
        _kwargs, init, _out = run
        assert init["model"] == "medium"
        assert init["compute_type"] == "int8"

    def test_output_filters_hallucinations_and_keeps_words(self, run):
        _kwargs, _init, out = run
        texts = [s["text"] for s in out["segments"]]
        assert texts == ["Real speech here."]
        assert out["segments"][0]["words"] == [
            {"start": 1.5, "end": 2.0, "word": "Real"},
            {"start": 2.0, "end": 3.0, "word": "speech"},
        ]
        assert out["language"] == "en"


class TestHallucinationOnRealData:
    """Test hallucination filter on patterns from real whisper output."""

    @pytest.fixture
    def puja_whisper(self):
        """Load puja whisper.json if available (before cleanup)."""
        # Use the known hallucination patterns from the puja video
        return [
            {"text": ".", "start": 62.26, "end": 62.3},
            {"text": ".", "start": 108.0, "end": 108.8},
            {"text": "", "start": 109.8, "end": 109.8},
            {"text": ".", "start": 116.0, "end": 116.3},
            {"text": "  .  ", "start": 120.0, "end": 120.5},
            {"text": "...", "start": 130.0, "end": 131.0},
            {"text": "… .", "start": 140.0, "end": 141.0},
        ]

    def test_all_puja_segments_detected_as_hallucination(self, puja_whisper):
        for seg in puja_whisper:
            assert is_hallucination(seg["text"]) is True, f"Should detect hallucination: {seg['text']!r}"

    def test_real_talk_segments_pass(self):
        real_segments = [
            "Today is the 19th Sahastrara day.",
            "If you count the first one, the day Sahastrara was opened.",
            "They had a big meeting in the heavens.",
            "I am sure it will work out. Next year I hope I will have some good news.",
        ]
        for text in real_segments:
            assert is_hallucination(text) is False, f"Should pass real speech: {text!r}"
