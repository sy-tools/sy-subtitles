"""A slice syncs only the paragraphs its own recording speaks.

A talk built as slices (several tapes sharing one transcript) has short lines
on more than one tape — «Як тебе звати?», «Не знаю.». Judged by on-screen
text alone, an edit to one tape's paragraph found the same words on another
tape and rewrote them there (reproduced on 1977-11-01 Kalki: a Part-4 edit
landed on Part-1), or found them twice and refused the whole sync. The build
knows which paragraphs each slice carries and records them in the manifest;
the forward leg reads that instead of guessing.
"""

import json
import subprocess
import sys

import pytest
import yaml

from tools.slice_paragraphs import SliceMapMissing, own_paragraphs, paragraph_ranges, write_paragraphs
from tools.srt_utils import parse_srt
from tools.sync_transcript_to_srt import sync_transcript

HEADER = "Мова промови: англійська | Транскрипт (українська)\n\n"
PARAS = [
    "Шрі Матаджі: Як тебе звати? Сахаджа йоґ: Дані.",
    "Сахаджа йоґ: Не знаю.",
    "Сахаджа йоґ: Не знаю.",
    "Шрі Матаджі: Як тебе звати?",
    "Сахаджа йоґ: Не знаю.",
]


def _srt(lines: list[str]) -> str:
    return "".join(
        f"{i}\n00:00:{i * 4:02d},000 --> 00:00:{i * 4 + 3:02d},500\n{text}\n\n" for i, text in enumerate(lines, start=1)
    )


def _talk(tmp_path, manifest_paragraphs: dict[str, list] | None):
    talk = tmp_path / "talks" / "1977-11-01_Workshop"
    screens = {
        "Tape-1": [
            "Шрі Матаджі: Як тебе звати?",
            "Сахаджа йоґ: Дані.",
            "Сахаджа йоґ: Не знаю.",
            "Сахаджа йоґ: Не знаю.",
        ],
        "Tape-2": ["Шрі Матаджі: Як тебе звати?", "Сахаджа йоґ: Не знаю."],
    }
    for slug, lines in screens.items():
        final = talk / slug / "final"
        final.mkdir(parents=True)
        (final / "uk.srt").write_text(_srt(lines), encoding="utf-8")
        manifest = {"role": "independent", "mode": "whisper", "slice": True}
        if manifest_paragraphs is not None:
            manifest["paragraphs"] = manifest_paragraphs[slug]
            manifest["paragraph_count"] = len(PARAS)
        (final / "build_manifest.yaml").write_text(yaml.safe_dump(manifest), encoding="utf-8")
    old = talk / "old.txt"
    old.write_text(HEADER + "\n\n".join(PARAS) + "\n", encoding="utf-8")
    return talk, old


def _edit(talk, old, para_no: int, before: str, after: str):
    paras = list(PARAS)
    assert before in paras[para_no - 1]
    paras[para_no - 1] = paras[para_no - 1].replace(before, after)
    new = talk / "new.txt"
    new.write_text(HEADER + "\n\n".join(paras) + "\n", encoding="utf-8")
    return new


def _screen(talk, slug):
    return [b["text"] for b in parse_srt(str(talk / slug / "final" / "uk.srt"))]


RANGES = {"Tape-1": [[1, 3]], "Tape-2": [[4, 5]]}


def test_an_edit_to_another_tapes_paragraph_never_lands_on_this_tape(tmp_path):
    talk, old = _talk(tmp_path, RANGES)
    new = _edit(talk, old, 4, "Як тебе звати?", "Як твоє ім'я?")
    before = _screen(talk, "Tape-1")

    result = sync_transcript(str(talk), "Tape-1", str(old), str(new))

    assert "error" not in result, result
    assert _screen(talk, "Tape-1") == before


def test_the_tape_that_speaks_the_paragraph_takes_the_edit(tmp_path):
    talk, old = _talk(tmp_path, RANGES)
    new = _edit(talk, old, 4, "Як тебе звати?", "Як твоє ім'я?")

    result = sync_transcript(str(talk), "Tape-2", str(old), str(new))

    assert "error" not in result, result
    assert _screen(talk, "Tape-2")[0] == "Шрі Матаджі: Як твоє ім'я?"


