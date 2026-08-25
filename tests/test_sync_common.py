"""The offset map that lets a subtitle lookup reach the real transcript.

Subtitles are built from omit-stripped text, so a block reading «A B» does not
occur in a transcript reading «A (сміх) B». `strip_with_map` produces the view
the lookups run against plus, for every kept character, its index in the real
file. Everything downstream splices `transcript_uk.txt` through that map, so a
map that disagrees with the canonical stripper by one character writes every
subsequent edit at the wrong byte.
"""

import pytest

from tools.sync_common import raw_span, span_drops_text, strip_with_map
from tools.text_segmentation import strip_omitted_phrases

PHRASES = ["(сміх)", "(ще більше сміху)"]


class TestStripWithMap:
    def test_the_view_matches_the_canonical_stripper(self):
        text = "Він сказав (сміх) добре слово. І потім (ще більше сміху) він пішов."

        view, _offsets = strip_with_map(text, PHRASES)

        assert view == strip_omitted_phrases(text, PHRASES)

    def test_every_kept_character_points_at_itself_in_the_raw_text(self):
        text = "Він сказав (сміх) добре слово."

        view, offsets = strip_with_map(text, PHRASES)

        assert len(offsets) == len(view)
        for i, ch in enumerate(view):
            assert text[offsets[i]] == ch, f"view[{i}]={ch!r} does not point at itself"

    def test_no_phrases_is_an_identity_map(self):
        text = "Нічого прибирати не треба."

        view, offsets = strip_with_map(text, [])

        assert view == text
        assert offsets == list(range(len(text)))

    def test_a_phrase_that_does_not_occur_leaves_the_text_alone(self):
        text = "Тут немає жодної ремарки."

        view, offsets = strip_with_map(text, PHRASES)

        assert view == text
        assert offsets == list(range(len(text)))

    def test_a_view_that_disagrees_with_the_canonical_stripper_is_refused(self, monkeypatch):
        """The canonical stripper stays the single source of truth. A view that
        cannot reproduce it must be refused, not returned unverified — acting
        on it would splice every later edit at a shifted offset."""
        monkeypatch.setattr("tools.sync_common.strip_omitted_phrases", lambda *_a, **_k: "something else entirely")

        assert strip_with_map("Він сказав (сміх) добре слово.", PHRASES) is None

    @pytest.mark.parametrize("text", ["", "(сміх)", "(сміх) на початку.", "У кінці (сміх)", "А(сміх)Б"])
    def test_it_either_reproduces_the_stripper_or_refuses(self, text):
        mapped = strip_with_map(text, PHRASES)

        if mapped is not None:
            view, offsets = mapped
            assert view == strip_omitted_phrases(text, PHRASES)
            assert len(offsets) == len(view)


class TestSpans:
    def test_a_view_span_maps_onto_the_same_words_in_the_raw_text(self):
        text = "Він сказав (сміх) добре слово."
        view, offsets = strip_with_map(text, PHRASES)
        lo = view.index("добре")
        hi = lo + len("добре слово")

        raw_lo, raw_hi = raw_span(offsets, lo, hi)

        assert view[lo:hi] == "добре слово"
        assert text[raw_lo:raw_hi] == "добре слово"

    def test_a_span_that_swallows_a_remark_is_reported(self):
        """The transcript is the one artefact that keeps remarks, so an edit
        whose raw span covers one cannot be applied blindly."""
        text = "Він сказав (сміх) добре слово."
        view, offsets = strip_with_map(text, PHRASES)
        lo = view.index("сказав")
        hi = view.index("добре") + len("добре")

        assert span_drops_text(offsets, lo, hi) is True

    def test_a_span_clear_of_any_remark_is_not_reported(self):
        text = "Він сказав (сміх) добре слово."
        view, offsets = strip_with_map(text, PHRASES)
        lo = view.index("добре")
        hi = lo + len("добре слово")

        assert span_drops_text(offsets, lo, hi) is False

    def test_an_empty_span_drops_nothing(self):
        _view, offsets = strip_with_map("Він сказав (сміх) добре.", PHRASES)

        assert span_drops_text(offsets, 3, 3) is False
