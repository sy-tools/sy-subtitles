// Decide whether a failed content (SRT/transcript) load is an offline situation
// — so the SPA can show a friendly "available online only" screen instead of a
// cryptic inline error. Single source: loaded by the browser via
// <script src="js/offline_fallback.js"> in site/index.html AND required by the
// Node test suite — no inline mirror.
//
// With sha-pinned content served cache-first by the service worker, a content
// fetch only fails offline when that talk was never cached — exactly the case
// this screen exists for.

function isOfflineError(err, online) {
  // The browser explicitly reports no connection — always offline.
  if (online === false) return true;
  // Online (or unknown) but fetch() rejected on its own: a network TypeError
  // (dropped connection / DNS / CORS), with no HTTP status. An Error carrying a
  // status, or any non-network throw (HTTP 404, a parse error), is NOT offline.
  return !!err && err.name === 'TypeError' && err.status == null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isOfflineError: isOfflineError };
}
