"""tools/video_media.py — the one place a talk's video is downloaded from.

No network here: every download goes through an injected ``run``. Ids are
synthetic (a YouTube id is 11 characters, a Drive id 33).
"""

import subprocess
from pathlib import Path
from urllib.parse import urlparse

import pytest
import yaml

from tools import video_media
from tools.vimeo_codec import encode_video_ref

VIMEO = "https://vimeo.com/111111111/aaaaaaaaaa"
VIMEO_PLAYER = "https://player.vimeo.com/video/111111111?h=aaaaaaaaaa"
YT_ID = "AbCdEfGhIjK"
YT = f"https://www.youtube.com/watch?v={YT_ID}"
GD1_ID = "1Syntheticdriveid00abcdefghijklmn"
GD2_ID = "1Syntheticdriveid00opqrstuvwxyzAB"
GD1 = f"https://drive.google.com/file/d/{GD1_ID}/view"
GD2 = f"https://drive.google.com/file/d/{GD2_ID}/view"
TALK_ID = "1977-10-31_About-Jesus-Christ"


def vimeo_video():
    return {"slug": "Main", "title": "Main", "video_ref": encode_video_ref(VIMEO)}


def yt_video(mirrors=(GD1, GD2)):
    v = {"slug": "Main", "title": "Main", "video_ref": encode_video_ref(YT)}
    if mirrors:
        v["media_refs"] = [encode_video_ref(m) for m in mirrors]
    return v


class FakeRun:
    """Stands in for subprocess.run; succeeds for the URLs in ``ok``."""

    def __init__(self, ok=(), on_call=None):
        self.ok = set(ok)
        self.calls = []
        self.on_call = on_call

    def __call__(self, argv, **kwargs):
        self.calls.append(argv)
        if self.on_call:
            self.on_call(argv)
        url = argv[-1]
        if url in self.ok:
            out = Path(argv[argv.index("-o") + 1])
            out.write_bytes(b"video")
            return subprocess.CompletedProcess(argv, 0)
        return subprocess.CompletedProcess(argv, 1)

    def urls(self):
        return [argv[-1] for argv in self.calls]


class TestCandidates:
    def test_vimeo_is_the_player_url(self):
        assert video_media.download_candidates(vimeo_video(), ci=True) == [VIMEO_PLAYER]
        assert video_media.download_candidates(vimeo_video(), ci=False) == [VIMEO_PLAYER]

    def test_youtube_in_ci_is_its_drive_mirrors_in_order(self):
        assert video_media.download_candidates(yt_video(), ci=True) == [GD1, GD2]

    def test_youtube_at_home_tries_youtube_itself_after_the_mirrors(self):
        assert video_media.download_candidates(yt_video(), ci=False) == [GD1, GD2, YT]

    def test_youtube_without_mirrors_has_nothing_to_try_in_ci(self):
        assert video_media.download_candidates(yt_video(mirrors=()), ci=True) == []

    def test_youtube_without_mirrors_at_home_is_youtube(self):
        assert video_media.download_candidates(yt_video(mirrors=()), ci=False) == [YT]

    def test_no_link_has_no_candidates(self):
        assert video_media.download_candidates({"slug": "Main", "title": "Main"}, ci=False) == []


