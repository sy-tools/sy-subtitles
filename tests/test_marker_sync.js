const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  markerIssueTitle, markerMetaKey, markerTombstoneKey, renderMarkersTable,
  buildIssueBody, parseMarkersBlock, mergeMarkers, MARKER_LABEL,
  createMarkerSyncEngine,
} = require('../site/js/marker_sync');

const M = (time, text, comment) => ({ time, text, tc: '00:00:0' + time, comment: comment || '' });

// --- engine harness (mirrors tests/test_edit_sync.js) ----------------------
const API = 'https://api.github.com/repos/o/r';
const TALK = '1977_T';
const VIDEO = 'V1';
const TITLE = markerIssueTitle(TALK, VIDEO);
const META_KEY = markerMetaKey(TALK, VIDEO);
const STONE_KEY = markerTombstoneKey(TALK, VIDEO);

function memStorage(init) {
  const store = Object.assign({}, init);
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store,
  };
}
function timerHarness() {
  let next = 1; const timers = {};
  return {
    set(fn) { const id = next++; timers[id] = fn; return id; },
    clear(id) { delete timers[id]; },
    pending() { return Object.keys(timers).length; },
    fireAll() { const fns = Object.values(timers); Object.keys(timers).forEach((k) => delete timers[k]); fns.forEach((fn) => fn()); },
  };
}

// Stateful issue double: one issue, seeded via over.issue (title must match).
function ghIssueStub(over) {
  over = over || {};
  const calls = [];
  let issue = over.issue || null;
  let nextNum = over.nextNum || 50;
  return {
    calls,
    _issue: () => issue,
    ensureLabel: async () => { calls.push(['ensureLabel']); return null; },
    listIssuesByLabel: async () => { calls.push(['list']); return issue ? [issue] : []; },
    getIssue: async () => { calls.push(['get', issue && issue.number]); return issue; },
    createIssue: async (a, t, f) => {
      calls.push(['create', f.title, (f.labels || []).join(',')]);
      if (over.onCreate) over.onCreate();
      issue = { number: nextNum, title: f.title, state: 'open', node_id: 'I', body: f.body, html_url: 'u' + nextNum };
      return { number: nextNum, html_url: 'u' + nextNum, node_id: 'I' };
    },
    updateIssue: async (a, t, n, fields) => {
      calls.push(['update', n, fields.state]);
      if (over.onUpdate) over.onUpdate(fields);
      if (issue) { if (fields.body !== undefined) issue.body = fields.body; if (fields.state) issue.state = fields.state; }
      return issue;
    },
    setIssueState: async (a, t, n, s) => {
      calls.push(['state', n, s]);
      if (over.onState) over.onState(s);
      if (issue) issue.state = s;
      return issue;
    },
  };
}

function markerEngine(over, storageInit) {
  over = over || {};
  const timers = timerHarness();
  const gh = ghIssueStub(over);
  const statuses = [];
  const storage = memStorage(storageInit || {});
  let markers = (over.localMarkers || []).slice();
  const engine = createMarkerSyncEngine({
    api: API, owner: 'o', login: 'me', token: 'x', repo: 'o/r',
    talkId: TALK, videoSlug: VIDEO, heading: 'Video One',
    getMarkers: () => markers,
    setMarkers: (m) => { markers = m; },
    storage, gh,
    now: () => 1770000000000,
    setTimeoutFn: timers.set.bind(timers), clearTimeoutFn: timers.clear.bind(timers),
    isOffline: (e) => /fetch failed/.test((e && e.message) || ''),
    onStatus: (s) => statuses.push(s),
  });
  return {
    engine, gh, storage, statuses, timers,
    setLocal: (m) => { markers = m; },
    getLocal: () => markers,
  };
}
const kinds = (gh) => gh.calls.map((c) => c[0]);

describe('marker_sync helpers', () => {
  it('deterministic title + meta key + label', () => {
    assert.strictEqual(markerIssueTitle('1977_T', 'V1'), 'Markers: 1977_T / V1');
    assert.strictEqual(markerMetaKey('1977_T', 'V1'), 'sy_marker_issue_1977_T_V1');
    assert.strictEqual(MARKER_LABEL, 'markers');
  });
  it('body round-trips markers through the hidden block', () => {
    const markers = [M(1, 'alpha', 'c1'), M(2, 'beta')];
    const body = buildIssueBody(markers, 'Video X');
    assert.ok(body.includes('| Time | Subtitle | Comment |'));
    assert.ok(body.includes('alpha'));
    assert.ok(body.includes('<!-- sy-markers:'));
    assert.deepStrictEqual(parseMarkersBlock(body), markers);
  });
  it('renders a human table with the heading', () => {
    const t = renderMarkersTable([M(1, 'alpha', 'c1')], 'Video X');
    assert.ok(t.startsWith('## Markers — Video X'));
    assert.ok(t.includes('| 00:00:01 | alpha | c1 |'));
  });
  it('escapes backslashes before pipes so "\\|" cannot break the table (CodeQL)', () => {
    // A lone backslash must be doubled: "c\\d" -> "c\\\\d".
    assert.ok(renderMarkersTable([M(2, 'c\\d', '')], 'V').includes('c\\\\d'));
    // "a\\|b" must escape the backslash FIRST, then the pipe, so the pipe stays
    // escaped in-cell: "a\\|b" -> "a\\\\\\|b" (not "a\\|b", which markdown reads
    // as a literal backslash followed by a bare column break).
    assert.ok(renderMarkersTable([M(1, 'a\\|b', '')], 'V').includes('a\\\\\\|b'));
  });
  it('parseMarkersBlock returns [] when absent or corrupt', () => {
    assert.deepStrictEqual(parseMarkersBlock('no block here'), []);
    assert.deepStrictEqual(parseMarkersBlock('<!-- sy-markers: @@@ -->'), []);
  });
  it('mergeMarkers unions concurrent additions by identity', () => {
    const base = [M(1, 'a')];
    const local = [M(1, 'a'), M(2, 'local')];       // this device added 2
    const remote = [M(1, 'a'), M(3, 'remote')];     // other device added 3
    const texts = mergeMarkers(base, local, remote).map((m) => m.text).sort();
    assert.deepStrictEqual(texts, ['a', 'local', 'remote']);
  });
  it('mergeMarkers deletes by absence (local removed, remote unchanged)', () => {
    const base = [M(1, 'a'), M(2, 'b')];
    const local = [M(1, 'a')];                       // this device deleted b
    const remote = [M(1, 'a'), M(2, 'b')];           // other unchanged
    assert.deepStrictEqual(mergeMarkers(base, local, remote).map((m) => m.text), ['a']);
  });
  it('mergeMarkers on an empty everything is empty', () => {
    assert.deepStrictEqual(mergeMarkers([], [], []), []);
  });
});

