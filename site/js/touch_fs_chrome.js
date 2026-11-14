// Fullscreen controls on a touch screen: the subtitle scale handle and the
// exit button show for a spell after something happens, then fade out.
//
// The desktop's cursor shield (cursor_idle.js) cannot serve here: a shield
// over the player would swallow the taps meant for it, and a tap that goes
// into the cross-origin player is invisible to the page. So "something
// happens" is what the page can see: entering fullscreen, a touch on one of
// its own controls, and the events the player reports (play, pause, seek...),
// which is what a tap on the video usually leads to.
//
// A faded exit button stays where it was and still takes taps. The first one
// only brings it back, so a stray touch in the corner cannot end fullscreen
// unseen.

var FS_TOUCH_IDLE_MS = 3000;

// opts: {idleMs, setTimer, clearTimer, onChange(state: 'visible' | 'hidden' | 'off')}
function createTouchFsChrome(opts) {
  var state = 'off';
  var timer = null;

  function setState(next) {
    if (state === next) return;
    state = next;
    opts.onChange(next);
  }
  function disarm() {
    if (timer !== null) { opts.clearTimer(timer); timer = null; }
  }
  function show() {
    setState('visible');
    disarm();
    timer = opts.setTimer(function() { timer = null; setState('hidden'); }, opts.idleMs);
  }

  return {
    enter: function() {
      if (state === 'off') show();
    },
    exit: function() {
      disarm();
      setState('off');
    },
    activity: function() {
      if (state !== 'off') show();
    },
    leavesOnExitTap: function() {
      if (state === 'visible') return true;
      if (state === 'hidden') show();
      return false;
    },
    state: function() { return state; },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FS_TOUCH_IDLE_MS: FS_TOUCH_IDLE_MS,
    createTouchFsChrome: createTouchFsChrome,
  };
}
