const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  markerIssueTitle, markerMetaKey, renderMarkersTable,
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
const TOMBSTONE_TTL_MS = require('../site/js/marker_sync').TOMBSTONE_TTL_MS;

function lagHarness(initial, over) {
  over = over || {};
  const h = {
    live: initial.slice(),
    server: { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody(initial, 'V') },
    staleReads: [],          // bodies the NEXT getIssue calls return instead of the truth
    getGate: null,           // when set, the next getIssue waits on it (answer fixed at request time)
    failNextUpdate: false,
    clock: 1770000000000,
    calls: [],
  };
  h.serverTimes = () => parseMarkersBlock(h.server.body).map((m) => m.time);
  h.liveTimes = () => h.live.map((m) => m.time);
  h.staleNext = (markers) => h.staleReads.push(buildIssueBody(markers, 'V'));
  h.remove = (time) => { h.live = h.live.filter((m) => m.time !== time); h.engine.notifyEdit(); };
  h.add = (m) => { h.live = h.live.concat([m]); h.engine.notifyEdit(); };
  // Another device writes the issue directly.
  h.otherDeviceWrites = (markers) => { h.server.body = buildIssueBody(markers, 'V'); h.server.state = 'open'; };
  const gh = {
    ensureLabel: async () => null,
    listIssuesByLabel: async () => [h.server],
    getIssue: async () => {
      h.calls.push('get');
      const body = h.staleReads.length ? h.staleReads.shift() : h.server.body;
      const snap = { number: 7, state: h.server.state, body, node_id: 'I7' };
      if (h.getGate) { const g = h.getGate; h.getGate = null; await g; }
      return snap;
    },
    createIssue: async () => { throw new Error('unexpected create'); },
    updateIssue: async (a, t, n, fields) => {
      h.calls.push('update');
      if (over.onUpdate) over.onUpdate(h);
      if (h.failNextUpdate) { h.failNextUpdate = false; const e = new Error('boom'); e.status = 502; throw e; }
      if (fields.body !== undefined) h.server.body = fields.body;
      if (fields.state) h.server.state = fields.state;
      return h.server;
    },
  };
  const timers = timerHarness();
  h.storage = memStorage(over.storage || {});
  h.meta = () => JSON.parse(h.storage.getItem(META_KEY));
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
    assert.deepStrictEqual(h.meta().tombstones, {});
  });

  it('the user can re-add a deleted identity, and that drops its tombstone', async () => {
    const h = lagHarness(ALL);
    await h.engine.attach();
    h.remove(1); await h.engine.flush();
    assert.deepStrictEqual(Object.keys(h.meta().tombstones), ['1|a']);
    h.add(M(1, 'a'));
    h.staleNext([M(2, 'b'), M(3, 'c')]);
    await h.engine.flush();
    assert.deepStrictEqual(h.liveTimes().sort(), [1, 2, 3]);
    assert.deepStrictEqual(h.serverTimes(), [1, 2, 3]);
    assert.deepStrictEqual(h.meta().tombstones, {});
  });

  it('tombstones survive a reload (persisted in meta)', async () => {
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
