import json
from pathlib import Path

import pytest

from tools.help_subtitles import (
    MAX_CUE_CHARS,
    MAX_CUE_SECONDS,
    build_cues,
    build_manifest,
    render_vtt,
)


def _whisper(*timed_words):
    words = timed_words
    return {
        "language": "uk",
        "segments": [
            {
                "start": words[0][0],
                "end": words[-1][1],
                "text": " ".join(w[2] for w in words),
                "words": [{"start": s, "end": e, "word": t} for s, e, t in words],
            }
        ],
    }


def _steady(texts, start=0.0, step=0.4):
    return [(start + i * step, start + i * step + 0.3, t) for i, t in enumerate(texts)]


def test_a_short_sentence_is_one_cue_with_its_words_timing():
    cues = build_cues(_whisper((1.0, 1.4, "Добрий"), (1.5, 1.9, "день."), (2.0, 2.6, "Почнемо.")))
    assert cues == [{"start": 1.0, "end": 2.6, "text": "Добрий день. Почнемо."}]


def test_a_pause_starts_a_new_cue():
    cues = build_cues(_whisper((0.0, 0.5, "Перше"), (0.6, 1.2, "речення"), (3.0, 3.5, "друге")))
    assert [c["text"] for c in cues] == ["Перше речення", "друге"]


def test_a_cue_never_outgrows_its_length_limits():
    words = _steady(["слово"] * 60)
    cues = build_cues(_whisper(*words))
    assert len(cues) > 1
    for c in cues:
        assert len(c["text"]) <= MAX_CUE_CHARS, c
        assert c["end"] - c["start"] <= MAX_CUE_SECONDS, c
    assert " ".join(c["text"] for c in cues) == " ".join(["слово"] * 60)


def test_a_sentence_end_closes_a_cue_that_has_enough_in_it():
    words = _steady(["Ось", "так", "ми", "відкриваємо", "портал.", "Далі", "меню"])
    assert [c["text"] for c in build_cues(_whisper(*words))] == [
        "Ось так ми відкриваємо портал.",
        "Далі меню",
    ]


def test_a_flash_cue_is_held_for_a_second_but_never_into_the_next():
    cues = build_cues(_whisper((0.0, 0.2, "Так."), (1.5, 1.8, "Далі"), (1.9, 2.2, "все.")))
    assert cues[0] == {"start": 0.0, "end": 1.0, "text": "Так."}
    cues = build_cues(_whisper((0.0, 0.2, "Так."), (0.4, 0.6, "Ні"), (2.0, 2.4, "так.")))
    assert cues[0]["end"] <= cues[1]["start"]


def test_segments_are_read_in_order_and_hallucinated_words_are_kept_out():
    whisper = {
        "segments": [
            {"start": 0, "end": 1, "text": "Раз", "words": [{"start": 0.0, "end": 0.4, "word": "Раз"}]},
            {"start": 5, "end": 6, "text": "два", "words": [{"start": 5.0, "end": 5.4, "word": " два "}]},
            {"start": 7, "end": 8, "text": "", "words": [{"start": 7.0, "end": 7.1, "word": "  "}]},
        ]
    }
    assert [c["text"] for c in build_cues(whisper)] == ["Раз", "два"]


CUES = [{"start": 1.0, "end": 2.5, "text": "сире"}, {"start": 3725.25, "end": 3727.0, "text": "сире"}]


def test_vtt_puts_each_text_on_its_cue_timing():
    assert render_vtt(CUES, ["Добрий день.", "До зустрічі."]) == (
        "WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.500\nДобрий день.\n\n2\n01:02:05.250 --> 01:02:07.000\nДо зустрічі.\n"
    )


@pytest.mark.parametrize(
    "texts, reason",
    [
        (["one"], "2 cues but 1 texts"),
        (["one", "  "], "cue 2 is empty"),
        (["one", "a --> b"], "cue 2 contains '-->'"),
        (["one", "two\n\nthree"], "cue 2 contains a blank line"),
        (["one", "x" * 121], "cue 2 is 121 characters"),
        (["one", 2], "cue 2 is not text"),
    ],
)
def test_vtt_refuses_texts_that_do_not_fit_the_cues(texts, reason):
    with pytest.raises(ValueError, match=reason):
        render_vtt(CUES, texts)


def test_the_manifest_lists_each_ref_with_the_languages_it_has(tmp_path):
    for name in ["h1Abc_-.uk.vtt", "h1Abc_-.en.vtt", "h1Zz.uk.vtt", "notes.txt"]:
        (tmp_path / name).write_text("WEBVTT\n")
    assert build_manifest(tmp_path) == {"h1Abc_-": ["en", "uk"], "h1Zz": ["uk"]}


