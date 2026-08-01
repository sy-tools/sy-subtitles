"""Unit and property tests for tools/text_normalize.py.

Invisible characters are written as escapes on purpose: this repository bans
literal NBSP in source (tests/test_text_hygiene.py), and a literal here would
be silently repaired by the very tool under test.
"""

from hypothesis import given
from hypothesis import strategies as st

from tools.text_normalize import (
    ODD_SPACES,
    ZERO_WIDTH,
    sanitize_field_text,
    sanitize_file_text,
    sanitize_invisible,
)


class TestSanitizeInvisible:
    def test_nbsp_becomes_plain_space(self):
        assert sanitize_invisible("a\u00a0b") == "a b"

    def test_every_odd_space_becomes_plain_space(self):
        for ch in "\u00a0\u202f\u2002\u2003\u2007\u2009\u3000":
            assert sanitize_invisible(f"a{ch}b") == "a b", f"U+{ord(ch):04X} not normalized"

    def test_zero_width_characters_are_deleted(self):
        for ch in "\u200b\u200c\u200d\u00ad\ufeff":
            assert sanitize_invisible(f"a{ch}b") == "ab", f"U+{ord(ch):04X} not deleted"

    def test_newlines_and_runs_are_preserved(self):
        """The file-safe variant must not touch line structure."""
        assert sanitize_invisible("a\n\nb  c\td") == "a\n\nb  c\td"

    def test_clean_text_is_unchanged(self):
        assert sanitize_invisible("Сьогодні ми тут") == "Сьогодні ми тут"


class TestSanitizeFieldText:
    def test_line_breaks_become_a_single_space(self):
        assert sanitize_field_text("a\nb") == "a b"
        assert sanitize_field_text("a\r\nb") == "a b"
        assert sanitize_field_text("a\u2028b") == "a b"
        assert sanitize_field_text("a\u2029b") == "a b"

    def test_tabs_become_a_space(self):
        assert sanitize_field_text("a\tb") == "a b"

    def test_space_runs_collapse_and_ends_are_trimmed(self):
        assert sanitize_field_text("  a   b  ") == "a b"

    def test_nbsp_run_collapses_with_neighbouring_spaces(self):
        """The classic contenteditable double-space artefact."""
        assert sanitize_field_text("a \u00a0 b") == "a b"


class TestSanitizeFileText:
    def test_leading_bom_is_preserved(self):
        assert sanitize_file_text("\ufeffhello") == "\ufeffhello"

    def test_bom_inside_the_file_is_deleted(self):
        assert sanitize_file_text("hello\ufeffworld") == "helloworld"

    def test_crlf_becomes_lf(self):
        assert sanitize_file_text("a\r\nb\rc") == "a\nb\nc"

    def test_srt_structure_survives(self):
        srt = "1\n00:00:01,000 --> 00:00:02,000\nПривіт світ\n\n"
        assert sanitize_file_text(srt) == "1\n00:00:01,000 --> 00:00:02,000\nПривіт світ\n\n"


# Text drawn from the characters this module actually reasons about, so the
# generator spends its budget on the interesting cases rather than on random
# astral-plane codepoints.
_HYGIENE_ALPHABET = st.sampled_from(
    list("abcя .,!?\"'«»–—…\n\r\t")
    + list("\u00a0\u202f\u2002\u2003\u2007\u2009\u3000")
    + list("\u200b\u200c\u200d\u00ad\ufeff\u2028\u2029")
)
_HYGIENE_TEXT = st.text(alphabet=_HYGIENE_ALPHABET, max_size=60)


class TestInvariants:
    @given(_HYGIENE_TEXT)
    def test_sanitize_invisible_is_idempotent(self, text):
        once = sanitize_invisible(text)
        assert sanitize_invisible(once) == once

    @given(_HYGIENE_TEXT)
    def test_sanitize_field_text_is_idempotent(self, text):
        once = sanitize_field_text(text)
        assert sanitize_field_text(once) == once

    @given(_HYGIENE_TEXT)
    def test_sanitize_file_text_is_idempotent(self, text):
        once = sanitize_file_text(text)
        assert sanitize_file_text(once) == once

    @given(_HYGIENE_TEXT)
    def test_sanitize_invisible_only_touches_listed_characters(self, text):
        """Any character outside the two tables must survive untouched."""
        kept = [c for c in text if c not in ODD_SPACES and c not in ZERO_WIDTH]
        assert [c for c in sanitize_invisible(text) if c != " "] == [c for c in kept if c != " "]

    @given(_HYGIENE_TEXT)
    def test_field_text_output_is_single_line(self, text):
        result = sanitize_field_text(text)
        assert "\n" not in result and "\r" not in result and "\t" not in result
        assert "  " not in result
        assert result == result.strip()
