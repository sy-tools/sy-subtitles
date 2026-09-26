#!/usr/bin/env bash
# Create a PR with bot changes instead of pushing directly to main.
#
# Usage:
#   .github/scripts/bot-pr.sh <branch_prefix> <commit_message> <add_paths...>
#
# Example:
#   .github/scripts/bot-pr.sh bot/whisper "Add Whisper data" talks/*/*/source/whisper.json
#
# The PR targets the ref the run was dispatched from (GITHUB_REF_NAME),
# falling back to main. Override with BOT_PR_BASE.
#
# Requirements:
#   - GH_TOKEN must be set (for gh CLI)
#   - Must be run from repo root with git configured

set -euo pipefail

BRANCH_PREFIX="$1"; shift
COMMIT_MSG="$1"; shift
ADD_PATHS=("$@")

# Stage files — glob each path individually and skip patterns that match nothing.
# Callers may pass optimistic globs (e.g. work/timecodes.txt) that are absent when
# an upstream job failed; we still want to commit whatever partial artifacts exist.
shopt -s nullglob
EXISTING=()
for pattern in "${ADD_PATHS[@]}"; do
  matches=($pattern)
  if [ ${#matches[@]} -gt 0 ]; then
    EXISTING+=("${matches[@]}")
  else
    echo "  (skip: no match for $pattern)"
  fi
done
shopt -u nullglob

if [ ${#EXISTING[@]} -eq 0 ]; then
  echo "No paths matched any files — nothing to commit"
  exit 0
fi

git add "${EXISTING[@]}"

# Check for changes
if git diff --cached --quiet; then
  echo "No changes to commit"
  exit 0
fi

# Target the ref this run was dispatched from, NOT always main. The bot branch
# is cut from the current checkout, so basing the PR on main would merge that
# whole checkout into main — a workflow dispatched from a feature branch would
# ship every unreviewed commit on it as a side effect of asking for artifacts.
# `pull_request` runs report a synthetic `123/merge` ref that cannot be a base.
BASE="${BOT_PR_BASE:-${GITHUB_REF_NAME:-main}}"
case "$BASE" in
  */merge|*/head|"") BASE="main" ;;
esac
echo "PR base: $BASE"

# Create branch with timestamp to avoid collisions
BRANCH="${BRANCH_PREFIX}/$(date +%Y%m%d-%H%M%S)-${RANDOM}"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git checkout -b "$BRANCH"
git commit -m "$COMMIT_MSG"
git push -u origin "$BRANCH"

PR_URL=$(gh pr create \
  --title "$COMMIT_MSG" \
  --body "Automated PR by GitHub Actions." \
  --base "$BASE" \
  --head "$BRANCH")

echo "Created PR: $PR_URL"

# Try auto-merge first (requires branch protection with required checks).
# Falls back to immediate merge if auto-merge is not available.
if gh pr merge --auto --delete-branch --merge "$PR_URL" 2>/dev/null; then
  echo "Auto-merge enabled (branch will be deleted after merge)"
else
  echo "Auto-merge not available, merging immediately"
  gh pr merge --delete-branch --merge "$PR_URL"
fi

# BOT_PR_WAIT_MERGE_SECONDS: hold this job until the PR has merged. A caller
# that serializes its runs needs it, or the next run branches off a main that
# lacks this change, rewrites the same lines, and its PR conflicts once this one
# lands — then its auto-merge never fires.
if [ -n "${BOT_PR_WAIT_MERGE_SECONDS:-}" ]; then
  deadline=$(( $(date +%s) + BOT_PR_WAIT_MERGE_SECONDS ))
  while :; do
    state=$(gh pr view "$PR_URL" --json state --jq .state)
    case "$state" in
      MERGED) echo "Merged: $PR_URL"; break ;;
      CLOSED) echo "::error::$PR_URL was closed without merging"; exit 1 ;;
    esac
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "::error::$PR_URL did not merge within ${BOT_PR_WAIT_MERGE_SECONDS}s; check its CI"
      exit 1
    fi
    sleep "${BOT_PR_POLL_SECONDS:-10}"
  done
fi
