"""Design-system guard: every colour token is documented in the live catalog.

The styleguide (site/styleguide.html) is the design system's contract — it is
rendered by the same tokens.css/components.css the app ships, so it can't drift.
But a NEW colour token can still slip in undocumented (as --sync-progress nearly
did): defined in tokens.css, used by a component, yet never shown in the catalog.

This guard fails when a colour token in tokens.css is missing from the styleguide,
forcing the swatch to be added in the same change. See CLAUDE.md "Design System —
Ship the catalog entry".
"""

import re
from pathlib import Path

SITE = Path(__file__).parent.parent / "site"

# Colour tokens that are functional (scrims / letterbox), not part of the
# showcased palette. Documented here rather than in a swatch, on purpose.
FUNCTIONAL_EXEMPT = {"--overlay-bg", "--player-letterbox"}

# A token whose value is a colour literal (#hex, rgb()/rgba(), hsl()/hsla()).
_COLOUR_TOKEN = re.compile(r"(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\()")


def _colour_tokens(css: str) -> set[str]:
    return {m.group(1) for m in _COLOUR_TOKEN.finditer(css)}


def test_every_palette_token_is_documented_in_the_styleguide():
    tokens_css = (SITE / "css" / "tokens.css").read_text(encoding="utf-8")
    styleguide = (SITE / "styleguide.html").read_text(encoding="utf-8")

    tokens = _colour_tokens(tokens_css)
    assert "--sync-progress" in tokens, "sanity: the colour-token regex should see --sync-progress"

    missing = sorted(t for t in tokens if t not in FUNCTIONAL_EXEMPT and t not in styleguide)
    assert not missing, (
        "colour tokens defined in tokens.css but absent from styleguide.html: "
        + ", ".join(missing)
        + " — add a swatch (see CLAUDE.md 'Design System — Ship the catalog entry'). "
        "If a token is deliberately functional (a scrim/letterbox), add it to FUNCTIONAL_EXEMPT."
    )
