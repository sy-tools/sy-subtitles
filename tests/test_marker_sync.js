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
async function settle() { for (let i = 0; i < 50; i++) await Promise.resolve(); }

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
