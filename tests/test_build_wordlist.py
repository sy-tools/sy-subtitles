import json
from pathlib import Path

import pytest

from tools.build_wordlist import collect_words, select_wordlist

SHIPPED = Path(__file__).resolve().parent.parent / "site" / "dict" / "words_uk.txt"

# Shared with tests/test_typo_hints.js: this file folds the shipped list, the JS
# module folds what the user types before looking it up. Divergence would key
# the list one way and query it another, underlining correct words.
_CASES = json.loads(
    (Path(__file__).parent / "fixtures" / "wordlist_normalization_cases.json").read_text(encoding="utf-8")
)["cases"]


def test_collects_word_forms_from_ukrainian_text():
    words = collect_words("Кундаліні піднімається через Сушумну.")

    assert words == {"кундаліні", "піднімається", "через", "сушумну"}


def test_folds_apostrophe_shapes_together():
    """The project writes ’, but editors and pasted text produce ' and ʼ. Three
    spellings of one word would otherwise take three slots in the list, and the
    two that no longer appear in any talk would go on vouching for nothing."""
    words = collect_words("бгакті пʼять п'ять п’ять")

    assert words == {"бгакті", "п’ять"}


def test_a_word_needs_a_letter_and_does_not_keep_the_quotes_around_it():
    """An apostrophe is only part of a word BETWEEN letters. Taken greedily it
    swallows the quotes a word sits in and, in `туру ’89`, produces a "word"
    that is a lone apostrophe — which then ships as vocabulary, vouching for
    nothing."""
    words = collect_words("він сказав ’вібрації’ у турі ’89")

    assert words == {"він", "сказав", "вібрації", "у", "турі"}


def test_never_vouches_for_a_word_carrying_a_stray_accent():
    """A combining acute inside a word is damage, not vocabulary — the kind a
    reviewer's edit leaves behind. Two things must not happen: the word must not
    be blessed in that shape, and it must not be cut at the mark either, or the
    list would vouch for two fragments that are not words at all.

    site/js/typo_hints.js keeps the same word whole so the hint lands on all of
    it; here it is simply dropped."""
    words = collect_words("цей вузол потрі́бно розв’язати")

    assert words == {"цей", "вузол", "розв’язати"}


def test_ignores_latin_and_digits():
    """The list vouches for Ukrainian words. A Latin run in a Ukrainian talk is
    a name or a code the hint engine does not judge, and a digit is not a word."""
    words = collect_words("Sahaja Йога 1979 вібрації")

    assert words == {"йога", "вібрації"}


# select_wordlist -------------------------------------------------------------
#
# The browser calls a word known when EITHER the general dictionary spells it or
# this list carries it, so the list only has to hold what the dictionary misses.


def test_drops_words_the_dictionary_already_spells():
    words = select_wordlist(corpus={"вібрації", "ґрантхі"}, glossary=set(), spelled={"вібрації"}.__contains__)

    assert words == ["ґрантхі"]


def test_judges_a_word_as_the_corpus_writes_it_and_stores_it_folded():
    """The browser asks the dictionary about the word as written, so this must
    too, or the two disagree on exactly the words that matter.

    `Лакшмі` is spelled and stays out — a translator writing `лакшмі` should
    still be told. `ріші` is a Sanskrit common noun the dictionary knows only
    capitalised, and the corpus writes it lowercase, so it belongs in the list.
    Both are stored folded, because that is how the list is looked up.
    """
    spelled = {"Лакшмі", "Ріші"}.__contains__

    words = select_wordlist(corpus={"Лакшмі", "Ґрантхі", "ріші"}, glossary=set(), spelled=spelled)

    # Sorted by code point, which puts ґ (U+0491, outside the main Cyrillic
    # block) last. The order only has to be stable, so the file's diff stays
    # readable — it is never read alphabetically by a person or a machine.
    assert words == ["ріші", "ґрантхі"]


