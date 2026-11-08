import json
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from tools import local_whisper
from tools.vimeo_codec import encode_video_ref

CANONICAL = "https://vimeo.com/795494154/4330e29e6d"
PLAYER = "https://player.vimeo.com/video/795494154?h=4330e29e6d"


def make_talk(root: Path, videos, **meta_extra) -> Path:
    talk = root / "talks" / "1977-10-31_About-Jesus-Christ"
    talk.mkdir(parents=True)
    meta = {"title": "About Jesus Christ", "date": "1977-10-31", "language": "en", "videos": videos}
    meta.update(meta_extra)
    (talk / "meta.yaml").write_text(yaml.safe_dump(meta), encoding="utf-8")
    return talk


def video(slug, url=CANONICAL):
    return {"slug": slug, "title": slug, "video_ref": encode_video_ref(url)}


VALID_WHISPER = {
    "language": "en",
    "segments": [
        {"id": 0, "start": 1.0, "end": 2.0, "text": "Hello", "words": [{"start": 1.0, "end": 2.0, "word": "Hello"}]}
    ],
}


class TestPlan:
    def test_targets_player_url_and_source_whisper_path(self, tmp_path):
        talk = make_talk(tmp_path, [video("Main")])
        jobs = local_whisper.plan(talk)
        assert [(j.slug, j.url, j.output) for j in jobs] == [
            ("Main", PLAYER, talk / "Main" / "source" / "whisper.json")
        ]

    def test_skips_video_that_already_has_whisper(self, tmp_path):
        talk = make_talk(tmp_path, [video("Done"), video("Todo")])
        (talk / "Done" / "source").mkdir(parents=True)
        (talk / "Done" / "source" / "whisper.json").write_text("{}", encoding="utf-8")
        assert [j.slug for j in local_whisper.plan(talk)] == ["Todo"]

    def test_force_keeps_video_that_already_has_whisper(self, tmp_path):
        talk = make_talk(tmp_path, [video("Done")])
        (talk / "Done" / "source").mkdir(parents=True)
        (talk / "Done" / "source" / "whisper.json").write_text("{}", encoding="utf-8")
        assert [j.slug for j in local_whisper.plan(talk, force=True)] == ["Done"]

    def test_video_slug_selects_one_video(self, tmp_path):
        talk = make_talk(tmp_path, [video("A"), video("B")])
        assert [j.slug for j in local_whisper.plan(talk, video_slug="B")] == ["B"]

    def test_unknown_video_slug_is_an_error(self, tmp_path):
        talk = make_talk(tmp_path, [video("A")])
        with pytest.raises(local_whisper.PlanError, match="no video 'Z'"):
            local_whisper.plan(talk, video_slug="Z")

    def test_source_url_overrides_the_vimeo_link(self, tmp_path):
        talk = make_talk(tmp_path, [video("A")])
        jobs = local_whisper.plan(talk, source_url="https://youtu.be/zVx99dfeMC0")
        assert jobs[0].url == "https://youtu.be/zVx99dfeMC0"

    def test_source_url_needs_a_single_target(self, tmp_path):
        # One override URL for two videos would put one recording's timings
        # under the other video.
        talk = make_talk(tmp_path, [video("A"), video("B")])
        with pytest.raises(local_whisper.PlanError, match="--video-slug"):
            local_whisper.plan(talk, source_url="https://youtu.be/x")

    def test_missing_meta_is_an_error(self, tmp_path):
        with pytest.raises(local_whisper.PlanError, match="meta.yaml"):
            local_whisper.plan(tmp_path / "talks" / "nope")


class TestLanguage:
    def test_talk_language(self):
        assert local_whisper.whisper_language({"language": "hi"}) == "hi"

    def test_defaults_to_english(self):
        assert local_whisper.whisper_language({}) == "en"

    def test_multilingual_talk_auto_detects(self):
        assert local_whisper.whisper_language({"language": "en", "other_languages": ["hi"]}) is None


class TestDownload:
    def test_runs_this_interpreters_yt_dlp_for_audio_with_amruta_referer(self, tmp_path, monkeypatch):
        calls = []

        def fake_run(argv, **kwargs):
            calls.append(argv)
            (tmp_path / "audio.m4a").write_bytes(b"x")

            class R:
                returncode = 0

            return R()

        monkeypatch.setattr(local_whisper.subprocess, "run", fake_run)
        out = local_whisper.download_audio(PLAYER, tmp_path)
        argv = calls[0]
        assert argv[:3] == [sys.executable, "-m", "yt_dlp"]
        assert argv[argv.index("--referer") + 1] == "https://www.amruta.org/"
        assert argv[argv.index("-f") + 1].startswith("bestaudio")
        assert argv[-1] == PLAYER
        assert out == tmp_path / "audio.m4a"

    def test_failed_download_raises(self, tmp_path, monkeypatch):
        class R:
            returncode = 1

        monkeypatch.setattr(local_whisper.subprocess, "run", lambda *a, **k: R())
        with pytest.raises(local_whisper.DownloadError):
            local_whisper.download_audio(PLAYER, tmp_path)


