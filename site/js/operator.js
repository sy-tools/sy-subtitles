// Operator mode — pure logic. Single source: loaded by the browser via
// <script src="js/operator.js"> in site/index.html AND required by the Node
// test suite (tests/test_operator.js).
//
// The operator's state lives in GitHub labels on the `Operator: {talk_id}`
// issue; sync-review-status.py derives `operator_stage` from them into
// review-status.json. Nothing here keeps a second copy of that state.

// sync-review-status.py OPERATOR_STAGES: op:review|qa|ready|delivered.
var OPERATOR_STAGES = ['review', 'qa', 'ready', 'delivered'];
var OPERATOR_FILTERS = ['op-all', 'op-review', 'op-qa', 'op-ready', 'op-delivered'];
var OPEN_STAGES = ['review', 'qa', 'ready'];

// The bot posts the e-mail link; only its comment is trusted (anyone with
// triage access can comment, translators included).
var READY_COMMENT_AUTHOR = 'github-actions[bot]';
var READY_HEADING = '### Ready for Amruta';
var GMAIL_PREFIX = 'https://mail.google.com/mail/?';

// Identity is the numeric GitHub id, never the login: a login can be renamed
// and then re-registered by someone else. Same rule as tools/roles.py.
function isOperator(roles, viewerId) {
  if (typeof viewerId !== 'number' || !roles || !Array.isArray(roles.operators)) return false;
  return roles.operators.some(function (o) { return !!o && o.id === viewerId; });
}

function operatorStageOf(entry) {
  var s = entry && entry.operator_stage;
  return OPERATOR_STAGES.indexOf(s) === -1 ? null : s;
}

function matchesOperatorFilter(stage, filter) {
  if (!stage) return false;
  if (filter === 'op-all') return OPEN_STAGES.indexOf(stage) !== -1;
  return filter === 'op-' + stage;
}

function countOperatorStages(stages) {
  var c = { all: 0, review: 0, qa: 0, ready: 0, delivered: 0 };
  (stages || []).forEach(function (s) {
    if (OPERATOR_STAGES.indexOf(s) === -1) return;
    c[s]++;
    if (OPEN_STAGES.indexOf(s) !== -1) c.all++;
  });
  return c;
}

// Newest bot "Ready for Amruta" comment wins: re-adding op:qa-passed re-runs
// packaging and posts a fresh comment.
function gmailLinkFromComments(comments) {
  var list = comments || [];
  for (var i = list.length - 1; i >= 0; i--) {
    var c = list[i];
    if (!c || !c.user || c.user.login !== READY_COMMENT_AUTHOR) continue;
    var body = String(c.body || '');
    if (body.indexOf(READY_HEADING) === -1) continue;
    var re = /\]\(([^)\s]+)\)/g;
    var m;
    while ((m = re.exec(body))) {
      if (m[1].indexOf(GMAIL_PREFIX) === 0) return m[1];
    }
  }
  return null;
}

function packageFiles(tree, talkId) {
  var prefix = 'talks/' + talkId + '/_for_Amruta/';
  var names = [];
  (tree || []).forEach(function (e) {
    var p = e && e.path;
    if (!p || p.indexOf(prefix) !== 0) return;
    var name = p.slice(prefix.length);
    if (name && name.indexOf('/') === -1) names.push(name);
  });
  return names.sort();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OPERATOR_FILTERS: OPERATOR_FILTERS,
    isOperator: isOperator,
    operatorStageOf: operatorStageOf,
    matchesOperatorFilter: matchesOperatorFilter,
    countOperatorStages: countOperatorStages,
    gmailLinkFromComments: gmailLinkFromComments,
    packageFiles: packageFiles,
  };
}
