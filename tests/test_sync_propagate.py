"""Copying the primary's text onto a derived video.

A derived video's subtitles ARE the primary's, on its own timeline. Routing
that through the transcript — a character diff against a block cut that was
never the same — is why derived videos went unsynced. The primary is right
there; the only question is which block matches which.
"""

from tools.sync_propagate import (
    Recut,
    align_blocks,
    extract_recuts,
    propagate_primary_to_derived,
    propagate_recuts_to_target,
)


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


class TestARecutTravelsAsOneUnit:
    """Moving a word across a block boundary is one indivisible change.

    A reviewer nudging «в» from the end of one subtitle to the start of the
    next (PR #1001, talks/1992-07-19_Guru-Puja blocks 178/179) edits two
    blocks that only make sense together. Propagated per-block, the half that
    lands without its partner either duplicates the word or — when the other
    half falls outside an excerpt cut — takes it off the screen entirely,
    while the run stays green.
    """

    def test_a_recut_whose_other_half_is_off_the_excerpt_keeps_the_word_on_screen(self):
        """The excerpt ends between the two blocks, so the block that would
        have received «в» is not on this video at all. Applying only the
        giving half deletes an audible word from the subtitles for good."""
        primary_old = ["Вступ.", "живиться, оберігається, контролюється абсолютно; в", "правильний час,"]
        primary_new = ["Вступ.", "живиться, оберігається, контролюється абсолютно;", "в правильний час,"]
        derived_old = ["Вступ.", "живиться, оберігається, контролюється абсолютно; в"]
        blocks = _blocks(*derived_old)

        result = propagate_primary_to_derived(primary_old, primary_new, derived_old, blocks)

        assert "error" in result, "half a re-cut cannot be applied without losing the moved word"
        assert [b["text"] for b in blocks] == derived_old, "nothing may be written when a re-cut cannot be placed whole"


class TestExtractRecuts:
    """Telling a re-cut apart from an edit, before either travels anywhere.

    The predicate is the one `sync_srt_to_transcript` already uses to keep a
    re-cut out of the transcript (tools/sync_srt_to_transcript.py:226): the two
    sides join to the same words. Here it decides the opposite question — the
    transcript does not want this change, so which channel does?
    """

    def test_a_word_moved_across_a_boundary_is_one_unit(self):
        old = ["Вступ.", "контролюється абсолютно; в", "правильний час,", "Кінець."]
        new = ["Вступ.", "контролюється абсолютно;", "в правильний час,", "Кінець."]

        recuts, err = extract_recuts(old, new)

        assert err is None
        assert recuts == [
            Recut(
                start=1,
                old_texts=("контролюється абсолютно; в", "правильний час,"),
                new_texts=("контролюється абсолютно;", "в правильний час,"),
            )
        ]

    def test_an_ordinary_text_edit_is_not_a_recut(self):
        recuts, err = extract_recuts(["Один.", "Два."], ["Один.", "ДВА."])
        assert err is None
        assert recuts == []

    def test_a_whitespace_only_change_to_one_block_is_an_edit_not_a_recut(self):
        """A re-cut redistributes words BETWEEN blocks; a single block whose
        spacing changed has no boundary to move."""
        recuts, err = extract_recuts(["Один    два."], ["Один два."])
        assert err is None
        assert recuts == []

    def test_a_merge_is_refused_by_name(self):
        """Two blocks joined into one need a cue `(start1, end2)` that never
        existed — `check_writes` forbids inventing it, rightly."""
        recuts, err = extract_recuts(["Перше речення.", "Друге речення."], ["Перше речення. Друге речення."])

        assert recuts == []
        assert err is not None
        assert "merge" in err["error"].lower(), err["error"]

    def test_a_split_is_refused_by_name(self):
        """The new boundary's timecode exists in no data source
        (feedback_no_proportional)."""
        recuts, err = extract_recuts(["Перше речення. Друге речення."], ["Перше речення.", "Друге речення."])

        assert recuts == []
        assert err is not None
        assert "split" in err["error"].lower(), err["error"]


