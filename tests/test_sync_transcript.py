"""Tests for sync_transcript_to_srt.py."""

import sys

import pytest

from tools.sync_transcript_to_srt import (
    _apply_edits,
    _resolve_edits,
    find_diff_islands,
    find_paragraph_blocks,
    prepare_blocks,
    sync_transcript,
)

HEADER = "Мова промови: англійська | Транскрипт (українська)\n\n"


@pytest.fixture
def talk_dir(tmp_path):
    """Create a minimal talk with SRT."""
    talk = tmp_path / "talks" / "test"
    video = talk / "Video" / "final"
    video.mkdir(parents=True)

    srt_content = """1
00:00:01,000 --> 00:00:05,000
Перше речення першого абзацу.

2
00:00:05,100 --> 00:00:10,000
Друге речення першого абзацу.

3
00:00:12,000 --> 00:00:18,000
Єдине речення другого абзацу.
"""
    (video / "uk.srt").write_text(srt_content, encoding="utf-8")

    old_transcript = (
        HEADER + "Перше речення першого абзацу. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
    )
    (talk / "transcript_uk_old.txt").write_text(old_transcript, encoding="utf-8")
    (talk / "transcript_uk.txt").write_text(old_transcript, encoding="utf-8")

    return talk


class TestPrepareBlocks:
    def test_single_paragraph(self):
        blocks = prepare_blocks(["Перше речення. Друге речення."])
        assert len(blocks) == 2
        assert blocks[0]["text"] == "Перше речення."
        assert blocks[1]["text"] == "Друге речення."

    def test_preserves_para_idx(self):
        blocks = prepare_blocks(["Абзац один.", "Абзац два."])
        assert blocks[0]["para_idx"] == 0
        assert blocks[1]["para_idx"] == 1

    def test_long_sentence_split(self):
        long = "Це дуже довге речення яке має бути розбите на кілька рядків щоб вміститися в обмеження вісімдесят чотири символи на рядок."
        blocks = prepare_blocks([long])
        assert len(blocks) >= 2
        for b in blocks:
            assert len(b["text"]) <= 84


class TestFindParagraphBlocks:
    def test_finds_match(self):
        srt = [{"text": "A"}, {"text": "B"}, {"text": "C"}]
        assert find_paragraph_blocks(srt, [{"text": "B"}, {"text": "C"}]) == [1, 2]

    def test_finds_at_start(self):
        srt = [{"text": "A"}, {"text": "B"}]
        assert find_paragraph_blocks(srt, [{"text": "A"}]) == [0]

    def test_not_found(self):
        assert find_paragraph_blocks([{"text": "A"}], [{"text": "X"}]) is None

    def test_empty(self):
        assert find_paragraph_blocks([], [{"text": "A"}]) is None
        assert find_paragraph_blocks([{"text": "A"}], []) is None


