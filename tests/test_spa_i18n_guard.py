"""CI guard against the "sticky tooltip on language toggle" anti-pattern.

``SPA.toggleLang()`` refreshes the UI by calling ``translatePage()``, which
only rewrites elements carrying a ``data-i18n``/``data-i18n-title``/
``data-i18n-aria-label``/``data-i18n-placeholder`` attribute. A tooltip or
label assigned *imperatively* from ``t(...)`` (e.g. ``el.title = t('key')``)
is invisible to that pass, so unless it is refreshed some other way it sticks
in the previous language after a toggle — the exact bug this guard prevents.

An imperative ``t(...)`` title/label is allowed only when it is kept fresh by
one of two established patterns:

* **self-synced** — the same block also sets the matching ``data-i18n-*``
  attribute (see ``updateToggleBtn`` / ``applyPreviewMode`` / ``makeDragHandle``),
  so the next ``translatePage()`` re-translates it; or
* **handler-refreshed / transient** — an explicit ``ALLOWLIST`` entry, each with
  a reason for why the string stays correct across a language toggle.

Anything else fails this test, forcing a conscious choice: wire ``data-i18n-*``
(preferred) or justify an allowlist entry.

Scope: this catches the common *direct* form (``.title =``/``aria-label``/
``.placeholder =`` assigned from ``t(...)`` on one line). It does not chase
``t(...)`` passed through a helper's arguments — those helpers must set the
``data-i18n-*`` attributes themselves (``makeDragHandle`` now does).

It reads index.html and every script the page loads (``tests/spa_sources.py``):
a tooltip set from a module sticks exactly as one set inline does.

Runs under the normal ``python -m pytest tests/`` step in ci.yml.
"""

from collections import Counter

import pytest

from tests.spa_sources import spa_sources

# `.title =`, `.placeholder =`, or setAttribute('aria-label', ...) whose RHS
# calls t(...) on the same line.
_SURFACES = (".title =", ".placeholder =", "setAttribute('aria-label',", 'setAttribute("aria-label",')
_DATA_I18N = ("data-i18n-title", "data-i18n-aria-label", "data-i18n-placeholder")
_WINDOW = 6

# Imperative translated titles/labels that translatePage() never sees but that
# stay correct across a language toggle for the stated reason. Keys are the
# stripped source line; keep each reason accurate if you touch the code.
ALLOWLIST = {
    # Avatar tooltip is composite ("signed in as" + the GitHub login + the
    # read-only suffix), so it can't be a plain data-i18n-title.
    # SPA.toggleLang() calls updateAuthUI(), which re-applies it in the
    # current language. (test_spa_auth_e2e.py:
    # test_avatar_tooltip_refreshes_on_language_toggle)
    "avatar.title = t('auth.signed_in') + ' ' + user.login + (writeUser ? '' : ' ' + t('auth.readonly_title'));",
    # Passphrase-gate reveal button lives in a modal shown BEFORE the app UI, so
    # the language toggle isn't reachable while it's up, and it's rebuilt each
    # time the gate opens.
    "reveal.setAttribute('aria-label', t('gate.reveal'));",
    "reveal.title = t('gate.reveal');",
    "reveal.setAttribute('aria-label', show ? t('gate.hide') : t('gate.reveal'));",
    "reveal.title = show ? t('gate.hide') : t('gate.reveal');",
    # The export button's tooltip is one of two whole sentences chosen by the
    # sync state, and the video item's names the previewed subtitle language
    # ({lang} is substituted in) — neither can be a plain data-i18n-title.
    # translatePage() calls updateExportUi(), which re-composes both in the
    # current language — pinned by tests/test_spa_cache.js
    # ("re-composes the render button's tooltip on a language toggle").
    "btn.title = unsettled ? t('burn.wait_for_sync') : t('export.title');",
    "item.title = s.reasonKey === 'burn.wrong_lang' ? burnWrongLangText() : '';",
}

