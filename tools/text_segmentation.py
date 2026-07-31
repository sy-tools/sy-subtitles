"""Shared text-segmentation helpers for subtitle tooling.

One place for all transcript-facing tools (build_map, sync_transcript_to_srt,
align_uk) to go for:

  * load_transcript(path) — strip the metadata header and the declared
    editorial remarks, return the list of paragraphs (handles both
    single-newline and double-newline paragraph separators).
  * strip_omitted_phrases(text, phrases) — drop declared editorial
    remarks ("(сміх)") that belong in the transcript but not on screen.
  * split_sentences(text) — sentence boundaries at .!? (optionally
    inside closing quotes/brackets) + uppercase, with an abbreviation
    blacklist.
  * split_text_to_lines(text) — recursive splitter that keeps each line
    at or below MAX_CPL characters, preferring good break points
    (punctuation, conjunctions, prepositions).
"""

import re
from functools import lru_cache
from pathlib import Path

import yaml

MAX_CPL = 84

# ---------------------------------------------------------------------------
# Declared editorial remarks (see glossary/subtitle_omit.yaml)
# ---------------------------------------------------------------------------

GLOBAL_OMIT_SPEC = Path(__file__).resolve().parent.parent / "glossary" / "subtitle_omit.yaml"

# Applied only to text an omission actually touched, so untouched transcripts
# pass through byte-identical.
_OMIT_CLEANUPS = (
    (re.compile(r"[^\S\n]{2,}"), " "),  # collapse the gap the remark left behind
    (re.compile(r"[^\S\n]+([.,;:!?])"), r"\1"),  # no space before punctuation
    (re.compile(r"([!?])\."), r"\1"),  # the remark's own period, now stranded
)


def _read_omit_list(path: Path, key: str) -> tuple[str, ...]:
    """Read a list of declared phrases from a YAML mapping; () if absent."""
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError):
        return ()
    if not isinstance(data, dict):
        return ()
    phrases = data.get(key) or []
    if not isinstance(phrases, list):
        return ()
    return tuple(p for p in phrases if isinstance(p, str) and p.strip())


@lru_cache(maxsize=1)
def global_omit_phrases() -> tuple[str, ...]:
    """Corpus-wide editorial remarks from glossary/subtitle_omit.yaml."""
    return _read_omit_list(GLOBAL_OMIT_SPEC, "omit_exact")


def talk_omit_phrases(transcript_path: str | Path) -> tuple[str, ...]:
    """One-off remarks declared in the talk's own meta.yaml, next to the
    transcript. Absent meta.yaml (a tmp fixture, a snapshot) simply means
    no talk-level additions."""
    return _read_omit_list(Path(transcript_path).parent / "meta.yaml", "subtitle_omit")


def strip_omitted_phrases(text: str, phrases) -> str:
    """Remove every declared phrase from `text`, then tidy what it left behind.

    Matching is exact and case-insensitive; longest phrases go first so a
    short entry can never eat part of a longer declared remark.
    """
    stripped = text
    for phrase in sorted(phrases, key=len, reverse=True):
        stripped = re.sub(re.escape(phrase), "", stripped, flags=re.IGNORECASE)
    if stripped == text:
        return text
    for pattern, repl in _OMIT_CLEANUPS:
        stripped = pattern.sub(repl, stripped)
    return stripped.strip()


# ---------------------------------------------------------------------------
# Transcript loading
# ---------------------------------------------------------------------------


