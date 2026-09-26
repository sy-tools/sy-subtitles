// Fullscreen cursor auto-hide: after FS_CURSOR_IDLE_MS without pointer activity
// the fullscreen preview hides the mouse cursor; a real pointer move brings it
// back. Single source: site/js/cursor_idle.js (loaded by the SPA, require'd here).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { createCursorIdle, FS_CURSOR_IDLE_MS } = require('../site/js/cursor_idle.js');

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimer(fn, ms) { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimer(id) { timers.delete(id); },
    advance(ms) {
      now += ms;
      for (const [id, t] of [...timers]) {
        if (t.at <= now && timers.has(id)) { timers.delete(id); t.fn(); }
      }
    },
    pending() { return timers.size; },
  };
}

function setup() {
  const clock = fakeClock();
  const changes = [];
  const idle = createCursorIdle({
    delayMs: 5000,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onChange: (hidden) => changes.push(hidden),
  });
  return { clock, changes, idle };
}

test('the idle delay is five seconds', () => {
  assert.strictEqual(FS_CURSOR_IDLE_MS, 5000);
});

test('hides the cursor once the delay passes after entering fullscreen', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(4999);
  assert.deepStrictEqual(changes, []);
  assert.strictEqual(idle.isIdle(), false);
  clock.advance(1);
  assert.deepStrictEqual(changes, [true]);
  assert.strictEqual(idle.isIdle(), true);
});

test('does nothing outside fullscreen', () => {
  const { clock, changes, idle } = setup();
  idle.pointerMove(10, 10);
  idle.pointerDown();
  idle.nudge();
  clock.advance(60000);
  assert.deepStrictEqual(changes, []);
  assert.strictEqual(clock.pending(), 0);
});

test('a pointer move before the delay restarts the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(4000);
  idle.pointerMove(10, 10);
  clock.advance(4000);
  assert.deepStrictEqual(changes, []);
  clock.advance(1000);
  assert.deepStrictEqual(changes, [true]);
});

test('player activity (seek, volume, play/pause) restarts the countdown while visible', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(4000);
  idle.nudge();
  clock.advance(4000);
  assert.deepStrictEqual(changes, []);
  clock.advance(1000);
  assert.deepStrictEqual(changes, [true]);
});

test('player activity does not reveal a hidden cursor', () => {
  // Space / arrow keys drive the player too; the keyboard must not bring the
  // cursor back, only the mouse does.
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(5000);
  idle.nudge();
  assert.deepStrictEqual(changes, [true]);
  assert.strictEqual(idle.isIdle(), true);
});

test('a real move after hiding reveals the cursor and re-arms the timer', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(5000);
  idle.pointerMove(100, 100); // anchors the position, not yet a move
  idle.pointerMove(103, 100);
  assert.deepStrictEqual(changes, [true, false]);
  assert.strictEqual(idle.isIdle(), false);
  clock.advance(5000);
  assert.deepStrictEqual(changes, [true, false, true]);
});

test('a move event at the same position does not reveal the cursor', () => {
  // Browsers dispatch a mousemove without any physical movement when the
  // element under a resting pointer changes — which is exactly what the
  // shield appearing does. Only a changed position counts as activity.
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(5000);
  idle.pointerMove(100, 100);
  idle.pointerMove(100, 100);
  idle.pointerMove(100, 100);
  assert.deepStrictEqual(changes, [true]);
  assert.strictEqual(idle.isIdle(), true);
});

test('each hide starts with a fresh anchor', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(5000);
  idle.pointerMove(100, 100);
  idle.pointerMove(200, 200);
  clock.advance(5000);
  idle.pointerMove(200, 200);
  assert.deepStrictEqual(changes, [true, false, true]);
  idle.pointerMove(201, 200);
  assert.deepStrictEqual(changes, [true, false, true, false]);
});

test('a press reveals a hidden cursor at once', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(5000);
  idle.pointerDown();
  assert.deepStrictEqual(changes, [true, false]);
});

test('leaving fullscreen while hidden reveals the cursor and stops the timer', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(5000);
  idle.exit();
  assert.deepStrictEqual(changes, [true, false]);
  assert.strictEqual(clock.pending(), 0);
  clock.advance(60000);
  assert.deepStrictEqual(changes, [true, false]);
});

test('leaving fullscreen before the delay cancels the pending hide', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(3000);
  idle.exit();
  clock.advance(60000);
  assert.deepStrictEqual(changes, []);
  assert.strictEqual(clock.pending(), 0);
});

test('entering twice keeps a single pending timer', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  idle.enter();
  assert.strictEqual(clock.pending(), 1);
  clock.advance(5000);
  assert.deepStrictEqual(changes, [true]);
});

test('entering again while in fullscreen does not restart the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(4000);
  idle.enter();
  clock.advance(1000);
  assert.deepStrictEqual(changes, [true]);
});

test('entering again while hidden keeps the cursor hidden without a new timer', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(5000);
  idle.enter();
  assert.deepStrictEqual(changes, [true]);
  assert.strictEqual(idle.isIdle(), true);
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
