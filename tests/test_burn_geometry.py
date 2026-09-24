"""The burn's geometry has one copy, and every consumer reads that copy.

`site/js/burn_geometry.js` holds the numbers that make a burned frame look like
the fullscreen preview. The page loads it as a script, the Node suite requires
it, and `tools/burn_geometry.py` parses it as JSON for the burner and the
workflow's input guard. These tests hold the file to a shape both languages can
read, and each consumer to reading it rather than keeping a number of its own.
"""

import json
import re

import pytest

from tools import burn_geometry, burn_subtitles

SOURCE = "site/js/burn_geometry.js"


def _literal():
    with open(SOURCE, encoding="utf-8") as f:
        match = re.search(r"^var BURN_GEOMETRY = (\{.*?^\});$", f.read(), re.M | re.S)
    assert match, f"{SOURCE} must hold `var BURN_GEOMETRY = {{...}};` with the object in JSON"
    return json.loads(match.group(1))


def test_the_file_is_a_json_object_both_languages_can_read():
    assert _literal() == burn_geometry.GEOMETRY


def test_the_approved_1080p_look_is_what_the_file_holds():
    g = burn_geometry.GEOMETRY
    assert g["fontWidthRatio"] == 0.04
    assert (g["padTopPx"], g["padBotPx"], g["refHeight"]) == (80, 36, 1080)
    assert g["sideInsetRatio"] == 0.07
    assert g["wrapSafety"] == 0.98
    assert (g["fontRatioMin"], g["fontRatioMax"]) == (0.02, 0.12)


def test_the_derived_ratios_are_fractions_of_the_frame():
    assert pytest.approx(80 / 1080) == burn_geometry.PADTOP_RATIO
    assert pytest.approx(36 / 1080) == burn_geometry.PADBOT_RATIO


@pytest.mark.parametrize(
    ("name", "key"),
    [
        ("SIDE_INSET_RATIO", "sideInsetRatio"),
        ("WRAP_SAFETY", "wrapSafety"),
        ("PT_SERIF_WIN_FACTOR", "lineAdvance"),
        ("FONT_RATIO_MIN", "fontRatioMin"),
        ("FONT_RATIO_MAX", "fontRatioMax"),
    ],
)
def test_the_burner_reads_its_numbers_from_the_file(name, key):
    assert getattr(burn_subtitles, name) == burn_geometry.GEOMETRY[key]


def test_the_loader_is_stdlib_only():
    """The workflow's input guard imports it before setup-python has run."""
    with open("tools/burn_geometry.py", encoding="utf-8") as f:
        imports = re.findall(r"^(?:import|from) (\S+)", f.read(), re.M)
    assert set(imports) <= {"json", "re", "pathlib", "__future__"}, imports
