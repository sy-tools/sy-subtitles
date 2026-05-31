"""One-time migration: replace plaintext ``vimeo_url`` in meta.yaml with the
obfuscated ``video_ref`` (see tools/vimeo_codec.py).

Surgical, line-level edit — only the link lines change, every other line is
preserved verbatim, so the diff stays minimal and reviewable. Idempotent: a
file that already uses ``video_ref`` (no ``vimeo_url``) is left untouched.

Usage::

    python -m tools.mask_video_refs                 # migrate all talks/*/meta.yaml
    python -m tools.mask_video_refs --check          # exit 1 if any file would change
    python -m tools.mask_video_refs path/to/meta.yaml ...
"""

import argparse
import glob
import re
import sys

from tools.vimeo_codec import encode_video_ref

# Matches `  vimeo_url: <value>` preserving the indentation. Value may be
# single/double quoted or bare; trailing whitespace is tolerated.
_LINE_RE = re.compile(r"^(?P<indent>[ \t]*)vimeo_url:[ \t]*(?P<value>.*?)[ \t]*$")


def _unquote(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def mask_meta_text(text: str) -> str:
    """Return ``text`` with every ``vimeo_url:`` line rewritten as ``video_ref:``.

    An empty ``vimeo_url`` line is dropped (the video has no link). Pure — no I/O.
    """
    out_lines = []
    for line in text.splitlines(keepends=True):
        newline = "\n" if line.endswith("\n") else ""
        match = _LINE_RE.match(line.rstrip("\n"))
        if not match:
            out_lines.append(line)
            continue
        url = _unquote(match.group("value"))
        if not url:
            # No link — drop the line entirely.
            continue
        out_lines.append(f"{match.group('indent')}video_ref: {encode_video_ref(url)}{newline}")
    return "".join(out_lines)


def mask_meta_file(path: str) -> bool:
    """Rewrite a meta.yaml in place. Returns True if the file changed."""
    with open(path, encoding="utf-8") as f:
        original = f.read()
    masked = mask_meta_text(original)
    if masked == original:
        return False
    with open(path, "w", encoding="utf-8") as f:
        f.write(masked)
    return True


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="meta.yaml paths (default: talks/*/meta.yaml)")
    parser.add_argument(
        "--check",
        action="store_true",
        help="report files that would change and exit 1 without writing",
    )
    args = parser.parse_args(argv)

    paths = args.paths or sorted(glob.glob("talks/*/meta.yaml"))
    changed = []
    for path in paths:
        with open(path, encoding="utf-8") as f:
            original = f.read()
        if mask_meta_text(original) != original:
            changed.append(path)
            if not args.check:
                mask_meta_file(path)

    if args.check:
        for path in changed:
            print(f"would mask: {path}")
        print(f"{len(changed)} file(s) would change")
        sys.exit(1 if changed else 0)

    for path in changed:
        print(f"masked: {path}")
    print(f"{len(changed)} file(s) masked, {len(paths) - len(changed)} unchanged")


if __name__ == "__main__":
    main()