class TestSyncTextSwap:
    def test_swap_first_paragraph(self, talk_dir):
        new = HEADER + "Виправлене перше речення. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert result["changed"] == 1

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        assert srt[0]["text"] == "Виправлене перше речення."
        assert srt[0]["start_ms"] == 1000  # timecode preserved
        assert srt[0]["end_ms"] == 5000

    def test_swap_second_paragraph(self, talk_dir):
        new = HEADER + "Перше речення першого абзацу. Друге речення першого абзацу.\n\nВиправлений другий абзац.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert result["changed"] == 1

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        assert srt[2]["text"] == "Виправлений другий абзац."
        assert srt[2]["start_ms"] == 12000  # preserved

    def test_no_changes(self, talk_dir):
        result = sync_transcript(
            str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(talk_dir / "transcript_uk.txt")
        )
        assert result["changed"] == 0

    def test_unchanged_blocks_preserved(self, talk_dir):
        new = HEADER + "Виправлено. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        assert srt[1]["text"] == "Друге речення першого абзацу."
        assert srt[1]["start_ms"] == 5100
        assert srt[2]["text"] == "Єдине речення другого абзацу."
        assert srt[2]["start_ms"] == 12000

    def test_one_word_change_minimal_diff(self, talk_dir):
        """Changing one word should only affect blocks in that paragraph, preserve everything else."""
        from tools.srt_utils import parse_srt

        srt_before = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        block_count_before = len(srt_before)
        timecodes_before = [(b["start_ms"], b["end_ms"]) for b in srt_before]

        # Change one word in first paragraph
        new = (
            HEADER + "Перше речення першого параграфу. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        )
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert result["changed"] == 1

        srt_after = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        # Block count must be identical
        assert len(srt_after) == block_count_before
        # All timecodes must be identical
        timecodes_after = [(b["start_ms"], b["end_ms"]) for b in srt_after]
        assert timecodes_after == timecodes_before
        # Changed block has new text
        assert "параграфу" in srt_after[0]["text"]
        # Unchanged blocks are untouched
        assert srt_after[1]["text"] == srt_before[1]["text"]
        assert srt_after[2]["text"] == srt_before[2]["text"]

    def test_multiple_paragraph_changes_preserve_structure(self, talk_dir):
        """Changing text in both paragraphs should still preserve block count and timecodes."""
        from tools.srt_utils import parse_srt

        srt_before = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        timecodes_before = [(b["start_ms"], b["end_ms"]) for b in srt_before]

        new = HEADER + "Виправлене перше. Друге речення першого абзацу.\n\nВиправлений другий абзац.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert result["changed"] == 2

        srt_after = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        assert len(srt_after) == len(srt_before)
        timecodes_after = [(b["start_ms"], b["end_ms"]) for b in srt_after]
        assert timecodes_after == timecodes_before


class TestSyncBlockCountChange:
    """Block-count-change edits (edits that cross CPL boundaries) must return
    an error — text-only sync can't fabricate timing without whisper. See
    feedback_no_proportional. Callers should fall back to the full pipeline."""

    def test_block_count_change_errors_out(self, talk_dir):
        """When an edit grows a sentence past the CPL limit so it splits into
        more blocks, sync_transcript must return an error instead of
        redistributing timecodes proportionally."""
        new = (
            HEADER
            + "Перше дуже довге речення першого абзацу яке тепер має набагато більше тексту і буде розбите інакше."
            + " Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        )
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert "error" in result
        assert "pipeline" in result["error"].lower()

    def test_block_count_change_leaves_srt_untouched(self, talk_dir):
        """On block-count error the SRT file must not be modified — partial
        rewrites are banned by feedback_no_proportional."""
        from tools.srt_utils import parse_srt

        srt_before = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        new = (
            HEADER
            + "Перше дуже довге речення першого абзацу яке тепер має набагато більше тексту і буде розбите інакше."
            + " Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        )
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))

        srt_after = parse_srt(str(talk_dir / "Video" / "final" / "uk.srt"))
        assert len(srt_after) == len(srt_before)
        for a, b in zip(srt_after, srt_before, strict=True):
            assert a == b

    def test_same_block_count_succeeds(self, talk_dir):
        """Unchanged block count is the happy path — result has no error,
        no legacy needs_optimize flag."""
        new = HEADER + "Виправлене перше речення. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert "error" not in result
        assert "needs_optimize" not in result

    def test_paragraph_count_mismatch_fails(self, talk_dir):
        new = HEADER + "Тільки один абзац.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert "error" in result

    def test_no_srt_fails(self, talk_dir):
        (talk_dir / "Video" / "final" / "uk.srt").unlink()
        result = sync_transcript(
            str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(talk_dir / "transcript_uk.txt")
        )
        assert "error" in result

    def test_blocks_not_found_fails(self, talk_dir):
        """SRT text doesn't match transcript — fail."""
        srt_path = talk_dir / "Video" / "final" / "uk.srt"
        srt_path.write_text("1\n00:00:01,000 --> 00:00:05,000\nЗовсім інший текст.\n", encoding="utf-8")

        new = HEADER + "Виправлено. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk_dir), "Video", str(talk_dir / "transcript_uk_old.txt"), str(new_path))
        assert "error" in result


class TestMismatchedBlockSplits:
    """SRT blocks built by whisper pipeline may combine sentences that
    prepare_blocks would split separately.  sync_transcript must still
    handle text replacements via difflib fragment matching."""

    @pytest.fixture
    def mismatched_talk(self, tmp_path):
        """SRT block 2 has TWO sentences combined (46 CPL).
        prepare_blocks would split them into separate blocks."""
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)

        srt = (
            "1\n00:00:01,000 --> 00:00:05,000\n"
            "Перше речення абзацу.\n\n"
            "2\n00:00:05,100 --> 00:00:10,000\n"
            "Друге речення абзацу. Третє коротке!\n\n"
            "3\n00:00:12,000 --> 00:00:18,000\n"
            "Другий абзац тут.\n"
        )
        (video / "uk.srt").write_text(srt, encoding="utf-8")

        old = HEADER + "Перше речення абзацу. Друге речення абзацу. Третє коротке!\n\n" + "Другий абзац тут.\n"
        (talk / "old.txt").write_text(old, encoding="utf-8")
        return talk

    def test_single_word_replacement(self, mismatched_talk):
        """Changing one word in a combined SRT block must succeed."""
        new = HEADER + "Перше речення абзацу. Змінене речення абзацу. Третє коротке!\n\n" + "Другий абзац тут.\n"
        new_path = mismatched_talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(
            str(mismatched_talk),
            "Video",
            str(mismatched_talk / "old.txt"),
            str(new_path),
        )

        assert "error" not in result
        assert result["changed"] == 1

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(mismatched_talk / "Video" / "final" / "uk.srt"))
        assert srt[1]["text"] == "Змінене речення абзацу. Третє коротке!"

    def test_multiple_fragments_same_block(self, mismatched_talk):
        """Two changes landing in the same combined SRT block."""
        new = HEADER + "Перше речення абзацу. Змінене речення абзацу. Третє довге!\n\n" + "Другий абзац тут.\n"
        new_path = mismatched_talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(
            str(mismatched_talk),
            "Video",
            str(mismatched_talk / "old.txt"),
            str(new_path),
        )

        assert "error" not in result

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(mismatched_talk / "Video" / "final" / "uk.srt"))
        assert srt[1]["text"] == "Змінене речення абзацу. Третє довге!"

    def test_preserves_timecodes(self, mismatched_talk):
        """All timecodes must remain intact — only text changes."""
        from tools.srt_utils import parse_srt

        before = [(b["start_ms"], b["end_ms"]) for b in parse_srt(str(mismatched_talk / "Video" / "final" / "uk.srt"))]

        new = HEADER + "Перше речення абзацу. Змінене речення абзацу. Третє коротке!\n\n" + "Другий абзац тут.\n"
        new_path = mismatched_talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        sync_transcript(
            str(mismatched_talk),
            "Video",
            str(mismatched_talk / "old.txt"),
            str(new_path),
        )

        after = [(b["start_ms"], b["end_ms"]) for b in parse_srt(str(mismatched_talk / "Video" / "final" / "uk.srt"))]
        assert after == before

    def test_unchanged_blocks_not_touched(self, mismatched_talk):
        """Blocks outside the changed paragraph must be untouched."""
        new = HEADER + "Перше речення абзацу. Змінене речення абзацу. Третє коротке!\n\n" + "Другий абзац тут.\n"
        new_path = mismatched_talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        sync_transcript(
            str(mismatched_talk),
            "Video",
            str(mismatched_talk / "old.txt"),
            str(new_path),
        )

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(mismatched_talk / "Video" / "final" / "uk.srt"))
        assert srt[0]["text"] == "Перше речення абзацу."
        assert srt[2]["text"] == "Другий абзац тут."

    def test_cpl_exceeded_after_replacement(self, tmp_path):
        """Replacement that pushes a block over MAX_CPL must error."""
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)

        # Block 1 is 78 CPL — close to the 84 limit
        srt = (
            "1\n00:00:01,000 --> 00:00:05,000\n"
            "Дуже довге речення абзацу яке має сімдесят вісім символів для тесту ось тут.\n\n"
            "2\n00:00:12,000 --> 00:00:18,000\n"
            "Другий абзац.\n"
        )
        (video / "uk.srt").write_text(srt, encoding="utf-8")

        old = (
            HEADER
            + "Дуже довге речення абзацу яке має сімдесят вісім символів для тесту ось тут.\n\n"
            + "Другий абзац.\n"
        )
        (talk / "old.txt").write_text(old, encoding="utf-8")

        # Replace "тут" (3 chars) with longer text to exceed 84 CPL
        new = (
            HEADER
            + "Дуже довге речення абзацу яке має сімдесят вісім символів для тесту ось тут-тут-тут-тут.\n\n"
            + "Другий абзац.\n"
        )
        new_path = talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(
            str(talk),
            "Video",
            str(talk / "old.txt"),
            str(new_path),
        )

        assert "error" in result
        assert "CPL" in result["error"] or "cpl" in result["error"].lower()

    def test_real_world_pr84_scenario(self, tmp_path):
        """Reproduce PR #84: SRT combines two sentences into one block,
        prepare_blocks would split them. Two phrase replacements must work."""
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)

        srt = (
            "1\n00:00:01,000 --> 00:00:05,000\n"
            "Вона може створити майю.\n\n"
            "2\n00:00:05,100 --> 00:00:15,000\n"
            "І це створило велику майю в умах людей, що «Ми на вершині світу!». Ви – ні!\n\n"
            "3\n00:00:15,100 --> 00:00:20,000\n"
            "Другий абзац.\n"
        )
        (video / "uk.srt").write_text(srt, encoding="utf-8")

        old = (
            HEADER
            + "Вона може створити майю. "
            + "І це створило велику майю в умах людей, що «Ми на вершині світу!». Ви – ні!\n\n"
            + "Другий абзац.\n"
        )
        (talk / "old.txt").write_text(old, encoding="utf-8")

        new = (
            HEADER
            + "Вона може створити майю. "
            + "І це створило велику майю в свідомості людей, що «Ми на вершині світу!». Це не так!\n\n"
            + "Другий абзац.\n"
        )
        new_path = talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(
            str(talk),
            "Video",
            str(talk / "old.txt"),
            str(new_path),
        )

        assert "error" not in result
        assert result["changed"] == 1

        from tools.srt_utils import parse_srt

        srt_blocks = parse_srt(str(talk / "Video" / "final" / "uk.srt"))
        assert srt_blocks[1]["text"] == (
            "І це створило велику майю в свідомості людей, що «Ми на вершині світу!». Це не так!"
        )
        assert len(srt_blocks[1]["text"]) <= 84
        assert srt_blocks[1]["start_ms"] == 5100
        assert srt_blocks[1]["end_ms"] == 15000


