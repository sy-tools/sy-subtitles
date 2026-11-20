'use strict';
// Marker -> GitHub issue auto-sync. Single-source module: required by
// tests/test_marker_sync.js AND <script src> in index.html. Mirrors edit_sync.js
// but targets an ISSUE (create / update-body / close / reopen) instead of a
// branch/PR. The issue body carries a human marker table plus a hidden
// <!-- sy-markers: base64 --> block holding the structured markers, so a 3-way
// merge needs no separate file. Re-attach is by title: a `markers`-labelled
// issue titled "Markers: <talkId> / <videoSlug>", found through the list API
// (no Search). A number this device already knows is trusted before a list
// that does not show the issue — see the engine's issueForWrite/issueForRead.
var MARKER_LABEL = 'markers';

// Marker identity: a marker is the same one across devices/reads when its time
// and text match (comments/tc are mutable content). Matches edit_sync's.
function markerIdentity(m) { return String(m && m.time) + '|' + String((m && m.text) || ''); }

// Deep(ish) copy so an in-place edit of a live marker object (the SPA mutates
// previewState.markers[i].comment in place) can never mutate a stored `base`
// snapshot — markers are flat objects, so a per-element Object.assign suffices.
function snapshotMarkers(arr) {
  return (arr || []).map(function (m) { return Object.assign({}, m); });
}

function markerIssueTitle(talkId, videoSlug) { return 'Markers: ' + talkId + ' / ' + videoSlug; }
function markerMetaKey(talkId, videoSlug) { return 'sy_marker_issue_' + talkId + '_' + videoSlug; }
// Tombstones live under their OWN key. The meta key also carries `base`, which
// is each tab's own view of what it has merged: two tabs legitimately hold
// different bases, so a key that holds a base can never be a value the tabs
// agree on — and a `storage` listener on it that answers with a write of its
// own is a loop (two tabs traded ~15k events a second, for good). The
// tombstone map is the one thing all tabs of a talk must share, so it is the
// one thing the `storage` listener watches.
function markerTombstoneKey(talkId, videoSlug) { return 'sy_marker_tombstones_' + talkId + '_' + videoSlug; }

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
    .replace(/\\/g, '\\\\')   // escape backslash FIRST, else it defeats the `|` escape
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

// ADDITIVE 3-way merge for markers: `local ∪ (remote \ base \ tombstones)`,
// keyed by identity.
//
// Issues expose NO CAS token (unlike edit_sync's Contents-API sha), so a remote
// read can be stale, empty or partial (GitHub eventual consistency, a truncated
// response, a read racing our own write). Such a read must NEVER be trusted to
// DELETE a local marker — a plain delete-by-absence merge did exactly that and
// wiped users' markers on flaky networks. So:
//   - every LOCAL marker is kept (a stale/empty remote can't remove it);
//   - a remote marker is added only when its identity is NOT already local AND
//     was NOT locally deleted (present in `base`, absent from `local`, or
//     carrying a tombstone — see TOMBSTONE_TTL_MS);
//   - on a same-identity content conflict LOCAL wins (mirrors edit_sync).
// Deletions therefore propagate ONLY from an explicit local removal; a marker
// another device deleted lingers until this device removes it too — a
// deliberate trade (a stale marker is recoverable, a lost one is not).
// Result is sorted by time for a stable issue body. `changedVsRemote` (merged
// set differs from remote by identity+content) arms a push so the remote
// converges — re-adding local-only markers and healing a stale read.
function mergeMarkersInfo(base, local, remote, tombstones) {
  base = base || []; local = local || []; remote = remote || []; tombstones = tombstones || {};
  var localIds = {}, baseIds = {};
  local.forEach(function (m) { localIds[markerIdentity(m)] = true; });
  base.forEach(function (m) { baseIds[markerIdentity(m)] = true; });
  var out = local.slice();
  remote.forEach(function (m) {
    var id = markerIdentity(m);
    if (localIds[id] || baseIds[id] || hasOwn(tombstones, id)) return;   // already local, or locally deleted
    out.push(m);
  });
  out.sort(function (a, b) { return (a.time || 0) - (b.time || 0); });
  var remoteMap = {}, outMap = {}, changed = false;
  remote.forEach(function (m) { remoteMap[markerIdentity(m)] = JSON.stringify(m); });
  out.forEach(function (m) { outMap[markerIdentity(m)] = JSON.stringify(m); });
  var ids = {};
  Object.keys(remoteMap).concat(Object.keys(outMap)).forEach(function (k) { ids[k] = true; });
  Object.keys(ids).forEach(function (k) { if (remoteMap[k] !== outMap[k]) changed = true; });
  return { markers: out, changedVsRemote: changed };
}
function mergeMarkers(base, local, remote, tombstones) {
  return mergeMarkersInfo(base, local, remote, tombstones).markers;
}

