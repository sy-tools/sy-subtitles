from pathlib import Path

import pytest

from tools.text_segmentation import (
    MAX_CPL,
    build_blocks_from_paragraphs,
    global_omit_phrases,
    load_transcript,
    split_sentences,
    split_text_to_lines,
    strip_omitted_phrases,
)


def test_build_blocks_simple() -> None:
    paras = ["Перше речення. Друге речення.", "Третє речення."]
    blocks = build_blocks_from_paragraphs(paras)
    assert [b["id"] for b in blocks] == [1, 2, 3]
    assert blocks[0]["para_idx"] == 0
    assert blocks[1]["para_idx"] == 0
    assert blocks[2]["para_idx"] == 1
    assert all("text" in b for b in blocks)


def test_build_blocks_cpl_enforced() -> None:
    long = "слово " * 40
    blocks = build_blocks_from_paragraphs([long.strip()])
    for b in blocks:
        assert len(b["text"]) <= MAX_CPL, b["text"]
    assert len(blocks) >= 2


def test_build_blocks_empty() -> None:
    assert build_blocks_from_paragraphs([]) == []
    assert build_blocks_from_paragraphs([""]) == []


def test_build_blocks_matches_legacy_sync_shape() -> None:
    """Regression guard: canonical builder produces the exact shape that
    sync_transcript_to_srt and build_map used to build independently."""
    paras = ["Коротке. Ще одне коротке."]
    blocks = build_blocks_from_paragraphs(paras)
    expected_keys = {"id", "text", "para_idx"}
    for b in blocks:
        assert set(b.keys()) == expected_keys


def test_split_sentences_respects_abbreviations() -> None:
    assert len(split_sentences("Dr. Smith came. He left.")) == 2
    assert len(split_sentences("Mr. White arrived. It was cold.")) == 2


def test_split_text_to_lines_single_word() -> None:
    word = "a" * (MAX_CPL + 10)
    assert split_text_to_lines(word) == [word]  # single unbreakable word preserved


# split_text_to_lines ---------------------------------------------------------


def test_split_text_to_lines_short_text_unchanged() -> None:
    assert split_text_to_lines("Коротке речення.") == ["Коротке речення."]


def test_split_text_to_lines_enforces_cpl() -> None:
    text = "Це дуже довге речення, яке точно перевищує вісімдесят чотири символи і потребує розбиття на частини."
    lines = split_text_to_lines(text)
    assert len(lines) >= 2
    for line in lines:
        assert len(line) <= MAX_CPL, line


def test_split_text_double_space_never_cuts_mid_word() -> None:
    # A run of extra whitespace must not skew split positions: every produced
    # line has to consist of whole words of the original text.
    text = (
        "Це  дуже довге речення яке містить подвійний пробіл на початку і має бути "
        "розділене на частини без розривів посередині слова."
    )
    assert len(text) > MAX_CPL
    lines = split_text_to_lines(text)
    for line in lines:
        assert len(line) <= MAX_CPL, line
    assert " ".join(lines).split() == text.split()


def test_split_text_prefers_punctuation() -> None:
    # A comma should be a preferred break point — if any line ends right
    # after the comma, the splitter honoured punctuation priority.
    text = "Першим висловом це речення справді довге, а потім далі продовження теж має власну довжину окрему."
    lines = split_text_to_lines(text)
    joined = " ".join(lines)
    assert joined.replace("  ", " ").split() == text.split()


# split_sentences -------------------------------------------------------------


def test_split_sentences_empty() -> None:
    assert split_sentences("") == []


def test_split_sentences_no_punctuation() -> None:
    assert split_sentences("hello world") == ["hello world"]


def test_split_sentences_multiple_punct() -> None:
    sents = split_sentences("What? Why! Because. Done.")
    assert len(sents) == 4


def test_split_sentences_cyrillic_uppercase() -> None:
    sents = split_sentences("Перше речення. Друге речення. Третє.")
    assert len(sents) == 3


