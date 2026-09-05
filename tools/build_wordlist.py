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
# Every apostrophe shape is part of a word here, or `п'ять` would be read as two
# words and the list would vouch for the fragments instead of the word. So are
# combining marks — the twin in site/js/typo_hints.js reads them the same way.
_WORD_RE = re.compile(r"[Ѐ-ӿ̀-ͯ’'ʼ]+")
# ...but a word carrying one is damage, not vocabulary: a stray acute inside
# `потрі́бно` is the kind of wreckage a reviewer's edit leaves behind, and the
# list must not bless it. The browser keeps such a word whole and hints on it;
# here it is simply not vouched for.
_COMBINING_RE = re.compile(r"[̀-ͯ]")


def collect_words(text: str) -> set[str]:
    """Every distinct word form in `text`, lowercased and apostrophe-folded."""
    return {w.lower().translate(_APOSTROPHES) for w in _WORD_RE.findall(text) if not _COMBINING_RE.search(w)}


def select_wordlist(
    corpus: set[str],
    glossary: set[str],
    spelled: Callable[[str], bool],
) -> list[str]:
    """The forms worth shipping: everything the talks and the glossary use that
    the general dictionary cannot spell.

    The glossary is folded in whole rather than filtered by how often the corpus
    happens to use a term. A term is approved before it is common — frequency
    would drop the newest vocabulary, which is exactly what a translator is most
    likely to be typing for the first time.
    """
    return sorted(w for w in corpus | glossary if not spelled(w))


def read_corpus(repo_root: Path) -> set[str]:
    """Every Ukrainian word form the talks already use — transcripts and the
    subtitles built from them."""
    words: set[str] = set()
    for path in sorted(repo_root.glob("talks/*/transcript_uk.txt")) + sorted(repo_root.glob("talks/*/*/final/uk.srt")):
        words |= collect_words(path.read_text(encoding="utf-8-sig"))
    return words


def read_glossary(path: Path) -> set[str]:
    """The Ukrainian side of the term dictionary, word by word. A `uk` value can
    hold several accepted spellings ("Аґія / Аґія чакра"); every word in every
    variant counts as declared vocabulary."""
    entries = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    words: set[str] = set()
    for entry in entries:
        if isinstance(entry, dict) and entry.get("uk"):
            words |= collect_words(str(entry["uk"]))
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
            # Capitalised too: the dictionary marks proper nouns as capitalised
            # forms, and the corpus is folded to lowercase.
            cache[word] = bool(dictionary.lookup(word) or dictionary.lookup(word.capitalize()))
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
