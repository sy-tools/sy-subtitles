"""Tests for tools/render_gate.py — ffmpeg's progress turned into step completions.

The parsing layer is pure and is tested without touching the filesystem or
sleeping; the waiting layer takes an injected clock and sleep so a ten-minute
stall window costs no wall-clock time here.
"""

import pytest

from tools import render_gate

SAMPLE = "frame=100\nout_time_us=4000000\nprogress=continue\nframe=200\nout_time_us=8000000\nprogress=continue\n"


def _fake_clock(step=1.0):
    """A monotonically increasing clock, `step` seconds per call."""
    state = {"t": 0.0}

    def now():
        state["t"] += step
        return state["t"]

    return now


class TestParseOutTimeUs:
    def test_last_out_time_wins(self):
        assert render_gate.parse_out_time_us(SAMPLE) == 8000000

    def test_partial_trailing_block_is_ignored(self):
        assert render_gate.parse_out_time_us(SAMPLE + "frame=300\nout_tim") == 8000000

    def test_out_time_ms_is_never_read(self):
        """ffmpeg writes microseconds into out_time_ms; reading it would be 1000x wrong."""
        assert render_gate.parse_out_time_us("out_time_ms=9000000\n") is None

    def test_no_samples_yet(self):
        assert render_gate.parse_out_time_us("") is None
        assert render_gate.parse_out_time_us("frame=1\n") is None

    def test_out_time_us_may_be_na_before_the_first_frame(self):
        """ffmpeg emits N/A until it has decoded something."""
        assert render_gate.parse_out_time_us("out_time_us=N/A\nprogress=continue\n") is None

    def test_an_na_after_a_real_sample_does_not_erase_it(self):
        # The last *parseable* value wins, not the last line: a gate that fell
        # back to "no progress" here would restart its stall timer for nothing.
        assert render_gate.parse_out_time_us(SAMPLE + "out_time_us=N/A\n") == 8000000

    def test_a_truncated_value_on_a_complete_line_is_not_half_read(self):
        # A poll can land after the newline but the value must still parse as a
        # whole number or be discarded — never silently truncated.
        assert render_gate.parse_out_time_us("out_time_us=12abc\n") is None


class TestIsFinished:
    def test_finished_marker(self):
        assert render_gate.is_finished("out_time_us=1\nprogress=end\n") is True
        assert render_gate.is_finished(SAMPLE) is False

    def test_a_partial_end_marker_does_not_count(self):
        # "progress=en" is what a mid-write poll can see; treating it as the end
        # would release every remaining gate at once.
        assert render_gate.is_finished(SAMPLE + "progress=en") is False


class TestProgressFraction:
    def test_fraction_is_clamped_to_one(self):
        # Container duration is approximate; a stream can outrun it slightly.
        assert render_gate.progress_fraction(SAMPLE, total_seconds=4.0) == 1.0

    def test_fraction_of_a_known_duration(self):
        assert render_gate.progress_fraction(SAMPLE, total_seconds=40.0) == 0.2

    def test_fraction_without_a_usable_duration_is_none(self):
        assert render_gate.progress_fraction(SAMPLE, total_seconds=0.0) is None

    def test_fraction_without_a_sample_is_none(self):
        assert render_gate.progress_fraction("", total_seconds=40.0) is None