@pytest.mark.parametrize(
    "text",
    [
        "Він спитав: «Хто ти?» Якщо всі релігії однакові, чому вони сваряться?",
        "Він спитав: «Хто ти?» Якщо всі релігії однакові, чому вони сваряться?".replace("»", '"'),
        "Вони сказали: «Ти летиш до Америки!» Я відповіла спокійно.",
        "Вона мовила: «Мені це не подобається.» Це поширено на Заході.",
        "Він спитав: “Хто ти?” Якщо всі релігії однакові, чому вони сваряться?",
        "Він спитав: ‘Хто ти?’ Якщо всі релігії однакові, чому вони сваряться?",
        "Це сталося давно (у Лондоні.) Тоді ніхто нічого не знав.",
        "[Він сказав це двічі.] Тоді ніхто нічого не знав.",
    ],
)
def test_split_sentences_terminal_followed_by_closing_quote(text: str) -> None:
    """A sentence can end with .!? *inside* a closing quote/bracket — «…?»,
    "…!", '….', (….), […] — and the next sentence still starts a new block.

    Regression: `?»` left the two sentences glued into one over-long subtitle
    block (2000-07-23 Guru Puja, and 1441 blocks corpus-wide)."""
    assert len(split_sentences(text)) == 2


def test_split_sentences_nested_closing_quotes() -> None:
    """Nested quotes stack closers: «…“…?”» — still one boundary."""
    text = "Вона спитала: «Чому він казав “Хто ти?”» Ніхто не відповів."
    assert len(split_sentences(text)) == 2


def test_split_sentences_closing_quote_mid_sentence_not_split() -> None:
    """A closing quote NOT preceded by .!? is not a sentence boundary."""
    text = "Слово «Ґуру» означає гуру принцип, і це дуже важливо."
    assert split_sentences(text) == [text]


def test_split_sentences_abbreviation_guard_still_holds() -> None:
    """Widening the boundary must not reopen the abbreviation false positives."""
    assert len(split_sentences("Dr. Smith came. He left.")) == 2


def test_split_text_to_lines_breaks_after_closing_quote() -> None:
    """`_split_once` ranks a sentence end highest — a word ending in `?»` is a
    sentence end too, so an over-long line breaks there, not mid-clause."""
    text = "Він спитав: «Хто ти?» Якщо всі релігії говорять про одне, чому вони сваряться постійно?"
    assert len(text) > MAX_CPL
    lines = split_text_to_lines(text)
    # Without the fix the comma (priority 2) wins over the unrecognised `?»`.
    assert lines[0].endswith("?»"), lines


# build_blocks_from_paragraphs — edge cases -----------------------------------


def test_build_blocks_preserves_para_idx_across_empty_paragraphs() -> None:
    # Empty paragraphs don't appear in output but don't shift para_idx of the rest
    blocks = build_blocks_from_paragraphs(["First.", "", "Third."])
    idxs = {b["para_idx"] for b in blocks}
    assert 0 in idxs and 2 in idxs
    assert 1 not in idxs


def test_build_blocks_long_paragraph_splits_many_blocks() -> None:
    long_sentence = ("слово " * 50).strip() + "."
    blocks = build_blocks_from_paragraphs([long_sentence])
    assert len(blocks) >= 3
    assert all(b["para_idx"] == 0 for b in blocks)
    assert all(b["id"] == i + 1 for i, b in enumerate(blocks))


# load_transcript -------------------------------------------------------------


def test_load_transcript_header_stripped(tmp_path: Path) -> None:
    f = tmp_path / "transcript.txt"
    f.write_text(
        "8 травня 1988\nПуджа\nФреджене\nМова промови: англійська | Транскрипт\nПерший абзац.\nДругий абзац.\n",
        encoding="utf-8",
    )
    paras = load_transcript(str(f))
    assert paras == ["Перший абзац.", "Другий абзац."]


