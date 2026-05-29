// Canonical "app shell" version string used for SPA update detection.
//
// The auto-reload check compares the version baked into the running page
// (APP_DEPLOY_SHA, stamped at deploy) against the version computed live from
// the GitHub Trees API. Historically this was just site/index.html's blob SHA,
// so a fix shipped in an external js/ file would not trigger a reload. The
// shell version covers index.html AND every site/js/*.js, so any app-code
// change is detected.
//
// Algorithm (MUST stay identical to tools/compute_shell_version.sh, which the
// deploy workflow runs — asserted by tests/test_shell_version.js):
//   take the git blob SHA of site/index.html and each site/js/*.js,
//   sort by path, take the first 7 chars of each, concatenate.
//
// `entries` is the GitHub tree array: objects with { path, sha }.
function computeShellVersion(entries) {
  return (entries || [])
    .filter(function (e) {
      return e && (e.path === 'site/index.html'
        || /^site\/js\/[^/]+\.js$/.test(e.path));
    })
    .sort(function (a, b) {
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    })
    .map(function (e) { return String(e.sha || '').slice(0, 7); })
    .join('');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeShellVersion: computeShellVersion };
}