function hasOwn(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }

// `base` alone cannot remember a deletion: once the deletion is synced, base
// moves on and no longer holds the marker, so a later read that still shows it
// (replica lag, a cached response, a GET that raced our PATCH) is
// indistinguishable from another device adding it — and the marker came back,
// in the UI and in the issue. A tombstone is the memory base lacks.
//
// A tombstone is `{ deletedAt, writtenAt }`. The TTL runs from the write that
// carried the deletion, not from the click: until it is written (writtenAt ===
// TOMBSTONE_UNWRITTEN) the remote GENUINELY still holds the marker. Ten minutes
// is far above anything a lagging read spans (seconds of replica lag; GitHub
// serves GET /issues/N with `max-age=60`), and short enough that the cost
// stays small: while a tombstone lives, the same time+text marker re-added on
// ANOTHER device is removed again by this one.
var TOMBSTONE_TTL_MS = 10 * 60 * 1000;
var TOMBSTONE_UNWRITTEN = 0;
// An unwritten tombstone is still bounded, from the deletion itself. A PATCH
// can land while its answer is never handled (page closed, engine destroyed);
// if no later write follows, the stamp never comes and the tombstone would
// suppress that identity from other devices for good. The bound has to exceed
// any time a device plausibly sits on an unsent deletion — offline, or signed
// out — because expiring earlier brings a marker back that the remote really
// still holds. Thirty days: past it, the price is one marker to delete again.
var TOMBSTONE_UNWRITTEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// Both ages are absolute: a stamp from a clock that has since been set back
// would otherwise never expire.
function tombstoneExpired(stone, t) {
  if (stone.writtenAt !== TOMBSTONE_UNWRITTEN) return Math.abs(t - stone.writtenAt) > TOMBSTONE_TTL_MS;
  return Math.abs(t - stone.deletedAt) > TOMBSTONE_UNWRITTEN_MAX_AGE_MS;
}

// Storage is shared with other tabs and survives app versions: take only
// entries of the current shape, as fresh objects.
function sanitiseTombstones(raw) {
  var out = {};
  Object.keys(raw || {}).forEach(function (id) {
    var stone = raw[id];
    if (stone && typeof stone.deletedAt === 'number' && typeof stone.writtenAt === 'number') {
      out[id] = { deletedAt: stone.deletedAt, writtenAt: stone.writtenAt };
    }
  });
  return out;
}

// Canonical text of a tombstone map: sorted, so that two tabs holding the same
// tombstones produce the same string whatever order they recorded them in.
// "Did anything change" is decided on this string and on nothing else.
function serialiseTombstones(stones) {
  var out = {};
  Object.keys(stones).sort().forEach(function (id) {
    out[id] = { deletedAt: stones[id].deletedAt, writtenAt: stones[id].writtenAt };
  });
  return JSON.stringify(out);
}

function identitySet(markers) {
  var ids = {};
  markers.forEach(function (m) { ids[markerIdentity(m)] = true; });
  return ids;
}

