import json
from pathlib import Path

import pytest
import yaml

from tools.schemas import SchemaError, validate_meta_yaml, validate_whisper_json
from tools.vimeo_codec import encode_video_ref

GOOD_WHISPER = {
    "language": "en",
    "segments": [
        {
            "id": 0,
            "start": 0.0,
            "end": 2.5,
            "text": "Hello world.",
            "words": [
                {"start": 0.0, "end": 0.5, "word": "Hello"},
                {"start": 0.6, "end": 2.0, "word": "world"},
            ],
        },
        {
            "id": 1,
            "start": 2.6,
            "end": 4.0,
            "text": "Second.",
            "words": [{"start": 2.6, "end": 3.9, "word": "Second"}],
        },
    ],
}

GOOD_META = {
    "title": "Sahasrara Puja",
    "date": "1988-05-08",
    "location": "Fregene, Italy",
    "language": "en",
    "videos": [
        {
            "slug": "Sahasrara-Puja-Talk",
            "title": "Sahasrara Puja Talk",
            "video_ref": encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa"),
        },
    ],
}


def _w(tmp_path: Path, name: str, data) -> str:
    p = tmp_path / name
    if name.endswith(".json"):
        p.write_text(json.dumps(data), encoding="utf-8")
    else:
        p.write_text(yaml.safe_dump(data, allow_unicode=True), encoding="utf-8")
    return str(p)


# whisper.json ---------------------------------------------------------------


def test_whisper_good(tmp_path: Path) -> None:
    validate_whisper_json(_w(tmp_path, "whisper.json", GOOD_WHISPER))


def test_whisper_missing_segments(tmp_path: Path) -> None:
    bad = {"language": "en"}
    with pytest.raises(SchemaError, match="missing required field 'segments'"):
        validate_whisper_json(_w(tmp_path, "whisper.json", bad))


def test_whisper_empty_segments(tmp_path: Path) -> None:
    bad = {"language": "en", "segments": []}
    with pytest.raises(SchemaError, match="empty"):
        validate_whisper_json(_w(tmp_path, "whisper.json", bad))


def test_whisper_end_before_start(tmp_path: Path) -> None:
    bad = {
        "language": "en",
        "segments": [{"start": 5.0, "end": 2.0, "text": "x"}],
    }
    with pytest.raises(SchemaError, match="end .* < start"):
        validate_whisper_json(_w(tmp_path, "whisper.json", bad))


def test_whisper_catastrophic_backward_jump(tmp_path: Path) -> None:
    """Small overlaps are legal (whisper VAD); a >20s rewind is corruption."""
    bad = {
        "language": "en",
        "segments": [
            {"start": 100.0, "end": 120.0, "text": "a"},
            {"start": 3.0, "end": 4.0, "text": "b"},
        ],
    }
    with pytest.raises(SchemaError, match="backward jump > 20s"):
        validate_whisper_json(_w(tmp_path, "whisper.json", bad))


def test_whisper_small_overlap_accepted(tmp_path: Path) -> None:
    """Whisper legitimately produces 1–5s overlaps between consecutive segments."""
    ok = {
        "language": "en",
        "segments": [
            {"start": 10.0, "end": 15.0, "text": "a"},
            {"start": 12.0, "end": 18.0, "text": "b"},
        ],
    }
    validate_whisper_json(_w(tmp_path, "whisper.json", ok))


def test_whisper_wrong_typed_start_raises_schema_error(tmp_path: Path) -> None:
    """A string start/end (hand-edited whisper.json) must surface as a
    SchemaError with a readable message — not AttributeError from formatting
    a tuple of expected types."""
    bad = json.loads(json.dumps(GOOD_WHISPER))
    bad["segments"][0]["start"] = "1.5"
    path = _w(tmp_path, "whisper.json", bad)
    with pytest.raises(SchemaError, match="expected int/float, got str"):
        validate_whisper_json(path)


def test_whisper_bad_json(tmp_path: Path) -> None:
    p = tmp_path / "whisper.json"
    p.write_text("{not json", encoding="utf-8")
    with pytest.raises(SchemaError, match="cannot read/parse"):
        validate_whisper_json(str(p))


# meta.yaml ------------------------------------------------------------------


def test_meta_good(tmp_path: Path) -> None:
    validate_meta_yaml(_w(tmp_path, "meta.yaml", GOOD_META))


