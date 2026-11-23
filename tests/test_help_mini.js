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

describe('resizeFromCorner', () => {
  it('grows to the left and up, keeping the bottom-right corner where it was', () => {
    const start = M.miniRect(null, 1600, 900);
    const r = M.resizeFromCorner(start, -100, 1600, 900);
    assert.strictEqual(r.width, 460);
    assert.strictEqual(r.left + r.width, start.left + start.width);
    assert.strictEqual(r.top + r.height, start.top + start.height);
  });

  it('stops at the minimum width', () => {
    const r = M.resizeFromCorner(M.miniRect(null, 1600, 900), 1000, 1600, 900);
    assert.strictEqual(r.width, M.MINI_MIN_WIDTH);
  });
});

describe('isTap', () => {
  it('tells a tap from a drag by how far the pointer went', () => {
    assert.ok(M.isTap(2, -3));
    assert.ok(!M.isTap(0, 8));
  });
});
