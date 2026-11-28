// Review in subtitle mode: pairs EN and UK subtitle blocks into grid rows by
// the time they share. Single source: loaded by the browser via
// <script src="js/srt_align.js"> in site/index.html AND required by the Node
// test suite — no inline mirror.

function alignSubtitlesByTime(enBlocks, ukBlocks) {
  if (!enBlocks.length && !ukBlocks.length) return [];
  if (!enBlocks.length) return ukBlocks.map(function(b) { return { en: null, uk: b, startMs: b.startMs, endMs: b.endMs }; });
  if (!ukBlocks.length) return enBlocks.map(function(b) { return { en: b, uk: null, startMs: b.startMs, endMs: b.endMs }; });

  // Collect all unique time boundaries
  var times = {};
  enBlocks.forEach(function(b) { times[b.startMs] = true; times[b.endMs] = true; });
  ukBlocks.forEach(function(b) { times[b.startMs] = true; times[b.endMs] = true; });
  var sorted = Object.keys(times).map(Number).sort(function(a, b) { return a - b; });

  // Build time slots with active EN/UK block indices via a two-pointer
  // walk. Blocks within each column are sorted and non-overlapping in
  // valid SRT files, and slot midpoints advance monotonically, so each
  // block is visited at most twice (once when it becomes current, once
  // when it expires). Total work: O(slots + enBlocks + ukBlocks).
  var slots = [];
  var enPtr = 0, ukPtr = 0;
  for (var i = 0; i < sorted.length - 1; i++) {
    var s = sorted[i], e = sorted[i + 1];
    var mid = (s + e) / 2;
    while (enPtr < enBlocks.length && enBlocks[enPtr].endMs <= mid) enPtr++;
    while (ukPtr < ukBlocks.length && ukBlocks[ukPtr].endMs <= mid) ukPtr++;
    var enIdx = (enPtr < enBlocks.length && enBlocks[enPtr].startMs <= mid) ? enPtr : -1;
    var ukIdx = (ukPtr < ukBlocks.length && ukBlocks[ukPtr].startMs <= mid) ? ukPtr : -1;
    if (enIdx === -1 && ukIdx === -1) continue; // gap — skip
    slots.push({ s: s, e: e, enIdx: enIdx, ukIdx: ukIdx });
  }

  // Merge consecutive slots with same EN+UK pair
  var merged = [];
  for (var i = 0; i < slots.length; i++) {
    var cur = slots[i];
    if (merged.length > 0) {
      var prev = merged[merged.length - 1];
      if (prev.enIdx === cur.enIdx && prev.ukIdx === cur.ukIdx) {
        prev.e = cur.e;
        continue;
      }
    }
    merged.push({ s: cur.s, e: cur.e, enIdx: cur.enIdx, ukIdx: cur.ukIdx });
  }

  // Determine which blocks have at least one fully-paired slot (both EN and UK present).
  // Half-empty slots are then absorbed into the paired ones via grid spanning, so we
  // drop those half-empty slots whose visible side is already covered by a paired slot.
  var pairedEn = {}, pairedUk = {};
  for (var i = 0; i < merged.length; i++) {
    if (merged[i].enIdx >= 0 && merged[i].ukIdx >= 0) {
      pairedEn[merged[i].enIdx] = true;
      pairedUk[merged[i].ukIdx] = true;
    }
  }

  var rows = [];
  for (var i = 0; i < merged.length; i++) {
    var m = merged[i];
    // Drop a half-empty slot if its visible block also appears in a fully-paired slot.
    // The paired slot will display that block (possibly via row spanning), so the
    // half-empty slot would render as a redundant row with one orphan cell.
    if (m.enIdx === -1 && m.ukIdx >= 0 && pairedUk[m.ukIdx]) continue;
    if (m.ukIdx === -1 && m.enIdx >= 0 && pairedEn[m.enIdx]) continue;
    var en = m.enIdx >= 0 ? enBlocks[m.enIdx] : null;
    var uk = m.ukIdx >= 0 ? ukBlocks[m.ukIdx] : null;
    if (!en && !uk) continue;
    rows.push({ en: en, uk: uk, startMs: m.s, endMs: m.e });
  }

  // Re-merge consecutive rows with the same EN+UK pair (drops above may have made
  // previously-separated identical pairs adjacent — this rarely matters but keeps
  // the spanning logic in the renderer compact).
  var compact = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (compact.length > 0) {
      var prev = compact[compact.length - 1];
      var sameEn = (prev.en === r.en) || (prev.en && r.en && prev.en.startMs === r.en.startMs && prev.en.endMs === r.en.endMs);
      var sameUk = (prev.uk === r.uk) || (prev.uk && r.uk && prev.uk.startMs === r.uk.startMs && prev.uk.endMs === r.uk.endMs);
      if (sameEn && sameUk) { prev.endMs = r.endMs; continue; }
    }
    compact.push(r);
  }
  return compact;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { alignSubtitlesByTime: alignSubtitlesByTime };
}
