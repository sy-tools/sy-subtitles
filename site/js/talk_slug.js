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

// Strips everything but ASCII letters/digits/space/hyphen, turns whitespace
// runs into single hyphens, collapses repeats, and trims edge hyphens. Case is
// PRESERVED (not title-cased): "Raksha Bandhan and Maryadas" keeps its
// lowercase "and" -> "Raksha-Bandhan-and-Maryadas".
function slugify(text) {
  return String(text == null ? '' : text)
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { slugify: slugify };
}
