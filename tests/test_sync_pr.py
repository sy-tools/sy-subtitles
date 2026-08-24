"""Integration tests for tools.sync_pr driver.

These tests build a real git repo in tmp_path, make a commit representing
the base SHA, then edit files to represent the PR, and invoke sync_pr.run
to exercise the full two-pass flow including per-video effective-old
baseline computation.
"""

import subprocess
from pathlib import Path

import pytest

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
  - slug: Video2
    title: Video Two
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
