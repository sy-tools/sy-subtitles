'use strict';
// Marker -> GitHub issue auto-sync. Single-source module: required by
// tests/test_marker_sync.js AND <script src> in index.html. Mirrors edit_sync.js
// but targets an ISSUE (create / update-body / close / reopen) instead of a
// branch/PR. The issue body carries a human marker table plus a hidden
// <!-- sy-markers: base64 --> block holding the structured markers, so a 3-way
// merge needs no separate file. Re-attach is one deterministic path: a
// `markers`-labelled issue titled "Markers: <talkId> / <videoSlug>", resolved
// via the immediately-consistent list API (no stored-number, no Search).
var _es = (typeof require !== 'undefined') ? require('./edit_sync') : (typeof window !== 'undefined' ? window : {});
// Resolved lazily so browser <script> load order (edit_sync.js before this) is
// not load-time critical.
function _mergeSyncDocs() { return _es.mergeSyncDocs; }

var MARKER_LABEL = 'markers';

function markerIssueTitle(talkId, videoSlug) { return 'Markers: ' + talkId + ' / ' + videoSlug; }
function markerMetaKey(talkId, videoSlug) { return 'sy_marker_issue_' + talkId + '_' + videoSlug; }

function b64encode(s) {
  return (typeof Buffer !== 'undefined')
    ? Buffer.from(s, 'utf-8').toString('base64')
    : btoa(unescape(encodeURIComponent(s)));
}
function b64decode(s) {
  return (typeof Buffer !== 'undefined')
    ? Buffer.from(s, 'base64').toString('utf-8')
    : decodeURIComponent(escape(atob(s)));
}

// Neutralise a value before it goes into a Markdown table cell: `|` breaks the
// column layout, newlines break the row, and a literal `<!--` would let a
// crafted marker inject a decoy sy-markers comment (see parseMarkersBlock, I3).
function escapeCell(s) {
  return String(s || '')
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ')
    .replace(/</g, '&lt;');
}

function renderMarkersTable(markers, heading) {
  var lines = ['## Markers' + (heading ? ' — ' + heading : ''), '',
    '| Time | Subtitle | Comment |', '|------|----------|---------|'];
  (markers || []).forEach(function (m) {
    lines.push('| ' + escapeCell(m.tc) + ' | ' + escapeCell(m.text) + ' | ' + escapeCell(m.comment) + ' |');
  });
  return lines.join('\n');
}

// Global so parseMarkersBlock can take the LAST match: buildIssueBody always
// appends the authoritative block last, so reading the final match ignores any
// decoy the human table above it might contain (I3).
var BLOCK_RE = /<!-- sy-markers: ([A-Za-z0-9+/=]*) -->/g;

function buildIssueBody(markers, heading) {
  return renderMarkersTable(markers, heading)
    + '\n\n<!-- sy-markers: ' + b64encode(JSON.stringify(markers || [])) + ' -->\n';
}

