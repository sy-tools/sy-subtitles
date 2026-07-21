// Pure helpers for the "my work" mine-filter extension: classify the
// signed-in user's PRs/issues (one /issues?creator= query) and map them onto
// talks. Loaded as a plain <script> by the SPA and require()d by the Node
// test suite — single source, same pattern as talk_slug.js.

// Title contracts (producers): edit_sync.js draft PRs, takeForReview issues,
// marker_sync.js issues; fallback = first date-slug token anywhere in the
// title (manual/legacy items). Extracted ids are validated against the
// manifest by buildMyWork, so a false-positive fallback match is harmless.
function parseTalkIdFromTitle(title) {
  if (!title) return null;
  var m = /^Edit sync: (\S+) \(/.exec(title)
    || /^Review: (\S+)\s*$/.exec(title)
    || /^Markers: (\S+) \/ /.exec(title)
    || /(\d{4}-\d{2}-\d{2}_\S+)/.exec(title);
  return m ? m[1] : null;
}

function classifyWorkRow(row) {
  // "Review: <id>" issues are tracking artifacts: whoever clicks
  // take-for-review first CREATES the issue, but the review belongs to the
  // ASSIGNEE — and assignment is already the "mine" source via the
  // review-status reviewer field. Counting them by creator pulled talks
  // reviewed by OTHERS into "work I started" (live bug: issue #2).
  if (row && /^Review: /.test(row.title || '')) return null;
  var talkId = parseTalkIdFromTitle(row && row.title);
  if (!talkId) return null;
  var isPr = !!(row.pull_request);
  var state;
  if (isPr) {
    // PR states the user cares about: draft / open / merged. A closed
    // UNMERGED PR is noise (mostly sync PRs auto-closed by edit-sync
    // teardown after a revert) — excluded entirely.
    if (row.pull_request.merged_at) state = 'merged';
    else if (row.state !== 'open') return null;
    else state = row.draft ? 'draft' : 'open';
  } else {
    state = row.state === 'open' ? 'open' : 'closed';
  }
  return { talkId: talkId, kind: isPr ? 'pr' : 'issue', state: state,
    number: row.number, url: row.html_url };
}

function buildMyWork(rows, knownIds) {
  var map = {};
  (rows || []).forEach(function (row) {
    var item = classifyWorkRow(row);
    if (!item || !knownIds[item.talkId]) return;
    (map[item.talkId] = map[item.talkId] || []).push(item);
  });
  Object.keys(map).forEach(function (id) {
    map[id].sort(function (a, b) { return a.number - b.number; });
  });
  return map;
}

// Mode filter: normal mode counts only ACTIVE items (open + draft — draft
// sync PRs are the primary kind of ongoing work); expert counts all states.
function myWorkItemsFor(workMap, talkId, expertMode) {
  var items = (workMap && workMap[talkId]) || [];
  if (expertMode) return items;
  return items.filter(function (i) { return i.state === 'open' || i.state === 'draft'; });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseTalkIdFromTitle: parseTalkIdFromTitle,
    classifyWorkRow: classifyWorkRow,
    buildMyWork: buildMyWork,
    myWorkItemsFor: myWorkItemsFor,
  };
}
