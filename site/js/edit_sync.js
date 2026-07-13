// Edit auto-sync: replicates a talk's edit-bearing localStorage entries to a
// state file on a deterministic GitHub branch (draft PR), so signed-in users
// get background persistence and cross-device continuation.
//
// Single source: loaded via <script src="js/edit_sync.js"> in site/index.html
// AND required by the Node test suite — no inline mirror.
//
// Model: the "sync document" is {version, revision, updatedAt, client, talkId,
// entries} where entries maps the exact localStorage keys (review_<talk>,
// review_srt_<talk>_*, preview_<talk>_*) to their parsed values. Safety comes
// from a per-item three-way merge against the last-synced base plus the
// Contents-API sha acting as compare-and-swap (409 on a concurrent writer).

// State file lives OUTSIDE talks/ on purpose: no workflow paths-filter
// (ci.yml, sync-subtitles.yml, deploy-pages.yml) matches .review-sync/**,
// so sync commits trigger zero CI runs.
function syncFilePath(talkId) { return '.review-sync/' + talkId + '.json'; }

// localStorage key of the sync base: the last successfully synced doc + its
// blob sha (the CAS token) + the attached PR coordinates.
function syncBaseKey(talkId) { return 'sy_sync_base_' + talkId; }

// The sync-space predicate: ONLY the edit-bearing keys. UI-state keys
// (sy_review_*, sy.preview_pos.*, sy.sync_player.*) never sync.
function isSyncSpaceKey(key, talkId) {
  return key === 'review_' + talkId
    || key.indexOf('review_srt_' + talkId + '_') === 0
    || key.indexOf('preview_' + talkId + '_') === 0;
}

// An entry with no marks, no markers and no edits carries nothing worth
// syncing (e.g. everything was reverted) — treated as absent.
function entryIsEmpty(entry) {
  if (!entry) return true;
  if (Object.keys(entry.marks || {}).length) return false;
  if ((entry.markers || []).length) return false;
  var edits = entry.edits || {};
  var keys = Object.keys(edits);
  for (var i = 0; i < keys.length; i++) {
    var v = edits[keys[i]];
    if (typeof v === 'string') return false;               // review: {idx: text}
    if (v && Object.keys(v).length) return false;          // preview: {lang: {idx: text}}
  }
  return true;
}

// Read the talk's sync-space entries out of localStorage. Unparseable or
// empty values are skipped.
function collectSyncEntries(talkId, storage) {
  var entries = {};
  for (var i = 0; i < storage.length; i++) {
    var key = storage.key(i);
    if (!key || !isSyncSpaceKey(key, talkId)) continue;
    var parsed;
    try { parsed = JSON.parse(storage.getItem(key)); } catch (e) { continue; }
    if (entryIsEmpty(parsed)) continue;
    entries[key] = parsed;
  }
  return entries;
}

// Write merged entries back into localStorage; sync-space keys absent from
// the doc are removed (a delete that won the merge). Returns the keys whose
// stored value actually changed, so the caller can re-render only then.
function applySyncEntries(talkId, entries, storage) {
  var changed = [];
  var present = {};
  var stale = [];
  for (var i = 0; i < storage.length; i++) {
    var key = storage.key(i);
    if (key && isSyncSpaceKey(key, talkId)) { present[key] = true; if (!(key in entries)) stale.push(key); }
  }
  Object.keys(entries).forEach(function (key) {
    var next = JSON.stringify(entries[key]);
    if (storage.getItem(key) !== next) {
      storage.setItem(key, next);
      changed.push(key);
    }
  });
  stale.forEach(function (key) {
    storage.removeItem(key);
    changed.push(key);
  });
  return changed;
}

// --- flatten/unflatten: entries -> a flat map of leaf items ----------------
// Flat key = JSON array [entryKey, ...path] (JSON so arbitrary text in marker
// identities cannot collide with a separator). Leaf value = JSON string.
// Items: marks.<idx>, edits.<idx> (review), edits.<lang>.<idx> (preview),
// mode, markers keyed by identity time|text (whole marker object as value).

function markerIdentity(m) { return String(m && m.time) + '|' + String((m && m.text) || ''); }

