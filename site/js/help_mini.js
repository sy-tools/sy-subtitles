// The help sheet folded into a small floating player: where it sits and how
// big it is. A tutorial is watched while doing what it shows, so a click
// beside the sheet keeps the playing video on screen, small, over the app.
//
// The box keeps the video's 16:9 under a bar of MINI_HEAD pixels, never
// leaves the viewport (FloatPanel's clamp), and grows from its top-left
// corner: it opens in the bottom-right one, which therefore stays put.

(function () {
  var Float = typeof module !== 'undefined' && module.exports ? require('./float_panel') : window;

  var MINI_HEAD = 36;
  var MINI_MIN_WIDTH = 240;
  var MINI_MAX_WIDTH = 720;
  var MINI_DEFAULT_WIDTH = 360;
  var MARGIN = 16;
  var TAP_PX = 5;

  function width(requested, viewportWidth) {
    var room = viewportWidth - 2 * MARGIN;
    return Math.min(room, MINI_MAX_WIDTH, Math.max(MINI_MIN_WIDTH, Math.round(requested)));
  }

  function height(w) { return Math.round(w * 9 / 16) + MINI_HEAD; }

  // state: {left, top, width} remembered from the last move, or null.
  function miniRect(state, viewportWidth, viewportHeight) {
    var w = width(state ? state.width : MINI_DEFAULT_WIDTH, viewportWidth);
    var h = height(w);
    var left = state ? state.left : viewportWidth - w - MARGIN;
    var top = state ? state.top : viewportHeight - h - MARGIN;
    var at = Float.clampPanelPosition(left, top, w, h, viewportWidth, viewportHeight, MARGIN, 0);
    return { left: at.left, top: at.top, width: w, height: h };
  }

  // dx: how far the top-left handle moved right since the drag began.
  function resizeFromCorner(start, dx, viewportWidth, viewportHeight) {
    var w = width(start.width - dx, viewportWidth);
    var h = height(w);
    return miniRect({ left: start.left + start.width - w, top: start.top + start.height - h, width: w },
      viewportWidth, viewportHeight);
  }

  function isTap(dx, dy) { return Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX; }

  var api = {
    MINI_HEAD: MINI_HEAD,
    MINI_MIN_WIDTH: MINI_MIN_WIDTH,
    MINI_MAX_WIDTH: MINI_MAX_WIDTH,
    miniRect: miniRect,
    resizeFromCorner: resizeFromCorner,
    isTap: isTap,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpMini = api;
})();
