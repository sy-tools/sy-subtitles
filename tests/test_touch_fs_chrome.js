const { test } = require('node:test');
const assert = require('node:assert');

const { createTouchFsChrome, FS_TOUCH_IDLE_MS } = require('../site/js/touch_fs_chrome.js');

const IDLE = 3000;

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
  const chrome = createTouchFsChrome({
    idleMs: IDLE,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onChange: (s) => changes.push(s),
  });
  return { clock, changes, chrome };
}

test('idle spell matches the desktop cursor', () => {
  assert.strictEqual(FS_TOUCH_IDLE_MS, 3000);
});

test('starts off: no fullscreen, nothing to show', () => {
  const { chrome } = setup();
  assert.strictEqual(chrome.state(), 'off');
});

test('entering fullscreen shows the controls, then hides them after the idle spell', () => {
  const { clock, chrome, changes } = setup();
  chrome.enter();
  assert.strictEqual(chrome.state(), 'visible');
  clock.advance(IDLE - 1);
  assert.strictEqual(chrome.state(), 'visible');
  clock.advance(1);
  assert.strictEqual(chrome.state(), 'hidden');
  assert.deepStrictEqual(changes, ['visible', 'hidden']);
});

test('activity brings hidden controls back and restarts the spell', () => {
  const { clock, chrome } = setup();
  chrome.enter();
  clock.advance(IDLE);
  chrome.activity();
  assert.strictEqual(chrome.state(), 'visible');
  clock.advance(IDLE - 1);
  chrome.activity();
  clock.advance(IDLE - 1);
  assert.strictEqual(chrome.state(), 'visible');
  clock.advance(1);
  assert.strictEqual(chrome.state(), 'hidden');
});

test('a tap on the exit button while hidden only reveals it, no exit', () => {
  const { clock, chrome } = setup();
  chrome.enter();
  clock.advance(IDLE);
  assert.strictEqual(chrome.leavesOnExitTap(), false);
  assert.strictEqual(chrome.state(), 'visible');
});

test('a tap on the exit button while shown asks to leave fullscreen', () => {
  const { chrome } = setup();
  chrome.enter();
  assert.strictEqual(chrome.leavesOnExitTap(), true);
});

test('leaving fullscreen turns it off and drops the timer', () => {
  const { clock, chrome } = setup();
  chrome.enter();
  chrome.exit();
  assert.strictEqual(chrome.state(), 'off');
  assert.strictEqual(clock.pending(), 0);
});

test('activity and exit taps outside fullscreen are ignored', () => {
  const { clock, chrome } = setup();
  chrome.activity();
  assert.strictEqual(chrome.leavesOnExitTap(), false);
  assert.strictEqual(chrome.state(), 'off');
  assert.strictEqual(clock.pending(), 0);
});

test('entering twice does not restart from scratch', () => {
  const { clock, chrome, changes } = setup();
  chrome.enter();
  clock.advance(IDLE);
  chrome.enter();
  assert.strictEqual(chrome.state(), 'hidden');
  assert.deepStrictEqual(changes, ['visible', 'hidden']);
});
