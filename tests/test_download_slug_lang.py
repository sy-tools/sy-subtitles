"""Tests for download.py folder-slug-from-title (task 3) and multi-language (task 2)."""

from bs4 import BeautifulSoup

from tools.download import (
    AmrutaDownloader,
    detect_url_lang,
    process_single_url,
    resolve_talk_slug,
    strip_lang_prefix,
    to_lang_url,
)


def _soup(html):
    return BeautifulSoup(html, "html.parser")


# A page whose h1 title ("Raksha Bandhan and Maryadas") differs from both the
# URL slug (raksha-bandhan-and-maryadas-hounslow-1984) and the <h4> header title
# ("Talk to Sahaja Yogis") — exactly the real amruta page for this talk.
_RAKSHA_HTML = (
    "<html><body>"
    '<h1 class="entry-title">Raksha Bandhan and Maryadas</h1>'
    '<div class="entry-content">'
    "<h4>11 August 1984<br/>Talk to Sahaja Yogis<br/>"
    "Montague Hall, Hounslow (England)<br/>"
    "Talk Language: English | Transcript (English)</h4>"
    "<p>After the great tour of UK I feel very confident.</p>"
    "</div></body></html>"
)
_RAKSHA_URL = "https://www.amruta.org/1984/08/11/raksha-bandhan-and-maryadas-hounslow-1984/"


# --- task 3: folder slug derived from the page title, matching the SPA ---


def test_slug_from_title_matches_spa():
    """URL slug would be 'Raksha-Bandhan-And-Maryadas-Hounslow' (capitalized,
    location kept). The SPA derives it from the h1 title instead; download.py
    must match: case preserved, no location suffix."""
    slug = resolve_talk_slug(
        title="Raksha Bandhan and Maryadas",
        url="https://www.amruta.org/1984/08/11/raksha-bandhan-and-maryadas-hounslow-1984/",
    )
    assert slug == "Raksha-Bandhan-and-Maryadas"


def test_slug_override_wins():
    assert (
        resolve_talk_slug(
            title="Raksha Bandhan and Maryadas",
            url="https://www.amruta.org/1984/08/11/x/",
            slug_override="My-Custom-Slug",
        )
        == "My-Custom-Slug"
    )


def test_slug_falls_back_to_url_when_title_empty():
    """No usable title -> fall back to the URL slug (parse_amruta_url)."""
    slug = resolve_talk_slug(
        title="",
        url="https://www.amruta.org/1993/09/19/ganesha-puja-cabella-1993/",
    )
    assert slug == "Ganesha-Puja-Cabella"


def test_slug_falls_back_to_url_when_title_is_all_punctuation():
    """A title that slugifies to empty -> URL fallback, not an empty slug."""
    slug = resolve_talk_slug(
        title="!!!",
        url="https://www.amruta.org/1993/09/19/ganesha-puja-cabella-1993/",
    )
    assert slug == "Ganesha-Puja-Cabella"


def test_process_single_url_folder_uses_title_slug(tmp_path, monkeypatch):
    """End-to-end: the created folder matches the SPA (title slug), not the URL
    slug or the <h4> header title."""
    monkeypatch.chdir(tmp_path)
    dl = AmrutaDownloader.__new__(AmrutaDownloader)  # no __init__: no network/cookie
    monkeypatch.setattr(dl, "fetch_talk_page", lambda url: _soup(_RAKSHA_HTML))

    talk_id = process_single_url(dl, _RAKSHA_URL, "text")

    assert talk_id == "1984-08-11_Raksha-Bandhan-and-Maryadas"
    folder = tmp_path / "talks" / "1984-08-11_Raksha-Bandhan-and-Maryadas"
    assert (folder / "transcript_en.txt").exists()


# --- task 2: language detection / URL building (pure) ---


def test_detect_url_lang_en():
    assert detect_url_lang("https://www.amruta.org/1984/08/11/raksha-x/") == "en"


def test_detect_url_lang_uk():
    assert detect_url_lang("https://www.amruta.org/uk/1984/08/11/raksha-x/") == "uk"


def test_strip_lang_prefix_removes_uk():
    assert strip_lang_prefix("https://www.amruta.org/uk/1984/08/11/x/") == "https://www.amruta.org/1984/08/11/x/"


def test_strip_lang_prefix_noop_for_en():
    assert strip_lang_prefix("https://www.amruta.org/1984/08/11/x/") == "https://www.amruta.org/1984/08/11/x/"


def test_to_lang_url_en_to_uk():
    assert to_lang_url("https://www.amruta.org/1984/08/11/x/", "uk") == "https://www.amruta.org/uk/1984/08/11/x/"


def test_to_lang_url_uk_to_en_strips_prefix():
    assert to_lang_url("https://www.amruta.org/uk/1984/08/11/x/", "en") == "https://www.amruta.org/1984/08/11/x/"


def test_to_lang_url_uk_to_uk_idempotent():
    assert to_lang_url("https://www.amruta.org/uk/1984/08/11/x/", "uk") == "https://www.amruta.org/uk/1984/08/11/x/"


# --- task 2: per-language transcript download ---

_UK_HTML = (
    "<html><body>"
    '<h1 class="entry-title">Ракша Бандхан та Маріади</h1>'
    '<div class="entry-content">'
    "<h4>11 серпня 1984<br/>Talk to Sahaja Yogis<br/>Монтегю Хол<br/>"
    "Мова промови: англійська | Транскрипт (українська)</h4>"
    "<p>Після великого туру Об'єднаним Королівством.</p>"
    "</div></body></html>"
)


def _en_uk_fetcher(en_html=_RAKSHA_HTML, uk_html=_UK_HTML):
    def fetch(url):
        return _soup(uk_html if "/uk/" in url else en_html)

    return fetch


def test_process_single_url_writes_both_lang_transcripts(tmp_path, monkeypatch):
    """--langs en,uk writes transcript_en.txt + transcript_uk.txt; folder still
    from the EN title (the UK page title is Cyrillic and unusable for a slug)."""
    monkeypatch.chdir(tmp_path)
    dl = AmrutaDownloader.__new__(AmrutaDownloader)
    monkeypatch.setattr(dl, "fetch_talk_page", _en_uk_fetcher())

    talk_id = process_single_url(dl, _RAKSHA_URL, "text", langs=["en", "uk"])

    assert talk_id == "1984-08-11_Raksha-Bandhan-and-Maryadas"
    folder = tmp_path / "talks" / "1984-08-11_Raksha-Bandhan-and-Maryadas"
    assert (folder / "transcript_en.txt").exists()
    assert (folder / "transcript_uk.txt").exists()
    assert "Після великого туру" in (folder / "transcript_uk.txt").read_text(encoding="utf-8")


def test_process_single_url_default_lang_from_uk_url(tmp_path, monkeypatch):
    """A /uk/ URL with no --langs defaults to fetching only UK; the folder still
    comes from the EN page title."""
    monkeypatch.chdir(tmp_path)
    dl = AmrutaDownloader.__new__(AmrutaDownloader)
    monkeypatch.setattr(dl, "fetch_talk_page", _en_uk_fetcher())
    uk_url = "https://www.amruta.org/uk/1984/08/11/raksha-bandhan-and-maryadas-hounslow-1984/"

    talk_id = process_single_url(dl, uk_url, "text")

    assert talk_id == "1984-08-11_Raksha-Bandhan-and-Maryadas"
    folder = tmp_path / "talks" / "1984-08-11_Raksha-Bandhan-and-Maryadas"
    assert (folder / "transcript_uk.txt").exists()
    assert not (folder / "transcript_en.txt").exists()
