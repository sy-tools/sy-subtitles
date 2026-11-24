"""The one interpreter of the `sync:` model in meta.yaml.

Every other consumer — sync_pr, build_secondary_srts, the pipeline —
resolves roles through here, so the model cannot drift between them the way
build_manifest.yaml's `role` did (one talk carries three primaries, eight
legacy talks carry none).
"""

import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from tools.video_roles import RoleError, build_slugs, derived_slugs, primary_slug, resolve_roles, text_only


def _talk(tmp_path, meta: dict, srt_slugs=()):
    talk = tmp_path / "talks" / "1990-01-01_Some-Talk"
    talk.mkdir(parents=True)
    (talk / "meta.yaml").write_text(yaml.safe_dump(meta, allow_unicode=True), encoding="utf-8")
    for slug in srt_slugs:
        final = talk / slug / "final"
        final.mkdir(parents=True)
        (final / "uk.srt").write_text("1\n00:00:01,000 --> 00:00:02,000\nтекст\n", encoding="utf-8")
    return talk


def test_single_subtitled_video_is_primary_without_a_declaration(tmp_path):
    talk = _talk(tmp_path, {"videos": [{"slug": "Only-Video"}]}, srt_slugs=["Only-Video"])
    assert resolve_roles(talk) == {"Only-Video": "primary"}
    assert primary_slug(talk) == "Only-Video"


def test_a_talk_with_no_videos_resolves_to_nothing(tmp_path):
    """A text-only talk carries a transcript and no video. There is no sync model to
    get wrong, so this is not an error — but nothing is primary either."""
    talk = _talk(tmp_path, {"title": "Text-only talk"})
    assert resolve_roles(talk) == {}
    with pytest.raises(RoleError, match="no video"):
        primary_slug(talk)


def test_a_lone_video_is_primary_before_it_has_any_subtitles(tmp_path):
    """The pipeline asks for the primary at the START of a build, when the
    talk has no uk.srt anywhere. A single-video talk never needs a
    declaration, so it must still answer."""
    talk = _talk(tmp_path, {"videos": [{"slug": "Only-Video"}]})
    assert resolve_roles(talk) == {"Only-Video": "primary"}
    assert primary_slug(talk) == "Only-Video"


def test_a_multi_video_talk_with_no_subtitles_yet_must_still_declare(tmp_path):
    """Nothing can pick between them, and guessing is what this removes."""
    talk = _talk(tmp_path, {"videos": [{"slug": "Puja"}, {"slug": "Puja-Talk"}]})
    with pytest.raises(RoleError):
        primary_slug(talk)


def test_multi_video_talk_without_declarations_is_a_hard_error(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Puja"}, {"slug": "Puja-Talk"}]},
        srt_slugs=["Puja", "Puja-Talk"],
    )
    with pytest.raises(RoleError) as exc:
        resolve_roles(talk)
    assert "1990-01-01_Some-Talk" in str(exc.value), "the error must name the talk"
    assert "Puja-Talk" in str(exc.value), "the error must name the undeclared videos"


def test_declared_roles_are_returned_verbatim(tmp_path):
    talk = _talk(
        tmp_path,
        {
            "videos": [
                {"slug": "Puja", "sync": "primary"},
                {"slug": "Puja-Talk", "sync": "derived"},
                {"slug": "After-Puja", "sync": "independent"},
                {"slug": "Yogi-Intro", "sync": "ignored"},
            ]
        },
        srt_slugs=["Puja", "Puja-Talk", "After-Puja"],
    )
    assert resolve_roles(talk) == {
        "Puja": "primary",
        "Puja-Talk": "derived",
        "After-Puja": "independent",
        "Yogi-Intro": "ignored",
    }
    assert primary_slug(talk) == "Puja"
    assert derived_slugs(talk) == ["Puja-Talk"], "independent and ignored are not derived"


def test_two_primaries_are_rejected(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A", "sync": "primary"}, {"slug": "B", "sync": "primary"}]},
        srt_slugs=["A", "B"],
    )
    with pytest.raises(RoleError, match="exactly one"):
        resolve_roles(talk)