def test_another_tapes_repeated_line_does_not_make_this_tape_refuse(tmp_path):
    talk, old = _talk(tmp_path, RANGES)
    new = _edit(talk, old, 5, "Не знаю.", "Я не знаю.")

    result = sync_transcript(str(talk), "Tape-1", str(old), str(new))

    assert "error" not in result, result
    assert _screen(talk, "Tape-1").count("Сахаджа йоґ: Не знаю.") == 2


def test_a_slice_without_a_paragraph_map_refuses_rather_than_guesses(tmp_path):
    talk, old = _talk(tmp_path, None)
    new = _edit(talk, old, 4, "Як тебе звати?", "Як твоє ім'я?")

    result = sync_transcript(str(talk), "Tape-1", str(old), str(new))

    assert "paragraph" in result.get("error", ""), result


def test_a_video_that_is_not_a_slice_has_no_paragraph_map(tmp_path):
    final = tmp_path / "Talk" / "final"
    final.mkdir(parents=True)
    (final / "build_manifest.yaml").write_text("role: primary\nmode: whisper\n", encoding="utf-8")
    assert own_paragraphs(tmp_path / "Talk") is None


def test_a_slice_manifest_missing_its_map_raises(tmp_path):
    final = tmp_path / "Tape" / "final"
    final.mkdir(parents=True)
    (final / "build_manifest.yaml").write_text("role: independent\nslice: true\n", encoding="utf-8")
    with pytest.raises(SliceMapMissing):
        own_paragraphs(tmp_path / "Tape")


def test_paragraph_ranges_collapse_the_timed_blocks_paragraphs():
    blocks = [{"id": i, "para_idx": p} for i, p in enumerate([0, 0, 1, 2, 2, 3, 5, 5], start=1)]
    assert paragraph_ranges(blocks, timed_ids=[3, 4, 5, 6, 7]) == [[2, 4], [6, 6]]


def _video(tmp_path, timed: list[int]):
    video = tmp_path / "talks" / "T" / "Tape-2"
    (video / "work").mkdir(parents=True)
    (video / "final").mkdir(parents=True)
    blocks = [{"id": i, "text": f"b{i}", "para_idx": p} for i, p in enumerate([0, 0, 1, 2, 3, 3], start=1)]
    (video / "work" / "uk_blocks.json").write_text(json.dumps(blocks), encoding="utf-8")
    lines = [f"#{i} | 00:00:0{i},000 | 00:00:0{i},500" for i in timed]
    (video / "work" / "timecodes.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (video / "final" / "build_manifest.yaml").write_text(
        "role: independent\nmode: whisper\nslice: true\n", encoding="utf-8"
    )
    (video.parent / "transcript_uk.txt").write_text(
        HEADER + "Перший абзац.\n\nДругий абзац.\n\nТретій абзац.\n\nЧетвертий абзац.\n", encoding="utf-8"
    )
    return video


def test_write_paragraphs_records_the_map_in_the_manifest(tmp_path):
    video = _video(tmp_path, timed=[3, 4, 5])
    write_paragraphs(video)
    manifest = yaml.safe_load((video / "final" / "build_manifest.yaml").read_text(encoding="utf-8"))
    assert manifest["paragraphs"] == [[2, 4]]
    assert own_paragraphs(video) == {1, 2, 3}


def test_the_cli_writes_the_map(tmp_path):
    video = _video(tmp_path, timed=[1, 2])
    subprocess.run(
        [sys.executable, "-m", "tools.slice_paragraphs", "--video-dir", str(video)],
        check=True,
        capture_output=True,
    )
    assert own_paragraphs(video) == {0}


def _counted(tmp_path, count: int):
    talk, old = _talk(tmp_path, RANGES)
    for slug in RANGES:
        path = talk / slug / "final" / "build_manifest.yaml"
        manifest = yaml.safe_load(path.read_text(encoding="utf-8"))
        manifest["paragraph_count"] = count
        path.write_text(yaml.safe_dump(manifest), encoding="utf-8")
    return talk, old


def test_a_slice_refuses_a_re_paragraphing_that_would_shift_its_map(tmp_path):
    talk, old = _counted(tmp_path, len(PARAS))
    new = talk / "new.txt"
    new.write_text(
        HEADER + "\n\n".join(PARAS[:3] + ["Шрі Матаджі:", "Як тебе звати?"] + PARAS[4:]) + "\n", encoding="utf-8"
    )

    result = sync_transcript(str(talk), "Tape-1", str(old), str(new))

    assert "paragraph" in result.get("error", ""), result


