// Canonical text hygiene rules — JS twin of tools/text_normalize.py.
//
// Two independent concerns live here and are deliberately NOT merged:
//
//   * Invisible characters — non-breaking and other odd spaces, zero-width
//     characters, stray BOMs. Noise in every language; safe on whole files.
//   * Ukrainian typography — the quote/dash/apostrophe/ellipsis rules from
//     glossary/CLAUDE.md. Ukrainian ONLY: English prose legitimately uses a
//     straight double quote and an em dash, and applying these to it corrupts it.
//
// This exists because `contenteditable` injects &nbsp; on its own — when a space
// is typed at the end of a text node, or two spaces in a row. The SPA commits
// edited text straight to GitHub (js/edit_sync.js), so this is the last place
// the characters can be stopped.
//
// Keep byte-for-byte equivalent to tools/text_normalize.py; both are tested
// against tests/fixtures/text_hygiene_cases.json.
//
// Single source: loaded by the browser via <script src="js/text_sanitize.js">
// in site/index.html AND require()d by the Node test suite — no inline mirror.
//
// Every invisible character is written as an escape: this repository bans
// literal NBSP in source, and a literal here would be unreadable anyway.

var ODD_SPACES = '\u00a0\u202f\u2002\u2003\u2007\u2009\u3000';
var ZERO_WIDTH = '\u200b\u00ad\ufeff';
// ZWNJ/ZWJ are deleted only OUTSIDE Devanagari: between Devanagari characters
// they are orthographic (conjunct control), and the repo carries Hindi
// content. Kept when EITHER neighbour is in U+0900-U+097F. Implemented as a
// replace callback reading neighbours from the ORIGINAL string at the match
// offset -- older Safari lacks lookbehind, and this mirrors Python's
// lookarounds, which also evaluate against the original string.
var ZW_JOINER_RE = /[\u200c\u200d]/g;
var DEVANAGARI_RE = /[\u0900-\u097f]/;

function stripZwJoiners(text) {
  return text.replace(ZW_JOINER_RE, function (m, offset, s) {
    var prev = offset > 0 ? s.charAt(offset - 1) : '';
    var next = s.charAt(offset + 1);
    return DEVANAGARI_RE.test(prev) || DEVANAGARI_RE.test(next) ? m : '';
  });
}

var ODD_SPACE_RE = new RegExp('[' + ODD_SPACES + ']', 'g');
var ZERO_WIDTH_RE = new RegExp('[' + ZERO_WIDTH + ']', 'g');
// Tabs are folded together with line breaks: a field value is a single line.
var FIELD_BREAK_RE = /[\t\n\r\u2028\u2029]+/g;
var SPACE_RUN_RE = / {2,}/g;

// Character-level only: newlines, tabs and whitespace runs survive, so this is
// the variant that may be applied to whole file contents.
function sanitizeInvisible(text) {
  return stripZwJoiners(
    String(text == null ? '' : text).replace(ODD_SPACE_RE, ' ')
  ).replace(ZERO_WIDTH_RE, '');
}

// A single-line field value: subtitles are single-line by project rule and
// transcripts are one line per paragraph, so a break inside a value is damage.
function sanitizeFieldText(text) {
  return sanitizeInvisible(text)
    .replace(FIELD_BREAK_RE, ' ')
    .replace(SPACE_RUN_RE, ' ')
    .trim();
}

// A pasted FRAGMENT: invisible cleanup + flattened breaks ONLY. No trim, no
// space-run collapse, no typography -- a fragment has no caret context (a
// leading space may be intended; a leading straight quote may need to close,
// not open). The store-level sanitize on the following input event and the
// focusout reconciliation finish the job.
function sanitizePastedText(text) {
  return sanitizeInvisible(text).replace(FIELD_BREAK_RE, ' ');
}

var APOSTROPHE_RE = /['‘ʼ]/g;
var DASH_RE = /[—‒−―]/g;
// A hyphen standing in for a dash: both sides open (space/tab or a line
// boundary). One-sided hyphens stay — `будь-хто` is a word, `-5` a number.
// The left boundary is captured and re-emitted rather than matched in a
// lookbehind, which older Safari lacks. \n sits in the classes instead of
// using the m flag: JS multiline anchors also match at \r, U+2028 and
// U+2029, where Python's (?m) does not, and the twins must agree.
var HYPHEN_DASH_RE = /(^|[ \t\n])-(?=[ \t\n]|$)/g;
// Horizontal whitespace only, so running this over whole files cannot join
// lines. Restricted to a word character on the left: unrestricted stripping
// would glue the ellipsis onto a preceding dash. The word character is captured
// and re-emitted rather than matched in a lookbehind, which older Safari lacks.
//
// The class is spelled out instead of using \w: in JavaScript \w is ASCII-only,
// so it would miss every Cyrillic letter and silently leave the rule inert on
// exactly the text it exists for. Python's \w is Unicode-aware, so the twins
// would have disagreed -- the shared fixture caught it.
var ELLIPSIS_SPACE_RE = /([\p{L}\p{N}_])[ \t]+\.\.\./gu;

// A straight quote following one of these opens; anything else closes. The
// opening guillemet is included so consecutive quotes nest rather than alternate.
var QUOTE_OPENS_AFTER = ' \t\n\r([{«–';

// Counting cannot work here: quote state does not carry across subtitle blocks,
// so a counter is wrong whenever a quotation spans a block boundary. This reads
// the ALREADY-CONVERTED previous character, which is what makes two straight
// quotes in a row nest instead of alternating.
function resolveStraightQuotes(text) {
  var out = '';
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    if (ch === '"') {
      var prev = out.length ? out.charAt(out.length - 1) : '';
      out += (prev === '' || QUOTE_OPENS_AFTER.indexOf(prev) !== -1) ? '«' : '»';
    } else {
      out += ch;
    }
  }
  return out;
}

function normalizeUkTypography(text) {
  var out = String(text == null ? '' : text)
    .replace(/“/g, '«')
    .replace(/„/g, '«')
    .replace(/”/g, '»');
  // Dashes before quotes: QUOTE_OPENS_AFTER knows only the canonical en dash,
  // so a quote sitting right after an unconverted em dash would resolve as
  // closing. Same order as tools/text_normalize.py.
  out = out
    .replace(DASH_RE, '–')
    .replace(HYPHEN_DASH_RE, '$1–');
  out = resolveStraightQuotes(out);
  return out
    .replace(APOSTROPHE_RE, '’')
    .replace(/…/g, '...')
    .replace(ELLIPSIS_SPACE_RE, '$1...');
}

// The entry point the SPA edit handlers call. Invisible-character cleanup runs
// for every language; typography runs for Ukrainian only.
function sanitizeEditedText(text, lang) {
  var out = sanitizeFieldText(text);
  return lang === 'uk' ? normalizeUkTypography(out) : out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sanitizeInvisible: sanitizeInvisible,
    sanitizeFieldText: sanitizeFieldText,
    sanitizePastedText: sanitizePastedText,
    normalizeUkTypography: normalizeUkTypography,
    sanitizeEditedText: sanitizeEditedText,
  };
}