def test_no_primary_is_rejected(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A", "sync": "derived"}, {"slug": "B", "sync": "ignored"}]},
        srt_slugs=["A", "B"],
    )
    with pytest.raises(RoleError, match="exactly one"):
        resolve_roles(talk)


def test_a_talk_of_only_independent_videos_needs_no_primary(tmp_path):
    """A workshop on four tapes: each tape is its own slice of one transcript,
    and none of them is the authoritative recording the others mirror."""
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": f"Part-{i}", "sync": "independent"} for i in (1, 2, 3)]},
    )
    assert resolve_roles(talk) == {"Part-1": "independent", "Part-2": "independent", "Part-3": "independent"}


def test_independent_videos_may_sit_beside_ignored_ones_without_a_primary(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Tape-1", "sync": "independent"}, {"slug": "Music", "sync": "ignored"}]},
    )
    assert resolve_roles(talk) == {"Tape-1": "independent", "Music": "ignored"}


def test_a_derived_video_still_needs_a_primary_to_mirror(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A", "sync": "independent"}, {"slug": "B", "sync": "derived"}]},
    )
    with pytest.raises(RoleError, match="exactly one"):
        resolve_roles(talk)


def test_build_slugs_are_the_primary_first_then_every_independent(tmp_path):
    talk = _talk(
        tmp_path,
        {
            "videos": [
                {"slug": "Talk-After", "sync": "independent"},
                {"slug": "Puja", "sync": "primary"},
                {"slug": "Puja-Talk", "sync": "derived"},
                {"slug": "Music", "sync": "ignored"},
                {"slug": "Second-Talk", "sync": "independent"},
            ]
        },
    )
    assert build_slugs(talk) == ["Puja", "Talk-After", "Second-Talk"]


def test_build_slugs_without_a_primary(tmp_path):
    talk = _talk(
        tmp_path, {"videos": [{"slug": "Part-2", "sync": "independent"}, {"slug": "Part-1", "sync": "independent"}]}
    )
    assert build_slugs(talk) == ["Part-2", "Part-1"]


def test_build_slugs_of_a_lone_video(tmp_path):
    talk = _talk(tmp_path, {"videos": [{"slug": "Talk"}]})
    assert build_slugs(talk) == ["Talk"]


def test_cli_prints_the_build_videos(tmp_path):
    talk = _talk(tmp_path, {"videos": [{"slug": "P1", "sync": "independent"}, {"slug": "P2", "sync": "independent"}]})
    out = subprocess.run(
        [sys.executable, "-m", "tools.video_roles", "--talk-dir", str(talk), "--build-videos"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert out.stdout.split() == ["P1", "P2"]


def test_an_unknown_role_value_is_rejected(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "A", "sync": "primary"}, {"slug": "B", "sync": "secondary"}]},
        srt_slugs=["A", "B"],
    )
    with pytest.raises(RoleError, match="secondary"):
        resolve_roles(talk)


def test_extra_videos_without_subtitles_do_not_force_a_declaration(tmp_path):
    """A talk whose second video has no uk.srt still resolves: only videos
    that actually carry subtitles participate in the model."""
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Only-Subtitled"}, {"slug": "No-Subs"}]},
        srt_slugs=["Only-Subtitled"],
    )
    assert resolve_roles(talk)["Only-Subtitled"] == "primary"
    assert resolve_roles(talk)["No-Subs"] == "ignored"


def test_a_declaration_outranks_the_single_video_shortcut(tmp_path):
    """A derived video whose subtitles have not been built yet is still
    derived. Letting the shortcut answer would silently discard the
    declaration and make the role flip when the SRT lands."""
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Puja", "sync": "primary"}, {"slug": "Puja-Talk", "sync": "derived"}]},
        srt_slugs=["Puja"],
    )
    assert resolve_roles(talk) == {"Puja": "primary", "Puja-Talk": "derived"}
    assert derived_slugs(talk) == ["Puja-Talk"]


def test_cli_prints_the_primary_slug(tmp_path):
    talk = _talk(
        tmp_path,
        {"videos": [{"slug": "Puja", "sync": "primary"}, {"slug": "Puja-Talk", "sync": "derived"}]},
        srt_slugs=["Puja", "Puja-Talk"],
    )
    out = subprocess.run(
        [sys.executable, "-m", "tools.video_roles", "--talk-dir", str(talk), "--role", "primary"],
        capture_output=True,
        text=True,
        check=True,
    )
    assert out.stdout.strip() == "Puja"


