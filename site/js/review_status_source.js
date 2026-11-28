// Where review-status.json is read from.
//
// The file lives on a data branch that sync-review-status.yml pushes to
// directly, not on the branch the app is showing: statuses are derived from
// issue labels, and a commit on `main` per label change bought a pull request
// and a CI run for a file nobody reviews.
//
// It is read from raw.githubusercontent, by branch name. That costs no API
// request — an anonymous visitor has 60 an hour, and a conditional request
// answered 304 is counted against them like any other (only an authorized one
// is free). The price is the raw CDN: it may answer with a copy up to five
// minutes old, and nothing in a URL can make it look again. So freshness is
// kept by never going BACKWARDS instead (newerStatus): the copy this browser
// already holds is replaced only by a later one.
//
// Single source: loaded via <script src="js/review_status_source.js"> in
// site/index.html AND required by the Node test suite — no inline mirror.

// tests/test_sync_review_status_state_branch.py holds this to the branch the
// workflow publishes on.
var STATE_BRANCH = 'state';
var REVIEW_STATUS_PATH = 'review-status.json';

function stateStatusUrl(rawRoot) {
  return rawRoot + '/' + STATE_BRANCH + '/' + REVIEW_STATUS_PATH;
}

// The writer stamps every file later than the one it replaces
// (sync-review-status.py stamp_after), always in UTC and in one format, so the
// stamps sort as text — the same reading liveIssue (js/review_status_live.js)
// gives an issue's updatedAt. `a` wins a tie: it is the copy just read.
function newerStatus(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return (b.updated_at || '') > (a.updated_at || '') ? b : a;
}

function isStatusDocument(data) {
  return !!data && typeof data === 'object' && !Array.isArray(data)
    && !!data.talks && typeof data.talks === 'object';
}

function fetchStatusDocument(url, init, fetchImpl) {
  return fetchImpl(url, init).then(function (r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function (data) {
    // A 200 is not yet statuses: a captive portal answers with its own page.
    if (!isStatusDocument(data)) throw new Error('not a review-status document');
    return data;
  });
}

// The statuses on the data branch; `fallbackUrl`, when given, is asked only if
// that read fails — the branch does not exist until the workflow's first run.
// Rejects with the data branch's error when neither answers.
//
// opts: { stateUrl, fallbackUrl, fetchImpl }
function fetchReviewStatusFile(opts) {
  var f = opts.fetchImpl || fetch;
  // no-store: raw answers `max-age=300`, and the browser's HTTP cache would
  // add its own five minutes to whatever the CDN is already behind.
  return fetchStatusDocument(opts.stateUrl, { cache: 'no-store' }, f).catch(function (stateError) {
    if (!opts.fallbackUrl) throw stateError;
    return fetchStatusDocument(opts.fallbackUrl, undefined, f).catch(function () { throw stateError; });
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STATE_BRANCH: STATE_BRANCH,
    REVIEW_STATUS_PATH: REVIEW_STATUS_PATH,
    stateStatusUrl: stateStatusUrl,
    newerStatus: newerStatus,
    fetchReviewStatusFile: fetchReviewStatusFile,
  };
}
