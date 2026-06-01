"""Download materials from amruta.org and set up talk directory.

Fetches SRT subtitles, transcript text, and extracts Vimeo video URLs
from amruta.org talk pages using WordPress session cookie authentication.
Supports multiple videos per page and batch processing.

The talk folder is named {date}_{slugify(page_title)} — the same convention as
the SPA add-talk flow (see tools/talk_slug.py). Translations are fetched from
amruta's /{lang}/ URL variants into transcript_{lang}.txt.

Usage:
    # Single talk (date/slug auto-extracted from URL):
    python -m tools.download --url URL [--what srt,text] [--cookie COOKIE]

    # English + Ukrainian transcripts (folder/meta come from the EN page):
    python -m tools.download --url URL --langs en,uk

    # Batch mode (queue entries may carry a per-talk `langs:`):
    python -m tools.download --manifest queue.yaml [--what srt,text] [--cookie COOKIE]
"""

import argparse
import glob as globmod
import os
import re
import shutil
import subprocess
from urllib.parse import urlsplit, urlunsplit

import requests
import yaml
from bs4 import BeautifulSoup, Tag
from dotenv import load_dotenv

from tools.talk_slug import slugify
from tools.vimeo_codec import encode_video_ref


def parse_amruta_url(url):
    """Extract date and slug from amruta.org URL.

    URL pattern: https://www.amruta.org/YYYY/MM/DD/slug/
    Strips trailing year/location suffixes that duplicate the date prefix.
    Title-cases the slug: ganesha-puja → Ganesha-Puja.
    Returns (date, slug) tuple. Raises ValueError if URL doesn't match.
    """
    match = re.search(r"/(\d{4})/(\d{2})/(\d{2})/([^/?#]+)", url)
    if not match:
        raise ValueError(f"Cannot parse date/slug from URL: {url}")
    year, month, day, raw_slug = match.groups()
    raw_slug = raw_slug.rstrip("/")
    date = f"{year}-{month}-{day}"
    # Strip trailing year (e.g. "ganesha-puja-cabella-1993" → "ganesha-puja-cabella")
    raw_slug = re.sub(r"-\d{4}$", "", raw_slug)
    # Title-case: ganesha-puja-cabella → Ganesha-Puja-Cabella
    slug = "-".join(part.capitalize() for part in raw_slug.split("-"))
    return date, slug


def resolve_talk_slug(title, url, slug_override=None):
    """Resolve the talk-folder slug, matching the SPA add-talk flow.

    The SPA names a folder ``{date}_{slugify(title)}`` from the h1 page title
    (case preserved, no location suffix). download.py uses the SAME slugify
    (tools/talk_slug.py) so both paths produce identical folders for the same
    talk. Falls back to the URL slug (parse_amruta_url) when the title is
    missing or slugifies to empty. An explicit override always wins.
    """
    if slug_override:
        return slug_override
    slug = slugify(title or "")
    if slug:
        return slug
    _, url_slug = parse_amruta_url(url)
    return url_slug


# amruta serves translations under a 2-letter language path prefix, e.g.
# https://www.amruta.org/uk/1984/08/11/slug/ ; the English page has no prefix.
_LANG_PREFIX_RE = re.compile(r"^/([a-z]{2})(/.*)$")


def detect_url_lang(url):
    """Language code from an amruta URL's path prefix; 'en' when there is none.

    /uk/1984/08/11/slug/ -> 'uk' ; /1984/08/11/slug/ -> 'en'. The date segment
    is digits, so it never matches the 2-letter prefix.
    """
    m = _LANG_PREFIX_RE.match(urlsplit(url).path)
    return m.group(1) if m else "en"


def strip_lang_prefix(url):
    """Return the base (English) URL with any /xx language prefix removed."""
    parts = urlsplit(url)
    m = _LANG_PREFIX_RE.match(parts.path)
    if m:
        parts = parts._replace(path=m.group(2))
    return urlunsplit(parts)


def to_lang_url(url, lang):
    """Build the URL for ``lang`` from any amruta talk URL.

    'en' -> the base URL (no prefix); any other code -> a /{lang} prefix on the
    base path. Idempotent for a URL already in the target language.
    """
    base = urlsplit(strip_lang_prefix(url))
    if lang == "en":
        return urlunsplit(base)
    return urlunsplit(base._replace(path="/" + lang + base.path))


