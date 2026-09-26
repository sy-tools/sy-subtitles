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

The private key is an environment secret of `main`, whose branch policy admits
only `main`: a workflow pushed on any other branch cannot read it. So every job
that mints runs in that environment, and nothing else may name the secret.
The key is only ever seen by the mint step, whose action is pinned to a commit.

Until the App is configured, or when the key is out of reach, the jobs fall back
to `github.token` — the old behaviour, where a person approves the run — and say
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
APP_TOKEN_PIN = "actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1"  # v3.2.0
APP_READY = "${{ vars.BOT_APP_ID != '' && secrets.BOT_APP_PRIVATE_KEY != '' }}"
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
    assert step["uses"] == APP_TOKEN_PIN, "the one step that sees the key runs a commit, not a movable tag"
    assert step.get("continue-on-error") is True, (
        "a failed mint (App not installed, key revoked) must fall back, not lose the build"
    )
    permissions = {k: v for k, v in step["with"].items() if k.startswith("permission-")}
    assert permissions == {"permission-contents": "write", "permission-pull-requests": "write"}
    assert step.get("if") == "env.BOT_APP_READY == 'true'", (
        "an unconfigured App or an unreachable key must fall back, not fail the job"
    )


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_every_checkout_before_bot_pr_pushes_with_the_app_token(workflow, job):
    steps = _steps(workflow, job)
    before_bot_pr = steps[: _index(steps, _runs_bot_pr)]
    checkouts = [s for s in before_bot_pr if _is_checkout(s)]
    assert checkouts
    for checkout in checkouts:
        assert checkout.get("with", {}).get("token") == f"${{{{ {TOKEN_EXPR} }}}}", (
            "any checkout left on the default token resets the push credentials to GITHUB_TOKEN"
        )


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_bot_pr_opens_the_pr_with_the_app_token(workflow, job):
    steps = _steps(workflow, job)
    bot_pr = steps[_index(steps, _runs_bot_pr)]
    assert TOKEN_EXPR in bot_pr["env"]["GH_TOKEN"]


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_fallback_is_announced(workflow, job):
    steps = _steps(workflow, job)
    warn = [s for s in steps if s.get("if") == "steps.bot-token.outputs.token == ''"]
    assert warn and "::warning" in warn[0]["run"], (
        "falling back to github.token means a person must approve the bot PR's CI; the log has to say so"
    )


@pytest.mark.parametrize(("workflow", "job"), BOT_PR_JOBS)
def test_minting_job_runs_in_the_main_environment(workflow, job):
    spec = _load(workflow)["jobs"][job]
    assert spec.get("environment") == "main"
    assert spec.get("env", {}).get("BOT_APP_READY") == APP_READY


def test_only_main_environment_jobs_name_the_app_key():
    """A job outside `main` naming the key would get an empty value, or — if the
    key were ever added as a repository secret — hand it to any branch."""
    offenders = []
    for path in WORKFLOWS.glob("*.yml"):
        wf = yaml.safe_load(path.read_text(encoding="utf-8"))
        for job_id, spec in (wf.get("jobs") or {}).items():
            if "BOT_APP_PRIVATE_KEY" in yaml.safe_dump(spec) and spec.get("environment") != "main":
                offenders.append(f"{path.name}:{job_id}")
        call = (wf.get(True) or {}).get("workflow_call") or {}
        if "BOT_APP_PRIVATE_KEY" in (call.get("secrets") or {}):
            offenders.append(f"{path.name}:workflow_call")
    assert offenders == []


def test_sync_subtitles_skips_bot_branches():
    cond = _load("sync-subtitles.yml")["jobs"]["sync"]["if"]
    assert cond == "github.event.pull_request.draft == false && !startsWith(github.head_ref, 'bot/')"


def test_review_status_waits_for_its_pr_to_merge_when_it_has_the_app_token():
    """The serialized review-status runs must not branch off a main that lacks
    the previous run's status. Without the App the PR waits for a person, so
    waiting would only turn every run red."""
    steps = _steps("sync-review-status.yml", "sync")
    bot_pr = steps[_index(steps, _runs_bot_pr)]
    assert bot_pr["env"].get("BOT_PR_WAIT_MERGE_SECONDS") == "${{ steps.bot-token.outputs.token != '' && '600' || '' }}"
