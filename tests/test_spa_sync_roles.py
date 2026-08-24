"""The add-talk screen has to declare each video's sync role.

tools/video_roles.py refuses to guess, so a multi-video talk added without a
`sync:` declaration cannot be synced OR built by the pipeline. The form is
where that declaration is made, and this guards the wiring — the behaviour
itself is covered by tests/test_add_talk_data.js and the boot smoke.
"""

from pathlib import Path

SITE = Path(__file__).parent.parent / "site"
ROLES = ("primary", "derived", "independent", "ignored")


def test_the_module_and_the_python_resolver_share_one_vocabulary():
    js = (SITE / "js" / "add_talk_data.js").read_text(encoding="utf-8")
    py = (Path(__file__).parent.parent / "tools" / "video_roles.py").read_text(encoding="utf-8")
    for role in ROLES:
        assert f"'{role}'" in js, f"{role} missing from the SPA's role list"
        assert f'"{role}"' in py, f"{role} missing from tools/video_roles.py"


def test_the_form_offers_every_role():
    index = (SITE / "index.html").read_text(encoding="utf-8")
    assert "add-video-sync" in index, "the per-video row needs a role control"
    assert "SYNC_ROLES.map" in index, "the options must come from the shared list, not a copy"
    for role in ROLES:
        assert f"'add.sync_{role}'" in index, f"{role} has no label"


def test_the_default_is_applied_from_the_shared_helper():
    index = (SITE / "index.html").read_text(encoding="utf-8")
    assert "defaultSyncRoles(" in index
    assert "applyDefaultSyncRoles" in index


def test_the_control_is_in_the_styleguide():
    """CLAUDE.md: a new component ships its catalog entry in the same change."""
    guide = (SITE / "styleguide.html").read_text(encoding="utf-8")
    assert "Sync" in guide
    assert "video_roles" in guide, "the catalog should say where the vocabulary comes from"