class TestDownload:
    def test_falls_through_to_the_second_mirror(self, tmp_path):
        run = FakeRun(ok={GD2})
        out = tmp_path / "video.mp4"
        assert video_media.download(yt_video(), out, ci=True, run=run) == "gd"
        assert run.urls() == [GD1, GD2]
        assert out.read_bytes() == b"video"

    def test_every_attempt_pins_the_mp4_container_and_the_output(self, tmp_path):
        run = FakeRun(ok={GD2})
        out = tmp_path / "video.mp4"
        video_media.download(yt_video(), out, ci=True, run=run)
        for argv in run.calls:
            assert argv[argv.index("--merge-output-format") + 1] == "mp4"
            assert argv[argv.index("-o") + 1] == str(out)

    def test_vimeo_downloads_with_the_amruta_referer(self, tmp_path):
        run = FakeRun(ok={VIMEO_PLAYER})
        assert video_media.download(vimeo_video(), tmp_path / "v.mp4", ci=True, run=run) == "vimeo"
        argv = run.calls[0]
        assert argv[argv.index("--referer") + 1] == "https://www.amruta.org/"

    def test_drive_is_not_sent_the_amruta_referer(self, tmp_path):
        run = FakeRun(ok={GD1})
        video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=run)
        assert "--referer" not in run.calls[0]

    def test_youtube_is_never_tried_in_ci(self, tmp_path):
        run = FakeRun(ok={YT})
        with pytest.raises(SystemExit):
            video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=run)
        hosts = {urlparse(url).hostname for url in run.urls()}
        assert not hosts & {"www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be"}, hosts

    def test_youtube_is_the_last_resort_at_home(self, tmp_path):
        run = FakeRun(ok={YT})
        assert video_media.download(yt_video(), tmp_path / "v.mp4", ci=False, run=run) == "yt"
        assert run.urls() == [GD1, GD2, YT]

    def test_all_failing_exits_and_names_the_local_fallback(self, tmp_path, capsys):
        run = FakeRun()
        with pytest.raises(SystemExit) as exc:
            video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=run, talk_id=TALK_ID, video_slug="Main")
        assert exc.value.code == 1
        out = capsys.readouterr().out
        assert "::error::" in out
        assert "python -m tools.local_whisper --talk-id " + TALK_ID + " --video-slug Main" in out
        assert "::error::Video download failed: no Drive mirror of this YouTube video could be downloaded." in out

    def test_vimeo_failure_keeps_the_data_centre_explanation(self, tmp_path, capsys):
        with pytest.raises(SystemExit):
            video_media.download(vimeo_video(), tmp_path / "v.mp4", ci=True, run=FakeRun())
        out = capsys.readouterr().out
        assert "401" in out
        assert "data-centre IPs" in out
        assert "tools.local_whisper" in out

    def test_no_candidates_exits_without_running_anything(self, tmp_path, capsys):
        run = FakeRun()
        with pytest.raises(SystemExit) as exc:
            video_media.download(yt_video(mirrors=()), tmp_path / "v.mp4", ci=True, run=run)
        assert exc.value.code == 1
        assert run.calls == []
        out = capsys.readouterr().out
        assert "media_refs" in out
        assert "tools.local_whisper" in out

    def test_success_without_a_file_is_a_failure(self, tmp_path):
        # yt-dlp can exit 0 having written something else (another container);
        # the next mirror must still be tried.
        calls = []

        def run(argv, **kwargs):
            calls.append(argv[-1])
            if argv[-1] == GD2:
                Path(argv[argv.index("-o") + 1]).write_bytes(b"video")
            return subprocess.CompletedProcess(argv, 0)

        assert video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=run) == "gd"
        assert calls == [GD1, GD2]

    def test_a_failed_attempt_leaves_nothing_for_the_next_to_resume(self, tmp_path):
        out = tmp_path / "v.mp4"

        def run(argv, **kwargs):
            # A complete-looking file from the failed first try must not be
            # taken by the second as "already downloaded".
            if argv[-1] == GD1:
                out.write_bytes(b"partial")
                return subprocess.CompletedProcess(argv, 1)
            assert not out.exists()
            assert "--no-continue" in argv
            out.write_bytes(b"video")
            return subprocess.CompletedProcess(argv, 0)

        video_media.download(yt_video(), out, ci=True, run=run)
        assert out.read_bytes() == b"video"


class TestPurpose:
    def test_burn_vimeo_failure_explains_the_refusal_without_the_whisper_fallback(self, tmp_path, capsys):
        with pytest.raises(SystemExit):
            video_media.download(vimeo_video(), tmp_path / "v.mp4", ci=True, run=FakeRun(), purpose="burn")
        out = capsys.readouterr().out
        assert "data-centre IPs" in out
        assert "Rendering this video needs a machine on a normal connection." in out
        assert "local_whisper" not in out

    def test_burn_youtube_without_mirror_asks_for_one(self, tmp_path, capsys):
        with pytest.raises(SystemExit):
            video_media.download(yt_video(mirrors=()), tmp_path / "v.mp4", ci=True, run=FakeRun(), purpose="burn")
        out = capsys.readouterr().out
        assert "no Drive mirror (media_refs)" in out
        assert "Add the Drive copy of this video to media_refs in meta.yaml." in out
        assert "local_whisper" not in out

    def test_burn_youtube_mirrors_failing_suggests_nothing_else(self, tmp_path, capsys):
        with pytest.raises(SystemExit):
            video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=FakeRun(), purpose="burn")
        out = capsys.readouterr().out
        assert "::error::Video download failed: no Drive mirror of this YouTube video could be downloaded." in out
        assert "local_whisper" not in out

    def test_whisper_is_the_default_purpose(self, tmp_path, capsys):
        with pytest.raises(SystemExit):
            video_media.download(vimeo_video(), tmp_path / "v.mp4", ci=True, run=FakeRun())
        out = capsys.readouterr().out
        assert "python -m tools.local_whisper --talk-id" in out
        assert "Rendering" not in out

    def test_unknown_purpose_is_refused(self, tmp_path):
        with pytest.raises(ValueError):
            video_media.download(vimeo_video(), tmp_path / "v.mp4", ci=True, run=FakeRun(), purpose="nope")


