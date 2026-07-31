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

const {
  FONT_RATIO_MAX,
  FONT_RATIO_MIN,
  FS_FONT_MAX_PX,
  FS_PADBOT_PX,
  FS_PADTOP_PX,
  displayedVideoHeight,
  fullscreenFontPx,
  measureBurnRatios,
} = require('../site/js/burn_video');

describe('fullscreenFontPx', () => {
  it('is 4% of viewport width in the middle of the range', () => {
    assert.strictEqual(fullscreenFontPx(1200, 900, 1), 48);
  });

  it('pins to the 80px ceiling on a wide monitor', () => {
    assert.strictEqual(fullscreenFontPx(2560, 1440, 1), 80);
  });

  it('respects the 28px floor on a narrow window', () => {
    assert.strictEqual(fullscreenFontPx(500, 800, 1), 28);
  });

  it('respects the 20px floor when even the inner clamp is squeezed by height', () => {
    // Inner clamp gives base 28, but 22% of a very short 80px viewport is
    // 17.6, so the outer floor of 20 is what actually wins.
    assert.strictEqual(fullscreenFontPx(500, 80, 1), 20);
  });

  it('multiplies by the user subtitle scale after the inner clamp', () => {
    // Inner clamp pins at 80, then scale 2 doubles it.
    assert.strictEqual(fullscreenFontPx(2560, 1440, 2), 160);
  });

  it('is capped by 22vh so tall text cannot overflow the screen', () => {
    // 22% of 300px viewport height = 66px, below the scaled 160.
    assert.strictEqual(fullscreenFontPx(2560, 300, 2), 66);
  });

  it('treats a missing scale as 1', () => {
    assert.strictEqual(fullscreenFontPx(1200, 900, undefined), 48);
  });
});

describe('displayedVideoHeight', () => {
  it('fills the height when the video is narrower than the window', () => {
    // 4:3 video in a 16:9 window is letterboxed on the sides: height fills.
    assert.strictEqual(displayedVideoHeight(1920, 1080, 640, 480), 1080);
  });

  it('is limited by width when the video is wider than the window', () => {
    // 16:9 video in a 4:3 window: width binds, height is 1000 * 9/16.
    assert.strictEqual(displayedVideoHeight(1000, 1000, 1920, 1080), 562.5);
  });
});