describe('marker_sync engine', () => {
  it('creates the labelled issue on the first marker', async () => {
    const { engine, gh } = markerEngine({ localMarkers: [M(1, 'alpha')] });
    engine.notifyEdit();
    await engine.flush();
    const create = gh.calls.find((c) => c[0] === 'create');
    assert.deepStrictEqual([create[1], create[2]], [TITLE, MARKER_LABEL]);
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(engine.getInfo().issueNumber, 50);
    assert.strictEqual(engine.getInfo().issueUrl, 'u50');
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body).map((m) => m.text), ['alpha']);
  });

  it('does nothing when there is no issue and no markers', async () => {
    const { engine, gh } = markerEngine({ localMarkers: [] });
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'create').length, 0);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('updates the existing issue body on a marker change (pull+merge+patch)', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([M(1, 'alpha')], 'Video One') };
    const { engine, gh } = markerEngine({ issue: seeded, localMarkers: [M(1, 'alpha'), M(2, 'beta')] });
    engine.notifyEdit();
    await engine.flush();
    assert.ok(kinds(gh).includes('get') && kinds(gh).includes('update'));
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'create').length, 0);
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body).map((m) => m.text).sort(), ['alpha', 'beta']);
  });

  it('closes the issue when the last marker is removed (teardown)', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([M(1, 'alpha')], 'Video One') };
    // base recorded the marker, so emptying local deletes it in the merge.
    const { engine, gh } = markerEngine({ issue: seeded, localMarkers: [] },
      { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [M(1, 'alpha')] }) });
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh._issue().state, 'closed');
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body), [], 'teardown empties the marker block');
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('reopens the same closed issue when a marker returns', async () => {
    const seeded = { number: 7, title: TITLE, state: 'closed', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([], 'Video One') };
    const { engine, gh } = markerEngine({ issue: seeded, localMarkers: [M(3, 'again')] });
    engine.notifyEdit();
    await engine.flush();
    // Reopen + body write are ONE PATCH now: the update carries state:'open'.
    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'update'), ['update', 7, 'open']);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('3-way merges a concurrent remote marker instead of clobbering it', async () => {
    // Remote (other device) has {1:a, 5:remote}; base was {1:a}; local added {2:local}.
    const remoteBody = buildIssueBody([M(1, 'a'), M(5, 'remote')], 'Video One');
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7', body: remoteBody };
    const { engine, gh, getLocal } = markerEngine(
      { issue: seeded, localMarkers: [M(1, 'a'), M(2, 'local')] },
      { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [M(1, 'a')] }) });
    engine.notifyEdit();
    await engine.flush();
    const committed = parseMarkersBlock(gh._issue().body).map((m) => m.text).sort();
    assert.deepStrictEqual(committed, ['a', 'local', 'remote']);
    // setMarkers wrote the merged set back into the SPA's markers.
    assert.deepStrictEqual(getLocal().map((m) => m.text).sort(), ['a', 'local', 'remote']);
  });

  it('re-attaches by title via the list API with no stored number', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([M(1, 'a')], 'Video One') };
    const { engine, gh } = markerEngine({ issue: seeded, localMarkers: [M(1, 'a'), M(2, 'b')] });
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'create').length, 0, 'must reuse, not create');
    assert.strictEqual(engine.getInfo().issueNumber, 7);
  });

  it('snapshots base on create so a later in-place removal still tears down', async () => {
    // Regression: meta.base = local aliased the SPA's live markers array; a
    // later splice emptied base too, so the merge unioned instead of deleting.
    const live = [M(1, 'a')];
    const gh = ghIssueStub({});
    const storage = memStorage({});
    const timers = timerHarness();
    const engine = createMarkerSyncEngine({
      api: API, owner: 'o', login: 'me', token: 'x', talkId: TALK, videoSlug: VIDEO, heading: 'V',
      getMarkers: () => live,
      setMarkers: (m) => { live.length = 0; m.forEach((x) => live.push(x)); },
      storage, gh, now: () => 1,
      setTimeoutFn: timers.set.bind(timers), clearTimeoutFn: timers.clear.bind(timers),
      isOffline: () => false, onStatus: () => {},
    });
    engine.notifyEdit();
    await engine.flush();                 // create; base snapshot = [a]
    live.splice(0, 1);                     // in-place removal (the aliasing hazard)
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh._issue().state, 'closed');
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body), []);
  });

  it('snapshots base after a merge/update so a later removal still tears down', async () => {
    // The SPA's setMarkers aliases its live array (previewState.markers = m); if
    // meta.base = merged (not a copy), a later splice empties base too and the
    // teardown never fires. This mimics that aliasing setMarkers.
    const state = { live: [M(1, 'a')] };
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([], 'V') };
    const gh = ghIssueStub({ issue: seeded });
    const storage = memStorage({ [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [] }) });
    const timers = timerHarness();
    const engine = createMarkerSyncEngine({
      api: API, owner: 'o', login: 'me', token: 'x', talkId: TALK, videoSlug: VIDEO, heading: 'V',
      getMarkers: () => state.live,
      setMarkers: (m) => { state.live = m; },   // aliases, exactly like the SPA
      storage, gh, now: () => 1,
      setTimeoutFn: timers.set.bind(timers), clearTimeoutFn: timers.clear.bind(timers),
      isOffline: () => false, onStatus: () => {},
    });
    engine.notifyEdit();
    await engine.flush();                 // update path: setMarkers(merged) aliases state.live
    state.live.splice(0, 1);              // in-place removal on that shared array
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh._issue().state, 'closed');
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body), []);
  });

  it('does not drop a marker added mid-teardown; chip never lies idle', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([M(1, 'a')], 'Video One') };
    const holder = {};
    // onUpdate (fired during the teardown close+clear PATCH) injects a fresh
    // marker + notify, as if the user re-added one while the request was on the wire.
    const h = markerEngine(
      { issue: seeded, localMarkers: [], onUpdate: () => holder.fn && holder.fn() },
      { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [M(1, 'a')] }) });
    holder.fn = () => { h.setLocal([M(9, 'redo')]); h.engine.notifyEdit(); };
    h.engine.notifyEdit();
    await h.engine.flush();
    assert.notStrictEqual(h.engine.getInfo().status, 'idle', 'a mid-teardown re-add must not read idle');
  });

  // C1: a CLOSED issue must never seed markers back into the SPA. Teardown
  // closes-not-deletes, so a stale body can linger; attach/pull must read a
  // closed issue as empty and leave local markers alone (no resurrection, no
  // lying `synced` chip).
  it('does not resurrect markers from a closed issue on attach (C1)', async () => {
    const stale = buildIssueBody([M(1, 'ghost'), M(2, 'ghost2')], 'Video One');
    const seeded = { number: 9, title: TITLE, state: 'closed', node_id: 'I9', html_url: 'u9', body: stale };
    const { engine, gh, getLocal } = markerEngine({ issue: seeded, localMarkers: [] },
      { [META_KEY]: JSON.stringify({ number: 9, url: 'u9', nodeId: 'I9', base: [] }) });
    await engine.attach();
    assert.deepStrictEqual(getLocal(), [], 'a closed issue must not repopulate local markers');
    assert.notStrictEqual(engine.getInfo().status, 'synced', 'chip must not lie synced on a closed issue');
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'update' || c[0] === 'state').length, 0,
      'a pull must not reopen or rewrite a closed issue');
  });

  // C2: device B has a local-only marker and the remote issue is open-but-empty.
  // attach must adopt the REMOTE as base and PUSH the local marker up, not fold
  // it into base (which delete-by-absence would silently drop on the next flush).
  it('pushes a local-only marker on attach instead of stranding it (C2)', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([], 'Video One') };
    const { engine, gh } = markerEngine({ issue: seeded, localMarkers: [M(2, 'localonly')] });
    await engine.attach();                            // pull: base := remote([]), arm a push
    assert.strictEqual(engine.getInfo().status, 'pending', 'local≠remote must not read synced');
    await engine.flush();                             // the armed push lands the local marker
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body).map((m) => m.text), ['localonly']);
  });

  // Same class as the edit-sync "pre-existing edits on attach" bug, but for the
  // markers issue: NO issue exists yet and the user takes no fresh action (page
  // re-opened with markers from a previous session). attach must still create it.
  it('creates the issue for local markers that predate the engine (no issue yet)', async () => {
    const { engine, gh } = markerEngine({ localMarkers: [M(3, 'from a previous session')] });
    await engine.attach();                            // resolveIssue -> no row
    assert.strictEqual(engine.getInfo().dirty, true,
      'attach must mark pre-existing local markers dirty so the first sync triggers');
    await engine.flush();
    assert.ok(gh._issue(), 'a markers issue must be created for markers that predate the engine');
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body).map((m) => m.text),
      ['from a previous session']);
  });

  // NETWORK SAFETY: issues have no CAS (no sha). A stale / empty / partial remote
  // read must NEVER delete a local marker via delete-by-absence — that caused live
  // marker loss. Deletions propagate ONLY from an explicit LOCAL removal.
  it('a stale EMPTY remote read keeps local markers and heals, never tears down', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([], 'Video One') };  // reads back empty (eventual consistency)
    const { engine, gh, getLocal } = markerEngine(
      { issue: seeded, localMarkers: [M(1, 'a'), M(2, 'b')] },
      { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [M(1, 'a'), M(2, 'b')] }) });
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(getLocal().map((m) => m.text).sort(), ['a', 'b'], 'local markers survive');
    assert.notStrictEqual(gh._issue().state, 'closed', 'must not tear down on a stale read');
    assert.deepStrictEqual(parseMarkersBlock(gh._issue().body).map((m) => m.text).sort(), ['a', 'b'],
      'the stale remote is healed by re-pushing the local markers');
  });
  it('a stale remote read missing ONE marker does not delete it', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([M(1, 'a')], 'Video One') };  // 'b' missing from this read
    const { engine, getLocal } = markerEngine(
      { issue: seeded, localMarkers: [M(1, 'a'), M(2, 'b')] },
      { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [M(1, 'a'), M(2, 'b')] }) });
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(getLocal().map((m) => m.text).sort(), ['a', 'b']);
  });
  it('a comment typed in place survives the next flush (no revert/aliasing)', async () => {
    const live = [M(1, 'a', '')];
    const gh = ghIssueStub({});
    const storage = memStorage({});
    const timers = timerHarness();
    const engine = createMarkerSyncEngine({
      api: API, owner: 'o', login: 'me', token: 'x', talkId: TALK, videoSlug: VIDEO, heading: 'V',
      getMarkers: () => live,
      setMarkers: (m) => { live.length = 0; m.forEach((x) => live.push(x)); },
      storage, gh, now: () => 1,
      setTimeoutFn: timers.set.bind(timers), clearTimeoutFn: timers.clear.bind(timers),
      isOffline: () => false, onStatus: () => {},
    });
    engine.notifyEdit();
    await engine.flush();                 // create; base snapshot = [a, '']
    live[0].comment = 'my note';          // in-place comment edit (aliasing hazard)
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(parseMarkersBlock(gh._issue().body)[0].comment, 'my note',
      'the typed comment reaches the issue, not reverted to base');
    assert.strictEqual(live[0].comment, 'my note');
  });

  // I3: a marker's own text may embed a decoy `<!-- sy-markers: <b64> -->`. The
  // real block is appended LAST by buildIssueBody, so the parser must read the
  // last match (and the human table must not emit a live comment), else a
  // crafted marker hijacks the structured payload cross-device.
  it('parseMarkersBlock ignores a decoy block embedded in marker text (I3)', () => {
    const evil = Buffer.from(JSON.stringify([{ time: 9, tc: '00:00:09', text: 'EVIL', comment: '' }]),
      'utf-8').toString('base64');
    const markers = [{ time: 1, tc: '00:00:01', text: 'x <!-- sy-markers: ' + evil + ' -->', comment: '' }];
    const body = buildIssueBody(markers, 'V');
    assert.deepStrictEqual(parseMarkersBlock(body), markers, 'the appended real block wins, not the decoy');
    assert.strictEqual(parseMarkersBlock(body).some((m) => m.text === 'EVIL'), false);
  });
});

