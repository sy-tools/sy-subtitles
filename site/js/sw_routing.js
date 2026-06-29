// Service-worker routing decision — which caching strategy a request gets.
// Single source: loaded by the worker via importScripts('js/sw_routing.js') in
// site/sw.js AND required by the Node test suite (tests/test_sw_routing.js) — no
// inline mirror, so the worker and the tests can never drift.
//
// The strategy mechanics (networkFirst/cacheFirst, which touch caches+fetch) stay
// in sw.js; only the pure decision lives here, because that is where the bugs are
// (host-vs-substring matching, the navigation URL forms).

// Versioned CDN bundles and static images — safe to serve cache-first.
var IMMUTABLE_PATTERNS = ['cdn.jsdelivr.net', 'player.vimeo.com/api', '/icon.png'];

function isImmutable(url) {
  return IMMUTABLE_PATTERNS.some(function (p) { return url.indexOf(p) !== -1; });
}

function isApiOrRaw(url) {
  // Match on the actual host, not a substring: "https://evil.com/?x=api.github.com"
  // must not be treated as a GitHub API/raw request. Both hosts are used bare by
  // the app and have no subdomain form in GitHub's infrastructure, so exact match
  // is correct for both.
  try {
    var h = new URL(url).hostname;
    return h === 'api.github.com' || h === 'raw.githubusercontent.com';
  } catch (e) {
    return false;
  }
}

function isNavigation(url) {
  // The HTML document: directory root, index.html, or a hash deep-link.
  return url.endsWith('/') || url.endsWith('/index.html') || url.indexOf('sy-subtitles/#') !== -1;
}

// Subtitle/transcript content is fetched with a ?v=<blob sha> cache-buster
// (final/<lang>.srt, transcript_<lang>.txt, source/<lang>.srt, review-status.json):
// the URL is content-addressed, so its bytes never change. A non-empty v param
// marks such an immutable-by-URL resource. meta.yaml (no ?v=) and the Trees API
// (?recursive=1) carry no v and stay network-first.
function hasImmutableVersion(url) {
  try {
    return !!new URL(url).searchParams.get('v');
  } catch (e) {
    return false;
  }
}

// The single source of truth for the fetch handler's branch.
//  - sha-pinned content (?v=) → cache-first: instant offline + zero redundant
//    refetch; a new build changes the sha → the URL, so a cache miss on the new
//    key still fetches fresh. Checked FIRST so it wins over the raw network-first.
//  - navigation + the GitHub API/raw endpoints → network-first (prefer fresh,
//    fall back to cache offline).
//  - truly-immutable CDN/static assets → cache-first.
//  - everything else (app js/css, the Vimeo iframe) → network-first.
function pickStrategy(url) {
  if (hasImmutableVersion(url)) return 'cache-first';
  if (isNavigation(url) || isApiOrRaw(url)) return 'network-first';
  if (isImmutable(url)) return 'cache-first';
  return 'network-first';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IMMUTABLE_PATTERNS: IMMUTABLE_PATTERNS,
    isImmutable: isImmutable,
    isApiOrRaw: isApiOrRaw,
    isNavigation: isNavigation,
    hasImmutableVersion: hasImmutableVersion,
    pickStrategy: pickStrategy,
  };
}
