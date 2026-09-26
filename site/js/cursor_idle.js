// Fullscreen cursor auto-hide: the mouse cursor disappears after a spell of
// pointer inactivity in the fullscreen preview and returns on the next real
// move. Single source for browser (script tag) and Node tests.
//
// Vimeo hides the cursor only while it is the fullscreen element itself, and
// the preview's fullscreen element is the SPA's own view. Hiding it from the
// page takes an element of the page under the pointer: the browser shows the
// cursor of whichever document the last real mouse event went to (Chromium's
// CursorManager), so `cursor: none` set on the page while the pointer rests
// over the cross-origin iframe is never shown. The SPA therefore keeps a
// shield of its own over the player for as long as fullscreen lasts; it sees
// every move, and a press on it is a click on the video: play/pause, and a
// double click leaves fullscreen, as on the bare player.
//
// A hole in the shield over Vimeo's control bar lets the pointer reach the
// player. Crossing its edge, either way, hands the pointer to Vimeo ('vimeo'):
// the shield steps aside altogether, since Vimeo's menus (a long subtitle list
// among them) open upwards over the video. The page is blind to the pointer
// then, so the shield comes back when the player reports a change — a menu
// choice, a button — or when FS_VIMEO_MODE_MS pass without one. Coming back,
// it leaves keyboard focus where it is: taking it from the iframe would close
// a menu still open there.
//
// In CSS the shield carries the bar's height as --fs-vimeo-bar-h.

var FS_CURSOR_IDLE_MS = 3000;
var FS_VIMEO_MODE_MS = 10000;
var FS_DOUBLE_PRESS_MS = 500;
// Pointer travel that is still no move: the jitter of a hand on a mouse or a
// trackpad tap, the same slop a double click is allowed.
var FS_MOVE_SLOP_PX = 4;

// Where the player draws the video inside `rect` (the shield's client rect):
// the largest box of the video's aspect, centred — the same box the fullscreen
// CSS derives from --preview-aspect ("W / H"), with the same 16:9 fallback.
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
    && press.y >= b.top && press.y < b.bottom;
}

// Whether a pointer arriving on the shield from the player came up out of
// the hole ({x, y, box: videoBox(), barPx}): it lands in the band one bar high
// above the hole. Arriving anywhere else, the shield came back under a pointer
// resting over the video, and keeps it.
function isHoleCrossing(p) {
  var b = p.box;
  return p.x >= b.left && p.x < b.right
    && p.y >= b.bottom - 2 * p.barPx && p.y < b.bottom;
}

// opts: {idleMs, vimeoMs, doublePressMs, now, setTimer, clearTimer,
//        onChange(state: 'visible' | 'hidden' | 'vimeo'),
//        onVideoClick(), onVideoDoubleClick() — which must also undo the click
//        that opened it: that one already went out as a click}
function createCursorIdle(opts) {
  var active = false;
  var state = 'visible';
  var timer = null;
  // Last position of a move on the shield. A browser may dispatch a move with
  // no physical movement, so while hidden only travel beyond the slop counts.
  var lastPos = null;
  // Time of a video press that could still become the first half of a double.
  var pressAt = null;

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
    schedule(opts.idleMs, function() { setState('hidden'); });
  }
  function show() {
    setState('visible');
    countdown();
  }
  function onShield() {
    return active && state !== 'vimeo';
  }

  return {
    enter: function() {
      if (active) return;
      active = true;
      show();
    },
    exit: function() {
      active = false;
      disarm();
      lastPos = null;
      pressAt = null;
      setState('visible');
    },
    pointerMove: function(x, y) {
      if (!onShield()) return;
      if (state === 'hidden') {
        if (lastPos === null) { lastPos = { x: x, y: y }; return; }
        if (Math.abs(x - lastPos.x) <= FS_MOVE_SLOP_PX
          && Math.abs(y - lastPos.y) <= FS_MOVE_SLOP_PX) return;
      }
      lastPos = { x: x, y: y };
      show();
    },
    // A press anywhere but on the video.
    wake: function() {
      if (!onShield()) return;
      pressAt = null;
      show();
    },
    videoPress: function() {
      if (!onShield()) return;
      var now = opts.now();
      var isDouble = pressAt !== null && now - pressAt < opts.doublePressMs;
      show();
      if (isDouble) {
        pressAt = null;
        opts.onVideoDoubleClick();
      } else {
        pressAt = now;
        opts.onVideoClick();
      }
    },
    // The pointer crossed the hole's edge, either way.
    leaveToPlayer: function() {
      if (!onShield()) return;
      lastPos = null;
      pressAt = null;
      setState('vimeo');
      schedule(opts.vimeoMs, show);
    },
    // Play/pause, a seek, a volume, subtitle, quality or speed change. Only
    // ends Vimeo mode: the keyboard drives the player too, and only the mouse
    // counts as activity on the shield.
    playerEvent: function() {
      if (active && state === 'vimeo') show();
    },
    state: function() { return state; },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FS_CURSOR_IDLE_MS: FS_CURSOR_IDLE_MS,
    FS_VIMEO_MODE_MS: FS_VIMEO_MODE_MS,
    FS_DOUBLE_PRESS_MS: FS_DOUBLE_PRESS_MS,
    FS_MOVE_SLOP_PX: FS_MOVE_SLOP_PX,
    createCursorIdle: createCursorIdle,
    isVideoPress: isVideoPress,
    isHoleCrossing: isHoleCrossing,
    videoBox: videoBox,
  };
}
