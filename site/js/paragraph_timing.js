// Transcript-mode video sync: which stretch of the video each transcript
// paragraph is spoken in. Single source: loaded by the browser via
// <script src="js/paragraph_timing.js"> in site/index.html AND required by the
// Node test suite — no inline mirror.
(function (root) {
  'use strict';

  // Map transcript paragraphs to SRT-block time spans so the review-page
  // transcript mode can piggy-back on SyncPlayer's existing seek & highlight
  // logic. Returns an array the same length as `paragraphs`; each entry is
  // `{startMs, endMs}` when the paragraph text was located inside the SRT,
  // otherwise `null` (paragraph stays click-inert). Monotonic search: each
  // paragraph is looked up AFTER the previous match, so repeated phrases
  // downstream don't snap back to earlier blocks.
  function matchParagraphsToSrt(paragraphs, srtBlocks) {
    var normalize = function(s) {
      return String(s || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    var flat = '';
    var charBlock = [];
    for (var b = 0; b < srtBlocks.length; b++) {
      var nt = normalize(srtBlocks[b].text);
      if (!nt) continue;
      if (flat) { flat += ' '; charBlock.push(b); }
      for (var c = 0; c < nt.length; c++) charBlock.push(b);
      flat += nt;
    }
    var shrinkToWordBoundary = function(s, minLen) {
      while (s.length > minLen) {
        var cut = s.lastIndexOf(' ');
        if (cut === -1 || cut < minLen) return s.length >= minLen ? s : '';
        s = s.slice(0, cut);
      }
      return s;
    };
    var MIN_PROBE = 10;   // roughly 2 short words
    var MAX_PROBE = 60;
    var results = [];
    var searchFrom = 0;
    for (var p = 0; p < paragraphs.length; p++) {
      var np = normalize(paragraphs[p]);
      if (!np) { results.push(null); continue; }
      // Fast path: whole paragraph appears verbatim in flat.
      var startIdx = flat.indexOf(np, searchFrom);
      var endIdx = startIdx !== -1 ? startIdx + np.length - 1 : -1;
      // Fallback: shrink a head probe word-by-word until we find a start
      // (tolerates local edits that diverge after the first few words).
      if (startIdx === -1 && np.length >= MIN_PROBE) {
        var probe = np.slice(0, MAX_PROBE);
        while (probe.length >= MIN_PROBE) {
          var si = flat.indexOf(probe, searchFrom);
          if (si !== -1) { startIdx = si; break; }
          var trimmed = shrinkToWordBoundary(probe.slice(0, probe.length - 1), MIN_PROBE);
          if (!trimmed || trimmed === probe) break;
          probe = trimmed;
        }
        if (startIdx !== -1) {
          // Try a tail probe for a tighter endMs; otherwise fall back to the
          // start block's own end — any proportional interpolation would lie
          // about timing, so we prefer an honest single-block span.
          var tail = np.slice(-MAX_PROBE);
          while (tail.length >= MIN_PROBE) {
            var ei = flat.indexOf(tail, startIdx + probe.length);
            if (ei !== -1) { endIdx = ei + tail.length - 1; break; }
            var trimmedTail = shrinkToWordBoundary(tail.slice(1), MIN_PROBE);
            if (!trimmedTail || trimmedTail === tail) break;
            tail = trimmedTail;
          }
          if (endIdx === -1) endIdx = startIdx + probe.length - 1;
        }
      }
      if (startIdx === -1) { results.push(null); continue; }
      if (endIdx >= flat.length) endIdx = flat.length - 1;
      var startBlock = srtBlocks[charBlock[startIdx]];
      var endBlock = srtBlocks[charBlock[endIdx]];
      results.push({ startMs: startBlock.startMs, endMs: endBlock.endMs });
      searchFrom = endIdx + 1;
    }
    return results;
  }

  var api = { matchParagraphsToSrt: matchParagraphsToSrt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (name) { root[name] = api[name]; });
})(typeof window !== 'undefined' ? window : this);
