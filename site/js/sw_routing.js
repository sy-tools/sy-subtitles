// Service-worker routing decision — which caching strategy a request gets.
// Single source: loaded by the worker via importScripts('js/sw_routing.js') in
// site/sw.js AND required by the Node test suite (tests/test_sw_routing.js) — no
// inline mirror, so the worker and the tests can never drift.
//
// The strategy mechanics (networkFirst/cacheFirst, which touch caches+fetch) stay
// in sw.js; only the pure decision lives here, because that is where the bugs are
// (host-vs-substring matching, the navigation URL forms).

// Versioned CDN bundles and static images — safe to serve cache-first.
//
// The two hunspell files are here for their size: 9 MB that changes only when
// the dictionary is re-vendored. Re-fetching them each session, for a feature
// the user has already switched on, is the one cost that would make the typo
// hints not worth having. Their companion words_uk.txt is deliberately absent —
// it grows with every talk added, and must keep revalidating or a translator is
// underlined for vocabulary the project has already accepted.
var IMMUTABLE_PATTERNS = [
  'cdn.jsdelivr.net',
  'player.vimeo.com/api',
  '/icon.png',
  '/dict/uk_UA.aff',
  '/dict/uk_UA.dic',
];

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

function isApiHost(url) {
  // The whole GitHub REST API host (the Trees manifest, the branch list), as
  // opposed to raw content. Routed network-only so the worker NEVER caches it:
  // offline, the app's fetch then genuinely fails and falls back to its own
  // localStorage manifest while flagging staleness — which is what surfaces the
  // "offline" badge. If the SW cached the Trees response instead, the app would
  // get a cached 200 and wrongly believe it is online (navigator.onLine is
  // unreliable when the link is up but the internet is not).
  try {
    return new URL(url).hostname === 'api.github.com';
  } catch (e) {
    return false;
  }
}

// The YouTube player: the IFrame API is a loader for a versioned player
// script it names itself, so a cached copy pins an old player — and offline
// there is no video to play anyway. Never cached.
var YOUTUBE_HOSTS = ['www.youtube.com', 'youtube.com', 's.ytimg.com'];

function isYouTubeHost(url) {
  try {
    return YOUTUBE_HOSTS.indexOf(new URL(url).hostname) !== -1;
  } catch (e) {
    return false;
  }
}

function isNavigation(url) {
  // The HTML document: directory root, index.html, or a hash deep-link.
  return url.endsWith('/') || url.endsWith('/index.html') || url.indexOf('sy-subtitles/#') !== -1;
}

// Repo content is fetched with a ?v=<blob sha> tag (final/<lang>.srt,
// transcript_<lang>.txt, source/<lang>.srt, review-status.json, and each talk's
// meta.yaml): the URL is content-addressed, so its bytes never change. A
// non-empty v param marks such an immutable-by-URL resource. The Trees API
// (?recursive=1) carries no v, and neither does a file read from the branch
// because the manifest commit is unknown (js/manifest_fetch.js rawFileUrl):
// those stay network-first.
function hasImmutableVersion(url) {
  try {
    return !!new URL(url).searchParams.get('v');
  } catch (e) {
    return false;
  }
}

// raw.githubusercontent keys its CDN cache on the path alone: a query string
// does not bust it, and for minutes after a push main/<file>?v=<new blob> still
// returns the OLD bytes. Only a URL whose ref segment is a full commit sha is
// immutable for real, because the path itself changes with every commit.
var RAW_COMMIT_PATH = /^\/[^/]+\/[^/]+\/([0-9a-f]{40})\//;

function isCommitPinnedRaw(url) {
  try {
    var u = new URL(url);
    return u.hostname === 'raw.githubusercontent.com' && RAW_COMMIT_PATH.test(u.pathname);
  } catch (e) {
    return false;
  }
}

// The cache key of commit-pinned content drops the commit when ?v= is a FULL
// blob sha: that sha names the bytes, and keyed by commit every file would be
// downloaded again after any commit, a bot status update included. A short
// prefix keeps the commit: raw serves any commit of the repo's network (a
// fork's included), and a crafted blob matching 8 hex digits there must not
// answer for the real file under a shared key.
var FULL_BLOB_SHA = /^[0-9a-f]{40}$/;

function cacheKeyFor(url) {
  if (!isCommitPinnedRaw(url)) return url;
  var u = new URL(url);
  if (!FULL_BLOB_SHA.test(u.searchParams.get('v') || '')) return url;
  u.pathname = u.pathname.replace(RAW_COMMIT_PATH, function (m, sha) { return m.replace(sha, '@'); });
  return u.toString();
}

// The single source of truth for the fetch handler's branch.
//  - the GitHub Trees API → network-only: never cached, so offline the app sees a
//    real failure and shows its cached-manifest + offline badge (checked FIRST).
//  - sha-pinned content (?v=) → cache-first: instant offline + zero redundant
//    refetch; a new build changes the sha → the URL, so a cache miss on the new
//    key still fetches fresh. Wins over the raw network-first.
//  - navigation + raw without a version or not pinned to a commit (a branch
//    read, meta.yaml's included) → network-first (prefer fresh, fall back to
//    cache offline).
//  - truly-immutable CDN/static assets → cache-first.
//  - the YouTube player hosts → network-only.
//  - everything else (app js/css, the Vimeo iframe) → network-first.
function pickStrategy(url) {
  // MUST stay ahead of the isApiOrRaw branch below: isApiOrRaw still matches
  // api.github.com too, so removing this check would silently route the API
  // network-first again and reintroduce the offline-shadowing bug (a cached
  // 200 making the app believe it is online).
  if (isApiHost(url) || isYouTubeHost(url)) return 'network-only';
  if (hasImmutableVersion(url) && (!isApiOrRaw(url) || isCommitPinnedRaw(url))) return 'cache-first';
  if (isNavigation(url) || isApiOrRaw(url)) return 'network-first';
  if (isImmutable(url)) return 'cache-first';
  return 'network-first';
}

// Media never goes through the worker. A <video> fetches its file as a run of
// range requests over minutes, and a worker standing in the middle of them
// broke it: after a few minutes paused, Chrome's next seek died with
// "data source error" while the same video played on with the worker blocked.
// The Cache API cannot store a 206 either, so routing media through the worker
// buys nothing to make up for it.
var MEDIA_DESTINATIONS = ['video', 'audio'];

function bypassesWorker(destination, rangeHeader) {
  return MEDIA_DESTINATIONS.indexOf(destination) !== -1 || !!rangeHeader;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bypassesWorker: bypassesWorker,
    IMMUTABLE_PATTERNS: IMMUTABLE_PATTERNS,
    isImmutable: isImmutable,
    isApiOrRaw: isApiOrRaw,
    isApiHost: isApiHost,
    isYouTubeHost: isYouTubeHost,
    isNavigation: isNavigation,
    hasImmutableVersion: hasImmutableVersion,
    isCommitPinnedRaw: isCommitPinnedRaw,
    cacheKeyFor: cacheKeyFor,
    pickStrategy: pickStrategy,
  };
}
