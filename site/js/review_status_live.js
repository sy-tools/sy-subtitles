// Review statuses computed live from the GitHub Issues API, for a signed-in
// user. review-status.json is rebuilt from the same issues by a workflow that
// lands minutes after a label changes; this reads the issues themselves.
//
// applyIssues is the JS twin of apply_issues in
// .github/scripts/sync-review-status.py — change one and you must change the
// other. tests/fixtures/review_status_mapping.json runs through both.
//
// Single source: loaded via <script src="js/review_status_live.js"> in
// site/index.html AND required by the Node test suite — no inline mirror.

var GATE_LABEL = 'talk-review';
var TITLE_PREFIX = 'Review: ';
var OPERATOR_LABEL = 'talk-operator';
var OPERATOR_PREFIX = 'Operator: ';
var OPERATOR_STAGE_LABELS = [
  ['op:delivered', 'delivered'],
  ['op:ready', 'ready'],
  ['op:qa', 'qa'],
  ['op:review', 'review'],
  ['op:translator', 'translator'],
  ['op:pipeline', 'pipeline'],
];

// The one place the REST issue shape (labels[].name, assignees[].login,
// updated_at) becomes the `gh issue list --json` shape the Python script reads
// (updatedAt), so both mappings consume the same rows. Everything else — the
// body above all — is dropped: these rows are cached in localStorage.
function normalizeRestIssue(r) {
  return {
    number: r.number,
    title: r.title || '',
    labels: (r.labels || []).map(function (l) { return { name: typeof l === 'string' ? l : l.name }; }),
    assignees: (r.assignees || []).map(function (a) { return { login: a.login }; }),
    updatedAt: r.updated_at || '',
  };
}

// An issue carrying both labels arrives in both per-label lists.
function mergeIssueLists(lists) {
  var seen = {}, out = [];
  lists.forEach(function (list) {
    (list || []).forEach(function (issue) {
      if (seen[issue.number]) return;
      seen[issue.number] = true;
      out.push(issue);
    });
  });
  return out;
}

function labelNames(issue) {
  return (issue.labels || []).map(function (l) { return l.name; });
}

function firstAssignee(issue) {
  var a = issue.assignees || [];
  return a.length ? a[0].login : null;
}

function statusFromLabels(labels) {
  if (labels.indexOf('review:approved') !== -1) return 'approved';
  if (labels.indexOf('review:in-progress') !== -1) return 'in-progress';
  return 'pending';
}

function operatorStage(labels) {
  for (var i = 0; i < OPERATOR_STAGE_LABELS.length; i++) {
    if (labels.indexOf(OPERATOR_STAGE_LABELS[i][0]) !== -1) return OPERATOR_STAGE_LABELS[i][1];
  }
  return null;
}

// Freshest activity wins (updatedAt is ISO-8601 Z, so it sorts as text); the
// higher number breaks a tie. Never the order the API listed them in.
function liveIssue(group) {
  return group.reduce(function (best, issue) {
    var a = issue.updatedAt || '', b = best.updatedAt || '';
    return (a > b || (a === b && issue.number > best.number)) ? issue : best;
  });
}

// baseTalks: the `talks` of review-status.json — entries no issue covers are
// kept. talkIds: the talks that exist (manifest ids), standing in for the
// script's talks/ directory check. Returns a new object; nothing is mutated.
function applyIssues(baseTalks, issues, talkIds) {
  var talks = {};
  Object.keys(baseTalks || {}).forEach(function (id) {
    talks[id] = Object.assign({}, baseTalks[id]);
  });
  var known = {};
  (talkIds || []).forEach(function (id) { known[id] = true; });

  var byTalk = {}, byTalkOperator = {};
  function group(map, talkId, issue) {
    if (!Object.prototype.hasOwnProperty.call(map, talkId)) map[talkId] = [];
    map[talkId].push(issue);
  }
  (issues || []).forEach(function (issue) {
    var title = issue.title || '';
    if (title.indexOf(OPERATOR_PREFIX) === 0 && labelNames(issue).indexOf(OPERATOR_LABEL) !== -1) {
      group(byTalkOperator, title.slice(OPERATOR_PREFIX.length).trim(), issue);
      return;
    }
    if (title.indexOf(TITLE_PREFIX) !== 0) return;
    var talkId = title.slice(TITLE_PREFIX.length).trim();
    if (talkId) group(byTalk, talkId, issue);
  });

  Object.keys(byTalk).forEach(function (talkId) {
    var winner = liveIssue(byTalk[talkId]);
    talks[talkId] = {
      status: statusFromLabels(labelNames(winner)),
      reviewer: firstAssignee(winner),
      issue_number: winner.number,
      updated_at: winner.updatedAt,
    };
  });

  Object.keys(byTalkOperator).forEach(function (talkId) {
    if (!known[talkId]) return;
    var winner = liveIssue(byTalkOperator[talkId]);
    if (!Object.prototype.hasOwnProperty.call(talks, talkId)) {
      talks[talkId] = { status: 'pending', reviewer: null, issue_number: null, updated_at: winner.updatedAt };
    }
    talks[talkId].operator_stage = operatorStage(labelNames(winner));
    talks[talkId].operator = firstAssignee(winner);
    talks[talkId].operator_issue = winner.number;
  });

  return talks;
}

