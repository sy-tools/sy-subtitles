"""Design-system guard: my-work badge colour follows PR/issue state.

Expert mode badges every card with the signed-in user's PRs and issues. A
MERGED PR used to render in --accent-green — the very colour an open item
reads as — so a card advertised finished work as still in flight (reported
on PR #912, which showed green in the "my work" list days after it landed).

The badge palette mirrors GitHub's own state semantics, which is what a
reviewer already reads these colours as:

    draft   grey   — not yet up for review
    open    green  — live, awaiting action
    merged  plum   — landed
    closed  red    — ended without landing

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
    "closed": "--accent-red",
}


def _badge_colour(state: str) -> str | None:
    css = COMPONENTS.read_text(encoding="utf-8")
    rule = re.search(rf"\.work-badge--{state}\s*\{{([^}}]*)\}}", css)
    assert rule, f".work-badge--{state} has no rule in components.css"
    colour = re.search(r"(?<!-)\bcolor:\s*var\((--[a-z0-9-]+)\)", rule.group(1))
    return colour.group(1) if colour else None


def test_each_state_uses_its_own_semantic_colour() -> None:
    actual = {state: _badge_colour(state) for state in EXPECTED}
    assert actual == EXPECTED, f"badge colours drifted from the state semantics: {actual}"


def test_no_two_states_share_a_colour() -> None:
    # The whole point is telling states apart at a glance; two states on one
    # token makes the badge decorative.
    used = [_badge_colour(state) for state in EXPECTED]
    assert len(set(used)) == len(used), f"states share a colour: {used}"
