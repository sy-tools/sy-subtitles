"""The sync plan must be computed in full before anything is written.

A failure anywhere means the working tree is byte-identical to what it was
before the run: the workflow then has nothing to commit, so a red check can
never coexist with a partial push.
"""

import pytest

from tools.sync_plan import SyncPlan, apply_plan, collect_writes, shadow_talk


def test_a_plan_with_failures_is_not_ok():
    plan = SyncPlan(writes={"talks/t/transcript_uk.txt": "new"}, failures=["Video2: cannot align"])
    assert plan.ok is False


def test_an_empty_plan_is_ok():
    assert SyncPlan(writes={}, failures=[]).ok is True


def test_apply_plan_writes_every_entry(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    target = tmp_path / "talks/t/transcript_uk.txt"
    target.parent.mkdir(parents=True)
    target.write_text("old", encoding="utf-8")

    written = apply_plan(SyncPlan(writes={"talks/t/transcript_uk.txt": "new"}, failures=[]))

    assert target.read_text(encoding="utf-8") == "new"
    assert written == ["talks/t/transcript_uk.txt"]


def test_apply_plan_refuses_a_plan_that_failed(tmp_path, monkeypatch):
    """The whole point of the plan is that a failure writes nothing. A caller
    that forgets to check `ok` must not be able to write through it."""
    monkeypatch.chdir(tmp_path)
    target = tmp_path / "talks/t/transcript_uk.txt"
    target.parent.mkdir(parents=True)
    target.write_text("old", encoding="utf-8")

    plan = SyncPlan(writes={"talks/t/transcript_uk.txt": "new"}, failures=["Video2: cannot align"])
    with pytest.raises(RuntimeError, match="refusing to apply"):
        apply_plan(plan)

    assert target.read_text(encoding="utf-8") == "old"


@pytest.fixture
def talk(tmp_path, monkeypatch):
    """A talk laid out like the repo's, including the rendered video that
    lives in final/ next to the SRT (up to ~1 GB in the real corpus)."""
    monkeypatch.chdir(tmp_path)
    talk_dir = tmp_path / "talks" / "1990-01-01_Some-Talk"
    (talk_dir / "Video1" / "final").mkdir(parents=True)
    (talk_dir / "Video1" / "source").mkdir()
    (talk_dir / "meta.yaml").write_text("videos:\n  - slug: Video1\n", encoding="utf-8")
    (talk_dir / "transcript_uk.txt").write_text("Абзац.\n", encoding="utf-8")
    (talk_dir / "transcript_en.txt").write_text("Paragraph.\n", encoding="utf-8")
    (talk_dir / "Video1" / "final" / "uk.srt").write_text("1\n", encoding="utf-8")
    (talk_dir / "Video1" / "final" / "build_manifest.yaml").write_text("role: primary\n", encoding="utf-8")
    (talk_dir / "Video1" / "final" / "talk.mp4").write_bytes(b"\x00\x01\x02not text")
    (talk_dir / "Video1" / "source" / "en.srt").write_text("1\n", encoding="utf-8")
    return talk_dir


def test_shadow_copies_what_the_sync_reads_and_writes(talk):
    shadow = shadow_talk("talks/1990-01-01_Some-Talk", talk.parent.parent / "tmp")

    assert (shadow / "meta.yaml").is_file()
    assert (shadow / "transcript_uk.txt").is_file()
    assert (shadow / "Video1" / "final" / "uk.srt").is_file()
    assert (shadow / "Video1" / "final" / "build_manifest.yaml").is_file()
    # validate_subtitles resolves the EN SRT relative to the UK SRT it is given
    # (srt.parent.parent/source/en.srt). Leaving it out of the shadow silently
    # drops compare_block_count, the last text guard on an en-srt primary.
    assert (shadow / "Video1" / "source" / "en.srt").is_file()


def test_shadow_leaves_the_rendered_video_behind(talk):
    """final/ holds the burned-in mp4 — copying a talk wholesale would move
    hundreds of megabytes per run, and collect_writes would then have to
    read it as text."""
    shadow = shadow_talk("talks/1990-01-01_Some-Talk", talk.parent.parent / "tmp")

    assert not (shadow / "Video1" / "final" / "talk.mp4").exists()


def test_collect_writes_reports_only_what_the_shadow_changed(talk):
    talk_dir = "talks/1990-01-01_Some-Talk"
    shadow = shadow_talk(talk_dir, talk.parent.parent / "tmp")
    (shadow / "transcript_uk.txt").write_text("Змінений абзац.\n", encoding="utf-8")

    writes = collect_writes(shadow, talk_dir)

    assert writes == {f"{talk_dir}/transcript_uk.txt": "Змінений абзац.\n"}
