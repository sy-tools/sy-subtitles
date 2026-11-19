"""Drift guard: the Python half of the issues -> review-status mapping.

`.github/scripts/sync-review-status.py` writes review-status.json;
`site/js/review_status_live.js` computes the same statuses live in the SPA for
signed-in users. Both run the cases in `fixtures/review_status_mapping.json`
(the JS half is `tests/test_review_status_live.js`), so a rule changed on one
side only turns one of the two suites red.
"""

import copy
import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / ".github" / "scripts" / "sync-review-status.py"
CASES = json.loads((ROOT / "tests" / "fixtures" / "review_status_mapping.json").read_text())["cases"]


@pytest.fixture(scope="module")
def sync():
    spec = importlib.util.spec_from_file_location("sync_review_status_mapping", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.mark.parametrize("case", CASES, ids=[c["name"] for c in CASES])
def test_python_mapping_matches_shared_fixture(sync, case):
    known = set(case["talk_ids"])
    talks = sync.apply_issues(copy.deepcopy(case["base"]), copy.deepcopy(case["issues"]), lambda tid: tid in known)
    assert talks == case["expected"]


def test_fixture_covers_every_operator_stage(sync):
    seen = {e.get("operator_stage") for c in CASES for e in c["expected"].values()}
    assert {stage for _label, stage in sync.OPERATOR_STAGES} <= seen
