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


class TestAlignmentIsEvidenceNotArithmetic:
    """A `replace` opcode is difflib saying it found NO correspondence.

    Mapping one whose two sides happen to be the same length declares that
    every block in a divergent region corresponds, and propagation then writes
    the primary's text over a derived block that says something else. Two
    corpus talks carry 187 such blocks between them — most of
    1988-05-08_Sahasrara-Puja, whose Talk cut is a separate translation of the
    same words («хитаються» where the primary says «втрачають впевненість»).
    """

    def test_an_equal_length_replace_is_not_a_correspondence(self):
        source = ["однаковий", "праймері каже одне", "теж інше", "кінець"]
        target = ["однаковий", "дерайвед каже інше", "зовсім не те", "кінець"]

        mapping = align_blocks(source, target)

        assert mapping == {0: 0, 3: 3}, "only blocks that actually match may map"

    def test_an_uneven_replace_run_maps_nothing_rather_than_guessing(self):
        source = ["вступ", "ааа", "ббб", "ввв", "кінець"]
        target = ["вступ", "ххх", "ууу", "кінець"]

        assert align_blocks(source, target) == {0: 0, 4: 3}

    def test_a_divergent_block_is_never_overwritten_from_the_primary(self):
        """The clobber: editing primary block 1 must not rewrite a derived
        block that never held the primary's text in the first place."""
        primary_old = ["однаковий", "праймері каже одне", "кінець"]
        primary_new = ["однаковий", "праймері каже ВИПРАВЛЕНО", "кінець"]
        derived_old = ["однаковий", "дерайвед каже інше", "кінець"]
        derived_blocks = [
            {"idx": 1, "text": "однаковий", "start_ms": 0, "end_ms": 1000},
            {"idx": 2, "text": "дерайвед каже інше", "start_ms": 1000, "end_ms": 2000},
            {"idx": 3, "text": "кінець", "start_ms": 2000, "end_ms": 3000},
        ]

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, derived_blocks)

        assert "error" not in result, result
        assert derived_blocks[1]["text"] == "дерайвед каже інше", "a block that never matched must not be rewritten"
        assert result["changed"] == 0


class TestSkippedEditsAreCounted:
    """A skip is legitimate but must never be invisible.

    A derived cut that is a strict excerpt genuinely lacks most of the primary,
    and skipping an edit there is correct. But a `derived` video is supposed to
    mirror its primary, so an edit that does not arrive is something a reviewer
    has to be able to see — silence is what makes a lost correction invisible.
    1988-05-08_Sahasrara-Puja's Talk cut is a separate translation of the same
    words: 123 of its 382 blocks do not match, so edits there simply do not
    land until the video is rebuilt.
    """

    def test_an_edit_with_no_counterpart_is_reported(self):
        primary_old = ["спільний", "лише у праймері", "кінець"]
        primary_new = ["спільний", "лише у праймері ЗМІНЕНО", "кінець"]
        derived_old = ["спільний", "кінець"]
        derived_blocks = [
            {"idx": 1, "text": "спільний", "start_ms": 0, "end_ms": 1000},
            {"idx": 2, "text": "кінець", "start_ms": 1000, "end_ms": 2000},
        ]

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, derived_blocks)

        assert "error" not in result, result
        assert result["changed"] == 0
        assert result["skipped"] == 1, "a skipped edit must be counted, not swallowed"

    def test_nothing_skipped_when_every_edit_lands(self):
        primary_old = ["один", "два"]
        primary_new = ["один", "ДВА"]
        derived_old = ["один", "два"]
        derived_blocks = [
            {"idx": 1, "text": "один", "start_ms": 0, "end_ms": 1000},
            {"idx": 2, "text": "два", "start_ms": 1000, "end_ms": 2000},
        ]

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, derived_blocks)

        assert result["changed"] == 1
        assert result["skipped"] == 0


