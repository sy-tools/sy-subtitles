"""The burn's geometry, read from the one copy the SPA also loads.

`site/js/burn_geometry.js` holds the object as JSON; see its header for what
each number means. Stdlib only, so any step of the burn workflow can import it
whatever it has installed.
"""

import json
import re
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "site" / "js" / "burn_geometry.js"


def _load():
    match = re.search(r"^var BURN_GEOMETRY = (\{.*?^\});$", SOURCE.read_text(encoding="utf-8"), re.M | re.S)
    if not match:
        raise RuntimeError(f"{SOURCE} no longer holds `var BURN_GEOMETRY = {{...}};`")
    return json.loads(match.group(1))


GEOMETRY = _load()

FONT_WIDTH_RATIO = GEOMETRY["fontWidthRatio"]
FONT_RATIO_MIN = GEOMETRY["fontRatioMin"]
FONT_RATIO_MAX = GEOMETRY["fontRatioMax"]
PADTOP_RATIO = GEOMETRY["padTopPx"] / GEOMETRY["refHeight"]
PADBOT_RATIO = GEOMETRY["padBotPx"] / GEOMETRY["refHeight"]
SIDE_INSET_RATIO = GEOMETRY["sideInsetRatio"]
WRAP_SAFETY = GEOMETRY["wrapSafety"]
LINE_ADVANCE = GEOMETRY["lineAdvance"]
