// Fullscreen subtitle scale — dragging the top edge of the fullscreen band.
//
// The band is `padTop + lines x lineAdvance x font + padBot` tall, so the edge
// follows the pointer only if the drag is turned into a font change through
// that same formula. And the font stops at the burn's band of the video height
// (js/burn_geometry.js): a scale stored past that point would leave a dead
// stretch on the way back, where the pointer moves and nothing happens.

const { describe, it } = require('node:test');
const assert = require('node:assert');

const G = require('../site/js/burn_geometry');
const { fsScaleBand, fsBandLines, fsScaleForDrag } = require('../site/js/fs_subs_scale');

const MIN = 0.5, MAX = 4;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + ' != ' + b);

describe('fsScaleBand', () => {
  it('stops a 16:9 video where the font reaches the burn ceiling', () => {
    const band = fsScaleBand(1920, 1080, G, MIN, MAX);
    close(band.max, (G.fontRatioMax * 1080) / (G.fontWidthRatio * 1920));
    assert.strictEqual(band.min, MIN);
  });

  it('gives a narrow video more room up than a wide one', () => {
    const wide = fsScaleBand(1920, 1080, G, MIN, MAX);
    const narrow = fsScaleBand(1440, 1080, G, MIN, MAX);
    assert.ok(narrow.max > wide.max);
  });

  it('caps a portrait video, whose font ceiling alone would allow 6x, at the handle range', () => {
    assert.strictEqual(fsScaleBand(540, 1080, G, MIN, MAX).max, MAX);
  });

  it('collapses to the handle maximum when the font floor lies above it', () => {
    const tallSliver = fsScaleBand(100, 1000, G, MIN, MAX);
    assert.deepStrictEqual(tallSliver, { min: MAX, max: MAX });
  });
});

describe('fsBandLines', () => {
  const pads = ((G.padTopPx + G.padBotPx) / G.refHeight) * 1080;
  const font = 1920 * G.fontWidthRatio;

  it('counts the lines the band holds', () => {
    assert.strictEqual(fsBandLines(pads + 1 * font * G.lineAdvance, font, 1080, G), 1);
    assert.strictEqual(fsBandLines(pads + 3 * font * G.lineAdvance, font, 1080, G), 3);
  });

  it('reads an empty band, or a nonsense one, as one line', () => {
    assert.strictEqual(fsBandLines(pads, font, 1080, G), 1);
    assert.strictEqual(fsBandLines(0, font, 1080, G), 1);
    assert.strictEqual(fsBandLines(pads + 100, 0, 1080, G), 1);
    assert.strictEqual(fsBandLines(NaN, font, 1080, G), 1);
  });
});

describe('fsScaleForDrag', () => {
  const drag = (over) => fsScaleForDrag(Object.assign({
    startScale: 1, dyUp: 0, lines: 1, videoW: 1920, videoH: 1080,
    geometry: G, scaleMin: MIN, scaleMax: MAX,
  }, over));
  const bandHeight = (scale, lines) =>
    ((G.padTopPx + G.padBotPx) / G.refHeight) * 1080
    + lines * G.lineAdvance * 1920 * G.fontWidthRatio * scale;

  it('leaves the scale alone when the pointer has not moved', () => {
    close(drag({ startScale: 1.2 }), 1.2);
  });

  it('moves the edge by exactly the pointer travel', () => {
    for (const lines of [1, 2, 3]) {
      const up = drag({ dyUp: 30, lines });
      close(bandHeight(up, lines) - bandHeight(1, lines), 30);
      const down = drag({ dyUp: -30, lines });
      close(bandHeight(down, lines) - bandHeight(1, lines), -30);
    }
  });

  it('stops at the ends of the band', () => {
    const band = fsScaleBand(1920, 1080, G, MIN, MAX);
    close(drag({ dyUp: 5000 }), band.max);
    close(drag({ dyUp: -5000 }), band.min);
  });

  it('shrinks the text on the first pixel down from a stored scale past the band', () => {
    const band = fsScaleBand(1920, 1080, G, MIN, MAX);
    assert.ok(drag({ startScale: 4, dyUp: -10 }) < band.max);
  });

  it('falls back to 1x and one line on input it cannot use', () => {
    close(drag({ startScale: NaN }), 1);
    close(drag({ lines: 0, dyUp: 30 }), drag({ lines: 1, dyUp: 30 }));
    close(drag({ dyUp: NaN }), 1);
  });
});
