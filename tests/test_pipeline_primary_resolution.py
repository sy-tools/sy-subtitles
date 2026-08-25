"""The pipeline must ask tools.video_roles which video is primary.

It used to guess, twice, with two non-identical copies of the same heuristic
— whichever video had the most words in whisper.json, one copy falling back
to meta['videos'][0] with a warning and the other not. The guess disagrees
with the declaration on 1998-05-10, whose Talk cut really is the
authoritative recording, and it cannot answer at all before whisper has run.
"""

from pathlib import Path

WORKFLOW = Path(__file__).parent.parent / ".github" / "workflows" / "subtitle-pipeline.yml"


def _text() -> str:
    return WORKFLOW.read_text(encoding="utf-8")


def test_the_whisper_word_count_heuristic_is_gone():
    text = _text()
    assert "best_words" not in text, "the pipeline must not pick the primary by counting whisper words"
    assert "best_slug" not in text


def test_the_primary_is_resolved_through_the_shared_module():
    text = _text()
    assert text.count("tools.video_roles --talk-dir") >= 2, (
        "both the prepare step and the snapshot check must resolve the primary the same way"
    )
    assert "--role primary" in text


def test_every_primary_lookup_guards_against_an_empty_answer():
    """`--role primary` can succeed and print nothing.

    resolve_roles answers with an all-`ignored` map for a multi-video talk
    that declares nothing and has no built subtitles yet, so the CLI exits 0
    with no output. An unguarded call then carries an empty slug into a path,
    where `tests/fixtures/pipeline_snapshots/<talk>/` exists as a directory
    and the -d check waves it through.

    Counting the annotation is not enough. `::error::` writes a line into the
    log and sets no exit status — the same shape the sync driver had to have
    removed from `_list_changed` — so a guard that annotates and carries on is
    no guard at all. Each one must also fail its step.
    """
    lines = _text().splitlines()
    lookups = sum(1 for line in lines if "tools.video_roles --talk-dir" in line)
    guards = 0
    for i, line in enumerate(lines):
        if "no video declares 'sync: primary' in meta.yaml" not in line:
            continue
        if any(later.strip() == "exit 1" for later in lines[i + 1 : i + 4]):
            guards += 1

    assert guards == lookups, f"{lookups} primary lookups but only {guards} of them stop the step"