class TestWaitFor:
    def _wait(self, threshold, reader, exit_reader, **kw):
        kw.setdefault("total_seconds", 10.0)
        return render_gate.wait_for(
            threshold, reader, exit_reader, now=kw.pop("now", _fake_clock()), sleep=lambda s: None, **kw
        )

    def test_returns_reached_when_the_threshold_is_crossed(self):
        reads = iter(["", "out_time_us=1000000\nprogress=continue\n", "out_time_us=6000000\nprogress=continue\n"])
        out = self._wait(0.5, lambda: next(reads), lambda: None)
        assert out.status == "reached"

    def test_a_finished_render_releases_every_remaining_gate(self):
        """The encode can outrun the poller; a gate must not hang after progress=end."""
        out = self._wait(0.9, lambda: "out_time_us=1000000\nprogress=end\n", lambda: None)
        assert out.status == "reached"

    def test_a_nonzero_exit_code_fails_the_gate_immediately(self):
        out = self._wait(0.5, lambda: "", lambda: 1)
        assert out.status == "failed"
        assert out.exit_code == 1

    def test_a_zero_exit_code_releases_the_gate(self):
        """The render finished before this gate's threshold was ever observed."""
        out = self._wait(0.9, lambda: "", lambda: 0)
        assert out.status == "reached"

    def test_no_progress_for_the_stall_window_is_a_stall_not_a_hang(self):
        out = self._wait(
            0.5,
            lambda: "out_time_us=1000000\nprogress=continue\n",
            lambda: None,
            now=_fake_clock(step=60.0),
            stall_seconds=300.0,
        )
        assert out.status == "stalled"

    def test_the_stall_timer_resets_when_progress_advances(self):
        ticks = iter([f"out_time_us={n}000000\nprogress=continue\n" for n in range(1, 60)])
        out = self._wait(
            0.5,
            lambda: next(ticks),
            lambda: None,
            now=_fake_clock(step=60.0),
            stall_seconds=300.0,
        )
        assert out.status == "reached"

    def test_a_threshold_of_zero_waits_for_the_first_real_sample(self):
        # "Start render" uses --percent 0 purely to prove the progress file
        # exists; an empty file must NOT satisfy it, or the first gate would
        # then read a file ffmpeg has not created yet.
        reads = iter(["", "", "out_time_us=1\nprogress=continue\n"])
        out = self._wait(0.0, lambda: next(reads), lambda: None)
        assert out.status == "reached"

    def test_await_mode_waits_for_the_exit_code_not_for_progress_end(self):
        # ffmpeg writes progress=end before it has finished muxing (+faststart
        # rewrites the moov atom afterwards), so "Finish render" must adopt the
        # process's real exit code, not the encoder's last progress line.
        codes = iter([None, None, 0])
        out = self._wait(None, lambda: "out_time_us=9000000\nprogress=end\n", lambda: next(codes))
        assert out.status == "reached"
        assert out.exit_code == 0

    def test_await_mode_propagates_a_failure(self):
        out = self._wait(None, lambda: "", lambda: 137)
        assert out.status == "failed"
        assert out.exit_code == 137

    def test_await_mode_outlasts_a_silence_that_would_stall_a_gate(self):
        """The +faststart rewrite emits no progress AT ALL, by construction.

        ffmpeg writes progress=end before the muxer starts moving the moov
        atom, and that rewrite scales with output size. Policing the
        progress-driven stall window across it fails a job whose render
        succeeded, so --await-exit must not consult it: its terminating
        condition is the exit code, and the job's timeout-minutes is the
        correct outer bound for a phase that is legitimately silent.
        """
        codes = iter([None] * 40 + [0])
        out = self._wait(
            None,
            lambda: "out_time_us=9000000\nprogress=end\n",
            lambda: next(codes),
            now=_fake_clock(step=60.0),
            stall_seconds=300.0,
        )
        assert out.status == "reached"
        assert out.exit_code == 0

    def test_a_threshold_gate_still_stalls_on_the_same_silence(self):
        """The exemption is for --await-exit only — a wedged encode must still fail.

        Same reader, same clock, same window as the test above; only the
        threshold differs. Exempting every wait would be a gate that never
        gives up.
        """
        out = self._wait(
            0.99,
            lambda: "out_time_us=9000000\nprogress=continue\n",
            lambda: None,
            now=_fake_clock(step=60.0),
            stall_seconds=300.0,
        )
        assert out.status == "stalled"


