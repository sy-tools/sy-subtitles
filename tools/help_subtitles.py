"""Subtitles for the portal's video tutorials (help-subtitles.yml).

    python -m tools.help_subtitles cues --whisper W.json --out cues.json
    python -m tools.help_subtitles vtt --cues cues.json --texts uk.json --out REF.uk.vtt
    python -m tools.help_subtitles manifest --dir site/help/subs
    python -m tools.help_subtitles ui-strings --index site/index.html --out ui.json
    python -m tools.help_subtitles pending --refs refs.json --dir site/help/subs --select missing

The timing is decided here and only here: `cues` cuts whisper's words into
cues, an LLM rewrites the text of each cue (fixing the recognition, then
translating), and `vtt` puts those texts back on the very same timings. The
LLM never sees or writes a timestamp, the way build_map keeps it out of SRTs.
"""

import argparse
import json
import re
from pathlib import Path

from tools.whisper_run import is_hallucination

MAX_CUE_CHARS = 84  # two lines of 42, the reading width the talk subtitles use
MAX_CUE_SECONDS = 7.0
MIN_CUE_SECONDS = 1.0  # a cue shorter than this flashes past unread
PAUSE_SECONDS = 1.0  # a silence this long ends the cue in progress
SENTENCE_CHARS = 20  # a sentence end closes a cue only once it holds this much
CUE_GAP_SECONDS = 0.05
MAX_TEXT_CHARS = 120  # a rewritten cue may run longer than the cut, not much longer

_SENTENCE_END = re.compile(r"[.?!…]['\"»)]*$")
_VTT_NAME = re.compile(r"^(?P<ref>.+)\.(?P<lang>[a-z]{2})\.vtt$")
_I18N_BLOCK = re.compile(r"^var I18N = \{\n(.*?)^\};", re.S | re.M)
_I18N_LANG = re.compile(r"^  (?P<lang>[a-z]{2}): \{\n(?P<body>.*?)^  \},?$", re.S | re.M)
_I18N_ENTRY = re.compile(r"^    '(?P<key>[^']+)': '(?P<value>(?:[^'\\]|\\.)*)',?$", re.M)
_JS_ESCAPE = re.compile(r"\\u([0-9a-fA-F]{4})|\\(.)")
LANGS = ("uk", "en")


def _words(whisper):
    for segment in whisper.get("segments", []):
        for w in segment.get("words") or []:
            text = w["word"].strip()
            if text and not is_hallucination(text):
                yield {"start": float(w["start"]), "end": float(w["end"]), "text": text}


def build_cues(whisper):
    cues = []
    cue = None
    for word in _words(whisper):
        if not any(ch.isalnum() for ch in word["text"]):
            # Punctuation whisper heard as a word ("–", "..."): it belongs to the
            # sentence it was said in, and alone after a pause it is not speech
            # at all, so it never opens a cue of its own.
            if cue is not None and word["start"] - cue["end"] < PAUSE_SECONDS:
                cue["text"] += " " + word["text"]
                cue["end"] = word["end"]
            continue
        if cue is not None:
            text = cue["text"] + " " + word["text"]
            if (
                word["start"] - cue["end"] >= PAUSE_SECONDS
                or len(text) > MAX_CUE_CHARS
                or word["end"] - cue["start"] > MAX_CUE_SECONDS
            ):
                cues.append(cue)
                cue = None
            else:
                cue["text"] = text
                cue["end"] = word["end"]
        if cue is None:
            cue = dict(word)
        if _SENTENCE_END.search(cue["text"]) and len(cue["text"]) >= SENTENCE_CHARS:
            cues.append(cue)
            cue = None
    if cue is not None:
        cues.append(cue)

    for i, c in enumerate(cues):
        if c["end"] - c["start"] < MIN_CUE_SECONDS:
            limit = cues[i + 1]["start"] - CUE_GAP_SECONDS if i + 1 < len(cues) else float("inf")
            c["end"] = max(c["end"], min(c["start"] + MIN_CUE_SECONDS, limit))
        c["start"], c["end"] = round(c["start"], 3), round(c["end"], 3)
    return cues


