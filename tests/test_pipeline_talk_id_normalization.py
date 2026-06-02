"""Guards against the talk_id whitespace bug seen in pipeline run #447.

The Subtitle Pipeline accepts a free-form ``talk_id`` workflow input. The
``discover`` job strips it before validating/using it, but several downstream
jobs interpolated the *raw* ``inputs.talk_id`` into artifact names and paths.
A stray leading space made upload names (built from the stripped
``matrix.talk_id``) diverge from download names (built from raw
``inputs.talk_id``) -> ``Artifact not found`` and a failed commit job.

Invariant: ``inputs.talk_id`` is the un-normalized input and may appear ONLY
where it is first normalized (the ``discover`` feed) or in cosmetic display
(``run-name``). Everywhere else must use a normalized source
(``matrix.talk_id``, ``needs.discover.outputs.talk_id``,
``needs.prepare-build.outputs.talk_id``).
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from pathlib import Path

import yaml

WORKFLOW = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "subtitle-pipeline.yml"

# Match `inputs.talk_id` only inside a GitHub Actions `${{ ... }}` expression —
# that is the only place an un-normalized value actually reaches a name/path.
# Prose comments mentioning the token are irrelevant. `[^}]*` spans newlines
# (negated class), so this also matches multi-line `${{ ... }}` expressions.
_INPUTS_TALK_ID_EXPR = re.compile(r"\$\{\{[^}]*\binputs\.talk_id\b")

# Any `${{ ... talk_id ... }}` expression — captures the inner reference.
_TALK_ID_EXPR = re.compile(r"\$\{\{\s*([^}]*?talk_id[^}]*?)\s*\}\}")

# The only talk_id sources allowed in artifact names/paths. All three provably
# resolve to the same whitespace-stripped value (discover strips the input;
# talk_matrix/matrix.talk_id and prepare-build.outputs.talk_id are derived from
# it), so any artifact's upload name matches its download name. A *new* source
# appearing here must be proven equal to the stripped input before being added.
_NORMALIZED_TALK_ID_SOURCES = {
    "matrix.talk_id",
    "needs.discover.outputs.talk_id",
    "needs.prepare-build.outputs.talk_id",
}


def _load_jobs() -> dict:
    data = yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))
    return data["jobs"]


def _needs_of(job: dict) -> set[str]:
    needs = job.get("needs", [])
    if isinstance(needs, str):
        return {needs}
    return set(needs or [])


def _strings(obj) -> Iterator[str]:
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for value in obj.values():
            yield from _strings(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from _strings(value)


def _artifact_steps() -> Iterator[tuple[str, dict]]:
    """Yield (job_name, step) for every upload/download-artifact step."""
    for job_name, job in _load_jobs().items():
        for step in job.get("steps", []) or []:
            uses = step.get("uses", "") or ""
            if "upload-artifact" in uses or "download-artifact" in uses:
                yield job_name, step


def test_raw_inputs_talk_id_only_in_run_name_and_discover_feed() -> None:
    """Raw ``inputs.talk_id`` must be normalized before any downstream use.

    It is allowed only on the cosmetic ``run-name`` line and on the
    ``INPUT_TALK_ID:`` env feed into the discover job (which strips it). Any
    other occurrence (artifact names, path globs, TALK_ID env vars) can carry
    surrounding whitespace into artifact-name matching and break the pipeline.
    """
    offenders: list[tuple[int, str]] = []
    for lineno, line in enumerate(WORKFLOW.read_text(encoding="utf-8").splitlines(), 1):
        if not _INPUTS_TALK_ID_EXPR.search(line):
            continue
        stripped = line.lstrip()
        if stripped.startswith("run-name:") or stripped.startswith("INPUT_TALK_ID:"):
            continue
        offenders.append((lineno, line.strip()))

    assert not offenders, (
        "Raw `inputs.talk_id` leaks into downstream use. Replace with a "
        "normalized source (needs.discover.outputs.talk_id / matrix.talk_id / "
        "needs.prepare-build.outputs.talk_id):\n" + "\n".join(f"  line {n}: {text}" for n, text in offenders)
    )


def test_needs_outputs_references_are_reachable() -> None:
    """Every ``needs.<X>.outputs.*`` a job reads must list ``<X>`` in needs.

    Guards the exact way this fix can silently re-break: referencing
    ``needs.discover.outputs.talk_id`` from a job that forgot to add
    ``discover`` to its ``needs`` resolves to an empty string -> a broken
    artifact name, which a name-only check would not catch.
    """
    ref_re = re.compile(r"needs\.([A-Za-z0-9_-]+)\.outputs\.")
    violations: list[str] = []
    for name, job in _load_jobs().items():
        declared = _needs_of(job)
        referenced: set[str] = set()
        for text in _strings(job):
            referenced.update(ref_re.findall(text))
        for dep in sorted(referenced):
            if dep not in declared:
                violations.append(
                    f"job '{name}' reads needs.{dep}.outputs.* but '{dep}' is not in its needs {sorted(declared)}"
                )

    assert not violations, "\n".join(violations)


def test_artifact_names_use_only_normalized_talk_id_sources() -> None:
    """Every artifact ``name:``/``path:`` talk_id token must be a known source.

    This is the most on-point guard for the run #447 failure mode: an artifact
    whose upload name diverges from its download name. The names deliberately
    mix three sources (matrix.talk_id, needs.discover.outputs.talk_id,
    needs.prepare-build.outputs.talk_id) that today all resolve to the same
    stripped value. Pinning them to an allow-list means a future change that
    introduces a fourth, *differently-derived* source fails here instead of
    silently re-breaking commit with "Artifact not found".
    """
    offenders: list[str] = []
    for job_name, step in _artifact_steps():
        with_block = step.get("with", {}) or {}
        for key in ("name", "path"):
            value = with_block.get(key)
            if not isinstance(value, str):
                continue
            for expr in _TALK_ID_EXPR.findall(value):
                source = expr.strip()
                if source not in _NORMALIZED_TALK_ID_SOURCES:
                    offenders.append(f"job '{job_name}' {key}: ${{{{ {source} }}}}")

    assert not offenders, (
        "Artifact name/path uses a non-normalized talk_id source. Allowed: "
        f"{sorted(_NORMALIZED_TALK_ID_SOURCES)}\n" + "\n".join(f"  {o}" for o in offenders)
    )


def test_only_discover_job_consumes_raw_inputs_talk_id() -> None:
    """Outside ``discover``, no job may reference raw ``inputs.talk_id``.

    Structural counterpart to the line scan: it reads the YAML-folded scalar
    values, so it catches multi-line ``${{ ... }}`` expressions and pins the
    normalization boundary to the discover job by *identity* rather than by the
    ``INPUT_TALK_ID:`` env-var name (a second job adopting that name would not
    slip through). ``run-name`` is a top-level cosmetic key, not a job, so it is
    naturally out of scope here.
    """
    offenders: list[str] = []
    for name, job in _load_jobs().items():
        if name == "discover":
            continue  # the one place the raw input is consumed and stripped
        for text in _strings(job):
            if _INPUTS_TALK_ID_EXPR.search(text):
                offenders.append(f"job '{name}': {text.strip()[:80]}")

    assert not offenders, "Raw `inputs.talk_id` used outside the discover job:\n" + "\n".join(
        f"  {o}" for o in offenders
    )
