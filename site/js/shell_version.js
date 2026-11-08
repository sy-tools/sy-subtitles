// Canonical "app shell" version, used for SPA update detection.
//
// The auto-reload check compares the version baked into the running page
// (APP_SHELL_VERSION, stamped at deploy) against the version computed live from
// the GitHub Trees API. It covers index.html AND every site/js/*.js AND every
// site/css/*.css, so any app-code or app-style change is detected.
//
// Algorithm (MUST stay identical to tools/compute_shell_version.sh, which the
// deploy workflow runs — asserted by tests/test_shell_version.js):
//   one "<path> <blob sha>\n" line per shell file, sorted by path; the version
//   is the first 12 hex chars of the SHA-256 of that text.
//
// `entries` is the GitHub tree array: objects with { path, sha }.
function shellVersionInput(entries) {
  return (entries || [])
    .filter(function (e) {
      return e && (e.path === 'site/index.html'
        || /^site\/js\/[^/]+\.js$/.test(e.path)
        || /^site\/css\/[^/]+\.css$/.test(e.path));
    })
    .sort(function (a, b) {
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    })
    .map(function (e) { return e.path + ' ' + (e.sha || '') + '\n'; })
    .join('');
}

// `subtle` is the page's crypto.subtle. Browsers expose it only in a secure
// context (https, localhost); without it there is nothing to compare, and an
// empty version makes the caller skip the reload check.
function computeShellVersion(entries, subtle) {
  var input = shellVersionInput(entries);
  if (!input || !subtle) return Promise.resolve('');
  return subtle.digest('SHA-256', new TextEncoder().encode(input)).then(function (buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return (b < 16 ? '0' : '') + b.toString(16);
    }).join('').slice(0, 12);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { shellVersionInput: shellVersionInput, computeShellVersion: computeShellVersion };
}
