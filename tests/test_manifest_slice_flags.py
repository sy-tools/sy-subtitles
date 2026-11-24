"""A video built as one slice of a shared transcript is judged as a slice.

When a talk builds more than one video from its transcript (independent
parts, with or without a primary beside them), each SRT holds only the part
of the transcript its own recording speaks. Text preservation against the
whole transcript cannot hold for any one of them, so the build manifest
records `slice: true` and every re-validation (golden tests, sync_pr) drops
that check the way the pipeline did.
"""

from tools.validate_subtitles import manifest_validate_flags


def _video(tmp_path, manifest: str, en_srt: bool = False):
    final = tmp_path / "Part-2" / "final"
    final.mkdir(parents=True)
    (final / "build_manifest.yaml").write_text(manifest, encoding="utf-8")
    uk = final / "uk.srt"
    uk.write_text("1\n00:00:01,000 --> 00:00:02,000\nтекст\n", encoding="utf-8")
    if en_srt:
        src = tmp_path / "Part-2" / "source"
        src.mkdir()
        (src / "en.srt").write_text("1\n00:00:01,000 --> 00:00:02,000\ntext\n", encoding="utf-8")
    return uk


def test_a_whisper_slice_skips_text_preservation(tmp_path):
    uk = _video(tmp_path, "role: independent\nmode: whisper\nslice: true\n")
    flags = manifest_validate_flags(uk)
    assert flags["skip_text_check"] is True
    assert "compare_block_count" not in flags


def test_a_primary_built_as_a_slice_skips_text_preservation(tmp_path):
    uk = _video(tmp_path, "role: primary\nmode: whisper\nslice: true\n")
    assert manifest_validate_flags(uk)["skip_text_check"] is True


def test_an_en_srt_slice_compares_block_count(tmp_path):
    uk = _video(tmp_path, "role: independent\nmode: en-srt\nslice: true\n", en_srt=True)
    flags = manifest_validate_flags(uk)
    assert flags["skip_text_check"] is True
    assert flags["compare_block_count"] is True


def test_a_whole_transcript_primary_keeps_text_preservation(tmp_path):
    uk = _video(tmp_path, "role: primary\nmode: whisper\n")
    assert "skip_text_check" not in manifest_validate_flags(uk)


def test_a_lone_independent_en_srt_build_is_judged_like_an_en_srt_primary(tmp_path):
    uk = _video(tmp_path, "role: independent\nmode: en-srt\n", en_srt=True)
    flags = manifest_validate_flags(uk)
    assert flags["skip_text_check"] is True
    assert flags["compare_block_count"] is True
