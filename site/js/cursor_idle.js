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
//
// While the shield is up it stands in for the video surface under it, so a
// press on it is a click on the video: play/pause, and a double click leaves
// fullscreen, as on the bare player. That is a guess too: someone who worked
// the player, then held still to aim, gets the shield under their click. A
// press in the strip where Vimeo's control bar sits therefore only brings the
// cursor back — a lost click there beats a pause where a seek was meant.

var FS_CURSOR_IDLE_MS = 5000;
var FS_CURSOR_PROBE_MS = 1000;
var FS_DOUBLE_PRESS_MS = 500;
// A seek or volume change this soon after a key press came from the keyboard.
var FS_KEY_ECHO_MS = 1000;
// Pointer travel that is still no move: the jitter of a hand on a mouse or a
// trackpad tap, the same slop a double click is allowed.
var FS_MOVE_SLOP_PX = 4;
// Height of Vimeo's control bar along the bottom of the video.
var FS_CONTROL_STRIP_PX = 64;

// Where the player draws the video inside `rect` (the shield's client rect):
// the largest box of the video's aspect, centred — the same box the fullscreen
// CSS derives from --preview-aspect ("W / H"), with the same 16:9 fallback.
// Vimeo letterboxes or pillarboxes the rest and hangs its control bar off the
// video's bottom edge, not the screen's.
function videoBox(rect, aspect) {
  var m = /^\s*([\d.]+)\s*\/\s*([\d.]+)\s*$/.exec(aspect || '');
  var a = m && +m[1] > 0 && +m[2] > 0 ? m[1] / m[2] : 16 / 9;
  var w = Math.min(rect.width, rect.height * a);
  var h = Math.min(rect.height, rect.width / a);
  var left = rect.left + (rect.width - w) / 2;
  var top = rect.top + (rect.height - h) / 2;
  return { left: left, right: left + w, top: top, bottom: top + h };
}

// press: {onShield, pointerType, button, ctrlKey, x, y, box} — the point and
// the videoBox() in the same (client) coordinates. A touch or pen press, a
// secondary button, a macOS ctrl-click and a press on the bars around the
// video (inert on the bare player) are no click on the video.
function isVideoPress(press) {
  var b = press.box;
  return press.onShield && press.pointerType === 'mouse' && press.button === 0
    && !press.ctrlKey && press.x >= b.left && press.x < b.right
    && press.y >= b.top && press.y < b.bottom - FS_CONTROL_STRIP_PX;
}

// opts: {delayMs, probeMs, doublePressMs, keyEchoMs, now, setTimer, clearTimer,
//        onChange(state: 'visible' | 'probe' | 'hidden'),
//        onVideoClick(), onVideoDoubleClick() — which must also undo the click
//        that opened it: that one already went out as a click}
function createCursorIdle(opts) {
  var active = false;
  var state = 'visible';
  var timer = null;
  var lastKeyAt = -Infinity;
  // Time of a video press that could still become the first half of a double.
  var pressAt = null;
  // First position seen since the shield went up. A browser may dispatch a
  // mousemove with no physical movement when the element under a resting
  // pointer changes, so only travel beyond the slop from here counts.
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
    pressAt = null;
    setState('visible');
  }
  function wake() {
    reveal();
    countdown();
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
        if (Math.abs(x - anchor.x) <= FS_MOVE_SLOP_PX
          && Math.abs(y - anchor.y) <= FS_MOVE_SLOP_PX) return;
        wake();
        return;
      }
      countdown();
    },
    // A press anywhere but on the shield.
    wake: function() {
      if (!active) return;
      wake();
    },
    // A primary mouse press on the shield. The shield stays up with the cursor
    // showing, so the second press of a double click lands on it as well.
    videoPress: function() {
      if (!active) return;
      var now = opts.now();
      var isDouble = pressAt !== null && now - pressAt < opts.doublePressMs;
      anchor = null;
      setState('probe');
      schedule(opts.delayMs, function() { setState('hidden'); });
      if (isDouble) {
        pressAt = null;
        opts.onVideoDoubleClick();
      } else {
        pressAt = now;
        opts.onVideoClick();
      }
    },
    key: function() { lastKeyAt = opts.now(); },
    // Player activity keeps a visible cursor up. Play and pause never reveal a
    // hidden one — Space and a click on the video both cause them. A seek or
    // volume change with no key just before it was made with the mouse inside
    // the iframe (a drag holds the pointer there), so that one does.
    playerEvent: function(name) {
      if (!active) return;
      var byMouse = (name === 'seeked' || name === 'volumechange')
        && opts.now() - lastKeyAt >= opts.keyEchoMs;
      if (byMouse) wake();
      else if (state === 'visible') countdown();
    },
    state: function() { return state; },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FS_CURSOR_IDLE_MS: FS_CURSOR_IDLE_MS,
    FS_CURSOR_PROBE_MS: FS_CURSOR_PROBE_MS,
    FS_DOUBLE_PRESS_MS: FS_DOUBLE_PRESS_MS,
    FS_KEY_ECHO_MS: FS_KEY_ECHO_MS,
    FS_MOVE_SLOP_PX: FS_MOVE_SLOP_PX,
    FS_CONTROL_STRIP_PX: FS_CONTROL_STRIP_PX,
    createCursorIdle: createCursorIdle,
    isVideoPress: isVideoPress,
    videoBox: videoBox,
  };
}