def load_transcript(path: str, omit_phrases=None) -> list[str]:
    """Load transcript text and split into paragraphs.

    Supports both formats:
    - transcript_uk.txt: paragraphs separated by double line breaks (\\n\\n)
    - transcript_en.txt: one paragraph per line (single \\n)

    Strips metadata header (date, location, language lines at the top) and the
    declared editorial remarks (see glossary/subtitle_omit.yaml). Every
    subtitle-facing tool loads transcripts through here, so the builder's view
    of the text and the validator's view cannot drift apart.

    `omit_phrases` overrides spec discovery — pass [] to keep every remark.
    Returns list of non-empty paragraph strings.
    """
    if omit_phrases is None:
        omit_phrases = global_omit_phrases() + talk_omit_phrases(path)
    with open(path, encoding="utf-8") as f:
        text = f.read()

    lines = text.split("\n")
    body_start = 0
    # Search for the language marker ANYWHERE in the first few lines, not just
    # at the line start: a crushed header (date/title/location/language run
    # together by <br>-via-textContent) or a single-line pipe-joined header
    # ("… | Talk Language: …") carries the marker mid-line. Matching it still
    # strips the header so it isn't miscounted as a body paragraph.
    header_marker = re.compile(r"(Talk Language:|Language:|Мова промови:|Мова:)")
    for i, line in enumerate(lines[:5]):
        if header_marker.search(line):
            body_start = i + 1
            break

    body = "\n".join(lines[body_start:])

    # Drop editorial stage-direction lines — a line that is *entirely* bracketed
    # (e.g. "[Промова англійською]", "[Marathi to English translation]", "[Музика]")
    # is metadata for the human reader describing what is happening in the
    # audio; it has no counterpart in en.srt and must not appear as a subtitle.
    # Inline bracketed content inside a sentence is left alone — translator
    # clarifications belong in square brackets (see feedback_translation_brackets).
    body_lines = []
    for ln in body.split("\n"):
        stripped = ln.strip()
        if stripped and re.fullmatch(r"\[[^\[\]]+\]", stripped):
            continue
        body_lines.append(ln)
    body = "\n".join(body_lines)

    if "\n\n" in body:
        paragraphs = [p.strip() for p in re.split(r"\n\n+", body) if p.strip()]
    else:
        paragraphs = [line.strip() for line in body.split("\n") if line.strip()]

    if omit_phrases:
        # A paragraph that was nothing but a declared remark drops out entirely.
        paragraphs = [stripped for p in paragraphs if (stripped := strip_omitted_phrases(p, omit_phrases))]

    return paragraphs


# ---------------------------------------------------------------------------
# Sentence splitting
# ---------------------------------------------------------------------------

# Sentence-terminating punctuation, and the closing marks that may follow it.
# A quoted or bracketed sentence ends *inside* its wrapper — «Хто ти?», "Right!",
# (у Лондоні.), [Він сказав це.] — so the terminal punctuation is not the last
# character before the space. Up to MAX_CLOSERS nested wrappers can close at
# once (e.g. «… “Хто ти?”» ).
_TERMINAL = r"[.!?]"
_CLOSER = "[»”’\"')\\]]"
_MAX_CLOSERS = 3

# Abbreviations that end in "." but never end a sentence.
_ABBREVIATIONS = ("Mr", "Mrs", "Ms", "Dr", "St", "Prof", "Rev", "Jr", "Sr", "vs", "etc", "Inc", "Ltd")
_NOT_ABBREV = "".join(rf"(?<!{abbr}\.)" for abbr in _ABBREVIATIONS)

# Python's re needs fixed-width lookbehinds, so spell out one branch per closer
# count instead of a single variable-width lookbehind. The abbreviation guard
# only applies to the bare-terminal branch — "Mr.»" cannot occur.
_BOUNDARY = "|".join(
    [_NOT_ABBREV + rf"(?<={_TERMINAL})"] + [rf"(?<={_TERMINAL}{_CLOSER * n})" for n in range(1, _MAX_CLOSERS + 1)]
)

# Split on a sentence boundary followed by space + an opening quote or uppercase
_SENT_RE = re.compile(rf"(?:{_BOUNDARY})\s+(?=[A-ZА-ЯІЇЄҐ«„“\"])")

# Closing marks stripped before asking "does this word end a sentence?"
_CLOSING_MARKS = "»”’\"')]"


