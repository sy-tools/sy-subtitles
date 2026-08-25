"""The add-talk screen has to declare each video's sync role.

tools/video_roles.py refuses to guess, so a multi-video talk added without a
`sync:` declaration cannot be synced OR built by the pipeline. The form is
where that declaration is made, and this guards the wiring — the behaviour
itself is covered by tests/test_add_talk_data.js and the boot smoke.
"""

import re
from pathlib import Path

from tools import video_roles

SITE = Path(__file__).parent.parent / "site"
ROLES = ("primary", "derived", "independent", "ignored")


def test_the_module_and_the_python_resolver_share_one_vocabulary():
    """Set equality, not "each name appears somewhere".

    A containment check cannot see a role added to one side only, and the
    Python names occur all over that module anyway.
    """
    js = (SITE / "js" / "add_talk_data.js").read_text(encoding="utf-8")
    declared = re.search(r"var SYNC_ROLES = \[(.*?)\]", js, re.S)
    assert declared, "SYNC_ROLES is not declared as a literal array"
    js_roles = set(re.findall(r"'([a-z]+)'", declared.group(1)))

    assert js_roles == set(video_roles.ROLES)


def test_the_form_offers_every_role():
    index = (SITE / "index.html").read_text(encoding="utf-8")
    assert "add-video-sync" in index, "the per-video row needs a role control"
    assert "SYNC_ROLES.map" in index, "the options must come from the shared list, not a copy"
    for role in ROLES:
        assert f"'add.sync_{role}'" in index, f"{role} has no label"


def test_the_default_is_applied_from_the_shared_helper():
    index = (SITE / "index.html").read_text(encoding="utf-8")
    assert "syncRolesForRows(" in index, "roles must be seeded over the rows that are emitted"
    assert "applyDefaultSyncRoles" in index


def test_the_form_refuses_to_submit_without_exactly_one_primary():
    """video_roles rejects such a talk outright, and the editor would only
    learn about it from a red check long after the PR was opened."""
    index = (SITE / "index.html").read_text(encoding="utf-8")
    assert "add.sync_needs_one_primary" in index
    for lang_block in ("'add.sync_ignored': 'Ignored',", "'add.sync_ignored': '"):
        assert lang_block in index
    assert index.count("'add.sync_needs_one_primary'") >= 3, "the message needs both translations and a use"


def test_the_control_is_in_the_styleguide():
    """CLAUDE.md: a new component ships its catalog entry in the same change."""
    guide = (SITE / "styleguide.html").read_text(encoding="utf-8")
    assert "Sync" in guide
    assert "video_roles" in guide, "the catalog should say where the vocabulary comes from"
