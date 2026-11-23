// The help sheet folded into a small floating player: where it sits and how
// big it is. A tutorial is watched while doing what it shows, so a click
// beside the sheet keeps the playing video on screen, small, over the app.
//
// The box keeps the video's 16:9 under a bar of MINI_HEAD pixels and never
// leaves the viewport (FloatPanel's clamp).

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

  // How much wider a drag of `edge` by (dx, dy) makes the box. Height follows
  // width at 16:9, so a vertical drag counts 16/9 times; a corner goes by
  // whichever way the pointer moved more.
  function growth(edge, dx, dy) {
    var byX = { left: -dx, right: dx }[edge.split('-').pop()] || 0;
    var byY = { top: -dy, bottom: dy }[edge.split('-')[0]] * 16 / 9 || 0;
    return Math.abs(byX) >= Math.abs(byY) ? byX : byY;
  }

  // The edge dragged moves; the opposite ones stay. For a side edge that is
  // the other side and the bottom, for the top or bottom edge it is the right
  // side and the other one.
  function resizeFromEdge(start, edge, dx, dy, viewportWidth, viewportHeight) {
    var w = width(start.width + growth(edge, dx, dy), viewportWidth);
    var h = height(w);
    var keepLeft = edge === 'right';
    var keepTop = edge === 'bottom';
    return miniRect({
      left: keepLeft ? start.left : start.left + start.width - w,
      top: keepTop ? start.top : start.top + start.height - h,
      width: w,
    }, viewportWidth, viewportHeight);
  }

  function isTap(dx, dy) { return Math.abs(dx) < TAP_PX && Math.abs(dy) < TAP_PX; }

  var api = {
    MINI_HEAD: MINI_HEAD,
    MINI_MIN_WIDTH: MINI_MIN_WIDTH,
    MINI_MAX_WIDTH: MINI_MAX_WIDTH,
    miniRect: miniRect,
    resizeFromEdge: resizeFromEdge,
    isTap: isTap,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.HelpMini = api;
})();