// ---------------------------------------------------------------------------
// Deleted markers must STAY deleted. Issues have no CAS token, so a read that
// follows our own write can still return the body from before it (replica lag,
// an HTTP cache, a GET that raced the PATCH). The harness below models GitHub
// as "what the server really holds" plus a queue of lagging read results.
// ---------------------------------------------------------------------------
const { TOMBSTONE_TTL_MS, TOMBSTONE_UNWRITTEN_MAX_AGE_MS, MARKER_REQUEST_TIMEOUT_MS } = require('../site/js/marker_sync');

function lagHarness(initial, over) {
  over = over || {};
  // `over.tabOf` = another harness: a second tab of the same browser, i.e. the
  // same localStorage and the same GitHub, but its own engine and live array.
  const tab = over.tabOf || null;
  const h = {
    live: initial.slice(),
    server: tab ? tab.server : { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody(initial, 'V'), exists: over.noIssue ? false : true },
    listGate: null,          // when set, the next listIssuesByLabel waits on it
    staleReads: [],          // bodies the NEXT getIssue calls return instead of the truth
    getGate: null,           // when set, the next getIssue waits on it (answer fixed at request time)
    failNextUpdate: false,
    clock: 1770000000000,
    calls: [],
  };
  h.serverTimes = () => parseMarkersBlock(h.server.body).map((m) => m.time);
  h.liveTimes = () => h.live.map((m) => m.time);
  h.staleNext = (markers) => h.staleReads.push(buildIssueBody(markers, 'V'));
  // The SPA mutates the live array IN PLACE for a single action (removeMarker
  // splices, addMarker pushes) and REPLACES it only for clear-all. The harness
  // does the same, or it would test a window the app does not have.
  h.remove = (time) => {
    const i = h.live.findIndex((m) => m.time === time);
    if (i >= 0) h.live.splice(i, 1);
    h.engine.notifyEdit();
  };
  h.add = (m) => { h.live.push(m); h.engine.notifyEdit(); };
  h.clearAll = () => { h.live = []; h.engine.notifyEdit(); };
  // Another device writes the issue directly.
  h.otherDeviceWrites = (markers) => { h.server.body = buildIssueBody(markers, 'V'); h.server.state = 'open'; };
  const gh = {
    ensureLabel: async () => null,
    listIssuesByLabel: async () => {
      const rows = h.server.exists ? [h.server] : [];
      if (h.listGate) { const g = h.listGate; h.listGate = null; await g; }
      return rows;
    },
    getIssue: async () => {
      h.calls.push('get');
      if (!h.server.exists) { const e = new Error('Not Found'); e.status = 404; throw e; }
      const body = h.staleReads.length ? h.staleReads.shift() : h.server.body;
      const snap = { number: 7, state: h.server.state, body, node_id: 'I7' };
      if (h.getGate) { const g = h.getGate; h.getGate = null; await g; }
      return snap;
    },
    createIssue: async (a, t, fields) => {
      h.calls.push('create');
      if (h.server.exists) throw new Error('unexpected create');
      if (h.failNextCreate) { h.failNextCreate = false; const e = new Error('boom'); e.status = 502; throw e; }
      h.server.exists = true; h.server.state = 'open'; h.server.body = fields.body;
      if (over.onCreate) over.onCreate(h);
      return { number: 7, html_url: 'u7', node_id: 'I7' };
    },
    updateIssue: async (a, t, n, fields) => {
      h.calls.push('update');
      if (h.failNextUpdate) { h.failNextUpdate = false; const e = new Error('boom'); e.status = 502; throw e; }
      if (fields.body !== undefined) h.server.body = fields.body;
      if (fields.state) h.server.state = fields.state;
      // After the write landed: what the page does before the answer is handled.
      if (over.onUpdate) over.onUpdate(h);
      return h.server;
    },
  };
  const timers = timerHarness();
  h.timers = timers;
  h.storage = over.storageView || (tab ? tab.storage : memStorage(over.storage || {}));
  h.meta = () => JSON.parse(h.storage.getItem(META_KEY));
  h.stones = () => JSON.parse(h.storage.getItem(STONE_KEY) || '{}');
  h.engine = createMarkerSyncEngine({
    api: API, token: 'x', talkId: TALK, videoSlug: VIDEO, heading: 'V',
    getMarkers: () => h.live,
    setMarkers: (m) => { h.live = m; },   // aliases, exactly like the SPA
    storage: h.storage, gh, now: () => h.clock,
    setTimeoutFn: timers.set.bind(timers), clearTimeoutFn: timers.clear.bind(timers),
    isOffline: () => false, onStatus: () => {},
  });
  return h;
}
const deferred = () => { let resolve; const p = new Promise((r) => { resolve = r; }); return { p, resolve }; };
const tick = () => new Promise((r) => setImmediate(r));