def test_meta_subtitle_omit_accepts_list_of_phrases(tmp_path: Path) -> None:
    ok = dict(GOOD_META, subtitle_omit=["(легкий сміх, коли собака виходить на сцену)"])
    validate_meta_yaml(_w(tmp_path, "meta.yaml", ok))


@pytest.mark.parametrize("bad_value", ["(сміх)", {"a": 1}, ["(сміх)", ""], ["(сміх)", 7]])
def test_meta_subtitle_omit_rejects_malformed_spec(tmp_path: Path, bad_value) -> None:
    """A typo'd `subtitle_omit:` must fail loudly — silently ignoring it would
    ship the very remarks it was written to strip."""
    bad = dict(GOOD_META, subtitle_omit=bad_value)
    with pytest.raises(SchemaError, match="subtitle_omit"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", bad))


def test_meta_bad_date(tmp_path: Path) -> None:
    bad = dict(GOOD_META, date="1988/05/08")
    with pytest.raises(SchemaError, match="YYYY-MM-DD"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", bad))


def test_meta_unknown_language(tmp_path: Path) -> None:
    bad = dict(GOOD_META, language="klingon")
    with pytest.raises(SchemaError, match="language"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", bad))


def test_meta_empty_videos_allowed(tmp_path: Path) -> None:
    """A talk may legitimately have no video (e.g. a letter / text-only
    translation). An empty videos list is valid."""
    meta = dict(GOOD_META, videos=[])
    assert validate_meta_yaml(_w(tmp_path, "meta.yaml", meta)) == meta


def test_meta_missing_videos_allowed(tmp_path: Path) -> None:
    """videos may be omitted entirely for a text-only talk."""
    meta = {k: v for k, v in GOOD_META.items() if k != "videos"}
    assert validate_meta_yaml(_w(tmp_path, "meta.yaml", meta)) == meta


def test_meta_duplicate_slug(tmp_path: Path) -> None:
    bad = dict(
        GOOD_META,
        videos=[GOOD_META["videos"][0], GOOD_META["videos"][0]],
    )
    with pytest.raises(SchemaError, match="duplicated"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", bad))


def test_meta_injection_slug_rejected(tmp_path: Path) -> None:
    bad = dict(
        GOOD_META,
        videos=[{"slug": "x;$(curl evil)", "title": "t"}],
    )
    with pytest.raises(SchemaError, match="invalid video slug"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", bad))


def test_meta_bad_video_ref(tmp_path: Path) -> None:
    # A video_ref that decodes to a vimeo URL with shell metacharacters must be
    # rejected — the decoded value is re-checked against the vimeo_url allowlist.
    bad = dict(
        GOOD_META,
        videos=[
            {
                "slug": "x",
                "title": "t",
                "video_ref": encode_video_ref("https://vimeo.com/123;curl evil"),
            }
        ],
    )
    with pytest.raises(SchemaError, match="video_ref"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", bad))


def test_meta_rejects_leftover_plaintext_vimeo_url(tmp_path: Path) -> None:
    # Links must be stored obfuscated as video_ref. A stray plaintext vimeo_url
    # (e.g. from a stale bookmarklet or hand edit) must fail loudly at validation
    # rather than being silently dropped by the no-fallback reader.
    bad = dict(
        GOOD_META,
        videos=[{"slug": "x", "title": "t", "vimeo_url": "https://vimeo.com/1/a"}],
    )
    with pytest.raises(SchemaError, match="vimeo_url"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", bad))


# Synthetic ids only — never a real video or file id.
_YT_REF = encode_video_ref("https://www.youtube.com/watch?v=AbCdEfGhIjK")
_GD_REFS = [
    encode_video_ref("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view"),
    encode_video_ref("https://drive.google.com/file/d/1ZyXwVuTsRqPoNmLkJiHgFeDcBa543210/view"),
]
_BN_REF = encode_video_ref("https://player.mediadelivery.net/play/123456/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d")


def _meta_with_video(**video) -> dict:
    return dict(GOOD_META, videos=[{"slug": "x", "title": "t", **video}])


def test_meta_youtube_video_ref_ok(tmp_path: Path) -> None:
    validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_YT_REF)))


def test_meta_youtube_video_with_drive_media_refs_ok(tmp_path: Path) -> None:
    validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_YT_REF, media_refs=_GD_REFS)))


def test_meta_drive_ref_is_not_a_video_ref(tmp_path: Path) -> None:
    with pytest.raises(SchemaError, match="video_ref"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_GD_REFS[0])))


