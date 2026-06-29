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

// The single source of truth for the fetch handler's branch. Navigation + the
// GitHub API/raw endpoints are network-first (always prefer fresh, fall back to
// cache offline); truly-immutable assets are cache-first; everything else
// (app js/css, the Vimeo iframe) is network-first.
function pickStrategy(url) {
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
    pickStrategy: pickStrategy,
  };
}
