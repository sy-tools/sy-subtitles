// Canonical per-block subtitle edit store, shared by the preview and the
// review-SRT views of the same video+language — so an edit made in one mode is
// visible in the other, and the sync engine commits ONE file per video+lang.
//
// Single source: loaded via <script src="js/edit_store.js"> in site/index.html
// AND required by the Node test suite — no inline mirror.
//
// Canonical key: srt_edits_<talkId>_<videoSlug>_<lang> -> {blockIdx: text},
// blockIdx being the 0-based position in the parsed final/<lang>.srt (the same
// numbering the preview edit overlay always used).
//
// Migration from the two legacy stores is LOSSLESS by construction:
//   1. before anything moves, the legacy key's raw value is snapshotted to
//      sy_backup_v1_<legacyKey> (first touch only, never auto-deleted);
//   2. copy -> verify -> delete: the legacy edits are stripped only after the
//      canonical key has been re-read and every moved item confirmed present;
//   3. readers dual-read: legacy leftovers (an aborted migration, or review
//      rows that map to no subtitle block) still show through;
//   4. review-vs-preview conflict on one block: the review value wins and the
//      displaced value is preserved under sy_backup_v1_displaced_<canonKey>;
//   5. re-runs are no-ops (the legacy edits are gone after a full pass).

function srtEditsKey(talkId, videoSlug, lang) {
  return 'srt_edits_' + talkId + '_' + videoSlug + '_' + lang;
}

function backupKeyFor(key) { return 'sy_backup_v1_' + key; }

function displacedKeyFor(canonicalKey) {
  return 'sy_backup_v1_displaced_' + canonicalKey;
}

// Parse a stored JSON object, or null on anything else.
function readJson(storage, key) {
  var raw = storage.getItem(key);
  if (raw == null) return null;
  try {
    var v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : null;
  } catch (e) { return null; }
}

// Keep only {key: string} pairs — anything else is junk from older bugs.
function coerceEditMap(raw) {
  var out = {};
  if (!raw || typeof raw !== 'object') return out;
  Object.keys(raw).forEach(function (k) {
    if (typeof raw[k] === 'string') out[k] = raw[k];
  });
  return out;
}

function loadSrtEdits(talkId, videoSlug, lang, storage) {
  return coerceEditMap(readJson(storage, srtEditsKey(talkId, videoSlug, lang)));
}

function saveSrtEdits(talkId, videoSlug, lang, edits, storage) {
  var key = srtEditsKey(talkId, videoSlug, lang);
  if (!edits || !Object.keys(edits).length) storage.removeItem(key);
  else storage.setItem(key, JSON.stringify(edits));
}

// Merge a review-SRT view's current row edits into the EXISTING canonical
// store. Blocks visible as rows in this view are authoritative (edited or,
// when absent from rowEdits, reverted -> removed); canonical blocks that have
// NO row here are preserved untouched. Without this, saving the review view
// would replace the whole store and silently drop a canonical block edit whose
// block alignSubtitlesByTime couldn't pair to a row (e.g. a preview edit on a
// block with overlapping/duplicate timecodes) — see edit_store review.
function mergeReviewEditsIntoCanonical(existing, rowEdits, rowToBlock) {
  var split = splitReviewRowEdits(rowEdits, rowToBlock);
  var visible = {};
  (rowToBlock || []).forEach(function (b) { if (b >= 0) visible[b] = true; });
  var out = {};
  Object.keys(existing || {}).forEach(function (b) {
    if (!visible[b]) out[b] = existing[b];              // no row here -> keep
  });
  Object.keys(split.canonical).forEach(function (b) { out[b] = split.canonical[b]; });
  return out;
}

// alignedRows reference the parsed uk block OBJECTS; recover each row's block
// position via identity so row-keyed legacy edits can be re-keyed per block.
function mapRowsToBlockIdx(alignedRows, ukBlocks) {
  var pos = new Map();
  (ukBlocks || []).forEach(function (b, i) { pos.set(b, i); });
  return (alignedRows || []).map(function (row) {
    var idx = row && row.uk ? pos.get(row.uk) : undefined;
    return idx === undefined ? -1 : idx;
  });
}

