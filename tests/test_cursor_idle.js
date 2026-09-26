// Fullscreen cursor auto-hide: the shield over the player hides the cursor
// after FS_CURSOR_IDLE_MS without a move and steps aside while Vimeo's own
// controls are in use. Single source: site/js/cursor_idle.js (loaded by the
// SPA, require'd here).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
  createCursorIdle, isVideoPress, videoBox,
  FS_CURSOR_IDLE_MS, FS_VIMEO_MODE_MS, FS_DOUBLE_PRESS_MS, FS_MOVE_SLOP_PX,
} = require('../site/js/cursor_idle.js');

const IDLE = 3000;
const VIMEO = 10000;
const DOUBLE = 500;

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
    idleMs: IDLE,
    vimeoMs: VIMEO,
    doublePressMs: DOUBLE,
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

test('the cursor hides after three seconds, as in Vimeo\'s own fullscreen', () => {
  assert.strictEqual(FS_CURSOR_IDLE_MS, 3000);
  assert.strictEqual(FS_VIMEO_MODE_MS, 10000);
  assert.ok(FS_DOUBLE_PRESS_MS > 0);
  assert.ok(FS_MOVE_SLOP_PX > 0);
});

test('hides the cursor once the delay passes after entering fullscreen', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(IDLE - 1);
  assert.deepStrictEqual(changes, []);
  clock.advance(1);
  assert.deepStrictEqual(changes, ['hidden']);
  assert.strictEqual(idle.state(), 'hidden');
});

test('does nothing outside fullscreen', () => {
  const { clock, changes, presses, idle } = setup();
  idle.pointerMove(10, 10);
  idle.wake();
  idle.videoPress();
  idle.leaveToPlayer();
  idle.playerEvent();
  clock.advance(60000);
  assert.deepStrictEqual(changes, []);
  assert.deepStrictEqual(presses, []);
  assert.strictEqual(clock.pending(), 0);
});

test('a move restarts the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(IDLE - 1000);
  idle.pointerMove(10, 10);
  clock.advance(IDLE - 1);
  assert.deepStrictEqual(changes, []);
  clock.advance(1);
  assert.deepStrictEqual(changes, ['hidden']);
});

test('a move beyond the slop reveals a hidden cursor and re-arms the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  idle.pointerMove(100, 100);
  hide(clock);
  idle.pointerMove(100 + FS_MOVE_SLOP_PX + 1, 100);
  assert.deepStrictEqual(changes, ['hidden', 'visible']);
  hide(clock);
  assert.deepStrictEqual(changes, ['hidden', 'visible', 'hidden']);
});

test('a move within the slop keeps the cursor hidden', () => {
  // The jitter of a hand resting on a mouse, or a browser's own move event
  // at the same spot, is no activity.
  const { clock, changes, idle } = setup();
  idle.enter();
  idle.pointerMove(100, 100);
  hide(clock);
  idle.pointerMove(100 + FS_MOVE_SLOP_PX, 100 - FS_MOVE_SLOP_PX);
  idle.pointerMove(100, 100);
  assert.deepStrictEqual(changes, ['hidden']);
});

test('with no move seen before hiding, the first one only anchors the position', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  hide(clock);
  idle.pointerMove(300, 300);
  assert.deepStrictEqual(changes, ['hidden']);
  idle.pointerMove(310, 300);
  assert.deepStrictEqual(changes, ['hidden', 'visible']);
});

test('leaving the shield for the player hands the pointer to Vimeo', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(1000);
  idle.leaveToPlayer();
  assert.deepStrictEqual(changes, ['vimeo']);
  clock.advance(VIMEO - 1);
  assert.deepStrictEqual(changes, ['vimeo']);
});

test('Vimeo keeps the pointer until the time runs out, then the shield is back', () => {
  // Nothing tells the page when Vimeo's menu closes without a choice.
  const { clock, changes, idle } = setup();
  idle.enter();
  idle.leaveToPlayer();
  clock.advance(VIMEO);
  assert.deepStrictEqual(changes, ['vimeo', 'visible']);
  clock.advance(IDLE);
  assert.deepStrictEqual(changes, ['vimeo', 'visible', 'hidden']);
});

test('any player event ends Vimeo mode: the choice closed the menu', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  idle.leaveToPlayer();
  clock.advance(2000);
  idle.playerEvent();
  assert.deepStrictEqual(changes, ['vimeo', 'visible']);
  clock.advance(IDLE);
  assert.deepStrictEqual(changes, ['vimeo', 'visible', 'hidden']);
});

test('player events do not reveal a hidden cursor or restart the countdown', () => {
  // Space and the arrow keys drive the player too; only the mouse counts.
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(IDLE - 1000);
  idle.playerEvent();
  clock.advance(1000);
  idle.playerEvent();
  assert.deepStrictEqual(changes, ['hidden']);
});

