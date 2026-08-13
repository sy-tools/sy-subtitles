// Resolving a talk's review-tracking issue. Single source: loaded by the
// browser via <script src="js/review_issue.js"> in site/index.html AND
// required by the Node test suite — no inline mirror.
//
// The title/label contract is shared with .github/scripts/sync-review-status.py:
// issues labelled `talk-review` and titled "Review: <talk_id>" are the sole
// source of review-status.json. That script keeps ONE issue per talk, so a
// second issue for the same talk does not add a second review — it silently
// takes the talk's status over (or loses to the stale one). "Take for review"
// must therefore re-attach to whatever issue already exists rather than open a
// new one whenever its cached review-status happens to lack an issue number.
var REVIEW_ISSUE_LABEL = 'talk-review';
var REVIEW_TITLE_PREFIX = 'Review: ';

function reviewIssueTitle(talkId) {
  return REVIEW_TITLE_PREFIX + talkId;
}

// Mirrors issue_rank() in sync-review-status.py: freshest activity wins
// (`updated_at` is ISO-8601 Z, so it sorts as text), the higher number breaks a
// tie. Claiming the same issue the sync treats as authoritative keeps the
// optimistic UI and the bot commit in agreement.
function rankReviewIssue(row) {
  return [(row && row.updated_at) || '', (row && row.number) || 0];
}

function pickReviewIssue(rows, talkId) {
  var title = reviewIssueTitle(talkId);
  var matches = (rows || []).filter(function (r) { return r && r.title === title; });
  if (!matches.length) return null;
  return matches.slice().sort(function (a, b) {
    var ra = rankReviewIssue(a), rb = rankReviewIssue(b);
    if (ra[0] !== rb[0]) return ra[0] < rb[0] ? 1 : -1;
    return rb[1] - ra[1];
  })[0];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    REVIEW_ISSUE_LABEL: REVIEW_ISSUE_LABEL,
    reviewIssueTitle: reviewIssueTitle,
    pickReviewIssue: pickReviewIssue,
  };
}
