"""EN captions for YouTube videos, from amruta's ``captions_zip`` repository.

A Vimeo video gets ``source/en.srt`` from Vimeo's own text tracks. A YouTube
video gets it from ``<id>.zip`` in ``amrutadotorg/captions_zip``, which holds
one WebVTT file per language. The fixture is a real amruta track with its id
line rewritten to a synthetic id; the expected SRT is the file the same talk
got from Vimeo, so the conversion is pinned to what the pipeline already eats.
"""

import io
import zipfile
from pathlib import Path

import pytest
import yaml

from tools import amruta_captions
from tools.amruta_captions import fetch_en_srt, vtt_to_srt
from tools.text_normalize import check_text, is_uk_content_path
from tools.vimeo_codec import encode_video_ref

FIXTURES = Path(__file__).parent / "fixtures" / "captions"
YT_ID = "AbCdEfGhIjK"
OTHER_YT_ID = "ZyXwVuTsRqP"
VTT = (FIXTURES / f"{YT_ID}.en.vtt").read_text(encoding="utf-8")
SRT = (FIXTURES / f"{YT_ID}.en.srt").read_text(encoding="utf-8")


def _zip(members: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for name, text in members.items():
            zf.writestr(name, text)
    return buf.getvalue()


def _serving(payloads: dict[str, bytes | None]):
    """A fake fetch: url -> bytes, ``None`` standing for a 404."""
    calls: list[str] = []

    def fetch(url: str) -> bytes | None:
        calls.append(url)
        for video_id, payload in payloads.items():
            if url.endswith(f"/{video_id}.zip"):
                return payload
        return None

    fetch.calls = calls
    return fetch


# ── vtt_to_srt ───────────────────────────────────────────────────


def test_real_track_converts_to_the_srt_the_talk_already_has():
    assert vtt_to_srt(VTT) == SRT


def test_header_note_and_style_blocks_are_dropped():
    vtt = (
        "WEBVTT - some title\n"
        "Kind: captions\n"
        "\n"
        "NOTE Video ID: AbCdEfGhIjK\n"
        "\n"
        "STYLE\n"
        "::cue { color: red }\n"
        "\n"
        "NOTE\n"
        "a multi-line\n"
        "comment\n"
        "\n"
        "00:00:01.000 --> 00:00:02.500\n"
        "Hello\n"
    )
    assert vtt_to_srt(vtt) == "1\n00:00:01,000 --> 00:00:02,500\nHello\n\n"


def test_cue_ids_are_renumbered_and_settings_dropped():
    vtt = (
        "WEBVTT\n"
        "\n"
        "intro\n"
        "00:00:01.000 --> 00:00:02.000 align:start position:10%\n"
        "One\n"
        "\n"
        "17\n"
        "00:00:03.000 --> 00:00:04.000\n"
        "Two\n"
        "second line\n"
    )
    assert vtt_to_srt(vtt) == (
        "1\n00:00:01,000 --> 00:00:02,000\nOne\n\n2\n00:00:03,000 --> 00:00:04,000\nTwo\nsecond line\n\n"
    )


def test_cue_id_that_only_starts_with_a_block_keyword_is_kept():
    # WebVTT: a NOTE/STYLE/REGION block is the keyword followed by whitespace
    # or the end of the line. "NOTEBOOK" is an ordinary cue identifier.
    vtt = (
        "WEBVTT\n"
        "\n"
        "NOTEBOOK\n"
        "00:00:01.000 --> 00:00:02.000\n"
        "One\n"
        "\n"
        "STYLES-2\n"
        "00:00:03.000 --> 00:00:04.000\n"
        "Two\n"
        "\n"
        "REGIONAL\n"
        "00:00:05.000 --> 00:00:06.000\n"
        "Three\n"
        "\n"
        "NOTE a real comment\n"
        "\n"
        "NOTE\twith a tab\n"
        "\n"
        "REGION\n"
        "id:fred\n"
    )
    assert vtt_to_srt(vtt) == (
        "1\n00:00:01,000 --> 00:00:02,000\nOne\n\n"
        "2\n00:00:03,000 --> 00:00:04,000\nTwo\n\n"
        "3\n00:00:05,000 --> 00:00:06,000\nThree\n\n"
    )


def test_timestamps_without_hours_are_padded():
    vtt = "WEBVTT\n\n01:02.345 --> 01:03.000\nShort form\n"
    assert vtt_to_srt(vtt) == "1\n00:01:02,345 --> 00:01:03,000\nShort form\n\n"


def test_crlf_and_bom_are_tolerated():
    vtt = "\ufeffWEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nHello\r\n"
    assert vtt_to_srt(vtt) == "1\n00:00:01,000 --> 00:00:02,000\nHello\n\n"


def test_text_that_is_not_webvtt_is_refused():
    with pytest.raises(ValueError):
        vtt_to_srt("<html>Not Found</html>")


# ── fetch_en_srt ─────────────────────────────────────────────────


def test_fetch_asks_the_captions_repo_for_the_ids_zip(tmp_path):
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": VTT})})
    fetch_en_srt(YT_ID, tmp_path / "en.srt", fetch=fetch)
    assert fetch.calls == [f"https://raw.githubusercontent.com/amrutadotorg/captions_zip/master/{YT_ID}.zip"]


def test_missing_zip_returns_false_and_writes_nothing(tmp_path):
    out = tmp_path / "en.srt"
    assert fetch_en_srt(YT_ID, out, fetch=_serving({YT_ID: None})) is False
    assert not out.exists()


def test_zip_without_english_returns_false_and_writes_nothing(tmp_path):
    out = tmp_path / "en.srt"
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.de.vtt": VTT})})
    assert fetch_en_srt(YT_ID, out, fetch=fetch) is False
    assert not out.exists()


def test_zip_with_english_writes_the_srt(tmp_path):
    out = tmp_path / "source" / "en.srt"
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.de.vtt": "WEBVTT\n", f"{YT_ID}.en.vtt": VTT})})
    assert fetch_en_srt(YT_ID, out, fetch=fetch) is True
    assert out.read_bytes() == (FIXTURES / f"{YT_ID}.en.srt").read_bytes()


def test_written_srt_passes_the_text_hygiene_guard(tmp_path):
    vtt = (
        "\ufeffWEBVTT\n"
        "\n"
        "00:00:01.000 --> 00:00:02.500\n"
        "\ufeffHello\u00a0world\u200b\n"
        "\n"
        "00:00:03.000 --> 00:00:04.000\n"
        "Shri\u202fMataji\u00ad\u2009says\u200c so\n"
    )
    out = tmp_path / "talks" / TALK_ID / "talk" / "source" / "en.srt"
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": vtt})})
    assert fetch_en_srt(YT_ID, out, fetch=fetch) is True
    text = out.read_text(encoding="utf-8")
    assert check_text(text, uk=is_uk_content_path(out.as_posix())) == []
    assert text == (
        "1\n00:00:01,000 --> 00:00:02,500\nHello world\n\n2\n00:00:03,000 --> 00:00:04,000\nShri Mataji says so\n\n"
    )


def test_english_track_with_no_cues_is_not_written(tmp_path):
    out = tmp_path / "en.srt"
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": "WEBVTT\n\nNOTE nothing here\n"})})
    assert fetch_en_srt(YT_ID, out, fetch=fetch) is False
    assert not out.exists()


def test_an_id_that_is_not_a_youtube_id_never_reaches_the_network(tmp_path):
    fetch = _serving({})
    with pytest.raises(ValueError):
        fetch_en_srt("../../etc/passwd", tmp_path / "en.srt", fetch=fetch)
    assert fetch.calls == []


# ── CLI ──────────────────────────────────────────────────────────

VIMEO_REF = encode_video_ref("https://vimeo.com/123456789/abcdef0123")
YT_REF = encode_video_ref(f"https://www.youtube.com/watch?v={YT_ID}")
OTHER_YT_REF = encode_video_ref(f"https://www.youtube.com/watch?v={OTHER_YT_ID}")
TALK_ID = "2001-01-01_Test-Talk"


def _talk(tmp_path: Path, videos: list[dict]) -> Path:
    talk = tmp_path / "talks" / TALK_ID
    talk.mkdir(parents=True)
    (talk / "meta.yaml").write_text(yaml.safe_dump({"title": "Test", "videos": videos}), encoding="utf-8")
    return talk


def _run(tmp_path, monkeypatch, fetch) -> int:
    monkeypatch.setattr(amruta_captions, "_http_get", fetch)
    return amruta_captions.main(["--talk-id", TALK_ID, "--talks-root", str(tmp_path / "talks")])


def test_cli_fills_en_srt_for_a_youtube_video(tmp_path, monkeypatch, capsys):
    talk = _talk(tmp_path, [{"slug": "Talk", "video_ref": YT_REF}])
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": VTT})})
    assert _run(tmp_path, monkeypatch, fetch) == 0
    assert (talk / "Talk" / "source" / "en.srt").read_text(encoding="utf-8") == SRT
    assert "Talk: fetched" in capsys.readouterr().out


def test_cli_skips_vimeo_videos_and_videos_that_have_en_srt(tmp_path, monkeypatch, capsys):
    talk = _talk(
        tmp_path,
        [
            {"slug": "Vimeo-Cut", "video_ref": VIMEO_REF},
            {"slug": "Has-Srt", "video_ref": YT_REF},
            {"slug": "No-Ref"},
        ],
    )
    existing = talk / "Has-Srt" / "source" / "en.srt"
    existing.parent.mkdir(parents=True)
    existing.write_text("hand-corrected\n", encoding="utf-8")
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": VTT})})

    assert _run(tmp_path, monkeypatch, fetch) == 0

    assert fetch.calls == []
    assert existing.read_text(encoding="utf-8") == "hand-corrected\n"
    assert not (talk / "Vimeo-Cut" / "source" / "en.srt").exists()
    out = capsys.readouterr().out
    assert len([line for line in out.splitlines() if line.strip()]) == 3, "one line per video"


def test_cli_reports_missing_captions_and_exits_zero(tmp_path, monkeypatch, capsys):
    talk = _talk(tmp_path, [{"slug": "Talk", "video_ref": YT_REF}])
    assert _run(tmp_path, monkeypatch, _serving({YT_ID: None})) == 0
    assert not (talk / "Talk" / "source" / "en.srt").exists()
    assert "Talk: no EN captions" in capsys.readouterr().out


def test_cli_survives_a_network_error_and_still_tries_the_next_video(tmp_path, monkeypatch, capsys):
    talk = _talk(
        tmp_path,
        [{"slug": "Broken", "video_ref": OTHER_YT_REF}, {"slug": "Talk", "video_ref": YT_REF}],
    )
    good = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": VTT})})

    def fetch(url: str) -> bytes | None:
        if OTHER_YT_ID in url:
            raise OSError(f"connection reset while fetching {url}")
        return good(url)

    assert _run(tmp_path, monkeypatch, fetch) == 0
    assert (talk / "Talk" / "source" / "en.srt").exists()
    assert "::warning::" in capsys.readouterr().out


def test_cli_never_prints_a_plaintext_id_or_url(tmp_path, monkeypatch, capsys):
    """Links are stored obfuscated; a public Actions log must not undo that."""
    monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
    _talk(
        tmp_path,
        [{"slug": "Broken", "video_ref": OTHER_YT_REF}, {"slug": "Talk", "video_ref": YT_REF}],
    )
    good = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": VTT})})

    def fetch(url: str) -> bytes | None:
        if OTHER_YT_ID in url:
            raise OSError(f"connection reset while fetching {url}")
        return good(url)

    _run(tmp_path, monkeypatch, fetch)
    captured = capsys.readouterr()
    for stream in (captured.out, captured.err):
        assert YT_ID not in stream
        assert OTHER_YT_ID not in stream
        assert "captions_zip" not in stream


def test_cli_masks_the_id_on_a_runner_before_fetching(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    _talk(tmp_path, [{"slug": "Talk", "video_ref": YT_REF}])
    seen: list[str] = []

    def fetch(url: str) -> bytes | None:
        seen.append(capsys.readouterr().out)
        return None

    _run(tmp_path, monkeypatch, fetch)
    assert f"::add-mask::{YT_ID}" in seen[0]


def test_cli_exits_zero_when_the_talk_has_no_meta(tmp_path, monkeypatch, capsys):
    (tmp_path / "talks").mkdir()
    assert _run(tmp_path, monkeypatch, _serving({})) == 0
    assert "::warning::" in capsys.readouterr().out


def test_cli_refuses_a_talk_id_that_is_not_one(tmp_path, monkeypatch):
    (tmp_path / "talks").mkdir()
    monkeypatch.setattr(amruta_captions, "_http_get", _serving({}))
    with pytest.raises(SystemExit) as e:
        amruta_captions.main(["--talk-id", "../escape", "--talks-root", str(tmp_path / "talks")])
    assert e.value.code != 0


def test_cli_writes_nothing_for_a_slug_that_would_leave_the_talk(tmp_path, monkeypatch, capsys):
    _talk(tmp_path, [{"slug": "../../outside", "video_ref": YT_REF}])
    fetch = _serving({YT_ID: _zip({f"{YT_ID}.en.vtt": VTT})})
    assert _run(tmp_path, monkeypatch, fetch) == 0
    assert fetch.calls == []
    assert not list(tmp_path.rglob("en.srt"))
    assert "::warning::" in capsys.readouterr().out