describe('marker_sync: a synced deletion survives a stale read', () => {
  const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];

  it('flush: a stale read after a synced deletion does not resurrect it', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
    h.remove(2);
    h.staleNext(ALL);                       // GitHub answers with the body from before both writes
    await h.engine.flush();
    assert.deepStrictEqual(h.liveTimes(), [3], 'the UI must not get the deleted markers back');
    assert.deepStrictEqual(h.serverTimes(), [3], 'and they must not be written back to the issue');
  });

  it('pull: a stale read after a synced deletion does not resurrect it', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    h.staleNext(ALL);
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    await h.engine.flush();                 // whatever the pull armed
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
  });

  it('pull: a GET that started before the deletion was written cannot bring it back', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    const gate = deferred();
    h.getGate = gate.p;
    const pulling = h.engine.pull(true);    // its GET is on the wire, answer = [1,2,3]
    await tick();
    h.remove(1);
    const flushing = h.engine.flush();
    await tick();
    gate.resolve();
    await pulling; await flushing; await h.engine.flush();
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
  });

  it('pull waits for an in-flight flush instead of reading around its write', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.calls.length = 0;
    h.remove(1);
    const flushing = h.engine.flush();
    const pulling = h.engine.pull(true);    // asked for while the flush is in flight
    await flushing; await pulling;
    assert.deepStrictEqual(h.calls, ['get', 'update', 'get'],
      "the pull's GET must come after the flush's PATCH");
  });

  it('flush waits for an in-flight pull', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.calls.length = 0;
    const gate = deferred();
    h.getGate = gate.p;
    const pulling = h.engine.pull(true);
    await tick();
    h.remove(1);
    const flushing = h.engine.flush();
    await tick();
    assert.deepStrictEqual(h.calls, ['get'], 'the flush must not start while the pull is unresolved');
    gate.resolve();
    await pulling; await flushing;
    assert.deepStrictEqual(h.calls, ['get', 'get', 'update']);
  });

  it('several deletions in a row with alternating fresh and stale reads', async () => {
    const five = [M(1, 'a'), M(2, 'b'), M(3, 'c'), M(4, 'd'), M(5, 'e')];
    const h = lagHarness(five);
    await h.engine.attach();
    const history = [five];
    for (const t of [1, 2, 3, 4]) {
      h.remove(t);
      // Odd steps read the truth, even steps read some earlier body.
      if (t % 2 === 0) h.staleNext(history[history.length - 2]);
      await h.engine.flush();
      history.push(parseMarkersBlock(h.server.body));
      const want = [1, 2, 3, 4, 5].filter((x) => x > t);
      assert.deepStrictEqual(h.liveTimes(), want, 'UI after deleting ' + t);
      assert.deepStrictEqual(h.serverTimes(), want, 'issue after deleting ' + t);
      h.staleNext(five);                    // and a lagging focus-pull in between
      await h.engine.pull(true);
      assert.deepStrictEqual(h.liveTimes(), want, 'UI after the pull that followed deleting ' + t);
    }
  });

  it('a fresh read followed by a stale one does not flip-flop', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    await h.engine.pull(true);              // fresh: [2,3]
    h.staleNext(ALL);
    await h.engine.pull(true);              // stale: [1,2,3]
    await h.engine.flush();
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
  });

  it('a deletion made while the flush is reading is not overwritten by the merge', async () => {
    // The SPA flushes ~1.5s after an action; the next delete routinely lands
    // while that flush is between its GET and its PATCH.
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1);
    const gate = deferred();
    h.getGate = gate.p;
    const flushing = h.engine.flush();
    await tick();
    h.remove(2);
    gate.resolve();
    await flushing;
    assert.deepStrictEqual(h.liveTimes(), [3], 'the merge must not put marker 2 back in the UI');
    assert.deepStrictEqual(h.serverTimes(), [3], 'the same PATCH carries the mid-read deletion');
    assert.strictEqual(h.engine.getInfo().dirty, false, 'nothing is left to push');
  });

  it('a marker added while the flush is reading is not dropped by the merge', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1);
    const gate = deferred();
    h.getGate = gate.p;
    const flushing = h.engine.flush();
    await tick();
    h.add(M(4, 'd'));
    gate.resolve();
    await flushing;
    assert.deepStrictEqual(h.liveTimes(), [2, 3, 4]);
  });

  it('an edit made during the PATCH still leaves the engine dirty', async () => {
    const h = lagHarness(ALL, { onUpdate: (hh) => { if (!hh.did) { hh.did = true; hh.remove(2); } } });
    await h.engine.attach();
    h.remove(1);
    await h.engine.flush();
    assert.strictEqual(h.engine.getInfo().dirty, true);
    await h.engine.flush();
    assert.deepStrictEqual(h.serverTimes(), [3]);
  });

  it('a deletion whose PATCH failed is not forgotten', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1);
    h.failNextUpdate = true;
    await h.engine.flush();
    assert.strictEqual(h.engine.getInfo().status, 'error');
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3], 'the write did not land');
    await h.engine.flush({ force: true });  // the remote genuinely still has marker 1
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
  });

  it('an unwritten deletion does not expire, however long the write takes', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1);
    h.failNextUpdate = true;
    await h.engine.flush();
    h.clock += 10 * TOMBSTONE_TTL_MS;       // offline for hours
    await h.engine.pull(true);
    await h.engine.flush({ force: true });
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
  });

  it('deleting a marker a stale pull had missed still deletes it', async () => {
    // The pull used to make base := the remote it read, so a lagging read that
    // lacked a local marker dropped it from base — and a later deletion of that
    // marker was then invisible to the merge.
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.staleNext([M(1, 'a'), M(2, 'b')]);    // read lacks marker 3
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [1, 2, 3]);
    h.remove(3);
    await h.engine.flush();                 // fresh read: the remote has marker 3
    assert.deepStrictEqual(h.liveTimes(), [1, 2]);
    assert.deepStrictEqual(h.serverTimes(), [1, 2]);
  });

  it('a tombstone expires: the identity can come back from another device later', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    h.clock += TOMBSTONE_TTL_MS - 1000;
    h.staleNext(ALL);
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [2, 3], 'still protected just inside the TTL');
    await h.engine.flush();
    h.clock += TOMBSTONE_TTL_MS + 1000;     // well past the TTL, whichever write it counts from
    h.otherDeviceWrites(ALL);               // another device really re-added marker 1
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [1, 2, 3]);
    assert.deepStrictEqual(h.stones(), {});
  });

  it('the user can re-add a deleted identity, and that drops its tombstone', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    assert.deepStrictEqual(Object.keys(h.stones()), ['1|a']);
    h.add(M(1, 'a'));
    h.staleNext([M(2, 'b'), M(3, 'c')]);
    await h.engine.flush();
    assert.deepStrictEqual(h.liveTimes().sort(), [1, 2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3]);
    assert.deepStrictEqual(h.stones(), {});
  });

  it('tombstones survive a reload (persisted under their own key)', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    const h2 = lagHarness([M(2, 'b'), M(3, 'c')], { storage: h.storage._store });
    h2.server.body = h.server.body;
    h2.staleNext(ALL);
    await h2.engine.attach();
    assert.deepStrictEqual(h2.liveTimes(), [2, 3]);
  });

  it('a genuine addition by another device still arrives (flush and pull)', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    h.otherDeviceWrites([M(2, 'b'), M(3, 'c'), M(8, 'theirs')]);
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [2, 3, 8]);
    h.otherDeviceWrites([M(2, 'b'), M(3, 'c'), M(8, 'theirs'), M(9, 'theirs too')]);
    h.remove(2);
    await h.engine.flush();
    assert.deepStrictEqual(h.liveTimes(), [3, 8, 9]);
    assert.deepStrictEqual(h.serverTimes(), [3, 8, 9]);
  });

  it('a comment edit is not reverted by a stale read (local wins on content)', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.live[0].comment = 'my note'; h.engine.notifyEdit();
    await h.engine.flush();
    assert.strictEqual(parseMarkersBlock(h.server.body)[0].comment, 'my note');
    h.staleNext(ALL);                       // the body from before the comment
    await h.engine.pull(true);
    assert.strictEqual(h.live[0].comment, 'my note');
    h.staleNext(ALL);
    h.live[1].comment = 'second'; h.engine.notifyEdit();
    await h.engine.flush();
    assert.deepStrictEqual(parseMarkersBlock(h.server.body).map((m) => m.comment), ['my note', 'second', '']);
  });
});

describe('marker_sync: the live array changes under a flush', () => {
  const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];

  it('clear-all while the flush is reading clears, and the same PATCH closes the issue', async () => {
    // A single delete splices the array the flush already holds, so it was
    // always seen. Clear-all assigns a NEW array: a merge of the array captured
    // when the flush began would put every marker back.
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1);
    const gate = deferred();
    h.getGate = gate.p;
    const flushing = h.engine.flush();
    await tick();
    h.clearAll();
    gate.resolve();
    await flushing;
    assert.deepStrictEqual(h.liveTimes(), [], 'the merge must not bring the cleared markers back');
    assert.deepStrictEqual(h.serverTimes(), []);
    assert.strictEqual(h.server.state, 'closed');
    assert.strictEqual(h.engine.getInfo().dirty, false);
  });

  it('clear-all while the first flush is looking for the issue creates nothing', async () => {
    const h = lagHarness(ALL, { noIssue: true });
    await h.engine.attach();
    h.engine.notifyEdit();
    const gate = deferred();
    h.listGate = gate.p;
    const flushing = h.engine.flush();
    await tick();
    h.clearAll();
    gate.resolve();
    await flushing;
    assert.ok(!h.calls.includes('create'), 'no issue from the markers the user just cleared');
    assert.strictEqual(h.server.exists, false);
  });

  it('a deletion made while the issue is being created is not lost', async () => {
    // The splice changes the very array the create was built from. If base
    // were snapshotted from it afterwards, base would lack a marker the issue
    // holds, and the deletion would be invisible to every later merge.
    const h = lagHarness(ALL, { noIssue: true, onCreate: (hh) => { hh.remove(1); } });
    await h.engine.attach();
    h.engine.notifyEdit();
    await h.engine.flush();
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3], 'created from what was there when it was sent');
    assert.strictEqual(h.engine.getInfo().dirty, true);
    await h.engine.flush();
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
  });
});

