"""Integration tests for tools.sync_pr driver.

These tests build a real git repo in tmp_path, make a commit representing
the base SHA, then edit files to represent the PR, and invoke sync_pr.run
to exercise the full two-pass flow including per-video effective-old
baseline computation.
"""

import subprocess
from pathlib import Path

import pytest

from tools.srt_utils import parse_srt
from tools.sync_common import load_base_from_git
from tools.sync_pr import BOT_AUTHOR, SYNC_TRAILER, _classify, _list_changed, resolve_baseline, run

HEADER = "Мова промови: англійська | Транскрипт (українська)"

BASE_SRT = """1
00:00:01,000 --> 00:00:03,000
Перше речення першого абзацу.

2
00:00:03,100 --> 00:00:05,000
Друге речення першого абзацу.

3
00:00:05,100 --> 00:00:07,000
Єдине речення другого абзацу.
"""

BASE_TRANSCRIPT = (
    HEADER + "\n\nПерше речення першого абзацу. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
)


META_TWO_VIDEOS = """videos:
  - slug: Video1
    title: Video One
    sync: primary
  - slug: Video2
    title: Video Two
    sync: derived
"""


def _git(cwd: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=True)
    return result.stdout


@pytest.fixture
def repo(tmp_path, monkeypatch):
    """Build a real git repo at tmp_path/repo with a base commit containing
    a two-video talk (Video1 + Video2), identical base transcript and SRTs.
    Returns (repo_path, base_sha). cd's the process into the repo so
    sync_pr's internal `git` calls work."""
    repo_path = tmp_path / "repo"
    repo_path.mkdir()
    talk = repo_path / "talks" / "test"
    (talk / "Video1" / "final").mkdir(parents=True)
    (talk / "Video2" / "final").mkdir(parents=True)
    (talk / "meta.yaml").write_text(META_TWO_VIDEOS, encoding="utf-8")
    (talk / "Video1" / "final" / "uk.srt").write_text(BASE_SRT, encoding="utf-8")
    (talk / "Video2" / "final" / "uk.srt").write_text(BASE_SRT, encoding="utf-8")
    (talk / "transcript_uk.txt").write_text(BASE_TRANSCRIPT, encoding="utf-8")

    _git(repo_path, "init", "-q", "-b", "main")
    _git(repo_path, "config", "user.email", "test@example.com")
    _git(repo_path, "config", "user.name", "Test")
    # Explicitly disable GPG signing — the ambient user config may have it
    # enabled (1Password SSH/GPG agent) and tests must not depend on an
    # unlocked signer.
    _git(repo_path, "config", "commit.gpgsign", "false")
    _git(repo_path, "config", "tag.gpgsign", "false")
    _git(repo_path, "add", ".")
    _git(repo_path, "commit", "-q", "-m", "base")
    base_sha = _git(repo_path, "rev-parse", "HEAD").strip()

    monkeypatch.chdir(repo_path)
    return repo_path, base_sha


class TestClassify:
    def test_classifies_transcript_only(self):
        srt, trans = _classify(["talks/2001-01-01_Test/transcript_uk.txt"])
        assert srt == {}
        assert "talks/2001-01-01_Test" in trans

    def test_classifies_srt_only(self):
        srt, trans = _classify(["talks/2001-01-01_Test/Video1/final/uk.srt"])
        assert srt == {"talks/2001-01-01_Test": ["talks/2001-01-01_Test/Video1/final/uk.srt"]}
        assert trans == {}

    def test_classifies_mixed(self):
        srt, trans = _classify(
            [
                "talks/A/transcript_uk.txt",
                "talks/A/V1/final/uk.srt",
                "talks/B/V2/final/uk.srt",
                "README.md",
                "site/index.html",
            ]
        )
        assert trans == {"talks/A": True}
        assert srt == {
            "talks/A": ["talks/A/V1/final/uk.srt"],
            "talks/B": ["talks/B/V2/final/uk.srt"],
        }


