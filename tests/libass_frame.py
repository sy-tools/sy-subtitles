"""Render one frame of an ASS document with libass itself, for geometry tests.

The burn draws its subtitles with ffmpeg's `ass` filter, which is libass. To
test that a burned frame looks like the fullscreen preview there is no need for
ffmpeg or a video: libass hands back the positioned glyph bitmaps of a frame
directly (`ass_render_frame` -> a list of `ASS_Image`), so the lines it drew can
be measured to the pixel and compared with the browser's.

Loaded through ctypes; `available()` says whether the shared library is on this
machine (Homebrew `libass`, Debian/Ubuntu `libass9`).
"""

import ctypes
import ctypes.util

from PIL import Image, ImageChops

# The text fill: white, fully opaque (RGBA as libass packs it). The outline,
# the shadow and the gradient band are all black, so this one colour isolates
# the glyphs a viewer reads.
TEXT_FILL_RGB = 0xFFFFFF
ASS_FONTPROVIDER_AUTODETECT = 1


class _AssImage(ctypes.Structure):
    pass


_AssImage._fields_ = [
    ("w", ctypes.c_int),
    ("h", ctypes.c_int),
    ("stride", ctypes.c_int),
    ("bitmap", ctypes.POINTER(ctypes.c_ubyte)),
    ("color", ctypes.c_uint32),
    ("dst_x", ctypes.c_int),
    ("dst_y", ctypes.c_int),
    ("next", ctypes.POINTER(_AssImage)),
    ("type", ctypes.c_int),
]

# libass logs through a callback, to stderr by default: some ten lines per frame
# that bury a failing test's own output. Kept at module level so ctypes does not
# collect it while libass still holds it.
_MessageCallback = ctypes.CFUNCTYPE(None, ctypes.c_int, ctypes.c_char_p, ctypes.c_void_p, ctypes.c_void_p)
_SILENT = _MessageCallback(lambda level, fmt, args, data: None)

_lib = None


def _load():
    global _lib
    if _lib is None:
        # find_library reads the ldconfig cache, which a slim container may lack.
        for name in (ctypes.util.find_library("ass"), "libass.so.9"):
            try:
                lib = ctypes.CDLL(name) if name else None
            except OSError:
                lib = None
            if lib:
                break
        else:
            return None
        lib.ass_set_message_cb.argtypes = [ctypes.c_void_p, _MessageCallback, ctypes.c_void_p]
        lib.ass_library_init.restype = ctypes.c_void_p
        lib.ass_library_done.argtypes = [ctypes.c_void_p]
        lib.ass_set_fonts_dir.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        lib.ass_renderer_init.restype = ctypes.c_void_p
        lib.ass_renderer_init.argtypes = [ctypes.c_void_p]
        lib.ass_renderer_done.argtypes = [ctypes.c_void_p]
        lib.ass_set_frame_size.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int]
        lib.ass_set_fonts.argtypes = [
            ctypes.c_void_p,
            ctypes.c_char_p,
            ctypes.c_char_p,
            ctypes.c_int,
            ctypes.c_char_p,
            ctypes.c_int,
        ]
        lib.ass_read_memory.restype = ctypes.c_void_p
        lib.ass_read_memory.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_size_t, ctypes.c_char_p]
        lib.ass_free_track.argtypes = [ctypes.c_void_p]
        lib.ass_render_frame.restype = ctypes.POINTER(_AssImage)
        lib.ass_render_frame.argtypes = [
            ctypes.c_void_p,
            ctypes.c_void_p,
            ctypes.c_longlong,
            ctypes.POINTER(ctypes.c_int),
        ]
        _lib = lib
    return _lib


def available():
    return _load() is not None


def text_mask(ass_document, width, height, at_ms, fonts_dir):
    """The text-fill coverage of one frame, as a width x height "L" image.

    Fonts come from `fonts_dir` only as the burn's do (ffmpeg passes the same
    directory as `fontsdir`); the system provider stays on for glyph fallback,
    as it does under ffmpeg.
    """
    lib = _load()
    library = lib.ass_library_init()
    lib.ass_set_message_cb(library, _SILENT, None)
    lib.ass_set_fonts_dir(library, fonts_dir.encode())
    renderer = lib.ass_renderer_init(library)
    lib.ass_set_frame_size(renderer, width, height)
    lib.ass_set_fonts(renderer, None, b"sans-serif", ASS_FONTPROVIDER_AUTODETECT, None, 1)
    data = ass_document.encode("utf-8")
    track = lib.ass_read_memory(library, data, len(data), None)
    coverage = Image.new("L", (width, height))
    try:
        changed = ctypes.c_int(0)
        image = lib.ass_render_frame(renderer, track, at_ms, ctypes.byref(changed))
        while image:
            img = image.contents
            if img.color >> 8 == TEXT_FILL_RGB and img.w and img.h:
                raw = ctypes.string_at(img.bitmap, img.stride * img.h)
                glyphs = Image.frombuffer("L", (img.w, img.h), raw, "raw", "L", img.stride, 1)
                box = (img.dst_x, img.dst_y, img.dst_x + img.w, img.dst_y + img.h)
                coverage.paste(ImageChops.lighter(coverage.crop(box), glyphs), box)
            image = img.next
    finally:
        lib.ass_free_track(track)
        lib.ass_renderer_done(renderer)
        lib.ass_library_done(library)
    return coverage


def line_boxes(coverage, threshold=128):
    """Ink boxes of the text lines in an "L" coverage image, top to bottom.

    Pixels at or above `threshold` are ink; a run of rows holding ink is one
    line (lines are separated by blank rows — the line advance exceeds the
    glyph height). A run far shorter than a line is a mark floating above one
    (the breve of Й stands clear of its letter) and joins the line below it.
    Each box is (left, top, right, bottom), right/bottom exclusive.
    """
    runs = _ink_runs(coverage.point(lambda v: 255 if v >= threshold else 0))
    if not runs:
        return []
    tallest = max(b - t for _, t, _, b in runs)
    boxes = []
    pending = None
    for run in runs:
        if pending:
            run = (min(pending[0], run[0]), pending[1], max(pending[2], run[2]), run[3])
            pending = None
        if run[3] - run[1] < 0.4 * tallest:
            pending = run
        else:
            boxes.append(run)
    if pending:
        boxes.append(pending)
    return boxes


def _ink_runs(ink):
    width, height = ink.size
    rows = [ink.crop((0, y, width, y + 1)).getbbox() is not None for y in range(height)] + [False]
    runs = []
    top = None
    for y, inked in enumerate(rows):
        if inked and top is None:
            top = y
        elif not inked and top is not None:
            left, _, right, _ = ink.crop((0, top, width, y)).getbbox()
            runs.append((left, top, right, y))
            top = None
    return runs
