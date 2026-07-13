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

function renderMarkersTable(markers, heading) {
  var lines = ['## Markers' + (heading ? ' — ' + heading : ''), '',
    '| Time | Subtitle | Comment |', '|------|----------|---------|'];
  (markers || []).forEach(function (m) {
    lines.push('| ' + (m.tc || '') + ' | ' + (m.text || '') + ' | ' + (m.comment || '') + ' |');
  });
  return lines.join('\n');
}

var BLOCK_RE = /<!-- sy-markers: ([A-Za-z0-9+/=]*) -->/;

function buildIssueBody(markers, heading) {
  return renderMarkersTable(markers, heading)
    + '\n\n<!-- sy-markers: ' + b64encode(JSON.stringify(markers || [])) + ' -->\n';
}

function parseMarkersBlock(body) {
  var m = BLOCK_RE.exec(body || '');
  if (!m) return [];
  try {
    var arr = JSON.parse(b64decode(m[1]));
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

// 3-way merge by marker identity (time|text), reusing edit_sync's tested merge.
// A `preview_`-prefixed synthetic key makes flattenDoc treat the value as a
// marker entry (merged per marker, delete-by-absence like edits).
function mergeMarkers(base, local, remote) {
  var K = 'preview_marker_sync';
  var merged = _mergeSyncDocs()(
    { [K]: { markers: base || [] } },
    { [K]: { markers: local || [] } },
    { [K]: { markers: remote || [] } }
  );
  return (merged.entries[K] && merged.entries[K].markers) || [];
}

var _api = {
  MARKER_LABEL: MARKER_LABEL,
  markerIssueTitle: markerIssueTitle,
  markerMetaKey: markerMetaKey,
  renderMarkersTable: renderMarkersTable,
  buildIssueBody: buildIssueBody,
  parseMarkersBlock: parseMarkersBlock,
  mergeMarkers: mergeMarkers,
};
if (typeof module !== 'undefined' && module.exports) module.exports = _api;
else Object.keys(_api).forEach(function (k) { window[k] = _api[k]; });
