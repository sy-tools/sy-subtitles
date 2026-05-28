#!/usr/bin/env bash
# Canonical app-shell version: the first 7 chars of the git blob SHAs of
# site/index.html and each direct site/js/*.js, in path order, concatenated.
#
# Stamped into APP_DEPLOY_SHA by .github/workflows/deploy-pages.yml and used by
# the SPA's auto-reload check. MUST stay byte-identical to computeShellVersion()
# in site/js/shell_version.js — asserted by tests/test_shell_version.js.
#
# Reads the committed tree at HEAD (the same blob SHAs the GitHub Trees API
# returns to the running SPA), so it is independent of any deploy-time edits to
# the working tree.
set -euo pipefail
git ls-tree -r HEAD -- site/index.html site/js \
  | awk '{
      path = $4; sha = substr($3, 1, 7);
      if (path == "site/index.html") { print path, sha; next }
      if (index(path, "site/js/") == 1) {
        rest = substr(path, 9);                 # after "site/js/"
        if (index(rest, "/") == 0 && rest ~ /\.js$/) print path, sha;
      }
    }' \
  | LC_ALL=C sort \
  | awk '{ printf "%s", $2 }'