class TestMasking:
    def test_each_candidate_is_masked_before_it_is_tried(self, tmp_path, capsys, monkeypatch):
        monkeypatch.setenv("GITHUB_ACTIONS", "true")
        seen_before_call = []
        run = FakeRun(ok={GD2}, on_call=lambda argv: seen_before_call.append(capsys.readouterr().out))
        video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=run)
        assert f"::add-mask::{GD1}" in seen_before_call[0]
        assert f"::add-mask::{GD2}" in seen_before_call[1]
        assert f"::add-mask::{GD2}" not in seen_before_call[0]

    def test_the_bare_drive_id_is_masked_before_it_is_tried(self, tmp_path, capsys, monkeypatch):
        # yt-dlp logs "[GoogleDrive] <id>: Downloading ..."; Actions masks only
        # exact registered strings, so the URL's mask does not cover the id.
        monkeypatch.setenv("GITHUB_ACTIONS", "true")
        seen_before_call = []
        run = FakeRun(ok={GD2}, on_call=lambda argv: seen_before_call.append(capsys.readouterr().out))
        video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=run)
        assert f"::add-mask::{GD1_ID}\n" in seen_before_call[0]
        assert f"::add-mask::{GD2_ID}\n" in seen_before_call[1]

    def test_the_vimeo_id_and_hash_are_masked_before_the_try(self, tmp_path, capsys, monkeypatch):
        monkeypatch.setenv("GITHUB_ACTIONS", "true")
        seen_before_call = []
        run = FakeRun(ok={VIMEO_PLAYER}, on_call=lambda argv: seen_before_call.append(capsys.readouterr().out))
        video_media.download(vimeo_video(), tmp_path / "v.mp4", ci=True, run=run)
        for secret in ("111111111\n", "aaaaaaaaaa\n", "111111111/aaaaaaaaaa\n"):
            assert f"::add-mask::{secret}" in seen_before_call[0], secret

    def test_no_mask_commands_outside_actions(self, tmp_path, capsys, monkeypatch):
        monkeypatch.delenv("GITHUB_ACTIONS", raising=False)
        video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=FakeRun(ok={GD1}))
        assert "::add-mask::" not in capsys.readouterr().out

    def test_nothing_printed_carries_a_plaintext_id(self, tmp_path, capsys, monkeypatch):
        monkeypatch.setenv("GITHUB_ACTIONS", "true")
        with pytest.raises(SystemExit):
            video_media.download(yt_video(), tmp_path / "v.mp4", ci=True, run=FakeRun())
        lines = [ln for ln in capsys.readouterr().out.splitlines() if not ln.startswith("::add-mask::")]
        for secret in (YT_ID, GD1_ID, GD2_ID):
            assert not any(secret in ln for ln in lines), secret


def make_talk(root: Path, videos) -> Path:
    talk = root / "talks" / TALK_ID
    talk.mkdir(parents=True)
    meta = {"title": "About Jesus Christ", "date": "1977-10-31", "language": "en", "videos": videos}
    (talk / "meta.yaml").write_text(yaml.safe_dump(meta), encoding="utf-8")
    return talk


def cli(command, root, *extra, talk_id=TALK_ID, slug="Main"):
    video_media.main([command, "--root", str(root), "--talk-id", talk_id, "--video-slug", slug, *extra])