describe('measureBurnRatios', () => {
  const geometry = {
    viewportWidth: 1920, viewportHeight: 1080,
    videoWidth: 640, videoHeight: 480, subsScale: 1,
  };

  it('reproduces the approved fullscreen baseline', () => {
    const r = measureBurnRatios(geometry);
    // 4vw of 1920 = 76.8; displayed height 1080 -> 0.0711.
    assert.ok(Math.abs(r.font_ratio - 76.8 / 1080) < 1e-9);
    assert.ok(Math.abs(r.padtop_ratio - 80 / 1080) < 1e-9);   // approved 0.0741
    assert.ok(Math.abs(r.padbot_ratio - 36 / 1080) < 1e-9);   // approved 0.0333
  });

  it('holds while 4vw stays inside the 28-80px band', () => {
    const wide = measureBurnRatios(geometry);
    const narrow = measureBurnRatios(Object.assign({}, geometry, {
      viewportWidth: 1280, viewportHeight: 720,
    }));
    // Neither case is clamped (76.8 and 51.2 are both inside 28-80); only in
    // the linear region does 4vw/height stay the same fraction regardless of
    // monitor size. Once 4vw pins to the 80px ceiling this equality breaks —
    // see the 2560-wide case in the fullscreenFontPx suite above.
    assert.ok(Math.abs(wide.font_ratio - narrow.font_ratio) < 1e-9);
  });

  it('grows the font ratio when the user enlarged the subtitles', () => {
    const bigger = measureBurnRatios(Object.assign({}, geometry, { subsScale: 1.5 }));
    assert.ok(bigger.font_ratio > measureBurnRatios(geometry).font_ratio);
  });

  it('clamps a ratio the workflow would refuse', () => {
    // The resize handle allows --preview-subs-scale up to 4, which measures
    // 0.22 on a 1920x1080 screen — outside the [0.02, 0.12] band the workflow's
    // "Validate inputs" step enforces, so the run would die before it started.
    const huge = measureBurnRatios(Object.assign({}, geometry, { subsScale: 4 }));
    assert.strictEqual(huge.font_ratio, FONT_RATIO_MAX);
    // Just past the point where the raw measurement leaves the band (scale 1.7
    // measured 0.1209 on this geometry) — the boundary a reviewer really hits.
    const past = measureBurnRatios(Object.assign({}, geometry, { subsScale: 1.7 }));
    assert.strictEqual(past.font_ratio, FONT_RATIO_MAX);
  });

  it('leaves a legal ratio exactly as measured', () => {
    // The clamp must be a guard, not a rounding: scale 1.5 measures 0.1067,
    // which is inside the band and must travel untouched.
    const legal = measureBurnRatios(Object.assign({}, geometry, { subsScale: 1.5 }));
    assert.ok(Math.abs(legal.font_ratio - (76.8 * 1.5) / 1080) < 1e-12);
    assert.ok(legal.font_ratio < FONT_RATIO_MAX);
  });

  it('clamps up to the floor when the measurement is absurdly small', () => {
    // A 4K screen with the subtitles shrunk to 0.5x measures 40px over a 2250px
    // displayed height = 0.0178, below the floor the workflow accepts. The
    // burner clamps the same way, so the render is unaffected either way.
    const tiny = measureBurnRatios({
      viewportWidth: 4000, viewportHeight: 2400,
      videoWidth: 16, videoHeight: 9, subsScale: 0.5,
    });
    assert.strictEqual(tiny.font_ratio, FONT_RATIO_MIN);
  });

  it('returns numbers, never NaN, for degenerate geometry', () => {
    const r = measureBurnRatios({
      viewportWidth: 0, viewportHeight: 0,
      videoWidth: 0, videoHeight: 0, subsScale: 0,
    });
    Object.keys(r).forEach((k) => {
      assert.ok(isFinite(r[k]) && r[k] > 0, k + ' must be a positive number');
    });
  });
});

const {
  BURN_STEP_WEIGHTS,
  BURN_RENDER_BLOCK,
  computeProgress,
  renderEtaSeconds,
  burnPhases,
  burnSegments,
  burnPhaseKey,
  burnPhaseNumber,
} = require('../site/js/burn_video');

// A third arg lets tests express a job that completed WITHOUT success
// (failure/cancelled outside any named step) — see computeProgress's
// job.conclusion check.
function job(steps, status, conclusion) {
  return {
    status: status || 'in_progress',
    conclusion: conclusion || (status === 'completed' ? 'success' : null),
    steps: steps,
  };
}
const T0 = 1700000000000;
const HOUR_MS = 3600 * 1000;
const done = (name) => ({ name, status: 'completed', conclusion: 'success' });

