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

// ---------------------------------------------------------------------------
// Sync engine: debounce, compare-and-swap pushes, draft-PR bootstrap, pulls.
// Everything injectable (gh client object, storage, timers, clock) so the
// Node suite drives it without HTTP or real time.
// ---------------------------------------------------------------------------
function createSyncEngine(opts) {
  var api = opts.api, token = opts.token, talkId = opts.talkId;
  var storage = opts.storage, gh = opts.gh, fetchImpl = opts.fetchImpl;
  var setT = opts.setTimeoutFn || setTimeout;
  var clearT = opts.clearTimeoutFn || clearTimeout;
  var now = opts.now || function () { return Date.now(); };
  var isOffline = opts.isOffline || function () { return false; };
  var onStatus = opts.onStatus || function () {};
  var onRemoteApplied = opts.onRemoteApplied || function () {};
  var branch = opts.branch;
  var baseBranch = opts.base || 'main';
  var owner = opts.owner;
  var login = opts.login;
  var path = syncFilePath(talkId);

  var DEBOUNCE_MS = 15000;   // push this long after the LAST edit
  var COALESCE_MS = 1500;    // push shortly after a field blur
  var PULL_THROTTLE_MS = 60000;
  var MAX_PUT_ATTEMPTS = 3;

  // Base meta = last synced doc + CAS sha + PR coordinates; survives reloads.
  var meta = null;
  try { meta = JSON.parse(storage.getItem(syncBaseKey(talkId))); } catch (e) { /* corrupted -> fresh */ }
  if (!meta || meta.branch !== branch) {
    meta = { doc: {}, sha: null, revision: 0, prNumber: null, prUrl: null, nodeId: null, branch: branch };
  }

  var clientId = opts.clientId || (function () {
    var c = storage.getItem('sy_sync_client');
    if (!c) { c = Math.random().toString(36).slice(2, 8); storage.setItem('sy_sync_client', c); }
    return c;
  })();

  var status = 'idle';
  var lastError = null;
  var dirty = false;
  var editSeq = 0;
  var debounceId = null, coalesceId = null;
  var lastPullAt = 0;
  var inflight = null;
  var disposed = false;

  function info() {
    return { status: status, prUrl: meta.prUrl, prNumber: meta.prNumber, nodeId: meta.nodeId,
      branch: branch, dirty: dirty, error: lastError };
  }
  function setStatus(s, err) { status = s; lastError = err || null; onStatus(s, info()); }
  function saveMeta() { storage.setItem(syncBaseKey(talkId), JSON.stringify(meta)); }

  function parseRemote(file) {
    var doc = null;
    try { doc = JSON.parse(file.content); } catch (e) { /* treat as empty */ }
    return {
      entries: (doc && doc.entries) || {},
      revision: (doc && doc.revision) || 0,
      sha: file.sha,
    };
  }

  function armDebounce() {
    if (debounceId !== null) clearT(debounceId);
    debounceId = setT(function () { debounceId = null; flush(); }, DEBOUNCE_MS);
  }

  function notifyEdit() {
    if (disposed) return;
    dirty = true;
    editSeq += 1;
    armDebounce();
    if (status === 'synced' || status === 'idle') setStatus('pending');
  }

  function flushSoon() {
    if (disposed || !dirty) return;
    if (coalesceId !== null) clearT(coalesceId);
    coalesceId = setT(function () { coalesceId = null; flush(); }, COALESCE_MS);
  }

  function flush(fopts) {
    if (disposed || !dirty) return Promise.resolve();
    if (inflight) return inflight.then(function () { return flush(fopts); });
    inflight = doFlush(fopts)
      .then(function () { inflight = null; }, function () { inflight = null; });
    return inflight;
  }

  function doFlush(fopts) {
    var keepalive = fopts && fopts.keepalive;
    var seqAtStart = editSeq;
    setStatus('syncing');
    var local = collectSyncEntries(talkId, storage);
    var attempt = 0;

    // Fold a freshly fetched remote doc into local state: three-way merge,
    // write remote-won items into storage, advance the base to the remote.
    function integrateRemote(remote) {
      var merged = mergeSyncDocs(meta.doc || {}, collectSyncEntries(talkId, storage), remote.entries);
      var changedKeys = applySyncEntries(talkId, merged.entries, storage);
      if (changedKeys.length) onRemoteApplied(changedKeys);
      meta.doc = remote.entries;
      meta.sha = remote.sha;
      meta.revision = Math.max(meta.revision || 0, remote.revision || 0);
      local = merged.entries;
    }

    // First push of this session: adopt whatever the sync branch already
    // holds (another device may have synced), or create the branch.
    function ensureRemoteBase() {
      if (meta.sha !== null) return Promise.resolve();
      return gh.getFileContent(api, token, path, branch, fetchImpl).then(function (file) {
        if (file) { integrateRemote(parseRemote(file)); return; }
        return gh.getBranchHeadSha(api, token, baseBranch, fetchImpl).then(function (sha) {
          return gh.createRef(api, token, branch, sha, fetchImpl).catch(function (e) {
            if (e && e.status === 422) return; // branch already exists — fine
            throw e;
          });
        });
      });
    }

    function push() {
      attempt += 1;
      var revision = (meta.revision || 0) + 1;
      var doc = makeSyncDoc(talkId, local, revision, clientId, new Date(now()).toISOString());
      return gh.putFile(api, token, {
        path: path,
        branch: branch,
        message: 'sync: edit state for ' + talkId,
        content: JSON.stringify(doc, null, 2) + '\n',
        sha: meta.sha || undefined,
        keepalive: keepalive,
      }, fetchImpl).then(function (res) {
        meta.doc = local;
        meta.sha = (res && res.content && res.content.sha) || null;
        meta.revision = revision;
        if (editSeq === seqAtStart) {
          dirty = false;
          if (debounceId !== null) { clearT(debounceId); debounceId = null; }
        }
        saveMeta();
        return ensurePr();
      }, function (e) {
        // CAS: someone else wrote the file since our base sha. Refresh, merge,
        // retry — the sha is the lock, the merge preserves both sides.
        if (e && e.status === 409 && attempt < MAX_PUT_ATTEMPTS) {
          return gh.getFileContent(api, token, path, branch, fetchImpl).then(function (file) {
            if (file) integrateRemote(parseRemote(file));
            else meta.sha = null;
            return push();
          });
        }
        throw e;
      });
    }

    function ensurePr() {
      if (meta.prNumber) return Promise.resolve();
      var title = 'Edit sync: ' + talkId + ' (' + login + ')';
      var body = 'Automated **draft** PR carrying in-progress review/preview edits from the SPA.\n\n'
        + '- State file: `' + path + '`\n'
        + '- Branch: `' + branch + '`\n\n'
        + 'It is updated in the background while the user edits, and is flipped to '
        + 'ready-for-review (real files committed, state file removed) when the user '
        + 'finalizes from the app. Do not merge while draft.';
      function adopt(pr) {
        meta.prNumber = pr.number; meta.prUrl = pr.html_url; meta.nodeId = pr.node_id;
        saveMeta();
      }
      return gh.createPull(api, token,
        { head: branch, base: baseBranch, title: title, body: body, draft: true }, fetchImpl)
        .then(adopt, function (e) {
          if (e && e.status === 422 && /draft/i.test(e.message || '')) {
            return gh.createPull(api, token,
              { head: branch, base: baseBranch, title: title, body: body }, fetchImpl).then(adopt);
          }
          if (e && e.status === 422 && /already exists/i.test(e.message || '')) {
            return gh.findOpenPrByHead(api, token, owner, branch, fetchImpl)
              .then(function (pr) { if (pr) adopt(pr); });
          }
          throw e;
        });
    }

    return ensureRemoteBase().then(push).then(function () {
      setStatus('synced');
    }).catch(function (e) {
      if (isOffline(e)) { setStatus('pending', { kind: 'offline', message: e && e.message }); return; }
      if (e && e.status === 401) { setStatus('error', { kind: 'auth', message: e && e.message }); return; }
      setStatus('error', { kind: 'sync', message: (e && e.message) || String(e), httpStatus: e && e.status });
    });
  }

  function pull(force) {
    if (disposed) return Promise.resolve();
    var t = now();
    if (!force && t - lastPullAt < PULL_THROTTLE_MS) return Promise.resolve();
    lastPullAt = t;
    return gh.getFileContent(api, token, path, branch, fetchImpl).then(function (file) {
      if (!file) return;
      if (file.sha === meta.sha) {
        if (!dirty && status !== 'synced') setStatus('synced');
        return;
      }
      var remote = parseRemote(file);
      var merged = mergeSyncDocs(meta.doc || {}, collectSyncEntries(talkId, storage), remote.entries);
      var changedKeys = applySyncEntries(talkId, merged.entries, storage);
      if (changedKeys.length) onRemoteApplied(changedKeys);
      meta.doc = remote.entries;
      meta.sha = remote.sha;
      meta.revision = Math.max(meta.revision || 0, remote.revision || 0);
      saveMeta();
      if (merged.changedVsRemote) {
        // Local still differs (dirty edits or a merge the remote lacks) —
        // schedule a push so the other device converges.
        dirty = true;
        editSeq += 1;
        armDebounce();
        setStatus('pending');
      } else if (!dirty) {
        setStatus('synced');
      }
    }).catch(function (e) {
      if (e && e.status === 401) { setStatus('error', { kind: 'auth', message: e && e.message }); return; }
      // Offline / transient pull failures are silent: the next focus retries.
    });
  }

  // On talk open: adopt the remote state and re-attach the PR coordinates
  // (cached in the base meta, else looked up by the deterministic head).
  function attach() {
    if (disposed) return Promise.resolve();
    return pull(true).then(function () {
      if (meta.sha && !meta.prNumber) {
        return gh.findOpenPrByHead(api, token, owner, branch, fetchImpl).then(function (pr) {
          if (pr) {
            meta.prNumber = pr.number; meta.prUrl = pr.html_url; meta.nodeId = pr.node_id;
            saveMeta();
            onStatus(status, info());
          }
        }).catch(function () { /* PR lookup is cosmetic — never fail attach */ });
      }
    });
  }

  function destroy() {
    disposed = true;
    if (debounceId !== null) { clearT(debounceId); debounceId = null; }
    if (coalesceId !== null) { clearT(coalesceId); coalesceId = null; }
  }

  return {
    notifyEdit: notifyEdit,
    flushSoon: flushSoon,
    flush: flush,
    pull: pull,
    attach: attach,
    destroy: destroy,
    getInfo: info,
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
    createSyncEngine: createSyncEngine,
  };
}
