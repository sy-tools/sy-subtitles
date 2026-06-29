// Pure helpers for preview-page marker/edit state. Single source: loaded by the
// browser via <script src="js/preview_state.js"> in site/index.html AND required
// by the Node test suite — no inline mirror.

function defaultPreviewState() {
  return { mode: 'marker', markers: [], edits: {} };
}

function newKeyFor(talkId, videoSlug) {
  return 'preview_' + talkId + '_' + videoSlug;
}

function legacyKeyFor(talkId, videoSlug) {
  return 'markers_preview_' + talkId + '_' + videoSlug;
}

function coerceState(raw) {
  var out = defaultPreviewState();
  if (!raw || typeof raw !== 'object') return out;
  if (raw.mode === 'edit' || raw.mode === 'marker') out.mode = raw.mode;
  if (Array.isArray(raw.markers)) out.markers = raw.markers;
  if (raw.edits && typeof raw.edits === 'object' && !Array.isArray(raw.edits)) {
    out.edits = raw.edits;
  }
  return out;
}

// Legacy markers_preview_* key is migrated on first read and then
// removed unconditionally once the new key exists.
function loadPreviewState(talkId, videoSlug, storage) {
  var newKey = newKeyFor(talkId, videoSlug);
  var legacyKey = legacyKeyFor(talkId, videoSlug);
  var rawNew = storage.getItem(newKey);

  if (rawNew != null) {
    var parsed;
    try {
      parsed = JSON.parse(rawNew);
    } catch (_) {
      parsed = null;
    }
    // New key is authoritative — legacy is stale garbage if still around.
    if (storage.getItem(legacyKey) != null) storage.removeItem(legacyKey);
    return coerceState(parsed);
  }

  var rawLegacy = storage.getItem(legacyKey);
  if (rawLegacy != null) {
    var legacyMarkers;
    try {
      legacyMarkers = JSON.parse(rawLegacy);
    } catch (_) {
      legacyMarkers = [];
    }
    if (!Array.isArray(legacyMarkers)) legacyMarkers = [];
    var migrated = defaultPreviewState();
    migrated.markers = legacyMarkers;
    storage.setItem(newKey, JSON.stringify(migrated));
    storage.removeItem(legacyKey);
    return migrated;
  }

  return defaultPreviewState();
}

function msToSrtTime(ms) {
  var h = Math.floor(ms / 3600000);
  var m = Math.floor((ms % 3600000) / 60000);
  var s = Math.floor((ms % 60000) / 1000);
  var mmm = ms % 1000;
  return (
    String(h).padStart(2, '0') +
    ':' +
    String(m).padStart(2, '0') +
    ':' +
    String(s).padStart(2, '0') +
    ',' +
    String(mmm).padStart(3, '0')
  );
}

function applyEditsToSrt(blocks, edits) {
  if (!blocks || !blocks.length) return '';
  var e = edits || {};
  var lines = [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var text = Object.prototype.hasOwnProperty.call(e, i) ? e[i] : b.text;
    lines.push(String(i + 1));
    lines.push(msToSrtTime(b.startMs) + ' --> ' + msToSrtTime(b.endMs));
    lines.push(text);
    lines.push('');
  }
  return lines.join('\n');
}

// True when showPreview is re-entered for the video that is already loaded
// (e.g. a manifest refresh that re-runs route()), so the live Vimeo player and
// its playback position can be kept instead of rebuilding the iframe.
// `hasIframe` is the DOM check (passed in to keep this pure).
function canReusePreviewPlayer(prev, talkId, videoSlug, hasIframe) {
  return !!(prev && prev.player && hasIframe
    && prev.talkId === talkId && prev.videoSlug === videoSlug);
}

// --- Preview playback position (#7) ---------------------------------------
// The live overlay loop (renderOverlayAt) tracks previewState.currentTime in
// SECONDS, but it resets to 0 on every fresh entry, so a refresh restarts the
// video. We persist the position under its OWN key, not inside the marker/edit
// payload: that keeps each write tiny and isolates position writes (driven by
// the overlay loop, throttled in index.html) from clobbering the marker/edit
// blob. Key-naming mirrors the review sync player's `sy.sync_player.*` convention;
// the stored VALUE differs (bare seconds here vs the sync player's JSON
// `{open,lastTime(ms),...}`).
var RESUME_THRESHOLD_SEC = 3; // don't bother resuming a near-start position

function previewPosKey(talkId, videoSlug) {
  return 'sy.preview_pos.' + talkId + '.' + videoSlug;
}

function loadPreviewPos(talkId, videoSlug, storage) {
  try {
    var raw = storage.getItem(previewPosKey(talkId, videoSlug));
    if (raw == null) return 0;
    var v = parseFloat(raw);
    if (!isFinite(v) || v < 0) return 0;
    return v;
  } catch (_) {
    return 0;
  }
}

function savePreviewPos(talkId, videoSlug, storage, seconds) {
  if (typeof seconds !== 'number' || !isFinite(seconds)) return;
  var v = seconds < 0 ? 0 : seconds;
  try {
    storage.setItem(previewPosKey(talkId, videoSlug), String(v));
  } catch (_) {
    /* quota / private mode — ignore */
  }
}

function shouldResumePreviewPos(seconds) {
  return typeof seconds === 'number' && isFinite(seconds) && seconds > RESUME_THRESHOLD_SEC;
}

// Decide what the index.html flushers should persist for the live position, or
// null to skip. Two sentinels must never be written: the fresh-entry 0 (the
// resume seek hasn't landed yet — persisting it would wipe a saved point) and
// the end-of-video time (we want a clean restart, flagged by state._ended; the
// 'ended' handler stores 0 directly). Persisting only resumable positions
// (> threshold) means we store exactly what we'd resume, which also drops the
// load-window 0 and any sub-threshold time for free.
function previewPosToPersist(state) {
  if (!state || !state.talkId) return null;
  if (state._ended) return null;
  return shouldResumePreviewPos(state.currentTime) ? state.currentTime : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    defaultPreviewState: defaultPreviewState,
    loadPreviewState: loadPreviewState,
    applyEditsToSrt: applyEditsToSrt,
    msToSrtTime: msToSrtTime,
    canReusePreviewPlayer: canReusePreviewPlayer,
    previewPosKey: previewPosKey,
    loadPreviewPos: loadPreviewPos,
    savePreviewPos: savePreviewPos,
    shouldResumePreviewPos: shouldResumePreviewPos,
    previewPosToPersist: previewPosToPersist,
  };
}