test('a press on the shield is a click on the video, and shows the cursor', () => {
  const { clock, changes, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click']);
  assert.deepStrictEqual(changes, ['hidden', 'visible']);
  hide(clock);
  assert.deepStrictEqual(changes, ['hidden', 'visible', 'hidden']);
});

test('a second press within the double-press window is a double click, not another click', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  idle.videoPress();
  clock.advance(DOUBLE - 1);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'double']);
});

test('presses further apart are two single clicks', () => {
  const { clock, presses, idle } = setup();
  idle.enter();
  idle.videoPress();
  clock.advance(DOUBLE);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'click']);
});

test('a third quick press starts a new click rather than another double', () => {
  const { presses, idle } = setup();
  idle.enter();
  idle.videoPress();
  idle.videoPress();
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'double', 'click']);
});

test('a double click survives jitter between its presses', () => {
  const { presses, idle } = setup();
  idle.enter();
  idle.pointerMove(640, 300);
  idle.videoPress();
  idle.pointerMove(641, 300);
  idle.pointerMove(642, 301);
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'double']);
});

test('any other press shows the cursor and never counts toward a double click', () => {
  const { clock, changes, presses, idle } = setup();
  idle.enter();
  hide(clock);
  idle.videoPress();
  idle.wake();
  idle.videoPress();
  assert.deepStrictEqual(presses, ['click', 'click']);
  assert.deepStrictEqual(changes, ['hidden', 'visible']);
});

test('presses mean nothing while Vimeo has the pointer', () => {
  const { changes, presses, idle } = setup();
  idle.enter();
  idle.leaveToPlayer();
  idle.videoPress();
  idle.wake();
  assert.deepStrictEqual(presses, []);
  assert.deepStrictEqual(changes, ['vimeo']);
});

test('leaving fullscreen shows the cursor and stops every timer', () => {
  for (const before of ['hidden', 'vimeo']) {
    const { clock, changes, idle } = setup();
    idle.enter();
    if (before === 'hidden') hide(clock); else idle.leaveToPlayer();
    idle.exit();
    assert.deepStrictEqual(changes, [before, 'visible'], before);
    assert.strictEqual(clock.pending(), 0, before);
  }
});

test('entering again while in fullscreen does not restart the countdown', () => {
  const { clock, changes, idle } = setup();
  idle.enter();
  clock.advance(IDLE - 1000);
  idle.enter();
  clock.advance(1000);
  assert.deepStrictEqual(changes, ['hidden']);
});

test('exit without enter is a no-op', () => {
  const { clock, changes, idle } = setup();
  idle.exit();
  assert.deepStrictEqual(changes, []);
  assert.strictEqual(clock.pending(), 0);
});

const BOX = { left: 100, right: 1300, top: 0, bottom: 900 };

function press(over) {
  return Object.assign({
    onShield: true, pointerType: 'mouse', button: 0, ctrlKey: false,
    x: 700, y: 300, box: BOX,
  }, over);
}

test('a primary mouse press on the video is a video press', () => {
  assert.strictEqual(isVideoPress(press()), true);
  assert.strictEqual(isVideoPress(press({ y: 899 })), true);
});

test('a press on the letterbox or pillarbox bars is not a video press', () => {
  // On the bare player the bars do nothing.
  assert.strictEqual(isVideoPress(press({ x: 99 })), false);
  assert.strictEqual(isVideoPress(press({ x: 1300 })), false);
  assert.strictEqual(isVideoPress(press({ y: 900 })), false);
  assert.strictEqual(isVideoPress(press({ y: -1 })), false);
});

test('touch, pen, secondary buttons, ctrl-click and presses off the shield are not video presses', () => {
  assert.strictEqual(isVideoPress(press({ onShield: false })), false);
  assert.strictEqual(isVideoPress(press({ pointerType: 'touch' })), false);
  assert.strictEqual(isVideoPress(press({ pointerType: 'pen' })), false);
  assert.strictEqual(isVideoPress(press({ button: 2 })), false);
  assert.strictEqual(isVideoPress(press({ ctrlKey: true })), false);
});

test('the video box is the largest box of its aspect centred in the player', () => {
  const pillar = { left: 0, top: 0, width: 1280, height: 720 };
  assert.deepStrictEqual(videoBox(pillar, '640 / 480'), { left: 160, right: 1120, top: 0, bottom: 720 });
  const letter = { left: 0, top: 0, width: 1024, height: 1000 };
  assert.deepStrictEqual(videoBox(letter, '640 / 480'), { left: 0, right: 1024, top: 116, bottom: 884 });
});

test('an unknown aspect falls back to 16:9, as the fullscreen CSS does', () => {
  const r = { left: 0, top: 0, width: 1600, height: 1600 };
  assert.deepStrictEqual(videoBox(r, ''), { left: 0, right: 1600, top: 350, bottom: 1250 });
  assert.deepStrictEqual(videoBox(r, 'garbage'), videoBox(r, ''));
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