class TestCli:
    def test_download_reads_the_video_from_meta(self, tmp_path, monkeypatch):
        make_talk(tmp_path, [yt_video()])
        run = FakeRun(ok={GD1})
        monkeypatch.setattr(video_media.subprocess, "run", run)
        out = tmp_path / "v.mp4"
        cli("download", tmp_path, "--out", str(out), "--ci")
        assert run.urls() == [GD1]
        assert out.read_bytes() == b"video"

    def test_without_ci_youtube_is_reached(self, tmp_path, monkeypatch):
        make_talk(tmp_path, [yt_video(mirrors=())])
        run = FakeRun(ok={YT})
        monkeypatch.setattr(video_media.subprocess, "run", run)
        cli("download", tmp_path, "--out", str(tmp_path / "v.mp4"))
        assert run.urls() == [YT]

    def test_failure_message_names_this_talk(self, tmp_path, monkeypatch, capsys):
        make_talk(tmp_path, [vimeo_video()])
        monkeypatch.setattr(video_media.subprocess, "run", FakeRun())
        with pytest.raises(SystemExit):
            cli("download", tmp_path, "--out", str(tmp_path / "v.mp4"), "--ci")
        assert f"--talk-id {TALK_ID} --video-slug Main" in capsys.readouterr().out

    def test_meta_is_schema_validated(self, tmp_path, monkeypatch, capsys):
        bad = vimeo_video()
        bad["media_refs"] = [encode_video_ref(GD1)]
        make_talk(tmp_path, [bad])
        run = FakeRun(ok={VIMEO_PLAYER, GD1})
        monkeypatch.setattr(video_media.subprocess, "run", run)
        with pytest.raises(SystemExit) as exc:
            cli("download", tmp_path, "--out", str(tmp_path / "v.mp4"), "--ci")
        assert exc.value.code == 1
        assert run.calls == []
        assert "::error::" in capsys.readouterr().out

    def test_unknown_video_slug_is_an_error(self, tmp_path, monkeypatch, capsys):
        make_talk(tmp_path, [vimeo_video()])
        monkeypatch.setattr(video_media.subprocess, "run", FakeRun())
        with pytest.raises(SystemExit) as exc:
            cli("download", tmp_path, "--out", str(tmp_path / "v.mp4"), slug="Other")
        assert exc.value.code == 1
        assert "Other" in capsys.readouterr().out

    def test_invalid_talk_id_is_refused_before_any_path_is_built(self, tmp_path, capsys):
        with pytest.raises(SystemExit) as exc:
            cli("download", tmp_path, "--out", str(tmp_path / "v.mp4"), talk_id="../etc")
        assert exc.value.code == 1

    def test_check_passes_for_a_downloadable_video_without_downloading(self, tmp_path, monkeypatch):
        make_talk(tmp_path, [yt_video()])
        monkeypatch.setattr(video_media.subprocess, "run", lambda *a, **k: pytest.fail("check must not download"))
        cli("check", tmp_path, "--ci")

    def test_check_fails_for_youtube_without_mirrors_in_ci(self, tmp_path, capsys):
        make_talk(tmp_path, [yt_video(mirrors=())])
        with pytest.raises(SystemExit) as exc:
            cli("check", tmp_path, "--ci")
        assert exc.value.code == 1
        assert "media_refs" in capsys.readouterr().out

    def test_check_fails_for_a_video_without_a_link(self, tmp_path, capsys):
        make_talk(tmp_path, [{"slug": "Main", "title": "Main"}])
        with pytest.raises(SystemExit) as exc:
            cli("check", tmp_path, "--ci")
        assert exc.value.code == 1
        assert "::error::" in capsys.readouterr().out

    def test_check_for_burn_names_no_whisper_fallback(self, tmp_path, capsys):
        make_talk(tmp_path, [yt_video(mirrors=())])
        with pytest.raises(SystemExit):
            cli("check", tmp_path, "--ci", "--purpose", "burn")
        out = capsys.readouterr().out
        assert "Add the Drive copy of this video to media_refs in meta.yaml." in out
        assert "local_whisper" not in out

    def test_download_for_burn_names_no_whisper_fallback(self, tmp_path, monkeypatch, capsys):
        make_talk(tmp_path, [vimeo_video()])
        monkeypatch.setattr(video_media.subprocess, "run", FakeRun())
        with pytest.raises(SystemExit):
            cli("download", tmp_path, "--out", str(tmp_path / "v.mp4"), "--ci", "--purpose", "burn")
        out = capsys.readouterr().out
        assert "Rendering this video needs a machine on a normal connection." in out
        assert "local_whisper" not in out
