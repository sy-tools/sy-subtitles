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