def test_load_transcript_double_newline_format(tmp_path: Path) -> None:
    f = tmp_path / "transcript.txt"
    f.write_text(
        "Мова промови: англійська\n\nПерший абзац з кількома реченнями. І ще одне.\n\nДругий абзац.\n",
        encoding="utf-8",
    )
    paras = load_transcript(str(f))
    assert len(paras) == 2
    assert "Перший абзац" in paras[0]
    assert paras[1] == "Другий абзац."


def test_load_transcript_no_header_falls_back(tmp_path: Path) -> None:
    # Without "Talk Language:" marker, body_start stays 0 and lines
    # past the first 10 still belong to the body.
    f = tmp_path / "transcript.txt"
    f.write_text("Перший.\nДругий.\nТретій.\n", encoding="utf-8")
    paras = load_transcript(str(f))
    assert len(paras) == 3


@pytest.mark.parametrize("marker", ["Talk Language:", "Language:", "Мова промови:", "Мова:"])
def test_load_transcript_all_header_markers(tmp_path: Path, marker: str) -> None:
    f = tmp_path / "transcript.txt"
    f.write_text(f"Date\nTitle\n{marker} English\nBody paragraph.\n", encoding="utf-8")
    paras = load_transcript(str(f))
    assert paras == ["Body paragraph."]


def test_load_transcript_single_line_header_stripped(tmp_path: Path) -> None:
    """A crushed header — date/title/location/language concatenated on ONE line
    (an amruta <br>-separated h4 read via textContent) — has the marker
    mid-line, not at the start. It must still be recognized and stripped, not
    counted as a body paragraph.

    Regression: 1997 Sahasrara Puja EN transcript had this header and
    load_transcript counted it as a 45th paragraph."""
    f = tmp_path / "transcript.txt"
    f.write_text(
        "4 May 1997Sahasrara PujaCabella (Italy)Talk Language: English | Transcript (English)\n"
        "First paragraph.\nSecond paragraph.\nThird paragraph.\n",
        encoding="utf-8",
    )
    paras = load_transcript(str(f))
    assert paras == ["First paragraph.", "Second paragraph.", "Third paragraph."]


def test_load_transcript_pipe_header_with_blank_line(tmp_path: Path) -> None:
    """A single-line pipe-joined header (UK style) followed by a blank line and
    a one-paragraph-per-line body. The marker is mid-line, and the lone blank
    after the header must NOT flip the file into double-newline mode and
    collapse the whole body into one block.

    Regression: 1997 Sahasrara Puja UK transcript counted as 2 paragraphs,
    crashing the pipeline's 1:1 paragraph check (EN=45 vs UK=2)."""
    f = tmp_path / "transcript.txt"
    f.write_text(
        "4 травня 1997 | Пуджа | Кабелла | Мова промови: англійська | Транскрипт\n"
        "\n"
        "Перший абзац.\nДругий абзац.\nТретій абзац.\n",
        encoding="utf-8",
    )
    paras = load_transcript(str(f))
    assert paras == ["Перший абзац.", "Другий абзац.", "Третій абзац."]


def test_build_blocks_normalizes_embedded_newlines() -> None:
    """Paragraphs with internal \\n (e.g. stage directions glued together by
    load_transcript) must produce blocks with no embedded newlines."""
    para = "[Промова англійською]\n[Переклад з маратхі на англійську]\nПерший бхаджан."
    blocks = build_blocks_from_paragraphs([para])
    for b in blocks:
        assert "\n" not in b["text"], f"embedded newline in block: {b['text']!r}"
    # Content is preserved (collapsed to spaces)
    combined = " ".join(b["text"] for b in blocks)
    assert "Промова англійською" in combined
    assert "Переклад з маратхі" in combined
    assert "Перший бхаджан" in combined