def normalize_vimeo_url(url):
    """Convert player.vimeo.com embed URL to vimeo.com direct URL.

    player.vimeo.com/video/ID?h=HASH&... → vimeo.com/ID/HASH
    The direct format works reliably with yt-dlp for both subtitles and video download.
    Non-player URLs are returned unchanged.
    """
    m = re.match(r"https?://player\.vimeo\.com/video/(\d+)\?h=([a-f0-9]+)", url)
    if m:
        return f"https://vimeo.com/{m.group(1)}/{m.group(2)}"
    return url


def slugify_video_name(name):
    """Slugify a video label for use as directory name.

    Keeps capitalization, spaces → hyphens, strips special chars.
    """
    name = name.strip()
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"\s+", "-", name)
    name = re.sub(r"-+", "-", name)
    return name.strip("-")


class AmrutaDownloader:
    """Downloads materials from amruta.org talk pages."""

    def __init__(self, session_cookie=None):
        load_dotenv()
        self.session_cookie = session_cookie or os.environ.get("AMRUTA_SESSION_COOKIE", "")
        self.session = requests.Session()
        self.session.headers["User-Agent"] = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )
        if self.session_cookie:
            for part in self.session_cookie.split("; "):
                if "=" in part:
                    name, value = part.split("=", 1)
                    self.session.cookies.set(name, value, domain=".amruta.org")

    def fetch_talk_page(self, url):
        """Fetch and parse a talk page."""
        resp = self.session.get(url)
        if resp.status_code != 200:
            print(f"  HTTP {resp.status_code} for {url}")
            print(f"  Response body (first 500 chars): {resp.text[:500]}")
            resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")

    def extract_title(self, soup):
        """Extract talk title from page."""
        title_tag = soup.find("h1", class_="entry-title")
        if title_tag:
            return title_tag.get_text(strip=True)
        title_tag = soup.find("title")
        if title_tag:
            text = title_tag.get_text(strip=True)
            # Remove site suffix like " – Nirmala Vidya Amruta"
            return re.sub(r"\s*[–—|]\s*Nirmala.*$", "", text)
        return None

    def extract_location(self, soup):
        """Extract location from the <h4> metadata header.

        The header has the structure:
            Date<br/>Title<br/>Location<br/>Talk Language: ...
        Location is the line immediately before "Talk Language:".
        """
        content = soup.find("div", class_="entry-content")
        if not content:
            return ""
        h4 = content.find("h4")
        if not h4:
            return ""
        # Split text by <br> tags — get text nodes between them
        lines = []
        for child in h4.children:
            if isinstance(child, str):
                t = child.strip()
                if t:
                    lines.append(t)
        # Find the line before "Talk Language:"
        for i, line in enumerate(lines):
            if line.startswith("Talk Language:") and i > 0:
                return lines[i - 1]
        return ""

    def extract_video_labels(self, soup):
        """Extract video labels and Vimeo URLs from page.

        Looks for amruta.org's embedded-video-wrapper structure first,
        then falls back to searching preceding text/headings.
        Returns list of {title, slug, vimeo_url} dicts.
        """
        videos = []

        # Strategy 1: amruta.org embedded-video-wrapper structure
        wrappers = soup.find_all("div", class_="embedded-video-wrapper")
        for idx, wrapper in enumerate(wrappers):
            iframe = wrapper.find("iframe", src=re.compile(r"player\.vimeo\.com"))
            if not iframe:
                continue
            vimeo_url = normalize_vimeo_url(iframe["src"])
            label = self._extract_video_meta_label(wrapper)
            if label:
                title = label
                slug = slugify_video_name(label)
            else:
                title = f"Video {idx + 1}"
                slug = f"Video-{idx + 1}"
            videos.append(
                {
                    "title": title,
                    "slug": slug,
                    "vimeo_url": vimeo_url,
                }
            )

        if not videos:
            # Strategy 2: fallback — find iframes directly
            iframes = soup.find_all("iframe", src=re.compile(r"player\.vimeo\.com"))
            for idx, iframe in enumerate(iframes):
                vimeo_url = normalize_vimeo_url(iframe["src"])
                label = self._find_preceding_label(iframe)
                if label:
                    title = label
                    slug = slugify_video_name(label)
                else:
                    title = f"Video {idx + 1}"
                    slug = f"Video-{idx + 1}"
                videos.append(
                    {
                        "title": title,
                        "slug": slug,
                        "vimeo_url": vimeo_url,
                    }
                )

        # Ensure unique slugs within the talk
        seen = {}
        for v in videos:
            s = v["slug"]
            if s in seen:
                seen[s] += 1
                v["slug"] = f"{s}-{seen[s]}"
            else:
                seen[s] = 1

        return videos

    def _extract_video_meta_label(self, wrapper):
        """Extract video label from amruta.org video-meta-info div.

        Format: "YYYY-MM-DD Title, Location, Country, Source, Duration′"
        We extract just the title part (between date and location comma).
        """
        meta_div = wrapper.find("div", class_="video-meta-info")
        if not meta_div:
            return None
        text = meta_div.get_text(strip=True)
        if not text:
            return None
        # Strip leading date "YYYY-MM-DD "
        text = re.sub(r"^\d{4}-\d{2}-\d{2}\s+", "", text)
        # Split by comma, take first part as title
        parts = text.split(",")
        if parts:
            return parts[0].strip()
        return text.strip()

    def _find_preceding_label(self, iframe):
        """Find the text/heading before an iframe element."""
        # Walk backwards through siblings
        node = iframe
        while True:
            node = node.previous_sibling
            if node is None:
                break
            if isinstance(node, Tag):
                if node.name in ("h1", "h2", "h3", "h4", "h5", "h6", "strong", "b"):
                    text = node.get_text(strip=True)
                    if text:
                        return text
                if node.name == "p":
                    strong = node.find(["strong", "b"])
                    if strong:
                        text = strong.get_text(strip=True)
                        if text:
                            return text
                    text = node.get_text(strip=True)
                    if text and len(text) < 60:
                        return text
                if node.name == "iframe":
                    break
        parent = iframe.parent
        if parent and parent.name in ("div", "p", "figure"):
            return self._find_preceding_label(parent)
        return None

    def extract_srt_links(self, soup):
        """Find SRT/VTT download links on the page."""
        links = []
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.endswith((".srt", ".vtt")):
                text = a.get_text(strip=True) or os.path.basename(href)
                links.append({"url": href, "label": text, "ext": os.path.splitext(href)[1]})
        return links

    def download_vimeo_subs(self, vimeo_url, output_dir):
        """Download English subtitles from Vimeo via yt-dlp, rename to en.srt."""
        if not shutil.which("yt-dlp"):
            raise RuntimeError("yt-dlp not found in PATH. Install: pip install yt-dlp")
        os.makedirs(output_dir, exist_ok=True)
        cmd = [
            "yt-dlp",
            "--referer",
            "https://www.amruta.org/",
            "--write-subs",
            "--sub-langs",
            "en",
            "--skip-download",
            "--sub-format",
            "srt/vtt/best",
            "--convert-subs",
            "srt",
            "-o",
            os.path.join(output_dir, "%(id)s.%(ext)s"),
            vimeo_url,
        ]
        subprocess.run(cmd, check=True)

        # Rename {vimeo_id}.{lang}.srt -> {lang}.srt
        downloaded = []
        for f in globmod.glob(os.path.join(output_dir, "*.srt")):
            basename = os.path.basename(f)
            parts = basename.rsplit(".", 2)  # e.g. ['333507352', 'en', 'srt']
            if len(parts) == 3:
                lang = parts[1]
                new_path = os.path.join(output_dir, f"{lang}.srt")
                os.rename(f, new_path)
                downloaded.append(new_path)
            else:
                downloaded.append(f)
        return downloaded

    def extract_transcript(self, soup):
        """Extract transcript text from page content.

        Strips video player wrappers and UI elements, keeps only
        the actual transcript (headings + paragraphs).
        """
        content = soup.find("div", class_="entry-content")
        if not content:
            content = soup.find("article")
        if not content:
            return None

        # Remove all non-transcript elements
        for tag in content.find_all(["script", "style", "iframe"]):
            tag.decompose()
        for cls in [
            "embedded-video-wrapper",
            "video-player-container",
            "video-links-container",
            "soundcloud-wrapper",
            "custom-modal",
            "custom-collapsible",
            "custom-alert",
        ]:
            for tag in content.find_all("div", class_=cls):
                tag.decompose()

        # Unwrap inline tags so their text merges with the parent block
        for tag in content.find_all(["em", "i", "strong", "b", "span", "a", "u", "sup", "sub"]):
            tag.unwrap()

        # Replace <br> with a sentinel (not "\n") so an *intentional* line
        # break survives whitespace normalization and stays distinguishable
        # from the literal newlines that hard-wrapped source posts embed inside
        # a paragraph. NUL never appears in real transcript text.
        BR = "\x00"
        for br in content.find_all("br"):
            br.replace_with(BR)

        HEADINGS = {"h1", "h2", "h3", "h4", "h5", "h6"}
        lines = []
        prev_was_heading = False
        for el in content.find_all(["p", *HEADINGS, "li", "blockquote"]):
            # get_text with separator destroys \n from <br>; collect manually
            raw = el.get_text()
            # Strip WordPress Object Replacement Characters (U+FFFC)
            raw = raw.replace("\ufffc", "")
            # Header blocks (date / title / location / language) keep their
            # line structure regardless of markup: preserve literal newlines
            # AND <br>, collapsing only horizontal whitespace. Prose collapses
            # ALL whitespace -- including the literal newlines a hard-wrapped
            # source embeds inside a paragraph, and non-breaking spaces
            # (U+00A0) -- to single spaces, so each paragraph is one line; only
            # an explicit <br> (restored next) breaks a line.
            ws = r"[^\S\n]+" if el.name in HEADINGS else r"\s+"
            raw = re.sub(ws, " ", raw)
            raw = raw.replace(BR, "\n")
            # Trim each line and drop empties
            block_lines = [ln.strip() for ln in raw.split("\n")]
            block_text = "\n".join(ln for ln in block_lines if ln)
            if block_text:
                # Blank line after heading to separate header from body
                if prev_was_heading and el.name not in HEADINGS:
                    lines.append("")
                lines.append(block_text)
            prev_was_heading = el.name in HEADINGS

        # Deduplicate: amruta.org sometimes has duplicate paragraph blocks
        # in the HTML. Remove consecutive runs of paragraphs that are
        # exact copies of earlier paragraphs.
        lines = self._deduplicate_paragraphs(lines)

        text = "\n".join(lines)
        return text if text else None

    @staticmethod
    def _deduplicate_paragraphs(lines):
        """Remove duplicate paragraph blocks from extracted text.

        Some amruta.org pages contain a block of paragraphs duplicated
        verbatim later in the page. Detects runs of 3+ consecutive lines
        where each is an exact copy of an earlier line, and removes them.
        """
        # Build index: line text → first occurrence index
        first_seen = {}
        for i, line in enumerate(lines):
            if line and line not in first_seen:
                first_seen[line] = i

        # Find duplicate runs: consecutive lines that all appeared earlier
        i = 0
        to_remove = set()
        while i < len(lines):
            if not lines[i] or lines[i] not in first_seen or first_seen[lines[i]] == i:
                i += 1
                continue
            # This line is a duplicate — check how long the run is
            run_start = i
            while i < len(lines) and lines[i] and lines[i] in first_seen and first_seen[lines[i]] < run_start:
                i += 1
            run_len = i - run_start
            if run_len >= 3:
                # Long enough to be a real duplicate block, not coincidence
                for j in range(run_start, i):
                    to_remove.add(j)
            # else: short run (1-2 lines), could be legitimate repetition

        if to_remove:
            lines = [line for i, line in enumerate(lines) if i not in to_remove]

        return lines

    def download_file(self, url, output_path):
        """Download a file to disk."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        resp = self.session.get(url, stream=True)
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return output_path

    def download_video(self, vimeo_url, output_path):
        """Download video via yt-dlp with amruta.org referer."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cmd = [
            "yt-dlp",
            "--referer",
            "https://www.amruta.org/",
            "-o",
            output_path,
            vimeo_url,
        ]
        subprocess.run(cmd, check=True)
        return output_path

    def download_talk_all(self, url, talk_dir, what="srt,text", soup=None):
        """Download videos and per-video SRTs from a talk page.

        Creates named subdirectories per video and downloads SRTs per video
        from Vimeo. Transcript text is NOT written here — process_single_url
        handles it per language so one EN fetch can drive transcript_en while
        /uk/, /ru/, ... drive the translations.

        Args:
            url: amruta.org talk page URL
            talk_dir: talk root directory (e.g. talks/1993-09-19_ganesha-puja)
            what: comma-separated list of {all,srt,text,video}
            soup: pre-fetched BeautifulSoup of the page (avoids a second GET
                when the caller already fetched it to derive the folder slug)

        Returns:
            dict with keys: title, videos, transcript_path
        """
        what_set = set(what.split(","))
        do_all = "all" in what_set

        if soup is None:
            soup = self.fetch_talk_page(url)
        title = self.extract_title(soup)
        videos = self.extract_video_labels(soup)

        if not videos:
            print("  WARNING: No Vimeo videos found on page")

        location = self.extract_location(soup)

        result = {
            "title": title,
            "location": location,
            "videos": videos,
            "transcript_path": None,
        }

        # Download SRTs per video
        if do_all or "srt" in what_set:
            for video in videos:
                source_dir = os.path.join(talk_dir, video["slug"], "source")
                os.makedirs(source_dir, exist_ok=True)
                print(f"  Downloading SRTs for: {video['title']}")
                srt_files = self.download_vimeo_subs(video["vimeo_url"], source_dir)
                video["srt_files"] = srt_files
                for f in srt_files:
                    print(f"    Downloaded: {os.path.basename(f)}")

        # Transcript text is handled per-language by the caller
        # (process_single_url) so a single EN page fetch can drive transcript_en
        # while /uk/, /ru/, ... pages drive transcript_uk, transcript_ru, etc.

        # Download videos
        if do_all or "video" in what_set:
            for video in videos:
                source_dir = os.path.join(talk_dir, video["slug"], "source")
                video_path = os.path.join(source_dir, "video.mp4")
                print(f"  Downloading video: {video['title']}")
                self.download_video(video["vimeo_url"], video_path)

        return result