// Split row-keyed edits into the canonical (block-keyed) part and the legacy
// remainder (rows with no uk block). Two rows can span one block — the first
// row wins, matching how the edited SRT was always rebuilt.
function splitReviewRowEdits(rowEdits, rowToBlock) {
  var canonical = {}, legacy = {};
  Object.keys(rowEdits || {}).map(Number).sort(function (a, b) { return a - b; })
    .forEach(function (rowIdx) {
      var blockIdx = rowToBlock && rowToBlock[rowIdx] !== undefined ? rowToBlock[rowIdx] : -1;
      var value = rowEdits[rowIdx];
      if (blockIdx < 0) legacy[rowIdx] = value;
      else if (canonical[blockIdx] === undefined) canonical[blockIdx] = value;
    });
  return { canonical: canonical, legacy: legacy };
}

// --- dual readers -----------------------------------------------------------

function legacyPreviewLangEdits(talkId, videoSlug, lang, storage) {
  var state = readJson(storage, 'preview_' + talkId + '_' + videoSlug);
  return coerceEditMap(state && state.edits && state.edits[lang]);
}

// Preview edits for one language: the canonical store, with any legacy
// leftovers (aborted migration) showing through underneath.
function loadPreviewLangEdits(talkId, videoSlug, lang, storage) {
  var out = legacyPreviewLangEdits(talkId, videoSlug, lang, storage);
  var canonical = loadSrtEdits(talkId, videoSlug, lang, storage);
  Object.keys(canonical).forEach(function (k) { out[k] = canonical[k]; });
  return out;
}

// Row-keyed edits for the review-SRT view: canonical block edits projected
// onto every row of their block, plus legacy row edits where no canonical
// value exists (unmappable rows, aborted migration).
function loadReviewRowEdits(talkId, videoSlug, leftLang, rightLang, rowToBlock, storage) {
  var canonical = loadSrtEdits(talkId, videoSlug, rightLang, storage);
  var legacyState = readJson(storage, 'review_srt_' + talkId + '_' + videoSlug + '_' + leftLang + '_' + rightLang);
  var legacy = coerceEditMap(legacyState && legacyState.edits);
  var out = {};
  Object.keys(legacy).forEach(function (rowIdx) { out[rowIdx] = legacy[rowIdx]; });
  (rowToBlock || []).forEach(function (blockIdx, rowIdx) {
    if (blockIdx >= 0 && canonical[blockIdx] !== undefined) out[rowIdx] = canonical[blockIdx];
  });
  return out;
}

// --- migrations -------------------------------------------------------------

function backupOnce(storage, legacyKey) {
  var bk = backupKeyFor(legacyKey);
  if (storage.getItem(bk) == null) storage.setItem(bk, storage.getItem(legacyKey));
}

// Confirm every key of `expected` is present in the re-read canonical map —
// only then is it safe to strip the legacy copy.
function verifyCanonical(talkId, videoSlug, lang, expected, storage) {
  var canonical = loadSrtEdits(talkId, videoSlug, lang, storage);
  return Object.keys(expected).every(function (k) { return canonical[k] !== undefined; });
}

// Move preview's per-lang edit maps into the canonical store. An existing
// canonical value wins (it is the same or newer — a review migration or a
// live edit); the legacy copy survives in the backup either way.
function migratePreviewEdits(talkId, videoSlug, storage) {
  var previewKey = 'preview_' + talkId + '_' + videoSlug;
  try {
    var state = readJson(storage, previewKey);
    var edits = state && state.edits && typeof state.edits === 'object' ? state.edits : {};
    var langs = Object.keys(edits).filter(function (lang) {
      return Object.keys(coerceEditMap(edits[lang])).length > 0;
    });
    if (!langs.length) return { migrated: false };

    backupOnce(storage, previewKey);
    var verified = true;
    langs.forEach(function (lang) {
      var incoming = coerceEditMap(edits[lang]);
      var canonKey = srtEditsKey(talkId, videoSlug, lang);
      var canonical = loadSrtEdits(talkId, videoSlug, lang, storage);
      var displaced = coerceEditMap(readJson(storage, displacedKeyFor(canonKey)));
      var displacedNew = false;
      Object.keys(incoming).forEach(function (idx) {
        if (canonical[idx] === undefined) {
          canonical[idx] = incoming[idx];
        } else if (canonical[idx] !== incoming[idx]) {
          // An existing (review-authored) value wins; keep the superseded
          // preview value in the displaced backup too, so the "displaced value
          // preserved" guarantee holds regardless of migration order.
          displaced[idx] = incoming[idx];
          displacedNew = true;
        }
      });
      if (displacedNew) storage.setItem(displacedKeyFor(canonKey), JSON.stringify(displaced));
      saveSrtEdits(talkId, videoSlug, lang, canonical, storage);
      // verifyCanonical checks PRESENCE; every incoming index is present in the
      // merged canonical (we only ever add, never drop), whether it won or was
      // recorded as displaced — so the legacy edits are safe to strip.
      if (!verifyCanonical(talkId, videoSlug, lang, incoming, storage)) verified = false;
    });
    if (!verified) return { migrated: false, error: 'verification failed' };

    state.edits = {};
    storage.setItem(previewKey, JSON.stringify(state));
    return { migrated: true, langs: langs };
  } catch (e) {
    return { migrated: false, error: (e && e.message) || String(e) };
  }
}