def test_load_transcript_strips_bracketed_stage_directions(tmp_path: Path) -> None:
    """Standalone bracket-only lines are editorial metadata, not subtitles."""
    f = tmp_path / "transcript.txt"
    f.write_text(
        "Мова промови: англійська | Транскрипт\n"
        "\n"
        "[Промова англійською]\n"
        "[Переклад з маратхі на англійську]\n"
        "Перший бхаджан було заспівано.\n"
        "[Промова англійською]\n"
        "\n"
        "Багато людей запитували Мене.\n",
        encoding="utf-8",
    )
    paras = load_transcript(str(f))
    # Stage-direction-only lines gone; content preserved.
    assert paras == ["Перший бхаджан було заспівано.", "Багато людей запитували Мене."]


def test_load_transcript_preserves_inline_brackets(tmp_path: Path) -> None:
    """Bracketed text inside a sentence is translator clarification — keep."""
    f = tmp_path / "transcript.txt"
    f.write_text(
        "Мова: англійська\n\nШрі Матаджі [в Лондоні] сказала наступне.\n",
        encoding="utf-8",
    )
    paras = load_transcript(str(f))
    assert paras == ["Шрі Матаджі [в Лондоні] сказала наступне."]


def test_load_transcript_strips_multilingual_stage_direction_patterns(tmp_path: Path) -> None:
    """Works for both UK and EN transcripts — same editorial convention."""
    f = tmp_path / "transcript.txt"
    f.write_text(
        "Language: English\n\n[English Talk]\n[Marathi to English translation]\nFirst Bhajan was sung.\n[Music]\n",
        encoding="utf-8",
    )
    paras = load_transcript(str(f))
    assert paras == ["First Bhajan was sung."]


# Declared omitted phrases -----------------------------------------------------
#
# Some parentheticals are editorial remarks about what the video already shows
# ("(сміх)", "(Оплески)"). They belong in the transcript but not on screen.
# Only phrases DECLARED in glossary/subtitle_omit.yaml (corpus-wide) or in the
# talk's meta.yaml `subtitle_omit:` (one-offs) are stripped — never all brackets.


def test_strip_omitted_phrases_removes_declared_phrase() -> None:
    text = "Усе знання, вся радість – все там. (сміх) Усе це всередині вас."
    assert strip_omitted_phrases(text, ["(сміх)"]) == ("Усе знання, вся радість – все там. Усе це всередині вас.")


def test_strip_omitted_phrases_is_case_insensitive() -> None:
    """`(сміх)` in the spec also covers `(Сміх)` — 48 vs 22 occurrences corpus-wide."""
    assert strip_omitted_phrases("Так було. (Сміх) Далі.", ["(сміх)"]) == "Так було. Далі."


def test_strip_omitted_phrases_leaves_undeclared_brackets() -> None:
    """Undeclared parentheses are content — country names, translator notes."""
    for text in [
        "Кабелла Лігуре (Італія) — це місце.",
        "Він сказав щось (нерозбірливо) і пішов.",
        "Шрі Матаджі [в Лондоні] сказала це.",
    ]:
        assert strip_omitted_phrases(text, ["(сміх)", "(Оплески)"]) == text


def test_strip_omitted_phrases_absorbs_the_remarks_own_trailing_period() -> None:
    """`… вчасно! (ще більше сміху). Усе це …` — the period belongs to the
    remark, so removing the remark must not leave `!.` or a stray `.`."""
    text = "Якраз вчасно! (ще більше сміху). Усе це міститься всередині вас."
    assert strip_omitted_phrases(text, ["(ще більше сміху)"]) == ("Якраз вчасно! Усе це міститься всередині вас.")


def test_strip_omitted_phrases_keeps_the_speakers_own_period() -> None:
    """Mirror case: here the period ends the SPEAKER's sentence and must stay."""
    text = "Він сказав це (сміх). Потім пішов."
    assert strip_omitted_phrases(text, ["(сміх)"]) == "Він сказав це. Потім пішов."


def test_strip_omitted_phrases_at_paragraph_edges() -> None:
    assert strip_omitted_phrases("(сміх) Далі текст.", ["(сміх)"]) == "Далі текст."
    assert strip_omitted_phrases("Текст далі. (сміх)", ["(сміх)"]) == "Текст далі."


