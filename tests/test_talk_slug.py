"""Parity tests for the canonical talk slugify (Python twin of site/js/talk_slug.js).

Both this file and tests/test_talk_slug.js read tests/fixtures/slug_cases.json,
so the two implementations cannot drift apart silently.
"""

import json
import os

import pytest

from tools.talk_slug import slugify

_FIXTURE = os.path.join(os.path.dirname(__file__), "fixtures", "slug_cases.json")

with open(_FIXTURE, encoding="utf-8") as f:
    _CASES = json.load(f)["cases"]


@pytest.mark.parametrize("case", _CASES, ids=[repr(c["input"]) for c in _CASES])
def test_slugify_fixture(case):
    assert slugify(case["input"]) == case["expected"]


def test_slugify_matches_spa_for_raksha_bandhan():
    """The talk that exposed the divergence: SPA produces this exact slug."""
    assert slugify("Raksha Bandhan and Maryadas") == "Raksha-Bandhan-and-Maryadas"
