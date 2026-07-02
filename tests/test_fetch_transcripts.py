"""Tests for tools.fetch_transcripts (sentinel semantics)."""

import os

from tools.fetch_transcripts import fetch_and_save


class _StubDownloader:
    """Downloader stub: page fetches fine but yields the given transcript."""

    def __init__(self, text):
        self._text = text

    def fetch_talk_page(self, url):
        return "<soup>"

    def extract_transcript(self, soup):
        return self._text


class _Stub404Downloader:
    def fetch_talk_page(self, url):
        raise RuntimeError("HTTP 404 Not Found")

    def extract_transcript(self, soup):  # pragma: no cover — never reached
        raise AssertionError


def test_empty_extraction_writes_no_sentinel(tmp_path):
    """A page that loads but yields no transcript (expired cookie, stub page,
    layout change) must NOT be stamped complete forever — no sentinel file,
    so the next run retries."""
    out = tmp_path / "corpus" / "slug" / "en.txt"
    status = fetch_and_save(_StubDownloader(None), "https://x", str(out), "en")
    assert status == "empty"
    assert not out.exists()


def test_real_404_still_writes_sentinel(tmp_path):
    """A genuine 404 keeps the empty-sentinel behavior (never refetched)."""
    out = tmp_path / "corpus" / "slug" / "en.txt"
    status = fetch_and_save(_Stub404Downloader(), "https://x", str(out), "en")
    assert status == "404"
    assert out.exists()
    assert out.read_text(encoding="utf-8") == ""


def test_ok_extraction_written(tmp_path):
    out = tmp_path / "corpus" / "slug" / "en.txt"
    text = "Перший абзац. " * 20
    status = fetch_and_save(_StubDownloader(text), "https://x", str(out), "en")
    assert status == "ok"
    assert out.read_text(encoding="utf-8") == text
    assert os.path.getsize(out) > 0
