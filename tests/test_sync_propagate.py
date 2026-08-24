"""Copying the primary's text onto a derived video.

A derived video's subtitles ARE the primary's, on its own timeline. Routing
that through the transcript — a character diff against a block cut that was
never the same — is why derived videos went unsynced. The primary is right
there; the only question is which block matches which.
"""

from tools.sync_propagate import align_blocks, propagate_primary_to_derived


def _blocks(*texts):
    return [
        {"idx": i + 1, "start_ms": 1000 * (i + 1), "end_ms": 1000 * (i + 2), "text": t} for i, t in enumerate(texts)
    ]


class TestAlignBlocks:
    def test_identical_lists_map_one_to_one(self):
        assert align_blocks(["a", "b", "c"], ["a", "b", "c"]) == {0: 0, 1: 1, 2: 2}

    def test_a_shorter_derived_cut_maps_only_what_it_carries(self):
        """The Talk cut of a puja is a subset: 477 blocks against 643."""
        mapping = align_blocks(["intro", "a", "b", "outro"], ["a", "b"])
        assert mapping == {1: 0, 2: 1}

    def test_duplicate_texts_map_by_position_not_by_search(self):
        """51 of the corpus's 165 SRTs contain duplicate block texts."""
        mapping = align_blocks(["x", "same", "y", "same"], ["x", "same", "y", "same"])
        assert mapping == {0: 0, 1: 1, 2: 2, 3: 3}


class TestPropagate:
    def test_an_edited_primary_block_reaches_its_derived_counterpart(self):
        primary_old = ["Перше.", "Друге.", "Третє."]
        primary_new = ["Перше.", "Змінене.", "Третє."]
        derived = _blocks("Друге.", "Третє.")

        result = propagate_primary_to_derived(primary_old, primary_new, ["Друге.", "Третє."], derived)

        assert "error" not in result
        assert [b["text"] for b in derived] == ["Змінене.", "Третє."]
        assert result["changed"] == 1

    def test_the_right_copy_of_a_duplicated_block_is_edited(self):
        primary_old = ["Так.", "Інше.", "Так."]
        primary_new = ["Так.", "Інше.", "Ні."]
        derived = _blocks("Так.", "Інше.", "Так.")

        result = propagate_primary_to_derived(primary_old, primary_new, list(primary_old), derived)

        assert "error" not in result
        assert [b["text"] for b in derived] == ["Так.", "Інше.", "Ні."], "the first copy must not move"

    def test_an_edit_the_derived_video_does_not_carry_is_simply_skipped(self):
        primary_old = ["Тільки тут.", "Спільне."]
        primary_new = ["Змінене тут.", "Спільне."]
        derived = _blocks("Спільне.")

        result = propagate_primary_to_derived(primary_old, primary_new, ["Спільне."], derived)

        assert "error" not in result
        assert [b["text"] for b in derived] == ["Спільне."]
        assert result["changed"] == 0

    def test_a_deleted_primary_block_is_deleted_from_the_derived_video(self):
        primary_old = ["Перше.", "Зайве.", "Третє."]
        primary_new = ["Перше.", "Третє."]
        derived = _blocks("Перше.", "Зайве.", "Третє.")

        result = propagate_primary_to_derived(primary_old, primary_new, list(primary_old), derived)

        assert "error" not in result
        assert [b["text"] for b in derived] == ["Перше.", "Третє."]
        assert result["removed"] == 1

    def test_a_new_primary_block_fails_instead_of_inventing_timing(self):
        """The derived video has no timecode for text that was never on it,
        and timing is never invented (feedback_no_proportional)."""
        primary_old = ["Перше.", "Третє."]
        primary_new = ["Перше.", "Нове.", "Третє."]
        derived = _blocks("Перше.", "Третє.")

        result = propagate_primary_to_derived(primary_old, primary_new, list(primary_old), derived)

        assert "error" in result
        assert [b["text"] for b in derived] == ["Перше.", "Третє."], "nothing may be written on failure"

    def test_timecodes_are_never_touched(self):
        primary_old = ["Перше."]
        primary_new = ["Змінене."]
        derived = _blocks("Перше.")
        before = (derived[0]["start_ms"], derived[0]["end_ms"])

        propagate_primary_to_derived(primary_old, primary_new, ["Перше."], derived)

        assert (derived[0]["start_ms"], derived[0]["end_ms"]) == before


class TestDerivedChangedStructurallyToo:
    """The derived SRT may itself have been edited in the same PR."""

    def test_a_block_the_human_removed_from_the_derived_video_does_not_misalign_the_rest(self):
        primary_old = ["Перше.", "Друге.", "Третє."]
        primary_new = ["Перше.", "Друге.", "Змінене."]
        derived_old = ["Перше.", "Друге.", "Третє."]
        derived = _blocks("Друге.", "Третє.")  # the human dropped block 1 here

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, derived)

        assert "error" not in result
        assert [b["text"] for b in derived] == ["Друге.", "Змінене."]

    def test_an_unparseable_derived_srt_is_left_alone_rather_than_crashing(self):
        """The driver must survive it; the failure is reported elsewhere."""
        derived: list[dict] = []
        result = propagate_primary_to_derived(["Перше."], ["Змінене."], ["Перше."], derived)
        assert "error" not in result
        assert derived == []
