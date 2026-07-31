"""The App setup doc must list every permission the SPA actually needs."""

from pathlib import Path

DOC = Path(__file__).parent.parent / "docs/github-app-setup.md"


def test_documents_the_actions_permission():
    with open(DOC, encoding="utf-8") as f:
        text = f.read()
    line = next(ln for ln in text.splitlines() if "Repository permissions" in ln)
    assert "Actions" in line, (
        "the burn-subtitles button needs Actions read+write to dispatch the "
        "workflow, poll progress and fetch the artifact"
    )
