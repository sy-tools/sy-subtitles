"""The add-talk screen has to declare each video's sync role.

tools/video_roles.py refuses to guess, so a multi-video talk added without a
`sync:` declaration cannot be synced OR built by the pipeline. The form is
where that declaration is made, and this guards the wiring — the behaviour
itself is covered by tests/test_add_talk_data.js and the boot smoke.
"""

import re
from pathlib import Path

from tests.spa_sources import spa_sources
from tools import video_roles

SITE = Path(__file__).parent.parent / "site"
ROLES = ("primary", "derived", "independent", "ignored")
HELPERS = "js/add_talk_data.js"


def _app() -> str:
    """index.html and every script it loads: the form, wherever its code lives."""
    return "\n".join(text for _, text in spa_sources())


def _callers() -> str:
    """The app minus the module that defines the helpers.

    A helper's own definition spells its name too, and must not be what
    satisfies "the form calls it".
    """
    return "\n".join(text for name, text in spa_sources() if name != HELPERS)


def test_the_module_and_the_python_resolver_share_one_vocabulary():
    """Set equality, not "each name appears somewhere".

    A containment check cannot see a role added to one side only, and the
    Python names occur all over that module anyway.
    """
    js = (SITE / HELPERS).read_text(encoding="utf-8")
    declared = re.search(r"var SYNC_ROLES = \[(.*?)\]", js, re.S)
    assert declared, "SYNC_ROLES is not declared as a literal array"
    js_roles = set(re.findall(r"'([a-z]+)'", declared.group(1)))

    assert js_roles == set(video_roles.ROLES)


def test_the_form_offers_every_role():
    app = _app()
    assert "add-video-sync" in app, "the per-video row needs a role control"
    assert "SYNC_ROLES.map" in app, "the options must come from the shared list, not a copy"
    for role in ROLES:
        assert f"'add.sync_{role}'" in app, f"{role} has no label"


def test_the_default_is_applied_from_the_shared_helper():
    assert "syncRolesForRows(" in _callers(), "roles must be seeded over the rows that are emitted"
    assert "applyDefaultSyncRoles" in _app()


def test_the_form_refuses_roles_video_roles_would_reject():
    """video_roles rejects such a talk outright, and the editor would only
    learn about it from a red check long after the PR was opened. The rule
    (one primary, or none when every part is independent) lives in the
    tested module, not in an inline copy."""
    app = _app()
    assert "syncRolesAcceptable(" in _callers()
    assert "sync: primary'; }).length !== 1" not in app, "the old one-primary-only check is back"
    assert "add.sync_needs_one_primary" in app
    for lang_block in ("'add.sync_ignored': 'Ignored',", "'add.sync_ignored': '"):
        assert lang_block in app
    assert app.count("'add.sync_needs_one_primary'") >= 3, "the message needs both translations and a use"


def test_the_control_is_in_the_styleguide():
    """CLAUDE.md: a new component ships its catalog entry in the same change."""
    guide = (SITE / "styleguide.html").read_text(encoding="utf-8")
    assert "Sync" in guide
    assert "video_roles" in guide, "the catalog should say where the vocabulary comes from"
