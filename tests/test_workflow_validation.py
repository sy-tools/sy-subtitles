import pytest

from tools.vimeo_codec import encode_video_ref
from tools.workflow_validation import (
    InvalidWorkflowInput,
    validate_clip,
    validate_git_ref,
    validate_subs_scale,
    validate_talk_id,
    validate_video_ref,
    validate_video_slug,
    validate_vimeo_url,
)


@pytest.mark.parametrize(
    "value",
    [
        "1988-05-08_Sahasrara-Puja-Fregene",
        "1993-09-19_Ganesha-Puja-Cabella",
        "2001-01-01_a",
        "1970-12-31_slug.with.dots",
    ],
)
def test_talk_id_accepts_valid(value: str) -> None:
    assert validate_talk_id(value) == value


@pytest.mark.parametrize(
    "value",
    [
        "not-a-date",
        "1988-5-8_slug",
        "1988-05-08",
        "1988-05-08_",
        "1988-05-08_slug;rm -rf /",
        "1988-05-08_slug$(curl evil)",
        "1988-05-08_slug with spaces",
        "../escape",
        "1988-05-08_" + "x" * 200,
        # Surrounding whitespace is rejected by the anchored regex. The pipeline
        # therefore MUST strip before validating (the discover job does), and —
        # the real lesson of run #447 — must use that same stripped value
        # downstream, never the raw input. See test_pipeline_talk_id_normalization.
        "  1988-05-08_slug",
        "1988-05-08_slug  ",
        "\t1988-05-08_slug",
        "1988-05-08_slug\n",
    ],
)
def test_talk_id_rejects_invalid(value: str) -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_talk_id(value)


@pytest.mark.parametrize("value", ["morning", "talk_01", "talk-01", "a", "v.1"])
def test_video_slug_accepts(value: str) -> None:
    assert validate_video_slug(value) == value


@pytest.mark.parametrize(
    "value",
    [
        "",
        "a;b",
        "$(whoami)",
        "a b",
        "a/b",
        "x" * 200,
        'slug";curl x;"',
        # path-safety: dot-only and option-like values defeat the allowlist
        ".",
        "..",
        "...",
        "-rf",
        "--help",
        ".hidden",
    ],
)
def test_video_slug_rejects(value: str) -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_video_slug(value)


@pytest.mark.parametrize(
    "value",
    [
        "https://vimeo.com/123456789",
        "https://vimeo.com/123456789/abcdef123",
        "https://player.vimeo.com/video/123456789",
        "https://player.vimeo.com/video/123456789/abcdef0",
        "https://www.vimeo.com/123456789",
    ],
)
def test_vimeo_url_accepts(value: str) -> None:
    assert validate_vimeo_url(value) == value


@pytest.mark.parametrize(
    "value",
    [
        "http://vimeo.com/123",
        "https://youtube.com/watch?v=x",
        "https://vimeo.com/abc",
        "https://vimeo.com/123;curl evil",
        "https://evil.com/#vimeo.com/123",
        "",
    ],
)
def test_vimeo_url_rejects(value: str) -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_vimeo_url(value)


@pytest.mark.parametrize(
    "url",
    [
        "https://vimeo.com/123456789",
        "https://vimeo.com/111111111/aaaaaaaaaa",
    ],
)
def test_video_ref_accepts_encoded_vimeo_url(url: str) -> None:
    ref = encode_video_ref(url)
    assert validate_video_ref(ref) == ref


def test_video_ref_rejects_unknown_version() -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_video_ref("r9zzzz")


@pytest.mark.parametrize("bad", ["r1zz", "r1AAAAA", "r1", "r1!!!", "r1@@@@"])
def test_video_ref_rejects_malformed_payload(bad: str) -> None:
    # Correctly-versioned but corrupt payloads must be rejected cleanly, never
    # crash. decode_video_ref may raise binascii.Error / UnicodeDecodeError
    # (both ValueError subclasses, so caught) or decode to a junk URL that the
    # VIMEO_URL_RE re-check rejects. Either way: InvalidWorkflowInput, no crash.
    with pytest.raises(InvalidWorkflowInput):
        validate_video_ref(bad)


def test_video_ref_rejects_empty() -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_video_ref("")


def test_video_ref_rejects_decoded_injection() -> None:
    # A ref that decodes to a vimeo.com URL with shell metacharacters must be
    # rejected — the decoded value is re-checked against VIMEO_URL_RE, so the
    # injection protection survives the obfuscation layer.
    malicious = encode_video_ref("https://vimeo.com/123;curl evil")
    with pytest.raises(InvalidWorkflowInput):
        validate_video_ref(malicious)


@pytest.mark.parametrize(
    "value",
    [
        "main",
        "worktree-burn-subtitles",
        # The shape edit-sync actually produces, which is the whole reason this
        # validator exists: the SPA renders the reviewer's branch, not main.
        "sync/SlavaSubotskiy/1982-08-01_Adi-Shakti-puja--Mantras-uk",
        "refs/heads/main",
        "v1.2.3",
        "_scratch",
    ],
)
def test_git_ref_accepts_valid(value: str) -> None:
    assert validate_git_ref(value) == value


