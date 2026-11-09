// Starting subtitle-pipeline.yml from a talk card, and reading its runs back.
//
// The form is drawn from the workflow file itself (its workflow_dispatch
// inputs), never from a copy here: an input added to the YAML appears in the
// form with no SPA change, and a branch under test shows that branch's inputs.

var PIPELINE_WORKFLOW = 'subtitle-pipeline.yml';
var PIPELINE_DEFAULT_REF = 'main';

// Same runtime hook as __SY_BURN_REF: a local stand points the dispatch at the
// branch whose workflow is under test. Nothing in the shipped page sets it.
function pipelineRef(win) {
  var w = win || (typeof window !== 'undefined' ? window : null);
  var ref = w && w.__SY_PIPELINE_REF;
  return (typeof ref === 'string' && ref) ? ref : PIPELINE_DEFAULT_REF;
}

var PIPELINE_INPUT_TYPES = ['string', 'boolean', 'choice'];

// Mirrors TALK_ID_RE in tools/workflow_validation.py, which the workflow
// enforces; tests/test_pipeline_dispatch_contract.py pins the two.
var PIPELINE_TALK_ID_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[A-Za-z0-9_.-]{1,80}$/;

function dispatchInputsFromDoc(doc) {
  // A YAML 1.1 loader turns the bare key `on` into true; js-yaml (1.2) does not.
  var on = doc && (doc.on || doc[true]);
  var raw = on && on.workflow_dispatch && on.workflow_dispatch.inputs;
  if (!raw || typeof raw !== 'object') {
    throw new Error('workflow has no workflow_dispatch inputs');
  }
  var inputs = Object.keys(raw).map(function(name) {
    var spec = raw[name] || {};
    var type = spec.type || 'string';
    if (PIPELINE_INPUT_TYPES.indexOf(type) < 0) {
      throw new Error('input ' + name + ' has unsupported type ' + type);
    }
    var input = {
      name: name, type: type, description: String(spec.description || ''),
      required: spec.required === true, default: spec.default,
    };
    if (type === 'choice') input.options = (spec.options || []).map(String);
    return input;
  });
  if (!inputs.some(function(i) { return i.name === 'talk_id'; })) {
    throw new Error('workflow_dispatch has no talk_id input');
  }
  return inputs;
}

function defaultValue(input) {
  if (input.type === 'boolean') return input.default === true || input.default === 'true';
  if (input.type === 'choice') {
    return input.default !== undefined ? String(input.default) : (input.options[0] || '');
  }
  return input.default !== undefined ? String(input.default) : '';
}

function initialValues(inputs, talkId, stages) {
  var values = {};
  inputs.forEach(function(input) { values[input.name] = defaultValue(input); });
  values.talk_id = talkId;
  // Re-running whisper on a talk that has it only spends runner minutes.
  if (stages && stages.whisper && 'whisper' in values) values.whisper = false;
  return values;
}

// Every value travels as a string: the dispatch API takes inputs as strings and
// the workflow compares booleans against 'true'/'false'.
function buildPipelineInputs(inputs, values) {
  var out = {};
  inputs.forEach(function(input) {
    var v = values[input.name];
    if (input.type === 'boolean') { out[input.name] = v ? 'true' : 'false'; return; }
    var s = v == null ? '' : String(v).trim();
    if (input.type === 'choice' && input.options.indexOf(s) < 0) {
      throw new Error(input.name + ': ' + s + ' is not one of the workflow options');
    }
    if (!s) {
      if (input.required) throw new Error(input.name + ' is required');
      return;
    }
    out[input.name] = s;
  });
  if (!PIPELINE_TALK_ID_RE.test(out.talk_id || '')) {
    throw new Error('talk_id: ' + out.talk_id + ' is not a talk id');
  }
  return out;
}

// The talk is fixed by the card the form opened from, so it gets no control.
function pipelineFormHtml(inputs, values, esc) {
  return '<div class="pipe-form">' + inputs.filter(function(input) {
    return input.name !== 'talk_id';
  }).map(function(input) {
    var name = esc(input.name);
    var attr = 'data-pipe-input="' + name + '"';
    var help = input.description
      ? '<span class="pipe-form__help">' + esc(input.description) + '</span>' : '';
    if (input.type === 'boolean') {
      return '<label class="pipe-form__row pipe-form__row--check">'
        + '<input type="checkbox" ' + attr + (values[input.name] ? ' checked' : '') + '>'
        + '<span class="pipe-form__name">' + name + '</span>' + help + '</label>';
    }
    var control = input.type === 'choice'
      ? '<select class="input compact" ' + attr + '>' + input.options.map(function(opt) {
          return '<option value="' + esc(opt) + '"' + (opt === values[input.name] ? ' selected' : '')
            + '>' + esc(opt) + '</option>';
        }).join('') + '</select>'
      : '<input class="input compact" type="text" ' + attr + ' value="' + esc(values[input.name] || '') + '">';
    return '<label class="pipe-form__row">'
      + '<span class="pipe-form__name">' + name + '</span>' + control + help + '</label>';
  }).join('') + '</div>';
}