def test_keeps_a_glossary_term_the_corpus_has_never_used():
    """The glossary is the declared vocabulary. A term can be approved before it
    appears in a single talk, and it must not be underlined the first time a
    translator types it."""
    words = select_wordlist(corpus=set(), glossary={"парамешвара"}, spelled=lambda w: False)

    assert words == ["парамешвара"]


def test_sorts_so_the_file_only_changes_when_the_vocabulary_does():
    """The list is committed, so a stable order keeps its diff readable and
    keeps an unrelated edit from rewriting the whole file."""
    words = select_wordlist(corpus={"яма", "абхішека", "ґрантхі"}, glossary=set(), spelled=lambda w: False)

    assert words == sorted(words)


# The shipped list -------------------------------------------------------------
#
# Regenerating it needs the dictionary and a pass over every talk (~10s), which
# is too slow for this lane. These guard the file's shape instead, so a
# corrupted or half-written list cannot ship; `python -m tools.build_wordlist
# --check` verifies it is current.


def test_the_shipped_list_is_sorted_and_free_of_duplicates():
    lines = SHIPPED.read_text(encoding="utf-8").splitlines()

    assert lines == sorted(set(lines))


def test_the_shipped_list_holds_only_lowercase_ukrainian_word_forms():
    """A stray Latin word, a capital or a line of punctuation would silently
    vouch for something the checker was never meant to accept."""
    lines = SHIPPED.read_text(encoding="utf-8").splitlines()

    assert [ln for ln in lines if collect_words(ln) != {ln}] == []


def test_the_shipped_list_carries_the_vocabulary_it_exists_for():
    """Transliterated Sahaja Yoga terms are exactly what a general Ukrainian
    dictionary cannot spell — if these are missing, the list is not doing its
    job and every talk would underline its own vocabulary."""
    lines = set(SHIPPED.read_text(encoding="utf-8").splitlines())

    assert {"ґрантхі", "абхішека", "сахасрара"} <= lines


# Twin parity -----------------------------------------------------------------


@pytest.mark.parametrize("case", _CASES, ids=[c["input"] for c in _CASES])
def test_folds_a_word_the_way_the_browser_will(case):
    assert collect_words(case["input"]) == {case["word"]}, case["why"]


# Against the real dictionary ---------------------------------------------------
#
# The builder's own oracle, asked the questions the browser will ask. Its twin
# lives in tests/test_typo_hints.js and runs the SAME table through the real
# browser composition — between them they pin both halves, which is what a case
# bug once slipped past: lowercasing before asking underlined `Ісус`, `Христос`,
# `Крішна` and `Лакшмі`, 610 forms of this material's own vocabulary.


@pytest.mark.slow
@pytest.mark.parametrize(
    ("word", "expect_known"),
    [
        # Proper nouns the dictionary holds only capitalised. Judged as written,
        # so the correct spelling passes...
        ("Ісус", True),
        ("Христос", True),
        ("Лакшмі", True),
        ("Індія", True),
        # ...and the lowercase spelling of a name is still called out.
        ("індія", False),
        # An ordinary word with the apostrophe the project writes: the dictionary
        # keys its 5420 apostrophe entries with the straight one.
        ("розв’язати", True),
        ("сім’я", True),
        # Vocabulary only the shipped list can vouch for.
        ("Ґрантхі", True),
        ("абхішека", True),
        # Real defects from the manual pass this feature automates (PR #1017).
        ("відрації", False),
        ("думаєие", False),
        ("дужде", False),
        ("пробуддженням", False),
    ],
)
def test_the_real_dictionary_and_the_shipped_list_agree_with_the_browser(word, expect_known):
    from tools.build_wordlist import DICTIONARY_STEM, _spell_checker, fold_word

    spelled = _spell_checker(SHIPPED.parent)
    shipped = set(SHIPPED.read_text(encoding="utf-8").split())
    # The composition site/js/typo_hints.js applies, spelled out here.
    known = fold_word(word) in shipped or spelled(word)

    assert known is expect_known, f"{word}: {DICTIONARY_STEM} + words_uk.txt disagree with the browser"