// GitHub cuts an API request off after 10 s; an answer that has not come in
// thirty will not come. Without a deadline one request that never settles
// holds the serial lane, and with it every later flush.
var MARKER_REQUEST_TIMEOUT_MS = 30000;

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
  var deadline = typeof withDeadline === 'function' ? withDeadline : require('./github_api').withDeadline;
  var fresh = typeof freshFetch === 'function' ? freshFetch : require('./github_api').freshFetch;

  var title = markerIssueTitle(talkId, videoSlug);
  var metaKey = markerMetaKey(talkId, videoSlug);
  var stoneKey = markerTombstoneKey(talkId, videoSlug);
  var heading = opts.heading || videoSlug;

  var DEBOUNCE_MS = 15000, COALESCE_MS = 1500, PULL_THROTTLE_MS = 60000;

  function readStoredMeta() {
    try {
      var stored = JSON.parse(storage.getItem(metaKey));
      return (stored && typeof stored === 'object') ? stored : null;
    } catch (e) { return null; }   // corrupt -> as if absent
  }
  var meta = readStoredMeta() || { number: null, url: null, nodeId: null, base: [] };
  if (!Array.isArray(meta.base)) meta.base = [];
  // null = the key is absent (never written, or storage emptied under the page).
  function readStoredTombstones() {
    var raw = storage.getItem(stoneKey);
    if (raw === null || raw === undefined) return null;
    try { return sanitiseTombstones(JSON.parse(raw)); } catch (e) { return {}; }   // corrupt -> empty
  }
  // This tab's copy of the shared map. After every step that touches it, it
  // equals what is stored (see saveTombstones).
  var stones = readStoredTombstones() || {};
  // Identities another tab tombstoned while this tab still shows the marker,
  // and identities whose tombstone another tab released.
  var deletedElsewhere = {}, releasedElsewhere = {};

  var status = 'idle', lastError = null, dirty = false, editSeq = 0;
  var debounceId = null, coalesceId = null, inflight = null, disposed = false, lastPullAt = 0;

  function info() {
    return { status: status, issueNumber: meta.number, issueUrl: meta.url, dirty: dirty, error: lastError };
  }
  function setStatus(s, err) { status = s; lastError = err || null; onStatus(s, info()); }
  // Both saves write ONLY when the stored text would change. A write another
  // tab did not need is not free: it fires a `storage` event there, and an
  // event answered with a write is how two tabs end up talking for ever.
  function saveMeta() {
    var next = JSON.stringify(meta);
    if (storage.getItem(metaKey) !== next) storage.setItem(metaKey, next);
  }
  function saveTombstones() {
    var next = serialiseTombstones(stones), stored = storage.getItem(stoneKey);
    if (stored === next) return;
    if ((stored === null || stored === undefined) && next === '{}') return;   // absent == empty
    storage.setItem(stoneKey, next);
  }

  // Every tab of the talk shares the tombstone key, and each holds its own
  // copy. The STORED map is the truth and the copy only a cache: this tab
  // changes its copy and saves in one synchronous step, so wherever the two
  // differ, another tab did it. Call this before every such step — a save
  // from the cache alone would erase the other tab's tombstones.
  //   - stored, not cached: the other tab deleted the marker. If this tab
  //     merged that marker (it is in base) and still shows it, it has to go;
  //     if it is not in base, the user added it HERE, and that add stands.
  //   - cached, not stored: the other tab released it (re-add, expiry).
  function adoptStoredTombstones() {
    var theirs = readStoredTombstones();
    if (!theirs) return;
    var baseIds = identitySet(meta.base);
    Object.keys(theirs).forEach(function (id) {
      if (!hasOwn(stones, id) && baseIds[id]) deletedElsewhere[id] = true;
    });
    Object.keys(stones).forEach(function (id) {
      if (!hasOwn(theirs, id)) releasedElsewhere[id] = true;
    });
    stones = theirs;
  }

  // Bring the tombstones up to date with storage and with `local`, store them
  // if that changed them, and return `local` without the markers another tab
  // deleted. Only LOCAL state moves a tombstone: a deletion creates it, the
  // user adding the identity back drops it. A remote read never clears one — a
  // fresh read followed by a stale one would otherwise flip-flop.
  //
  // Two tabs can disagree about one identity: this tab holds it in base and
  // not in the list (a deletion), the other holds it in the list and not in
  // base (the user put it back there). Each would undo the other's tombstone
  // on every `storage` event. The re-add is the later act and it wins: a
  // tombstone another tab released takes the marker out of THIS tab's base, so
  // this tab stops reading its absence as a deletion to record.
  function settleTombstones(local) {
    adoptStoredTombstones();
    var t = now();
    var kept = local.filter(function (m) { return !hasOwn(deletedElsewhere, markerIdentity(m)); });
    if (kept.length !== local.length) {
      // Not this tab's deletion, so it leaves base as well — else it would be
      // re-recorded as one after the other tab releases the tombstone. But a
      // PATCH of this tab's may have put the marker back since the other
      // tab's write: unwritten until this tab writes without it.
      meta.base = meta.base.filter(function (m) { return !hasOwn(deletedElsewhere, markerIdentity(m)); });
      Object.keys(deletedElsewhere).forEach(function (id) {
        if (hasOwn(stones, id)) stones[id].writtenAt = TOMBSTONE_UNWRITTEN;
      });
    }
    deletedElsewhere = {};
    var localIds = identitySet(kept);
    meta.base = meta.base.filter(function (m) {
      var id = markerIdentity(m);
      return localIds[id] || !hasOwn(releasedElsewhere, id);
    });
    releasedElsewhere = {};
    meta.base.forEach(function (m) {
      var id = markerIdentity(m);
      if (localIds[id]) return;
      var known = hasOwn(stones, id) ? stones[id].deletedAt : t;
      stones[id] = { deletedAt: known, writtenAt: TOMBSTONE_UNWRITTEN };
    });
    Object.keys(stones).forEach(function (id) {
      if (localIds[id] || tombstoneExpired(stones[id], t)) delete stones[id];
    });
    saveTombstones();
    return kept;
  }
  // `carried` = the tombstones that existed when the written body was built.
  // One recorded since (another tab's, or this tab's own on a `storage` event)
  // is not among them: that body may still have held its marker.
  function markDeletionsWritten(carried) {
    adoptStoredTombstones();
    var t = now();
    carried.forEach(function (id) {
      if (hasOwn(stones, id) && stones[id].writtenAt === TOMBSTONE_UNWRITTEN) {
        stones[id].writtenAt = t;
      }
    });
    saveTombstones();
    saveMeta();
  }
  function armPush() {
    dirty = true; editSeq += 1; armDebounce();
  }
  // Settle the tombstones against the list as it is NOW, without a request:
  // record a deletion this tab just made (so the other tabs learn of it at
  // once, not at this tab's next flush) and drop the markers another tab
  // deleted. It writes storage only if that changed something — it runs on
  // every `storage` event for the tombstone key, and must fall silent.
  function settleNow() {
    var local = getMarkers() || [];
    var baseBefore = JSON.stringify(meta.base);
    var kept = settleTombstones(local);
    // Not "if the stored meta differs": it holds whichever tab's base was
    // saved last, so it differs from this tab's most of the time.
    if (JSON.stringify(meta.base) !== baseBefore) saveMeta();
    if (kept.length === local.length) return false;
    setMarkers(kept);
    return true;
  }
  // The SPA calls it on the `storage` event for the tombstone key; the engine
  // calls it after a write, when the other tab's deletion arrived while the
  // PATCH was out.
  function storageChanged() {
    if (disposed) return;
    if (!settleNow()) return;
    armPush();
    if (status === 'synced' || status === 'idle' || status === 'pending') setStatus('pending');
  }
  // What this device has merged becomes base, so that ANY marker it later
  // removes is seen as a local deletion — including one the remote read lacked.
  // Persisted here, not after the write: the markers are already in the UI, and
  // a base that lags them (write failed, page closed first) makes a marker
  // deleted in between look like one this device never had.
  function mergeRemote(remote) {
    var local = settleTombstones(getMarkers() || []);
    var info = mergeMarkersInfo(meta.base, local, remote, stones);
    setMarkers(info.markers);
    // Snapshot: setMarkers made `info.markers` the SPA's live array; an in-place
    // edit or splice would otherwise mutate base too and corrupt the merge.
    meta.base = snapshotMarkers(info.markers);
    saveMeta();
    info.carried = Object.keys(stones);
    return info;
  }

  function armDebounce() {
    if (debounceId !== null) clearT(debounceId);
    debounceId = setT(function () { debounceId = null; flush(); }, DEBOUNCE_MS);
  }
  function clearDirty() { dirty = false; if (debounceId !== null) { clearT(debounceId); debounceId = null; } }

  function notifyEdit() {
    if (disposed) return;
    settleNow();
    dirty = true; editSeq += 1; armDebounce();
    if (status === 'synced' || status === 'idle' || status === 'pending') setStatus('pending');
  }
  function flushSoon() {
    if (disposed || !dirty) return;
    if (coalesceId !== null) clearT(coalesceId);
    coalesceId = setT(function () { coalesceId = null; flush(); }, COALESCE_MS);
  }

  // Flushes AND pulls share one lane. A pull reading around an in-flight flush
  // gets the body from before the flush's PATCH and merges it after base moved.
  function serialised(work) {
    inflight = work().then(function () { inflight = null; }, function () { inflight = null; });
    return inflight;
  }

  function flush(fopts) {
    if (disposed || (!dirty && !(fopts && fopts.force))) return Promise.resolve();
    if (inflight) return inflight.then(function () { return flush(fopts); });
    return serialised(function () { return doFlush(fopts); });
  }

  function fail(e) {
    if (disposed) return;
    var msg = e && e.message, st = e && e.status;
    if (isOffline(e)) { setStatus('pending', { kind: 'offline', message: msg }); return; }
    setStatus('error', { kind: 'sync', message: msg || String(e), httpStatus: st });
  }

  function request(start) {
    return deadline(start, {
      timeoutMs: MARKER_REQUEST_TIMEOUT_MS, what: 'markers', fetchImpl: fetchImpl,
    });
  }

  // Re-attach by title: list the markers-labelled issues and exact-match the
  // deterministic title. GitHub's list shows a new issue at once; a BROWSER
  // need not — the list is served `max-age=60`, and from its HTTP cache a
  // browser answers "no such issue" for a minute after this client created
  // one. So every page of the list is requested past that cache, and an empty
  // list is still never the last word on an issue whose number is known.
  function findByTitle() {
    return request(function (f) {
      return gh.listIssuesByLabel(api, token, MARKER_LABEL, fresh(f));
    }).then(function (rows) {
      var found = (rows || []).filter(function (r) { return r.title === title; })[0] || null;
      if (found) {
        meta.number = found.number; meta.nodeId = found.node_id; meta.url = found.html_url || meta.url;
      }
      return found;
    });
  }
  function fetchIssue(number) {
    return request(function (f) { return gh.getIssue(api, token, number, f); });
  }
  // The issue this device last wrote, or null once GitHub says it is gone
  // (deleted: 404/410) — and then the number is forgotten.
  function fetchKnownIssue() {
    return fetchIssue(meta.number).catch(function (e) {
      if (!e || (e.status !== 404 && e.status !== 410)) throw e;
      return null;
    }).then(function (iss) {
      if (!iss) { meta.number = null; meta.url = null; meta.nodeId = null; }
      return iss;
    });
  }
  function fetchByTitle() {
    return findByTitle().then(function (row) { return row ? fetchIssue(row.number) : null; });
  }
  // Both resolve to the issue as GitHub holds it now, or null: there is none.
  //
  // A write goes to the number this device knows, without asking the list: a
  // flush is what CREATES an issue when it finds none, so it must not depend on
  // a list that can miss one. A read asks the list first — if two issues carry
  // the title (two devices each created one), every device settles on the
  // same one there — and falls back on the known number.
  function issueForWrite() {
    if (!meta.number) return fetchByTitle();
    return fetchKnownIssue().then(function (iss) { return iss || fetchByTitle(); });
  }
  function issueForRead() {
    return findByTitle().then(function (row) {
      if (row) return fetchIssue(row.number);
      return meta.number ? fetchKnownIssue() : null;
    });
  }

  // The markers are read where they are USED, after the awaits: clear-all
  // assigns a new live array, and so does every setMarkers, so a copy taken
  // when the flush began can be a list the user has since emptied.
  function doFlush(fopts) {
    var seqAtStart;
    setStatus('syncing');
    return issueForWrite().then(function (iss) {
      if (disposed) return;
      if (!iss) return createFromLocal();
      // A closed issue carries no active markers; reading its (possibly stale)
      // body would resurrect just-deleted markers (C1). Treat closed as empty.
      var remote = (iss.state === 'closed') ? [] : parseMarkersBlock(iss.body);
      seqAtStart = editSeq;
      var info = mergeRemote(remote), merged = info.markers;
      // Empty = teardown: clear the marker block AND close in one PATCH, so a
      // later reopen/pull cannot resurrect the deleted markers from a stale
      // body (C1). Otherwise reopen (if closed) AND write the body in ONE
      // PATCH — a separate reopen then body write leaves a cross-device window
      // where a concurrent teardown strands the body on a closed issue.
      var fields = { body: buildIssueBody(merged, heading), state: merged.length ? 'open' : 'closed' };
      return request(function (f) { return gh.updateIssue(api, token, meta.number, fields, f); }).then(function () {
        if (disposed) return;
        markDeletionsWritten(info.carried);
        if (editSeq === seqAtStart) { clearDirty(); setStatus(merged.length ? 'synced' : 'idle'); }
        // A mid-teardown re-add re-syncs; never a lying idle.
        else setStatus(merged.length ? 'synced' : 'pending');
        storageChanged();
      });
    }).catch(fail);
  }

  // As in mergeRemote, what the issue is about to be given becomes base BEFORE
  // the request leaves. The create can land while its answer is never handled
  // (page closed, engine destroyed): a marker deleted in between is then in the
  // issue and in no base, and the reopened page would merge it back in as
  // another device's. If the create fails instead, base runs ahead of an issue
  // that does not exist — which costs nothing: the retry sends the list as it
  // is by then, and a marker removed meanwhile only gains a tombstone.
  function createFromLocal() {
    var seqAtStart = editSeq;
    var live = getMarkers() || [];
    var local = settleTombstones(live);
    if (local.length !== live.length) setMarkers(local);
    if (!local.length) { saveMeta(); clearDirty(); setStatus('idle'); return; }
    // Snapshot NOW: `local` may be the SPA's live array, which a splice during
    // the request changes in place — base must be what the issue was given.
    var sent = snapshotMarkers(local), carried = Object.keys(stones);
    meta.base = sent;
    saveMeta();
    return request(function (f) { return gh.ensureLabel(api, token, MARKER_LABEL, f); }).then(function () {
      return request(function (f) {
        return gh.createIssue(api, token,
          { title: title, labels: [MARKER_LABEL], body: buildIssueBody(sent, heading) }, f);
      });
    }).then(function (issue) {
      if (disposed) return;
      meta.number = issue.number; meta.url = issue.html_url; meta.nodeId = issue.node_id;
      markDeletionsWritten(carried);
      if (editSeq === seqAtStart) clearDirty();
      setStatus('synced');
      storageChanged();
    });
  }

  // Adopt the remote issue's markers on open (another device may have synced).
  // Additive merge keeps ALL local markers (a stale/empty read can't delete
  // one) and adds genuinely-new remote markers; `changedVsRemote` arms a push
  // for any local-only markers so this device converges instead of stranding
  // them (C2).
  function pull(force) {
    if (disposed) return Promise.resolve();
    if (inflight) return inflight.then(function () { return pull(force); });
    var t = now();
    if (!force && t - lastPullAt < PULL_THROTTLE_MS) return Promise.resolve();
    lastPullAt = t;
    return serialised(doPull);
  }

  function doPull() {
    return issueForRead().then(function (iss) {
      if (disposed) return;
      if (!iss) {
        // No markers issue yet. If we already hold local markers that predate
        // this engine (page re-opened with markers from a previous session and
        // no fresh action, so no notifyEdit fires), arm a push so the first sync
        // still creates the issue instead of waiting for a new marker action.
        var info0 = mergeMarkersInfo(meta.base, getMarkers() || [], []);
        if (info0.changedVsRemote) { armPush(); setStatus('pending'); }
        return;
      }
      // Closed == no active markers (C1): never seed a resurrection from a
      // stale body.
      var remote = (iss.state === 'closed') ? [] : parseMarkersBlock(iss.body);
      var info = mergeRemote(remote);
      if (info.changedVsRemote) {
        // Local still differs from the remote — schedule a push (do not report
        // `synced`, which would leave local-only markers stranded).
        armPush(); setStatus('pending');
      } else if (!dirty) {
        setStatus(remote.length ? 'synced' : 'idle');
      }
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
    storageChanged: storageChanged,
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
  markerTombstoneKey: markerTombstoneKey,
  renderMarkersTable: renderMarkersTable,
  buildIssueBody: buildIssueBody,
  parseMarkersBlock: parseMarkersBlock,
  mergeMarkers: mergeMarkers,
  TOMBSTONE_TTL_MS: TOMBSTONE_TTL_MS,
  TOMBSTONE_UNWRITTEN_MAX_AGE_MS: TOMBSTONE_UNWRITTEN_MAX_AGE_MS,
  MARKER_REQUEST_TIMEOUT_MS: MARKER_REQUEST_TIMEOUT_MS,
};
if (typeof module !== 'undefined' && module.exports) module.exports = _api;
else Object.keys(_api).forEach(function (k) { window[k] = _api[k]; });
