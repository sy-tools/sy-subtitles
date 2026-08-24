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
