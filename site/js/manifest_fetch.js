// Pure helpers for classifying a GitHub Trees API response in loadManifest, so
// a rate-limit or offline failure degrades to the cached manifest (flagged
// stale) instead of a blank index. Single source: loaded by the browser via
// <script src="js/manifest_fetch.js"> in site/index.html AND required by the
// Node test suite — no inline mirror.
//
// GitHub exposes X-RateLimit-* on its API responses via Access-Control-Expose-
// Headers, so the browser can read them cross-origin. Unauthenticated REST is
// ~60 req/h, so a 403 with remaining=0 is a real, common state.

// Returns { rateLimited, rlReset }. rlReset is the epoch-seconds reset time, or
// null when not rate-limited / header absent / malformed.
function rateLimitInfo(status, headerGet) {
  var get = typeof headerGet === 'function' ? headerGet : function () { return null; };
  var remaining = get('X-RateLimit-Remaining');
  var limited = (status === 403 || status === 429) && remaining === '0';
  var rlReset = null;
  if (limited) {
    var raw = get('X-RateLimit-Reset');
    var n = raw != null ? parseInt(raw, 10) : NaN;
    if (isFinite(n) && n > 0) rlReset = n;
  }
  return { rateLimited: limited, rlReset: rlReset };
}

// Build the Error thrown when there is NO cache to fall back on. Carries the
// fields the UI needs to phrase a helpful message (status, rate-limit, reset).
function makeManifestError(status, info) {
  var e = new Error('API ' + status);
  e.status = status;
  e.rateLimited = !!(info && info.rateLimited);
  e.rlReset = (info && info.rlReset) || null;
  return e;
}

// review-status.json shares the manifest's resilience need: a failed/offline
// refetch must NOT replace good statuses with an empty set (that zeros the whole
// index — filters and stat counts key off review status). Pick, in order: the
// current in-memory statuses if non-empty, else the last persisted copy, else an
// empty set. Returns the chosen object by reference so the caller can reuse it.
function reviewStatusFallback(current, cached) {
  if (current && current.talks && Object.keys(current.talks).length) return current;
  if (cached && cached.talks) return cached;
  return { talks: {} };
}

// Minutes (rounded up) until an epoch-seconds reset, 0 if already past, null if
// no reset is known.
function minutesUntilReset(rlReset, nowMs) {
  if (!rlReset) return null;
  var ms = rlReset * 1000 - nowMs;
  if (ms <= 0) return 0;
  return Math.ceil(ms / 60000);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rateLimitInfo: rateLimitInfo,
    makeManifestError: makeManifestError,
    minutesUntilReset: minutesUntilReset,
    reviewStatusFallback: reviewStatusFallback,
  };
}
