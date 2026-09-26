// Fullscreen cursor auto-hide: after FS_CURSOR_IDLE_MS without pointer activity
// the fullscreen preview hides the mouse cursor; a real pointer move brings it
// back. Single source: site/js/cursor_idle.js (loaded by the SPA, require'd here).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
  createCursorIdle, FS_CURSOR_IDLE_MS, FS_CURSOR_PROBE_MS,
} = require('../site/js/cursor_idle.js');

const IDLE = 5000;
const PROBE = 1000;
const QUIET = IDLE - PROBE;

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
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
  const idle = createCursorIdle({
    delayMs: IDLE,
    probeMs: PROBE,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onChange: (state) => changes.push(state),
  });
  return { clock, changes, idle };
}

function hide(clock) { clock.advance(IDLE); }

test('the cursor hides after five seconds, the last one spent probing', () => {
  assert.strictEqual(FS_CURSOR_IDLE_MS, 5000);
  assert.strictEqual(FS_CURSOR_PROBE_MS, 1000);
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
  assert.strictEqual(idle.pointerDown(), false);
  idle.nudge();
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
  idle.pointerMove(104, 100);
  assert.deepStrictEqual(changes, ['probe', 'visible']);
  clock.advance(QUIET - 1);
  assert.deepStrictEqual(changes, ['probe', 'visible']);
});

test('player activity (seek, volume, play/pause) restarts the countdown while visible', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET - 1000);
  idle.nudge();
  clock.advance(QUIET - 1);
  assert.deepStrictEqual(changes, []);
  clock.advance(1);
  assert.deepStrictEqual(changes, ['probe']);
});

test('player activity neither ends a probe nor reveals a hidden cursor', () => {
  // Space / arrow keys drive the player too; the keyboard must not bring the
  // cursor back, only the mouse does.
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(QUIET);
  idle.nudge();
  clock.advance(PROBE);
  idle.nudge();
  assert.deepStrictEqual(changes, ['probe', 'hidden']);
});

test('a real move after hiding reveals the cursor and re-arms the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.pointerMove(100, 100); // anchors the position, not yet a move
  idle.pointerMove(103, 100);
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

test('each shield starts with a fresh anchor', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.pointerMove(100, 100);
  idle.pointerMove(200, 200);
  hide(clock);
  idle.pointerMove(200, 200);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible', 'probe', 'hidden']);
  idle.pointerMove(201, 200);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible', 'probe', 'hidden', 'visible']);
});

test('a press while hidden reveals the cursor and reports a blind press', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  assert.strictEqual(idle.pointerDown(), true);
  assert.deepStrictEqual(changes, ['probe', 'hidden', 'visible']);
});

test('a press while probing or visible is not blind', () => {
  // During the probe the cursor is still on screen, so the press may be aimed
  // at a player control the shield happens to cover.
  const { clock, changes, idle } = setup();
  idle.enter();
  assert.strictEqual(idle.pointerDown(), false);
  clock.advance(QUIET);
  assert.strictEqual(idle.pointerDown(), false);
  assert.deepStrictEqual(changes, ['probe', 'visible']);
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

test('index.html loads cursor_idle.js and builds the controller', () => {
  const html = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');
  assert.ok(html.includes('<script src="js/cursor_idle.js"></script>'),
    'index.html must load js/cursor_idle.js');
  assert.ok(html.includes('createCursorIdle('),
    'index.html must build the fullscreen cursor-idle controller');
  assert.ok(html.includes('id="fs-idle-shield"'),
    'index.html must carry the #fs-idle-shield element');
});