@pytest.mark.parametrize(
    "value",
    [
        "",
        "-rf",  # option-like: would be read as a flag by whatever consumes it
        "--upload-pack=evil",
        "..",
        "a..b",  # git's own reserved sequence
        "main;curl evil",
        "main$(curl evil)",
        "main with spaces",
        "main\nsecond-line",
        "main/",
        "a//b",
        "back\\slash",
        "head@{1}",
        "tilde~1",
        "caret^",
        "colon:name",
        "quest?ion",
        "star*",
        "brack[et",
        "x" * 256,
    ],
)
def test_git_ref_rejects_the_rest(value: str) -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_git_ref(value)


def test_cli_accepts_valid_source_ref() -> None:
    from tools.workflow_validation_cli import main

    main(["--source-ref", "sync/SlavaSubotskiy/1982-08-01_x-uk"])  # must not raise / exit


def test_cli_rejects_bad_source_ref() -> None:
    from tools.workflow_validation_cli import main

    with pytest.raises(SystemExit):
        main(["--source-ref", "main;curl evil"])


def test_cli_accepts_valid_video_ref() -> None:
    from tools.workflow_validation_cli import main

    ref = encode_video_ref("https://vimeo.com/111111111/aaaaaaaaaa")
    main(["--video-ref", ref])  # must not raise / exit


def test_cli_rejects_bad_video_ref() -> None:
    from tools.workflow_validation_cli import main

    with pytest.raises(SystemExit):
        main(["--video-ref", "not-a-ref"])


@pytest.mark.parametrize("value", ["10", "55", "100", "250", "1000"])
def test_subs_scale_accepts_a_whole_percent_in_the_band(value: str) -> None:
    assert validate_subs_scale(value) == value


@pytest.mark.parametrize(
    "value",
    [
        "",
        "9",
        "1001",
        "0",
        "010",
        "+100",
        "-5",
        "100%",
        "100.0",
        "1e2",
        " 100",
        "100\n",
        "١٠٠",  # Arabic-Indic digits: \d and int() accept them
    ],
)
def test_subs_scale_rejects_the_rest(value: str) -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_subs_scale(value)


def test_an_empty_clip_means_the_whole_video() -> None:
    # The input's default. burn_clip.parse_clip refuses "" on purpose — to it
    # there is no such clip — so this is the one value where the two differ.
    assert validate_clip("") == ""


@pytest.mark.parametrize("value", ["0-1000", "1000-2000", "2000-5000", "7200000-7260000", "0-999999999"])
def test_clip_accepts_valid(value: str) -> None:
    assert validate_clip(value) == value


@pytest.mark.parametrize(
    "value",
    [
        " ",
        "1000",
        "-5-3000",
        "01000-3000",
        "1000-3000\n",
        "1.5-3000",
        "3000-1000",
        "1000-1999",  # under the one-second minimum
        "١٠٠٠-٣٠٠٠",  # Arabic-Indic digits
        "0-1000000000",  # ten digits
        "0-9999999999999999",  # passed once, then killed ffmpeg after the download
    ],
)
def test_clip_rejects_the_rest(value: str) -> None:
    with pytest.raises(InvalidWorkflowInput):
        validate_clip(value)


def test_the_clip_guard_says_what_is_wrong() -> None:
    with pytest.raises(InvalidWorkflowInput, match="before"):
        validate_clip("3000-1000")


def test_cli_accepts_the_values_a_default_dispatch_sends() -> None:
    from tools.workflow_validation_cli import main

    main(["--subs-scale=100", "--clip="])  # must not raise / exit


@pytest.mark.parametrize("argv", [["--subs-scale=5"], ["--subs-scale=-5"], ["--clip=3000-1000"]])
def test_cli_rejects_a_bad_scale_or_clip_legibly(argv: list[str], capsys: pytest.CaptureFixture[str]) -> None:
    from tools.workflow_validation_cli import main

    with pytest.raises(SystemExit) as excinfo:
        main(argv)
    assert excinfo.value.code == 1
    assert capsys.readouterr().err.startswith("::error::")


def test_cli_refuses_a_clip_bound_past_nine_digits_by_name(capsys: pytest.CaptureFixture[str]) -> None:
    # The review's example: accepted by an unbounded grammar, clamped for the
    # gates, and then fatal to ffmpeg's -t parser after the whole download.
    from tools.workflow_validation_cli import main

    with pytest.raises(SystemExit) as excinfo:
        main(["--clip=0-9999999999999999"])
    assert excinfo.value.code == 1
    err = capsys.readouterr().err
    assert err.startswith("::error::") and "9 digits" in err


def test_cli_reads_a_dash_leading_clip_as_a_value_in_the_equals_form(capsys: pytest.CaptureFixture[str]) -> None:
    # As a separate word, "-5-3000" is an option to argparse (Python 3.12, the
    # runner's): a usage error with exit 2 instead of a legible annotation. The
    # workflow passes --clip="$CLIP" for exactly this reason.
    from tools.workflow_validation_cli import main

    with pytest.raises(SystemExit) as excinfo:
        main(["--clip=-5-3000"])
    assert excinfo.value.code == 1
    err = capsys.readouterr().err
    assert err.startswith("::error::") and "-5-3000" in err
