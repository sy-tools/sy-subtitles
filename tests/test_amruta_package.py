import subprocess
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest
import yaml

from tools import amruta_package as ap

TALK = "1987-04-19_Easter-Puja-Materialism"
META = """title: 'Easter Puja: Materialism'
date: '1987-04-19'
amruta_url: https://www.amruta.org/1987/04/19/easter-puja-1987/
language: en
videos:
- slug: Easter-Puja
  title: Easter Puja
  sync: primary
- slug: Easter-Puja-Talk
  title: Easter Puja Talk
  sync: derived
"""
UK = "19 квітня 1987\nВеликодня Пуджа\nРим (Італія)\nМова промови: англійська\n\nПерший абзац.\nДругий абзац.\n"
EN = (
    "April 19 1987\nEaster Puja\nRome (Italy)\nLanguage: English\n\nFirst paragraph.\nAnd everything is so very fine.\n"
)
SRT_UK = "1\n00:00:01,000 --> 00:00:02,000\nПерший.\n"
SRT_EN = "1\n00:00:01,000 --> 00:00:02,000\nFirst.\n"


def _git(repo, *args):
    subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True)


def _commit(repo, msg):
    _git(repo, "add", "-A")
    _git(repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", msg)


def _write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


@pytest.fixture
def repo(tmp_path):
    _git(tmp_path, "init", "-q")
    talk = tmp_path / "talks" / TALK
    _write(talk / "meta.yaml", META)
    _write(talk / "transcript_uk.txt", UK)
    _write(talk / "transcript_en.txt", EN)
    for slug in ("Easter-Puja", "Easter-Puja-Talk"):
        _write(talk / slug / "source" / "en.srt", SRT_EN)
    _commit(tmp_path, "add talk")
    for slug in ("Easter-Puja", "Easter-Puja-Talk"):
        _write(talk / slug / "final" / "uk.srt", SRT_UK + slug + "\n")
    _commit(tmp_path, "Build subtitles")
    return tmp_path


def test_double_space_keeps_header_block():
    out = ap.double_space("H1\nH2\nH3\nH4\n\nP1\nP2\n")
    assert out == "H1\nH2\nH3\nH4\n\nP1\n\nP2\n"
    assert ap.double_space(out) == out


def test_package_has_uk_transcript_and_one_srt_per_video(repo):
    files = ap.package_files(repo, TALK)
    assert set(files) == {"transcript_uk.txt", "Easter-Puja_uk.srt", "Easter-Puja-Talk_uk.srt"}
    assert files["Easter-Puja_uk.srt"] == SRT_UK + "Easter-Puja\n"
    assert files["transcript_uk.txt"].endswith("Перший абзац.\n\nДругий абзац.\n")


def test_ignored_video_is_skipped(repo):
    meta = repo / "talks" / TALK / "meta.yaml"
    meta.write_text(META + "- slug: Extra\n  title: Extra\n  sync: ignored\n", encoding="utf-8")
    _write(repo / "talks" / TALK / "Extra" / "final" / "uk.srt", SRT_UK)
    assert "Extra_uk.srt" not in ap.package_files(repo, TALK)


def test_en_transcript_not_shipped_when_unedited(repo):
    assert "transcript_en.txt" not in ap.package_files(repo, TALK)


def test_en_transcript_shipped_when_edited_after_build(repo):
    path = repo / "talks" / TALK / "transcript_en.txt"
    path.write_text(EN.replace("very fine.", "very fine. May God bless you!"), encoding="utf-8")
    _commit(repo, "add blessing")
    files = ap.package_files(repo, TALK)
    assert files["transcript_en.txt"].endswith(
        "First paragraph.\n\nAnd everything is so very fine. May God bless you!\n"
    )


def test_whitespace_only_en_change_is_not_an_edit(repo):
    path = repo / "talks" / TALK / "transcript_en.txt"
    path.write_text(EN.replace("\n\n", "\n\n\n") + "\n", encoding="utf-8")
    _commit(repo, "reflow")
    assert "transcript_en.txt" not in ap.package_files(repo, TALK)


def test_edited_en_srt_is_named_by_video(repo):
    _write(
        repo / "talks" / TALK / "Easter-Puja" / "source" / "en.srt",
        SRT_EN + "\n2\n00:00:03,000 --> 00:00:04,000\nMay God bless you!\n",
    )
    _commit(repo, "edit en srt")
    files = ap.package_files(repo, TALK)
    assert "Easter-Puja_en.srt" in files
    assert "Easter-Puja-Talk_en.srt" not in files


def test_never_built_talk_raises(tmp_path):
    _git(tmp_path, "init", "-q")
    talk = tmp_path / "talks" / TALK
    _write(talk / "meta.yaml", META)
    _write(talk / "transcript_uk.txt", UK)
    _commit(tmp_path, "add talk")
    with pytest.raises(ap.PackageError):
        ap.package_files(tmp_path, TALK)


def test_write_package_replaces_stale_files(tmp_path):
    talk = tmp_path / TALK
    _write(talk / "_for_Amruta" / "old.srt", "stale")
    ap.write_package(talk, {"uk.txt": "new\n"})
    assert sorted(p.name for p in (talk / "_for_Amruta").iterdir()) == ["uk.txt"]


def test_email_subject_and_body():
    subject, body = ap.email(yaml.safe_load(META))
    assert subject == "Transcript and subtitles for the Easter Puja: Materialism"
    assert body == (
        "Jai Shri Mataji!\n\n"
        "Please upload transcript and subtitles for the Easter Puja: Materialism\n"
        "https://www.amruta.org/1987/04/19/easter-puja-1987/"
    )


def test_email_addresses_from_env():
    env = {"AMRUTA_EMAIL_TO": "help@amruta.org", "AMRUTA_EMAIL_CC": "syccua@gmail.com"}
    assert ap.email_addresses(env) == ("help@amruta.org", "syccua@gmail.com")
    with pytest.raises(ap.PackageError):
        ap.email_addresses({"AMRUTA_EMAIL_TO": "help@amruta.org"})
    with pytest.raises(ap.PackageError):
        ap.email_addresses({"AMRUTA_EMAIL_TO": "", "AMRUTA_EMAIL_CC": "x@y"})


def test_gmail_url_round_trips():
    url = ap.gmail_url("Subj: a&b", "Line 1\n\nLine 2 ?=", "help@amruta.org", "syccua@gmail.com")
    parsed = urlparse(url)
    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == "https://mail.google.com/mail/"
    q = parse_qs(parsed.query)
    assert q == {
        "view": ["cm"],
        "fs": ["1"],
        "to": ["help@amruta.org"],
        "cc": ["syccua@gmail.com"],
        "su": ["Subj: a&b"],
        "body": ["Line 1\n\nLine 2 ?="],
    }


def test_issue_comment_links_every_file():
    md = ap.issue_comment(
        "sy-tools/sy-subtitles", TALK, ["transcript_uk.txt", "Easter-Puja_uk.srt"], "https://mail.example/x"
    )
    assert "https://mail.example/x" in md
    for name in ("transcript_uk.txt", "Easter-Puja_uk.srt"):
        assert f"https://github.com/sy-tools/sy-subtitles/raw/main/talks/{TALK}/_for_Amruta/{name}" in md
    assert "Attach the files, send, then close this issue." in md


def test_append_delivery_creates_then_appends(tmp_path):
    meta = tmp_path / "meta.yaml"
    meta.write_text(META, encoding="utf-8")
    ap.append_delivery(meta, "2026-11-15", "abc123")
    ap.append_delivery(meta, "2026-12-01", "def456")
    text = meta.read_text(encoding="utf-8")
    assert text.startswith(META)
    assert yaml.safe_load(text)["amruta_delivery"] == [
        {"date": "2026-11-15", "commit": "abc123"},
        {"date": "2026-12-01", "commit": "def456"},
    ]


# A text-only talk has no video and never gets a final/uk.srt, so its baseline is the
# commit that first landed its Ukrainian transcript.
TEXT_ONLY_TALK = "2001-02-03_Text-Only-Talk"
TEXT_ONLY_META = (
    "title: Text-only talk\ndate: '2001-02-03'\namruta_url: https://www.amruta.org/2001/02/03/text-only-talk/\n"
)


@pytest.fixture
def text_only_talk(tmp_path):
    _git(tmp_path, "init", "-q")
    talk = tmp_path / "talks" / TEXT_ONLY_TALK
    _write(talk / "meta.yaml", TEXT_ONLY_META)
    _write(talk / "transcript_en.txt", EN)
    _commit(tmp_path, "add text-only talk")
    _write(talk / "transcript_uk.txt", UK)
    _commit(tmp_path, "Translate text-only talk")
    return tmp_path


def test_text_only_talk_packages_its_uk_transcript_only(text_only_talk):
    files = ap.package_files(text_only_talk, TEXT_ONLY_TALK)
    assert set(files) == {"transcript_uk.txt"}
    assert files["transcript_uk.txt"].endswith("Перший абзац.\n\nДругий абзац.\n")


def test_text_only_talk_ships_the_english_transcript_once_it_is_edited_after_translation(text_only_talk):
    _write(text_only_talk / "talks" / TEXT_ONLY_TALK / "transcript_en.txt", EN.replace("fine", "good"))
    _commit(text_only_talk, "Fix EN")
    assert set(ap.package_files(text_only_talk, TEXT_ONLY_TALK)) == {"transcript_uk.txt", "transcript_en.txt"}


def test_text_only_talk_without_a_uk_transcript_is_refused(tmp_path):
    _git(tmp_path, "init", "-q")
    _write(tmp_path / "talks" / TEXT_ONLY_TALK / "meta.yaml", TEXT_ONLY_META)
    _write(tmp_path / "talks" / TEXT_ONLY_TALK / "transcript_en.txt", EN)
    _commit(tmp_path, "add text-only talk")
    with pytest.raises(ap.PackageError, match="transcript_uk.txt"):
        ap.package_files(tmp_path, TEXT_ONLY_TALK)