def test_the_cli_turns_whisper_into_cues_and_cues_into_vtt(tmp_path):
    from tools.help_subtitles import main

    (tmp_path / "w.json").write_text(json.dumps(_whisper((1.0, 1.5, "Привіт."))), encoding="utf-8")
    main(["cues", "--whisper", str(tmp_path / "w.json"), "--out", str(tmp_path / "cues.json")])
    (tmp_path / "en.json").write_text(json.dumps(["Hello."]), encoding="utf-8")
    main(
        [
            "vtt",
            "--cues",
            str(tmp_path / "cues.json"),
            "--texts",
            str(tmp_path / "en.json"),
            "--out",
            str(tmp_path / "x.en.vtt"),
        ]
    )
    assert (tmp_path / "x.en.vtt").read_text(encoding="utf-8").endswith("Hello.\n")
    main(["manifest", "--dir", str(tmp_path)])
    assert json.loads((tmp_path / "index.json").read_text()) == {"x": ["en"]}


INDEX_HTML = """<script>
var I18N = {
  uk: {
    'prefs.help': '\\u0412\\u0456\\u0434\\u0435\\u043e',
    'needs.review': 'Потребує перевірки',
    'quote': 'It\\'s',
  },
  en: {
    'prefs.help': 'Video tutorials',
    'needs.review': 'Needs review',
    'only.en': 'English only',
  },
};
var OTHER = { uk: { 'prefs.help': 'not this' } };
</script>"""


def test_ui_strings_pair_each_key_with_both_languages(tmp_path):
    from tools.help_subtitles import ui_strings

    (tmp_path / "index.html").write_text(INDEX_HTML, encoding="utf-8")
    assert ui_strings(tmp_path / "index.html") == {
        "needs.review": {"en": "Needs review", "uk": "Потребує перевірки"},
        "only.en": {"en": "English only"},
        "prefs.help": {"en": "Video tutorials", "uk": "Відео"},
        "quote": {"uk": "It's"},
    }


def test_ui_strings_read_the_real_portal():
    from tools.help_subtitles import ui_strings

    strings = ui_strings("site/index.html")
    assert strings["prefs.help"] == {"en": "Video tutorials", "uk": "Відео-інструкції"}
    html = Path("site/index.html").read_text(encoding="utf-8")
    key_lines = [line for line in html.splitlines() if line.startswith("    '")]
    assert sum(len(v) for v in strings.values()) >= len(key_lines) - 20, "most interface strings were not read"


REFS = ["h1aaa", "h1bbb", "h1ccc"]


def _vtts(tmp_path, *names):
    for name in names:
        (tmp_path / name).write_text("WEBVTT\n")
    return tmp_path


def test_pending_missing_picks_videos_short_of_a_language(tmp_path):
    from tools.help_subtitles import pending

    d = _vtts(tmp_path, "h1aaa.uk.vtt", "h1aaa.en.vtt", "h1bbb.uk.vtt")
    assert pending(REFS, d, "missing") == ["h1bbb", "h1ccc"]


def test_pending_all_redoes_every_video(tmp_path):
    from tools.help_subtitles import pending

    assert pending(REFS, _vtts(tmp_path, "h1aaa.uk.vtt", "h1aaa.en.vtt"), "all") == REFS


def test_pending_takes_a_list_of_listed_refs_only(tmp_path):
    from tools.help_subtitles import pending

    assert pending(REFS, tmp_path, " h1ccc, h1aaa ") == ["h1ccc", "h1aaa"]
    with pytest.raises(ValueError, match="not a listed video: h1zzz"):
        pending(REFS, tmp_path, "h1aaa,h1zzz")


def test_a_word_with_no_letter_or_digit_never_becomes_a_cue():
    cues = build_cues(_whisper((0.0, 0.5, "Раз."), (3.0, 3.2, "–"), (6.0, 6.5, "Два.")))
    assert [c["text"] for c in cues] == ["Раз.", "Два."]


def test_a_dash_inside_a_sentence_stays_in_its_cue():
    words = [(0.0, 0.5, "не"), (0.6, 1.2, "заходили"), (1.3, 2.0, "–"), (2.1, 2.4, "як"), (2.5, 2.9, "бути?")]
    assert [c["text"] for c in build_cues(_whisper(*words))] == ["не заходили – як бути?"]


def test_a_word_whisper_split_at_an_apostrophe_or_hyphen_is_glued_back():
    words = [
        (0.0, 0.3, "ім"),
        (0.3, 0.5, "'я"),
        (0.6, 0.9, "будь"),
        (0.9, 1.2, "-якого"),
        (1.3, 1.6, "комп"),
        (1.6, 2.0, "’ютера"),
    ]
    assert [c["text"] for c in build_cues(_whisper(*words))] == ["ім'я будь-якого комп’ютера"]


def test_a_glued_word_is_never_cut_between_two_cues():
    words = _steady(["слово"] * 15) + [(6.0, 6.2, "комп"), (6.2, 6.6, "’ютері")]
    texts = [c["text"] for c in build_cues(_whisper(*words))]
    assert "комп’ютері" in " ".join(texts)
    assert not any(t.startswith("’") for t in texts)
