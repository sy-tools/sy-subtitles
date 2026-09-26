// Fullscreen cursor auto-hide: after FS_CURSOR_IDLE_MS without pointer activity
// the fullscreen preview hides the mouse cursor; a real pointer move brings it
// back. Single source: site/js/cursor_idle.js (loaded by the SPA, require'd here).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
  createCursorIdle, isVideoPress,
  FS_CURSOR_IDLE_MS, FS_CURSOR_PROBE_MS, FS_DOUBLE_PRESS_MS, FS_KEY_ECHO_MS,
  FS_MOVE_SLOP_PX, FS_CONTROL_STRIP_PX,
} = require('../site/js/cursor_idle.js');

const IDLE = 5000;
const PROBE = 1000;
const QUIET = IDLE - PROBE;
const DOUBLE = 500;
const KEY_ECHO = 1000;

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    now() { return now; },
    setTimer(fn, ms) { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimer(id) { timers.delete(id); },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = [...timers].filter(([, t]) => t.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = until;
    },
    pending() { return timers.size; },
  };
}

function setup() {
  const clock = fakeClock();
  const changes = [];
  const presses = [];
  const idle = createCursorIdle({
    delayMs: IDLE,
    probeMs: PROBE,
    doublePressMs: DOUBLE,
    keyEchoMs: KEY_ECHO,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onChange: (state) => changes.push(state),
    onVideoClick: () => presses.push('click'),
    onVideoDoubleClick: () => presses.push('double'),
  });
  return { clock, changes, presses, idle };
}

function hide(clock) { clock.advance(IDLE); }

test('the cursor hides after five seconds, the last one spent probing', () => {
  assert.strictEqual(FS_CURSOR_IDLE_MS, 5000);
  assert.strictEqual(FS_CURSOR_PROBE_MS, 1000);
  assert.ok(FS_DOUBLE_PRESS_MS > 0);
  assert.ok(FS_KEY_ECHO_MS > 0);
});

test('probes, then hides, once the delay passes after entering fullscreen', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET - 1);
  assert.deepStrictEqual(changes, []);
  clock.advance(1);
  assert.deepStrictEqual(changes, ['probe']);
  assert.strictEqual(idle.state(), 'probe');
  clock.advance(PROBE - 1);
  assert.deepStrictEqual(changes, ['probe']);
  clock.advance(1);
  assert.deepStrictEqual(changes, ['probe', 'hidden']);
  assert.strictEqual(idle.state(), 'hidden');
});

test('does nothing outside fullscreen', () => {
  const { clock, changes, idle } = setup();
  idle.pointerMove(10, 10);
  idle.wake();
  idle.videoPress();
  idle.playerEvent('seeked');
  clock.advance(60000);
  assert.deepStrictEqual(changes, []);
  assert.strictEqual(clock.pending(), 0);
});

test('a pointer move before the probe restarts the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET - 1000);
  idle.pointerMove(10, 10);
  clock.advance(QUIET - 1);
  assert.deepStrictEqual(changes, []);
  clock.advance(1);
  assert.deepStrictEqual(changes, ['probe']);
});

test('a move during the probe is a false alarm: back to visible, never hidden', () => {
  // The pointer was moving over the cross-origin iframe all along, where the
  // page could not see it; the probe shield is the first place it can.
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET);
  idle.pointerMove(100, 100);
  idle.pointerMove(110, 100);
  assert.deepStrictEqual(changes, ['probe', 'visible']);
  clock.advance(QUIET - 1);
  assert.deepStrictEqual(changes, ['probe', 'visible']);
});

test('player activity (seek, volume, play/pause) restarts the countdown while visible', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET - 1000);
  idle.playerEvent('volumechange');
  clock.advance(QUIET - 1);
  assert.deepStrictEqual(changes, []);
  clock.advance(1);
  assert.deepStrictEqual(changes, ['probe']);
});

test('play and pause neither end a probe nor reveal a hidden cursor', () => {
  // Space drives the player too, and so does a click on the video itself; the
  // cursor comes back only for the mouse.
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET);
  idle.playerEvent('pause');
  clock.advance(PROBE);
  idle.playerEvent('play');
  assert.deepStrictEqual(changes, ['probe', 'hidden']);
});

test('a seek or volume change right after a key does not reveal a hidden cursor', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(IDLE);
  idle.key();
  clock.advance(KEY_ECHO - 1);
  idle.playerEvent('seeked');
  idle.playerEvent('volumechange');
  assert.deepStrictEqual(changes, ['probe', 'hidden']);
});

test('a seek or volume change with no key before it reveals the cursor', () => {
  // A drag on Vimeo's own seek or volume bar holds the pointer inside the
  // iframe, where the page sees none of it; the change is the only trace.
  for (const ev of ['seeked', 'volumechange']) {
    const { clock, changes, idle } = setup();
    idle.enter();
    idle.key();
    clock.advance(IDLE);
    idle.playerEvent(ev);
    assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible'], ev);
    clock.advance(QUIET);
    assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible', 'probe'], ev);
  }
});

test('a real move after hiding reveals the cursor and re-arms the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.pointerMove(100, 100); // anchors the position, not yet a move
  idle.pointerMove(110, 100);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible']);
  hide(clock);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible', 'probe', 'hidden']);
});