// Move the review-SRT view's row-keyed edits into the canonical store using
// the row->block map of the freshly aligned view (hence: lazy, runs at view
// load). The review value wins on conflict — the displaced canonical value is
// preserved under the displaced-backup key. Marks and unmappable row edits
// stay in the legacy key.
function migrateReviewSrtEdits(talkId, videoSlug, leftLang, rightLang, rowToBlock, storage) {
  var legacyKey = 'review_srt_' + talkId + '_' + videoSlug + '_' + leftLang + '_' + rightLang;
  try {
    var state = readJson(storage, legacyKey);
    var rowEdits = coerceEditMap(state && state.edits);
    if (!Object.keys(rowEdits).length) return { migrated: false };

    var split = splitReviewRowEdits(rowEdits, rowToBlock);
    var moved = Object.keys(split.canonical);
    if (!moved.length) return { migrated: false };

    backupOnce(storage, legacyKey);

    var canonKey = srtEditsKey(talkId, videoSlug, rightLang);
    var canonical = loadSrtEdits(talkId, videoSlug, rightLang, storage);
    var displaced = coerceEditMap(readJson(storage, displacedKeyFor(canonKey)));
    var displacedNew = false;
    moved.forEach(function (blockIdx) {
      if (canonical[blockIdx] !== undefined && canonical[blockIdx] !== split.canonical[blockIdx]) {
        displaced[blockIdx] = canonical[blockIdx];
        displacedNew = true;
      }
      canonical[blockIdx] = split.canonical[blockIdx];
    });
    if (displacedNew) storage.setItem(displacedKeyFor(canonKey), JSON.stringify(displaced));
    saveSrtEdits(talkId, videoSlug, rightLang, canonical, storage);
    if (!verifyCanonical(talkId, videoSlug, rightLang, split.canonical, storage)) {
      return { migrated: false, error: 'verification failed' };
    }

    var marks = (state && state.marks && typeof state.marks === 'object') ? state.marks : {};
    if (Object.keys(split.legacy).length || Object.keys(marks).length) {
      storage.setItem(legacyKey, JSON.stringify({ marks: marks, edits: split.legacy }));
    } else {
      storage.removeItem(legacyKey);
    }
    return {
      migrated: true,
      moved: moved.length,
      unmappable: Object.keys(split.legacy).length,
    };
  } catch (e) {
    return { migrated: false, error: (e && e.message) || String(e) };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    srtEditsKey: srtEditsKey,
    backupKeyFor: backupKeyFor,
    displacedKeyFor: displacedKeyFor,
    loadSrtEdits: loadSrtEdits,
    saveSrtEdits: saveSrtEdits,
    mapRowsToBlockIdx: mapRowsToBlockIdx,
    splitReviewRowEdits: splitReviewRowEdits,
    mergeReviewEditsIntoCanonical: mergeReviewEditsIntoCanonical,
    loadPreviewLangEdits: loadPreviewLangEdits,
    loadReviewRowEdits: loadReviewRowEdits,
    migratePreviewEdits: migratePreviewEdits,
    migrateReviewSrtEdits: migrateReviewSrtEdits,
  };
}