def test_strip_omitted_phrases_untouched_text_is_returned_verbatim() -> None:
    """Normalisation runs only when something was actually removed — a
    transcript with no declared phrase must pass through byte-identical."""
    text = "Речення  з  подвійними пробілами та пробілом перед крапкою ."
    assert strip_omitted_phrases(text, ["(сміх)"]) == text


def test_load_transcript_strips_talk_level_omit_phrases(tmp_path: Path) -> None:
    """One-off remarks declared in the talk's own meta.yaml."""
    (tmp_path / "meta.yaml").write_text(
        "title: Guru Puja\ndate: '2000-07-23'\nlanguage: en\n"
        "subtitle_omit:\n"
        "  - '(легкий сміх, коли собака виходить на сцену)'\n"
        "  - '(ще більше сміху)'\n",
        encoding="utf-8",
    )
    f = tmp_path / "transcript_uk.txt"
    f.write_text(
        "Мова промови: англійська\n\n"
        "Усе там. (легкий сміх, коли собака виходить на сцену) Якраз вчасно! "
        "(ще більше сміху). Усе це всередині вас.\n",
        encoding="utf-8",
    )
    assert load_transcript(str(f)) == ["Усе там. Якраз вчасно! Усе це всередині вас."]


def test_load_transcript_drops_paragraph_emptied_by_omission(tmp_path: Path) -> None:
    (tmp_path / "meta.yaml").write_text(
        "title: T\ndate: '2000-01-01'\nlanguage: en\nsubtitle_omit:\n  - '(Оплески)'\n",
        encoding="utf-8",
    )
    f = tmp_path / "transcript_uk.txt"
    f.write_text("Мова: англійська\n\nПерший абзац.\n\n(Оплески)\n\nТретій абзац.\n", encoding="utf-8")
    assert load_transcript(str(f)) == ["Перший абзац.", "Третій абзац."]


def test_load_transcript_omit_phrases_override_wins(tmp_path: Path) -> None:
    """Explicit `omit_phrases=` bypasses spec discovery (used by tests/tools)."""
    f = tmp_path / "transcript_uk.txt"
    f.write_text("Мова: англійська\n\nТекст (щось) далі.\n", encoding="utf-8")
    assert load_transcript(str(f), omit_phrases=["(щось)"]) == ["Текст далі."]
    assert load_transcript(str(f), omit_phrases=[]) == ["Текст (щось) далі."]


def test_load_transcript_without_meta_yaml_uses_global_spec_only(tmp_path: Path) -> None:
    f = tmp_path / "transcript_uk.txt"
    f.write_text("Мова: англійська\n\nТекст (сміх) далі.\n", encoding="utf-8")
    expected = "Текст далі." if "(сміх)" in global_omit_phrases() else "Текст (сміх) далі."
    assert load_transcript(str(f)) == [expected]


def test_global_omit_spec_entries_are_bracketed() -> None:
    """Every declared phrase must carry its own brackets — the spec matches
    whole bracketed remarks, not bare words that could appear in speech."""
    phrases = global_omit_phrases()
    assert phrases, "glossary/subtitle_omit.yaml declares no phrases"
    for p in phrases:
        assert (p.startswith("(") and p.endswith(")")) or (p.startswith("[") and p.endswith("]")), p


def test_build_blocks_never_ship_declared_omit_phrases(tmp_path: Path) -> None:
    """End-to-end: a declared remark reaches neither a block nor the SRT."""
    (tmp_path / "meta.yaml").write_text(
        "title: T\ndate: '2000-01-01'\nlanguage: en\nsubtitle_omit:\n  - '(ще більше сміху)'\n",
        encoding="utf-8",
    )
    f = tmp_path / "transcript_uk.txt"
    f.write_text("Мова: англійська\n\nЯкраз вчасно! (ще більше сміху). Усе це.\n", encoding="utf-8")
    blocks = build_blocks_from_paragraphs(load_transcript(str(f)))
    assert [b["text"] for b in blocks] == ["Якраз вчасно!", "Усе це."]
