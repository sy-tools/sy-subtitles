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


def test_the_slug_length_limit_is_the_fixtures():
    from tools.talk_slug import SLUG_MAX_LEN

    with open(_FIXTURE, encoding="utf-8") as f:
        assert json.load(f)["max_len"] == SLUG_MAX_LEN


_NAMED = [c for c in _CASES if c["expected"]]


@pytest.mark.parametrize("case", _NAMED, ids=[repr(c["input"]) for c in _NAMED])
def test_every_slug_makes_a_talk_id_the_workflows_accept(case):
    from tools.workflow_validation import validate_talk_id

    validate_talk_id("2000-01-01_" + slugify(case["input"]))


def test_talk_id_pattern_takes_a_slug_of_exactly_the_limit_and_no_longer():
    from tools.talk_slug import SLUG_MAX_LEN
    from tools.workflow_validation import TALK_ID_RE

    assert TALK_ID_RE.fullmatch("2000-01-01_" + "x" * SLUG_MAX_LEN)
    assert not TALK_ID_RE.fullmatch("2000-01-01_" + "x" * (SLUG_MAX_LEN + 1))
