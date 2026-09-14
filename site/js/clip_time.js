// Clip time — the text form of a fragment boundary in the render panel.
//
// Milliseconds, not whole seconds: the "set current player time" button
// captures the player position at the highest precision the player reports,
// and a fragment boundary a frame off is visible in the render as a clipped
// word. So the field shows every millisecond the button captured, and reads
// back exactly what it shows: parseClipTime(formatClipTime(ms)) is ms.
//
// Single source shared by index.html (<script src>) and the node test suite.
(function (root) {
  'use strict';

  function pad(n, width) {
    var s = String(n);
    while (s.length < width) s = '0' + s;
    return s;
  }

  // H:MM:SS.mmm from the first hour on, MM:SS.mmm below it. `opts.trimZeroMs`
  // drops a millisecond part that is exactly zero; any other fraction stays,
  // because it is precision the player reported.
  //
  // A value that is not a number writes nothing rather than 00:00: an empty
  // field is refused on read, so an unknown time surfaces as a named problem
  // instead of a boundary that quietly renders from the start of the talk.
  function formatClipTime(ms, opts) {
    if (typeof ms !== 'number' || !isFinite(ms)) return '';
    // Round before splitting into fields, or 59.9996 s prints as 00:59.1000.
    var total = Math.max(0, Math.round(ms));
    var frac = total % 1000;
    var seconds = Math.floor(total / 1000);
    var hours = Math.floor(seconds / 3600);
    var clock = (hours > 0 ? hours + ':' : '')
      + pad(Math.floor(seconds / 60) % 60, 2) + ':' + pad(seconds % 60, 2);
    if (opts && opts.trimZeroMs && frac === 0) return clock;
    return clock + '.' + pad(frac, 3);
  }

  // S, M:SS or H:MM:SS, with an optional fraction. Every field after the first
  // is exactly two digits below 60, so "1:5" is refused rather than guessed as
  // 1:05 or 1:50; the first field is unbounded, so ninety minutes can be typed
  // as 90:00. The fraction takes a comma as well as a dot — the Ukrainian
  // decimal separator — and is right-padded: ".5" is half a second.
  var CLIP_TIME_RE = /^(\d+)((?::[0-5]\d){0,2})(?:[.,](\d{1,3}))?$/;

  // Integer milliseconds, or null for anything that does not name exactly one
  // time.
  function parseClipTime(text) {
    if (typeof text !== 'string') return null;
    var m = CLIP_TIME_RE.exec(text.trim());
    if (!m) return null;
    var fields = [m[1]].concat(m[2] ? m[2].slice(1).split(':') : []);
    var seconds = 0;
    for (var i = 0; i < fields.length; i++) seconds = seconds * 60 + Number(fields[i]);
    var ms = seconds * 1000 + (m[3] ? Number((m[3] + '00').slice(0, 3)) : 0);
    // Past 2^53 the sum is no longer an exact millisecond.
    return Number.isSafeInteger(ms) ? ms : null;
  }

  var api = {
    formatClipTime: formatClipTime,
    parseClipTime: parseClipTime
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (k) { root[k] = api[k]; });
})(typeof window !== 'undefined' ? window : this);
