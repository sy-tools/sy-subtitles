const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  PIPELINE_WORKFLOW,
  pipelineRef,
  dispatchInputsFromDoc,
  initialValues,
  buildPipelineInputs,
  runTalkId,
  latestRunsByTalk,
  runState,
  isRunActive,
  runIdFromDispatch,
} = require('../site/js/pipeline_dispatch');

function pipelineDocAsJsYamlLoadsIt() {
  return {
    name: 'Subtitle Pipeline',
    on: {
      push: { branches: ['main'] },
      workflow_dispatch: {
        inputs: {
          talk_id: { description: 'Talk directory name', required: true, type: 'string' },
          whisper: { description: 'Run whisper step', type: 'boolean', default: true },
          translate: { description: 'Run translate step', type: 'boolean', default: true },
          dry_run: { description: 'Replay snapshots', type: 'boolean', default: false },
          model: {
            description: 'Claude model',
            type: 'choice',
            options: ['claude-opus-5-5', 'claude-fable-5-1'],
            default: 'claude-opus-5-5',
          },
        },
      },
      workflow_call: { inputs: { talk_id: { type: 'string', required: true } } },
    },
  };
}

describe('pipeline workflow identity', () => {
  it('targets subtitle-pipeline.yml', () => {
    assert.strictEqual(PIPELINE_WORKFLOW, 'subtitle-pipeline.yml');
  });

  it('dispatches on main unless a local stand points elsewhere', () => {
    assert.strictEqual(pipelineRef({}), 'main');
    assert.strictEqual(pipelineRef({ __SY_PIPELINE_REF: 'feat/x' }), 'feat/x');
    assert.strictEqual(pipelineRef({ __SY_PIPELINE_REF: '' }), 'main');
  });
});

describe('dispatchInputsFromDoc', () => {
  it('lists the dispatch inputs in file order with their declared shape', () => {
    const inputs = dispatchInputsFromDoc(pipelineDocAsJsYamlLoadsIt());
    assert.deepStrictEqual(inputs.map((i) => i.name),
      ['talk_id', 'whisper', 'translate', 'dry_run', 'model']);
    assert.deepStrictEqual(inputs[4], {
      name: 'model', type: 'choice', description: 'Claude model',
      required: false, default: 'claude-opus-5-5',
      options: ['claude-opus-5-5', 'claude-fable-5-1'],
    });
    assert.strictEqual(inputs[0].required, true);
    assert.strictEqual(inputs[1].default, true);
  });

  it('reads workflow_call inputs never — only what the form can dispatch', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    doc.on.workflow_dispatch.inputs = { talk_id: { type: 'string', required: true } };
    assert.deepStrictEqual(dispatchInputsFromDoc(doc).map((i) => i.name), ['talk_id']);
  });

  it('accepts a YAML 1.1 load, where `on` became the key true', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    doc[true] = doc.on;
    delete doc.on;
    assert.strictEqual(dispatchInputsFromDoc(doc).length, 5);
  });

  it('defaults an untyped input to string, as GitHub does', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    doc.on.workflow_dispatch.inputs = { talk_id: { required: true } };
    assert.strictEqual(dispatchInputsFromDoc(doc)[0].type, 'string');
  });

  it('refuses a file without workflow_dispatch inputs rather than draw half a form', () => {
    assert.throws(() => dispatchInputsFromDoc({ on: { push: {} } }), /workflow_dispatch/);
    assert.throws(() => dispatchInputsFromDoc(null), /workflow_dispatch/);
  });

  it('refuses an input type the form cannot draw', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    doc.on.workflow_dispatch.inputs.env = { type: 'environment' };
    assert.throws(() => dispatchInputsFromDoc(doc), /environment/);
  });

  it('refuses a dispatch form that cannot name the talk', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    delete doc.on.workflow_dispatch.inputs.talk_id;
    assert.throws(() => dispatchInputsFromDoc(doc), /talk_id/);
  });
});

