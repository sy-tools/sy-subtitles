"""Shared helpers for the sync_srt_to_transcript / sync_transcript_to_srt
pair and the sync_pr driver on top of them.

Keeps git-base lookups and transcript text-splicing primitives in one
place so no single sync tool owns logic that another needs to call.
"""

import difflib
import re
import subprocess
from pathlib import Path

from .text_segmentation import strip_omitted_phrases

MIN_FRAGMENT = 3  # shortest fragment worth trying to locate in a block


def joined_text(texts) -> str:
    """Block (or paragraph) texts as one whitespace-normalised string.

    The predicate that separates a re-cut from an edit: when two sides of a
    diff join to the same string, the words did not change — only the
    boundaries between them did. `sync_srt_to_transcript` uses it to keep a
    re-cut OUT of the transcript, and `sync_propagate` uses it to route that
    same re-cut onto the talk's other videos. One definition, because two
    copies of a normaliser drift (#920/#922).
    """
    return " ".join(" ".join(t.split()) for t in texts)


def load_base_from_git(sha: str, path: str, dest: Path) -> bool:
    """Write the `sha:path` version of a file to `dest`.

    Returns False ONLY when the file genuinely did not exist at that SHA
    (e.g. it was added in this PR). Uses `git show` with binary capture so
    content round-trips untouched.

    Any other git failure is raised. `git show` cannot say why it failed, and
    reading every failure as "the file is new" turns an unresolvable baseline
    into the sentence _plan_talk renders as "transcript is new in this PR —
    skip": an empty plan, exit 0, a green check, and not one human edit
    synced. That is the same failure-looks-like-success shape as a swallowed
    `git diff`, so the two possibilities are told apart explicitly.
    """
    try:
        data = subprocess.run(
            ["git", "show", f"{sha}:{path}"],
            capture_output=True,
            check=True,
        ).stdout
    except subprocess.CalledProcessError as exc:
        commit_resolves = (
            subprocess.run(
                ["git", "rev-parse", "--verify", "--quiet", f"{sha}^{{commit}}"],
                capture_output=True,
            ).returncode
            == 0
        )
        path_is_there = (
            subprocess.run(
                ["git", "cat-file", "-e", f"{sha}:{path}"],
                capture_output=True,
            ).returncode
            == 0
        )
        if commit_resolves and not path_is_there:
            return False
        raise RuntimeError(f"git show {sha}:{path} failed: {exc.stderr.decode('utf-8', 'replace').strip()}") from exc
    dest.write_bytes(data)
    return True


def find_in_text(text: str, needle: str, cursor: int) -> int:
    """Return position of `needle` in `text` starting at `cursor`, or -1.

    Thin wrapper around str.find with a consistent signature across the
    sync tools.
    """
    return text.find(needle, cursor)


def find_in_text_lenient(text: str, needle: str, cursor: int) -> int:
    """find_in_text, falling back to a case-insensitive search.

    Used for cursor tracking across blocks with benign case drift
    (manual capitalization edits) — a stalled cursor makes later
    duplicate-text operations pick the wrong occurrence.
    """
    pos = text.find(needle, cursor)
    if pos != -1:
        return pos
    return text.lower().find(needle.lower(), cursor)


def delete_from_text(text: str, cursor: int, needle: str) -> dict:
    """Remove the first occurrence of `needle` in `text` at/after `cursor`.

    Trims one adjacent space (if present) to avoid double-spaces. Returns
    a dict with `action` ("removed" or "skipped"), plus `text` and
    `cursor` when removed. Skipped means the text wasn't found — caller
    decides how to handle it.
    """
    pos = find_in_text(text, needle, cursor)
    if pos == -1:
        return {"action": "skipped"}
    end = pos + len(needle)
    if pos > 0 and text[pos - 1] == " ":
        pos -= 1
    elif end < len(text) and text[end] == " ":
        end += 1
    return {"action": "removed", "text": text[:pos] + text[end:], "cursor": pos}


def _tighten(old_f: str, new_f: str, offset: int, min_len: int) -> tuple[str, str, int]:
    """Drop the characters an island shares on both sides.

    Word alignment is robust but coarse: an SRT that drifted from the
    transcript by a single punctuation mark would fail to match a whole word
    («щось.» against «щось!»). Trimming the island's shared edges describes
    the same edit with a smaller fragment, which survives that drift. The
    fragment never begins or ends on whitespace — that is exactly where one
    subtitle block ends and the next begins.
    """
    lo, limit = 0, min(len(old_f), len(new_f))
    while lo < limit and old_f[lo] == new_f[lo] and len(old_f) - lo > min_len:
        lo += 1
    hi_o, hi_n = len(old_f), len(new_f)
    while hi_o > lo and hi_n > lo and old_f[hi_o - 1] == new_f[hi_n - 1] and hi_o - lo > min_len:
        hi_o -= 1
        hi_n -= 1
    while lo > 0 and old_f[lo].isspace():
        lo -= 1
    while hi_o < len(old_f) and old_f[hi_o - 1].isspace():
        hi_o += 1
        hi_n += 1
    return old_f[lo:hi_o], new_f[lo:hi_n], offset + lo