test('a move event at the same position does not count as a move', () => {
  // A browser may dispatch a mousemove without any physical movement when the
  // element under a resting pointer changes — as the shield appearing does.
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET);
  idle.pointerMove(100, 100);
  idle.pointerMove(100, 100);
  clock.advance(PROBE);
  idle.pointerMove(100, 100);
  assert.deepStrictEqual(changes, ['probe', 'hidden']);
});

test('a move within the slop is not a move', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.pointerMove(100, 100);
  idle.pointerMove(100 + FS_MOVE_SLOP_PX, 100 - FS_MOVE_SLOP_PX);
  assert.deepStrictEqual(changes, ['probe', 'hidden']);
  idle.pointerMove(100 + FS_MOVE_SLOP_PX + 1, 100);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible']);
});

test('a double click survives a pixel of jitter between its presses', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  idle.pointerMove(641, 300);
  idle.pointerMove(642, 301);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'double']);
});

test('each shield starts with a fresh anchor', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.pointerMove(100, 100);
  idle.pointerMove(200, 200);
  hide(clock);
  idle.pointerMove(200, 200);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible', 'probe', 'hidden']);
  idle.pointerMove(210, 200);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible', 'probe', 'hidden', 'visible']);
});

test('any other press reveals the cursor and re-arms the countdown', () => {
  const { clock, changes, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.wake();
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible']);
  assert.deepStrictEqual(presses, []);
  clock.advance(QUIET);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible', 'probe']);
});

test('a press on the shield is a click on the video', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click']);
});

test('a press on the probing shield is a click on the video too', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  clock.advance(QUIET);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click']);
});

test('the shield stays up after a video click, with the cursor showing', () => {
  // The second press of a double click has to land on the shield too.
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  assert.strictEqual(idle.state(), 'probe');
  clock.advance(IDLE - 1);
  assert.strictEqual(idle.state(), 'probe');
  clock.advance(1);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'probe', 'hidden']);
});

test('a real move after a video click takes the shield down', () => {
  const { clock, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  idle.pointerMove(100, 100);
  idle.pointerMove(110, 100);
  assert.strictEqual(idle.state(), 'visible');
});

test('a second press within the double-press window is a double click, not another click', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  clock.advance(DOUBLE - 1);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'double']);
});

test('presses further apart are two single clicks', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  clock.advance(DOUBLE);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'click']);
});

test('a third quick press starts a new click rather than another double', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  idle.videoPress();
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'double', 'click']);
});

test('a press on the visible page never counts toward a double click', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  idle.wake();
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'click']);
});

test('leaving fullscreen while hidden reveals the cursor and stops the timer', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.exit();
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible']);
  assert.strictEqual(clock.pending(), 0);
  clock.advance(60000);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible']);
});

test('leaving fullscreen mid-probe takes the shield down and stops the timer', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET);
  idle.exit();
  assert.deepStrictEqual(changes, ['probe', 'visible']);
  assert.strictEqual(clock.pending(), 0);
});

test('leaving fullscreen before the probe cancels the pending hide', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET - 1000);
  idle.exit();
  clock.advance(60000);
  assert.deepStrictEqual(changes, []);
  assert.strictEqual(clock.pending(), 0);
});

test('entering again while in fullscreen does not restart the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET - 1000);
  idle.enter();
  clock.advance(1000);
  assert.deepStrictEqual(changes, ['probe']);
});

test('entering again while hidden keeps the cursor hidden without a new timer', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.enter();
  assert.deepStrictEqual(changes, ['probe', 'hidden']);
  assert.strictEqual(idle.state(), 'hidden');
  assert.strictEqual(clock.pending(), 0);
});

test('exit without enter is a no-op', () => {
  const { clock, changes, idle } = setup();
  idle.exit();
  assert.deepStrictEqual(changes, []);
  assert.strictEqual(clock.pending(), 0);
});

function press(over) {
  return Object.assign({
    onShield: true, pointerType: 'mouse', button: 0, ctrlKey: false,
    y: 300, bottom: 900,
  }, over);
}

test('a primary mouse press on the shield above the control strip is a video press', () => {
  assert.strictEqual(isVideoPress(press()), true);
  assert.strictEqual(isVideoPress(press({ y: 900 - FS_CONTROL_STRIP_PX - 1 })), true);
});

test('a press in the control strip is not a video press', () => {
  // Vimeo's control bar sits there: the press is likelier aimed at a control
  // the shield happens to cover than at the video.
  assert.strictEqual(isVideoPress(press({ y: 900 - FS_CONTROL_STRIP_PX })), false);
  assert.strictEqual(isVideoPress(press({ y: 899 })), false);
});

test('touch, pen, secondary buttons, ctrl-click and presses off the shield are not video presses', () => {
  assert.strictEqual(isVideoPress(press({ onShield: false })), false);
  assert.strictEqual(isVideoPress(press({ pointerType: 'touch' })), false);
  assert.strictEqual(isVideoPress(press({ pointerType: 'pen' })), false);
  assert.strictEqual(isVideoPress(press({ button: 2 })), false);
  assert.strictEqual(isVideoPress(press({ ctrlKey: true })), false);
});

test('index.html loads cursor_idle.js and builds the controller', () => {
  const html = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');
  assert.ok(html.includes('<script src="js/cursor_idle.js"></script>'),
    'index.html must load js/cursor_idle.js');
  assert.ok(html.includes('createCursorIdle('),
    'index.html must build the fullscreen cursor-idle controller');
  assert.ok(html.includes('id="fs-idle-shield"'),
    'index.html must carry the #fs-idle-shield element');
});