describe('marker_sync: two tabs on one talk share the tombstones', () => {
  const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];
  async function twoTabs(initial, overB) {
    const a = lagHarness(initial || ALL);
    const b = lagHarness(initial || ALL, Object.assign({ tabOf: a }, overB));
    await a.engine.attach();
    await b.engine.attach();
    return { a, b };
  }

  it('the other tab honours the deletion instead of pushing the marker back', async () => {
    const { a, b } = await twoTabs();
    a.remove(1); await a.engine.flush();
    assert.deepStrictEqual(a.serverTimes(), [2, 3]);
    b.add(M(4, 'd'));                       // tab B still shows marker 1
    await b.engine.flush();
    assert.deepStrictEqual(b.liveTimes(), [2, 3, 4], 'tab B drops the marker tab A deleted');
    assert.deepStrictEqual(b.serverTimes(), [2, 3, 4], 'and does not write it back');
    assert.deepStrictEqual(Object.keys(b.stones()), ['1|a'],
      "tab B's save keeps tab A's tombstone");
  });

  it("the other tab's save does not erase this tab's tombstone", async () => {
    const { a, b } = await twoTabs();
    a.remove(1); await a.engine.flush();
    b.engine.notifyEdit(); await b.engine.flush();   // tab B saves its meta
    a.staleNext(ALL);                       // and tab A then gets a lagging read
    await a.engine.pull(true);
    await a.engine.flush();
    assert.deepStrictEqual(a.liveTimes(), [2, 3]);
    assert.deepStrictEqual(a.serverTimes(), [2, 3]);
  });

  it('a pull in the other tab honours the deletion too', async () => {
    const { a, b } = await twoTabs();
    a.remove(1); await a.engine.flush();
    b.staleNext(ALL);
    await b.engine.pull(true);
    assert.deepStrictEqual(b.liveTimes(), [2, 3]);
    await b.engine.flush();
    assert.deepStrictEqual(b.serverTimes(), [2, 3]);
  });

  it('the first flush of the other tab honours it when the issue does not exist yet', async () => {
    const { a, b } = await twoTabs(ALL, { noIssue: true });
    a.server.exists = false;
    a.remove(1);                             // tab A's deletion, not yet synced
    b.engine.notifyEdit();
    await b.engine.flush();
    assert.ok(b.calls.includes('create'));
    assert.deepStrictEqual(b.liveTimes(), [2, 3]);
    assert.deepStrictEqual(b.serverTimes(), [2, 3]);
  });

  it('storageChanged drops the marker at once, without a request, and arms a push', async () => {
    const { a, b } = await twoTabs();
    a.remove(1); await a.engine.flush();
    b.calls.length = 0;
    b.engine.storageChanged();
    assert.deepStrictEqual(b.liveTimes(), [2, 3]);
    assert.deepStrictEqual(b.calls, [], 'no network');
    assert.strictEqual(b.engine.getInfo().dirty, true,
      "a PATCH of this tab's may have written the marker back; the next flush settles it");
    assert.strictEqual(b.engine.getInfo().status, 'pending');
    assert.strictEqual(b.stones()['1|a'].writtenAt, 0,
      'until this tab has written without the marker, the deletion counts as unwritten');
    await b.engine.flush();
    assert.deepStrictEqual(b.serverTimes(), [2, 3]);
    assert.strictEqual(b.stones()['1|a'].writtenAt, b.clock);
  });

  it('storageChanged with nothing to drop changes nothing', async () => {
    const { a, b } = await twoTabs();
    a.add(M(4, 'd')); await a.engine.flush();
    const before = b.live;
    b.engine.storageChanged();
    assert.strictEqual(b.live, before, 'the live array is not replaced');
    assert.strictEqual(b.engine.getInfo().dirty, false);
  });

  it('storageChanged after destroy does nothing', async () => {
    const { a, b } = await twoTabs();
    a.remove(1); await a.engine.flush();
    await b.engine.destroy();
    b.engine.storageChanged();
    assert.deepStrictEqual(b.liveTimes(), [1, 2, 3]);
  });

  it('a deletion the other tab makes while this tab is writing is honoured after the write', async () => {
    let done = false, a = null;
    const { a: tabA, b } = await twoTabs(ALL, { onUpdate: () => {
      if (done) return;
      done = true;
      // Tab A deletes and records it between tab B's merge and the end of its PATCH.
      a.remove(1);
    } });
    a = tabA;
    b.add(M(4, 'd'));
    await b.engine.flush();
    assert.deepStrictEqual(a.liveTimes(), [2, 3]);
    assert.deepStrictEqual(b.liveTimes(), [2, 3, 4], 'tab B dropped it as soon as its write finished');
    assert.deepStrictEqual(b.serverTimes(), [1, 2, 3, 4]);
    assert.strictEqual(b.stones()['1|a'].writtenAt, 0,
      "tab B's PATCH still carried marker 1: its deletion is not written yet");
    assert.strictEqual(b.engine.getInfo().dirty, true);
    await b.engine.flush();
    assert.deepStrictEqual(b.serverTimes(), [2, 3, 4]);
    assert.strictEqual(b.stones()['1|a'].writtenAt, b.clock);
  });

  it('a deletion that reaches this tab while its PATCH is out is not stamped by that PATCH', async () => {
    let done = false, a = null, b = null;
    const tabs = await twoTabs(ALL, { onUpdate: () => {
      if (done) return;
      done = true;
      a.remove(1);
      b.engine.storageChanged();             // the `storage` event, delivered at once
    } });
    a = tabs.a; b = tabs.b;
    b.add(M(4, 'd'));
    await b.engine.flush();
    assert.deepStrictEqual(b.liveTimes(), [2, 3, 4]);
    assert.deepStrictEqual(b.serverTimes(), [1, 2, 3, 4], 'the PATCH that was out still carried marker 1');
    assert.strictEqual(b.stones()['1|a'].writtenAt, 0);
  });

  it('a deletion the other tab makes while this tab is creating the issue is honoured after it', async () => {
    let a = null;
    const { a: tabA, b } = await twoTabs(ALL, { noIssue: true, onCreate: () => {
      a.remove(1);
    } });
    a = tabA;
    a.server.exists = false;
    b.engine.notifyEdit();
    await b.engine.flush();
    assert.deepStrictEqual(b.serverTimes(), [1, 2, 3]);
    assert.deepStrictEqual(b.liveTimes(), [2, 3]);
    assert.strictEqual(b.stones()['1|a'].writtenAt, 0, 'the issue was created WITH marker 1');
    await b.engine.flush();
    assert.deepStrictEqual(b.serverTimes(), [2, 3]);
  });

  it('a deletion that reaches this tab while it creates the issue is not stamped by the create', async () => {
    let a = null, b = null;
    const tabs = await twoTabs(ALL, { noIssue: true, onCreate: () => {
      a.remove(1);
      b.engine.storageChanged();
    } });
    a = tabs.a; b = tabs.b;
    a.server.exists = false;
    b.engine.notifyEdit();
    await b.engine.flush();
    assert.deepStrictEqual(b.serverTimes(), [1, 2, 3]);
    assert.strictEqual(b.stones()['1|a'].writtenAt, 0);
  });

  it('a marker this tab ADDED is not taken for the one the other tab deleted', async () => {
    const { a, b } = await twoTabs([M(2, 'b'), M(3, 'c')]);
    a.add(M(1, 'a')); await a.engine.flush();
    a.remove(1); await a.engine.flush();     // tab B never merged marker 1
    b.add(M(1, 'a'));                        // the user puts it back, in tab B
    await b.engine.flush();
    assert.deepStrictEqual(b.liveTimes(), [1, 2, 3]);
    assert.deepStrictEqual(b.serverTimes(), [1, 2, 3]);
    assert.deepStrictEqual(b.stones(), {}, 'the re-add releases the tombstone for both tabs');
  });

  it('a tombstone the other tab released is released here as well', async () => {
    const { a, b } = await twoTabs();
    a.remove(1); await a.engine.flush();
    b.engine.storageChanged();               // tab B now holds the tombstone too
    a.add(M(1, 'a')); await a.engine.flush();   // the user re-adds it in tab A
    assert.deepStrictEqual(a.serverTimes(), [1, 2, 3]);
    await b.engine.pull(true);               // tab B must take it, not delete it again
    await b.engine.flush();
    assert.deepStrictEqual(b.liveTimes(), [1, 2, 3]);
    assert.deepStrictEqual(b.serverTimes(), [1, 2, 3]);
  });

  it('a stamp is not moved by a tab that had nothing to honour', async () => {
    const { a, b } = await twoTabs();
    a.remove(1); await a.engine.flush();
    b.engine.storageChanged(); await b.engine.flush();
    const stamp = b.stones()['1|a'];
    a.clock += 5000;
    a.add(M(4, 'd')); await a.engine.flush();
    assert.deepStrictEqual(a.stones()['1|a'], stamp);
  });
});