describe('initialValues', () => {
  const inputs = dispatchInputsFromDoc(pipelineDocAsJsYamlLoadsIt());

  it('starts from the workflow defaults with the card talk filled in', () => {
    assert.deepStrictEqual(initialValues(inputs, '2001-01-01_X', {}), {
      talk_id: '2001-01-01_X', whisper: true, translate: true, dry_run: false,
      model: 'claude-opus-5-5',
    });
  });

  it('skips whisper when every video already has it', () => {
    assert.strictEqual(initialValues(inputs, '2001-01-01_X', { whisper: true }).whisper, false);
  });

  it('falls back to the first option for a choice without a default', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    delete doc.on.workflow_dispatch.inputs.model.default;
    const vals = initialValues(dispatchInputsFromDoc(doc), '2001-01-01_X', {});
    assert.strictEqual(vals.model, 'claude-opus-5-5');
  });
});

describe('buildPipelineInputs', () => {
  const inputs = dispatchInputsFromDoc(pipelineDocAsJsYamlLoadsIt());
  const values = () => initialValues(inputs, '2001-01-01_X', {});

  it('sends every input as a string, booleans spelled the way Actions reads them', () => {
    assert.deepStrictEqual(buildPipelineInputs(inputs, values()), {
      talk_id: '2001-01-01_X', whisper: 'true', translate: 'true', dry_run: 'false',
      model: 'claude-opus-5-5',
    });
  });

  it('rejects a choice the workflow does not offer', () => {
    const v = values();
    v.model = 'gpt';
    assert.throws(() => buildPipelineInputs(inputs, v), /model/);
  });

  it('rejects a talk id the workflow would refuse', () => {
    const v = values();
    v.talk_id = '../etc';
    assert.throws(() => buildPipelineInputs(inputs, v), /talk_id/);
  });

  it('rejects an empty required input', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    doc.on.workflow_dispatch.inputs.note = { type: 'string', required: true };
    const ins = dispatchInputsFromDoc(doc);
    const v = initialValues(ins, '2001-01-01_X', {});
    assert.throws(() => buildPipelineInputs(ins, v), /note/);
  });

  it('leaves an empty optional string out, so the workflow default applies', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    doc.on.workflow_dispatch.inputs.note = { type: 'string' };
    const ins = dispatchInputsFromDoc(doc);
    const out = buildPipelineInputs(ins, initialValues(ins, '2001-01-01_X', {}));
    assert.ok(!('note' in out));
  });
});

describe('runs', () => {
  const run = (id, title, status, conclusion) => ({
    id, display_title: title, status, conclusion: conclusion || null,
    html_url: 'https://github.com/r/actions/runs/' + id,
  });

  it('reads the talk from the run name', () => {
    assert.strictEqual(runTalkId('2001-01-01_X | whisper translate'), '2001-01-01_X');
    assert.strictEqual(runTalkId('2001-01-01_X |  build'), '2001-01-01_X');
    assert.strictEqual(runTalkId('Subtitle Pipeline'), null);
    assert.strictEqual(runTalkId('auto | whisper'), null);
    assert.strictEqual(runTalkId(null), null);
  });

  it('keeps the newest run per talk (the API lists newest first)', () => {
    const runs = [
      run(3, '2001-01-01_X | build', 'in_progress'),
      run(2, '2002-02-02_Y | whisper', 'completed', 'success'),
      run(1, '2001-01-01_X | whisper', 'completed', 'failure'),
    ];
    const m = latestRunsByTalk(runs);
    assert.strictEqual(m['2001-01-01_X'].id, 3);
    assert.strictEqual(m['2002-02-02_Y'].id, 2);
    assert.strictEqual(Object.keys(m).length, 2);
  });

  it('names the state a person cares about', () => {
    assert.strictEqual(runState(run(1, 'a', 'queued')), 'queued');
    assert.strictEqual(runState(run(1, 'a', 'waiting')), 'queued');
    assert.strictEqual(runState(run(1, 'a', 'pending')), 'queued');
    assert.strictEqual(runState(run(1, 'a', 'in_progress')), 'running');
    assert.strictEqual(runState(run(1, 'a', 'completed', 'success')), 'success');
    assert.strictEqual(runState(run(1, 'a', 'completed', 'cancelled')), 'cancelled');
    assert.strictEqual(runState(run(1, 'a', 'completed', 'skipped')), 'cancelled');
    assert.strictEqual(runState(run(1, 'a', 'completed', 'failure')), 'failure');
    assert.strictEqual(runState(run(1, 'a', 'completed', 'timed_out')), 'failure');
  });

  it('counts queued and running as active, nothing else', () => {
    assert.strictEqual(isRunActive(run(1, 'a', 'queued')), true);
    assert.strictEqual(isRunActive(run(1, 'a', 'in_progress')), true);
    assert.strictEqual(isRunActive(run(1, 'a', 'completed', 'success')), false);
    assert.strictEqual(isRunActive(null), false);
  });

  it('takes the run id from the dispatch response, 0 when it has none', () => {
    assert.strictEqual(runIdFromDispatch({ workflow_run_id: 42, html_url: 'u' }), 42);
    assert.strictEqual(runIdFromDispatch({}), 0);
    assert.strictEqual(runIdFromDispatch(undefined), 0);
  });
});

