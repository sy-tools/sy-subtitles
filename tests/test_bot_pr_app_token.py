"""Bot PRs must be opened by the bot GitHub App, not by `GITHUB_TOKEN`.

GitHub holds every workflow run on a pull request that `github-actions[bot]`
opened or updated until a human with write access approves it — even for a
branch in this same repository, and no repository setting turns that off
(changelog 2026-06-11, "Bot-created pull requests can run workflows if
approved"). `ci.yml`'s `gate` is the one required check on `main`, so a bot PR
whose CI never starts never reports `gate`, and its auto-merge waits forever.

A PR opened with a GitHub App installation token is not held. So each job that
runs `bot-pr.sh` mints one first and uses it for BOTH halves of the job: the
checkout (git pushes the bot branch with the checkout's credentials) and
`GH_TOKEN` (gh opens the PR and enables auto-merge).

Until the App is configured (`vars.BOT_APP_ID` empty) the jobs fall back to
`github.token` — the old behaviour, where a person approves the run — and say
so in the log rather than failing the build that produced the artifacts.

Side effect guarded here too: `sync-subtitles.yml` listens for PRs touching
`transcript_uk.txt` / `final/uk.srt`, which is exactly what a pipeline rebuild
PR changes. `GITHUB_TOKEN` PRs never woke it; App PRs would, and a sync pass
over a rebuild rewrites the transcript the build was made from. Bot branches
are skipped explicitly.
"""

from pathlib import Path

import pytest
import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"

APP_TOKEN_ACTION = "actions/create-github-app-token@"
TOKEN_EXPR = "steps.bot-token.outputs.token || github.token"

BOT_PR_JOBS = [
    ("whisper.yml", "commit"),
    ("subtitle-pipeline.yml", "commit"),
    ("sync-review-status.yml", "sync"),
]


def _load(name: str) -> dict:
    return yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))


def _steps(name: str, job: str) -> list[dict]:
    return _load(name)["jobs"][job]["steps"]


def _index(steps: list[dict], pred) -> int:
    for i, step in enumerate(steps):
        if pred(step):
            return i
    raise AssertionError("step not found")


def _is_checkout(step: dict) -> bool:
    return str(step.get("uses", "")).startswith("actions/checkout@")


def _runs_bot_pr(step: dict) -> bool:
    return "bot-pr.sh" in str(step.get("run", ""))


def _is_app_token(step: dict) -> bool:
    return str(step.get("uses", "")).startswith(APP_TOKEN_ACTION)


def test_every_bot_pr_caller_is_listed_in_bot_pr_jobs():
    callers = set()
    for path in WORKFLOWS.glob("*.yml"):
        wf = yaml.safe_load(path.read_text(encoding="utf-8"))
        for job_id, job in (wf.get("jobs") or {}).items():
            if any(_runs_bot_pr(s) for s in job.get("steps", [])):
                callers.add((path.name, job_id))
    assert callers == set(BOT_PR_JOBS)


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_app_token_is_minted_before_checkout(workflow, job):
    steps = _steps(workflow, job)
    token = _index(steps, _is_app_token)
    assert token < _index(steps, _is_checkout), (
        "the checkout persists the credentials bot-pr.sh pushes with, so the App token must exist before it"
    )
    step = steps[token]
    assert step.get("id") == "bot-token"
    # `client-id` is the v3 spelling, but actionlint (run by ci.yml) still
    # rejects it for this action; `app-id` is only deprecated, and works.
    assert step["with"]["app-id"] == "${{ vars.BOT_APP_ID }}"
    assert step["with"]["private-key"] == "${{ secrets.BOT_APP_PRIVATE_KEY }}"
    assert "vars.BOT_APP_ID != ''" in step.get("if", ""), "an unconfigured App must fall back, not fail the job"


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_checkout_pushes_with_the_app_token(workflow, job):
    steps = _steps(workflow, job)
    checkout = steps[_index(steps, _is_checkout)]
    assert TOKEN_EXPR in checkout.get("with", {}).get("token", "")


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_bot_pr_opens_the_pr_with_the_app_token(workflow, job):
    steps = _steps(workflow, job)
    bot_pr = steps[_index(steps, _runs_bot_pr)]
    assert TOKEN_EXPR in bot_pr["env"]["GH_TOKEN"]


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_fallback_is_announced(workflow, job):
    steps = _steps(workflow, job)
    warn = [s for s in steps if "vars.BOT_APP_ID == ''" in str(s.get("if", ""))]
    assert warn and "::warning" in warn[0]["run"], (
        "falling back to github.token means a person must approve the bot PR's CI; the log has to say so"
    )


@pytest.mark.parametrize("workflow", ["whisper.yml", "sync-review-status.yml"])
def test_reusable_workflows_accept_the_app_key(workflow):
    wf = _load(workflow)
    call = wf[True]["workflow_call"] or {}  # PyYAML reads bare `on:` as True
    assert "BOT_APP_PRIVATE_KEY" in (call.get("secrets") or {})


@pytest.mark.parametrize("callee", ["whisper.yml", "sync-review-status.yml"])
def test_pipeline_passes_the_app_key_to_reusable_workflows(callee):
    jobs = _load("subtitle-pipeline.yml")["jobs"]
    callers = [j for j in jobs.values() if j.get("uses") == f"./.github/workflows/{callee}"]
    assert callers, f"pipeline no longer calls {callee}"
    for job in callers:
        secrets = job.get("secrets")
        assert secrets == "inherit" or (
            isinstance(secrets, dict) and secrets.get("BOT_APP_PRIVATE_KEY") == "${{ secrets.BOT_APP_PRIVATE_KEY }}"
        )


def test_sync_subtitles_skips_bot_branches():
    cond = _load("sync-subtitles.yml")["jobs"]["sync"]["if"]
    assert "!startsWith(github.head_ref, 'bot/')" in cond
    assert "github.event.pull_request.draft == false" in cond