def find_diff_islands(
    old_para: str,
    new_para: str,
    min_len: int = MIN_FRAGMENT,
    merge_gap_words: int = 1,
) -> list[tuple[str, str, int]]:
    """Every changed region between old and new paragraph text.

    Returns (old_fragment, new_fragment, offset_in_old) per island, in order.
    Trimming one common prefix and one common suffix — what this used to do —
    calls everything between the first and last change "the change". Two edits
    in a long paragraph then produce a fragment that exists in no single
    subtitle block, and the sync fails on text it could have placed exactly.

    The diff runs over WORDS, not characters. A character diff of Ukrainian
    prose aligns on repeated function words and produces islands that start
    mid-word or on a space — and a space is exactly where one subtitle block
    ends and the next begins. Words are also the unit _locate_fragment maps
    in, so an island lands on a block boundary by construction or not at all.

    Changes separated by at most `merge_gap_words` unchanged words become one
    island: splitting on every micro-gap yields fragments too short to place
    unambiguously, and adjacent changes are one edit anyway. Each island then
    grows whole words of context until its old fragment reaches `min_len`.
    """
    if old_para == new_para:
        return []

    old_toks = list(re.finditer(r"\S+", old_para))
    new_toks = list(re.finditer(r"\S+", new_para))
    ops = [
        (i1, i2, j1, j2)
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(
            None, [m.group() for m in old_toks], [m.group() for m in new_toks], autojunk=False
        ).get_opcodes()
        if tag != "equal"
    ]
    if not ops:
        # Whitespace-only change: nothing a subtitle block would show.
        return []

    groups: list[list[int]] = []
    for i1, i2, j1, j2 in ops:
        if groups and i1 - groups[-1][1] <= merge_gap_words:
            groups[-1][1], groups[-1][3] = i2, j2
        else:
            groups.append([i1, i2, j1, j2])

    def span(toks, lo, hi, para):
        """Character slice covering words [lo, hi), or an empty anchor."""
        if hi > lo:
            return toks[lo].start(), toks[hi - 1].end()
        anchor = toks[lo].start() if lo < len(toks) else len(para)
        return anchor, anchor

    islands = []
    for i1, i2, j1, j2 in groups:
        # Words outside a group are equal in both texts, so the two windows
        # widen in lockstep.
        while True:
            o_lo, o_hi = span(old_toks, i1, i2, old_para)
            if o_hi - o_lo >= min_len:
                break
            if i1 > 0 and j1 > 0:
                i1, j1 = i1 - 1, j1 - 1
            elif i2 < len(old_toks) and j2 < len(new_toks):
                i2, j2 = i2 + 1, j2 + 1
            else:
                break
        o_lo, o_hi = span(old_toks, i1, i2, old_para)
        n_lo, n_hi = span(new_toks, j1, j2, new_para)
        islands.append(_tighten(old_para[o_lo:o_hi], new_para[n_lo:n_hi], o_lo, min_len))
    return islands


# The cleanups strip_omitted_phrases runs after removing a remark, expressed
# as the character spans they delete — the same edits, but traceable back to
# the raw text.
_OMIT_CLEANUP_DELETIONS = (
    (re.compile(r"[^\S\n]{2,}"), lambda m: (m.start() + 1, m.end())),
    (re.compile(r"[^\S\n]+([.,;:!?])"), lambda m: (m.start(), m.start(1))),
    (re.compile(r"([!?])\."), lambda m: (m.end(1), m.end())),
)


def strip_with_map(text: str, phrases) -> tuple[str, list[int]] | None:
    """The omit-stripped view of `text`, plus each kept character's raw index.

    Subtitle blocks are built from stripped text, so a block reading «A B»
    does not occur at all in a transcript reading «A (сміх) B». Searching the
    view finds it, and the map turns any position in the view back into a span
    of the real file.

    Returns None when the reconstruction does not match strip_omitted_phrases
    byte for byte: that function stays the single source of truth, and a
    caller must fall back to the raw text rather than act on a view which
    disagrees with it.
    """
    identity = (text, list(range(len(text))))
    if not phrases:
        return identity

    kept = list(range(len(text)))

    def current() -> str:
        return "".join(text[i] for i in kept)

    def drop(spans) -> None:
        nonlocal kept
        gone = {i for lo, hi in spans for i in range(lo, hi)}
        if gone:
            kept = [raw for pos, raw in enumerate(kept) if pos not in gone]

    for phrase in sorted(phrases, key=len, reverse=True):
        view = current()
        drop([(m.start(), m.end()) for m in re.finditer(re.escape(phrase), view, re.IGNORECASE)])

    if len(kept) == len(text):  # nothing was removed: byte-identical passthrough
        return identity

    for pattern, span_of in _OMIT_CLEANUP_DELETIONS:
        view = current()
        drop([span_of(m) for m in pattern.finditer(view)])

    view = current()
    lead = len(view) - len(view.lstrip())
    trail = len(view) - len(view.rstrip())
    drop([(0, lead), (len(view) - trail, len(view))])

    view = current()
    return (view, kept) if view == strip_omitted_phrases(text, phrases) else None


def raw_span(offsets: list[int], lo: int, hi: int) -> tuple[int, int]:
    """Raw character span covering view positions [lo, hi)."""
    return (offsets[lo], offsets[hi - 1] + 1) if hi > lo else (offsets[lo], offsets[lo])


def span_drops_text(offsets: list[int], lo: int, hi: int) -> bool:
    """True when the raw span behind view positions [lo, hi) holds characters
    the view does not — a declared remark sitting inside the sentence."""
    if hi <= lo:
        return False
    raw_lo, raw_hi = raw_span(offsets, lo, hi)
    return raw_hi - raw_lo != hi - lo