class TestMain:
    @pytest.fixture
    def fakes(self, monkeypatch):
        seen = {}

        def fake_download(url, dest):
            seen["url"] = url
            p = Path(dest) / "audio.m4a"
            p.write_bytes(b"x")
            return p

        def fake_whisper(audio, output, model, language):
            seen.update(model=model, language=language, audio=Path(audio))
            Path(output).write_text(json.dumps(VALID_WHISPER), encoding="utf-8")

        monkeypatch.setattr(local_whisper, "check_downloader", lambda: None)
        monkeypatch.setattr(local_whisper, "check_whisper", lambda: None)
        monkeypatch.setattr(local_whisper, "download_audio", fake_download)
        monkeypatch.setattr(local_whisper, "transcribe", fake_whisper)
        return seen

    def test_writes_validated_whisper_json_where_the_pipeline_looks(self, tmp_path, fakes):
        talk = make_talk(tmp_path, [video("Main")])
        rc = local_whisper.main(["--talk-id", talk.name, "--root", str(tmp_path)])
        out = talk / "Main" / "source" / "whisper.json"
        assert rc == 0
        assert json.loads(out.read_text(encoding="utf-8")) == VALID_WHISPER
        assert fakes["url"] == PLAYER
        assert (fakes["model"], fakes["language"]) == ("medium", "en")

    def test_audio_is_not_left_behind(self, tmp_path, fakes):
        talk = make_talk(tmp_path, [video("Main")])
        local_whisper.main(["--talk-id", talk.name, "--root", str(tmp_path)])
        assert not fakes["audio"].exists()
        assert sorted(p.name for p in (talk / "Main" / "source").iterdir()) == ["whisper.json"]

    def test_invalid_whisper_output_is_not_kept(self, tmp_path, monkeypatch, fakes):
        talk = make_talk(tmp_path, [video("Main")])
        monkeypatch.setattr(
            local_whisper,
            "transcribe",
            lambda a, o, m, lang: Path(o).write_text('{"segments": "nope"}', encoding="utf-8"),
        )
        rc = local_whisper.main(["--talk-id", talk.name, "--root", str(tmp_path)])
        assert rc == 1
        assert not (talk / "Main" / "source" / "whisper.json").exists()

    def test_nothing_to_do_is_success(self, tmp_path, fakes, capsys):
        talk = make_talk(tmp_path, [video("Main")])
        (talk / "Main" / "source").mkdir(parents=True)
        (talk / "Main" / "source" / "whisper.json").write_text("{}", encoding="utf-8")
        assert local_whisper.main(["--talk-id", talk.name, "--root", str(tmp_path)]) == 0
        assert "url" not in fakes
        assert "already" in capsys.readouterr().out

    def test_download_failure_exits_nonzero(self, tmp_path, monkeypatch, fakes):
        talk = make_talk(tmp_path, [video("Main")])

        def boom(url, dest):
            raise local_whisper.DownloadError("HTTP Error 401")

        monkeypatch.setattr(local_whisper, "download_audio", boom)
        assert local_whisper.main(["--talk-id", talk.name, "--root", str(tmp_path)]) == 1


def test_whisper_workflow_points_at_this_tool_when_download_fails():
    wf = (Path(__file__).resolve().parent.parent / ".github" / "workflows" / "whisper.yml").read_text(encoding="utf-8")
    assert "python -m tools.local_whisper --talk-id" in wf


IMPERSONATION_UNAVAILABLE = """[info] Available impersonate targets
Client    OS   Source
--------------------------------------------
Tor       -    curl_cffi>=0.11 (unavailable)
Chrome    -    curl_cffi (unavailable)
"""

IMPERSONATION_AVAILABLE = """[info] Available impersonate targets
Client          OS           Source
--------------------------------------
Chrome-136      Macos-15     curl_cffi
Safari-18.4     Ios-18.4     curl_cffi
"""


def fake_yt_dlp(monkeypatch, stdout, returncode=0):
    calls = []

    def run(argv, **kwargs):
        calls.append(argv)
        return subprocess.CompletedProcess(argv, returncode, stdout=stdout, stderr="")

    monkeypatch.setattr(local_whisper.subprocess, "run", run)
    return calls


class TestDownloaderCheck:
    def test_asks_this_interpreters_yt_dlp_for_impersonate_targets(self, monkeypatch):
        calls = fake_yt_dlp(monkeypatch, IMPERSONATION_AVAILABLE)
        local_whisper.check_downloader()
        assert calls == [[sys.executable, "-m", "yt_dlp", "--list-impersonate-targets"]]

    def test_curl_cffi_installed_but_unusable_is_reported(self, monkeypatch):
        fake_yt_dlp(monkeypatch, IMPERSONATION_UNAVAILABLE)
        with pytest.raises(local_whisper.DownloadError, match="requirements.txt"):
            local_whisper.check_downloader()

    def test_missing_yt_dlp_is_reported(self, monkeypatch):
        fake_yt_dlp(monkeypatch, "", returncode=1)
        with pytest.raises(local_whisper.DownloadError, match="requirements.txt"):
            local_whisper.check_downloader()

    def test_main_stops_before_any_download_when_the_downloader_is_incomplete(self, tmp_path, monkeypatch):
        talk = make_talk(tmp_path, [video("Main")])

        def incomplete():
            raise local_whisper.DownloadError("curl_cffi missing")

        monkeypatch.setattr(local_whisper, "check_downloader", incomplete)
        monkeypatch.setattr(local_whisper, "download_audio", lambda *a: pytest.fail("downloaded anyway"))
        assert local_whisper.main(["--talk-id", talk.name, "--root", str(tmp_path)]) == 1


def test_missing_faster_whisper_is_reported_before_downloading(tmp_path, monkeypatch, capsys):
    talk = make_talk(tmp_path, [video("Main")])
    monkeypatch.setattr(local_whisper, "check_downloader", lambda: None)
    monkeypatch.setattr(local_whisper.importlib.util, "find_spec", lambda name: None)
    monkeypatch.setattr(local_whisper, "download_audio", lambda *a: pytest.fail("downloaded anyway"))
    assert local_whisper.main(["--talk-id", talk.name, "--root", str(tmp_path)]) == 1
    assert "faster-whisper" in capsys.readouterr().err