const { pipelineFormHtml, readPipelineForm } = require('../site/js/pipeline_dispatch');

describe('pipeline form', () => {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const inputs = dispatchInputsFromDoc(pipelineDocAsJsYamlLoadsIt());
  const values = { ...initialValues(inputs, '2001-01-01_X', { whisper: true }) };

  it('draws one control per input except the talk, which the card already fixes', () => {
    const html = pipelineFormHtml(inputs, values, esc);
    assert.deepStrictEqual([...html.matchAll(/data-pipe-input="([a-z_]+)"/g)].map((m) => m[1]),
      ['whisper', 'translate', 'dry_run', 'model']);
  });

  it('draws booleans as checkboxes holding their current value', () => {
    const html = pipelineFormHtml(inputs, values, esc);
    assert.match(html, /<input type="checkbox" data-pipe-input="translate" checked>/);
    assert.match(html, /<input type="checkbox" data-pipe-input="whisper">/);
  });

  it('draws a choice as a select with the current option selected', () => {
    const html = pipelineFormHtml(inputs, { ...values, model: 'claude-fable-5-1' }, esc);
    assert.match(html, /<option value="claude-fable-5-1" selected>/);
    assert.doesNotMatch(html, /<option value="claude-opus-5-5" selected>/);
  });

  it('escapes the workflow text it shows', () => {
    const doc = pipelineDocAsJsYamlLoadsIt();
    doc.on.workflow_dispatch.inputs.note = { type: 'string', description: '<b>x</b>', default: '"q"' };
    const ins = dispatchInputsFromDoc(doc);
    const html = pipelineFormHtml(ins, initialValues(ins, '2001-01-01_X', {}), esc);
    assert.ok(!html.includes('<b>x</b>'));
    assert.match(html, /value="&quot;q&quot;"/);
  });

  it('reads the controls back into values, keeping the card talk', () => {
    const controls = {
      whisper: { checked: true }, translate: { checked: false }, dry_run: { checked: false },
      model: { value: 'claude-fable-5-1' },
    };
    assert.deepStrictEqual(readPipelineForm(inputs, '2001-01-01_X', (n) => controls[n]), {
      talk_id: '2001-01-01_X', whisper: true, translate: false, dry_run: false,
      model: 'claude-fable-5-1',
    });
  });
});

const { runChipHtml } = require('../site/js/pipeline_dispatch');

describe('runChipHtml', () => {
  const esc = (s) => String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const label = (state) => 'L:' + state;
  const safe = (u) => (/^https:\/\//.test(u) ? u : '');

  it('links the run and names its state', () => {
    const html = runChipHtml({ id: 1, status: 'in_progress', html_url: 'https://github.com/r/1' },
      esc, label, safe);
    assert.strictEqual(html,
      '<a class="pipe-run pipe-run--running" target="_blank" rel="noopener" href="https://github.com/r/1">L:running</a>');
  });

  it('draws nothing for a talk with no run', () => {
    assert.strictEqual(runChipHtml(null, esc, label, safe), '');
  });

  it('still names the state when the run link is unusable', () => {
    assert.strictEqual(runChipHtml({ status: 'completed', conclusion: 'failure', html_url: 'javascript:x' },
      esc, label, safe), '<span class="pipe-run pipe-run--failure">L:failure</span>');
  });
});