describe('marker_sync: tombstone bookkeeping', () => {
  const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];
  const T0 = 1770000000000;

  it('the teardown PATCH stamps the deletions it carried', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.clearAll(); await h.engine.flush();
    assert.strictEqual(h.server.state, 'closed');
    const stamps = h.stones();
    assert.deepStrictEqual(Object.keys(stamps).sort(), ['1|a', '2|b', '3|c']);
    Object.keys(stamps).forEach((id) => assert.strictEqual(stamps[id].writtenAt, h.clock, id));
    // Stamped, so they expire: another device can bring the identity back.
    h.clock += TOMBSTONE_TTL_MS + 1000;
    h.otherDeviceWrites([M(1, 'a')]);
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [1]);
  });

  it('creating the issue records and stamps a deletion the stored base still held', async () => {
    // The issue is gone (deleted on github.com) while this device still has a
    // base from it; marker 1 was removed since.
    const stored = { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: ALL }) };
    const h = lagHarness([M(2, 'b'), M(3, 'c')], { noIssue: true, storage: stored });
    h.engine.notifyEdit();
    await h.engine.flush();
    assert.ok(h.calls.includes('create'));
    assert.deepStrictEqual(h.stones(), { '1|a': { deletedAt: h.clock, writtenAt: h.clock } });
    assert.deepStrictEqual(h.meta().base.map((m) => m.time), [2, 3]);
  });

  it('a deletion keeps its date while the write that carries it keeps failing', async () => {
    const stored = { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: ALL }) };
    const h = lagHarness([M(2, 'b'), M(3, 'c')], { noIssue: true, storage: stored });
    const deletedAt = h.clock;
    h.engine.notifyEdit();
    h.failNextCreate = true;
    await h.engine.flush();
    assert.deepStrictEqual(h.stones(), { '1|a': { deletedAt, writtenAt: 0 } });
    h.clock += 60000;
    h.failNextCreate = true;
    await h.engine.flush({ force: true });
    assert.deepStrictEqual(h.stones(), { '1|a': { deletedAt, writtenAt: 0 } },
      'a retry must not restart the bound on an unwritten deletion');
  });

  it('creating the issue with a re-added identity releases its tombstone', async () => {
    const stored = { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [] }),
      [STONE_KEY]: JSON.stringify({ '1|a': { deletedAt: T0, writtenAt: T0 } }) };
    const h = lagHarness(ALL, { noIssue: true, storage: stored });
    h.engine.notifyEdit();
    await h.engine.flush();
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3]);
    assert.deepStrictEqual(h.stones(), {});
  });

  it('a written tombstone expires when the clock has gone BACKWARDS past the TTL', async () => {
    // Without the absolute value a stamp from the future never expires.
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    h.clock -= TOMBSTONE_TTL_MS + 1000;
    h.otherDeviceWrites(ALL);
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [1, 2, 3]);
    assert.deepStrictEqual(h.stones(), {});
  });

  it('an unwritten tombstone is bounded: it expires after TOMBSTONE_UNWRITTEN_MAX_AGE_MS', async () => {
    // The PATCH landed but the page went away before its answer was handled,
    // so the deletion is never stamped. With no bound it would suppress the
    // same identity coming back from another device for good.
    const h = lagHarness(ALL, { onUpdate: (hh) => { hh.engine.destroy(); } });
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    assert.deepStrictEqual(h.serverTimes(), [2, 3], 'the write landed');
    assert.deepStrictEqual(h.stones(), { '1|a': { deletedAt: h.clock, writtenAt: 0 } });

    const h2 = lagHarness([M(2, 'b'), M(3, 'c')], { tabOf: h });   // the page, reloaded
    h2.clock = h.clock + TOMBSTONE_UNWRITTEN_MAX_AGE_MS - 1000;
    h2.otherDeviceWrites(ALL);              // another device re-adds marker 1
    await h2.engine.attach();
    assert.deepStrictEqual(h2.liveTimes(), [2, 3], 'inside the bound the deletion still holds');
    h2.clock = h.clock + TOMBSTONE_UNWRITTEN_MAX_AGE_MS + 1000;
    await h2.engine.pull(true);
    assert.deepStrictEqual(h2.liveTimes(), [1, 2, 3], 'past it the identity can come back');
    assert.deepStrictEqual(h2.stones(), {});
  });

  it('the unwritten bound also holds when the clock has gone backwards', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1);
    h.failNextUpdate = true;
    await h.engine.flush();
    h.clock -= TOMBSTONE_UNWRITTEN_MAX_AGE_MS + 1000;
    await h.engine.pull(true);
    assert.deepStrictEqual(h.liveTimes(), [1, 2, 3]);
  });

  it('the bound is far above the TTL (a week offline must not undo a deletion)', () => {
    assert.ok(TOMBSTONE_UNWRITTEN_MAX_AGE_MS >= 7 * 24 * 60 * 60 * 1000);
    assert.ok(TOMBSTONE_UNWRITTEN_MAX_AGE_MS > 100 * TOMBSTONE_TTL_MS);
  });

  for (const [label, bad] of [
    ['null', null], ['an array', ['1|a']], ['a string', 'x'], ['a number', 5],
  ]) {
    it('stored tombstones that are ' + label + ' are replaced by an empty map', async () => {
      const stored = { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: ALL }),
        [STONE_KEY]: JSON.stringify(bad) };
      const h = lagHarness(ALL, { storage: stored });
      await h.engine.attach();
      h.remove(1); await h.engine.flush();
      assert.deepStrictEqual(h.stones(), { '1|a': { deletedAt: h.clock, writtenAt: h.clock } });
      // ...and the deletion is really remembered across a reload.
      const h2 = lagHarness([M(2, 'b'), M(3, 'c')], { tabOf: h });
      h2.staleNext(ALL);
      await h2.engine.attach();
      assert.deepStrictEqual(h2.liveTimes(), [2, 3]);
    });
  }

  it('a meta from before tombstones works even if storage is emptied under the open page', async () => {
    const stored = { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: ALL }) };
    const h = lagHarness(ALL, { storage: stored });
    h.storage.removeItem(META_KEY); h.storage.removeItem(STONE_KEY);
    h.remove(1); await h.engine.flush();
    assert.strictEqual(h.engine.getInfo().status, 'synced');
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
    assert.deepStrictEqual(Object.keys(h.stones()), ['1|a']);
  });

  it('malformed tombstone entries are dropped, well-formed ones kept', async () => {
    const good = { deletedAt: T0, writtenAt: T0 };
    const stored = { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [M(2, 'b'), M(3, 'c')] }),
      [STONE_KEY]: JSON.stringify({ '1|a': good, '8|x': T0, '9|y': null, '7|z': { deletedAt: 'soon', writtenAt: 0 },
        '6|w': { deletedAt: T0 } }) };
    const h = lagHarness([M(2, 'b'), M(3, 'c')], { storage: stored });
    h.otherDeviceWrites([M(1, 'a'), M(2, 'b'), M(3, 'c'), M(6, 'w'), M(7, 'z'), M(8, 'x'), M(9, 'y')]);
    await h.engine.attach();
    assert.deepStrictEqual(h.liveTimes(), [2, 3, 6, 7, 8, 9],
      'the valid tombstone holds, the malformed ones do not');
    assert.deepStrictEqual(h.stones(), { '1|a': good });
  });
});

describe('marker_sync: meta is persisted when the merge happens', () => {
  const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];

  it('a marker merged by a pull and then deleted stays deleted across a reload', async () => {
    // The pull alone must persist base: nothing else is written before the reload.
    const h = lagHarness([M(2, 'b'), M(3, 'c')]);
    h.otherDeviceWrites(ALL);
    await h.engine.attach();
    assert.deepStrictEqual(h.liveTimes(), [1, 2, 3]);
    assert.deepStrictEqual(h.meta().base.map((m) => m.time), [1, 2, 3]);
    h.remove(1);
    await h.engine.destroy();
    const h2 = lagHarness(h.live, { tabOf: h });
    await h2.engine.attach();
    assert.deepStrictEqual(h2.liveTimes(), [2, 3]);
    await h2.engine.flush();
    assert.deepStrictEqual(h2.serverTimes(), [2, 3]);
  });

  it('a marker whose PATCH landed but was never acknowledged stays deleted after a reload', async () => {
    const h = lagHarness(ALL, { onUpdate: (hh) => { hh.engine.destroy(); } });
    await h.engine.attach();
    h.add(M(4, 'd')); await h.engine.flush();
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3, 4], 'the write landed; the page died before handling it');
    h.live.splice(3, 1);                    // the user deletes marker 4 and reloads
    const h2 = lagHarness(h.live, { tabOf: h });
    await h2.engine.attach();
    assert.deepStrictEqual(h2.liveTimes(), [1, 2, 3]);
    await h2.engine.flush();
    assert.deepStrictEqual(h2.serverTimes(), [1, 2, 3]);
  });

  it('a remote marker merged by a flush whose PATCH failed stays deleted after a reload', async () => {
    const h = lagHarness([M(2, 'b'), M(3, 'c')]);
    await h.engine.attach();
    h.otherDeviceWrites(ALL);
    h.engine.notifyEdit();
    h.failNextUpdate = true;
    await h.engine.flush();                 // merged marker 1 in, then the write failed
    assert.deepStrictEqual(h.liveTimes(), [1, 2, 3]);
    h.remove(1);
    await h.engine.destroy();
    const h2 = lagHarness(h.live, { tabOf: h });
    await h2.engine.attach();
    assert.deepStrictEqual(h2.liveTimes(), [2, 3]);
  });
  it('a marker deleted while the issue is being created stays deleted after the page is closed', async () => {
    // The create lands WITH marker 1, but the page is gone before the answer
    // is handled. What was sent has to be base before the request leaves, or
    // the deletion is recorded nowhere and the reopened page merges it back.
    const h = lagHarness(ALL, { noIssue: true, onCreate: (hh) => { hh.remove(1); hh.engine.destroy(); } });
    await h.engine.attach();
    h.engine.notifyEdit();
    await h.engine.flush();
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3], 'the create landed; the page died before handling it');
    assert.deepStrictEqual(h.meta().base.map((m) => m.time), [1, 2, 3], 'base is what the issue was given');
    assert.strictEqual(h.stones()['1|a'].writtenAt, 0, 'the deletion is recorded, and not as written');
    const h2 = lagHarness(h.live, { tabOf: h });
    await h2.engine.attach();
    assert.deepStrictEqual(h2.liveTimes(), [2, 3]);
    await h2.engine.flush();
    assert.deepStrictEqual(h2.serverTimes(), [2, 3]);
  });

  it('a create that failed leaves nothing behind that the retry would lose', async () => {
    // Base now runs ahead of an issue that does not exist: the retry still
    // creates it, from the list as it is by then.
    const h = lagHarness(ALL, { noIssue: true });
    await h.engine.attach();
    h.engine.notifyEdit();
    h.failNextCreate = true;
    await h.engine.flush();
    assert.strictEqual(h.server.exists, false);
    assert.strictEqual(h.engine.getInfo().dirty, true);
    h.remove(1);
    await h.engine.destroy();
    const h2 = lagHarness(h.live, { tabOf: h });
    await h2.engine.attach();
    assert.strictEqual(h2.engine.getInfo().dirty, true, 'the reopened page still has an issue to create');
    await h2.engine.flush();
    assert.deepStrictEqual(h2.serverTimes(), [2, 3]);
    assert.deepStrictEqual(h2.liveTimes(), [2, 3]);
  });
});

