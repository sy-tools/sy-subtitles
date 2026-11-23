const { describe, it } = require('node:test');
const assert = require('node:assert');
const M = require('../site/js/help_mini');

const H = M.MINI_HEAD;
const tall = (w) => Math.round(w * 9 / 16) + H;

describe('miniRect', () => {
  it('opens in the bottom-right corner at the default width', () => {
    assert.deepStrictEqual(M.miniRect(null, 1600, 900),
      { left: 1600 - 360 - 16, top: 900 - tall(360) - 16, width: 360, height: tall(360) });
  });

  it('keeps a remembered place, pulled back on screen', () => {
    const r = M.miniRect({ left: 5000, top: -40, width: 400 }, 1600, 900);
    assert.deepStrictEqual(r, { left: 1600 - 400 - 16, top: 16, width: 400, height: tall(400) });
  });

  it('fits a phone: never wider than the screen less its margins', () => {
    const r = M.miniRect(null, 360, 640);
    assert.strictEqual(r.width, 360 - 32);
    assert.strictEqual(r.left, 16);
  });

  it('holds the width between its limits', () => {
    assert.strictEqual(M.miniRect({ left: 0, top: 0, width: 50 }, 1600, 900).width, M.MINI_MIN_WIDTH);
    assert.strictEqual(M.miniRect({ left: 0, top: 0, width: 5000 }, 1600, 900).width, M.MINI_MAX_WIDTH);
  });
});

describe('resizeFromEdge', () => {
  const start = { left: 800, top: 300, width: 400, height: tall(400) };
  const right = (r) => r.left + r.width;
  const bottom = (r) => r.top + r.height;

  it('widens from the left edge, keeping the right and bottom edges', () => {
    const r = M.resizeFromEdge(start, 'left', -100, 0, 1600, 900);
    assert.strictEqual(r.width, 500);
    assert.strictEqual(right(r), right(start));
    assert.strictEqual(bottom(r), bottom(start));
  });

  it('widens from the right edge, keeping the left edge', () => {
    const r = M.resizeFromEdge(start, 'right', 100, 0, 1600, 900);
    assert.strictEqual(r.width, 500);
    assert.strictEqual(r.left, start.left);
  });

  it('grows from the top edge at 16:9, keeping the bottom and right edges', () => {
    const r = M.resizeFromEdge(start, 'top', 0, -90, 1600, 900);
    assert.strictEqual(r.width, 560);
    assert.strictEqual(bottom(r), bottom(start));
    assert.strictEqual(right(r), right(start));
  });

  it('grows from the bottom edge, keeping the top edge', () => {
    const r = M.resizeFromEdge(start, 'bottom', 0, 90, 1600, 900);
    assert.strictEqual(r.width, 560);
    assert.strictEqual(r.top, start.top);
  });

  it('stops at the minimum width', () => {
    assert.strictEqual(M.resizeFromEdge(start, 'left', 1000, 0, 1600, 900).width, M.MINI_MIN_WIDTH);
  });

  it('follows the corner by whichever way moved more', () => {
    assert.strictEqual(M.resizeFromEdge(start, 'top-left', -100, -9, 1600, 900).width, 500);
    assert.strictEqual(M.resizeFromEdge(start, 'top-left', -5, -90, 1600, 900).width, 560);
  });
});

describe('isTap', () => {
  it('tells a tap from a drag by how far the pointer went', () => {
    assert.ok(M.isTap(2, -3));
    assert.ok(!M.isTap(0, 8));
  });
});
