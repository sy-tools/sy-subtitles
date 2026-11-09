"""subtitle-pipeline.yml stays inside what site/js/pipeline_dispatch.js can read.

The SPA draws its "run pipeline" form from the workflow file at run time, so
the file is the only copy of the input list. What can still drift is the shape:
an input type the form cannot draw, a run-name the run list cannot parse, a
talk-id rule that differs between the browser and the workflow.
"""

import re
from pathlib import Path

import yaml

from tools.workflow_validation import TALK_ID_RE

ROOT = Path(__file__).parent.parent
WORKFLOW = ROOT / ".github" / "workflows" / "subtitle-pipeline.yml"
MODULE = ROOT / "site" / "js" / "pipeline_dispatch.js"


def _workflow():
    return yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))


def _dispatch_inputs():
    return _workflow()[True]["workflow_dispatch"]["inputs"]


def _js_types():
    match = re.search(r"^var PIPELINE_INPUT_TYPES = \[(.+)\];$", MODULE.read_text(encoding="utf-8"), re.M)
    assert match, "PIPELINE_INPUT_TYPES is no longer declared in pipeline_dispatch.js"
    return set(re.findall(r"'([a-z]+)'", match.group(1)))


def test_every_dispatch_input_has_a_type_the_form_can_draw():
    drawable = _js_types()
    for name, spec in _dispatch_inputs().items():
        assert (spec or {}).get("type", "string") in drawable, name


def test_dispatch_form_names_the_talk():
    assert _dispatch_inputs()["talk_id"]["required"] is True


def test_choice_defaults_are_among_their_options():
    for name, spec in _dispatch_inputs().items():
        if spec.get("type") == "choice" and "default" in spec:
            assert spec["default"] in spec["options"], name


def test_run_name_starts_with_the_talk_id_and_the_separator_the_spa_splits_on():
    assert _workflow()["run-name"].startswith("${{ inputs.talk_id || 'auto' }} | ")


def test_browser_talk_id_rule_is_the_workflows():
    match = re.search(r"^var PIPELINE_TALK_ID_RE = /(.+)/;$", MODULE.read_text(encoding="utf-8"), re.M)
    assert match, "PIPELINE_TALK_ID_RE is no longer declared in pipeline_dispatch.js"
    assert match.group(1) == TALK_ID_RE.pattern
