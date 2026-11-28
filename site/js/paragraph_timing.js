// Transcript-mode video sync: which stretch of the video each transcript
// paragraph is spoken in. Single source: loaded by the browser via
// <script src="js/paragraph_timing.js"> in site/index.html AND required by the
// Node test suite — no inline mirror.
//
// The subtitles are cut out of the transcript, so a block's text is a verbatim
// run of it — while a paragraph need not be in the subtitles at all (a title
// line, a remark, the puja after the talk, the part another video carries).
// So the block is what gets looked up, and a paragraph's time is read off the
// blocks that landed in it. Looking the paragraph up instead means guessing
// from its first and last words whether it is there, and one wrong guess moves
// every paragraph after it.
(function (root) {
  'use strict';

  function normalize(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // The paragraphs as one string, every word fenced by single spaces — so a
  // text searched as ' text ' can only be found on whole words.
  function flattenParagraphs(paragraphs) {
    var text = ' ';
    var starts = [];
    var owners = [];
    for (var p = 0; p < paragraphs.length; p++) {
      var words = normalize(paragraphs[p]);
      if (!words) continue;
      starts.push(text.length);
      owners.push(p);
      text += words + ' ';
    }
    return { text: text, starts: starts, owners: owners };
  }

  function paragraphAt(flat, pos) {
    var lo = 0, hi = flat.starts.length - 1;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (flat.starts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return flat.owners[lo];
  }

  function indexesOfLongestStrictlyIncreasingRun(values) {
    var tails = [];
    var before = [];
    for (var i = 0; i < values.length; i++) {
      var lo = 0, hi = tails.length;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (values[tails[mid]] < values[i]) lo = mid + 1; else hi = mid;
      }
      before[i] = lo > 0 ? tails[lo - 1] : -1;
      tails[lo] = i;
    }
    var run = [];
    for (var k = tails.length ? tails[tails.length - 1] : -1; k !== -1; k = before[k]) run.push(k);
    return run.reverse();
  }

  // A text the transcript holds exactly once can only be there. Taken together
  // those must also run in the transcript's order: one that does not is a
  // stray, and the longest run that agrees is kept.
  function placeUniqueTexts(flat, texts, at) {
    var blocks = [];
    var positions = [];
    texts.forEach(function(text, b) {
      if (!text) return;
      var needle = ' ' + text + ' ';
      var first = flat.text.indexOf(needle);
      if (first === -1 || flat.text.indexOf(needle, first + 1) !== -1) return;
      blocks.push(b);
      positions.push(first + 1);
    });
    indexesOfLongestStrictlyIncreasingRun(positions).forEach(function(i) { at[blocks[i]] = positions[i]; });
  }

  // Stretches of blocks with no place yet, each with the room the transcript
  // has for it: `from` is where a text following the placed block before it
  // would start, `to` the space in front of the placed block after it.
  //
  // A run at either end of the subtitles has a placed block on one side only.
  // Its other side is open: the transcript goes on there through text this
  // video may not carry, so its first or last words are no place to look. Only
  // when nothing is placed at all do the transcript's own ends stand in.
  function unplacedRuns(flat, texts, at) {
    var runs = [];
    var b = 0;
    while (b < texts.length) {
      if (at[b] !== -1) { b++; continue; }
      var first = b;
      while (b < texts.length && at[b] === -1) b++;
      runs.push({
        first: first,
        last: b - 1,
        from: first > 0 ? at[first - 1] + texts[first - 1].length + 1 : 1,
        to: b < texts.length ? at[b] - 1 : flat.text.length - 1,
        closedBefore: first > 0 || b === texts.length,
        closedAfter: b < texts.length || first === 0,
      });
    }
    return runs;
  }

  // A text the transcript holds several times ("Yes.") says nothing by itself;
  // its place is next to a neighbour whose place is known. Each run is walked
  // inwards from its closed ends, and never past the block on the other side.
  function placeNextToPlaced(flat, texts, at) {
    unplacedRuns(flat, texts, at).forEach(function(run) {
      var from = run.from, to = run.to;
      var i = run.first;
      for (; run.closedBefore && i <= run.last; i++) {
        if (!texts[i]) continue;
        if (from + texts[i].length > to || !flat.text.startsWith(texts[i] + ' ', from)) break;
        at[i] = from;
        from += texts[i].length + 1;
      }
      for (var j = run.last; run.closedAfter && j >= i; j--) {
        if (!texts[j]) continue;
        var start = to - texts[j].length;
        if (start < from || !flat.text.startsWith(' ' + texts[j], start - 1)) break;
        at[j] = start;
        to = start - 1;
      }
    });
  }

  // For each word of `ours`, the index of the word of `theirs` it pairs with
  // in a longest common subsequence of the two, or -1.
  function pairWords(theirs, ours) {
    var width = ours.length + 1;
    var longest = new Uint16Array((theirs.length + 1) * width);
    for (var i = 1; i <= theirs.length; i++) {
      for (var j = 1; j <= ours.length; j++) {
        longest[i * width + j] = theirs[i - 1] === ours[j - 1]
          ? longest[(i - 1) * width + j - 1] + 1
          : Math.max(longest[(i - 1) * width + j], longest[i * width + j - 1]);
      }
    }
    var pairs = ours.map(function() { return -1; });
    i = theirs.length;
    j = ours.length;
    while (i > 0 && j > 0) {
      if (theirs[i - 1] === ours[j - 1]) { pairs[j - 1] = i - 1; i--; j--; }
      else if (longest[(i - 1) * width + j] >= longest[i * width + j - 1]) i--;
      else j--;
    }
    return pairs;
  }

  // How many transcript words a run of blocks may step over on its way to a
  // placed neighbour: a remark the subtitles leave out sits between two blocks
  // or inside one, and this is the longest such remark still looked past.
  var REMARK_WORDS = 20;
  // The alignment table is words x words; a run too long for this many cells
  // is subtitles that were never cut from this transcript, and stays untimed.
  var ALIGN_CELLS_MAX = 1000000;

  // The transcript words a run can belong to: up to `reach` of them inwards
  // from each closed end of its room.
  function wordsBesideNeighbours(flat, run, reach) {
    var words = [];
    var at = [];
    var pos = run.from;
    flat.text.slice(run.from, run.to).split(' ').forEach(function(word) {
      if (word) { words.push(word); at.push(pos); }
      pos += word.length + 1;
    });
    if (run.closedBefore && run.closedAfter && words.length <= 2 * reach) return { words: words, at: at };
    var keep = function(list) {
      return (run.closedBefore ? list.slice(0, reach) : [])
        .concat(run.closedAfter ? list.slice(-reach) : []);
    };
    return { words: keep(words), at: keep(at) };
  }

  // A block still unplaced was reworded, or has a remark the subtitles leave
  // out in the middle of it. It lies between its placed neighbours all the
  // same, so the run's words are paired with the transcript's words beside
  // them. Shared words alone prove nothing — any two stretches of a talk share
  // some — so a run counts only if most of its words pair up, and a block in
  // it only if most of its own do; the block then goes to the paragraphs that
  // hold those words.
  function pairLeftoversWithParagraphs(flat, texts, at, give) {
    unplacedRuns(flat, texts, at).forEach(function(run) {
      var ours = [];
      var owner = [];
      for (var b = run.first; b <= run.last; b++) {
        if (!texts[b]) continue;
        texts[b].split(' ').forEach(function(word) { ours.push(word); owner.push(b); });
      }
      var theirs = wordsBesideNeighbours(flat, run, ours.length + REMARK_WORDS);
      var cells = ours.length * theirs.words.length;
      if (!cells || cells > ALIGN_CELLS_MAX) return;

      var pairs = pairWords(theirs.words, ours);
      var paired = 0;
      var found = {};
      var total = {};
      owner.forEach(function(b, w) {
        total[b] = (total[b] || 0) + 1;
        if (pairs[w] === -1) return;
        found[b] = (found[b] || 0) + 1;
        paired++;
      });
      if (paired * 2 <= ours.length) return;
      owner.forEach(function(b, w) {
        if (pairs[w] !== -1 && found[b] * 2 > total[b]) give(paragraphAt(flat, theirs.at[pairs[w]]), b);
      });
    });
  }

  // Returns an array the same length as `paragraphs`: `{startMs, endMs}` — from
  // the start of the first block in the paragraph to the end of the last — or
  // `null` when no block landed in it (the paragraph stays click-inert). No
  // time is ever interpolated: a paragraph has the times of its own blocks or
  // none.
  function matchParagraphsToSrt(paragraphs, srtBlocks) {
    var flat = flattenParagraphs(paragraphs);
    var results = paragraphs.map(function() { return null; });
    if (!flat.starts.length) return results;

    function give(p, b) {
      var block = srtBlocks[b];
      var span = results[p];
      if (!span) { results[p] = { startMs: block.startMs, endMs: block.endMs }; return; }
      span.startMs = Math.min(span.startMs, block.startMs);
      span.endMs = Math.max(span.endMs, block.endMs);
    }

    var texts = srtBlocks.map(function(block) { return normalize(block.text); });
    // Where each block's text starts in the flattened transcript, or -1.
    var at = texts.map(function() { return -1; });
    placeUniqueTexts(flat, texts, at);
    placeNextToPlaced(flat, texts, at);
    for (var b = 0; b < srtBlocks.length; b++) {
      if (at[b] === -1) continue;
      var lastPara = paragraphAt(flat, at[b] + texts[b].length - 1);
      for (var p = paragraphAt(flat, at[b]); p <= lastPara; p++) give(p, b);
    }
    pairLeftoversWithParagraphs(flat, texts, at, give);
    return results;
  }

  var api = { matchParagraphsToSrt: matchParagraphsToSrt };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(function (name) { root[name] = api[name]; });
})(typeof window !== 'undefined' ? window : this);