class TestFragmentScoping:
    """The diff fragment must be applied inside the changed paragraph's own
    blocks — a short fragment (e.g. the euphony edit « і » → « й ») almost
    always occurs in other blocks too, and patching the first global match
    corrupts an unrelated block while dropping the intended edit."""

    @pytest.fixture
    def two_para_talk(self, tmp_path):
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)
        srt_content = """1
00:00:01,000 --> 00:00:05,000
Мати дала нам силу і любов.

2
00:00:05,100 --> 00:00:10,000
Ми прийшли сюди і ми раді.
"""
        (video / "uk.srt").write_text(srt_content, encoding="utf-8")
        old = HEADER + "Мати дала нам силу і любов.\n\nМи прийшли сюди і ми раді.\n"
        (talk / "transcript_uk_old.txt").write_text(old, encoding="utf-8")
        return talk

    def test_short_fragment_patches_the_edited_paragraph_not_the_first_match(self, two_para_talk):
        new = HEADER + "Мати дала нам силу і любов.\n\nМи прийшли сюди й ми раді.\n"
        new_path = two_para_talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(
            str(two_para_talk), "Video", str(two_para_talk / "transcript_uk_old.txt"), str(new_path)
        )
        assert not result.get("error")

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(two_para_talk / "Video" / "final" / "uk.srt"))
        assert srt[0]["text"] == "Мати дала нам силу і любов."  # untouched
        assert srt[1]["text"] == "Ми прийшли сюди й ми раді."  # the actual edit

    def test_a_paragraph_repeating_itself_verbatim_edits_the_right_copy(self, tmp_path):
        """Both blocks carry the same sentence and both drifted from the
        transcript, so neither exact mapping nor uniqueness can separate them.
        The order-preserving alignment can: the first sentence is the first
        block."""
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)
        srt_content = """1
00:00:01,000 --> 00:00:05,000
Так само і тут!

2
00:00:05,100 --> 00:00:10,000
Так само і тут!
"""
        (video / "uk.srt").write_text(srt_content, encoding="utf-8")
        old = HEADER + "Так само і тут. Так само і тут.\n\nІнший абзац зовсім.\n"
        (talk / "transcript_uk_old.txt").write_text(old, encoding="utf-8")
        new = HEADER + "Так само й тут. Так само і тут.\n\nІнший абзац зовсім.\n"
        new_path = talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk), "Video", str(talk / "transcript_uk_old.txt"), str(new_path))
        assert not result.get("error"), result.get("error")

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(talk / "Video" / "final" / "uk.srt"))
        assert [b["text"] for b in srt] == ["Так само й тут!", "Так само і тут!"]

    def test_drifted_srt_still_places_an_edit_whose_fragment_is_unique(self, tmp_path):
        """Word-level islands are tightened character by character, so a block
        that drifted by one punctuation mark still matches: the fragment for
        « і » → « й » is «о і», which occurs in exactly one block here."""
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)
        srt_content = """1
00:00:01,000 --> 00:00:05,000
Так само і тут щось!

2
00:00:05,100 --> 00:00:10,000
І знову тут інше.
"""
        (video / "uk.srt").write_text(srt_content, encoding="utf-8")
        old = HEADER + "Так само і тут щось.\n\nІ знову тут інше.\n"
        (talk / "transcript_uk_old.txt").write_text(old, encoding="utf-8")
        new = HEADER + "Так само й тут щось.\n\nІ знову тут інше.\n"
        new_path = talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk), "Video", str(talk / "transcript_uk_old.txt"), str(new_path))
        assert not result.get("error"), result.get("error")

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(talk / "Video" / "final" / "uk.srt"))
        assert srt[0]["text"] == "Так само й тут щось!"
        assert srt[1]["text"] == "І знову тут інше."

    def test_drifted_srt_with_unique_fragment_still_applies(self, tmp_path):
        """Drifted SRT (whisper-shaped blocks) keeps working when the fragment
        is unambiguous across the whole file."""
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)
        srt_content = """1
00:00:01,000 --> 00:00:05,000
Так само і тут щось!

2
00:00:05,100 --> 00:00:10,000
І знову і тут інше.
"""
        (video / "uk.srt").write_text(srt_content, encoding="utf-8")
        old = HEADER + "Так само і тут щось.\n\nІ знову і тут інше.\n"
        (talk / "transcript_uk_old.txt").write_text(old, encoding="utf-8")
        new = HEADER + "Так само і тут дещо.\n\nІ знову і тут інше.\n"
        new_path = talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk), "Video", str(talk / "transcript_uk_old.txt"), str(new_path))
        assert not result.get("error")

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(talk / "Video" / "final" / "uk.srt"))
        assert srt[0]["text"] == "Так само і тут дещо!"
        assert srt[1]["text"] == "І знову і тут інше."


