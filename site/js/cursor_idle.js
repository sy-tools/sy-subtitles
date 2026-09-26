// Fullscreen cursor auto-hide: the mouse cursor disappears after a spell of
// pointer inactivity in the fullscreen preview and returns on the next real
// move. Single source for browser (script tag) and Node tests.
//
// In fullscreen the cross-origin Vimeo iframe covers the whole screen, so the
// page can neither style the cursor over it nor see a single mousemove there.
// The SPA therefore lays a transparent shield of its own over the iframe, and
// only while the pointer looks idle, so Vimeo's controls stay clickable the
// rest of the time. Because moves over the iframe are invisible, "idle" is a
// guess until the shield is up: the shield first goes up with the cursor still
// showing ('probe'), and only a pointer that then stays still for the whole
// probe gets hidden ('hidden'). A move during the probe means someone was using
// the player all along — the shield comes straight down again.

var FS_CURSOR_IDLE_MS = 5000;
var FS_CURSOR_PROBE_MS = 1000;

// opts: {delayMs, probeMs, setTimer, clearTimer,
//        onChange(state: 'visible' | 'probe' | 'hidden')}
function createCursorIdle(opts) {
  var active = false;
  var state = 'visible';
  var timer = null;
  // First position seen since the shield went up. A browser may dispatch a
  // mousemove with no physical movement when the element under a resting
  // pointer changes, so only a position that differs from this one counts.
  var anchor = null;

  function setState(next) {
    if (state === next) return;
    state = next;
    opts.onChange(next);
  }
  function disarm() {
    if (timer !== null) { opts.clearTimer(timer); timer = null; }
  }
  function schedule(ms, fn) {
    disarm();
    timer = opts.setTimer(function() { timer = null; if (active) fn(); }, ms);
  }
  function countdown() {
    schedule(opts.delayMs - opts.probeMs, function() {
      anchor = null;
      setState('probe');
      schedule(opts.probeMs, function() { setState('hidden'); });
    });
  }
  function reveal() {
    anchor = null;
    setState('visible');
  }

  return {
    enter: function() {
      if (active) return;
      active = true;
      countdown();
    },
    exit: function() {
      active = false;
      disarm();
      reveal();
    },
    pointerMove: function(x, y) {
      if (!active) return;
      if (state !== 'visible') {
        if (anchor === null) { anchor = { x: x, y: y }; return; }
        if (anchor.x === x && anchor.y === y) return;
        reveal();
      }
      countdown();
    },
    // True when the press came while the cursor was hidden: nobody can aim at
    // a control they cannot see, so the caller may act on the whole video.
    pointerDown: function() {
      if (!active) return false;
      var blind = state === 'hidden';
      reveal();
      countdown();
      return blind;
    },
    // Player activity (seek, volume, play/pause) keeps a visible cursor up but
    // never ends a probe or reveals a hidden one: the keyboard drives the
    // player too.
    nudge: function() {
      if (!active || state !== 'visible') return;
      countdown();
    },
    state: function() { return state; },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FS_CURSOR_IDLE_MS: FS_CURSOR_IDLE_MS,
    FS_CURSOR_PROBE_MS: FS_CURSOR_PROBE_MS,
    createCursorIdle: createCursorIdle,
  };
}
