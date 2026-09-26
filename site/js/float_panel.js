// Float panel — placement arithmetic for a floating, non-modal panel.
//
// The fragment panel is draggable because it floats over the player, and the
// player is what the reviewer keeps using while the panel is open: scrubbing to
// find where the fragment starts and ends. Wherever the panel sits, some
// boundary is under it, so the reviewer has to be able to move it aside.
//
// It must never be draggable off-screen, even in part: a panel whose header is
// out of reach can be neither dragged back nor closed. Every position is
// therefore clamped into the viewport, margin included, and a panel larger than
// the viewport on an axis pins to the margin there — its top-left corner, where
// the header starts, stays on screen.
//
// Single source shared by index.html (<script src>) and the node test suite.
(function (root) {
  'use strict';

  // One axis. `near` is the smallest position allowed — the margin, or the
  // margin below something the panel must stay clear of. When the panel cannot
  // fit with both margins, the near limit wins: that is the end the head is at.
  function clampAxis(pos, size, viewport, margin, near) {
    var far = viewport - size - margin;
    if (far < near) return near;
    return Math.min(far, Math.max(near, pos));
  }

  // `topInset` is how much of the top of the viewport the panel may not enter:
  // the page's own fixed bar sits in a layer above this one, so a panel taken to
  // the margin keeps its head — and the only close button there is — behind it,
  // and can then be neither moved back nor dismissed. Absent or 0, this is
  // exactly the plain margin it always was.
  function clampPanelPosition(left, top, width, height, viewportWidth, viewportHeight,
                              margin, topInset) {
    var top0 = margin + (topInset > 0 ? topInset : 0);
    return {
      left: Math.round(clampAxis(left, width, viewportWidth, margin, margin)),
      top: Math.round(clampAxis(top, height, viewportHeight, margin, top0))
    };
  }

  // Where the panel opens: against the right edge at `top`, and never left of
  // the margin on a viewport narrower than the panel.
  function defaultPanelPosition(width, viewportWidth, top, margin) {
    return { left: Math.max(margin, viewportWidth - width - margin), top: top };
  }

  // Where the panel goes when something it must not cover opens beneath it —
  // the export menu, which lives in the sticky header's stacking context and so
  // can never rise above the panel. Left of the obstacle first (the menu hangs
  // from the right edge, the player sits to its left), then below it; a panel
  // that only touches the obstacle is clear. When neither clears it — a phone,
  // the menu filling the width — below wins, still clamped on screen.
  function panelClearOf(panel, obstacle, viewportWidth, viewportHeight, margin, topInset) {
    function overlaps(left, top) {
      return left < obstacle.right && left + panel.width > obstacle.left
        && top < obstacle.bottom && top + panel.height > obstacle.top;
    }
    if (!overlaps(panel.left, panel.top)) return { left: panel.left, top: panel.top };
    var sideways = clampPanelPosition(obstacle.left - panel.width - margin, panel.top,
                                      panel.width, panel.height, viewportWidth, viewportHeight,
                                      margin, topInset);
    if (!overlaps(sideways.left, sideways.top)) return sideways;
    return clampPanelPosition(panel.left, obstacle.bottom + margin,
                              panel.width, panel.height, viewportWidth, viewportHeight,
                              margin, topInset);
  }

  var api = {
    clampPanelPosition: clampPanelPosition,
    defaultPanelPosition: defaultPanelPosition,
    panelClearOf: panelClearOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (k) { root[k] = api[k]; });
})(typeof window !== 'undefined' ? window : this);