class TestSyncPrIntegration:
    def test_transcript_only_pr_syncs_both_videos(self, repo):
        """A PR that only edits transcript_uk.txt should end up with both
        videos' SRTs updated via Step B (Step A does nothing)."""
        repo_path, base_sha = repo
        transcript = repo_path / "talks" / "test" / "transcript_uk.txt"
        transcript.write_text(
            BASE_TRANSCRIPT.replace("Єдине речення другого абзацу.", "Нове речення другого абзацу."),
            encoding="utf-8",
        )
        _git(repo_path, "add", "talks")
        _git(repo_path, "commit", "-q", "-m", "edit transcript")

        exit_code = run(base_sha)
        assert exit_code == 0

        for slug in ("Video1", "Video2"):
            srt = (repo_path / "talks" / "test" / slug / "final" / "uk.srt").read_text(encoding="utf-8")
            assert "Нове речення другого абзацу." in srt
            assert "Єдине речення другого абзацу." not in srt

    def test_srt_only_pr_propagates_to_other_video(self, repo):
        """Editing just Video1's SRT should propagate to Video2's SRT via
        Step A → transcript → Step B, which is the PR #43 original flow."""
        repo_path, base_sha = repo
        v1_srt = repo_path / "talks" / "test" / "Video1" / "final" / "uk.srt"
        v1_srt.write_text(
            BASE_SRT.replace("Перше речення першого абзацу.", "Виправлене перше речення."),
            encoding="utf-8",
        )
        _git(repo_path, "add", "talks")
        _git(repo_path, "commit", "-q", "-m", "edit v1 srt")

        exit_code = run(base_sha)
        assert exit_code == 0

        transcript = (repo_path / "talks" / "test" / "transcript_uk.txt").read_text(encoding="utf-8")
        assert "Виправлене перше речення." in transcript
        assert "Перше речення першого абзацу." not in transcript

        v2_srt = (repo_path / "talks" / "test" / "Video2" / "final" / "uk.srt").read_text(encoding="utf-8")
        assert "Виправлене перше речення." in v2_srt
        assert "Перше речення першого абзацу." not in v2_srt

    def test_mixed_srt_and_transcript_pr_applies_both_edits_everywhere(self, repo):
        """The workflow gap case: a PR edits BOTH Video1's SRT AND
        transcript_uk.txt directly. Expected end state:
        - transcript has both edits
        - Video1 SRT has both edits (its own SRT-level edit plus the
          direct transcript edit propagated by Step B)
        - Video2 SRT inherits both edits via Step B only

        This was the xfail case under the old bash workflow. With the
        per-video effective-old baseline in sync_pr, it passes."""
        repo_path, base_sha = repo
        talk = repo_path / "talks" / "test"
        v1_srt = talk / "Video1" / "final" / "uk.srt"
        v1_srt.write_text(
            BASE_SRT.replace("Перше речення першого абзацу.", "Виправлене перше речення."),
            encoding="utf-8",
        )
        transcript = talk / "transcript_uk.txt"
        transcript.write_text(
            BASE_TRANSCRIPT.replace("Єдине речення другого абзацу.", "Нове речення другого абзацу."),
            encoding="utf-8",
        )
        _git(repo_path, "add", "talks")
        _git(repo_path, "commit", "-q", "-m", "mixed edits")

        exit_code = run(base_sha)
        assert exit_code == 0

        transcript_after = transcript.read_text(encoding="utf-8")
        assert "Виправлене перше речення." in transcript_after
        assert "Нове речення другого абзацу." in transcript_after
        assert "Перше речення першого абзацу." not in transcript_after
        assert "Єдине речення другого абзацу." not in transcript_after

        v1_after = v1_srt.read_text(encoding="utf-8")
        assert "Виправлене перше речення." in v1_after
        assert "Нове речення другого абзацу." in v1_after
        assert "Перше речення першого абзацу." not in v1_after
        assert "Єдине речення другого абзацу." not in v1_after

        v2_after = (talk / "Video2" / "final" / "uk.srt").read_text(encoding="utf-8")
        assert "Виправлене перше речення." in v2_after
        assert "Нове речення другого абзацу." in v2_after
        assert "Перше речення першого абзацу." not in v2_after
        assert "Єдине речення другого абзацу." not in v2_after

    def test_deleted_srt_is_skipped_not_crashing_the_driver(self, repo):
        """A PR that deletes a final/uk.srt must not kill the whole driver
        with FileNotFoundError — the deleted SRT is skipped and the rest of
        the sync still runs."""
        repo_path, base_sha = repo
        talk = repo_path / "talks" / "test"
        _git(repo_path, "rm", "-q", "talks/test/Video1/final/uk.srt")
        transcript = talk / "transcript_uk.txt"
        transcript.write_text(
            BASE_TRANSCRIPT.replace("Єдине речення другого абзацу.", "Нове речення другого абзацу."),
            encoding="utf-8",
        )
        _git(repo_path, "add", "talks")
        _git(repo_path, "commit", "-q", "-m", "delete v1 srt + edit transcript")

        exit_code = run(base_sha)
        assert exit_code == 0

        assert not (talk / "Video1" / "final" / "uk.srt").exists()  # stays deleted
        v2_after = (talk / "Video2" / "final" / "uk.srt").read_text(encoding="utf-8")
        assert "Нове речення другого абзацу." in v2_after  # Step B still ran

    def test_no_changes_returns_zero(self, repo):
        """Nothing changed in the PR — driver should noop and exit 0."""
        repo_path, base_sha = repo
        # Make a noop commit so HEAD != base but no content differs
        (repo_path / "README.md").write_text("unrelated\n", encoding="utf-8")
        _git(repo_path, "add", "README.md")
        _git(repo_path, "commit", "-q", "-m", "unrelated")

        exit_code = run(base_sha)
        assert exit_code == 0

        transcript = (repo_path / "talks" / "test" / "transcript_uk.txt").read_text(encoding="utf-8")
        assert transcript == BASE_TRANSCRIPT

    def test_new_en_srt_mode_srt_validates_with_manifest_flags(self, repo):
        """A PR that ADDS a final/uk.srt built in en-srt mode (transcript
        already on main, e.g. from an earlier failed pipeline run) must be
        validated with the build_manifest.yaml mode flags: en-srt primaries
        legitimately drop transcript-only blocks (closing signatures), so
        text preservation is replaced by a block-count sanity vs
        source/en.srt — exactly like the pipeline and golden tests do.
        Reproduces the 1982-08-06 salvage PR failing the sync check."""
        repo_path, _ = repo
        talk = repo_path / "talks" / "ensrt"
        (talk / "Video1" / "final").mkdir(parents=True)
        (talk / "Video1" / "source").mkdir(parents=True)
        (talk / "meta.yaml").write_text("videos:\n  - slug: Video1\n    title: V\n", encoding="utf-8")
        # Transcript carries a closing signature paragraph that the en-srt
        # build drops (no EN counterpart).
        (talk / "transcript_uk.txt").write_text(BASE_TRANSCRIPT + "\nВічно люблячa вас Мати.\n", encoding="utf-8")
        _git(repo_path, "add", "talks")
        _git(repo_path, "commit", "-q", "-m", "ensrt talk: transcript only")
        base_sha = _git(repo_path, "rev-parse", "HEAD").strip()

        # PR: pipeline-built artifacts — SRT without the signature block,
        # the EN SRT timing source, and the manifest recording the mode.
        (talk / "Video1" / "final" / "uk.srt").write_text(BASE_SRT, encoding="utf-8")
        (talk / "Video1" / "source" / "en.srt").write_text(BASE_SRT, encoding="utf-8")
        (talk / "Video1" / "final" / "build_manifest.yaml").write_text(
            "role: primary\nmode: en-srt\n", encoding="utf-8"
        )
        _git(repo_path, "add", "talks")
        _git(repo_path, "commit", "-q", "-m", "add built uk.srt (en-srt mode)")

        exit_code = run(base_sha)
        assert exit_code == 0

        # Untouched by sync — the SRT is already final.
        srt_after = (talk / "Video1" / "final" / "uk.srt").read_text(encoding="utf-8")
        assert srt_after == BASE_SRT

    def test_a_failure_on_one_video_leaves_the_whole_talk_untouched(self, repo):
        """Video2's SRT is mangled so its sync cannot succeed.

        The transcript edit that Video1 would have produced must NOT land:
        a red check and a partial push together are what put main into a
        split state where a talk's subtitles and transcript disagree.
        """
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        v2.write_text("garbage that is not an SRT at all\n", encoding="utf-8")
        v1 = repo_path / "talks/test/Video1/final/uk.srt"
        v1.write_text(
            v1.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"),
            encoding="utf-8",
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit Video1, break Video2")

        transcript = repo_path / "talks/test/transcript_uk.txt"
        before = transcript.read_text(encoding="utf-8")

        exit_code = run()

        assert exit_code == 1, "a broken video must fail the run"
        assert transcript.read_text(encoding="utf-8") == before, "nothing may be written when any target fails"

    def test_a_second_run_after_the_bot_commit_is_a_no_op(self, repo):
        """The whole point of the redesign, end to end.

        A PR gets one human edit, the bot syncs and commits. The next
        event on that PR must find nothing left to do — diffing from the
        PR base instead would re-apply the bot's own work against a
        transcript that already contains it, which is why no run has ever
        been green twice.
        """
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        v1 = repo_path / "talks/test/Video1/final/uk.srt"
        v1.write_text(
            v1.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"),
            encoding="utf-8",
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "human edits Video1")

        assert run() == 0
        transcript = repo_path / "talks/test/transcript_uk.txt"
        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        assert "Змінене речення" in transcript.read_text(encoding="utf-8")
        assert "Змінене речення" in v2.read_text(encoding="utf-8")

        _git(repo_path, "add", "-A")
        _commit(
            repo_path,
            f"Sync subtitles and transcript edits [skip ci]\n\n{SYNC_TRAILER}",
            author=BOT_AUTHOR,
        )
        after_bot = {path: path.read_text(encoding="utf-8") for path in (transcript, v1, v2)}

        assert run() == 0, "the follow-up run must not fail"
        for path, content in after_bot.items():
            assert path.read_text(encoding="utf-8") == content, (
                f"{path.name} was rewritten by a run that had nothing to do"
            )


def _commit(repo_path: Path, message: str, *, author: str | None = None) -> str:
    """Commit whatever is staged (allowing empty) and return the new SHA."""
    env = ["-c", f"user.name={author}"] if author else []
    _git(repo_path, *env, "commit", "-q", "--allow-empty", "-m", message)
    return _git(repo_path, "rev-parse", "HEAD").strip()


class TestBaselineResolution:
    """What the sync diffs against.

    Anchoring on the PR base replays every edit the bot already applied,
    so no run can be green twice; anchoring on a non-ancestor tip reports
    files that moved on main as reversed changes.
    """

    def test_a_git_failure_is_not_reported_as_no_changes(self, repo):
        """A tool that cannot determine what changed must never claim nothing did.

        Returning an empty list on a failed `git diff` makes the run exit 0
        with a green check while every human edit in the PR goes unsynced.
        """
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        with pytest.raises(subprocess.CalledProcessError):
            _list_changed("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef")

    def test_an_unreadable_baseline_is_not_reported_as_a_new_file(self, repo, tmp_path):
        """A baseline git cannot read must not read as "the file is new".

        _plan_talk takes False from load_base_from_git to mean the transcript
        was added in this PR and skips the talk. A baseline that does not
        resolve then yields an empty plan, exit 0 and a green check with not
        one edit synced — the same failure-looks-like-success shape as a
        swallowed `git diff`. Only a path genuinely absent at a resolvable
        commit may answer False.
        """
        _repo_path, base_sha = repo
        dest = tmp_path / "out.txt"

        with pytest.raises(RuntimeError):
            load_base_from_git("deadbeefdeadbeefdeadbeefdeadbeefdeadbeef", "talks/test/transcript_uk.txt", dest)

        assert load_base_from_git(base_sha, "talks/test/never-existed.txt", dest) is False
        assert load_base_from_git(base_sha, "talks/test/transcript_uk.txt", dest) is True

    def test_baseline_is_the_last_bot_sync_commit(self, repo):
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        human = _commit(repo_path, "human edit")
        bot = _commit(
            repo_path,
            f"Sync subtitles and transcript edits [skip ci]\n\n{SYNC_TRAILER}",
            author=BOT_AUTHOR,
        )
        _commit(repo_path, "another human edit")

        assert resolve_baseline(remote_main="origin/main") == bot
        assert resolve_baseline(remote_main="origin/main") != human

    def test_baseline_falls_back_to_merge_base_not_branch_tip(self, repo):
        """With no bot commit, the baseline is where the branch diverged.

        Never the tip of main: main moves on independently, and a two-dot
        diff against a non-ancestor reports everything that moved there as
        a reversed change, which the sync would dutifully un-edit (R5).
        """
        repo_path, _base_sha = repo
        fork_point = _git(repo_path, "rev-parse", "HEAD").strip()
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        _commit(repo_path, "work on the PR branch")

        # main moves on independently of this branch.
        _git(repo_path, "checkout", "-q", "origin/main")
        _commit(repo_path, "unrelated change on main")
        _git(repo_path, "checkout", "-q", "-")

        assert resolve_baseline(remote_main="origin/main") == fork_point

    def test_baseline_ignores_a_bot_commit_merged_in_from_main(self, repo):
        """A merge drags in other PRs' bot commits.

        They sit off this branch's first-parent spine and their trees
        belong to another history, so diffing from one would replay every
        edit this branch has already applied. Here `origin/main` is stale
        at the fork point, which puts the foreign commit inside the
        revision range — only the --first-parent walk keeps it out.
        """
        repo_path, _base_sha = repo
        fork_point = _git(repo_path, "rev-parse", "HEAD").strip()
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        _git(repo_path, "checkout", "-q", "-b", "other-pr", fork_point)
        foreign_bot = _commit(
            repo_path,
            f"Sync subtitles and transcript edits [skip ci]\n\n{SYNC_TRAILER}",
            author=BOT_AUTHOR,
        )
        _git(repo_path, "checkout", "-q", "main")
        _git(repo_path, "merge", "-q", "--no-ff", "-m", "Merge branch 'other-pr'", "other-pr")

        resolved = resolve_baseline(remote_main="origin/main")
        assert resolved != foreign_bot
        assert resolved == fork_point

    def test_baseline_ignores_a_trailer_from_a_human_author(self, repo):
        """The trailer alone is text anyone can type; the author must match."""
        repo_path, _base_sha = repo
        fork_point = _git(repo_path, "rev-parse", "HEAD").strip()
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        _commit(repo_path, f"looks official\n\n{SYNC_TRAILER}", author="Some Human")

        assert resolve_baseline(remote_main="origin/main") == fork_point

    def test_list_changed_ignores_paths_outside_the_sync_scope(self, repo):
        """Anything that is not a transcript or a final SRT is noise."""
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        (repo_path / "README.md").write_text("noise\n", encoding="utf-8")
        srt = repo_path / "talks/test/Video1/final/uk.srt"
        srt.write_text(srt.read_text(encoding="utf-8").replace("Перше", "Змінене"), encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit a subtitle and a readme")

        changed = _list_changed(resolve_baseline(remote_main="origin/main"))
        assert "talks/test/Video1/final/uk.srt" in changed
        assert "README.md" not in changed


class TestRoleAwareSync:
    """Which video is written, and from what."""

    def test_an_ignored_videos_srt_edit_never_reaches_the_transcript(self, repo):
        """`ignored` means never read as well as never written.

        Only the write direction was covered. Without the read guard, text
        from a video explicitly marked out of the sync flows into the
        transcript and from there into the primary and every derived video —
        exactly what the role exists to prevent.
        """
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        meta = repo_path / "talks/test/meta.yaml"
        meta.write_text(meta.read_text(encoding="utf-8").replace("sync: derived", "sync: ignored"), encoding="utf-8")
        transcript = repo_path / "talks/test/transcript_uk.txt"
        v1 = repo_path / "talks/test/Video1/final/uk.srt"
        before_transcript = transcript.read_text(encoding="utf-8")
        before_v1 = v1.read_text(encoding="utf-8")

        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        v2.write_text(
            v2.read_text(encoding="utf-8").replace("Перше речення", "Сміття з ігнорованого"), encoding="utf-8"
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit an ignored video's subtitles")

        assert run() == 0
        assert transcript.read_text(encoding="utf-8") == before_transcript, (
            "an ignored video must not feed the transcript"
        )
        assert v1.read_text(encoding="utf-8") == before_v1

    def test_a_derived_cut_that_cannot_receive_an_edit_fails_loudly(self, repo):
        """A cut whose boundaries were never the transcript's.

        Two of the primary's sentences share one cue here, so the edited block
        has no counterpart — yet its text is plainly still on the derived
        video. Skipping would drop a human's correction under a green check;
        placing it would be a guess. The run must go red and write nothing.
        """
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        v2.write_text(
            "1\n00:00:01,000 --> 00:00:05,000\n"
            "Перше речення першого абзацу. Друге речення першого абзацу.\n\n"
            "2\n00:00:05,100 --> 00:00:07,000\nЄдине речення другого абзацу.\n",
            encoding="utf-8",
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "give the derived video its own cut")
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        transcript = repo_path / "talks/test/transcript_uk.txt"
        transcript.write_text(
            transcript.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"), encoding="utf-8"
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit the transcript")

        before_v2 = v2.read_text(encoding="utf-8")
        before_transcript = transcript.read_text(encoding="utf-8")

        assert run() == 1
        assert v2.read_text(encoding="utf-8") == before_v2, "nothing may be written when an edit cannot be placed"
        assert transcript.read_text(encoding="utf-8") == before_transcript

    def test_an_edit_that_did_not_reach_a_derived_cut_is_annotated(self, repo, capsys):
        """A skip is legitimate — an excerpt cut lacks most of the primary —
        but a `derived` video is meant to mirror it.

        The count reached only a stderr line in a green run's log, which reads
        as "nothing to do" to anyone scanning the checks. It is the reviewer's
        one cue that a correction stopped at the primary, so it belongs in the
        run's annotations.
        """
        repo_path, _base_sha = repo
        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        # The derived cut is a strict excerpt: it carries the second paragraph
        # only, so the edit below has nowhere to land on it.
        v2.write_text(
            "1\n00:00:12,000 --> 00:00:18,000\nЄдине речення другого абзацу.\n",
            encoding="utf-8",
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "give the derived video an excerpt cut")
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        transcript = repo_path / "talks/test/transcript_uk.txt"
        transcript.write_text(
            transcript.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"), encoding="utf-8"
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit the transcript")

        assert run() == 0
        err = capsys.readouterr().err
        assert "::warning::" in err, "a correction that stopped at the primary must be annotated, not just logged"
        assert "Video2" in err

    def test_an_ignored_video_is_never_written(self, repo):
        repo_path, _base_sha = repo
        meta = repo_path / "talks/test/meta.yaml"
        meta.write_text(meta.read_text(encoding="utf-8").replace("sync: derived", "sync: ignored"), encoding="utf-8")
        transcript = repo_path / "talks/test/transcript_uk.txt"
        transcript.write_text(
            transcript.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"), encoding="utf-8"
        )
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        before = v2.read_text(encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit the transcript")

        assert run() == 0
        assert "Змінене речення" in (repo_path / "talks/test/Video1/final/uk.srt").read_text(encoding="utf-8")
        assert v2.read_text(encoding="utf-8") == before, "an ignored video must not be touched"

    def test_a_derived_video_takes_its_text_from_the_primary(self, repo):
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        transcript = repo_path / "talks/test/transcript_uk.txt"
        transcript.write_text(
            transcript.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"), encoding="utf-8"
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit the transcript")

        assert run() == 0
        v1 = repo_path / "talks/test/Video1/final/uk.srt"
        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        assert "Змінене речення" in v2.read_text(encoding="utf-8")
        assert [b["text"] for b in parse_srt(str(v1))] == [b["text"] for b in parse_srt(str(v2))]

    def test_an_undeclared_multi_video_talk_fails_instead_of_guessing(self, repo):
        repo_path, _base_sha = repo
        meta = repo_path / "talks/test/meta.yaml"
        meta.write_text(
            meta.read_text(encoding="utf-8").replace("    sync: primary\n", "").replace("    sync: derived\n", ""),
            encoding="utf-8",
        )
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        transcript = repo_path / "talks/test/transcript_uk.txt"
        before = transcript.read_text(encoding="utf-8")
        transcript.write_text(before.replace("Перше речення", "Змінене речення"), encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit the transcript with no roles declared")

        assert run() == 1
        assert "Змінене речення" not in (repo_path / "talks/test/Video1/final/uk.srt").read_text(encoding="utf-8")

    def test_a_plan_that_would_move_a_timecode_is_refused(self, repo, monkeypatch):
        """The gate is the last line of defence: even if propagation produced
        a retimed block, nothing may reach disk."""
        from tools import sync_pr as driver

        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        transcript = repo_path / "talks/test/transcript_uk.txt"
        transcript.write_text(
            transcript.read_text(encoding="utf-8").replace("Перше речення", "Змінене речення"), encoding="utf-8"
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit the transcript")

        real_plan = driver._plan_talk

        def retiming_plan(*args, **kwargs):
            plan = real_plan(*args, **kwargs)
            for path in list(plan.writes):
                if path.endswith("uk.srt"):
                    plan.writes[path] = plan.writes[path].replace("00:00:01,000", "00:00:02,500")
            return plan

        monkeypatch.setattr(driver, "_plan_talk", retiming_plan)
        v1 = repo_path / "talks/test/Video1/final/uk.srt"
        before = v1.read_text(encoding="utf-8")

        assert run() == 1
        assert v1.read_text(encoding="utf-8") == before


# A boundary fix: the same words, re-split between blocks 1 and 2. Block 3 is
# additionally edited, so the PR carries a re-cut AND a plain text edit — the
# mixed shape PR #1001 really had.
RECUT_SRT = """1
00:00:01,000 --> 00:00:03,000
Перше речення першого

2
00:00:03,100 --> 00:00:05,000
абзацу. Друге речення першого абзацу.

3
00:00:05,100 --> 00:00:07,000
Змінене речення другого абзацу.
"""


class TestARecutMadeOnADerivedVideoReachesThePrimary:
    """PR #1001: a reviewer nudged a word across a block boundary in the SPA.

    The transcript cannot carry a boundary, so the change had no route to the
    talk's other videos and stranded on the one being reviewed. The two cuts
    then disagreed — and a disagreement is not cosmetic: the next edit touching
    those blocks fails, because the primary's text no longer has a counterpart
    on the derived video.
    """

    def test_the_boundary_fix_and_the_text_edit_both_reach_the_primary(self, repo):
        repo_path, base_sha = repo
        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        v2.write_text(RECUT_SRT, encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "fix a block boundary and a wording on the derived video")

        assert run(base_sha) == 0

        v1_blocks = parse_srt(str(repo_path / "talks/test/Video1/final/uk.srt"))
        assert [b["text"] for b in v1_blocks] == [
            "Перше речення першого",
            "абзацу. Друге речення першого абзацу.",
            "Змінене речення другого абзацу.",
        ], "the primary must receive the new cut as well as the new wording"

        base_cues = [(b["start_ms"], b["end_ms"]) for b in parse_srt(str(repo_path / "talks/test/Video2/final/uk.srt"))]
        assert [(b["start_ms"], b["end_ms"]) for b in v1_blocks] == base_cues, "a re-cut moves words, never a cue"

    def test_the_transcript_keeps_the_words_the_recut_only_reshuffled(self, repo):
        """A boundary lives on the screen, not in the transcript. The re-cut
        must leave that paragraph byte-identical while the real edit lands."""
        repo_path, base_sha = repo
        (repo_path / "talks/test/Video2/final/uk.srt").write_text(RECUT_SRT, encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "fix a block boundary and a wording on the derived video")

        assert run(base_sha) == 0

        transcript = (repo_path / "talks/test/transcript_uk.txt").read_text(encoding="utf-8")
        assert "Перше речення першого абзацу. Друге речення першого абзацу." in transcript
        assert "Змінене речення другого абзацу." in transcript

    def test_a_later_edit_to_a_recut_block_no_longer_fails(self, repo):
        """The trap the stranding sets. Once both videos agree on the cut, an
        ordinary edit to one of those blocks propagates like any other."""
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        (repo_path / "talks/test/Video2/final/uk.srt").write_text(RECUT_SRT, encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "fix a block boundary on the derived video")
        assert run() == 0

        _git(repo_path, "add", "-A")
        _commit(repo_path, "Sync subtitles and transcript edits\n\n" + SYNC_TRAILER, author=BOT_AUTHOR)

        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        v2.write_text(v2.read_text(encoding="utf-8").replace("Перше речення", "Виправлене речення"), encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "edit a block that was re-cut earlier")

        assert run() == 0, "with the cuts in step, an edit inside them is ordinary work"
        v1_texts = [b["text"] for b in parse_srt(str(repo_path / "talks/test/Video1/final/uk.srt"))]
        assert v1_texts[0] == "Виправлене речення першого"

    def test_a_recut_the_primary_cannot_receive_stops_the_run(self, repo):
        """The primary is a separate translation of the same words here, so
        the alignment pairs nothing up. Guessing where the boundary belongs is
        exactly what must not happen."""
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        v1 = repo_path / "talks/test/Video1/final/uk.srt"
        v1.write_text(
            "1\n00:00:01,000 --> 00:00:03,000\nПраймері каже щось інше першого\n\n"
            "2\n00:00:03,100 --> 00:00:05,000\nабзацу. Праймері каже щось інше.\n\n"
            "3\n00:00:05,100 --> 00:00:07,000\nЄдине речення другого абзацу.\n",
            encoding="utf-8",
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "give the primary its own wording")
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        v2 = repo_path / "talks/test/Video2/final/uk.srt"
        v2.write_text(RECUT_SRT.replace("Змінене речення", "Єдине речення"), encoding="utf-8")
        _git(repo_path, "add", "-A")
        _commit(repo_path, "re-cut the derived video")

        before_v1 = v1.read_text(encoding="utf-8")
        assert run() == 1
        assert v1.read_text(encoding="utf-8") == before_v1, "nothing may be written when a re-cut cannot be placed"

    def test_a_recut_with_no_primary_srt_is_annotated_rather_than_silent(self, repo, capsys):
        """No primary subtitles means no shared cut family to keep in step.
        The re-cut stays on the one video — which the reviewer has to be told,
        because a green run otherwise reads as "it propagated"."""
        repo_path, _base_sha = repo
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")
        (repo_path / "talks/test/Video1/final/uk.srt").unlink()
        _git(repo_path, "add", "-A")
        _commit(repo_path, "the primary has no subtitles yet")
        _git(repo_path, "branch", "-f", "origin/main", "HEAD")

        (repo_path / "talks/test/Video2/final/uk.srt").write_text(
            RECUT_SRT.replace("Змінене речення", "Єдине речення"), encoding="utf-8"
        )
        _git(repo_path, "add", "-A")
        _commit(repo_path, "re-cut the derived video")

        assert run() == 0
        err = capsys.readouterr().err
        assert "::warning::" in err, "a re-cut that could not travel must be annotated, not just logged"
        assert "Video2" in err
