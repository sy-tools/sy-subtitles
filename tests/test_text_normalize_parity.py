"""Parity tests for the text hygiene rules (Python twin of site/js/text_sanitize.js).

Both this file and tests/test_text_sanitize.js read
tests/fixtures/text_hygiene_cases.json, so the two implementations cannot drift
apart silently.
"""

import json
import os

import pytest

from tools.text_normalize import (
    normalize_uk_typography,
    sanitize_edited_text,
    sanitize_field_text,
    sanitize_invisible,
)

_FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "text_hygiene_cases.json")

with open(_FIXTURE, encoding="utf-8") as f:
    _CASES = json.load(f)["cases"]

_FNS = {
    "sanitize_invisible": lambda c: sanitize_invisible(c["input"]),
    "sanitize_field_text": lambda c: sanitize_field_text(c["input"]),
    "normalize_uk_typography": lambda c: normalize_uk_typography(c["input"]),
    "sanitize_edited_text": lambda c: sanitize_edited_text(c["input"], c["lang"]),
}


@pytest.mark.parametrize("case", _CASES, ids=[f"{c['fn']}-{i}" for i, c in enumerate(_CASES)])
def test_fixture_case(case):
    fn = _FNS.get(case["fn"])
    assert fn is not None, f"unknown fixture fn: {case['fn']}"
    assert fn(case) == case["expected"]


def test_every_function_is_exercised():
    used = {c["fn"] for c in _CASES}
    assert used == set(_FNS), f"fixture misses cases for {set(_FNS) - used}"
