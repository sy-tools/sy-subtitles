"""The two files this project treats as its own contract must know about the burn feature.

CLAUDE.md and ARCHITECTURE.md are what a fresh session reads before touching
anything, so a tool that is missing from both is a tool that will be rewritten
rather than reused. The burn feature added two modules and a top-level
directory; this pins that all three are described, and that the usage block
carries the one flag the workflow actually depends on.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _read(name):
    with open(ROOT / name, encoding="utf-8") as f:
        return f.read()


def test_claude_md_lists_the_render_gate_cli():
    text = _read("CLAUDE.md")
    assert "tools.render_gate" in text, (
        "render_gate is the load-bearing piece of the progress mechanism and "
        "belongs in the 'Internal / pipeline-support CLIs' list"
    )
    listing = text[text.index("# Internal / pipeline-support CLIs") :]
    assert "tools.render_gate" in listing, "it is run by a workflow, not by hand"


def test_claude_md_documents_the_progress_file_flag():
    # The workflow's whole gate mechanism hangs off this flag; a usage block
    # that omits it describes a tool that cannot drive the workflow.
    text = _read("CLAUDE.md")
    block = text[text.index("python -m tools.burn_subtitles") :][:600]
    assert "--progress-file" in block


def test_architecture_lists_both_new_tools():
    tree = _read("ARCHITECTURE.md")
    tree = tree[tree.index("├── tools/") : tree.index("├── site/")]
    for module in ("burn_subtitles.py", "render_gate.py"):
        assert module in tree, f"the per-file tools/ tree omits {module}"


def test_architecture_shows_the_vendored_font_directory():
    # The whole line-break-fidelity argument rests on the vendored face, so a
    # repo tree without assets/ hides the thing the burn output depends on.
    tree = _read("ARCHITECTURE.md")
    assert "├── assets/" in tree or "└── assets/" in tree


def test_architecture_explains_why_the_gate_steps_exist():
    """A reader must learn WHY there are nineteen gate steps without opening the YAML."""
    text = _read("ARCHITECTURE.md")
    section = text[text.index("### burn-subtitles.yml") :]
    section = section[: section.index("\n## ")]
    assert "render_gate" in section
    assert "step" in section.lower()