class TestResolveEditsEdgeCases:
    """Edge cases for _resolve_edits — nothing may be applied on a failure."""

    def test_empty_old_frag_errors(self):
        _edits, err = _resolve_edits([""], ["нове"], [0], [])
        assert err is not None
        assert "cannot determine" in err["error"]

    def test_frag_not_found_in_blocks(self):
        blocks = [{"text": "Зовсім інший текст."}]
        _edits, err = _resolve_edits(["Перше."], ["Друге."], [0], blocks)
        assert err is not None
        assert "cannot find" in err["error"]

    def test_an_unanchorable_fragment_appearing_twice_is_refused(self):
        """Last resort: nothing in the paragraph matches any subtitle word, so
        there is no anchor and no paragraph scope — only a search of the whole
        file. 51 of the corpus's 165 SRTs contain duplicate block texts, so a
        first-match guess there would silently rewrite the wrong subtitle.
        """
        blocks = [{"text": "ххх ВВВ ууу"}, {"text": "ххх ВВВ ууу"}]
        _edits, err = _resolve_edits(["ААА ВВВ."], ["ААА ССС."], [0], blocks)
        assert err is not None
        assert "ambiguous" in err["error"]


class TestParagraphScopedFallback:
    """When the SRT's word stream has drifted from the transcript's — true of
    74 of the corpus's 94 talks, because an en-srt build legitimately drops
    transcript-only content — exact word-position mapping gives up on every
    edit. Searching the whole file then makes any short fragment ambiguous.
    The paragraph's own blocks are the right place to look.
    """

    @pytest.fixture
    def drifted_talk(self, tmp_path):
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)
        # Block 2 is missing the transcript's second sentence entirely, so the
        # word streams differ. «, і» occurs in three blocks.
        (video / "uk.srt").write_text(
            """1
00:00:01,000 --> 00:00:05,000
Спокій, і радість, і любов.

2
00:00:05,100 --> 00:00:10,000
Другий абзац, і його слова.

3
00:00:10,100 --> 00:00:15,000
Третій абзац, і кінець.
""",
            encoding="utf-8",
        )
        old = (
            HEADER + "Спокій, і радість, і любов.\n\nДругий абзац, і його слова. Речення якого немає на екрані.\n\n"
            "Третій абзац, і кінець.\n"
        )
        (talk / "transcript_uk_old.txt").write_text(old, encoding="utf-8")
        return talk

    def test_a_short_fragment_is_placed_in_its_own_paragraph(self, drifted_talk):
        new = (
            HEADER + "Спокій, і радість, і любов.\n\nДругий абзац, й його слова. Речення якого немає на екрані.\n\n"
            "Третій абзац, і кінець.\n"
        )
        new_path = drifted_talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(drifted_talk), "Video", str(drifted_talk / "transcript_uk_old.txt"), str(new_path))
        assert not result.get("error"), result.get("error")

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(drifted_talk / "Video" / "final" / "uk.srt"))
        assert srt[0]["text"] == "Спокій, і радість, і любов.", "another paragraph's block must not move"
        assert srt[1]["text"] == "Другий абзац, й його слова."
        assert srt[2]["text"] == "Третій абзац, і кінець."

    def test_a_repeated_phrase_inside_the_paragraph_edits_the_right_block(self, drifted_talk):
        """Scoping alone cannot separate three copies of « і » inside one
        paragraph; the anchor word next to the edit can."""
        old = HEADER + "Так, і так. Ще, і ще. Знов, і знов.\n\nІнший абзац.\n"
        (drifted_talk / "transcript_uk_old.txt").write_text(old, encoding="utf-8")
        (drifted_talk / "Video" / "final" / "uk.srt").write_text(
            """1
00:00:01,000 --> 00:00:05,000
Так, і так!

2
00:00:05,100 --> 00:00:10,000
Ще, і ще!

3
00:00:10,100 --> 00:00:15,000
Знов, і знов!
""",
            encoding="utf-8",
        )
        new_path = drifted_talk / "new2.txt"
        new_path.write_text(HEADER + "Так, і так. Ще, й ще. Знов, і знов.\n\nІнший абзац.\n", encoding="utf-8")

        result = sync_transcript(str(drifted_talk), "Video", str(drifted_talk / "transcript_uk_old.txt"), str(new_path))
        assert not result.get("error"), result.get("error")

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(drifted_talk / "Video" / "final" / "uk.srt"))
        assert [b["text"] for b in srt] == ["Так, і так!", "Ще, й ще!", "Знов, і знов!"]