def test_cli_exits_nonzero_and_annotates_on_a_missing_declaration(tmp_path):
    talk = _talk(tmp_path, {"videos": [{"slug": "A"}, {"slug": "B"}]}, srt_slugs=["A", "B"])
    out = subprocess.run(
        [sys.executable, "-m", "tools.video_roles", "--talk-dir", str(talk)],
        capture_output=True,
        text=True,
    )
    assert out.returncode == 1
    assert "::error::" in out.stderr


def test_every_multi_video_talk_in_the_corpus_resolves():
    """A talk that cannot resolve would fail its next sync run. Catch it
    here instead of in CI on someone's PR."""
    failures = []
    for meta_p in sorted(Path("talks").glob("*/meta.yaml")):
        try:
            resolve_roles(meta_p.parent)
        except RoleError as exc:
            failures.append(str(exc))
    assert not failures, "talks with an unresolvable sync model:\n" + "\n".join(failures)


def test_only_an_explicit_declaration_counts_as_declared_ignored(tmp_path):
    from tools.video_roles import declared_ignored_slugs

    talk = _talk(
        tmp_path,
        {
            "videos": [
                {"slug": "talk", "sync": "primary"},
                {"slug": "impressions", "sync": "ignored"},
                {"slug": "short", "sync": "derived"},
            ]
        },
    )
    assert declared_ignored_slugs(talk) == {"impressions"}


def test_an_undeclared_talk_has_no_declared_ignored_videos(tmp_path):
    """resolve_roles() calls every video of an undeclared, not-yet-built
    multi-video talk "ignored" — a default, not a decision. Whisper must not
    read that default as "skip", or a new talk would never get timestamps."""
    from tools.video_roles import declared_ignored_slugs

    talk = _talk(tmp_path, {"videos": [{"slug": "a"}, {"slug": "b"}]})
    assert set(resolve_roles(talk).values()) == {"ignored"}
    assert declared_ignored_slugs(talk) == set()


def test_declared_ignored_tolerates_a_talk_without_meta(tmp_path):
    from tools.video_roles import declared_ignored_slugs

    assert declared_ignored_slugs(tmp_path / "missing") == set()


# A text-only talk has no video left once the declared-ignored ones
# are dropped. The pipeline skips the build for it and every SPA surface shows
# only the transcript, so this is the one place that answers the question.


def test_text_only_without_a_videos_key(tmp_path):
    assert text_only(_talk(tmp_path, {"title": "Text-only talk"})) is True


def test_text_only_with_an_empty_videos_list(tmp_path):
    assert text_only(_talk(tmp_path, {"title": "Text-only talk", "videos": []})) is True


def test_text_only_when_every_video_is_declared_ignored(tmp_path):
    meta = {"videos": [{"slug": "Intro", "sync": "ignored"}, {"slug": "Music", "sync": "ignored"}]}
    assert text_only(_talk(tmp_path, meta)) is True


def test_a_talk_with_one_video_is_not_text_only(tmp_path):
    assert text_only(_talk(tmp_path, {"videos": [{"slug": "Talk"}]})) is False


def test_a_talk_with_videos_but_no_primary_is_not_text_only(tmp_path):
    """Undeclared videos are a broken sync model, not a text-only talk: the build
    must keep failing on them, so this must neither answer True nor raise."""
    meta = {"videos": [{"slug": "Talk"}, {"slug": "Short"}]}
    assert text_only(_talk(tmp_path, meta)) is False


def test_cli_prints_text_only(tmp_path):
    text_only_talk = _talk(tmp_path / "a", {"title": "Text-only talk"})
    talk = _talk(tmp_path / "b", {"videos": [{"slug": "Talk"}]})
    for path, expected in ((text_only_talk, "true"), (talk, "false")):
        out = subprocess.run(
            [sys.executable, "-m", "tools.video_roles", "--talk-dir", str(path), "--text-only"],
            capture_output=True,
            text=True,
            check=True,
        )
        assert out.stdout.strip() == expected
