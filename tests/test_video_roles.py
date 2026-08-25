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

from tools.video_roles import RoleError, derived_slugs, primary_slug, resolve_roles


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
    """Letters carry a transcript and no video. There is no sync model to
    get wrong, so this is not an error — but nothing is primary either."""
    talk = _talk(tmp_path, {"title": "Letter"})
    assert resolve_roles(talk) == {}
    with pytest.raises(RoleError, match="no video"):
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