class TestMain:
    """CLI entry point coverage (in-process for coverage tracking)."""

    def test_main_success(self, talk_dir, monkeypatch):
        new = HEADER + "Виправлене перше речення. Друге речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        new_path = talk_dir / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        monkeypatch.setattr(
            sys,
            "argv",
            [
                "sync_transcript_to_srt",
                "--talk-dir",
                str(talk_dir),
                "--video-slug",
                "Video",
                "--old-transcript",
                str(talk_dir / "transcript_uk_old.txt"),
                "--new-transcript",
                str(new_path),
            ],
        )
        from tools.sync_transcript_to_srt import main

        main()  # should not raise

    def test_main_no_changes(self, talk_dir, monkeypatch, capsys):
        monkeypatch.setattr(
            sys,
            "argv",
            [
                "sync_transcript_to_srt",
                "--talk-dir",
                str(talk_dir),
                "--video-slug",
                "Video",
                "--old-transcript",
                str(talk_dir / "transcript_uk_old.txt"),
                "--new-transcript",
                str(talk_dir / "transcript_uk.txt"),
            ],
        )
        from tools.sync_transcript_to_srt import main

        main()
        assert "No changes" in capsys.readouterr().err

    def test_main_error(self, talk_dir, monkeypatch, capsys):
        (talk_dir / "Video" / "final" / "uk.srt").unlink()
        monkeypatch.setattr(
            sys,
            "argv",
            [
                "sync_transcript_to_srt",
                "--talk-dir",
                str(talk_dir),
                "--video-slug",
                "Video",
                "--old-transcript",
                str(talk_dir / "transcript_uk_old.txt"),
                "--new-transcript",
                str(talk_dir / "transcript_uk.txt"),
            ],
        )
        from tools.sync_transcript_to_srt import main

        with pytest.raises(SystemExit, match="1"):
            main()
        assert "FAIL" in capsys.readouterr().err