# Defects, not exceptions: (source, stripped line) of imperative translations
# that DO stick, kept here only so the guard can watch the rest of that file.
# The test holds this list to exactly what the scan finds, so it can only
# shrink — fixing a line means deleting its entry, and nothing may be added.
KNOWN_VIOLATIONS = [
    # The help sheet's edit form is drawn by helpAdminRender() and by nothing
    # else: showHelp() skips its redraw while edit mode is on, and
    # SPA.toggleLang() never reaches it. Leave the sheet in edit mode, switch
    # the language, open it again — the form is still in the old one.
    ("js/help_admin_view.js", "where.setAttribute('aria-label', t('help.admin.section'));"),
    ("js/help_admin_view.js", "where.setAttribute('aria-label', t('help.admin.section'));"),
    ("js/help_admin_view.js", "input.setAttribute('aria-label', t(video ? 'help.admin.replace' : 'help.admin.file'));"),
    ("js/help_admin_view.js", "if (model.dirty) go.title = t('help.admin.saveFirst');"),
]


def _is_imperative_translation(line: str) -> bool:
    if "t(" not in line:
        return False
    if not any(s in line for s in _SURFACES):
        return False
    # translatePage() itself IS the engine: it feeds data-i18n-* keys to t().
    if "t(el.getAttribute(" in line:
        return False
    # document.title is the browser-tab title, a different surface re-set on
    # every view render — not a persistent on-page tooltip/label.
    return "document.title" not in line


def find_violations(text: str):
    """Return (line_no, stripped_line) for each unguarded imperative t() title."""
    lines = text.splitlines()
    out = []
    for i, line in enumerate(lines):
        if not _is_imperative_translation(line):
            continue
        window = lines[max(0, i - _WINDOW) : i + _WINDOW + 1]
        if any(key in w for w in window for key in _DATA_I18N):
            continue  # self-synced: a sibling data-i18n-* keeps it fresh
        if line.strip() in ALLOWLIST:
            continue  # documented handler-refreshed / transient exception
        out.append((i + 1, line.strip()))
    return out


def _new_and_fixed():
    """Split the scan against KNOWN_VIOLATIONS, entry for entry.

    Returns (new, fixed): the violations no entry accounts for, as (source,
    line_no, stripped_line), and the entries no violation accounts for.
    """
    unmatched = Counter(KNOWN_VIOLATIONS)
    new = []
    for name, text in spa_sources():
        for n, ln in find_violations(text):
            if unmatched[(name, ln)] > 0:
                unmatched[(name, ln)] -= 1
            else:
                new.append((name, n, ln))
    return new, sorted(unmatched.elements())


def test_no_unguarded_imperative_translation():
    violations, _ = _new_and_fixed()
    assert not violations, (
        "Imperative t() title/label(s) that translatePage() won't refresh on a "
        "language toggle (they'd stick in the old language). Wire a matching "
        "data-i18n-* attribute, or add to ALLOWLIST with a reason:\n"
        + "\n".join(f"  {name}:{n}: {ln}" for name, n, ln in violations)
    )


def test_known_violations_holds_nothing_already_fixed():
    _, fixed = _new_and_fixed()
    assert not fixed, (
        "KNOWN_VIOLATIONS lists a line the scan no longer flags — it was fixed "
        "or moved, so delete its entry:\n" + "\n".join(f"  {name}: {ln}" for name, ln in fixed)
    )


@pytest.mark.parametrize(
    "snippet",
    [
        "  avatar.title = t('auth.signed_in');",  # bare title, no data-i18n, not allowlisted
        "  h.setAttribute('aria-label', t('some.key'));",
        '  el.placeholder = t("search.placeholder");',
    ],
)
def test_detector_flags_bare_imperative_title(snippet):
    """The detector must not be vacuous: an unguarded imperative t() title is
    flagged when it has no sibling data-i18n-* and isn't allowlisted."""
    assert find_violations(snippet) == [(1, snippet.strip())]


def test_detector_accepts_self_synced_block():
    """A sibling data-i18n-* within the window clears the same imperative line."""
    block = "  btn.title = t('title.show_video');\n  btn.setAttribute('data-i18n-title', 'title.show_video');\n"
    assert find_violations(block) == []
