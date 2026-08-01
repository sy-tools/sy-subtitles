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
    normalize_uk_typography,
    sanitize_edited_text,
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


class TestUkTypography:
    def test_straight_apostrophe_becomes_right_single_quote(self):
        assert normalize_uk_typography("м'ясо") == "м’ясо"

    def test_other_apostrophe_variants_are_unified(self):
        assert normalize_uk_typography("м‘ясо") == "м’ясо"
        assert normalize_uk_typography("мʼясо") == "м’ясо"

    def test_em_dash_becomes_en_dash(self):
        assert normalize_uk_typography("слово — слово") == "слово – слово"

    def test_other_dash_variants_become_en_dash(self):
        for ch in "‒−―":
            assert normalize_uk_typography(f"a {ch} b") == "a – b", f"U+{ord(ch):04X}"

    def test_ellipsis_character_becomes_three_dots(self):
        assert normalize_uk_typography("та…") == "та..."

    def test_space_before_ellipsis_is_removed_after_a_word(self):
        assert normalize_uk_typography("слово ...") == "слово..."
        assert normalize_uk_typography("слово …") == "слово..."

    def test_space_before_ellipsis_is_kept_after_a_dash(self):
        """Unrestricted stripping would produce the ugly en-dash-glued form."""
        assert normalize_uk_typography("– ...") == "– ..."

    def test_directional_double_quotes_map_by_their_own_direction(self):
        assert normalize_uk_typography("“Привіт”") == "«Привіт»"
        assert normalize_uk_typography("„Привіт”") == "«Привіт»"

    def test_straight_quote_opens_after_a_space(self):
        assert normalize_uk_typography('Він сказав: "Привіт"') == "Він сказав: «Привіт»"

    def test_straight_quote_opens_at_the_start_of_text(self):
        assert normalize_uk_typography('"Привіт", — сказав він') == "«Привіт», – сказав він"

    def test_nested_quotes_resolve_without_state(self):
        assert normalize_uk_typography('"Він сказав: "Привіт""') == "«Він сказав: «Привіт»»"

    def test_consecutive_openers_stay_openers(self):
        """After an opening guillemet the rule must open again, so nesting works."""
        assert normalize_uk_typography('""Привіт') == "««Привіт"

    def test_srt_timecode_line_is_untouched(self):
        line = "00:00:01,000 --> 00:00:02,000"
        assert normalize_uk_typography(line) == line

    def test_newlines_are_preserved(self):
        """Typography runs over whole files during cleanup; it must not join lines."""
        assert normalize_uk_typography("слово\n...") == "слово\n..."


class TestSanitizeEditedText:
    def test_uk_gets_both_treatments(self):
        assert sanitize_edited_text("м'ясо\u00a0смачне", "uk") == "м’ясо смачне"

    def test_non_uk_gets_invisible_cleanup_only(self):
        assert sanitize_edited_text('say "hi"\u00a0now', "en") == 'say "hi" now'

    def test_line_break_is_flattened_in_both_languages(self):
        assert sanitize_edited_text("a\nb", "uk") == "a b"
        assert sanitize_edited_text("a\nb", "en") == "a b"


class TestTypographyInvariants:
    @given(_HYGIENE_TEXT)
    def test_normalize_uk_typography_is_idempotent(self, text):
        once = normalize_uk_typography(text)
        assert normalize_uk_typography(once) == once

    @given(_HYGIENE_TEXT)
    def test_sanitize_edited_text_is_idempotent(self, text):
        once = sanitize_edited_text(text, "uk")
        assert sanitize_edited_text(once, "uk") == once

    @given(_HYGIENE_TEXT)
    def test_no_banned_character_survives_uk_normalization(self, text):
        result = normalize_uk_typography(text)
        for ch in "\"'‘ʼ“”„—‒−―…":
            assert ch not in result, f"U+{ord(ch):04X} survived normalization"

    @given(_HYGIENE_TEXT)
    def test_line_count_is_preserved(self, text):
        """Typography runs over whole files; it must never add or remove lines."""
        assert normalize_uk_typography(text).count("\n") == text.count("\n")