function readPipelineForm(inputs, talkId, controlFor) {
  var values = { talk_id: talkId };
  inputs.forEach(function(input) {
    if (input.name === 'talk_id') return;
    var el = controlFor(input.name);
    if (!el) return;
    values[input.name] = input.type === 'boolean' ? !!el.checked : el.value;
  });
  return values;
}

// The run name is "<talk_id> | <steps>" (run-name in subtitle-pipeline.yml).
function runTalkId(title) {
  var head = String(title || '').split(' | ')[0];
  return PIPELINE_TALK_ID_RE.test(head) ? head : null;
}

function latestRunsByTalk(runs) {
  var byTalk = {};
  (runs || []).forEach(function(run) {
    var id = runTalkId(run && run.display_title);
    if (id && !byTalk[id]) byTalk[id] = run;
  });
  return byTalk;
}

function runState(run) {
  if (!run) return null;
  if (run.status !== 'completed') return run.status === 'in_progress' ? 'running' : 'queued';
  if (run.conclusion === 'success') return 'success';
  if (run.conclusion === 'cancelled' || run.conclusion === 'skipped') return 'cancelled';
  return 'failure';
}

function isRunActive(run) {
  var s = runState(run);
  return s === 'queued' || s === 'running';
}

// safeHref returns the URL already escaped for an attribute, or '' when unsafe.
function runChipHtml(run, esc, labelFor, safeHref) {
  var state = runState(run);
  if (!state) return '';
  var cls = 'pipe-run pipe-run--' + state;
  var href = safeHref(run.html_url || '');
  var text = esc(labelFor(state));
  return href
    ? '<a class="' + cls + '" target="_blank" rel="noopener" href="' + href + '">' + text + '</a>'
    : '<span class="' + cls + '">' + text + '</span>';
}

// GitHub lists a dispatched run a few seconds after accepting it, so a re-list
// right after a dispatch can still show the talk's previous run. The dispatched
// run is kept until the list has it, or until it plainly never will.
var DISPATCH_VISIBLE_WITHIN_MS = 2 * 60 * 1000;
// Runner clocks and ours differ; a run created a little "before" the click is ours.
var DISPATCH_CLOCK_SKEW_MS = 60 * 1000;

function withDispatchedRuns(listed, dispatched, nowMs) {
  var runs = {};
  var still = {};
  Object.keys(listed).forEach(function(id) { runs[id] = listed[id]; });
  Object.keys(dispatched).forEach(function(talkId) {
    var d = dispatched[talkId];
    var seen = listed[talkId];
    var arrived = seen && (d.run.id
      ? seen.id >= d.run.id
      : Date.parse(seen.created_at) >= d.since - DISPATCH_CLOCK_SKEW_MS);
    if (arrived || nowMs - d.since > DISPATCH_VISIBLE_WITHIN_MS) return;
    runs[talkId] = d.run;
    still[talkId] = d;
  });
  return { runs: runs, dispatched: still };
}

function runIdFromDispatch(body) {
  return (body && body.workflow_run_id) || 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PIPELINE_WORKFLOW: PIPELINE_WORKFLOW,
    PIPELINE_TALK_ID_RE: PIPELINE_TALK_ID_RE,
    pipelineRef: pipelineRef,
    dispatchInputsFromDoc: dispatchInputsFromDoc,
    initialValues: initialValues,
    buildPipelineInputs: buildPipelineInputs,
    pipelineFormHtml: pipelineFormHtml,
    readPipelineForm: readPipelineForm,
    runTalkId: runTalkId,
    latestRunsByTalk: latestRunsByTalk,
    runState: runState,
    isRunActive: isRunActive,
    runChipHtml: runChipHtml,
    runIdFromDispatch: runIdFromDispatch,
    withDispatchedRuns: withDispatchedRuns,
    DISPATCH_VISIBLE_WITHIN_MS: DISPATCH_VISIBLE_WITHIN_MS,
  };
}