function flattenDoc(entries) {
  var flat = {};
  Object.keys(entries || {}).forEach(function (entryKey) {
    var e = entries[entryKey] || {};
    var marks = e.marks || {};
    Object.keys(marks).forEach(function (idx) {
      flat[JSON.stringify([entryKey, 'marks', idx])] = JSON.stringify(marks[idx]);
    });
    var edits = e.edits || {};
    Object.keys(edits).forEach(function (k) {
      var v = edits[k];
      if (v !== null && typeof v === 'object') {
        Object.keys(v).forEach(function (idx) {
          flat[JSON.stringify([entryKey, 'edits', k, idx])] = JSON.stringify(v[idx]);
        });
      } else {
        flat[JSON.stringify([entryKey, 'edits', k])] = JSON.stringify(v);
      }
    });
    if (e.mode !== undefined) {
      flat[JSON.stringify([entryKey, 'mode'])] = JSON.stringify(e.mode);
    }
    (e.markers || []).forEach(function (m) {
      flat[JSON.stringify([entryKey, 'markers', markerIdentity(m)])] = JSON.stringify(m);
    });
  });
  return flat;
}

function unflattenDoc(flat) {
  var entries = {};
  Object.keys(flat).forEach(function (flatKey) {
    var path = JSON.parse(flatKey);
    var entryKey = path[0], kind = path[1];
    var e = entries[entryKey];
    if (!e) e = entries[entryKey] = { marks: {}, edits: {}, markers: [] };
    var value = JSON.parse(flat[flatKey]);
    if (kind === 'marks') {
      e.marks[path[2]] = value;
    } else if (kind === 'edits') {
      if (path.length === 4) {
        if (!e.edits[path[2]]) e.edits[path[2]] = {};
        e.edits[path[2]][path[3]] = value;
      } else {
        e.edits[path[2]] = value;
      }
    } else if (kind === 'mode') {
      e.mode = value;
    } else if (kind === 'markers') {
      e.markers.push(value);
    }
  });
  Object.keys(entries).forEach(function (entryKey) {
    var e = entries[entryKey];
    e.markers.sort(function (a, b) { return (a.time || 0) - (b.time || 0); });
    // Normalize the shape back to what the app stores: review entries have
    // no markers/mode; preview entries keep all three fields. A merge can
    // leave an entry with no items at all (every edit deleted) — drop it.
    var isPreview = entryKey.indexOf('preview_') === 0;
    if (!isPreview) { delete e.markers; }
    else if (e.mode === undefined) { e.mode = 'marker'; }
    if (entryIsEmpty(e)) delete entries[entryKey];
  });
  return entries;
}

// Per-item three-way merge. For each leaf item:
//   local == remote            -> either (agreement, incl. both absent)
//   local == base              -> remote's version (only remote changed)
//   otherwise                  -> local's version (local changed; on a true
//                                 conflict local wins and the re-push carries
//                                 it to the other device)
// Deletions are just absence — no tombstones needed with a base snapshot.
function mergeSyncDocs(baseEntries, localEntries, remoteEntries) {
  var bf = flattenDoc(baseEntries || {});
  var lf = flattenDoc(localEntries || {});
  var rf = flattenDoc(remoteEntries || {});
  var keys = {};
  [bf, lf, rf].forEach(function (m) { Object.keys(m).forEach(function (k) { keys[k] = true; }); });
  var out = {};
  Object.keys(keys).forEach(function (k) {
    var b = bf[k], l = lf[k], r = rf[k];
    var v;
    if (l === r) v = l;
    else if (l === b) v = r;
    else v = l;
    if (v !== undefined) out[k] = v;
  });
  function differs(m) {
    var ka = Object.keys(out), kb = Object.keys(m);
    if (ka.length !== kb.length) return true;
    for (var i = 0; i < ka.length; i++) { if (m[ka[i]] !== out[ka[i]]) return true; }
    return false;
  }
  return {
    entries: unflattenDoc(out),
    changedVsLocal: differs(lf),
    changedVsRemote: differs(rf),
  };
}

function makeSyncDoc(talkId, entries, revision, client, nowIso) {
  return {
    version: 1,
    revision: revision,
    updatedAt: nowIso,
    client: client,
    talkId: talkId,
    entries: entries,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    syncFilePath: syncFilePath,
    syncBaseKey: syncBaseKey,
    isSyncSpaceKey: isSyncSpaceKey,
    entryIsEmpty: entryIsEmpty,
    collectSyncEntries: collectSyncEntries,
    applySyncEntries: applySyncEntries,
    flattenDoc: flattenDoc,
    unflattenDoc: unflattenDoc,
    mergeSyncDocs: mergeSyncDocs,
    makeSyncDoc: makeSyncDoc,
  };
}