class TestARecutReachesTheOtherVideo:
    def test_a_recut_lands_whole_on_a_video_that_mirrors_the_old_cut(self):
        source_old = ["Вступ.", "контролюється абсолютно; в", "правильний час,", "Кінець."]
        source_new = ["Вступ.", "контролюється абсолютно;", "в правильний час,", "Кінець."]
        blocks = _blocks(*source_old)
        cues_before = [(b["start_ms"], b["end_ms"]) for b in blocks]

        result = propagate_primary_to_derived(source_old, source_new, list(source_old), blocks)

        assert "error" not in result, result
        assert [b["text"] for b in blocks] == source_new
        assert [(b["start_ms"], b["end_ms"]) for b in blocks] == cues_before, "a re-cut moves words, never a cue"

    def test_a_recut_the_other_video_already_carries_is_a_noop(self):
        """PR #1001's shape: the human re-cut the derived video, so by the time
        the change reaches it from the primary it is already there."""
        source_old = ["Вступ.", "контролюється абсолютно; в", "правильний час,"]
        source_new = ["Вступ.", "контролюється абсолютно;", "в правильний час,"]
        target_old = list(source_new)
        blocks = _blocks(*target_old)

        result = propagate_primary_to_derived(source_old, source_new, target_old, blocks)

        assert "error" not in result, result
        assert [b["text"] for b in blocks] == target_old, "agreement is not a conflict"

    def test_a_recut_region_the_excerpt_lacks_entirely_is_skipped(self):
        source_old = ["Лише у повному записі; в", "повному записі далі,", "Спільне."]
        source_new = ["Лише у повному записі;", "в повному записі далі,", "Спільне."]
        target_old = ["Спільне."]
        blocks = _blocks(*target_old)

        result = propagate_primary_to_derived(source_old, source_new, target_old, blocks)

        assert "error" not in result, result
        assert [b["text"] for b in blocks] == target_old
        assert result["skipped"] == 1, "a re-cut that did not travel must read as skipped work"

    def test_a_recut_the_other_video_cut_differently_fails(self):
        """Both videos hold the words, split at different places. Placing the
        boundary would be a guess; skipping would lose the reviewer's work."""
        source_old = ["Вступ.", "контролюється абсолютно; в", "правильний час,"]
        source_new = ["Вступ.", "контролюється абсолютно;", "в правильний час,"]
        target_old = ["Вступ.", "контролюється", "абсолютно; в правильний час,"]
        blocks = _blocks(*target_old)

        result = propagate_primary_to_derived(source_old, source_new, target_old, blocks)

        assert "error" in result
        assert [b["text"] for b in blocks] == target_old, "nothing may be written when a re-cut cannot be placed"

    def test_duplicate_block_texts_do_not_mislead_placement(self):
        """51 of the corpus's 165 SRTs repeat a block text verbatim. Placement
        is positional; a matching phrase elsewhere must not attract the edit."""
        source_old = ["Гаразд.", "Інше.", "Гаразд.", "речення; в", "другій частині,"]
        source_new = ["Гаразд.", "Інше.", "Гаразд.", "речення;", "в другій частині,"]
        blocks = _blocks(*source_old)

        result = propagate_primary_to_derived(source_old, source_new, list(source_old), blocks)

        assert "error" not in result, result
        assert [b["text"] for b in blocks] == source_new


class TestARecutTravelsFromADerivedVideoToThePrimary:
    """The missing leg. `docs/subtitle-sync-redesign.md` §6 Step A calls for an
    edited derived SRT to be normalised onto the primary positionally; only
    the text half of it was ever built, so a boundary fix made on a derived
    video stranded there (PR #1001).
    """

    def test_a_boundary_fix_made_on_the_derived_video_reaches_the_primary(self):
        derived_old = ["Вступ.", "контролюється абсолютно; в", "правильний час,"]
        derived_new = ["Вступ.", "контролюється абсолютно;", "в правильний час,"]
        primary_blocks = _blocks(*derived_old)
        cues_before = [(b["start_ms"], b["end_ms"]) for b in primary_blocks]

        result = propagate_recuts_to_target(derived_old, derived_new, list(derived_old), primary_blocks)

        assert "error" not in result, result
        assert [b["text"] for b in primary_blocks] == derived_new
        assert result["recut"] == 1
        assert [(b["start_ms"], b["end_ms"]) for b in primary_blocks] == cues_before

    def test_a_plain_text_edit_is_left_for_the_transcript_path(self):
        """Text edits reach the primary through the transcript (Steps A and B).
        Carrying them here too would apply them twice — and Step B would then
        fail to find the old wording it is looking for."""
        derived_old = ["Вступ.", "Друге."]
        derived_new = ["Вступ.", "ДРУГЕ."]
        primary_blocks = _blocks(*derived_old)

        result = propagate_recuts_to_target(derived_old, derived_new, list(derived_old), primary_blocks)

        assert "error" not in result, result
        assert [b["text"] for b in primary_blocks] == derived_old, "only re-cuts travel on this leg"
        assert result["recut"] == 0

    def test_the_primary_is_never_clobbered_when_it_says_something_else(self):
        derived_old = ["Вступ.", "контролюється абсолютно; в", "правильний час,"]
        derived_new = ["Вступ.", "контролюється абсолютно;", "в правильний час,"]
        primary_old = ["Вступ.", "праймері каже щось інше; в", "правильний час,"]
        blocks = _blocks(*primary_old)

        result = propagate_recuts_to_target(derived_old, derived_new, primary_old, blocks)

        assert "error" in result
        assert [b["text"] for b in blocks] == primary_old
