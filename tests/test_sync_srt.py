"""Tests for sync_srt_to_transcript.py."""

import pytest

from tools.sync_srt_to_transcript import main, sync_srt_to_transcript
from tools.sync_transcript_to_srt import sync_transcript

HEADER = "Мова промови: англійська | Транскрипт (українська)\n\n"


@pytest.fixture
def talk(tmp_path):
    """Talk with one video, an SRT and a transcript that match."""
    talk_dir = tmp_path / "talks" / "test"
    video = talk_dir / "Video" / "final"
    video.mkdir(parents=True)

    srt_old = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
    (video / "uk.srt").write_text(srt_old, encoding="utf-8")
    (talk_dir / "uk_old.srt").write_text(srt_old, encoding="utf-8")

    transcript = (
        HEADER + "Перше речення першого абзацу. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
    )
    (talk_dir / "transcript_uk.txt").write_text(transcript, encoding="utf-8")

    return talk_dir


class TestSyncSrtToTranscript:
    def test_no_changes_returns_zero(self, talk):
        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        assert result["changed"] == 0

    def test_single_block_edit_propagates(self, talk):
        new_srt_path = talk / "Video" / "final" / "uk.srt"
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Виправлене перше речення.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        new_srt_path.write_text(new_srt, encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(new_srt_path),
            transcript=str(talk / "transcript_uk.txt"),
        )
        assert result["changed"] == 1
        text = (talk / "transcript_uk.txt").read_text(encoding="utf-8")
        assert "Виправлене перше речення." in text
        assert "Перше речення першого абзацу." not in text
        # Other paragraphs untouched
        assert "Друге речення першого абзацу." in text
        assert "Єдине речення другого абзацу." in text

    def test_multiple_block_edits_propagate(self, talk):
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Виправлене перше.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Виправлений другий.
"""
        (talk / "Video" / "final" / "uk.srt").write_text(new_srt, encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        assert result["changed"] == 2
        text = (talk / "transcript_uk.txt").read_text(encoding="utf-8")
        assert "Виправлене перше." in text
        assert "Виправлений другий." in text
        assert "Перше речення першого абзацу." not in text
        assert "Єдине речення другого абзацу." not in text

    def test_block_inserted_fails(self, talk):
        """Inserting a brand-new block (no place to put text in transcript) is unsupported."""
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:10,500 --> 00:00:11,500
Новий вставлений блок.

4
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        (talk / "Video" / "final" / "uk.srt").write_text(new_srt, encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        assert "error" in result

    def test_block_split_without_text_change_is_not_an_insertion(self, talk):
        """Re-blocking is not editing: the same words in more blocks.

        The optimizer's merge guard leaves sentences that used to share one
        subtitle in separate blocks, so a rebuilt SRT legitimately has more
        blocks with byte-identical text. The transcript has nothing to learn
        from that and must be left alone — not rejected as an insertion.
        """
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:05,100 --> 00:00:07,000
Друге речення

3
00:00:07,100 --> 00:00:10,000
першого абзацу.

4
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        (talk / "Video" / "final" / "uk.srt").write_text(new_srt, encoding="utf-8")
        before = (talk / "transcript_uk.txt").read_text(encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )

        assert "error" not in result, result.get("error")
        assert result["changed"] == 0
        assert (talk / "transcript_uk.txt").read_text(encoding="utf-8") == before

    def test_deleted_placeholder_block_skipped_silently(self, tmp_path):
        """Deleting a block whose text is NOT in the transcript (e.g. a placeholder
        like '[Промова англійською]') should succeed without touching the transcript."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:00,000 --> 00:00:02,000
[Промова англійською]

2
00:00:03,000 --> 00:00:05,000
Перше справжнє речення.

3
00:00:05,100 --> 00:00:10,000
Друге речення.
"""
        new_srt = """2
00:00:03,000 --> 00:00:05,000
Перше справжнє речення.

