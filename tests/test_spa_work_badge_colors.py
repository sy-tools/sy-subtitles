"""Design-system guard: my-work badge colour follows PR/issue state.

Expert mode badges every card with the signed-in user's PRs and issues. A
MERGED PR used to render in --accent-green — the very colour an open item
reads as — so a card advertised finished work as still in flight (reported
on PR #912, which showed green in the "my work" list days after it landed).

The badge palette mirrors GitHub's own state semantics, which is what a
reviewer already reads these colours as — four MEANINGS, shared by PRs and
issues alike:

    draft    grey   — not up yet
    open     green  — live, awaiting action
    merged   plum   — a PR landed
    closed   plum   — an issue got done (GitHub's "completed")
    dropped  red    — an issue ended as "not planned"

merged and closed intentionally share plum: a landed PR and a completed
issue mean the same thing to whoever scans the list, and the "PR " prefix
already tells the two kinds apart.

Structural guard: components.css must map each state to that token. The
computed values themselves (both themes) are covered by
tests/test_spa_theme_tokens.py.
"""

import re
from pathlib import Path

COMPONENTS = Path(__file__).parent.parent / "site" / "css" / "components.css"

EXPECTED = {
    "draft": "--fg5",
    "open": "--accent-green",
    "merged": "--accent-purple",
    "closed": "--accent-purple",
    "dropped": "--accent-red",
}
MEANINGS = {"--fg5", "--accent-green", "--accent-purple", "--accent-red"}


def _badge_colour(state: str) -> str | None:
    css = COMPONENTS.read_text(encoding="utf-8")
    rule = re.search(rf"\.work-badge--{state}\s*\{{([^}}]*)\}}", css)
    assert rule, f".work-badge--{state} has no rule in components.css"
    colour = re.search(r"(?<!-)\bcolor:\s*var\((--[a-z0-9-]+)\)", rule.group(1))
    return colour.group(1) if colour else None


def test_each_state_uses_its_own_semantic_colour() -> None:
    actual = {state: _badge_colour(state) for state in EXPECTED}
    assert actual == EXPECTED, f"badge colours drifted from the state semantics: {actual}"


def test_the_palette_spans_all_four_meanings() -> None:
    # The whole point is telling states apart at a glance. Collapsing the
    # palette (as orange-for-both-draft-and-open did) makes the badge
    # decorative; every meaning must still be reachable.
    used = {_badge_colour(state) for state in EXPECTED}
    assert used == MEANINGS, f"badge palette no longer spans the four meanings: {sorted(used)}"
