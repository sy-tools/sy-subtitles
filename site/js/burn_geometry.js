// The one copy of the numbers that make a burned frame look like the
// fullscreen preview — the page, the burner and the workflow all read it.
// tools/burn_geometry.py parses the object below as JSON, so it stays JSON:
// quoted keys, plain numbers, no comments or arithmetic inside the braces.
//
//   fontWidthRatio  font size, as a fraction of the video WIDTH (x the handle's
//                   scale) — so a line holds as many characters on 4:3 as on 16:9
//   fontRatioMin/Max  the band that size is held to, as a fraction of the
//                   video HEIGHT; the workflow refuses a ratio outside it
//   padTopPx/padBotPx over / under the text on a refHeight-tall video
//   sideInsetRatio  each side's inset, as a fraction of the width
//   wrapSafety      headroom the burner keeps inside the insets when it wraps,
//                   so a line libass advances a hair wider than it was measured
//                   stays inside the margin; the preview pads by the same amount
//   lineAdvance     libass steps one ASS FontSize per line: PT Serif's
//                   (usWinAscent + usWinDescent) / unitsPerEm, in em — pinned to
//                   the TTF's metrics by tests/test_burn_subtitles.py
var BURN_GEOMETRY = {
  "fontWidthRatio": 0.04,
  "fontRatioMin": 0.02,
  "fontRatioMax": 0.12,
  "refHeight": 1080,
  "padTopPx": 80,
  "padBotPx": 36,
  "sideInsetRatio": 0.07,
  "wrapSafety": 0.98,
  "lineAdvance": 1.325
};

if (typeof module !== 'undefined' && module.exports) module.exports = BURN_GEOMETRY;
