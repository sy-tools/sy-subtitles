"""Guards for the faster-whisper dependency set.

faster-whisper declares only a floor on PyAV (``av>=11``). PyAV 19 dropped the
``metadata_errors`` keyword that faster-whisper 1.2.1 passes to ``av.open``, so
an unpinned install broke every whisper run with a TypeError — and nothing in CI
noticed, because nothing in CI ever installed faster-whisper.

So the set is pinned exactly in ``requirements-whisper.txt``, every workflow
installs it from there, and a CI lane decodes real audio with that exact set
whenever the file changes. A Dependabot bump that breaks the pairing turns that
lane red instead of reaching a talk.
"""

import os
import re
import wave
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ROOT / ".github" / "workflows"
REQUIREMENTS = ROOT / "requirements-whisper.txt"
WHISPER_WORKFLOWS = ("whisper.yml", "new-talk.yml")


def _requirement_lines() -> list[str]:
    lines = []
    for raw in REQUIREMENTS.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if line:
            lines.append(line)
    return lines


def test_whisper_requirements_are_exact_pins() -> None:
    lines = _requirement_lines()
    assert lines, "requirements-whisper.txt lists nothing"
    loose = [line for line in lines if not re.fullmatch(r"[A-Za-z0-9_.\-\[\]]+==[A-Za-z0-9_.+\-]+", line)]
    assert not loose, f"every whisper dependency must be pinned with ==, got: {loose}"


def test_whisper_requirements_pin_av() -> None:
    names = {re.split(r"[=\[]", line, maxsplit=1)[0].lower() for line in _requirement_lines()}
    assert {"faster-whisper", "av"} <= names


@pytest.mark.parametrize("workflow", WHISPER_WORKFLOWS)
def test_workflows_install_whisper_from_pinned_file(workflow: str) -> None:
    text = (WORKFLOWS / workflow).read_text(encoding="utf-8")
    assert "-r requirements-whisper.txt" in text, f"{workflow} does not install requirements-whisper.txt"
    ad_hoc = [
        line.strip()
        for line in text.splitlines()
        if "pip install" in line and re.search(r"faster[-_]whisper|\bav\b", line)
    ]
    assert not ad_hoc, f"{workflow} installs whisper deps outside the pinned file: {ad_hoc}"


@pytest.mark.parametrize("workflow", WHISPER_WORKFLOWS)
def test_whisper_pip_cache_tracks_pinned_file(workflow: str) -> None:
    """A cache key blind to the pins would restore wheels for the old set."""
    text = (WORKFLOWS / workflow).read_text(encoding="utf-8")
    keys = re.findall(r"key: pip-whisper-.*", text)
    assert keys, f"{workflow} has no pip-whisper cache"
    for key in keys:
        assert "requirements-whisper.txt" in key, f"{workflow}: {key}"


def test_ci_runs_whisper_lane_and_gates_on_it() -> None:
    text = (WORKFLOWS / "ci.yml").read_text(encoding="utf-8")
    assert re.search(r"^  test-whisper:", text, re.MULTILINE), "ci.yml has no test-whisper lane"
    assert "-r requirements-whisper.txt" in text
    gate_needs = re.search(r"^  gate:\n    needs: \[([^\]]*)\]", text, re.MULTILINE)
    assert gate_needs and "test-whisper" in gate_needs.group(1)


@pytest.mark.skipif(
    not os.environ.get("REQUIRE_FASTER_WHISPER"),
    reason="needs requirements-whisper.txt installed (set REQUIRE_FASTER_WHISPER, as the CI lane does)",
)
def test_pinned_set_decodes_audio(tmp_path: Path) -> None:
    from faster_whisper.audio import decode_audio

    path = tmp_path / "one_second.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 16000)

    assert decode_audio(str(path)).shape == (16000,)
