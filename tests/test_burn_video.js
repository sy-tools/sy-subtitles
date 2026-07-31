const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  BURN_WORKFLOW,
  makeRequestId,
  buildBurnInputs,
  matchRun,
  burnStateKey,
} = require('../site/js/burn_video');

describe('makeRequestId', () => {
  it('is unique per call even within the same millisecond', () => {
    let n = 0;
    const rand = () => [0.1, 0.9][n++];
    const a = makeRequestId(1700000000000, rand);
    const b = makeRequestId(1700000000000, rand);
    assert.notStrictEqual(a, b);
  });

  it('contains only characters safe for a run name and a URL query', () => {
    const id = makeRequestId(1700000000000, () => 0.5);
    assert.match(id, /^[A-Za-z0-9-]+$/);
  });
});

describe('buildBurnInputs', () => {
  const ratios = { font_ratio: 0.0711, padtop_ratio: 0.0741, padbot_ratio: 0.0333 };

  it('sends every input the workflow declares', () => {
    const inputs = buildBurnInputs('talk', 'slug', ratios, 'req-1');
    assert.deepStrictEqual(Object.keys(inputs).sort(), [
      'font_ratio', 'padbot_ratio', 'padtop_ratio', 'request_id',
      'talk_id', 'video_slug',
    ]);
  });

  it('stringifies the ratios — workflow_dispatch inputs are strings', () => {
    const inputs = buildBurnInputs('talk', 'slug', ratios, 'req-1');
    assert.strictEqual(typeof inputs.font_ratio, 'string');
    assert.strictEqual(inputs.font_ratio, '0.0711');
  });

  it('rejects a missing ratio instead of sending undefined', () => {
    assert.throws(() => buildBurnInputs('talk', 'slug', { font_ratio: 0.05 }, 'r'));
  });
});

describe('matchRun', () => {
  const runs = [
    { id: 1, name: 'Burn a/b · req-OTHER', status: 'completed' },
    { id: 2, display_title: 'Burn a/b · req-MINE', status: 'in_progress' },
  ];

  it('finds the run by request id in either name field', () => {
    assert.strictEqual(matchRun(runs, 'req-MINE').id, 2);
    assert.strictEqual(matchRun(runs, 'req-OTHER').id, 1);
  });

  it('returns null when the run has not been created yet', () => {
    // dispatch -> run creation is not instant; the caller retries.
    assert.strictEqual(matchRun([], 'req-MINE'), null);
    assert.strictEqual(matchRun(runs, 'req-ABSENT'), null);
  });

  it('does not match on a partial id prefix of another run', () => {
    const rows = [{ id: 9, name: 'Burn a/b · req-MINE-EXTRA' }];
    assert.strictEqual(matchRun(rows, 'req-MINE'), null);
  });

  it('tolerates malformed rows', () => {
    assert.strictEqual(matchRun([null, {}, { name: null }], 'req'), null);
  });
});

describe('burnStateKey', () => {
  it('is scoped per talk and video', () => {
    assert.notStrictEqual(burnStateKey('t', 'a'), burnStateKey('t', 'b'));
    assert.match(burnStateKey('t', 'a'), /^sy\.burn\./);
  });
});

describe('BURN_WORKFLOW', () => {
  it('points at the workflow file', () => {
    assert.strictEqual(BURN_WORKFLOW, 'burn-subtitles.yml');
  });
});
