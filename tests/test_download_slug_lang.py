"""Tests for download.py folder-slug-from-title (task 3) and multi-language (task 2)."""

from bs4 import BeautifulSoup

from tools.download import AmrutaDownloader, process_single_url, resolve_talk_slug


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