3
00:00:05,100 --> 00:00:10,000
Друге речення.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")

        transcript = HEADER + "Перше справжнє речення. Друге речення.\n"
        (talk_dir / "transcript_uk.txt").write_text(transcript, encoding="utf-8")
        before = transcript

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result, f"unexpected error: {result.get('error')}"
        assert (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8") == before

    def test_deleted_block_present_in_transcript_is_removed(self, tmp_path):
        """If a deleted block's text IS in the transcript, it should be removed."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:01,000 --> 00:00:03,000
Перше речення.

2
00:00:03,100 --> 00:00:05,000
Зайве речення.

3
00:00:05,100 --> 00:00:08,000
Третє речення.
"""
        new_srt = """1
00:00:01,000 --> 00:00:03,000
Перше речення.

3
00:00:05,100 --> 00:00:08,000
Третє речення.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")

        transcript = HEADER + "Перше речення. Зайве речення. Третє речення.\n"
        (talk_dir / "transcript_uk.txt").write_text(transcript, encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result
        text = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")
        assert "Зайве речення." not in text
        assert "Перше речення." in text
        assert "Третє речення." in text

    def test_renumbers_new_srt_after_deletion(self, tmp_path):
        """When the user's SRT skipped renumbering after deleting blocks, the
        tool should normalize block indices to start at 1 and be sequential."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:00,000 --> 00:00:02,000
[Placeholder]

2
00:00:03,000 --> 00:00:05,000
Перше речення.

3
00:00:05,100 --> 00:00:08,000
Друге речення.
"""
        # User removed block 1 but did NOT renumber — block "2" is now first
        new_srt = """2
00:00:03,000 --> 00:00:05,000
Перше речення.

3
00:00:05,100 --> 00:00:08,000
Друге речення.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(HEADER + "Перше речення. Друге речення.\n", encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result

        from tools.srt_utils import parse_srt

        new_blocks = parse_srt(str(video / "uk.srt"))
        assert [b["idx"] for b in new_blocks] == [1, 2]
        # Texts and timecodes preserved
        assert new_blocks[0]["text"] == "Перше речення."
        assert new_blocks[0]["start_ms"] == 3000
        assert new_blocks[1]["text"] == "Друге речення."

    def test_mixed_edit_and_delete_preserves_cursor_ordering(self, tmp_path):
        """A single PR that both edits and deletes blocks: difflib emits
        `replace` and `delete` opcodes in sequence. The cursor walk must
        advance through each operation correctly so that following operations
        land on the right occurrence of their text."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:01,000 --> 00:00:03,000
Перше речення.

2
00:00:03,100 --> 00:00:05,000
Проміжне речення.

3
00:00:05,100 --> 00:00:07,000
Друге речення — потребує правки.

4
00:00:07,100 --> 00:00:09,000
Третє речення.
"""
        # Block 2 deleted (present in transcript, should be removed)
        # Block 3 edited (text change)
        # Blocks 1 and 4 unchanged
        new_srt = """1
00:00:01,000 --> 00:00:03,000
Перше речення.

3
00:00:05,100 --> 00:00:07,000
Друге речення — вже виправлене.

4
00:00:07,100 --> 00:00:09,000
Третє речення.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(
            HEADER + "Перше речення. Проміжне речення. Друге речення — потребує правки. Третє речення.\n",
            encoding="utf-8",
        )

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result, f"unexpected error: {result.get('error')}"
        assert result.get("removed", 0) >= 1
        assert result["changed"] >= 1
        text = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")
        # The deleted block's text is gone
        assert "Проміжне речення." not in text
        # The edited block's new text is in
        assert "Друге речення — вже виправлене." in text
        # The original edited text is gone
        assert "Друге речення — потребує правки." not in text
        # Unchanged blocks preserved
        assert "Перше речення." in text
        assert "Третє речення." in text

    def test_mixed_delete_then_edit_of_repeated_text(self, tmp_path):
        """Stress: delete one occurrence of a repeated phrase, then edit a
        later block whose text matches that phrase. The cursor walk must put
        the edit on the *second* occurrence (still in transcript), not the
        first (which was deleted)."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:01,000 --> 00:00:02,000
Привіт.

2
00:00:02,100 --> 00:00:03,000
Це тест.

3
00:00:03,100 --> 00:00:04,000
Привіт.

4
00:00:04,100 --> 00:00:05,000
Кінець.
"""
        # Delete the first "Привіт" (block 1), edit the second "Привіт" (block 3)
        new_srt = """2
00:00:02,100 --> 00:00:03,000
Це тест.

3
00:00:03,100 --> 00:00:04,000
Добрий день.

4
00:00:04,100 --> 00:00:05,000
Кінець.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(HEADER + "Привіт. Це тест. Привіт. Кінець.\n", encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result, f"unexpected error: {result.get('error')}"
        text = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")
        # One "Привіт." deleted, the second replaced with "Добрий день."
        assert text.count("Привіт.") == 0
        assert "Добрий день." in text
        # Other blocks preserved
        assert "Це тест." in text
        assert "Кінець." in text

    def test_drift_in_unchanged_blocks_does_not_fail_delete_only_pr(self, tmp_path):
        """Real-world drift: an unchanged SRT block has a wording that doesn't
        match the transcript verbatim (e.g. capitalization, missing word). For a
        delete-only PR the cursor anchor isn't needed, so the tool should treat
        this as a benign warning, not an error."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:00,000 --> 00:00:02,000
[Placeholder]

2
00:00:03,000 --> 00:00:05,000
Перше речення.

3
00:00:05,100 --> 00:00:08,000
Але Бог – це особистість, яка поза запитаннями.

4
00:00:08,100 --> 00:00:10,000
Третє речення.
"""
        new_srt = """2
00:00:03,000 --> 00:00:05,000
Перше речення.

3
00:00:05,100 --> 00:00:08,000
Але Бог – це особистість, яка поза запитаннями.

4
00:00:08,100 --> 00:00:10,000
Третє речення.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")
        # Transcript has the SAME sentence but with different capitalization and
        # an extra word — drift the SRT had at edit time.
        (talk_dir / "transcript_uk.txt").write_text(
            HEADER + "Перше речення. Але Бог – це Особистість, яка перебуває поза запитаннями. Третє речення.\n",
            encoding="utf-8",
        )
        before = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result, f"unexpected error: {result.get('error')}"
        # Transcript untouched (placeholder wasn't there, drift is left alone)
        assert (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8") == before

    def test_workflow_step_a_transcript_only_pr_noop(self, tmp_path):
        """A PR that only edits transcript_uk.txt (no SRT changes) must leave
        Step A a no-op and let Step B handle everything. The workflow's
        detect step will produce an empty SRTs list, Step A runs zero times,
        and Step B's existing transcript→SRT sync does its normal job. This
        test just confirms sync_srt_to_transcript returns 0/0/0 when the SRT
        is byte-identical to its base."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        srt = """1
00:00:01,000 --> 00:00:03,000
Перше.

2
00:00:03,100 --> 00:00:05,000
Друге.
"""
        (talk_dir / "base.srt").write_text(srt, encoding="utf-8")
        (video / "uk.srt").write_text(srt, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(HEADER + "Перше. Друге.\n", encoding="utf-8")
        before = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "base.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result
        assert result["changed"] == 0
        assert result.get("removed", 0) == 0
        # Transcript byte-identical
        assert (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8") == before

    # Mixed-PR case (transcript AND an SRT edited in one commit) is covered
    # end-to-end in tests/test_sync_pr.py via the sync_pr driver, which
    # handles it with per-video effective-old baselines. The bare
    # two-tool composition is no longer the canonical flow.

    def test_pr43_scenario_two_leading_placeholders_removed(self, tmp_path):
        """Reproduces PR #43: user removed two leading placeholder blocks
        ([Промова англійською]) that were never in the transcript."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:00,000 --> 00:00:02,920
[Промова англійською]

2
00:00:03,000 --> 00:00:05,920
на англійську]

3
00:00:06,000 --> 00:00:09,500
Шрі Матаджі зауважила: «Це була улюблена пісня».

4
00:00:09,580 --> 00:00:16,850
Багато людей завжди запитували Мене.
"""
        new_srt = """3
00:00:06,000 --> 00:00:09,500
Шрі Матаджі зауважила: «Це була улюблена пісня».

4
00:00:09,580 --> 00:00:16,850
Багато людей завжди запитували Мене.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(
            HEADER + "Шрі Матаджі зауважила: «Це була улюблена пісня». Багато людей завжди запитували Мене.\n",
            encoding="utf-8",
        )
        before = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in result, f"unexpected error: {result.get('error')}"
        # Transcript untouched (placeholders weren't there)
        assert (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8") == before
        # SRT renumbered to 1, 2
        from tools.srt_utils import parse_srt

        blocks = parse_srt(str(video / "uk.srt"))
        assert [b["idx"] for b in blocks] == [1, 2]

    def test_old_text_not_in_transcript_fails(self, talk):
        # Make transcript drift from SRT
        (talk / "transcript_uk.txt").write_text(HEADER + "Зовсім інший текст.\n\nДругий абзац.\n", encoding="utf-8")
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Виправлене перше речення.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        (talk / "Video" / "final" / "uk.srt").write_text(new_srt, encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        assert "error" in result

    def test_omit_phrase_removal_does_not_reach_transcript(self, tmp_path):
        """Taking a declared omit remark off the screen must leave the transcript alone.

        `glossary/subtitle_omit.yaml` phrases live in the transcript and never
        in a subtitle. When an SRT edit only strips such a phrase, propagating
        it would delete the remark from the one artefact that is supposed to
        keep it.
        """
        talk_dir = tmp_path / "talks" / "test"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу. (сміх)

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.
"""
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")
        transcript = talk_dir / "transcript_uk.txt"
        transcript.write_text(
            HEADER + "Перше речення першого абзацу. (сміх) Друге речення першого абзацу.\n",
            encoding="utf-8",
        )
        before = transcript.read_bytes()

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(transcript),
        )

        assert "error" not in result
        assert result["changed"] == 0
        assert transcript.read_bytes() == before

    def test_deleted_omit_only_block_leaves_transcript_alone(self, tmp_path):
        """A block that was nothing but an omit remark is the same case as above.

        Dropping it from the SRT is correct; deleting the remark from the
        transcript along with it is not.
        """
        talk_dir = tmp_path / "talks" / "test"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:05,100 --> 00:00:07,000
(сміх)

3
00:00:07,100 --> 00:00:10,000
Друге речення першого абзацу.
"""
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:07,100 --> 00:00:10,000
Друге речення першого абзацу.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")
        transcript = talk_dir / "transcript_uk.txt"
        transcript.write_text(
            HEADER + "Перше речення першого абзацу. (сміх) Друге речення першого абзацу.\n",
            encoding="utf-8",
        )
        before = transcript.read_bytes()

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(transcript),
        )

        assert "error" not in result
        assert result["removed"] == 0
        assert transcript.read_bytes() == before

    def test_no_changes_does_not_rewrite_file(self, talk):
        """When nothing changed the transcript file should be byte-identical."""
        before = (talk / "transcript_uk.txt").read_bytes()
        sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        after = (talk / "transcript_uk.txt").read_bytes()
        assert before == after

    def test_unchanged_paragraphs_byte_identical(self, talk):
        """Paragraphs not touched by an edit must remain byte-identical (no whitespace shuffle)."""
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Виправлене перше речення.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        (talk / "Video" / "final" / "uk.srt").write_text(new_srt, encoding="utf-8")
        sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        text = (talk / "transcript_uk.txt").read_text(encoding="utf-8")
        # Header preserved verbatim
        assert text.startswith(HEADER)
        # Second paragraph preserved verbatim with surrounding newlines
        assert "\n\nЄдине речення другого абзацу.\n" in text
        # Edit landed on first sentence, surrounding text preserved
        assert "Виправлене перше речення. Друге речення першого абзацу." in text

    def test_special_characters_in_edit(self, talk):
        """Edits with quotes/punctuation/em-dashes go through cleanly."""
        new_srt = """1
00:00:01,000 --> 00:00:05,000
«Цитата» — з тире.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        (talk / "Video" / "final" / "uk.srt").write_text(new_srt, encoding="utf-8")
        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        assert result["changed"] == 1
        text = (talk / "transcript_uk.txt").read_text(encoding="utf-8")
        assert "«Цитата» — з тире." in text

    def test_bom_srt_supported(self, talk):
        """SRT files with UTF-8 BOM (project allows it) should still parse."""
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Виправлене перше речення.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        # Write both old and new with BOM
        (talk / "uk_old.srt").write_text("\ufeff" + (talk / "uk_old.srt").read_text(encoding="utf-8"), encoding="utf-8")
        (talk / "Video" / "final" / "uk.srt").write_text("\ufeff" + new_srt, encoding="utf-8")
        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(talk / "Video" / "final" / "uk.srt"),
            transcript=str(talk / "transcript_uk.txt"),
        )
        assert result["changed"] == 1
        assert "Виправлене перше речення." in (talk / "transcript_uk.txt").read_text(encoding="utf-8")

    def test_duplicate_delete_survives_case_drift_in_cursor_walk(self, tmp_path):
        """Deleting a block whose text occurs earlier in the transcript must
        remove the RIGHT occurrence even when a preceding unchanged block has
        benign case drift (which used to stall the cursor walk, making the
        deletion grab the earlier duplicate)."""
        talk_dir = tmp_path / "talks" / "test"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        old_srt = """1
00:00:01,000 --> 00:00:05,000
Вітаю всіх присутніх тут.

2
00:00:05,100 --> 00:00:07,000
Так.

3
00:00:07,100 --> 00:00:10,000
Дякую вам.
"""
        # user deletes block 2 («Так.»)
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Вітаю всіх присутніх тут.

2
00:00:07,100 --> 00:00:10,000
Дякую вам.
"""
        (talk_dir / "uk_old.srt").write_text(old_srt, encoding="utf-8")
        (video / "uk.srt").write_text(new_srt, encoding="utf-8")

        # transcript has a leading «Так.» that belongs to no SRT block, and
        # block 1 drifted in capitalization («вітаю» lowercase)
        transcript = HEADER + "Так. вітаю всіх присутніх тут. Так. Дякую вам.\n"
        (talk_dir / "transcript_uk.txt").write_text(transcript, encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert result.get("removed") == 1

        text = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")
        # the block-2 «Так.» (after «тут.») is gone, the leading one survives
        assert "Так. вітаю всіх присутніх тут. Дякую вам." in text

    def test_a_block_is_found_across_a_declared_remark(self, tmp_path):
        """The transcript keeps «(сміється)»; the screen never shows it.

        The block text therefore does not occur in the raw transcript at all,
        and looking there is why the sync fails on the two corpus talks that
        carry a remark inside a subtitled sentence.
        """
        talk_dir = tmp_path / "talks" / "test"
        talk_dir.mkdir(parents=True)
        old_srt = talk_dir / "old.srt"
        new_srt = talk_dir / "new.srt"
        old_srt.write_text(
            "1\n00:00:01,000 --> 00:00:05,000\nПросте визначення тут.\n",
            encoding="utf-8",
        )
        new_srt.write_text(
            "1\n00:00:01,000 --> 00:00:05,000\nПросте визначення там.\n",
            encoding="utf-8",
        )
        transcript = talk_dir / "transcript_uk.txt"
        transcript.write_text(HEADER + "Просте визначення (сміється) тут.\n", encoding="utf-8")

        result = sync_srt_to_transcript(str(old_srt), str(new_srt), str(transcript))

        assert "error" not in result, result.get("error")
        assert result["changed"] == 1
        assert transcript.read_text(encoding="utf-8") == HEADER + "Просте визначення (сміється) там.\n"

    def test_an_edit_that_would_swallow_a_remark_is_refused(self, tmp_path):
        """Rewriting the whole sentence would take the remark with it. The
        transcript is the one artefact that keeps remarks, so refuse rather
        than decide where it should land."""
        talk_dir = tmp_path / "talks" / "test"
        talk_dir.mkdir(parents=True)
        old_srt = talk_dir / "old.srt"
        new_srt = talk_dir / "new.srt"
        old_srt.write_text(
            "1\n00:00:01,000 --> 00:00:05,000\nПросте визначення тут.\n",
            encoding="utf-8",
        )
        new_srt.write_text(
            "1\n00:00:01,000 --> 00:00:05,000\nЗовсім інша фраза.\n",
            encoding="utf-8",
        )
        transcript = talk_dir / "transcript_uk.txt"
        before = HEADER + "Просте визначення (сміється) тут.\n"
        transcript.write_text(before, encoding="utf-8")

        result = sync_srt_to_transcript(str(old_srt), str(new_srt), str(transcript))

        assert "error" in result
        assert "сміється" in result["error"] or "remark" in result["error"]
        assert transcript.read_text(encoding="utf-8") == before

    def test_a_deleted_block_takes_its_remark_with_it(self, tmp_path):
        """Deleting the sentence from the screen removes it from the
        transcript too, remark included — the remark belonged to that
        sentence."""
        talk_dir = tmp_path / "talks" / "test"
        talk_dir.mkdir(parents=True)
        old_srt = talk_dir / "old.srt"
        new_srt = talk_dir / "new.srt"
        old_srt.write_text(
            "1\n00:00:01,000 --> 00:00:05,000\nПросте визначення тут.\n\n"
            "2\n00:00:05,100 --> 00:00:09,000\nДруге речення.\n",
            encoding="utf-8",
        )
        new_srt.write_text(
            "1\n00:00:05,100 --> 00:00:09,000\nДруге речення.\n",
            encoding="utf-8",
        )
        transcript = talk_dir / "transcript_uk.txt"
        transcript.write_text(HEADER + "Просте визначення (сміється) тут. Друге речення.\n", encoding="utf-8")

        result = sync_srt_to_transcript(str(old_srt), str(new_srt), str(transcript))

        assert "error" not in result, result.get("error")
        assert result["removed"] == 1
        assert transcript.read_text(encoding="utf-8") == HEADER + "Друге речення.\n"

    def test_cli_entrypoint_writes_file(self, talk):
        """The module CLI should run end-to-end and update the transcript."""
        import subprocess
        import sys

        new_srt = """1
00:00:01,000 --> 00:00:05,000
CLI правка.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        (talk / "Video" / "final" / "uk.srt").write_text(new_srt, encoding="utf-8")
        proc = subprocess.run(
            [
                sys.executable,
                "-m",
                "tools.sync_srt_to_transcript",
                "--old-srt",
                str(talk / "uk_old.srt"),
                "--new-srt",
                str(talk / "Video" / "final" / "uk.srt"),
                "--transcript",
                str(talk / "transcript_uk.txt"),
            ],
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 0, f"stderr: {proc.stderr}"
        assert "CLI правка." in (talk / "transcript_uk.txt").read_text(encoding="utf-8")

    def test_cli_exits_nonzero_on_error(self, talk):
        """CLI should exit 1 when block count mismatches."""
        import subprocess
        import sys

        bad_srt = "1\n00:00:01,000 --> 00:00:02,000\nLone block.\n"
        (talk / "Video" / "final" / "uk.srt").write_text(bad_srt, encoding="utf-8")
        proc = subprocess.run(
            [
                sys.executable,
                "-m",
                "tools.sync_srt_to_transcript",
                "--old-srt",
                str(talk / "uk_old.srt"),
                "--new-srt",
                str(talk / "Video" / "final" / "uk.srt"),
                "--transcript",
                str(talk / "transcript_uk.txt"),
            ],
            capture_output=True,
            text=True,
        )
        assert proc.returncode == 1
        assert "FAIL" in proc.stderr

    def test_round_trip_propagates_to_other_videos(self, tmp_path):
        """End-to-end: SRT edit on Video1 → transcript → re-sync to Video2.

        This mirrors what sync-subtitles.yml does for a multi-video talk:
        an edit in one video's SRT must end up in the other video's SRT.
        """
        talk_dir = tmp_path / "talks" / "test"
        for slug in ("Video1", "Video2"):
            (talk_dir / slug / "final").mkdir(parents=True)

        common_srt = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
        (talk_dir / "Video1" / "final" / "uk.srt").write_text(common_srt, encoding="utf-8")
        (talk_dir / "Video2" / "final" / "uk.srt").write_text(common_srt, encoding="utf-8")
        (talk_dir / "old_video1.srt").write_text(common_srt, encoding="utf-8")
        transcript = HEADER + (
            "Перше речення першого абзацу. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        )
        (talk_dir / "transcript_uk.txt").write_text(transcript, encoding="utf-8")
        # Save base-SHA copy of transcript for the second sync step
        (talk_dir / "old_transcript.txt").write_text(transcript, encoding="utf-8")

        # Step A: edit Video1's SRT
        edited_srt = common_srt.replace("Перше речення першого абзацу.", "Виправлене перше речення.")
        (talk_dir / "Video1" / "final" / "uk.srt").write_text(edited_srt, encoding="utf-8")

        # Step B: propagate edit to transcript
        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "old_video1.srt"),
            new_srt=str(talk_dir / "Video1" / "final" / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert result["changed"] == 1

        # Step C: re-sync transcript → Video2's SRT (simulates the workflow's
        # second pass that propagates to *all* videos in the talk)
        sync_result = sync_transcript(
            talk_dir=str(talk_dir),
            video_slug="Video2",
            old_transcript=str(talk_dir / "old_transcript.txt"),
            new_transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert "error" not in sync_result
        assert sync_result["changed"] == 1

        # Video2 now has the edit applied
        v2 = (talk_dir / "Video2" / "final" / "uk.srt").read_text(encoding="utf-8")
        assert "Виправлене перше речення." in v2
        assert "Перше речення першого абзацу." not in v2
        # Other blocks untouched, timecodes preserved
        assert "00:00:05,100 --> 00:00:10,000" in v2
        assert "Друге речення першого абзацу." in v2

    def test_repeated_block_text_replaces_correct_occurrence(self, tmp_path):
        """If the same text appears in two blocks, editing the second must
        replace the second occurrence in the transcript, not the first."""
        talk_dir = tmp_path / "talk"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        srt_old = """1
00:00:01,000 --> 00:00:03,000
Привіт.

2
00:00:04,000 --> 00:00:06,000
Як справи?

3
00:00:07,000 --> 00:00:09,000
Привіт.
"""
        (talk_dir / "uk_old.srt").write_text(srt_old, encoding="utf-8")
        # Edit only the second "Привіт"
        srt_new = """1
00:00:01,000 --> 00:00:03,000
Привіт.

2
00:00:04,000 --> 00:00:06,000
Як справи?

3
00:00:07,000 --> 00:00:09,000
Вітаю.
"""
        (video / "uk.srt").write_text(srt_new, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(HEADER + "Привіт. Як справи? Привіт.\n", encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        assert result["changed"] == 1
        text = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")
        # The first "Привіт." stays, the second becomes "Вітаю."
        assert text.count("Привіт.") == 1
        assert "Вітаю." in text
        # Order check: Привіт comes before Вітаю
        assert text.index("Привіт.") < text.index("Вітаю.")


class TestOmitPhrasesFollowTheTalk:
    """Declared remarks belong to the TALK, not to whatever directory a copy
    of the transcript happens to sit in.

    sync_pr runs this tool twice per changed SRT: once against the shadow
    transcript (meta.yaml alongside) and once against a bare copy staged in a
    temp dir. Reading the talk-level `subtitle_omit:` from the transcript's
    own neighbour makes those two runs disagree, and the second one fails the
    whole PR for a perfectly valid edit. Its sibling sync_transcript already
    takes the talk directory for exactly this reason.
    """

    @staticmethod
    def _talk(tmp_path):
        talk = tmp_path / "talks" / "2000-01-01_Some-Talk"
        talk.mkdir(parents=True)
        (talk / "meta.yaml").write_text(
            "videos:\n- slug: Video\n  sync: primary\nsubtitle_omit:\n- (ще більше сміху)\n",
            encoding="utf-8",
        )
        text = "Сьогодні ми зібралися тут (ще більше сміху) щоб святкувати Ґуру Пуджу.\n"
        (talk / "transcript_uk.txt").write_text(text, encoding="utf-8")
        old = tmp_path / "old.srt"
        new = tmp_path / "new.srt"
        old.write_text(
            "1\n00:00:00,000 --> 00:00:04,000\nСьогодні ми зібралися тут щоб святкувати Ґуру Пуджу.\n\n",
            encoding="utf-8",
        )
        new.write_text(
            "1\n00:00:00,000 --> 00:00:04,000\nСьогодні ми зустрілися тут щоб святкувати Ґуру Пуджу.\n\n",
            encoding="utf-8",
        )
        return talk, old, new, text

    def test_a_staged_copy_resolves_the_same_remarks_as_the_original(self, tmp_path):
        talk, old, new, text = self._talk(tmp_path)
        staged = tmp_path / "staged" / "effective_old.txt"
        staged.parent.mkdir()
        staged.write_text(text, encoding="utf-8")

        beside_meta = sync_srt_to_transcript(
            old_srt=str(old), new_srt=str(new), transcript=str(talk / "transcript_uk.txt"), talk_dir=str(talk)
        )
        away_from_meta = sync_srt_to_transcript(
            old_srt=str(old), new_srt=str(new), transcript=str(staged), talk_dir=str(talk)
        )

        assert "error" not in beside_meta, beside_meta
        assert "error" not in away_from_meta, away_from_meta
        assert away_from_meta["changed"] == beside_meta["changed"] == 1
        # The remark survives in both, because both used the talk's vocabulary.
        assert "(ще більше сміху)" in staged.read_text(encoding="utf-8")
        assert "зустрілися" in staged.read_text(encoding="utf-8")


class TestStalledCursorIsNotBenign:
    """A cursor that could not advance must not silently pick an earlier copy.

    The `equal` walk tolerates drift: when an unchanged block is not found in
    the transcript verbatim it counts it as drift and leaves the cursor where
    it was. That is fine when the text ahead is unique. When it is not, the
    next lookup takes the FIRST occurrence at or after a stale cursor — an
    earlier sentence — and rewrites that instead. 51 of the corpus's 165 SRTs
    contain duplicate block texts, so this is a live combination.

    Pre-existing behaviour: the drift-tolerant walk predates this stack. It is
    fixed here because this PR reworks exactly these lookups.
    """

    def test_a_drifted_block_does_not_let_a_later_edit_hit_an_earlier_copy(self, tmp_path):
        transcript = tmp_path / "transcript_uk.txt"
        transcript.write_text("Це дуже важливо. Це дуже важливо.\n", encoding="utf-8")
        # Block 1 is UNCHANGED but drifted by one character, so the cursor stalls.
        old = tmp_path / "old.srt"
        old.write_text(
            "1\n00:00:00,000 --> 00:00:02,000\nЦе дуже важливо!\n\n"
            "2\n00:00:02,000 --> 00:00:04,000\nЦе дуже важливо.\n\n",
            encoding="utf-8",
        )
        new = tmp_path / "new.srt"
        new.write_text(
            "1\n00:00:00,000 --> 00:00:02,000\nЦе дуже важливо!\n\n"
            "2\n00:00:02,000 --> 00:00:04,000\nЦе НАДЗВИЧАЙНО важливо.\n\n",
            encoding="utf-8",
        )

        result = sync_srt_to_transcript(old_srt=str(old), new_srt=str(new), transcript=str(transcript))

        after = transcript.read_text(encoding="utf-8")
        assert after != "Це НАДЗВИЧАЙНО важливо. Це дуже важливо.\n", "the edit to subtitle 2 was applied to sentence 1"
        if "error" in result:
            assert "ambiguous" in result["error"], result
        else:
            assert after == "Це дуже важливо. Це НАДЗВИЧАЙНО важливо.\n", after

    def test_a_deletion_after_drift_does_not_remove_an_earlier_copy(self, tmp_path):
        """The drift guard covered replaces only.

        A deletion took `find_in_text(view, old_t, cursor)` straight, so with
        the cursor stalled it removed the FIRST occurrence — a different
        sentence of the transcript — and reported success. 99 of 164 corpus
        SRTs stall the cursor somewhere, so the precondition is common.
        """
        transcript = tmp_path / "transcript_uk.txt"
        transcript.write_text("Перше речення. Особливий текст тут. Перше речення.\n", encoding="utf-8")
        old = tmp_path / "old.srt"
        old.write_text(
            "1\n00:00:00,000 --> 00:00:02,000\nОсобливий текст тут!\n\n"
            "2\n00:00:02,000 --> 00:00:04,000\nПерше речення.\n\n",
            encoding="utf-8",
        )
        new = tmp_path / "new.srt"
        # Block 1 stays (drifted by '!'), block 2 — the SECOND «Перше речення.» — is deleted.
        new.write_text("1\n00:00:00,000 --> 00:00:02,000\nОсобливий текст тут!\n\n", encoding="utf-8")

        result = sync_srt_to_transcript(old_srt=str(old), new_srt=str(new), transcript=str(transcript))

        after = transcript.read_text(encoding="utf-8")
        assert not after.startswith(" Особливий"), f"the FIRST copy was deleted: {after!r}"
        if "error" in result:
            assert "ambiguous" in result["error"], result
        else:
            assert after.strip() == "Перше речення. Особливий текст тут.", after


def _srt(texts):
    return "".join(
        f"{i}\n00:00:{(i - 1) * 3:02d},000 --> 00:00:{(i - 1) * 3 + 2:02d},000\n{t}\n\n" for i, t in enumerate(texts, 1)
    )


def _staged(tmp_path, transcript, old_blocks, new_blocks, omit=None):
    """A talk directory, an old and a new SRT, and the transcript to sync."""
    talk = tmp_path / "talks" / "2000-01-01_Some-Talk"
    talk.mkdir(parents=True)
    meta = "videos:\n- slug: Video\n  sync: primary\n"
    if omit:
        meta += "subtitle_omit:\n" + "".join(f"- {phrase}\n" for phrase in omit)
    (talk / "meta.yaml").write_text(meta, encoding="utf-8")
    path = talk / "transcript_uk.txt"
    path.write_text(transcript, encoding="utf-8")
    old = tmp_path / "old.srt"
    new = tmp_path / "new.srt"
    old.write_text(_srt(old_blocks), encoding="utf-8")
    new.write_text(_srt(new_blocks), encoding="utf-8")
    return talk, old, new, path


class TestARemarkWalkByDoesNotStallTheCursor:
    """A block whose only change is a declared remark leaving the screen is
    walked past, not rewritten.

    The walk used to search the view for the block's OLD text — which carries
    the remark, while the view by construction never does. It therefore failed
    every time, stalling the cursor, and nothing counted that as drift. The
    next deletion of a sentence the transcript repeats then took the copy from
    the start of the file instead of the one that was on screen. This is the
    shape of a remark-cleanup PR, the very kind of PR the branch was written
    for.
    """

    def test_the_deletion_after_a_remark_block_finds_the_right_copy(self, tmp_path):
        talk, old, new, path = _staged(
            tmp_path,
            "Однакове речення. Щось інше (сміх) тут. Однакове речення.\n",
            ["Щось інше (сміх) тут.", "Однакове речення."],
            ["Щось інше тут."],
            omit=["(сміх)"],
        )

        result = sync_srt_to_transcript(str(old), str(new), str(path), talk_dir=str(talk))

        assert "error" not in result, result.get("error")
        assert path.read_text(encoding="utf-8") == "Однакове речення. Щось інше (сміх) тут.\n", (
            "the copy that was on screen is the second one; the first must survive"
        )


class TestADeletionKeepsASurvivingSentencesRemark:
    """A deleted block absorbs one neighbouring space so the text around the
    hole is neither glued nor doubly spaced.

    In view space that space is one character; in the transcript it can carry
    a declared remark, and that remark annotates the sentence that STAYS. The
    transcript is the one artefact that keeps remarks, so swallowing it there
    destroys text no other file has — silently, under a green check.
    """

    def test_a_remark_before_the_deleted_sentence_survives(self, tmp_path):
        talk, old, new, path = _staged(
            tmp_path,
            "Ми молимось. (сміх) Тиша в залі. Кінець.\n",
            ["Ми молимось.", "Тиша в залі.", "Кінець."],
            ["Ми молимось.", "Кінець."],
            omit=["(сміх)"],
        )

        result = sync_srt_to_transcript(str(old), str(new), str(path), talk_dir=str(talk))

        assert result.get("removed") == 1, result
        assert path.read_text(encoding="utf-8") == "Ми молимось. (сміх) Кінець.\n"

    def test_a_sentence_between_two_remarks_leaves_one_space_behind(self, tmp_path):
        """The shape 2000-07-23_Guru-Puja-Shraddha really has: «Якраз вчасно!»
        sits between the two remarks its meta.yaml declares.

        Neither remark may be absorbed, and the hole between them must still
        close to a single space — a run of blanks is a text-hygiene defect in
        the file every other artefact is built from.
        """
        talk, old, new, path = _staged(
            tmp_path,
            "Усе там. (легкий сміх) Якраз вчасно! (ще більше сміху). Усе всередині вас.\n",
            ["Усе там.", "Якраз вчасно!", "Усе всередині вас."],
            ["Усе там.", "Усе всередині вас."],
            omit=["(легкий сміх)", "(ще більше сміху)"],
        )

        sync_srt_to_transcript(str(old), str(new), str(path), talk_dir=str(talk))

        assert path.read_text(encoding="utf-8") == "Усе там. (легкий сміх) (ще більше сміху). Усе всередині вас.\n"

    def test_a_plain_deletion_still_closes_the_gap(self, tmp_path):
        talk, old, new, path = _staged(
            tmp_path,
            "Ми молимось. Тиша в залі. Кінець.\n",
            ["Ми молимось.", "Тиша в залі.", "Кінець."],
            ["Ми молимось.", "Кінець."],
        )

        sync_srt_to_transcript(str(old), str(new), str(path), talk_dir=str(talk))

        assert path.read_text(encoding="utf-8") == "Ми молимось. Кінець.\n"


class TestEveryDeletionPathAsksTheSameQuestion:
    """difflib reports a deletion two ways: as a `delete` opcode, and bundled
    into a `replace` group where one old block finds no new counterpart.

    Both remove a sentence from the transcript, so both need the ambiguity
    guard. Guarding only the first leaves the second free to delete the wrong
    copy of a repeated sentence once the cursor has drifted — and a deletion
    is the one edit no later run can undo.
    """

    def test_a_deletion_bundled_into_a_replace_is_guarded_too(self, tmp_path):
        talk, old, new, path = _staged(
            tmp_path,
            "Спільна фраза. Щось посередині. Спільна фраза. Схожий фрагмент розмови.\n",
            # Block 1 is not in the transcript at all, so the cursor drifts.
            # Block 2's deletion is bundled with block 3's edit into one
            # `replace` group.
            ["Особливий текст тут!", "Спільна фраза.", "Схожий фрагмент розмови."],
            ["Особливий текст тут!", "Схожий фрагмент бесіді."],
        )
        before = path.read_text(encoding="utf-8")

        result = sync_srt_to_transcript(str(old), str(new), str(path), talk_dir=str(talk))

        assert "error" in result, "an ambiguous deletion must not be resolved by picking the first copy"
        assert path.read_text(encoding="utf-8") == before, "nothing may be written when an edit is ambiguous"


class TestReblockingThatCannotBeWalkedPastIsDrift:
    """The same words redistributed over a different number of blocks change
    nothing in the transcript — but the cursor still has to walk past them.

    When it cannot, the cursor is as stale as after any other failed walk, and
    the next deletion of repeated text picks the copy from the start of the
    file. The counter the ambiguity guard reads has to see it.
    """

    def test_a_reblocking_the_cursor_cannot_pass_arms_the_guard(self, tmp_path):
        talk, old, new, path = _staged(
            tmp_path,
            "Розділювач тут. Спільна фраза. Щось посередині. Спільна фраза. Кінець.\n",
            # Block 1 is re-cut in two by this PR and is not in the transcript,
            # so the cursor cannot walk past it. Block 2 keeps the two groups
            # apart, so the re-blocking is its own opcode; block 3's deletion
            # is then the plain `delete` path.
            ["Текст якого немає.", "Розділювач тут.", "Спільна фраза.", "Кінець."],
            ["Текст якого", "немає.", "Розділювач тут.", "Кінець."],
        )
        before = path.read_text(encoding="utf-8")

        result = sync_srt_to_transcript(str(old), str(new), str(path), talk_dir=str(talk))

        assert "error" in result, "a re-blocking the cursor could not pass leaves it just as stale"
        assert path.read_text(encoding="utf-8") == before


class TestTheCommandLineSpeaksTheSameVocabulary:
    """`sync_pr` hands this tool the talk directory so a transcript staged in
    a temp dir still resolves the talk's own declared remarks.

    The CLI had no way to say it. Reproducing a sync_pr run by hand therefore
    silently used the global remark list only, and an edit that merely took a
    talk-level remark off the screen was read as a text edit — deleting from
    the transcript the one artefact meant to keep it.
    """

    def test_talk_dir_reaches_the_sync_from_the_command_line(self, tmp_path, monkeypatch):
        talk, old, new, path = _staged(
            tmp_path,
            "Сьогодні ми зібралися тут (ще більше сміху) щоб святкувати.\n",
            ["Сьогодні ми зібралися тут (ще більше сміху) щоб святкувати."],
            ["Сьогодні ми зібралися тут щоб святкувати."],
            omit=["(ще більше сміху)"],
        )
        staged = tmp_path / "staged" / "effective_old.txt"
        staged.parent.mkdir()
        staged.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")

        monkeypatch.setattr(
            "sys.argv",
            [
                "sync_srt_to_transcript",
                "--old-srt",
                str(old),
                "--new-srt",
                str(new),
                "--transcript",
                str(staged),
                "--talk-dir",
                str(talk),
            ],
        )
        main()

        assert staged.read_text(encoding="utf-8") == path.read_text(encoding="utf-8"), (
            "the remark is declared by the talk and must survive a staged-copy sync"
        )


class TestBlockSpanningALineBreak:
    """A subtitle block may join two lines of the transcript with a space.

    Blocks are cut from paragraphs and then merged across them, so across the
    corpus 415 blocks — in 73 videos across 45 talks — read «A. B» while the
    transcript reads «A.\\nB». The lookup was a plain str.find, so such a block
    was not found, and one edited block aborted the entire sync run with
    "nothing written".
    """

    @pytest.fixture
    def talk(self, tmp_path):
        talk_dir = tmp_path / "talks" / "test"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)

        srt = """1
00:00:01,000 --> 00:00:05,000
Кінець одного рядка. Початок наступного.

2
00:00:05,100 --> 00:00:10,000
Третє речення.
"""
        (video / "uk.srt").write_text(srt, encoding="utf-8")
        (talk_dir / "uk_old.srt").write_text(srt, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(
            HEADER + "Кінець одного рядка.\nПочаток наступного.\nТретє речення.\n",
            encoding="utf-8",
        )
        return talk_dir

    def test_edit_to_a_block_spanning_a_line_break_propagates(self, talk):
        new_srt = """1
00:00:01,000 --> 00:00:05,000
Кінець одного рядка. Змінений початок.

2
00:00:05,100 --> 00:00:10,000
Третє речення.
"""
        new_srt_path = talk / "Video" / "final" / "uk.srt"
        new_srt_path.write_text(new_srt, encoding="utf-8")

        result = sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(new_srt_path),
            transcript=str(talk / "transcript_uk.txt"),
        )

        assert not result.get("error"), result.get("error")
        assert result["changed"] == 1
        assert "Змінений початок." in (talk / "transcript_uk.txt").read_text(encoding="utf-8")

    def test_the_line_break_survives_the_edit(self, talk):
        """Rewriting the span must not reformat the transcript.

        Paragraph boundaries decide the block cut, so silently gluing two
        transcript lines into one re-cuts the talk on the next rebuild.
        """
        new_srt_path = talk / "Video" / "final" / "uk.srt"
        new_srt_path.write_text(
            """1
00:00:01,000 --> 00:00:05,000
Кінець одного рядка. Змінений початок.

2
00:00:05,100 --> 00:00:10,000
Третє речення.
""",
            encoding="utf-8",
        )

        sync_srt_to_transcript(
            old_srt=str(talk / "uk_old.srt"),
            new_srt=str(new_srt_path),
            transcript=str(talk / "transcript_uk.txt"),
        )

        assert "Кінець одного рядка.\nЗмінений початок." in (talk / "transcript_uk.txt").read_text(encoding="utf-8")

    def test_a_span_over_a_blank_line_does_not_eat_the_next_sentence(self, tmp_path):
        """The matched span is longer than the needle when the gap is «\\n\\n».

        48 spans in the corpus join across a blank line, so measuring the end
        as `start + len(needle)` stops one character short and leaves a broken
        tail behind.
        """
        talk_dir = tmp_path / "talks" / "test"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)
        srt = """1
00:00:01,000 --> 00:00:05,000
Кінець абзацу. Початок наступного.

2
00:00:05,100 --> 00:00:10,000
Третє речення.
"""
        (video / "uk.srt").write_text(srt, encoding="utf-8")
        (talk_dir / "uk_old.srt").write_text(srt, encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(
            HEADER + "Кінець абзацу.\n\nПочаток наступного.\n\nТретє речення.\n",
            encoding="utf-8",
        )

        (video / "uk.srt").write_text(
            """1
00:00:01,000 --> 00:00:05,000
Кінець абзацу. Змінений початок.

2
00:00:05,100 --> 00:00:10,000
Третє речення.
""",
            encoding="utf-8",
        )

        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )

        assert not result.get("error"), result.get("error")
        text = (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")
        assert "Змінений початок." in text
        assert "Третє речення." in text
        assert "о.Третє" not in text and "..Третє" not in text

    def _run(self, tmp_path, transcript_body, old_block, new_block):
        talk_dir = tmp_path / "talks" / "test"
        video = talk_dir / "Video" / "final"
        video.mkdir(parents=True)
        (talk_dir / "uk_old.srt").write_text(f"1\n00:00:01,000 --> 00:00:05,000\n{old_block}\n", encoding="utf-8")
        (video / "uk.srt").write_text(f"1\n00:00:01,000 --> 00:00:05,000\n{new_block}\n", encoding="utf-8")
        (talk_dir / "transcript_uk.txt").write_text(HEADER + transcript_body, encoding="utf-8")
        result = sync_srt_to_transcript(
            old_srt=str(talk_dir / "uk_old.srt"),
            new_srt=str(video / "uk.srt"),
            transcript=str(talk_dir / "transcript_uk.txt"),
        )
        return result, (talk_dir / "transcript_uk.txt").read_text(encoding="utf-8")

    def test_an_edit_on_both_sides_of_the_break_keeps_the_break(self, tmp_path):
        """Adjacent changes either side of the break merge into ONE island.

        find_diff_islands joins changes separated by at most one word, so the
        island straddles the gap and its replacement carries a plain space.
        """
        result, text = self._run(
            tmp_path,
            "Це кінець рядка.\nОсь початок наступного.\n",
            "Це кінець рядка. Ось початок наступного.",
            "Це кінець фрази. Он початок наступного.",
        )
        assert not result.get("error"), result.get("error")
        assert "Це кінець фрази.\nОн початок наступного." in text, repr(text)

    def test_a_one_character_edit_next_to_the_break_keeps_the_break(self, tmp_path):
        """An island shorter than MIN_FRAGMENT grows left, across the gap.

        Ukrainian lines routinely start with a one-letter word (І, В, А), so a
        single-character edit there is enough to reach this path.
        """
        result, text = self._run(
            tmp_path,
            "Кінець рядка і.\nВ початок наступного.\n",
            "Кінець рядка і. В початок наступного.",
            "Кінець рядка і. У початок наступного.",
        )
        assert not result.get("error"), result.get("error")
        assert "Кінець рядка і.\nУ початок наступного." in text, repr(text)

    def test_an_edit_that_changes_the_word_count_around_a_break_refuses(self, tmp_path):
        """When the gaps cannot be paired, say so instead of guessing.

        Dropping a sentence that ended a transcript line leaves fewer gaps in
        the replacement than the file has, so which one was the line break is
        a guess. Gluing the paragraphs on a guess re-cuts the talk silently;
        an explicit refusal sends it to the pipeline instead.
        """
        result, text = self._run(
            tmp_path,
            "І всюди, усі почувалися краще.\nЦе так дивовижно!\n",
            "І всюди, усі почувалися краще. Це так дивовижно!",
            "Це дуже дивовижно!",
        )
        assert "line break" in result.get("error", ""), result
        assert text.endswith("І всюди, усі почувалися краще.\nЦе так дивовижно!\n"), repr(text)
