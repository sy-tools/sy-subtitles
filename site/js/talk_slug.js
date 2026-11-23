// Canonical talk-folder slugify — JS source of truth, twin of tools/talk_slug.py.
//
// The SPA names a talk folder `{date}_{slugify(title)}`. tools/download.py uses
// the Python twin so a locally-downloaded talk lands in the SAME folder as one
// added via the SPA. Keep the two byte-for-byte equivalent; both are tested
// against the shared fixture tests/fixtures/slug_cases.json
// (tests/test_talk_slug.js + tests/test_talk_slug.py), so they cannot drift.
//
// Single source: loaded by the browser via <script src="js/talk_slug.js"> in
// site/index.html (exposes a `slugify` global) AND require()d by the Node test
// suite — no inline mirror.

// The one length limit for a slug — the twin of SLUG_MAX_LEN in
// tools/talk_slug.py; both are pinned to tests/fixtures/slug_cases.json.
var SLUG_MAX_LEN = 108;

// Strips everything but ASCII letters/digits/space/hyphen, turns whitespace
// runs into single hyphens, collapses repeats, and trims edge hyphens. Case is
// PRESERVED (not title-cased): "Raksha Bandhan and Maryadas" keeps its
// lowercase "and" -> "Raksha-Bandhan-and-Maryadas". A slug longer than
// SLUG_MAX_LEN is cut back to its last whole word; a single word longer than
// the limit is cut hard.
function slugify(text) {
  var slug = String(text == null ? '' : text)
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug.length > SLUG_MAX_LEN) {
    var cut = slug.slice(0, SLUG_MAX_LEN);
    if (slug.charAt(SLUG_MAX_LEN) !== '-' && cut.indexOf('-') !== -1) {
      cut = cut.slice(0, cut.lastIndexOf('-'));
    }
    slug = cut.replace(/-+$/, '');
  }
  return slug;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { slugify: slugify, SLUG_MAX_LEN: SLUG_MAX_LEN };
}
