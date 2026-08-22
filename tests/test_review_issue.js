const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { reviewIssueTitle, pickReviewIssue } = require('../site/js/review_issue');

// Taking a talk for review must re-attach to the talk's existing `talk-review`
// issue instead of opening a second one. A duplicate pair corrupts the talk's
// status: .github/scripts/sync-review-status.py keeps one issue per talk, so
// the loser's labels/assignee silently vanish from review-status.json (that is
// how an approved, claimed talk fell back to "needs review" with no reviewer).
const TALK = '2004-07-04_Guru-Puja-Follow-My-Message-of-Love';

const row = (number, over) => Object.assign({
  number: number,
  title: 'Review: ' + TALK,
  state: 'open',
  updated_at: '2026-08-12T07:08:06Z',
}, over || {});

describe('reviewIssueTitle', () => {
  it('matches the title contract of sync-review-status.py', () => {
    assert.strictEqual(reviewIssueTitle(TALK), 'Review: ' + TALK);
  });
});

describe('pickReviewIssue', () => {
  it('finds the talk\'s existing issue by exact title', () => {
    const rows = [row(900, { title: 'Review: 1979-02-25_Puja-In-Pune-Marathi' }), row(954)];
    assert.strictEqual(pickReviewIssue(rows, TALK).number, 954);
  });

  it('returns null when the talk has no issue yet', () => {
    assert.strictEqual(pickReviewIssue([row(900, { title: 'Review: other' })], TALK), null);
  });

  it('tolerates a missing or empty row list', () => {
    assert.strictEqual(pickReviewIssue(null, TALK), null);
    assert.strictEqual(pickReviewIssue([], TALK), null);
  });

  it('never matches on a prefix — a longer talk id is a different talk', () => {
    const rows = [row(900, { title: 'Review: ' + TALK + '-part-2' })];
    assert.strictEqual(pickReviewIssue(rows, TALK), null);
  });

  it('picks the freshest duplicate, matching the sync script precedence', () => {
    // Same ranking as issue_rank() in sync-review-status.py: latest activity,
    // then the higher number — so the SPA claims the very issue the sync will
    // treat as authoritative.
    const stale = row(954, { updated_at: '2026-08-12T07:08:06Z' });
    const live = row(957, { updated_at: '2026-08-12T21:57:55Z' });
    assert.strictEqual(pickReviewIssue([live, stale], TALK).number, 957);
    assert.strictEqual(pickReviewIssue([stale, live], TALK).number, 957);
  });

  it('breaks a timestamp tie on the issue number', () => {
    const t = '2026-08-12T21:57:55Z';
    const rows = [row(954, { updated_at: t }), row(957, { updated_at: t })];
    assert.strictEqual(pickReviewIssue(rows, TALK).number, 957);
  });

  it('ranks a row without updated_at below one that has it', () => {
    const undated = row(999, { updated_at: undefined });
    const dated = row(954, { updated_at: '2026-08-12T07:08:06Z' });
    assert.strictEqual(pickReviewIssue([undated, dated], TALK).number, 954);
  });
});

describe('review_issue.js is wired into the SPA', () => {
  const html = fs.readFileSync('site/index.html', 'utf8');
  const sw = fs.readFileSync('site/sw.js', 'utf8');

  it('loads the module as a plain script tag', () => {
    assert.ok(html.includes('<script src="js/review_issue.js"></script>'),
      'index.html must load js/review_issue.js — single source, no inline copy');
  });

  it('precaches the module', () => {
    assert.ok(sw.includes("'js/review_issue.js'"),
      'a new site/js module must be added to the SW SHELL_ASSETS list: js/review_issue.js');
  });

  it('makes takeForReview look for an existing issue before creating one', () => {
    const fn = html.slice(html.indexOf('SPA.takeForReview = function'),
                          html.indexOf('SPA.ghLogin = function'));
    assert.ok(fn.includes('listIssuesByLabel') && fn.includes('pickReviewIssue'),
      'takeForReview must resolve the talk\'s existing talk-review issue; '
      + 'creating a second one silently overwrites the talk\'s review status');
    assert.ok(fn.indexOf('pickReviewIssue') < fn.indexOf('createIssue'),
      'the lookup must run BEFORE createIssue, not as a fallback after it');
  });
});
