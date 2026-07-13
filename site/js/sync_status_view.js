// Cloud sync-status chip: view model + glyphs.
//
// Both the edit chip and the marker chip render as one elegant cloud with a
// single glyph inside. The engine exposes finer states (pending vs syncing,
// synced vs ready) but the user only cares about three tones:
//   - progress (blue)  a sync is coming or in flight   -> cloud + two sync arrows
//   - ok       (green) everything is synced / finalized -> cloud + check
//   - error    (red)   the last sync failed             -> cloud + "!"
// There is deliberately no separate "waiting" glyph: once an edit is queued we
// know a sync is coming, so 'pending' folds straight into progress.
//
// Single source shared by index.html (<script src>) and the node test suite.
(function (root) {
  'use strict';

  // Shared cloud silhouette: a symmetric, puffy cloud (three rounded top lobes
  // over a flat bottom) drawn in a 24x24 viewBox. Reads clearly as a cloud even
  // at ~19px. The inner glyph is layered on top, centred on the body (~12,13).
  var CLOUD = '<path d="M7 18C4.79 18 3 16.21 3 14C3 11.95 4.54 10.26 6.53 10.03C7.14 7.7 9.36 6 12 6C14.64 6 16.86 7.7 17.47 10.03C19.46 10.26 21 11.95 21 14C21 16.21 19.21 18 17 18Z"/>';

  var GLYPHS = {
    // Two static sync arrows (upper arc heading right, lower arc heading left) —
    // the universal "syncing" mark, no animation. Kept compact + thin so the
    // arrows sit inside the cloud body without touching the silhouette.
    progress: '<g stroke-width="1.4">'
      + '<path d="M10.1 11.4A2.35 2.35 0 0 1 14.3 11.8"/>'
      + '<polyline points="14.5 10.1 14.5 12 12.6 12"/>'
      + '<path d="M13.9 14.6A2.35 2.35 0 0 1 9.7 14.2"/>'
      + '<polyline points="9.5 15.9 9.5 14 11.4 14"/></g>',
    ok: '<polyline points="9.2 12.9 11.1 14.8 14.8 10.7" stroke-width="2"/>',
    error: '<line x1="12" y1="9.4" x2="12" y2="12.8" stroke-width="2"/>'
      + '<line x1="12" y1="14.7" x2="12" y2="14.71" stroke-width="2"/>',
  };

  function cloud(inner) {
    return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" '
      + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
      + 'stroke-linejoin="round" aria-hidden="true">' + CLOUD + inner + '</svg>';
  }

  // Map an engine status to the chip's tone. `hidden` means the chip should not
  // show at all (idle / unknown).
  function syncStatusVisual(status) {
    switch (status) {
      case 'pending':
      case 'syncing':
        return { tone: 'progress', hidden: false };
      case 'synced':
      case 'ready':
        return { tone: 'ok', hidden: false };
      case 'error':
        return { tone: 'error', hidden: false };
      default:
        return { tone: null, hidden: true };
    }
  }

  // The cloud SVG for a tone, or '' for an unknown tone.
  function syncCloudSvg(tone) {
    var g = GLYPHS[tone];
    return g ? cloud(g) : '';
  }

  var api = { syncStatusVisual: syncStatusVisual, syncCloudSvg: syncCloudSvg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (k) { root[k] = api[k]; });
})(typeof window !== 'undefined' ? window : this);