class TestOmitContext:
    """Declared omissions come from the TALK, not from wherever a transcript
    copy happens to sit.

    sync_pr stages the base transcript in a temp dir to build its
    effective-old baseline. talk_omit_phrases() looks for meta.yaml next to
    the file it is given, so that copy silently loads with no omissions while
    the working transcript loads with them — two different readings of
    identical bytes, reported as a changed paragraph that can never be found
    in the SRT (2000-07-23 Guru Puja, run 30655645861).
    """

    def _talk_with_omit(self, tmp_path):
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)
        (video / "uk.srt").write_text(
            "1\n00:00:01,000 --> 00:00:05,000\nПерше речення.\n\n2\n00:00:05,100 --> 00:00:10,000\nДруге речення.\n",
            encoding="utf-8",
        )
        (talk / "meta.yaml").write_text('title: Test\nsubtitle_omit:\n- "(легкий сміх)"\n', encoding="utf-8")
        (talk / "transcript_uk.txt").write_text(
            HEADER + "Перше речення. (легкий сміх) Друге речення.\n", encoding="utf-8"
        )
        return talk

    def test_old_transcript_staged_outside_the_talk_dir(self, tmp_path):
        talk = self._talk_with_omit(tmp_path)
        staged = tmp_path / "staging" / "effective_old.txt"
        staged.parent.mkdir()
        staged.write_text((talk / "transcript_uk.txt").read_text(encoding="utf-8"), encoding="utf-8")

        result = sync_transcript(
            talk_dir=str(talk),
            video_slug="Video",
            old_transcript=str(staged),
            new_transcript=str(talk / "transcript_uk.txt"),
        )

        assert "error" not in result, result.get("error")
        assert result["changed"] == 0