class TestCli:
    def _files(self, tmp_path, progress="", duration="10.0", exit_code=None, log=""):
        (tmp_path / "progress.txt").write_text(progress, encoding="utf-8")
        if duration is not None:
            (tmp_path / "duration_s.txt").write_text(duration, encoding="utf-8")
        if exit_code is not None:
            (tmp_path / "exit_code").write_text(str(exit_code), encoding="utf-8")
        (tmp_path / "render.log").write_text(log, encoding="utf-8")
        return [
            "--progress-file",
            str(tmp_path / "progress.txt"),
            "--duration-file",
            str(tmp_path / "duration_s.txt"),
            "--exit-file",
            str(tmp_path / "exit_code"),
            "--log-file",
            str(tmp_path / "render.log"),
        ]

    def test_percent_zero_returns_once_a_sample_exists(self, tmp_path, monkeypatch):
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, progress="out_time_us=1\nprogress=continue\n")
        assert render_gate.main(argv + ["--percent", "0"]) == 0

    def test_a_crossed_threshold_exits_zero(self, tmp_path, monkeypatch):
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, progress="out_time_us=6000000\nprogress=continue\n")
        assert render_gate.main(argv + ["--percent", "50"]) == 0

    def test_await_exit_propagates_a_non_zero_exit_code(self, tmp_path, monkeypatch):
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, exit_code=1, log="ffmpeg exploded")
        assert render_gate.main(argv + ["--await-exit"]) == 1

    def test_a_failure_prints_the_render_log(self, tmp_path, monkeypatch, capsys):
        # The job's own log blob is unavailable from the API until the job
        # finalises, so an unlogged failure is invisible until the very end.
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, exit_code=1, log="x264 [error]: malloc failed")
        render_gate.main(argv + ["--await-exit"])
        assert "malloc failed" in capsys.readouterr().out

    def test_a_missing_duration_file_fails_loudly(self, tmp_path, monkeypatch, capsys):
        # A gate that always opens is a gate that lies: without a duration there
        # is no percentage, so this must never degrade into "release everything".
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, duration=None)
        with pytest.raises(SystemExit) as excinfo:
            render_gate.main(argv + ["--percent", "10"])
        assert excinfo.value.code != 0
        assert "duration" in (capsys.readouterr().err + str(excinfo.value)).lower()

    def test_an_unparseable_duration_fails_loudly(self, tmp_path, monkeypatch):
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, duration="N/A\n")
        with pytest.raises(SystemExit) as excinfo:
            render_gate.main(argv + ["--percent", "10"])
        assert excinfo.value.code != 0

    def test_a_stall_exits_non_zero(self, tmp_path, monkeypatch):
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, progress="out_time_us=1000000\nprogress=continue\n")
        code = render_gate.main(argv + ["--percent", "90", "--stall-seconds", "0", "--poll-seconds", "0"])
        assert code != 0

    def test_await_exit_waits_out_a_silent_faststart_rewrite(self, tmp_path, monkeypatch):
        # End to end through the CLI: the progress file already says
        # progress=end and never changes again, and --stall-seconds 0 would trip
        # on the first comparison if --await-exit still policed that window.
        argv = self._files(tmp_path, progress="out_time_us=10000000\nprogress=end\n")
        polls = {"n": 0}

        def sleep(_seconds):
            polls["n"] += 1
            if polls["n"] == 3:
                (tmp_path / "exit_code").write_text("0", encoding="utf-8")

        monkeypatch.setattr(render_gate.time, "sleep", sleep)
        code = render_gate.main(argv + ["--await-exit", "--stall-seconds", "0", "--poll-seconds", "0"])
        assert code == 0
        assert polls["n"] >= 3, "it must actually have waited, not returned on the first poll"

    def test_an_absent_progress_file_is_not_an_error_yet(self, tmp_path, monkeypatch):
        # The launcher and the first gate race: ffmpeg may not have created the
        # file when the gate's first poll lands. That is "wait", not "fail".
        monkeypatch.setattr(render_gate.time, "sleep", lambda s: None)
        argv = self._files(tmp_path, exit_code=0)
        (tmp_path / "progress.txt").unlink()
        assert render_gate.main(argv + ["--percent", "50"]) == 0
