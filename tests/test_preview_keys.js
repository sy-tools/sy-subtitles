const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { isMarkKey, isFullscreenKey } = require('../site/js/preview_keys.js');

function key(k, mods) { return Object.assign({ key: k }, mods || {}); }

test('M takes a mark in the Latin layout, either case', () => {
  assert.strictEqual(isMarkKey(key('m')), true);
  assert.strictEqual(isMarkKey(key('M')), true);
});

test('the M key in the Ukrainian layout (Ь) takes a mark', () => {
  assert.strictEqual(isMarkKey(key('ь')), true);
  assert.strictEqual(isMarkKey(key('Ь')), true);
});

test('the Ukrainian letter М (the V key) takes a mark', () => {
  assert.strictEqual(isMarkKey(key('м')), true);
  assert.strictEqual(isMarkKey(key('М')), true);
});

test('V (where Ukrainian М sits) takes a mark in the Latin layout', () => {
  assert.strictEqual(isMarkKey(key('v')), true);
  assert.strictEqual(isMarkKey(key('V')), true);
});

test('a modified press is a shortcut, never a mark (Cmd+V pastes)', () => {
  assert.strictEqual(isMarkKey(key('v', { metaKey: true })), false);
  assert.strictEqual(isMarkKey(key('v', { ctrlKey: true })), false);
  assert.strictEqual(isMarkKey(key('m', { altKey: true })), false);
});

test('a press mid-composition or an auto-repeat takes no mark', () => {
  assert.strictEqual(isMarkKey(key('m', { isComposing: true })), false);
  assert.strictEqual(isMarkKey(key('m', { repeat: true })), false);
});

test('other keys take no mark', () => {
  ['f', 'n', 'Ф', ' ', 'Enter', 'ArrowLeft', ''].forEach((k) => {
    assert.strictEqual(isMarkKey(key(k)), false, k);
  });
  assert.strictEqual(isMarkKey(null), false);
});

test('F toggles fullscreen in the Latin layout and as Ukrainian А', () => {
  ['f', 'F', 'а', 'А'].forEach((k) => assert.strictEqual(isFullscreenKey(key(k)), true, k));
});

test('a modified or repeated F is not the fullscreen key (Cmd+F finds)', () => {
  assert.strictEqual(isFullscreenKey(key('f', { metaKey: true })), false);
  assert.strictEqual(isFullscreenKey(key('f', { ctrlKey: true })), false);
  assert.strictEqual(isFullscreenKey(key('f', { repeat: true })), false);
  assert.strictEqual(isFullscreenKey(key('f', { isComposing: true })), false);
});

test('the Latin a is not the fullscreen key', () => {
  assert.strictEqual(isFullscreenKey(key('a')), false);
  assert.strictEqual(isFullscreenKey(key('m')), false);
});

test('index.html loads preview_keys.js and the service worker precaches it', () => {
  const site = path.join(__dirname, '..', 'site');
  const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
  assert.ok(html.includes('<script src="js/preview_keys.js"></script>'),
    'index.html must load js/preview_keys.js');
  const sw = fs.readFileSync(path.join(site, 'sw.js'), 'utf8');
  assert.ok(sw.includes("'js/preview_keys.js'"), 'sw.js must precache js/preview_keys.js');
});
