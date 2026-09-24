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

_lib = None


def _load():
    global _lib
    if _lib is None:
        path = ctypes.util.find_library("ass")
        if not path:
            return None
        lib = ctypes.CDLL(path)
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
    """The text-fill coverage of one frame: rows of 0..255 alpha, height x width.

    Fonts come from `fonts_dir` only as the burn's do (ffmpeg passes the same
    directory as `fontsdir`); the system provider stays on for glyph fallback,
    as it does under ffmpeg.
    """
    lib = _load()
    library = lib.ass_library_init()
    lib.ass_set_fonts_dir(library, fonts_dir.encode())
    renderer = lib.ass_renderer_init(library)
    lib.ass_set_frame_size(renderer, width, height)
    lib.ass_set_fonts(renderer, None, b"sans-serif", ASS_FONTPROVIDER_AUTODETECT, None, 1)
    data = ass_document.encode("utf-8")
    track = lib.ass_read_memory(library, data, len(data), None)
    mask = [bytearray(width) for _ in range(height)]
    try:
        changed = ctypes.c_int(0)
        image = lib.ass_render_frame(renderer, track, at_ms, ctypes.byref(changed))
        while image:
            img = image.contents
            if img.color >> 8 == TEXT_FILL_RGB:
                for y in range(img.h):
                    row = mask[img.dst_y + y]
                    base = y * img.stride
                    for x in range(img.w):
                        a = img.bitmap[base + x]
                        if a > row[img.dst_x + x]:
                            row[img.dst_x + x] = a
            image = img.next
    finally:
        lib.ass_free_track(track)
        lib.ass_renderer_done(renderer)
        lib.ass_library_done(library)
    return mask


def line_boxes(mask, threshold=128):
    """Ink boxes of the text lines in a coverage mask, top to bottom.

    Rows with any pixel at or above `threshold` are ink; a run of ink rows is
    one line (lines are separated by blank rows — the line advance exceeds the
    glyph height). A run far shorter than a line is a mark floating above one
    (the breve of Й stands clear of its letter) and joins the line below it.
    Each box is (left, top, right, bottom), right/bottom exclusive.
    """
    runs = _ink_runs(mask, threshold)
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


def _ink_runs(mask, threshold):
    boxes = []
    top = None
    left = right = None
    for y, row in enumerate(mask + [bytearray(len(mask[0]) if mask else 0)]):
        xs = [x for x, a in enumerate(row) if a >= threshold]
        if xs:
            if top is None:
                top, left, right = y, xs[0], xs[-1] + 1
            else:
                left, right = min(left, xs[0]), max(right, xs[-1] + 1)
        elif top is not None:
            boxes.append((left, top, right, y))
            top = None
    return boxes
