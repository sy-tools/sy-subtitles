from pathlib import Path

import yaml

WORKFLOWS = Path(__file__).resolve().parents[1] / ".github" / "workflows"


def _load(name):
    wf = yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))
    wf["on"] = wf.pop(True)
    return wf


def _op():
    return _load("talk-operator.yml")


def _run_text(job):
    return "\n".join(str(s.get("run", "")) for s in job["steps"])


def test_operator_workflow_triggers():
    on = _op()["on"]
    assert set(on) == {"pull_request_target", "issues"}
    assert on["pull_request_target"]["types"] == ["opened", "ready_for_review", "closed"]
    assert on["issues"]["types"] == ["labeled", "closed"]


def test_pr_job_never_checks_out_pr_head():
    for job in _op()["jobs"].values():
        for step in job.get("steps", []):
            ref = str((step.get("with") or {}).get("ref", ""))
            assert "pull_request" not in ref and "head" not in ref, "pull_request_target must never run PR code"


def test_pr_job_only_for_ready_sync_branches():
    cond = _op()["jobs"]["pr"]["if"]
    assert "startsWith(github.event.pull_request.head.ref, 'sync/')" in cond
    assert "github.event.pull_request.draft == false" in cond
    run = _run_text(_op()["jobs"]["pr"])
    assert "talk_operator pr-ready" in run and "talk_operator pr-merged" in run


def test_issue_jobs_only_for_operator_issues():
    jobs = _op()["jobs"]
    for name in ("qa", "deliver"):
        assert "'talk-operator'" in jobs[name]["if"], name
    assert "'op:qa-passed'" in jobs["qa"]["if"]
    assert "github.event.action == 'closed'" in jobs["deliver"]["if"]


def test_issue_title_is_validated_before_use():
    for name in ("qa", "deliver"):
        run = _run_text(_op()["jobs"][name])
        assert "workflow_validation_cli --talk-id" in run, name
        assert "${{ github.event.issue.title }}" not in run, "titles reach the shell only through env"


def test_qa_job_packages_and_reports():
    run = _run_text(_op()["jobs"]["qa"])
    for needle in (
        "talk_operator qa-passed",
        "amruta_package build",
        "bot-pr.sh bot/amruta-package",
        "talk_operator packaged",
    ):
        assert needle in run, needle


def test_qa_job_passes_email_vars():
    env = {}
    for step in _op()["jobs"]["qa"]["steps"]:
        env.update(step.get("env") or {})
    assert env.get("AMRUTA_EMAIL_TO") == "${{ vars.AMRUTA_EMAIL_TO }}"
    assert env.get("AMRUTA_EMAIL_CC") == "${{ vars.AMRUTA_EMAIL_CC }}"


def test_qa_job_has_full_history_for_the_build_baseline():
    checkouts = [s for s in _op()["jobs"]["qa"]["steps"] if str(s.get("uses", "")).startswith("actions/checkout@")]
    assert checkouts and checkouts[0]["with"].get("fetch-depth") == 0


def test_deliver_job_records_delivery():
    run = _run_text(_op()["jobs"]["deliver"])
    for needle in ("talk_operator closed", "amruta_package mark-delivered", "bot-pr.sh bot/amruta-delivery"):
        assert needle in run, needle


def test_status_job_reuses_sync_review_status():
    job = _op()["jobs"]["status"]
    assert job["uses"] == "./.github/workflows/sync-review-status.yml"
    assert job.get("secrets") == "inherit"
    assert set(job["needs"]) == {"pr", "qa", "deliver"}
    assert "success" in job["if"] and "always()" in job["if"]


def test_write_jobs_serialize_without_cancel():
    for name in ("pr", "qa", "deliver"):
        conc = _op()["jobs"][name]["concurrency"]
        assert conc["group"] and conc.get("cancel-in-progress") is False, name


def test_review_labels_job_ignores_operator_issues():
    cond = _load("sync-review-status.yml")["jobs"]["labels"]["if"]
    assert "'talk-review'" in cond


def test_unassigned_reset_requires_in_progress():
    run = _run_text(_load("sync-review-status.yml")["jobs"]["labels"])
    branch = run[run.index('"unassigned"') : run.index('"closed"')]
    assert 'index("review:in-progress")' in branch
    assert '[ "$IN_PROGRESS" = "true" ]' in branch.split("gh issue edit")[0]


def test_sync_job_accepts_op_labels():
    cond = _load("sync-review-status.yml")["jobs"]["sync"]["if"]
    assert "'op:'" in cond
