#!/usr/bin/env bash
# Canonical app-shell version: one "<path> <blob sha>" line per shell file
# (site/index.html, each direct site/js/*.js and each direct site/css/*.css),
# sorted by path; the version is the first 12 hex chars of the SHA-256 of that
# text.
#
# Stamped into APP_SHELL_VERSION by .github/workflows/deploy-pages.yml and used
# by the SPA's auto-reload check. MUST stay byte-identical to
# computeShellVersion() in site/js/shell_version.js — asserted by
# tests/test_shell_version.js.
#
# Reads the committed tree at HEAD (the same blob SHAs the GitHub Trees API
# returns to the running SPA), so it is independent of any deploy-time edits to
# the working tree.
set -euo pipefail
if command -v sha256sum >/dev/null; then sha256() { sha256sum; }; else sha256() { shasum -a 256; }; fi
git ls-tree -r HEAD -- site/index.html site/js site/css \
  | awk '{
      path = $4; sha = $3;
      if (path == "site/index.html") { print path, sha; next }
      if (index(path, "site/js/") == 1) {
        rest = substr(path, 9);                 # after "site/js/"
        if (index(rest, "/") == 0 && rest ~ /\.js$/) print path, sha;
      } else if (index(path, "site/css/") == 1) {
        rest = substr(path, 10);                # after "site/css/"
        if (index(rest, "/") == 0 && rest ~ /\.css$/) print path, sha;
      }
    }' \
  | LC_ALL=C sort \
  | sha256 \
  | cut -c1-12 \
  | tr -d '\n'
