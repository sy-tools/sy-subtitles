"""Lockstep guard between burn-subtitles.yml's step names and the SPA's weights.

The workflow's named steps and BURN_STEP_WEIGHTS in site/js/burn_video.js are a
contract with no compiler behind it: the SPA credits progress by looking each
step up BY NAME, so renaming "Render 40%" in the YAML — or reordering the two
lists relative to each other — would silently freeze the progress bar rather
than break anything. This file fails loudly on any such drift.

Same shape as tests/test_sw_precache.js, which cross-checks index.html against
sw.js: parse each artifact with its own natural reader, then compare the lists.
"""

import re

import yaml

WORKFLOW = ".github/workflows/burn-subtitles.yml"
BURN_VIDEO_JS = "site/js/burn_video.js"

# Named workflow steps that deliberately carry NO progress weight. Listed here
# rather than filtered implicitly, so adding a named step to the workflow fails
# this guard until someone decides whether the bar should account for it.
UNWEIGHTED_STEPS = ("Validate inputs",)


def _read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def _named_steps(path):
    """Every named step of the burn job, in declaration order."""
    doc = yaml.safe_load(_read(path))
    return [step["name"] for step in doc["jobs"]["burn"]["steps"] if step.get("name")]


def _weight_entries(path):
    """(name, weight) pairs parsed out of the BURN_STEP_WEIGHTS array."""
    source = _read(path)
    start = source.index("var BURN_STEP_WEIGHTS")
    body = source[start : source.index("];", start)]
    return [
        (m.group("name"), float(m.group("weight")))
        for m in re.finditer(r"name:\s*'(?P<name>[^']+)',\s*weight:\s*(?P<weight>[0-9.]+)", body)
    ]


def _weight_names(path):
    return [name for name, _ in _weight_entries(path)]


def _weights(path):
    return [weight for _, weight in _weight_entries(path)]


def test_workflow_named_steps_match_the_spa_weight_table():
    """The SPA looks steps up BY NAME. A rename in either file must fail here."""
    yaml_names = [name for name in _named_steps(WORKFLOW) if name not in UNWEIGHTED_STEPS]
    js_names = _weight_names(BURN_VIDEO_JS)
    assert yaml_names == js_names


def test_the_unweighted_exemptions_are_real_workflow_steps():
    # Otherwise the exemption list above could quietly hide a step that no
    # longer exists — and, with it, a genuine mismatch.
    names = _named_steps(WORKFLOW)
    for name in UNWEIGHTED_STEPS:
        assert name in names, name


def test_the_spa_weights_sum_to_one():
    assert abs(sum(_weights(BURN_VIDEO_JS)) - 1.0) < 1e-9


def test_the_weight_table_was_actually_parsed():
    # A regex that matched nothing would make every assertion above vacuous:
    # [] == [] and sum([]) == 0 would both need to be caught by this.
    assert len(_weight_names(BURN_VIDEO_JS)) >= 11


def test_every_gate_step_has_a_matching_workflow_threshold():
    """A "Render 40%" weight must correspond to a gate that waits for 40%."""
    doc = yaml.safe_load(_read(WORKFLOW))
    runs = {s["name"]: s.get("run", "") for s in doc["jobs"]["burn"]["steps"] if s.get("name")}
    for name in _weight_names(BURN_VIDEO_JS):
        match = re.fullmatch(r"Render (\d+)%", name)
        if not match:
            continue
        assert f"--percent {match.group(1)} " in runs[name] + " ", name