def test_a_map_recorded_for_another_paragraph_count_is_stale_and_refused(tmp_path):
    talk, old = _counted(tmp_path, len(PARAS) + 1)
    new = _edit(talk, old, 4, "Як тебе звати?", "Як твоє ім'я?")

    result = sync_transcript(str(talk), "Tape-2", str(old), str(new))

    assert "stale" in result.get("error", ""), result


def test_a_timed_block_the_cut_does_not_have_is_refused():
    blocks = [{"id": 1, "para_idx": 0}, {"id": 2, "para_idx": 1}]
    with pytest.raises(ValueError, match="#7"):
        paragraph_ranges(blocks, timed_ids=[1, 7])


def test_write_paragraphs_records_the_paragraph_count(tmp_path):
    video = _video(tmp_path, timed=[3, 4, 5])
    write_paragraphs(video)
    manifest = yaml.safe_load((video / "final" / "build_manifest.yaml").read_text(encoding="utf-8"))
    assert manifest["paragraph_count"] == 4


def _git(cwd, *args):
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True).stdout


def test_sync_pr_keeps_a_tapes_srt_edit_off_the_other_tape(tmp_path, monkeypatch):
    from tools.sync_pr import run

    talk, old = _talk(tmp_path, RANGES)
    (talk / "transcript_uk.txt").write_text(old.read_text(encoding="utf-8"), encoding="utf-8")
    old.unlink()
    videos = [{"slug": slug, "title": slug, "sync": "independent"} for slug in RANGES]
    (talk / "meta.yaml").write_text(yaml.safe_dump({"title": "Workshop", "videos": videos}), encoding="utf-8")
    for args in (
        ("init", "-q", "-b", "main"),
        ("config", "user.email", "test@example.com"),
        ("config", "user.name", "Test"),
        ("config", "commit.gpgsign", "false"),
        ("add", "."),
        ("commit", "-q", "-m", "base"),
    ):
        _git(tmp_path, *args)
    base = _git(tmp_path, "rev-parse", "HEAD").strip()
    tape2 = talk / "Tape-2" / "final" / "uk.srt"
    tape2.write_text(tape2.read_text(encoding="utf-8").replace("Як тебе звати?", "Як твоє ім'я?"), encoding="utf-8")
    _git(tmp_path, "commit", "-qam", "reviewer edit on Tape-2")
    tape1_before = _screen(talk, "Tape-1")
    monkeypatch.chdir(tmp_path)

    assert run(baseline=base) == 0

    transcript = (talk / "transcript_uk.txt").read_text(encoding="utf-8")
    assert "Шрі Матаджі: Як твоє ім'я?" in transcript
    assert "Шрі Матаджі: Як тебе звати? Сахаджа йоґ: Дані." in transcript
    assert _screen(talk, "Tape-1") == tape1_before


def _reverse(tmp_path, slug: str, before: str, after: str):
    from tools.sync_srt_to_transcript import sync_srt_to_transcript

    talk, old = _talk(tmp_path, RANGES)
    transcript = talk / "transcript_uk.txt"
    transcript.write_text(old.read_text(encoding="utf-8"), encoding="utf-8")
    srt = talk / slug / "final" / "uk.srt"
    base = tmp_path / "base.srt"
    base.write_text(srt.read_text(encoding="utf-8"), encoding="utf-8")
    srt.write_text(srt.read_text(encoding="utf-8").replace(before, after, 1), encoding="utf-8")
    result = sync_srt_to_transcript(str(base), str(srt), str(transcript), talk_dir=str(talk))
    return result, transcript.read_text(encoding="utf-8")


def test_a_tapes_srt_edit_lands_in_its_own_paragraph_not_an_earlier_tapes(tmp_path):
    result, text = _reverse(tmp_path, "Tape-2", "Як тебе звати?", "Як твоє ім'я?")

    assert "error" not in result, result
    assert "Шрі Матаджі: Як тебе звати? Сахаджа йоґ: Дані." in text
    assert "\n\nШрі Матаджі: Як твоє ім'я?\n\n" in text


def test_a_tapes_srt_edit_to_a_line_repeated_on_another_tape_is_not_ambiguous(tmp_path):
    result, text = _reverse(tmp_path, "Tape-2", "Сахаджа йоґ: Не знаю.", "Сахаджа йоґ: Я не знаю.")

    assert "error" not in result, result
    assert text.count("Сахаджа йоґ: Не знаю.") == 2
    assert text.rstrip().endswith("Сахаджа йоґ: Я не знаю.")


