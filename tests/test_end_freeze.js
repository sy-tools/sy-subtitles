// End-freeze decision logic: pause the fullscreen preview player just before
// the video ends so the Vimeo "more from this user" end screen never appears.
// Single source: site/js/end_freeze.js (loaded by the SPA, require'd here).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { endFreezeAction, END_FREEZE_EPSILON_SEC } = require('../site/js/end_freeze.js');

const DUR = 3600; // seconds, a typical talk

function state(over) {
  return Object.assign({ fsMode: true, sec: 0, duration: DUR, frozen: false }, over);
}

test('freezes in fullscreen once inside the epsilon window before the end', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR - 0.1 })), 'freeze');
});

test('freezes exactly at the threshold boundary', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR - END_FREEZE_EPSILON_SEC })), 'freeze');
});

test('does nothing before the threshold', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR - END_FREEZE_EPSILON_SEC - 0.01 })), null);
});

test('never freezes outside fullscreen mode', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR - 0.1, fsMode: false })), null);
});

test('does not re-pause while frozen (viewer may play through the tail)', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR - 0.1, frozen: true })), null);
});

test('unfreezes when the viewer rewinds below the threshold', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR / 2, frozen: true })), 'unfreeze');
});

test('unfreezes on rewind even after leaving fullscreen', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR / 2, frozen: true, fsMode: false })), 'unfreeze');
});

test('no unfreeze churn when not frozen below the threshold', () => {
  assert.strictEqual(endFreezeAction(state({ sec: DUR / 2 })), null);
});

test('inert without a usable duration', () => {
  for (const duration of [undefined, null, 0, -5, NaN, Infinity]) {
    assert.strictEqual(endFreezeAction(state({ sec: 10, duration })), null, 'duration=' + duration);
  }
});

test('inert on degenerate durations shorter than the epsilon window', () => {
  assert.strictEqual(endFreezeAction(state({ sec: 0, duration: END_FREEZE_EPSILON_SEC / 2 })), null);
});

test('inert on a missing or malformed state', () => {
  assert.strictEqual(endFreezeAction(null), null);
  assert.strictEqual(endFreezeAction({}), null);
  assert.strictEqual(endFreezeAction(state({ sec: NaN })), null);
});

// Wiring guards: the module must actually be loaded and used by the SPA.
test('index.html loads end_freeze.js and calls endFreezeAction', () => {
  const html = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');
  assert.ok(html.includes('<script src="js/end_freeze.js"></script>'),
    'index.html must load js/end_freeze.js');
  assert.ok(html.includes('endFreezeAction('),
    'index.html must call endFreezeAction from the overlay loop');
});