describe('marker_sync: a request that never answers', () => {
  const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];
  const never = () => new Promise(() => {});
  // The deadline runs on the real setTimeout (github_api's withDeadline), which
  // each test replaces; the engine's own timers stay on the harness.
  const mockDeadline = (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    return () => t.mock.timers.tick(MARKER_REQUEST_TIMEOUT_MS);
  };

  it('a pull whose GET hangs is given up, and the next flush goes through', async (t) => {
    const deadlinePasses = mockDeadline(t);
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.getGate = never();
    const pulling = h.engine.pull(true);
    await tick();
    h.remove(1);
    const flushing = h.engine.flush();      // queued behind the pull
    await tick();
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3], 'the lane is held while the GET is out');
    deadlinePasses();
    await pulling; await flushing;
    assert.deepStrictEqual(h.liveTimes(), [2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [2, 3]);
  });

  it('a flush whose request hangs reports an error instead of syncing forever', async (t) => {
    const deadlinePasses = mockDeadline(t);
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.live.splice(0, 1);
    h.getGate = never();
    const flushing = h.engine.flush({ force: true });
    await tick();
    assert.strictEqual(h.engine.getInfo().status, 'syncing');
    t.mock.timers.tick(MARKER_REQUEST_TIMEOUT_MS - 1);
    await tick();
    assert.strictEqual(h.engine.getInfo().status, 'syncing', 'not before the deadline');
    deadlinePasses();
    await flushing;
    const info = h.engine.getInfo();
    assert.strictEqual(info.status, 'error');
    assert.strictEqual(info.error.message, 'markers: no answer in ' + MARKER_REQUEST_TIMEOUT_MS + ' ms');
  });

  function signalEngine(fetchImpl) {
    const timers = timerHarness();
    const gh = {
      ensureLabel: async () => null,
      listIssuesByLabel: (a, t, l, f) => f('u', { method: 'GET' }).then(() => []),
    };
    return createMarkerSyncEngine({
      api: API, token: 'x', talkId: TALK, videoSlug: VIDEO,
      getMarkers: () => [], setMarkers: () => {}, storage: memStorage({}), gh, fetchImpl,
      setTimeoutFn: timers.set.bind(timers), clearTimeoutFn: timers.clear.bind(timers),
    });
  }

  it('every request carries an abort signal, and the deadline aborts it', async (t) => {
    const deadlinePasses = mockDeadline(t);
    const signals = [];
    const attaching = signalEngine((url, init) => { signals.push(init.signal); return never(); }).attach();
    await tick();
    assert.strictEqual(signals.length, 1);
    assert.strictEqual(signals[0].aborted, false);
    deadlinePasses();
    await attaching;
    assert.strictEqual(signals[0].aborted, true);
  });

  it('the issue list is requested past the HTTP cache', async () => {
    const inits = [];
    const engine = signalEngine(async (url, init) => { inits.push(init); return []; });
    await engine.attach();
    assert.deepStrictEqual(inits.map((init) => [init.method, init.cache]), [['GET', 'no-store']]);
  });

  it("the deadline is above GitHub's own request limit, and bounded", () => {
    assert.ok(MARKER_REQUEST_TIMEOUT_MS >= 20000 && MARKER_REQUEST_TIMEOUT_MS <= 60000);
  });

  it('an answered request leaves no deadline timer behind', async (t) => {
    const deadlinePasses = mockDeadline(t);
    const signals = [];
    await signalEngine(async (url, init) => { signals.push(init.signal); return []; }).attach();
    deadlinePasses();
    assert.ok(signals.length === 1 && !signals[0].aborted, 'the timer was cleared: nothing is aborted later');
  });
});

// ---------------------------------------------------------------------------
// `storage` events. A browser fires one in every OTHER tab whenever a key's
// value really changes, as a task of its own. The loopback below does that for
// engines sharing one store, and counts: whatever the tabs hold, the exchange
// has to stop after a handful of events.
// ---------------------------------------------------------------------------
// Events one user action may cost across all tabs before storage is silent.
const QUIET_AFTER = 8;

function loopback(listenTo) {
  const store = {};
  const net = { tabs: [], queue: [] };
  function view(index) {
    return {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        v = String(v);
        const old = k in store ? store[k] : null;
        store[k] = v;
        if (old === v) return;
        net.tabs.forEach((tab, i) => { if (i !== index) net.queue.push({ to: i, key: k }); });
      },
      removeItem: (k) => { delete store[k]; },
    };
  }
  net.openTab = (initial, over) => {
    const first = net.tabs[0] || null;
    const h = lagHarness(initial, Object.assign({ tabOf: first, storageView: view(net.tabs.length) }, over));
    // 'tombstones' is the SPA's listener; 'every key' is stricter than the SPA.
    h.onStorage = (key) => { if (listenTo === 'every key' || key === STONE_KEY) h.engine.storageChanged(); };
    net.tabs.push(h);
    return h;
  };
  net.settle = (what) => {
    let n = 0;
    while (net.queue.length && n <= QUIET_AFTER) {
      const ev = net.queue.shift();
      net.tabs[ev.to].onStorage(ev.key);
      n += 1;
    }
    assert.ok(n <= QUIET_AFTER && net.queue.length === 0,
      what + ': the tabs are still exchanging storage events after ' + n);
    return n;
  };
  return net;
}

for (const listenTo of ['tombstones', 'every key']) {
  describe('marker_sync: storage events between tabs fall silent (listener on ' + listenTo + ')', () => {
    const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];
    async function twoTabs() {
      const net = loopback(listenTo);
      const a = net.openTab(ALL), b = net.openTab(ALL);
      await a.engine.attach(); await b.engine.attach();
      net.settle('opening two tabs');
      return { net, a, b };
    }

    it('a tab that has not pulled the marker the other tab added and synced', async () => {
      const { net, a, b } = await twoTabs();
      a.add(M(4, 'd')); await a.engine.flush();   // tab B's base is now behind tab A's
      net.settle('after the add');
      a.remove(2);
      net.settle('after the deletion');
      assert.deepStrictEqual(b.liveTimes(), [1, 3], 'tab B dropped the marker on the event alone');
      await a.engine.flush(); net.settle("after tab A's flush");
      await b.engine.flush(); net.settle("after tab B's flush");
      assert.deepStrictEqual(a.serverTimes(), [1, 3, 4]);
      assert.deepStrictEqual(b.liveTimes(), [1, 3, 4]);
    });

    it('the same marker carrying a different comment in each tab', async () => {
      const { net, a, b } = await twoTabs();
      a.live[0].comment = 'from tab A'; a.engine.notifyEdit(); await a.engine.flush();
      b.live[0].comment = 'from tab B'; b.engine.notifyEdit();
      net.settle('after the two comments');
      a.remove(2);
      net.settle('after a deletion on top of the conflict');
      await b.engine.flush(); net.settle("after tab B's flush");
      await a.engine.flush(); net.settle("after tab A's flush");
      b.engine.storageChanged(); a.engine.storageChanged();
      net.settle('after a storage event with nothing new in it');
      assert.deepStrictEqual(b.liveTimes(), [1, 3]);
    });

    it('one tab deleted the marker, the other put it back: the re-add stands', async () => {
      const { net, a, b } = await twoTabs();
      a.remove(1);
      net.settle('after the deletion');
      assert.deepStrictEqual(b.liveTimes(), [2, 3]);
      b.add(M(1, 'a'));                       // tab A: in base, not listed. Tab B: listed, not in base.
      net.settle('after the re-add');
      assert.deepStrictEqual(a.stones(), {}, 'the tombstone is released, and tab A does not record it again');
      await a.engine.flush(); net.settle("after tab A's flush");
      await b.engine.flush(); net.settle("after tab B's flush");
      await a.engine.pull(true); net.settle("after tab A's pull");
      assert.deepStrictEqual(a.serverTimes(), [1, 2, 3]);
      assert.deepStrictEqual(a.liveTimes(), [1, 2, 3], 'tab A takes the marker back');
    });

    it('a storage event that changes nothing writes nothing', async () => {
      const { net, a, b } = await twoTabs();
      a.add(M(4, 'd')); await a.engine.flush();
      a.remove(2); await a.engine.flush();
      net.settle('after the deletion');
      const writes = [];
      const setItem = b.storage.setItem;
      b.storage.setItem = (k, v) => { writes.push(k); setItem(k, v); };
      b.engine.storageChanged(); b.engine.storageChanged();
      assert.deepStrictEqual(writes, []);
    });

    it('three tabs, every action followed by its events: always quiet, and they converge', async () => {
      // Deterministic pseudo-random walk (LCG) over adds, deletions, comments,
      // syncs and time passing in three tabs.
      let seed = 20261120;
      const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % n; };
      const net = loopback(listenTo);
      const tabs = [net.openTab(ALL), net.openTab(ALL), net.openTab(ALL)];
      for (const tab of tabs) await tab.engine.attach();
      net.settle('opening three tabs');
      for (let step = 0; step < 400; step++) {
        const tab = tabs[rnd(3)], time = 1 + rnd(5), what = 'step ' + step;
        const at = tab.live.findIndex((m) => m.time === time);
        switch (rnd(6)) {
          case 0: if (at < 0) tab.add(M(time, 'm' + time)); break;
          case 1: if (at >= 0) tab.remove(time); break;
          case 2: if (at >= 0) { tab.live[at].comment = 'c' + step; tab.engine.notifyEdit(); } break;
          case 3: await tab.engine.flush(); break;
          case 4: await tab.engine.pull(true); break;
          default: tabs.forEach((x) => { x.clock += rnd(4) ? 1000 : TOMBSTONE_TTL_MS; });
        }
        net.settle(what);
      }
      // The clock moves past every tombstone, then two rounds: the first lets
      // every tab write what only it holds, the second lets the others read it.
      tabs.forEach((x) => { x.clock += 2 * TOMBSTONE_TTL_MS; });
      for (let round = 0; round < 2; round++) {
        for (const tab of tabs) { await tab.engine.flush({ force: true }); net.settle('final flush'); }
      }
      const texts = (h) => h.live.map((m) => m.time + '|' + m.text).join(',');
      assert.strictEqual(texts(tabs[1]), texts(tabs[0]));
      assert.strictEqual(texts(tabs[2]), texts(tabs[0]));
      assert.deepStrictEqual(tabs[0].serverTimes(), tabs[0].liveTimes());
    });
  });
}