class TestAlignedLocation:
    """Pinning an edit when the streams have drifted.

    A paragraph usually repeats its own short phrases, so scoping to the
    paragraph is not enough: « і » can occur five times inside it. The words
    the paragraph and the subtitles still share pin the edit to one block.
    """

    def test_a_repeated_fragment_inside_one_paragraph_is_still_placed(self, tmp_path):
        talk = tmp_path / "talks" / "test"
        video = talk / "Video" / "final"
        video.mkdir(parents=True)
        # Every block drifted from the transcript by its final punctuation,
        # and «, і» occurs in all three.
        (video / "uk.srt").write_text(
            """1
00:00:01,000 --> 00:00:05,000
Спокій, і радість тут!

2
00:00:05,100 --> 00:00:10,000
Любов, і мудрість там!

3
00:00:10,100 --> 00:00:15,000
Сила, і терпіння скрізь!
""",
            encoding="utf-8",
        )
        old = HEADER + "Спокій, і радість тут. Любов, і мудрість там. Сила, і терпіння скрізь.\n\nДругий абзац.\n"
        (talk / "transcript_uk_old.txt").write_text(old, encoding="utf-8")
        # Only the MIDDLE occurrence changes.
        new = HEADER + "Спокій, і радість тут. Любов, й мудрість там. Сила, і терпіння скрізь.\n\nДругий абзац.\n"
        new_path = talk / "new.txt"
        new_path.write_text(new, encoding="utf-8")

        result = sync_transcript(str(talk), "Video", str(talk / "transcript_uk_old.txt"), str(new_path))
        assert not result.get("error"), result.get("error")

        from tools.srt_utils import parse_srt

        srt = parse_srt(str(talk / "Video" / "final" / "uk.srt"))
        assert srt[0]["text"] == "Спокій, і радість тут!", "the first occurrence must not move"
        assert srt[1]["text"] == "Любов, й мудрість там!"
        assert srt[2]["text"] == "Сила, і терпіння скрізь!", "the last occurrence must not move"


class TestFindDiffIslands:
    """One paragraph can carry several unrelated edits.

    Trimming a common prefix and suffix calls everything between the first
    and last change "the change" — in a long paragraph that is a fragment
    that exists in no single subtitle block, so the sync fails on text it
    could have placed exactly.
    """

    def test_two_distant_edits_are_two_islands(self):
        old = "AAAA. Текст посередині. BBBB!"
        new = "CCCC. Текст посередині. DDDD!"
        islands = find_diff_islands(old, new)
        assert len(islands) == 2
        (old1, new1, off1), (old2, new2, off2) = islands
        assert "AAAA" in old1 and "CCCC" in new1
        assert "BBBB" in old2 and "DDDD" in new2
        assert old[off1 : off1 + len(old1)] == old1
        assert old[off2 : off2 + len(old2)] == old2

    def test_a_single_edit_is_one_island(self):
        islands = find_diff_islands("Перше речення абзацу.", "Перше речення параграфу.")
        assert len(islands) == 1
        old_f, new_f, offset = islands[0]
        assert "абзац" in old_f
        assert "парагра" in new_f
        assert "Перше речення абзацу."[offset : offset + len(old_f)] == old_f

    def test_no_change_is_no_islands(self):
        assert find_diff_islands("однаково", "однаково") == []

    def test_adjacent_edits_stay_one_island(self):
        """Splitting on every micro-gap would produce fragments too short to
        locate; changes one word apart are one edit."""
        islands = find_diff_islands("кіт і пес", "лев і тигр")
        assert len(islands) == 1

    def test_many_edits_produce_many_locatable_fragments(self):
        old = " ".join(f"Речення номер {i} тут." for i in range(12))
        new = " ".join(f"Речення номер {i} там." for i in range(12))
        islands = find_diff_islands(old, new)
        assert len(islands) == 12
        assert all(len(o) < 40 for o, _, _ in islands), "no island may span the whole paragraph"
        for old_f, _new_f, offset in islands:
            assert old[offset : offset + len(old_f)] == old_f

    @pytest.mark.parametrize(
        ("old", "new"),
        [
            # Plain sentence rewrites: already word-aligned, nothing to trim.
            (
                "Перше речення першого абзацу. Друге речення першого абзацу.",
                "Змінене речення першого абзацу. Інше речення першого абзацу.",
            ),
            # A changed word shorter than MIN_FRAGMENT forces the island to
            # widen onto its neighbour — the case that actually reaches the
            # trim. Without it these yield (' ту', ' цю', 9) and (' та', ' то', 12).
            ("Вона мала ту силу.", "Вона мала цю силу."),
            ("Ми знаємо це та він прийшов.", "Ми знаємо це то він прийшов."),
        ],
    )
    def test_no_island_begins_or_ends_on_whitespace(self, old, new):
        """A space is exactly where one subtitle block ends and the next
        begins, so a fragment padded with one can never be found."""
        islands = find_diff_islands(old, new)
        assert islands
        for old_f, new_f, _ in islands:
            assert old_f == old_f.strip()
            assert new_f == new_f.strip()

    def test_an_empty_old_paragraph_yields_nothing_to_locate(self):
        assert find_diff_islands("", "нове") == [("", "нове", 0)]