def _slice_talk(tmp_path, body: str, screens: dict[str, list[str]], ranges: dict[str, list]):
    from tools.text_segmentation import load_transcript

    talk = tmp_path / "talks" / "1977-11-01_Workshop"
    talk.mkdir(parents=True, exist_ok=True)
    transcript = talk / "transcript_uk.txt"
    transcript.write_text(HEADER + body, encoding="utf-8")
    count = len(load_transcript(str(transcript)))
    for slug, lines in screens.items():
        final = talk / slug / "final"
        final.mkdir(parents=True)
        (final / "uk.srt").write_text(_srt(lines), encoding="utf-8")
        manifest = {"role": "independent", "slice": True, "paragraphs": ranges[slug], "paragraph_count": count}
        (final / "build_manifest.yaml").write_text(yaml.safe_dump(manifest), encoding="utf-8")
    return talk, transcript


def _srt_edit(talk, transcript, slug, before, after, base_lines=None):
    from tools.sync_srt_to_transcript import sync_srt_to_transcript

    srt = talk / slug / "final" / "uk.srt"
    base = talk / f"{slug}.base.srt"
    base.write_text(_srt(base_lines) if base_lines else srt.read_text(encoding="utf-8"), encoding="utf-8")
    if base_lines:
        srt.write_text(_srt(base_lines), encoding="utf-8")
    srt.write_text(srt.read_text(encoding="utf-8").replace(before, after, 1), encoding="utf-8")
    result = sync_srt_to_transcript(str(base), str(srt), str(transcript), talk_dir=str(talk))
    return result, transcript.read_text(encoding="utf-8")


def test_a_slice_syncs_when_the_talk_strips_an_omitted_remark(tmp_path):
    """Stripping a remark tidies the whole view («так ...» → «так...»), so
    the view's paragraphs are not the loaded paragraphs character for character."""
    body = "Перший абзац (сміх) тут.\n\nДругий абзац, так ... далі.\n\nТретій абзац Не знаю.\n"
    talk, transcript = _slice_talk(
        tmp_path,
        body,
        {"Tape-1": ["Перший абзац тут.", "Другий абзац, так... далі."], "Tape-2": ["Третій абзац Не знаю."]},
        {"Tape-1": [[1, 2]], "Tape-2": [[3, 3]]},
    )
    result, text = _srt_edit(talk, transcript, "Tape-2", "Не знаю.", "Я не знаю.")
    assert "error" not in result, result
    assert "Третій абзац Я не знаю." in text


def test_a_block_across_two_own_paragraphs_is_found_past_a_trailing_remark(tmp_path):
    body = "Перший рядок. (сміх)\nДругий рядок тут.\nЧужий рядок інший.\n"
    talk, transcript = _slice_talk(
        tmp_path,
        body,
        {"Tape-1": ["Перший рядок. Другий рядок тут."], "Tape-2": ["Чужий рядок інший."]},
        {"Tape-1": [[1, 2]], "Tape-2": [[3, 3]]},
    )
    result, text = _srt_edit(talk, transcript, "Tape-1", "Другий рядок", "Другий рядочок")
    assert "error" not in result, result
    assert "Другий рядочок тут." in text


def test_a_bracketed_line_inside_a_paragraph_does_not_hide_the_slice(tmp_path):
    body = "Перший рядок.\n[Музика]\nДругий рядок тут.\n\nЧужий абзац інший.\n"
    talk, transcript = _slice_talk(
        tmp_path,
        body,
        {"Tape-1": ["Перший рядок.", "Другий рядок тут."], "Tape-2": ["Чужий абзац інший."]},
        {"Tape-1": [[1, 1]], "Tape-2": [[2, 2]]},
    )
    result, text = _srt_edit(talk, transcript, "Tape-1", "Другий рядок", "Другий рядочок")
    assert "error" not in result, result
    assert "Другий рядочок тут." in text


def test_the_reverse_leg_refuses_a_stale_map(tmp_path):
    talk, transcript = _slice_talk(
        tmp_path,
        "Перший абзац.\n\nДругий абзац.\n",
        {"Tape-1": ["Перший абзац."], "Tape-2": ["Другий абзац."]},
        {"Tape-1": [[1, 1]], "Tape-2": [[2, 2]]},
    )
    manifest_path = talk / "Tape-2" / "final" / "build_manifest.yaml"
    manifest = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    manifest["paragraph_count"] = 3
    manifest_path.write_text(yaml.safe_dump(manifest), encoding="utf-8")
    result, _ = _srt_edit(talk, transcript, "Tape-2", "Другий", "Інший")
    assert "stale" in result.get("error", ""), result