class TestTextOnTheDerivedCutIsFoundWhicheverWayItWasCut:
    """The stranded check asks whether an unplaceable edit's text is on the
    derived video under a different cut.

    It looked for the primary's whole block inside a single unmapped derived
    block, which only ever matches when the derived cut MERGED what the
    primary split. The opposite is just as common — the derived cut splits one
    primary block across two — and there the text is on screen with a block
    boundary through the middle of it. Across the corpus's 68 derived pairs
    that direction is the more frequent of the two, and every instance took
    the silent path this check exists to close.
    """

    def test_an_edit_whose_text_the_derived_cut_split_is_not_skipped_silently(self):
        primary_old = ["Перше речення. Друге речення.", "Третє."]
        primary_new = ["Перше речення. ВИПРАВЛЕНО.", "Третє."]
        derived_old = ["Перше речення.", "Друге речення.", "Третє."]
        blocks = _blocks(*derived_old)

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, blocks)

        assert "error" in result, "the edited text is on the derived video, split across two of its blocks"
        assert [b["text"] for b in blocks] == derived_old, "nothing may be written when an edit cannot be placed"

    def test_text_that_is_genuinely_absent_is_still_a_quiet_skip(self):
        """A Talk cut is a strict excerpt — most of the primary is not on it."""
        primary_old = ["Лише у повному записі.", "Спільне речення."]
        primary_new = ["Лише у повному записі, змінено.", "Спільне речення."]
        derived_old = ["Спільне речення."]
        blocks = _blocks(*derived_old)

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, blocks)

        assert result == {"changed": 0, "removed": 0, "skipped": 1}


class TestADeletionIsAnEditToo:
    """A block deleted from the primary has to leave the derived video too.

    The stranded check and the skipped count both walked the edits only, so a
    deletion that could not be placed vanished twice over: no error, and not
    even a count. The sentence a human removed from the talk then stayed on
    the derived video for good, under a green check — and unlike a missed
    replacement, no later run can notice it is stale.
    """

    def test_a_deletion_whose_text_is_on_the_derived_cut_fails_loudly(self):
        primary_old = ["Перше речення.", "Друге речення.", "Третє."]
        primary_new = ["Друге речення.", "Третє."]
        derived_old = ["Перше речення. Друге речення.", "Третє."]
        blocks = _blocks(*derived_old)

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, blocks)

        assert "error" in result, "the deleted sentence is on the derived video inside a merged block"
        assert [b["text"] for b in blocks] == derived_old

    def test_a_deletion_with_no_counterpart_is_counted(self):
        primary_old = ["Один.", "Лише у повному записі.", "Три."]
        primary_new = ["Один.", "Три."]
        derived_old = ["Один.", "Три."]
        blocks = _blocks(*derived_old)

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, blocks)

        assert result == {"changed": 0, "removed": 0, "skipped": 1}, (
            "a deletion that did not travel must read as skipped work, not as nothing to do"
        )


class TestTheRefusalSaysWhatHappened:
    """A block structure the propagation cannot follow stops the run.

    The message reported the arithmetic difference between the two block
    counts, which reads as «the primary gained -1 block(s)» whenever difflib
    bundles an edit and a deletion into one group — a shape a reviewer meets
    on a perfectly ordinary PR. It is the only thing they are given to act on.
    """

    def test_an_edit_bundled_with_a_deletion_is_described_plainly(self):
        blocks = _blocks("Один.", "Два.", "Три.")

        result = propagate_primary_to_derived(
            ["Один.", "Два.", "Три."], ["Одне.", "Три."], ["Один.", "Два.", "Три."], blocks
        )

        assert "error" in result
        assert "-1" not in result["error"], result["error"]
        assert "2 block(s) became 1" in result["error"], result["error"]

    def test_an_insertion_is_described_the_same_way(self):
        blocks = _blocks("Один.", "Три.")

        result = propagate_primary_to_derived(["Один.", "Три."], ["Один.", "Два.", "Три."], ["Один.", "Три."], blocks)

        assert "error" in result
        assert "0 block(s) became 1" in result["error"], result["error"]
