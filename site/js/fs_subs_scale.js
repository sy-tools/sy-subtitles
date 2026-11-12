// Fullscreen subtitle scale — the arithmetic behind dragging the top edge of
// the fullscreen band. Single source for the browser (script tag) and the Node
// tests.
//
// Every function takes the geometry (js/burn_geometry.js) as an argument: the
// band's height and the font's limits are the burn's, and a second copy of
// either here is a number the burn cannot see.
(function (root) {
  'use strict';

  function clamp(min, value, max) {
    return Math.max(min, Math.min(max, value));
  }

  function baseFontPx(videoW, g) {
    return videoW * g.fontWidthRatio;
  }

  // The scales between which the font actually changes. Outside them the CSS
  // clamp holds the font still, so a scale stored out there is travel the
  // pointer has to undo before anything moves.
  function fsScaleBand(videoW, videoH, g, scaleMin, scaleMax) {
    var base = baseFontPx(videoW, g);
    var max = clamp(scaleMin, (g.fontRatioMax * videoH) / base, scaleMax);
    var min = clamp(scaleMin, (g.fontRatioMin * videoH) / base, max);
    return { min: min, max: max };
  }

  function fsBandLines(bandH, fontPx, videoH, g) {
    var pads = ((g.padTopPx + g.padBotPx) / g.refHeight) * videoH;
    var lines = Math.round((bandH - pads) / (fontPx * g.lineAdvance));
    return lines >= 1 && isFinite(lines) ? lines : 1;
  }

  // drag: {startScale, dyUp, lines, videoW, videoH, geometry, scaleMin, scaleMax}
  // `lines` is the line count when the drag began. A growing font may rewrap
  // the cue mid-drag; holding the count keeps the mapping one straight line
  // instead of one that changes slope under the hand.
  function fsScaleForDrag(drag) {
    var g = drag.geometry;
    var band = fsScaleBand(drag.videoW, drag.videoH, g, drag.scaleMin, drag.scaleMax);
    var start = clamp(band.min, isFinite(drag.startScale) ? drag.startScale : 1, band.max);
    var lines = drag.lines >= 1 ? drag.lines : 1;
    var dyUp = isFinite(drag.dyUp) ? drag.dyUp : 0;
    var fontDelta = dyUp / (lines * g.lineAdvance);
    return clamp(band.min, start + fontDelta / baseFontPx(drag.videoW, g), band.max);
  }

  var api = {
    fsScaleBand: fsScaleBand,
    fsBandLines: fsBandLines,
    fsScaleForDrag: fsScaleForDrag,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (name) { root[name] = api[name]; });
})(typeof window !== 'undefined' ? window : this);