def test_a_drifted_block_judges_a_repeated_line_by_this_slices_copies_only(tmp_path):
    """After a block that is not in the transcript, a line repeated in the
    transcript is refused as ambiguous — counted over this slice's paragraphs,
    not the other tapes' copies."""
    body = "Сахаджа йоґ: Не знаю.\n\nСахаджа йоґ: Не знаю.\n\nСахаджа йоґ: Не знаю.\n"
    talk, transcript = _slice_talk(
        tmp_path,
        body,
        {"Tape-1": ["Сахаджа йоґ: Не знаю.", "Сахаджа йоґ: Не знаю."], "Tape-2": ["Сахаджа йоґ: Не знаю."]},
        {"Tape-1": [[1, 2]], "Tape-2": [[3, 3]]},
    )
    result, text = _srt_edit(
        talk,
        transcript,
        "Tape-2",
        "Сахаджа йоґ: Не знаю.",
        "Сахаджа йоґ: Я не знаю.",
        base_lines=["Рядок, якого немає в транскрипті.", "Сахаджа йоґ: Не знаю."],
    )
    assert "error" not in result, result
    assert text.rstrip().endswith("Сахаджа йоґ: Я не знаю.")
    assert text.count("Сахаджа йоґ: Не знаю.") == 2


# paragraph_spans must cut exactly where load_transcript cuts, or the mask
# refuses (count mismatch) or hides the wrong text. Each shape below is one
# load_transcript rule: stage lines dropped, remark-only paragraphs dropped,
# both paragraph formats, whitespace around a dropped line.
_OMIT = ["(сміх)", "(Оплески)"]
_SHAPES = {
    "stage line between one-per-line paragraphs": "Перший.\n[Музика]\nДругий.\n",
    "stage line as its own blank-line paragraph": "Перший.\n\n[Музика]\n\nДругий.\n",
    "remark-only paragraph": "Перший.\n\n(сміх)\n\nДругий.\n",
    "whitespace lines around a stage line": "Перший.\n\n  \n[Сміх]\n  \n\nДругий.\n",
    "remarks split by a stage line": "Перший.\n\n(сміх) (Оплески)\n[Музика]\n (сміх)\n\nДругий.\n",
    "indented stage line": "Перший.\n  [Музика]  \nДругий.\n",
    "whitespace-only line is not a break": "Перший.\n  \nДругий.\n\nТретій.\n",
    "remark first, text after it": "Перший.\n\n(сміх)\nТекст.\n\nДругий.\n",
}


@pytest.mark.parametrize("raw", list(_SHAPES.values()), ids=list(_SHAPES))
def test_the_mask_cuts_the_paragraphs_load_transcript_cuts(tmp_path, raw):
    from tools.slice_paragraphs import mask_foreign
    from tools.sync_common import strip_with_map
    from tools.text_segmentation import load_transcript

    path = tmp_path / "transcript_uk.txt"
    path.write_text(raw, encoding="utf-8")
    paragraphs = load_transcript(str(path), _OMIT)
    view, offsets = strip_with_map(raw, _OMIT)
    masked = mask_foreign(view, offsets, raw, set(range(len(paragraphs))), len(paragraphs), _OMIT)
    assert masked is not None, f"mask disagrees with load_transcript's {len(paragraphs)} paragraphs"
    for own in range(len(paragraphs)):
        masked = mask_foreign(view, offsets, raw, {own}, len(paragraphs), _OMIT)
        visible = " ".join(masked.replace("\x00", " ").split())
        assert visible == " ".join(paragraphs[own].split())


def test_a_slice_that_owns_everything_sees_every_whitespace_character(tmp_path):
    """A gap a block runs across may hold spaces and tabs, not only newlines."""
    from tools.slice_paragraphs import mask_foreign

    raw = "Перший рядок. \nДругий\tрядок.  \n\nТретій.\n"
    masked = mask_foreign(raw, list(range(len(raw))), raw, {0, 1}, 2, [])
    assert masked == raw


def test_a_mask_cut_to_another_paragraph_count_is_refused():
    from tools.slice_paragraphs import mask_foreign

    raw = "Перший.\n\nДругий.\n"
    assert mask_foreign(raw, list(range(len(raw))), raw, {0}, 3, []) is None