describe('marker_sync: what is written under the tombstone key', () => {
  const ALL = [M(1, 'a'), M(2, 'b'), M(3, 'c')];

  it('a talk with no deletion never gets the key', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.add(M(4, 'd')); await h.engine.flush();
    h.engine.storageChanged();
    assert.strictEqual(h.storage.getItem(STONE_KEY), null);
  });

  it('the stored text does not depend on the order the deletions were made in', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(3); h.remove(1);
    assert.deepStrictEqual(Object.keys(h.stones()), ['1|a', '3|c']);
  });

  it('the meta key carries no tombstones', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    assert.deepStrictEqual(Object.keys(h.meta()).sort(), ['base', 'nodeId', 'number', 'url']);
    assert.deepStrictEqual(Object.keys(h.stones()), ['1|a']);
  });
});

// ---------------------------------------------------------------------------
// One issue per talk. GitHub serves the issue list `max-age=60`, so a browser
// may answer it from its HTTP cache: for a minute after this client created
// the markers issue, the list it sees can still be the one from before.
// ---------------------------------------------------------------------------
function issueWorld(over) {
  over = over || {};
  const w = {
    issues: {}, nextNumber: 50, calls: [], live: (over.local || []).slice(),
    storage: over.storage || memStorage({}),
    listed: null,            // when set, what the list answers INSTEAD of the truth
    getFails: null,          // when set, the status every single-issue GET fails with
  };
  w.put = (number, markers, state) => {
    w.issues[number] = { number, title: TITLE, state: state || 'open', node_id: 'I' + number,
      html_url: 'u' + number, body: buildIssueBody(markers, 'V') };
  };
  w.markersOf = (number) => parseMarkersBlock(w.issues[number].body).map((m) => m.time);
  w.kinds = () => w.calls.map((c) => c[0]);
  w.created = () => w.calls.filter((c) => c[0] === 'create').length;
  const gone = (status) => { const e = new Error('gone'); e.status = status; return e; };
  const gh = {
    ensureLabel: async () => null,
    listIssuesByLabel: async () => {
      w.calls.push(['list']);
      if (w.listed) return w.listed;
      return Object.keys(w.issues).map((n) => w.issues[n]).sort((x, y) => y.number - x.number);
    },
    getIssue: async (a, t, number) => {
      w.calls.push(['get', number]);
      if (w.getFails) throw gone(w.getFails);
      if (!w.issues[number]) throw gone(404);
      return Object.assign({}, w.issues[number]);
    },
    createIssue: async (a, t, fields) => {
      const number = w.nextNumber++;
      w.calls.push(['create', number]);
      w.issues[number] = { number, title: fields.title, state: 'open', node_id: 'I' + number,
        html_url: 'u' + number, body: fields.body };
      return { number, html_url: 'u' + number, node_id: 'I' + number };
    },
    updateIssue: async (a, t, number, fields) => {
      w.calls.push(['update', number]);
      Object.assign(w.issues[number], fields);
      return w.issues[number];
    },
  };
  w.open = () => {
    const timers = timerHarness();
    w.engine = createMarkerSyncEngine({
      api: API, token: 'x', talkId: TALK, videoSlug: VIDEO, heading: 'V',
      getMarkers: () => w.live, setMarkers: (m) => { w.live = m; },
      storage: w.storage, gh, now: () => 1770000000000,
      setTimeoutFn: timers.set.bind(timers), clearTimeoutFn: timers.clear.bind(timers),
      isOffline: () => false, onStatus: () => {},
    });
    return w.engine;
  };
  w.add = (m) => { w.live.push(m); w.engine.notifyEdit(); };
  w.open();
  return w;
}

describe('marker_sync: one issue per talk', () => {
  const CACHED_EMPTY_LIST = [];

  it('a flush right after the create does not create a second issue from a cached empty list', async () => {
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    assert.strictEqual(w.created(), 1);
    w.listed = CACHED_EMPTY_LIST;
    w.add(M(2, 'b')); await w.engine.flush();
    w.add(M(3, 'c')); await w.engine.flush();
    assert.strictEqual(w.created(), 1, 'still the one issue');
    assert.deepStrictEqual(w.markersOf(50), [1, 2, 3]);
  });

  it('nor does the page, reloaded inside that minute', async () => {
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    await w.engine.destroy();
    w.listed = CACHED_EMPTY_LIST;
    w.open();
    await w.engine.attach();
    w.add(M(2, 'b')); await w.engine.flush();
    assert.strictEqual(w.created(), 1);
    assert.deepStrictEqual(w.markersOf(50), [1, 2]);
    assert.strictEqual(w.engine.getInfo().status, 'synced');
  });

  it('a flush that knows the number does not ask the list at all', async () => {
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    w.calls.length = 0;
    w.add(M(2, 'b')); await w.engine.flush();
    assert.deepStrictEqual(w.calls, [['get', 50], ['update', 50]]);
  });

  for (const status of [404, 410]) {
    it('a known issue that is gone (' + status + ') is looked up by title, then created anew', async () => {
      const w = issueWorld();
      w.add(M(1, 'a')); await w.engine.flush();
      delete w.issues[50];
      w.getFails = status;
      w.add(M(2, 'b')); await w.engine.flush();
      assert.deepStrictEqual(w.kinds(), ['list', 'create', 'get', 'list', 'create']);
      assert.deepStrictEqual(w.markersOf(51), [1, 2]);
      assert.strictEqual(w.engine.getInfo().issueNumber, 51);
    });
  }

  it('a known issue that is gone is forgotten, even when there is nothing to create', async () => {
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    delete w.issues[50];
    w.live = [];
    await w.engine.flush({ force: true });
    assert.strictEqual(w.created(), 1);
    assert.strictEqual(w.engine.getInfo().issueNumber, null);
    assert.strictEqual(w.engine.getInfo().issueUrl, null, 'no link to an issue that is not there');
  });

  it('a known issue that is gone is replaced by the one the list shows under the title', async () => {
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    delete w.issues[50];
    w.put(77, [M(5, 'e')]);
    w.add(M(2, 'b')); await w.engine.flush();
    assert.strictEqual(w.created(), 1, 'nothing new is created');
    assert.strictEqual(w.engine.getInfo().issueNumber, 77);
    assert.deepStrictEqual(w.markersOf(77), [1, 2, 5]);
  });

  it('a known issue that cannot be read is an error, not a reason to create another', async () => {
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    w.getFails = 502;
    w.listed = CACHED_EMPTY_LIST;
    w.add(M(2, 'b')); await w.engine.flush();
    assert.strictEqual(w.created(), 1);
    assert.strictEqual(w.engine.getInfo().status, 'error');
    assert.strictEqual(w.engine.getInfo().issueNumber, 50, 'the number is kept for the retry');
  });

  it('opening the page with a cached empty list still reads the known issue', async () => {
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    await w.engine.destroy();
    w.put(50, [M(1, 'a'), M(9, 'from another device')]);
    w.listed = CACHED_EMPTY_LIST;
    w.open();
    await w.engine.attach();
    assert.deepStrictEqual(w.live.map((m) => m.time), [1, 9]);
    assert.strictEqual(w.engine.getInfo().dirty, false, 'nothing is armed to create an issue');
    assert.strictEqual(w.engine.getInfo().status, 'synced');
  });

  it('opening the page settles on the issue the list shows, when two carry the title', async () => {
    // Two devices each created one. The list puts the newest first, for all of them.
    const w = issueWorld();
    w.add(M(1, 'a')); await w.engine.flush();
    await w.engine.destroy();
    w.put(60, [M(7, 'theirs')]);
    w.open();
    await w.engine.attach();
    assert.strictEqual(w.engine.getInfo().issueNumber, 60);
    await w.engine.flush();
    assert.strictEqual(w.created(), 1);
    assert.deepStrictEqual(w.markersOf(60), [1, 7]);
  });
});
