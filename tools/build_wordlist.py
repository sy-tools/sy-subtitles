"""Build the Ukrainian domain wordlist the SPA's typo hints check against.

The hint engine calls a word known when EITHER a general Ukrainian dictionary
spells it or this list carries it. So this list only needs to hold what the
dictionary misses — the Sanskrit transliterations and Sahaja Yoga vocabulary the
talks are full of (`Ґрантхі`, `абхішека`, `адхармічний`). That is ~2.5k forms
rather than the corpus's ~34k, which matters less for bytes than for review: a
list that size is one a person can actually read and question.
"""

import argparse
import re
import sys
from collections.abc import Callable
from pathlib import Path

import yaml

# The vendored hunspell dictionary, named without its extension the way
# spylls/hunspell expect a dictionary pair to be addressed.
DICTIONARY_STEM = "uk_UA"

# Apostrophe forms are folded to the typographic one the project writes, so a
# word is not counted twice for the shape of its apostrophe.
_APOSTROPHES = str.maketrans({"'": "’", "ʼ": "’"})
# An apostrophe belongs to a word only BETWEEN letters: `п'ять` is one word, but
# a word quoted as ’вібрації’ is not three characters longer, and `туру ’89`
# holds no word at all. Taken greedily, the second case shipped a lone
# apostrophe as vocabulary. Combining marks are part of a word wherever they
# fall — the twin in site/js/typo_hints.js reads all of this the same way.
#
# Latin letters join a word run so that a word wearing a Latin lookalike arrives
# whole and can be rejected as one. Read as Cyrillic only, `Mати` left `ати` —
# not a word, unspelled by the dictionary, and therefore SHIPPED as vocabulary,
# which then vouched for the fragment everywhere it appeared. Five such
# fragments had reached the list this way.
_LETTERS = r"[Ѐ-ӿ̀-ͯA-Za-z]"
_WORD_RE = re.compile(rf"{_LETTERS}+(?:['’ʼ]{_LETTERS}+)*")
_CYRILLIC_RE = re.compile(r"[Ѐ-ӿ]")
_LATIN_RE = re.compile(r"[A-Za-z]")
# ...but a word carrying one is damage, not vocabulary: a stray acute inside
# `потрі́бно` is the kind of wreckage a reviewer's edit leaves behind, and the
# list must not bless it. The browser keeps such a word whole and hints on it;
# here it is simply not vouched for.
_COMBINING_RE = re.compile(r"[̀-ͯ]")


def fold_word(word: str) -> str:
    """The form the list is keyed by — the twin of `normalizeWord` in
    site/js/typo_hints.js, which folds what the user types the same way."""
    return word.lower().translate(_APOSTROPHES)


def read_words(text: str) -> set[str]:
    """Every distinct word in `text`, AS WRITTEN.

    Case survives this step because the dictionary is asked about the word as it
    appears: it holds `Лакшмі` and not `лакшмі`, and collapsing the two here
    would either bless the lowercase spelling or condemn the correct one.
    """
    return {
        w
        for w in _WORD_RE.findall(text)
        # Ukrainian words only: a Latin run is a name or a code the hint engine
        # never judges, and a word mixing the two scripts is damage — the same
        # kind as a stray combining mark, and vouched for just as wrongly.
        if _CYRILLIC_RE.search(w) and not _LATIN_RE.search(w) and not _COMBINING_RE.search(w)
    }


def collect_words(text: str) -> set[str]:
    """Every distinct word form in `text`, folded for lookup."""
    return {fold_word(w) for w in read_words(text)}


def select_wordlist(
    corpus: set[str],
    glossary: set[str],
    spelled: Callable[[str], bool],
) -> list[str]:
    """The forms worth shipping: everything the talks and the glossary use that
    the general dictionary cannot spell.

    Each word is judged AS WRITTEN and stored FOLDED. The browser asks the
    dictionary about the word the user typed, so this must ask the same
    question, or the two disagree on exactly the words that matter: `Лакшмі` is
    spelled and stays out, so writing `лакшмі` is still called out, while `ріші`
    — which the dictionary holds only capitalised and the talks write lowercase
    — belongs in the list. Folding on the way in is what the lookup expects.

    The glossary goes in whole rather than filtered by how often the corpus
    happens to use a term. A term is approved before it is common — frequency
    would drop the newest vocabulary, which is exactly what a translator is most
    likely to be typing for the first time.

    A lone letter is left out because the browser never asks about one: an
    initial or a stray keystroke is not a correction anyone can act on, so an
    entry for it could only ever be dead weight.
    """
    return sorted({fold_word(w) for w in corpus | glossary if len(w) > 1 and not spelled(w)})


def read_corpus(repo_root: Path) -> set[str]:
    """Every Ukrainian word the talks already use — transcripts and the subtitles
    built from them, as written."""
    words: set[str] = set()
    for path in sorted(repo_root.glob("talks/*/transcript_uk.txt")) + sorted(repo_root.glob("talks/*/*/final/uk.srt")):
        words |= read_words(path.read_text(encoding="utf-8-sig"))
    return words


def read_glossary(path: Path) -> set[str]:
    """The Ukrainian side of the term dictionary, word by word, as written. A
    `uk` value can hold several accepted spellings ("Аґія / Аґія чакра"); every
    word in every variant counts as declared vocabulary."""
    entries = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    words: set[str] = set()
    for entry in entries:
        if isinstance(entry, dict) and entry.get("uk"):
            words |= read_words(str(entry["uk"]))
    return words


def _spell_checker(dict_dir: Path) -> Callable[[str], bool]:
    """A cached lookup against the vendored hunspell dictionary.

    Imported here rather than at module scope so the pure helpers above — and
    their tests — do not need the dictionary or the parser.
    """
    from spylls.hunspell import Dictionary

    dictionary = Dictionary.from_files(str(dict_dir / DICTIONARY_STEM))
    cache: dict[str, bool] = {}

    def spelled(word: str) -> bool:
        if word not in cache:
            # Exactly the question the browser asks (js/typo_hints.js): the word
            # as written, in the apostrophe hunspell keys its entries with.
            # Both shapes the project may carry are folded here rather than left
            # to the aff file's `ICONV \u02bc '`, so the two twins agree by
            # construction and not by a feature of one parser.
            cache[word] = bool(dictionary.lookup(word.replace("\u2019", "'").replace("\u02bc", "'")))
        return cache[word]

    return spelled


def main(argv: list[str] | None = None) -> int:
    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--repo-root", type=Path, default=repo_root)
    parser.add_argument("--dict-dir", type=Path, default=repo_root / "site" / "dict")
    parser.add_argument("--glossary", type=Path, default=repo_root / "glossary" / "terms_lookup.yaml")
    parser.add_argument("--output", type=Path, default=repo_root / "site" / "dict" / "words_uk.txt")
    parser.add_argument(
        "--check",
        action="store_true",
        help="fail if the committed list is not what this run would write",
    )
    args = parser.parse_args(argv)

    words = select_wordlist(
        corpus=read_corpus(args.repo_root),
        glossary=read_glossary(args.glossary),
        spelled=_spell_checker(args.dict_dir),
    )
    rendered = "".join(w + "\n" for w in words)

    if args.check:
        current = args.output.read_text(encoding="utf-8") if args.output.exists() else ""
        if current != rendered:
            print(
                f"{args.output} is stale: {len(words)} forms expected. "
                "Run `python -m tools.build_wordlist` and commit the result.",
                file=sys.stderr,
            )
            return 1
        print(f"{args.output}: current ({len(words)} forms)")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(f"{args.output}: {len(words)} forms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
