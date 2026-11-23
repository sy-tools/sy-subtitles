// Operator mode — pure logic. Single source: loaded by the browser via
// <script src="js/operator.js"> in site/index.html AND required by the Node
// test suite (tests/test_operator.js).
//
// The operator's state lives in GitHub labels on the `Operator: {talk_id}`
// issue; sync-review-status.py derives `operator_stage` from them into
// review-status.json. Nothing here keeps a second copy of that state.

// sync-review-status.py OPERATOR_STAGES: op:pipeline|translator|review|qa|ready|delivered.
var OPERATOR_STAGES = ['pipeline', 'translator', 'review', 'qa', 'ready', 'delivered'];
// The operator chips. new/pipeline are read from the artifacts, not labels.
var OPERATOR_STEPS = ['new', 'pipeline', 'translator', 'review', 'qa', 'ready', 'delivered'];
var OPERATOR_FILTERS = ['op-all'].concat(OPERATOR_STEPS.map(function (s) { return 'op-' + s; }));
// The operator's own work: neither the translator's nor already sent.
var OPEN_STAGES = ['new', 'pipeline', 'review', 'qa', 'ready'];
var HANDED_BACK = ['review', 'qa', 'ready'];

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

// Same rule as tools/roles.py may_spend_llm; the pipeline's own guard is the
// real gate, this only decides whether to offer the button.
function maySpendLlm(roles, viewerId) {
  if (typeof viewerId !== 'number' || !roles || !Array.isArray(roles.operators)) return false;
  return roles.operators.some(function (o) { return !!o && o.id === viewerId && o.llm === true; });
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
  var c = { all: 0 };
  OPERATOR_STEPS.forEach(function (s) { c[s] = 0; });
  (stages || []).forEach(function (s) {
    if (OPERATOR_STEPS.indexOf(s) === -1) return;
    c[s]++;
    if (OPEN_STAGES.indexOf(s) !== -1) c.all++;
  });
  return c;
}

// The pipeline is done when its last artifacts exist: the Ukrainian
// transcript and, for a talk with video, every video's subtitles.
// `stages` is getPipelineStages() (js/pipeline_stages.js).
function pipelineDone(stages) {
  return !!stages.translated && (!!stages.textOnly || !!stages.srt);
}

function anyArtifact(stages) {
  return stages.nWhisper > 0 || !!stages.translated || !!stages.reviewed || stages.nSrt > 0;
}

// Expert chips: who has the talk, in words without the operator in them.
function talkPhase(entry, stages) {
  var stage = operatorStageOf(entry);
  var status = entry && entry.status;
  if (stage === 'delivered') return 'sent';
  if (status === 'in-progress') return 'in-review';
  if (HANDED_BACK.indexOf(stage) !== -1 || status === 'approved') return 'operator';
  if (!pipelineDone(stages)) return 'operator';
  if (entry && entry.issue_number && status === 'pending') return 'needs-review';
  return 'operator';
}

// Operator chips. Talks without an Operator issue get a step the same way, so
// existing talks need no issue to be placed.
function operatorStep(entry, stages) {
  var stage = operatorStageOf(entry);
  var status = entry && entry.status;
  if (HANDED_BACK.indexOf(stage) !== -1 || stage === 'delivered') return stage;
  if (status === 'in-progress') return 'translator';
  if (status === 'approved') return null;
  if (pipelineDone(stages)) return entry && entry.issue_number ? 'translator' : 'pipeline';
  return anyArtifact(stages) ? 'pipeline' : 'new';
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

// "Take to QA": only on a card the translator holds whose Operator issue
// exists — the label needs an issue to go on.
function takeQaOffered(stage, entry) {
  return stage === 'translator' && operatorStageOf(entry) === 'translator' && !!(entry && entry.operator_issue);
}

// "Back to QA": a sent (or packaged) talk needs fixing and delivering again.
// The op:back-to-qa label reopens its issue at op:qa.
function backToQaOffered(stage, entry) {
  return (stage === 'delivered' || stage === 'ready') && operatorStageOf(entry) === stage
    && !!(entry && entry.operator_issue);
}

// A wait on the bot is stored so it outlives the tab: after a reload the card
// would otherwise offer the action again while the bot is still running, and
// a second "QA passed" re-runs the package job. Only waits on the card stages
// (translator, qa, ready, delivered) inside the live poll's window survive; anything
// else is dropped.
var WAIT_STAGES = ['translator', 'qa', 'ready', 'delivered'];

function restoreWaiting(stored, now, maxMs) {
  var out = {};
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return out;
  Object.keys(stored).forEach(function (id) {
    var w = stored[id];
    if (!w || WAIT_STAGES.indexOf(w.stage) === -1) return;
    if (typeof w.since !== 'number' || typeof w.issue !== 'number') return;
    var age = now - w.since;
    if (age < 0 || age > maxMs) return;
    out[id] = { stage: w.stage, since: w.since, issue: w.issue };
  });
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OPERATOR_FILTERS: OPERATOR_FILTERS,
    isOperator: isOperator,
    maySpendLlm: maySpendLlm,
    operatorStageOf: operatorStageOf,
    matchesOperatorFilter: matchesOperatorFilter,
    countOperatorStages: countOperatorStages,
    gmailLinkFromComments: gmailLinkFromComments,
    pipelineDone: pipelineDone,
    talkPhase: talkPhase,
    operatorStep: operatorStep,
    packageFiles: packageFiles,
    restoreWaiting: restoreWaiting,
    takeQaOffered: takeQaOffered,
    backToQaOffered: backToQaOffered,
  };
}
