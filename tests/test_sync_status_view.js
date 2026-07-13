// Unit tests for the cloud sync-status chip view model (site/js/sync_status_view.js).
// The chip folds the engine's finer states into three tones the user cares about:
//   blue "progress" (a sync is coming or in flight), green "ok" (done),
//   red "error". There is deliberately no separate "waiting" glyph — once an
//   edit is queued we know a sync is coming, so 'pending' folds into progress.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { syncStatusVisual, syncCloudSvg } = require('../site/js/sync_status_view');

describe('syncStatusVisual: engine status -> chip tone', () => {
  it('folds pending into the progress tone (no waiting state)', () => {
    const v = syncStatusVisual('pending');
    assert.strictEqual(v.tone, 'progress');
    assert.ok(!v.hidden);
  });

  it('shows the progress tone while syncing', () => {
    assert.strictEqual(syncStatusVisual('syncing').tone, 'progress');
  });

  it('shows the ok tone when synced', () => {
    const v = syncStatusVisual('synced');
    assert.strictEqual(v.tone, 'ok');
    assert.ok(!v.hidden);
  });

  it('folds ready (finalized PR) into the ok tone', () => {
    assert.strictEqual(syncStatusVisual('ready').tone, 'ok');
  });

  it('shows the error tone on error', () => {
    const v = syncStatusVisual('error');
    assert.strictEqual(v.tone, 'error');
    assert.ok(!v.hidden);
  });

  it('hides the chip when idle', () => {
    assert.strictEqual(syncStatusVisual('idle').hidden, true);
  });

  it('hides the chip for an unknown or missing status', () => {
    assert.strictEqual(syncStatusVisual('nope').hidden, true);
    assert.strictEqual(syncStatusVisual(undefined).hidden, true);
    assert.strictEqual(syncStatusVisual('').hidden, true);
  });
});

describe('syncCloudSvg: one cloud glyph per tone', () => {
  it('returns an <svg> cloud for each real tone', () => {
    ['progress', 'ok', 'error'].forEach(function (tone) {
      const svg = syncCloudSvg(tone);
      assert.ok(/^<svg\b/.test(svg), tone + ' should be an svg, got: ' + svg.slice(0, 20));
    });
  });

  it('draws the progress glyph as two static sync arrows (two arcs, no animation)', () => {
    const svg = syncCloudSvg('progress');
    const arcs = svg.match(/<path\b/g) || [];
    // one cloud path + two arrow arcs.
    assert.strictEqual(arcs.length, 3, 'expected cloud + two arrow arcs');
    assert.ok(!/class="spin"/.test(svg), 'progress must be static (no spin)');
  });

  it('gives each tone a distinct glyph', () => {
    const p = syncCloudSvg('progress'), ok = syncCloudSvg('ok'), err = syncCloudSvg('error');
    assert.notStrictEqual(p, ok);
    assert.notStrictEqual(ok, err);
    assert.notStrictEqual(p, err);
  });

  it('returns empty string for an unknown tone', () => {
    assert.strictEqual(syncCloudSvg('nope'), '');
    assert.strictEqual(syncCloudSvg(undefined), '');
  });
});
