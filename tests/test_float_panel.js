// Float panel — where a floating, non-modal panel may sit.
//
// The fragment panel floats over the player the reviewer keeps scrubbing, so it
// can be dragged aside — but never out of reach: a panel whose header has left
// the viewport can be neither dragged back nor closed.

const { describe, it } = require('node:test');
const assert = require('node:assert');

const { clampPanelPosition, defaultPanelPosition } = require('../site/js/float_panel');

describe('clampPanelPosition', () => {
  const VW = 1280, VH = 800, MARGIN = 8;
  const clamp = (left, top, width, height) =>
    clampPanelPosition(left, top, width, height, VW, VH, MARGIN);

  it('leaves a panel that fits where it was dropped', () => {
    assert.deepStrictEqual(clamp(100, 120, 320, 240), { left: 100, top: 120 });
  });

  it('pulls a panel dragged past the right or bottom edge back inside', () => {
    // 1280 - 320 - 8 and 800 - 240 - 8: the far edge stops at the margin.
    assert.deepStrictEqual(clamp(2000, 2000, 320, 240), { left: 952, top: 552 });
  });

  it('pulls a panel dragged past the left or top edge back inside', () => {
    assert.deepStrictEqual(clamp(-500, -40, 320, 240), { left: 8, top: 8 });
  });

  it('accepts both limits exactly', () => {
    assert.deepStrictEqual(clamp(8, 8, 320, 240), { left: 8, top: 8 });
    assert.deepStrictEqual(clamp(952, 552, 320, 240), { left: 952, top: 552 });
  });

  it('pins a panel larger than the viewport to the margin, on that axis only', () => {
    // It cannot fit, so it keeps its top-left corner — where the header starts —
    // on screen, rather than letting the far-edge limit push the header off.
    assert.deepStrictEqual(clamp(300, 100, 2000, 240), { left: 8, top: 100 });
    assert.deepStrictEqual(clamp(300, 100, 320, 900), { left: 300, top: 8 });
    assert.deepStrictEqual(clamp(-300, 5000, 2000, 900), { left: 8, top: 8 });
  });

  it('treats a panel that fits only without its far margin as oversized', () => {
    // 1280 - 1270 - 8 = 2 lies inside the near margin: honouring the far margin
    // would push the header into the near one, so the near margin wins.
    assert.deepStrictEqual(clamp(500, 100, 1270, 240), { left: 8, top: 100 });
  });

  it('lands on whole pixels', () => {
    assert.deepStrictEqual(clamp(100.4, 99.6, 320, 240), { left: 100, top: 100 });
  });

  it('keeps the panel below a top inset, not merely below the margin', () => {
    // The page's freshness bar is fixed across the top, in a layer above the
    // preview: a panel clamped or dragged to the margin slides under it, and
    // the head — with the only close button on it — goes out of reach.
    const inset = (top, height) =>
      clampPanelPosition(100, top, 320, height, VW, VH, MARGIN, 29);
    assert.deepStrictEqual(inset(-40, 240), { left: 100, top: 29 + MARGIN },
      'the margin alone is no longer the top of the panel\'s world');
    assert.deepStrictEqual(inset(20, 240), { left: 100, top: 29 + MARGIN },
      'a top inside the bar is pushed clear of it');
    assert.deepStrictEqual(inset(300, 240), { left: 100, top: 300 },
      'anywhere below it, nothing changes');
    // A panel taller than the room left keeps its HEAD on screen and below the
    // bar, rather than being shoved up under it by the far-edge limit.
    assert.deepStrictEqual(inset(400, 900), { left: 100, top: 29 + MARGIN });
  });

  it('is exactly what it was when there is no inset to keep clear of', () => {
    assert.deepStrictEqual(clampPanelPosition(100, -40, 320, 240, VW, VH, MARGIN, 0),
                           clamp(100, -40, 320, 240));
    assert.deepStrictEqual(clampPanelPosition(100, -40, 320, 240, VW, VH, MARGIN),
                           { left: 100, top: MARGIN });
  });
});

describe('defaultPanelPosition', () => {
  it('opens against the right edge, at the given top', () => {
    assert.deepStrictEqual(defaultPanelPosition(320, 1280, 72, 8), { left: 952, top: 72 });
  });

  it('never opens left of the margin on a narrow viewport', () => {
    assert.deepStrictEqual(defaultPanelPosition(500, 400, 72, 8), { left: 8, top: 72 });
  });
});

describe('panelClearOf', () => {
  // The export menu opens inside the sticky header's stacking context, below the
  // panel's layer, so a panel over it hides it outright. The panel steps aside:
  // left of the menu first (it hangs from the right edge), then below it.
  const { panelClearOf } = require('../site/js/float_panel');
  const menu = { left: 860, top: 88, right: 1180, bottom: 330 };

  it('leaves a panel that does not overlap where it is', () => {
    assert.deepStrictEqual(
      panelClearOf({ left: 12, top: 109, width: 420, height: 190 }, menu, 1200, 800, 12),
      { left: 12, top: 109 });
  });

  it('moves an overlapping panel to the left of the obstacle', () => {
    assert.deepStrictEqual(
      panelClearOf({ left: 768, top: 109, width: 420, height: 190 }, menu, 1200, 800, 12),
      { left: 860 - 420 - 12, top: 109 });
  });

  it('moves it below when there is no room on the left', () => {
    const narrowMenu = { left: 68, top: 180, right: 388, bottom: 430 };
    assert.deepStrictEqual(
      panelClearOf({ left: 12, top: 109, width: 376, height: 290 }, narrowMenu, 400, 820, 12),
      { left: 12, top: 430 + 12 });
  });

  it('settles for below, clamped, when nothing clears it', () => {
    const tall = { left: 0, top: 0, right: 400, bottom: 700 };
    const pos = panelClearOf({ left: 12, top: 100, width: 376, height: 290 }, tall, 400, 820, 12);
    assert.deepStrictEqual(pos, { left: 12, top: 820 - 290 - 12 },
      'kept on screen even when it has to overlap');
  });

  it('treats panels that only touch the obstacle as clear', () => {
    assert.deepStrictEqual(
      panelClearOf({ left: 440, top: 109, width: 420, height: 190 }, menu, 1200, 800, 12),
      { left: 440, top: 109 });
  });
});