def _timestamp(seconds):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def render_vtt(cues, texts):
    if len(texts) != len(cues):
        raise ValueError(f"{len(cues)} cues but {len(texts)} texts")
    blocks = ["WEBVTT\n"]
    for n, (cue, text) in enumerate(zip(cues, texts, strict=True), start=1):
        if not isinstance(text, str):
            raise ValueError(f"cue {n} is not text: {text!r}")
        text = text.strip()
        if not text:
            raise ValueError(f"cue {n} is empty")
        if "-->" in text:
            raise ValueError(f"cue {n} contains '-->'")
        if re.search(r"\n\s*\n", text):
            raise ValueError(f"cue {n} contains a blank line, which would end the cue early")
        if len(text) > MAX_TEXT_CHARS:
            raise ValueError(f"cue {n} is {len(text)} characters (max {MAX_TEXT_CHARS})")
        blocks.append(f"{n}\n{_timestamp(cue['start'])} --> {_timestamp(cue['end'])}\n{text}\n")
    return "\n".join(blocks)


def build_manifest(directory):
    langs = {}
    for path in sorted(Path(directory).glob("*.vtt")):
        m = _VTT_NAME.match(path.name)
        if m:
            langs.setdefault(m["ref"], []).append(m["lang"])
    return {ref: sorted(ls) for ref, ls in sorted(langs.items())}


def ui_strings(index_html):
    """The portal's interface strings, key -> {lang: text}.

    A tutorial names buttons and labels as the reader sees them, so the
    subtitles must quote them exactly, in either language.
    """
    block = _I18N_BLOCK.search(Path(index_html).read_text(encoding="utf-8"))
    if not block:
        raise ValueError(f"no `var I18N = {{` block in {index_html}")
    strings = {}
    for lang in _I18N_LANG.finditer(block.group(1)):
        for entry in _I18N_ENTRY.finditer(lang["body"]):
            text = _JS_ESCAPE.sub(lambda m: chr(int(m[1], 16)) if m[1] else m[2], entry["value"])
            strings.setdefault(entry["key"], {})[lang["lang"]] = text
    return dict(sorted(strings.items()))


def pending(refs, directory, select):
    """The refs a run should subtitle: `missing` (short of any language),
    `all`, or a comma-separated list of listed refs."""
    if select == "all":
        return list(refs)
    if select == "missing":
        have = build_manifest(directory)
        return [r for r in refs if not set(LANGS) <= set(have.get(r, []))]
    chosen = [r.strip() for r in select.split(",") if r.strip()]
    unknown = [r for r in chosen if r not in refs]
    if unknown:
        raise ValueError("not a listed video: " + ", ".join(unknown))
    return chosen


def _read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _write(path, text):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text, encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("cues", help="cut whisper words into timed cues")
    p.add_argument("--whisper", required=True)
    p.add_argument("--out", required=True)
    p = sub.add_parser("vtt", help="put one text per cue onto the cue timings")
    p.add_argument("--cues", required=True)
    p.add_argument("--texts", required=True, help="JSON array, one string per cue")
    p.add_argument("--out", required=True)
    p = sub.add_parser("manifest", help="write index.json: ref -> languages with a .vtt")
    p.add_argument("--dir", required=True)
    p = sub.add_parser("ui-strings", help="the portal's interface strings in both languages")
    p.add_argument("--index", required=True)
    p.add_argument("--out", required=True)
    p = sub.add_parser("pending", help="print the refs to subtitle, as a JSON array")
    p.add_argument("--refs", required=True, help="JSON array of every listed ref")
    p.add_argument("--dir", required=True)
    p.add_argument("--select", default="missing", help="missing | all | ref,ref,...")
    args = parser.parse_args(argv)

    if args.command == "cues":
        cues = build_cues(_read_json(args.whisper))
        _write(args.out, json.dumps(cues, ensure_ascii=False, indent=1) + "\n")
        print(f"{len(cues)} cues -> {args.out}")
    elif args.command == "vtt":
        _write(args.out, render_vtt(_read_json(args.cues), _read_json(args.texts)))
        print(f"wrote {args.out}")
    elif args.command == "ui-strings":
        strings = ui_strings(args.index)
        _write(args.out, json.dumps(strings, ensure_ascii=False, indent=1) + "\n")
        print(f"{len(strings)} interface strings -> {args.out}")
    elif args.command == "pending":
        print(json.dumps(pending(_read_json(args.refs), args.dir, args.select)))
    else:
        manifest = build_manifest(args.dir)
        _write(Path(args.dir) / "index.json", json.dumps(manifest, indent=1) + "\n")
        print(f"{len(manifest)} videos with subtitles -> {Path(args.dir) / 'index.json'}")


if __name__ == "__main__":
    main()
