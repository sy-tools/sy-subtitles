// Fullscreen cursor auto-hide: the mouse cursor disappears after a spell of
// pointer inactivity in the fullscreen preview and returns on the next real
// move. Single source for browser (script tag) and Node tests.
//
// In fullscreen the cross-origin Vimeo iframe covers the whole screen, so the
// page can neither style the cursor over it nor see a single mousemove there.
// The SPA therefore lays a transparent shield over the iframe only while idle:
// the shield carries `cursor: none` and, being ours, receives the move that
// ends the idle spell. Between spells the shield is gone and Vimeo's own
// controls stay clickable — the controller below decides when it goes up.

var FS_CURSOR_IDLE_MS = 5000;

// opts: {delayMs, setTimer, clearTimer, onChange(hidden: boolean)}
function createCursorIdle(opts) {
  var active = false;
  var hidden = false;
  var timer = null;
  // First position seen after hiding. The shield appearing under a resting
  // pointer makes the browser dispatch a mousemove with no physical movement,
  // so only a position that differs from this one counts as activity.
  var anchor = null;

  function disarm() {
    if (timer !== null) { opts.clearTimer(timer); timer = null; }
  }
  function arm() {
    disarm();
    timer = opts.setTimer(function() {
      timer = null;
      if (!active) return;
      hidden = true;
      anchor = null;
      opts.onChange(true);
    }, opts.delayMs);
  }
  function reveal() {
    if (!hidden) return;
    hidden = false;
    anchor = null;
    opts.onChange(false);
  }

  return {
    enter: function() {
      if (active) return;
      active = true;
      arm();
    },
    exit: function() {
      active = false;
      disarm();
      reveal();
    },
    pointerMove: function(x, y) {
      if (!active) return;
      if (hidden) {
        if (anchor === null) { anchor = { x: x, y: y }; return; }
        if (anchor.x === x && anchor.y === y) return;
        reveal();
      }
      arm();
    },
    pointerDown: function() {
      if (!active) return;
      reveal();
      arm();
    },
    // Player activity (seek, volume, play/pause) keeps a visible cursor up but
    // never reveals a hidden one: the keyboard drives the player too.
    nudge: function() {
      if (!active || hidden) return;
      arm();
    },
    isIdle: function() { return hidden; },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FS_CURSOR_IDLE_MS: FS_CURSOR_IDLE_MS,
    createCursorIdle: createCursorIdle,
  };
}
