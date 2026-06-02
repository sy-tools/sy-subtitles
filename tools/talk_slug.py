"""Canonical talk-folder slugify — Python twin of site/js/talk_slug.js.

The SPA add-talk flow names a talk folder ``{date}_{slugify(title)}``; this is
the source of truth. ``tools/download.py`` uses the same ``slugify`` so a talk
downloaded locally lands in the SAME folder as one added via the SPA.

Keep this byte-for-byte equivalent to ``site/js/talk_slug.js``. Both are tested
against the shared fixture ``tests/fixtures/slug_cases.json``
(tests/test_talk_slug.py + tests/test_talk_slug.js), so the two cannot drift.
"""

import re


def slugify(text):
    """Slugify a talk title for use as a folder name.

    Strips everything but ASCII letters/digits/space/hyphen, turns whitespace
    runs into single hyphens, collapses repeats, and trims edge hyphens.
    Case is PRESERVED (not title-cased), so "Raksha Bandhan and Maryadas"
    keeps its lowercase "and" -> "Raksha-Bandhan-and-Maryadas".
    """
    text = re.sub(r"[^a-zA-Z0-9 -]", "", text or "")
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    text = re.sub(r"^-|-$", "", text)
    return text