function parseMarkersBlock(body) {
  BLOCK_RE.lastIndex = 0;
  var m, last = null;
  while ((m = BLOCK_RE.exec(body || '')) !== null) last = m;
  if (!last) return [];
  try {
    var arr = JSON.parse(b64decode(last[1]));
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

// 3-way merge by marker identity (time|text), reusing edit_sync's tested merge.
// A `preview_`-prefixed synthetic key makes flattenDoc treat the value as a
// marker entry (merged per marker, delete-by-absence like edits). Returns the
// merged markers plus `changedVsRemote` (true when the merge differs from the
// remote), which the pull path uses to decide whether to arm a push.
function mergeMarkersFull(base, local, remote) {
  var K = 'preview_marker_sync';
  var merged = _mergeSyncDocs()(
    { [K]: { markers: base || [] } },
    { [K]: { markers: local || [] } },
    { [K]: { markers: remote || [] } }
  );
  return {
    markers: (merged.entries[K] && merged.entries[K].markers) || [],
    changedVsRemote: merged.changedVsRemote,
  };
}
function mergeMarkers(base, local, remote) {
  return mergeMarkersFull(base, local, remote).markers;
}

// The engine — DI-driven, mirrors edit_sync.js createSyncEngine (timers,
// inflight serialization, disposed guard, status callback). Targets a GitHub
// issue: create on first marker, GET+merge+PATCH body on change, close on zero
// (teardown), reopen on return. Re-attach is list+title only.
function createMarkerSyncEngine(opts) {
  var api = opts.api, token = opts.token;
  var talkId = opts.talkId, videoSlug = opts.videoSlug;
  var getMarkers = opts.getMarkers || function () { return []; };
  var setMarkers = opts.setMarkers || function () {};
  var storage = opts.storage, gh = opts.gh;
  var setT = opts.setTimeoutFn || setTimeout;
  var clearT = opts.clearTimeoutFn || clearTimeout;
  var isOffline = opts.isOffline || function () { return false; };
  var onStatus = opts.onStatus || function () {};
  var fetchImpl = opts.fetchImpl;
  var now = opts.now || function () { return Date.now(); };

  var title = markerIssueTitle(talkId, videoSlug);
  var metaKey = markerMetaKey(talkId, videoSlug);
  var heading = opts.heading || videoSlug;

  var DEBOUNCE_MS = 15000, COALESCE_MS = 1500, PULL_THROTTLE_MS = 60000;

  var meta = null;
  try { meta = JSON.parse(storage.getItem(metaKey)); } catch (e) { /* corrupt -> fresh */ }
  if (!meta) meta = { number: null, url: null, nodeId: null, base: [] };
  if (!Array.isArray(meta.base)) meta.base = [];

  var status = 'idle', lastError = null, dirty = false, editSeq = 0;
  var debounceId = null, coalesceId = null, inflight = null, disposed = false, lastPullAt = 0;

  function info() {
    return { status: status, issueNumber: meta.number, issueUrl: meta.url, dirty: dirty, error: lastError };
  }
  function setStatus(s, err) { status = s; lastError = err || null; onStatus(s, info()); }
  function saveMeta() { storage.setItem(metaKey, JSON.stringify(meta)); }

  function armDebounce() {
    if (debounceId !== null) clearT(debounceId);
    debounceId = setT(function () { debounceId = null; flush(); }, DEBOUNCE_MS);
  }
  function clearDirty() { dirty = false; if (debounceId !== null) { clearT(debounceId); debounceId = null; } }

  function notifyEdit() {
    if (disposed) return;
    dirty = true; editSeq += 1; armDebounce();
    if (status === 'synced' || status === 'idle' || status === 'pending') setStatus('pending');
  }
  function flushSoon() {
    if (disposed || !dirty) return;
    if (coalesceId !== null) clearT(coalesceId);
    coalesceId = setT(function () { coalesceId = null; flush(); }, COALESCE_MS);
  }

  function flush(fopts) {
    if (disposed || (!dirty && !(fopts && fopts.force))) return Promise.resolve();
    if (inflight) return inflight.then(function () { return flush(fopts); });
    inflight = doFlush(fopts).then(function () { inflight = null; }, function () { inflight = null; });
    return inflight;
  }

  function fail(e) {
    if (disposed) return;
    var msg = e && e.message, st = e && e.status;
    if (isOffline(e)) { setStatus('pending', { kind: 'offline', message: msg }); return; }
    setStatus('error', { kind: 'sync', message: msg || String(e), httpStatus: st });
  }

  // Single deterministic re-attach: list the markers-labelled issues (list API
  // is immediately consistent) and exact-match the deterministic title.
  function resolveIssue() {
    return gh.listIssuesByLabel(api, token, MARKER_LABEL, fetchImpl).then(function (rows) {
      var found = (rows || []).filter(function (r) { return r.title === title; })[0] || null;
      if (found) {
        meta.number = found.number; meta.nodeId = found.node_id; meta.url = found.html_url || meta.url;
      }
      return found;
    });
  }

  function doFlush(fopts) {
    var seqAtStart = editSeq;
    var local = getMarkers() || [];
    setStatus('syncing');
    return resolveIssue().then(function (row) {
      if (disposed) return;
      if (!row) {
        if (!local.length) { clearDirty(); setStatus('idle'); return; }
        return gh.ensureLabel(api, token, MARKER_LABEL, fetchImpl).then(function () {
          return gh.createIssue(api, token,
            { title: title, labels: [MARKER_LABEL], body: buildIssueBody(local, heading) }, fetchImpl);
        }).then(function (issue) {
          if (disposed) return;
          meta.number = issue.number; meta.url = issue.html_url; meta.nodeId = issue.node_id;
          // Copy: `local` aliases the SPA's live markers array, which a later
          // remove/splice would mutate — leaving base wrongly empty for merge.
          meta.base = local.slice(); saveMeta();
          if (editSeq === seqAtStart) clearDirty();
          setStatus('synced');
        });
      }
      return gh.getIssue(api, token, row.number, fetchImpl).then(function (iss) {
        if (disposed) return;
        // A closed issue carries no active markers; reading its (possibly stale)
        // body would resurrect just-deleted markers (C1). Treat closed as empty.
        var remote = (iss.state === 'closed') ? [] : parseMarkersBlock(iss.body);
        var merged = mergeMarkers(meta.base, local, remote);
        setMarkers(merged);
        // Copy: setMarkers made `merged` the SPA's live array; a later splice
        // would otherwise empty base too and break the next merge (no teardown).
        meta.base = merged.slice();
        if (!merged.length) {
          // Teardown: clear the marker block AND close in one PATCH, so a later
          // reopen/pull cannot resurrect the deleted markers from a stale body (C1).
          return gh.updateIssue(api, token, row.number,
            { body: buildIssueBody([], heading), state: 'closed' }, fetchImpl).then(function () {
            if (disposed) return;
            saveMeta();
            if (editSeq === seqAtStart) { clearDirty(); setStatus('idle'); }
            else { setStatus('pending'); }  // a mid-teardown re-add re-syncs; never a lying idle
          });
        }
        var reopen = (iss.state === 'closed')
          ? gh.setIssueState(api, token, row.number, 'open', fetchImpl)
          : Promise.resolve();
        return reopen.then(function () {
          return gh.updateIssue(api, token, row.number,
            { body: buildIssueBody(merged, heading) }, fetchImpl);
        }).then(function () {
          if (disposed) return;
          saveMeta();
          if (editSeq === seqAtStart) clearDirty();
          setStatus('synced');
        });
      });
    }).catch(fail);
  }

  // Adopt the remote issue's markers on open (another device may have synced).
  // Mirrors edit_sync.pull: base becomes the REMOTE, and if the merge still
  // differs from the remote (local-only markers, or a merge the remote lacks)
  // a push is armed so this device converges instead of stranding markers (C2).
  function pull(force) {
    if (disposed) return Promise.resolve();
    var t = now();
    if (!force && t - lastPullAt < PULL_THROTTLE_MS) return Promise.resolve();
    lastPullAt = t;
    return resolveIssue().then(function (row) {
      if (disposed || !row) return;
      return gh.getIssue(api, token, row.number, fetchImpl).then(function (iss) {
        if (disposed) return;
        // Closed == no active markers (C1): never seed a resurrection from a
        // stale body.
        var remote = (iss.state === 'closed') ? [] : parseMarkersBlock(iss.body);
        var full = mergeMarkersFull(meta.base, getMarkers() || [], remote);
        setMarkers(full.markers);
        meta.base = remote.slice(); saveMeta();       // base := REMOTE, not the union
        if (full.changedVsRemote) {
          // Local still differs from the remote — schedule a push (do not report
          // `synced`, which would leave local-only markers stranded).
          dirty = true; editSeq += 1; armDebounce(); setStatus('pending');
        } else if (!dirty) {
          setStatus(remote.length ? 'synced' : 'idle');
        }
      });
    }).catch(function () { /* transient pull failures are silent */ });
  }

  function attach() {
    if (disposed) return Promise.resolve();
    return pull(true);
  }

  function destroy() {
    disposed = true;
    if (debounceId !== null) clearT(debounceId);
    if (coalesceId !== null) clearT(coalesceId);
    return inflight || Promise.resolve();
  }

  return {
    notifyEdit: notifyEdit,
    flushSoon: flushSoon,
    flush: flush,
    pull: pull,
    attach: attach,
    getInfo: info,
    destroy: destroy,
    talkId: talkId,
    videoSlug: videoSlug,
  };
}

var _api = {
  MARKER_LABEL: MARKER_LABEL,
  createMarkerSyncEngine: createMarkerSyncEngine,
  markerIssueTitle: markerIssueTitle,
  markerMetaKey: markerMetaKey,
  renderMarkersTable: renderMarkersTable,
  buildIssueBody: buildIssueBody,
  parseMarkersBlock: parseMarkersBlock,
  mergeMarkers: mergeMarkers,
};
if (typeof module !== 'undefined' && module.exports) module.exports = _api;
else Object.keys(_api).forEach(function (k) { window[k] = _api[k]; });