describe('BURN_STEP_WEIGHTS', () => {
  it('the step weights sum to exactly one', () => {
    const sum = BURN_STEP_WEIGHTS.reduce((a, s) => a + s.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  });

  it('names match the workflow step names', () => {
    // tests/test_burn_workflow_steps.py guards this against the YAML itself;
    // spelled out here too so a rename shows up in the SPA suite as well.
    assert.deepStrictEqual(BURN_STEP_WEIGHTS.map((s) => s.name), [
      'Install dependencies', 'Download video', 'Start render',
      'Render 5%', 'Render 10%', 'Render 15%', 'Render 20%', 'Render 25%',
      'Render 30%', 'Render 35%', 'Render 40%', 'Render 45%', 'Render 50%',
      'Render 55%', 'Render 60%', 'Render 65%', 'Render 70%', 'Render 75%',
      'Render 80%', 'Render 85%', 'Render 90%', 'Render 95%',
      'Finish render', 'Upload result',
    ]);
  });
});

describe('BURN_RENDER_BLOCK', () => {
  it('agrees with the weight table it summarises', () => {
    // Exported so Task 15 can draw the render segment without re-deriving its
    // bounds — and re-derived here so the two can never disagree.
    const names = BURN_STEP_WEIGHTS.map((s) => s.name);
    const first = names.indexOf(BURN_RENDER_BLOCK.firstStep);
    const last = names.indexOf(BURN_RENDER_BLOCK.lastStep);
    assert.ok(first > -1 && last > first, 'the block must name real steps in order');
    const sum = (from, to) => BURN_STEP_WEIGHTS.slice(from, to)
      .reduce((a, s) => a + s.weight, 0);
    assert.ok(Math.abs(sum(first, last + 1) - BURN_RENDER_BLOCK.weight) < 1e-9);
    assert.ok(Math.abs(sum(0, first) - BURN_RENDER_BLOCK.offset) < 1e-9);
  });

  it('reserves the same 0.70 of the bar the render always had', () => {
    assert.ok(Math.abs(BURN_RENDER_BLOCK.weight - 0.70) < 1e-9);
  });
});

describe('renderEtaSeconds', () => {
  it('extrapolates from the measured rate', () => {
    // A quarter of the render block took 10 minutes -> 30 minutes remain.
    assert.ok(Math.abs(renderEtaSeconds(0.25, 600) - 1800) < 1e-6);
  });

  it('has nothing to say before the first gate', () => {
    assert.equal(renderEtaSeconds(0, 600), null);
    assert.equal(renderEtaSeconds(null, 600), null);
  });

  it('has nothing to say once the block is complete', () => {
    // f >= 1 would extrapolate zero or negative time remaining.
    assert.equal(renderEtaSeconds(1, 600), null);
    assert.equal(renderEtaSeconds(1.5, 600), null);
  });
});

describe('computeProgress', () => {
  it('is zero before anything starts', () => {
    const p = computeProgress(job([]), T0);
    assert.strictEqual(p.fraction, 0);
    assert.strictEqual(p.done, false);
  });

  it('credits completed steps by their weight', () => {
    const p = computeProgress(job([
      done('Install dependencies'), done('Download video'),
    ]), T0);
    assert.ok(Math.abs(p.fraction - 0.20) < 1e-9);
  });

  it('a completed gate credits its own weight and nothing else', () => {
    const j = {steps: [
      {name: 'Install dependencies', status: 'completed'},
      {name: 'Download video', status: 'completed'},
      {name: 'Start render', status: 'completed'},
      {name: 'Render 10%', status: 'completed'},
      {name: 'Render 20%', status: 'in_progress'}
    ]};
    const p = computeProgress(j, 0);
    assert.ok(Math.abs(p.fraction - (0.05 + 0.15 + 0.05 + 0.0325)) < 1e-9);
    assert.equal(p.estimated, undefined);   // the fraction is a fact now
  });

  it('the render share is the position inside the render block', () => {
    // Start render + one gate done = 0.05 + 0.0325 of the block's 0.70
    const j = {steps: [
      {name: 'Install dependencies', status: 'completed'},
      {name: 'Download video', status: 'completed'},
      {name: 'Start render', status: 'completed', started_at: '2026-07-31T10:00:00Z'},
      {name: 'Render 10%', status: 'completed'},
      {name: 'Render 20%', status: 'in_progress'}
    ]};
    const p = computeProgress(j, Date.parse('2026-07-31T10:10:00Z'));
    assert.ok(Math.abs(p.renderFraction - (0.05 + 0.0325) / 0.70) < 1e-9);
    assert.equal(p.renderStartedMs, Date.parse('2026-07-31T10:00:00Z'));
  });

  it('has no render share before the render block begins', () => {
    const p = computeProgress(job([done('Install dependencies')]), T0);
    assert.strictEqual(p.renderFraction, null);
    assert.strictEqual(p.renderStartedMs, null);
  });

  it('reports the gate it is waiting on as the label', () => {
    const p = computeProgress(job([
      done('Install dependencies'), done('Download video'), done('Start render'),
      { name: 'Render 10%', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.label, 'Render 10%');
  });

  it('credits every step but still takes done only from the job', () => {
    // Every named step reports completed while job.status is still
    // in_progress — hit on every real run, because actions/cache and
    // actions/setup-python each append a "Post ..." step that runs AFTER
    // "Upload result" but BEFORE the job flips to completed. The bar may sit
    // at 100% there (it is true: the steps ARE done), but `done` — which is
    // what reveals the download button — must come from the job alone.
    const p = computeProgress(job(BURN_STEP_WEIGHTS.map((s) => done(s.name))), T0);
    assert.strictEqual(p.done, false);
    assert.ok(Math.abs(p.fraction - 1) < 1e-9, 'got ' + p.fraction);
  });

  it('reports done only when the job succeeded', () => {
    const p = computeProgress(job([done('Upload result')], 'completed'), T0);
    assert.strictEqual(p.done, true);
    assert.strictEqual(p.fraction, 1);
  });

  it('surfaces which step failed', () => {
    const p = computeProgress(job([
      { name: 'Download video', status: 'completed', conclusion: 'failure' },
    ], 'completed'), T0);
    assert.strictEqual(p.failed, true);
    assert.strictEqual(p.failedStep, 'Download video');
    assert.strictEqual(p.done, false);
  });

  it('surfaces a failed gate by its own name', () => {
    // A stalled or crashed render fails whichever gate was waiting — that name
    // is the most specific thing the user can be told about where it died.
    const p = computeProgress(job([
      done('Install dependencies'), done('Download video'), done('Start render'),
      { name: 'Render 40%', status: 'completed', conclusion: 'failure' },
    ], 'completed'), T0);
    assert.strictEqual(p.failedStep, 'Render 40%');
  });

  it('surfaces a failure in a weightless step it can still name', () => {
    // 'Validate inputs' carries no weight, so the weighted loop never sees it.
    // Without this the one step whose job is to report bad input would come back
    // as "failed, somewhere" and the panel could say nothing about where.
    const p = computeProgress(job([
      done('Install dependencies'),
      { name: 'Validate inputs', status: 'completed', conclusion: 'failure' },
    ], 'completed', 'failure'), T0);
    assert.strictEqual(p.failed, true);
    assert.strictEqual(p.failedStep, 'Validate inputs');
    assert.strictEqual(p.done, false);
    // It still earns no weight of its own: the bar stops at Install dependencies.
    assert.ok(Math.abs(p.fraction - 0.05) < 1e-9, 'got ' + p.fraction);
  });

  it('does not invent a weightless failure on a healthy run', () => {
    const p = computeProgress(job([
      done('Install dependencies'), done('Validate inputs'),
      { name: 'Download video', status: 'in_progress' },
    ]), T0);
    assert.strictEqual(p.failed, false);
    assert.strictEqual(p.failedStep, '');
  });

  it('tolerates a null job while the run is still being created', () => {
    const p = computeProgress(null, T0);
    assert.strictEqual(p.fraction, 0);
    assert.strictEqual(p.failed, false);
  });

  it('ignores unknown step names instead of throwing', () => {
    const p = computeProgress(job([done('Set up job')]), T0);
    assert.strictEqual(p.fraction, 0);
  });

  it('startedMs is the earliest weighted step start', () => {
    const j = {steps: [
      {name: 'Set up job', status: 'completed', started_at: '2026-07-31T09:59:00Z'},
      {name: 'Install dependencies', status: 'completed', started_at: '2026-07-31T10:00:00Z'},
      {name: 'Download video', status: 'in_progress', started_at: '2026-07-31T10:01:00Z'}
    ]};
    // Only weighted steps count — 'Set up job' is runner overhead, not our work.
    assert.equal(computeProgress(j, 0).startedMs, Date.parse('2026-07-31T10:00:00Z'));
  });

  it('startedMs is null before anything of ours has started', () => {
    assert.equal(computeProgress(null, 0).startedMs, null);
  });

  it('startedMs survives the finished-job early return', () => {
    // The elapsed counter turns into the burn.done_in line on success, so the
    // start instant has to be there on the done path too.
    const p = computeProgress(job([
      {name: 'Install dependencies', status: 'completed',
       started_at: '2026-07-31T10:00:00Z'},
      done('Upload result'),
    ], 'completed'), T0);
    assert.strictEqual(p.done, true);
    assert.equal(p.startedMs, Date.parse('2026-07-31T10:00:00Z'));
  });

  it('does not report done when the job failed outside a named step', () => {
    const p = computeProgress(job([], 'completed', 'failure'), T0);
    assert.strictEqual(p.done, false);
    assert.strictEqual(p.failed, true);
  });

  it('does not report done when the job was cancelled outside a named step', () => {
    const p = computeProgress(job([], 'completed', 'cancelled'), T0);
    assert.strictEqual(p.done, false);
    assert.strictEqual(p.failed, true);
  });
});

// The panel draws four phases, not fourteen steps: three short certainties and
// one long stretch. The mapping from a progress fraction to per-segment
// geometry is arithmetic, so it lives here and is tested here — index.html only
// sets classes and widths from it.
describe('burnPhases', () => {
  it('the phases partition the weight table exactly', () => {
    const phases = burnPhases();
    assert.deepEqual(phases.map(p => p.key), ['prepare', 'fetch', 'render', 'upload']);
    const sum = phases.reduce((a, p) => a + p.weight, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `phase weights sum to ${sum}`);
    // Every weighted step belongs to exactly one phase.
    const owned = phases.reduce((a, p) => a + p.stepNames.length, 0);
    assert.equal(owned, BURN_STEP_WEIGHTS.length);
  });

  it('the render phase carries the whole render block', () => {
    const render = burnPhases().find(p => p.key === 'render');
    assert.ok(Math.abs(render.weight - 0.70) < 1e-9);
    assert.equal(render.stepNames.length, 21);          // Start render + 19 gates + Finish render
    assert.ok(Math.abs(render.start - 0.20) < 1e-9);    // prepare 0.05 + fetch 0.15
  });

  it('refuses to guess when the weight table stops grouping into four phases', () => {
    // Four wrong widths drawn confidently would be worse than a loud failure:
    // the whole point of the form is that it says something true.
    const saved = BURN_STEP_WEIGHTS.slice();
    BURN_STEP_WEIGHTS.splice(1, 1);   // drop 'Download video' — no fetch phase left
    try {
      assert.throws(() => burnPhases(), /four phases/);
    } finally {
      BURN_STEP_WEIGHTS.length = 0;
      saved.forEach((s) => BURN_STEP_WEIGHTS.push(s));
    }
    assert.equal(burnPhases().length, 4, 'the table must be restored for later tests');
  });
});

describe('burnSegments', () => {
  it('a phase fills only with its own credited weight', () => {
    // Install + Download done, Start render + one gate done: render is 0.0825/0.70 full.
    const p = {fraction: 0.05 + 0.15 + 0.05 + 0.0325, label: 'Render 20%',
               done: false, failed: false, failedStep: ''};
    const segs = burnSegments(p);
    assert.equal(segs[0].fill, 1);
    assert.equal(segs[1].fill, 1);
    assert.ok(Math.abs(segs[2].fill - 0.0825 / 0.70) < 1e-9);
    assert.equal(segs[3].fill, 0);
  });

  it('the phase containing the running step is the active one', () => {
    const segs = burnSegments({fraction: 0.2, label: 'Render 10%',
                               done: false, failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.state), ['done', 'done', 'active', 'idle']);
  });

  it('a failed step paints its own phase and no other', () => {
    const segs = burnSegments({fraction: 0.2, label: 'Render 10%',
                               done: false, failed: true, failedStep: 'Render 10%'});
    assert.deepEqual(segs.map(s => s.state), ['done', 'done', 'failed', 'idle']);
  });

  it('a failure with no named step marks nothing', () => {
    // We do not know where it died, so we do not claim a location.
    const segs = burnSegments({fraction: 0, label: '', done: false,
                               failed: true, failedStep: ''});
    assert.ok(segs.every(s => s.state !== 'failed'));
  });

  it('a finished run shows every phase complete', () => {
    const segs = burnSegments({fraction: 1, label: '', done: true,
                               failed: false, failedStep: ''});
    assert.ok(segs.every(s => s.fill === 1 && s.state === 'done'));
  });

  it('an unknown label leaves no phase active', () => {
    // "Post Run actions/checkout" and friends are not ours to display.
    const segs = burnSegments({fraction: 1, label: 'Post Run actions/checkout',
                               done: false, failed: false, failedStep: ''});
    assert.ok(segs.every(s => s.state !== 'active'));
  });

  it('breathes the first phase through the run-discovery window', () => {
    // Dispatched, but no step of ours is named yet, and that lasts up to a
    // minute. An inert track reads as broken, so the phase about to run is the
    // active one. This is a model rule, not a driver touch-up: it is derived
    // from the same facts as every other state.
    const segs = burnSegments({fraction: 0, label: '', done: false,
                               failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.state), ['active', 'idle', 'idle', 'idle']);
  });

  it('does not breathe the first phase once any phase has earned something', () => {
    const segs = burnSegments({fraction: 0.05, label: 'Download video',
                               done: false, failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.state), ['done', 'active', 'idle', 'idle']);
  });

  it('does not breathe the first phase on a terminal state', () => {
    const failed = burnSegments({fraction: 0, label: '', done: false,
                                 failed: true, failedStep: ''});
    assert.ok(failed.every(s => s.state === 'idle'),
      'a failure we cannot locate must not breathe an arbitrary phase');
  });

  it('carries the geometry the track needs, in phase order', () => {
    // The driver sets flex-grow from these weights, so a segment that forgot
    // its weight would silently draw four equal widths.
    const segs = burnSegments({fraction: 0, label: '', done: false,
                               failed: false, failedStep: ''});
    assert.deepEqual(segs.map(s => s.key), ['prepare', 'fetch', 'render', 'upload']);
    assert.deepEqual(segs.map(s => s.weight), burnPhases().map(p => p.weight));
    assert.deepEqual(segs.map(s => s.start), burnPhases().map(p => p.start));
  });
});

describe('burnPhaseKey', () => {
  it('names the phase a workflow step belongs to', () => {
    assert.equal(burnPhaseKey('Install dependencies'), 'prepare');
    assert.equal(burnPhaseKey('Download video'), 'fetch');
    assert.equal(burnPhaseKey('Start render'), 'render');
    assert.equal(burnPhaseKey('Render 90%'), 'render');
    assert.equal(burnPhaseKey('Finish render'), 'render');
    assert.equal(burnPhaseKey('Upload result'), 'upload');
  });

  it('is null for steps that are not ours', () => {
    assert.equal(burnPhaseKey('Set up job'), null);
    assert.equal(burnPhaseKey(''), null);
    assert.equal(burnPhaseKey(undefined), null);
  });

  it('names a phase for the weightless steps that are still ours', () => {
    // 'Validate inputs' is the one step whose entire job is to report bad user
    // input — the SPA can send a font_ratio it refuses — so its failure must
    // name a phase instead of falling through to the generic "render failed".
    assert.equal(burnPhaseKey('Validate inputs'), 'prepare');
  });

  it('keeps the weightless steps out of the weight table', () => {
    // Giving 'Validate inputs' weight would change BURN_STEP_WEIGHTS, whose sum,
    // order and name-for-name contract with burn-subtitles.yml are pinned by
    // tests/test_burn_workflow_steps.py and verified against a real run.
    assert.ok(!BURN_STEP_WEIGHTS.some((s) => s.name === 'Validate inputs'),
      'the alias must name a phase without earning any of the bar');
  });
});

describe('burnPhaseNumber', () => {
  it('burnPhaseNumber is the 1-based position of the active phase', () => {
    assert.equal(burnPhaseNumber({label: 'Download video'}), 2);
    assert.equal(burnPhaseNumber({label: 'Render 40%'}), 3);
    assert.equal(burnPhaseNumber({label: 'Upload result'}), 4);
    assert.equal(burnPhaseNumber({label: ''}), null);
  });
});
