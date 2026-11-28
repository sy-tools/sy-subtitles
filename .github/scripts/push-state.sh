#!/usr/bin/env bash
# Publish generated data on a data-only branch by pushing to it directly.
#
# Usage:
#   .github/scripts/push-state.sh <branch> <commit_message> <generator> [args...]
#
# <generator> runs from the current directory with STATE_DIR naming a directory
# that holds the branch's files (empty when the branch does not exist yet), and
# rewrites them in place. Whatever it leaves there is committed and pushed.
#
# For data that is derived, not authored: nothing reviews this push. Results a
# person should see before they land go through bot-pr.sh instead.
#
# Requirements:
#   - run from a checkout whose `origin` credentials may push <branch>

set -euo pipefail

BRANCH="$1"; shift
COMMIT_MSG="$1"; shift
if [ $# -eq 0 ]; then
  echo "usage: push-state.sh <branch> <commit_message> <generator> [args...]" >&2
  exit 2
fi

REMOTE="origin"
REF="refs/heads/$BRANCH"
MAX_ATTEMPTS="${STATE_PUSH_ATTEMPTS:-5}"
RETRY_SECONDS="${STATE_PUSH_RETRY_SECONDS:-3}"
LS_REMOTE_NO_MATCH=2

export GIT_AUTHOR_NAME="github-actions[bot]"
export GIT_AUTHOR_EMAIL="github-actions[bot]@users.noreply.github.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

GIT_DIR_ABS=$(git rev-parse --absolute-git-dir)
SCRATCH=$(mktemp -d)
trap 'rm -rf "$SCRATCH"' EXIT

# The branch is read and written through an index and a directory of its own,
# so the checkout this runs from keeps its HEAD, index and files.
state_git() {
  GIT_INDEX_FILE="$SCRATCH/index" git --git-dir="$GIT_DIR_ABS" --work-tree="$STATE_DIR" "$@"
}

# Prints the branch's head commit, or nothing when the branch does not exist.
# A remote that cannot be asked is an error: taken for a missing branch, it
# would start the generator from nothing.
fetch_branch_head() {
  local status=0
  git ls-remote --exit-code "$REMOTE" "$REF" > /dev/null || status=$?
  if [ "$status" -eq "$LS_REMOTE_NO_MATCH" ]; then
    return 0
  fi
  if [ "$status" -ne 0 ]; then
    echo "::error::cannot read $REF from $REMOTE (git ls-remote exited $status)" >&2
    return 1
  fi
  git fetch --quiet --no-tags --depth=1 "$REMOTE" "$REF"
  git rev-parse FETCH_HEAD
}

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  export STATE_DIR="$SCRATCH/tree-$attempt"
  mkdir "$STATE_DIR"
  rm -f "$SCRATCH/index"

  parent=$(fetch_branch_head)
  if [ -n "$parent" ]; then
    state_git read-tree "$parent"
    state_git checkout-index --all
  fi

  "$@"

  state_git add --all
  tree=$(state_git write-tree)
  if [ -n "$parent" ] && [ "$tree" = "$(git rev-parse "$parent^{tree}")" ]; then
    echo "No changes to publish on $BRANCH"
    exit 0
  fi
  if [ -z "$parent" ] && [ -z "$(state_git ls-files)" ]; then
    echo "Nothing generated and no $BRANCH branch yet — nothing to publish"
    exit 0
  fi

  # No parent makes the first commit a root: the branch shares no history with
  # the code, so fetching it never drags the repository along.
  commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "$COMMIT_MSG")

  # A plain push: the remote refuses it when the branch moved after it was
  # read. The answer to that is a new attempt from the top — the generator
  # included — never --force and never a rebase: either would publish data
  # generated BEFORE the commit it lands on, and so undo that commit's update.
  if git push --quiet "$REMOTE" "$commit:$REF"; then
    echo "Published $commit on $BRANCH"
    exit 0
  fi
  echo "Push to $BRANCH refused (attempt $attempt of $MAX_ATTEMPTS)"
  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    sleep "$RETRY_SECONDS"
  fi
done

echo "::error::could not publish on $BRANCH: $MAX_ATTEMPTS pushes were refused"
exit 1