function overlayReviewStatus(reviewStatus, issues, talkIds) {
  var out = Object.assign({}, reviewStatus || {});
  out.talks = applyIssues((reviewStatus && reviewStatus.talks) || {}, issues, talkIds);
  return out;
}

// Taking a talk assigns the reviewer at once, but `review:in-progress` is put
// on by a workflow a minute later. In between GitHub truthfully says "pending,
// assigned" — and the card the reviewer just saw turn "in review" would turn
// back. So the SPA's own claim (`entry`, made at `since`) outlives the overlay
// until GitHub agrees, disagrees (another reviewer, or none), or maxAgeMs runs
// out. claims: { talkId: { entry, since } }. Returns new { talks, claims }.
//
// requestStartedMs is when the request behind `talks` was sent. GitHub can only
// disagree with a claim it was asked about afterwards: a request sent before
// the claim truthfully answers "unassigned" after it, and that is not news.
// Sent in the claim's own millisecond the order is unknown, so the claim stays.
// Omitted, every answer is taken as newer than every claim.
function holdClaims(talks, claims, nowMs, maxAgeMs, requestStartedMs) {
  var outTalks = Object.assign({}, talks), kept = {};
  Object.keys(claims || {}).forEach(function (id) {
    var claim = claims[id], live = outTalks[id];
    if (nowMs - claim.since > maxAgeMs) return;
    var answerPredatesClaim = requestStartedMs != null && requestStartedMs <= claim.since;
    var disagrees = live && (live.status !== 'pending' || live.reviewer !== claim.entry.reviewer);
    if (disagrees && !answerPredatesClaim) return;
    outTalks[id] = Object.assign({}, live, claim.entry);
    kept[id] = claim;
  });
  return { talks: outTalks, claims: kept };
}

// Callers arriving while run() is in flight share its promise; the first one
// after it settles starts a new call.
function singleFlight(run) {
  var inFlight = null;
  return function () {
    if (inFlight) return inFlight;
    var mine = inFlight = new Promise(function (resolve) { resolve(run()); });
    var clear = function () { if (inFlight === mine) inFlight = null; };
    mine.then(clear, clear);
    return mine;
  };
}

function liveIssuesCacheKey(branch, label) {
  return 'sy_live_issues__' + branch + '__' + label;
}

// A connection that stalls never settles on its own, and everything waiting on
// the statuses (singleFlight's callers, a manual refresh before it repaints)
// would wait with it.
var LIVE_ISSUES_TIMEOUT_MS = 15000;

// Every issue behind the statuses, in the gh CLI shape. One query per label:
// `labels=a,b` means BOTH, and the two kinds of issue carry one each.
//
// opts: { api, token, branch, storage, fetchImpl, timeoutMs }. Rejects if
// either query does — half the issues would overlay as "the other half is
// gone" — and, with a TimeoutError, if the whole read (headers AND bodies,
// every page) outlasts timeoutMs; the requests still open are aborted.
function fetchLiveIssues(opts) {
  var list = typeof listIssuesByLabelConditional === 'function'
    ? listIssuesByLabelConditional
    : require('./github_api').listIssuesByLabelConditional;
  var storage = opts.storage;
  var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : LIVE_ISSUES_TIMEOUT_MS;
  var controller = typeof AbortController === 'function' ? new AbortController() : null;
  var fetchWithSignal = function (url, init) {
    var withSignal = Object.assign({}, init);
    if (controller) withSignal.signal = controller.signal;
    return (opts.fetchImpl || fetch)(url, withSignal);
  };
  function one(label) {
    var key = liveIssuesCacheKey(opts.branch, label);
    var cached = null;
    try { cached = JSON.parse(storage.getItem(key)); } catch (e) { cached = null; }
    return list(opts.api, opts.token, label, { cached: cached, mapRow: normalizeRestIssue }, fetchWithSignal)
      .then(function (res) {
        try { storage.setItem(key, JSON.stringify({ pages: res.pages })); } catch (e) { /* quota: refetch next time */ }
        return res.rows;
      });
  }
  var timer = null;
  // The race, not the abort, is what rejects: an abort only reaches a request
  // whose fetch honours the signal.
  var timedOut = new Promise(function (resolve, reject) {
    timer = setTimeout(function () {
      var e = new Error('live issues: no answer in ' + timeoutMs + ' ms');
      e.name = 'TimeoutError';
      reject(e);
      if (controller) controller.abort();
    }, timeoutMs);
  });
  var stopTimer = function () { clearTimeout(timer); };
  var read = Promise.race([Promise.all([one(GATE_LABEL), one(OPERATOR_LABEL)]), timedOut]);
  read.then(stopTimer, stopTimer);
  return read.then(mergeIssueLists);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GATE_LABEL: GATE_LABEL,
    OPERATOR_LABEL: OPERATOR_LABEL,
    OPERATOR_STAGE_LABELS: OPERATOR_STAGE_LABELS,
    normalizeRestIssue: normalizeRestIssue,
    mergeIssueLists: mergeIssueLists,
    applyIssues: applyIssues,
    overlayReviewStatus: overlayReviewStatus,
    holdClaims: holdClaims,
    singleFlight: singleFlight,
    liveIssuesCacheKey: liveIssuesCacheKey,
    fetchLiveIssues: fetchLiveIssues,
    LIVE_ISSUES_TIMEOUT_MS: LIVE_ISSUES_TIMEOUT_MS,
  };
}