def ends_sentence(word: str) -> bool:
    """True if `word` ends a sentence — .!? possibly inside closing quotes."""
    return word.rstrip(_CLOSING_MARKS).endswith((".", "!", "?"))


def split_sentences(text: str) -> list[str]:
    """Split text into sentences at .!? followed by uppercase."""
    parts = _SENT_RE.split(text)
    return [p.strip() for p in parts if p.strip()]


# ---------------------------------------------------------------------------
# Line splitting for ≤ MAX_CPL
# ---------------------------------------------------------------------------

_CONJUNCTIONS = frozenset(
    {
        "що",
        "який",
        "яка",
        "яке",
        "які",
        "і",
        "та",
        "але",
        "бо",
        "тому",
        "коли",
        "де",
        "як",
        "ні",
        "або",
        "чи",
        "адже",
        "проте",
        "однак",
        "якщо",
        "хоча",
    }
)

_PREPOSITIONS = frozenset(
    {
        "в",
        "у",
        "на",
        "з",
        "із",
        "від",
        "до",
        "для",
        "без",
        "через",
        "після",
        "перед",
        "між",
        "під",
        "над",
        "за",
        "при",
        "про",
        "по",
    }
)


def _split_once(text: str) -> list[str]:
    """Find the best single split point for text > MAX_CPL.

    Returns two parts, or [text] if can't split.
    """
    words = list(re.finditer(r"\S+", text))
    if len(words) <= 1:
        return [text]

    mid = len(text) // 2
    candidates: list[tuple[int, int, int]] = []  # (char_pos, priority, distance_from_mid)

    for i, m in enumerate(words[:-1]):
        word = m.group()
        char_pos = m.end()
        next_m = words[i + 1]
        next_clean = next_m.group().lower().rstrip(".,;:!?—»\"'")

        if ends_sentence(word):
            priority = 1
        elif word[-1] in ",;:" or word.endswith("—"):
            priority = 2
        elif next_clean in _CONJUNCTIONS:
            priority = 3
        elif next_clean in _PREPOSITIONS:
            priority = 4
        else:
            priority = 5

        left_len = char_pos
        right_len = len(text) - next_m.start()

        if left_len <= MAX_CPL and right_len <= MAX_CPL:
            candidates.append((char_pos, priority, abs(char_pos - mid)))

    if not candidates:
        for m in words[:-1]:
            candidates.append((m.end(), 5, abs(m.end() - mid)))

    if not candidates:
        return [text]

    candidates.sort(key=lambda x: (x[1], x[2]))
    split_at = candidates[0][0]
    return [text[:split_at].strip(), text[split_at:].strip()]


def split_text_to_lines(text: str) -> list[str]:
    """Recursively split text into lines of ≤ MAX_CPL characters."""
    if len(text) <= MAX_CPL:
        return [text]
    parts = _split_once(text)
    if len(parts) == 1:
        return parts
    result = []
    for part in parts:
        result.extend(split_text_to_lines(part))
    return result


# ---------------------------------------------------------------------------
# Canonical paragraph → subtitle-block builder
# ---------------------------------------------------------------------------


def build_blocks_from_paragraphs(paragraphs: list[str]) -> list[dict]:
    """Turn transcript paragraphs into subtitle-sized blocks.

    Canonical form used by build_map.prepare_uk_blocks and
    sync_transcript_to_srt.prepare_blocks so they can never drift.
    Each returned block has keys: id (1-based), text, para_idx.
    """
    blocks: list[dict] = []
    for para_idx, para in enumerate(paragraphs):
        para = re.sub(r"\s*\n+\s*", " ", para).strip()
        for sent in split_sentences(para):
            for line in split_text_to_lines(sent):
                assert "\n" not in line, f"newline leaked into block text: {line!r}"
                blocks.append({"id": len(blocks) + 1, "text": line, "para_idx": para_idx})
    return blocks