def test_meta_vimeo_video_with_media_refs_rejected(tmp_path: Path) -> None:
    vimeo = encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa")
    with pytest.raises(SchemaError, match="media_refs"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=vimeo, media_refs=_GD_REFS)))


def test_meta_linkless_video_with_media_refs_rejected(tmp_path: Path) -> None:
    with pytest.raises(SchemaError, match="media_refs"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(media_refs=_GD_REFS)))


def test_meta_media_refs_containing_youtube_ref_rejected(tmp_path: Path) -> None:
    with pytest.raises(SchemaError, match=r"media_refs\[1\]"):
        validate_meta_yaml(
            _w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_YT_REF, media_refs=[_GD_REFS[0], _YT_REF]))
        )


def test_meta_empty_media_refs_rejected(tmp_path: Path) -> None:
    # An empty list says "there are mirrors" and names none; leave the key out.
    with pytest.raises(SchemaError, match="media_refs must not be empty"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_YT_REF, media_refs=[])))


def test_meta_duplicate_media_refs_rejected(tmp_path: Path) -> None:
    with pytest.raises(SchemaError, match=r"media_refs\[2\].*duplicate"):
        validate_meta_yaml(
            _w(
                tmp_path,
                "meta.yaml",
                _meta_with_video(video_ref=_YT_REF, media_refs=[_GD_REFS[0], _GD_REFS[1], _GD_REFS[0]]),
            )
        )


@pytest.mark.parametrize(
    "media_refs",
    [
        "r2notalist",
        [42],
        ["https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view"],
    ],
)
def test_meta_malformed_media_refs_rejected(tmp_path: Path, media_refs) -> None:
    with pytest.raises(SchemaError, match="media_refs"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_YT_REF, media_refs=media_refs)))


# regression against real repo -----------------------------------------------


REPO_META = Path(__file__).resolve().parent.parent / "talks"


@pytest.mark.skipif(not REPO_META.is_dir(), reason="no talks directory")
def test_all_shipped_meta_yaml_valid() -> None:
    """Every meta.yaml in the repo must already pass the schema."""
    failures: list[str] = []
    for meta in sorted(REPO_META.glob("*/meta.yaml")):
        try:
            validate_meta_yaml(str(meta))
        except SchemaError as e:
            failures.append(str(e))
    assert not failures, "Shipped meta.yaml failures:\n" + "\n".join(failures)


@pytest.mark.skipif(not REPO_META.is_dir(), reason="no talks directory")
def test_all_shipped_whisper_valid() -> None:
    failures: list[str] = []
    for w in sorted(REPO_META.glob("*/*/source/whisper.json")):
        try:
            validate_whisper_json(str(w))
        except SchemaError as e:
            failures.append(str(e))
    assert not failures, "Shipped whisper.json failures:\n" + "\n".join(failures[:5])


def test_whisper_duration_accepted(tmp_path: Path) -> None:
    data = dict(GOOD_WHISPER, duration=1234.5)
    validate_whisper_json(_w(tmp_path, "whisper.json", data))


@pytest.mark.parametrize("bad", [0, -1.0, "1234", None])
def test_whisper_duration_must_be_a_positive_number(tmp_path: Path, bad) -> None:
    data = dict(GOOD_WHISPER, duration=bad)
    with pytest.raises(SchemaError, match="duration"):
        validate_whisper_json(_w(tmp_path, "whisper.json", data))


def test_meta_youtube_video_with_bunny_and_drive_media_refs_ok(tmp_path: Path) -> None:
    validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_YT_REF, media_refs=[_BN_REF, *_GD_REFS])))


def test_meta_bunny_ref_is_not_a_video_ref(tmp_path: Path) -> None:
    with pytest.raises(SchemaError, match="video_ref"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=_BN_REF)))


def test_meta_vimeo_video_with_bunny_media_ref_rejected(tmp_path: Path) -> None:
    vimeo = encode_video_ref("https://vimeo.com/123456789")
    with pytest.raises(SchemaError, match="media_refs"):
        validate_meta_yaml(_w(tmp_path, "meta.yaml", _meta_with_video(video_ref=vimeo, media_refs=[_BN_REF])))