_LANG_MAP = {
    "english": "en",
    "hindi": "hi",
    "marathi": "mr",
    "french": "fr",
    "italian": "it",
    "german": "de",
    "russian": "ru",
    "spanish": "es",
}


def _detect_talk_language(talk_dir):
    """Detect talk language from 'Talk Language:' header in transcript_en.txt.

    Returns (primary_language_code, list_of_other_language_codes).
    Defaults to ('en', []) if header not found.
    """
    transcript_path = os.path.join(talk_dir, "transcript_en.txt")
    if not os.path.isfile(transcript_path):
        return "en", []

    with open(transcript_path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("Talk Language:"):
                # "Talk Language: English, Marathi | ..."
                lang_part = line.split("|")[0].replace("Talk Language:", "").strip()
                langs = [name.strip().lower() for name in lang_part.split(",")]
                codes = [_LANG_MAP.get(name, name[:2]) for name in langs if name]
                if codes:
                    return codes[0], codes[1:]
                break
    return "en", []


def setup_talk(talk_dir, url, date, slug, title, location, videos):
    """Create meta.yaml and video subdirs for a talk.

    Args:
        talk_dir: talk root directory
        url: amruta.org URL
        date: talk date (YYYY-MM-DD)
        slug: talk slug
        title: talk title
        location: talk location (extracted from page header)
        videos: list of {title, slug, vimeo_url} dicts
    """
    os.makedirs(talk_dir, exist_ok=True)

    # Create video subdirectories
    for video in videos:
        video_dir = os.path.join(talk_dir, video["slug"])
        os.makedirs(os.path.join(video_dir, "source"), exist_ok=True)
        os.makedirs(os.path.join(video_dir, "work"), exist_ok=True)
        os.makedirs(os.path.join(video_dir, "final"), exist_ok=True)

    # Detect talk language from transcript header
    talk_lang, other_langs = _detect_talk_language(talk_dir)

    # meta.yaml at talk root
    meta = {
        "title": title or slug,
        "date": date,
        "location": location,
        "amruta_url": url,
        "language": talk_lang,
    }
    if other_langs:
        meta["other_languages"] = other_langs
    # Links are stored obfuscated as video_ref (see tools/vimeo_codec.py) so
    # private Vimeo URLs never appear as plaintext in the public repo.
    meta_videos = []
    for v in videos:
        entry = {"slug": v["slug"], "title": v["title"]}
        vimeo_url = v.get("vimeo_url", "")
        if vimeo_url:
            entry["video_ref"] = encode_video_ref(vimeo_url)
        meta_videos.append(entry)
    meta["videos"] = meta_videos
    meta_path = os.path.join(talk_dir, "meta.yaml")
    with open(meta_path, "w", encoding="utf-8") as f:
        yaml.dump(meta, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    print("  Created: meta.yaml")


def process_single_url(downloader, url, what, slug_override=None, langs=None):
    """Process a single amruta.org URL.

    ``langs`` is the list of transcript languages to fetch (e.g. ["en", "uk"]).
    When omitted it defaults to the language of ``url`` itself (so a /uk/ URL
    fetches UK). The folder, meta.yaml, videos and SRTs always come from the
    English page — the EN title is what names the folder (the SPA's convention),
    and a translation's page title is in its own script.
    """
    en_url = strip_lang_prefix(url)
    date, _url_slug = parse_amruta_url(en_url)
    if not langs:
        langs = [detect_url_lang(url)]
    what_set = set(what.split(","))
    want_text = "all" in what_set or "text" in what_set

    # Fetch the EN page once, then name the folder from its title (like the SPA)
    # — the URL slug is lowercased and keeps the location suffix, so it can't
    # reproduce the SPA's folder name. resolve_talk_slug falls back to the URL
    # slug if the title is unusable. The soup is reused by download_talk_all.
    en_soup = downloader.fetch_talk_page(en_url)
    title = downloader.extract_title(en_soup)
    slug = resolve_talk_slug(title, en_url, slug_override)
    talk_id = f"{date}_{slug}"
    talk_dir = os.path.join("talks", talk_id)

    print(f"\nDownloading talk: {talk_id}")
    print(f"  URL: {en_url}   langs: {', '.join(langs)}")

    # Videos, SRTs and video downloads come from the EN page.
    result = downloader.download_talk_all(en_url, talk_dir, what, soup=en_soup)

    # One transcript per requested language -> transcript_{lang}.txt. The EN page
    # is already fetched; other languages live at /{lang}/... with the same DOM.
    transcripts = {}
    if want_text:
        for lang in langs:
            if lang == "en":
                soup = en_soup
            else:
                lang_url = to_lang_url(en_url, lang)
                print(f"  Fetching {lang} transcript: {lang_url}")
                soup = downloader.fetch_talk_page(lang_url)
            text = downloader.extract_transcript(soup)
            if not text:
                print(f"  WARNING: no {lang} transcript found")
                continue
            os.makedirs(talk_dir, exist_ok=True)
            path = os.path.join(talk_dir, f"transcript_{lang}.txt")
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            transcripts[lang] = path
            print(f"  Saved transcript: transcript_{lang}.txt")

    # Only create meta.yaml + dirs on full setup (not text-only re-downloads).
    # _detect_talk_language reads transcript_en.txt, so this runs after the
    # transcript loop above.
    if "all" in what_set or "srt" in what_set or "video" in what_set:
        setup_talk(
            talk_dir=talk_dir,
            url=en_url,
            date=date,
            slug=slug,
            title=result["title"],
            location=result["location"],
            videos=result["videos"],
        )

    print(f"\nDone: talks/{talk_id}/")
    print(f"  Title: {result['title']}")
    print(f"  Videos: {len(result['videos'])}")
    for v in result["videos"]:
        print(f"    - {v['slug']}: {v['vimeo_url']}")
    for lang, path in transcripts.items():
        print(f"  Transcript ({lang}): {path}")

    return talk_id


def main():
    parser = argparse.ArgumentParser(description="Download talk(s) from amruta.org")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--url", help="amruta.org talk page URL")
    group.add_argument("--manifest", help="Batch manifest YAML file (e.g. queue.yaml)")
    parser.add_argument("--slug", help="Override slug (single URL mode only)")
    parser.add_argument("--what", default="srt,text", help="What to download: all,srt,text,video")
    parser.add_argument(
        "--langs",
        help="Comma-separated transcript languages, e.g. 'en,uk' "
        "(default: the language of the URL). Folder/meta come from EN.",
    )
    parser.add_argument("--cookie", help="Session cookie (overrides env)")
    args = parser.parse_args()

    langs = [s.strip() for s in args.langs.split(",") if s.strip()] if args.langs else None

    downloader = AmrutaDownloader(session_cookie=args.cookie)

    if args.url:
        process_single_url(downloader, args.url, args.what, args.slug, langs=langs)
    else:
        with open(args.manifest, encoding="utf-8") as f:
            manifest = yaml.safe_load(f)
        talks = manifest.get("talks", [])
        print(f"Batch mode: {len(talks)} talk(s) to process")
        for entry in talks:
            url = entry["url"]
            slug_override = entry.get("slug")
            entry_langs = (
                [s.strip() for s in entry["langs"].split(",") if s.strip()]
                if isinstance(entry.get("langs"), str)
                else entry.get("langs", langs)
            )
            try:
                process_single_url(downloader, url, args.what, slug_override, langs=entry_langs)
            except Exception as e:
                print(f"\nERROR processing {url}: {e}")
                continue


if __name__ == "__main__":
    main()