class TestSeveralEditsInOneParagraph:
    def test_two_edits_in_one_paragraph_reach_both_blocks(self, talk_dir):
        """The paragraph spans two subtitle blocks and both sentences change.

        A single prefix/suffix-trimmed fragment would span both blocks, exist
        in neither, and fail the run.
        """
        new_transcript = (
            HEADER + "Змінене речення першого абзацу. Інше речення першого абзацу.\n\nЄдине речення другого абзацу.\n"
        )
        (talk_dir / "transcript_uk.txt").write_text(new_transcript, encoding="utf-8")

        result = sync_transcript(
            talk_dir=str(talk_dir),
            video_slug="Video",
            old_transcript=str(talk_dir / "transcript_uk_old.txt"),
            new_transcript=str(talk_dir / "transcript_uk.txt"),
        )

        assert "error" not in result, result.get("error")
        srt = (talk_dir / "Video" / "final" / "uk.srt").read_text(encoding="utf-8")
        assert "Змінене речення першого абзацу." in srt
        assert "Інше речення першого абзацу." in srt
        assert "Перше речення" not in srt
        assert "Друге речення" not in srt

    def test_two_edits_inside_one_block_both_apply(self, talk_dir):
        """Both islands land in block 3. Applying left to right would shift
        the second island's offset and corrupt the block."""
        new_transcript = (
            HEADER + "Перше речення першого абзацу. Друге речення першого абзацу.\n\nПерше слово другого тексту.\n"
        )
        (talk_dir / "transcript_uk.txt").write_text(new_transcript, encoding="utf-8")

        result = sync_transcript(
            talk_dir=str(talk_dir),
            video_slug="Video",
            old_transcript=str(talk_dir / "transcript_uk_old.txt"),
            new_transcript=str(talk_dir / "transcript_uk.txt"),
        )

        assert "error" not in result, result.get("error")
        srt = (talk_dir / "Video" / "final" / "uk.srt").read_text(encoding="utf-8")
        assert "Перше слово другого тексту." in srt


class TestRepeatedFragmentInOneBlock:
    """Two edits to the same repeated word must not collapse onto one offset.

    Tier 1 locates a fragment by arithmetic from its own paragraph offset, so
    it keeps the two apart. Tiers 2 and 3 re-derive the offset with `find`,
    which returns the FIRST occurrence for both islands: the first edit is
    overwritten by the second and the second sentence is left untouched,
    producing text that existed in neither version — with no error.

    17% of the corpus's 85k blocks contain a repeated word, and the drifted
    block cut that sends a lookup to tier 2 is the common case (the transcript
    word stream differs from the primary SRT in 74 of 94 talks).
    """

    def test_two_edits_to_a_repeated_word_do_not_collapse(self):
        old_para = "Вона сказала так і потім вона сказала так знову."
        new_para = "Вона сказала ТАК і потім вона сказала ІНАКШЕ знову."
        # The trailing word makes the block differ from the paragraph, so tier 1
        # declines and the lookup falls through to the re-searching tiers.
        blocks = [
            {"idx": 1, "text": "Вона сказала так і потім вона сказала так знову вже.", "start_ms": 0, "end_ms": 3000}
        ]

        edits, err = _resolve_edits([old_para], [new_para], [0], blocks)
        assert err is None, err
        assert _apply_edits(edits) is None

        assert blocks[0]["text"] == "Вона сказала ТАК і потім вона сказала ІНАКШЕ знову вже."

    def test_a_second_edit_does_not_overwrite_the_first(self):
        """The pre-fix failure wrote text that was in neither version: both
        islands landed on offset 13, so the second splice replaced the first."""
        old_para = "Вона сказала так і потім вона сказала так знову."
        new_para = "Вона сказала ТАК і потім вона сказала ІНАКШЕ знову."
        blocks = [
            {"idx": 1, "text": "Вона сказала так і потім вона сказала так знову вже.", "start_ms": 0, "end_ms": 3000}
        ]

        edits, err = _resolve_edits([old_para], [new_para], [0], blocks)

        assert err is None, err
        assert sorted(e["offset"] for e in edits) == [13, 38]
