// The preview's mark hotkey answers to the letter M in both of the reviewers'
// layouts, read either way round: the M key itself (Latin m, Ukrainian ь) and
// the key that carries the Ukrainian м (Latin v). Matched on `key`, not on the
// physical `code`, so a layout that moves M still finds it by its letter.
var MARK_KEYS = ['m', 'ь', 'м', 'v'];
// The F key gives Ukrainian а.
var FULLSCREEN_KEYS = ['f', 'а'];

function isPlainPress(e) {
  if (!e || typeof e.key !== 'string') return false;
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  return !(e.isComposing || e.repeat);
}

function isMarkKey(e) {
  return isPlainPress(e) && MARK_KEYS.indexOf(e.key.toLowerCase()) !== -1;
}

function isFullscreenKey(e) {
  return isPlainPress(e) && FULLSCREEN_KEYS.indexOf(e.key.toLowerCase()) !== -1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isMarkKey: isMarkKey, isFullscreenKey: isFullscreenKey };
}
