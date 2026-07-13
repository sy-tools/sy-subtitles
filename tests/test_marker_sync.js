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
      calls.push(['update', n]);
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
    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'state'), ['state', 7, 'closed']);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('reopens the same closed issue when a marker returns', async () => {
    const seeded = { number: 7, title: TITLE, state: 'closed', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([], 'Video One') };
    const { engine, gh } = markerEngine({ issue: seeded, localMarkers: [M(3, 'again')] });
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'state'), ['state', 7, 'open']);
    assert.ok(kinds(gh).includes('update'));
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

  it('does not drop a marker added mid-teardown; chip never lies idle', async () => {
    const seeded = { number: 7, title: TITLE, state: 'open', node_id: 'I7', html_url: 'u7',
      body: buildIssueBody([M(1, 'a')], 'Video One') };
    const holder = {};
    // onState (fired during the teardown close) injects a fresh marker + notify,
    // as if the user re-added one while the close request was on the wire.
    const h = markerEngine(
      { issue: seeded, localMarkers: [], onState: () => holder.fn && holder.fn() },
      { [META_KEY]: JSON.stringify({ number: 7, url: 'u7', nodeId: 'I7', base: [M(1, 'a')] }) });
    holder.fn = () => { h.setLocal([M(9, 'redo')]); h.engine.notifyEdit(); };
    h.engine.notifyEdit();
    await h.engine.flush();
    assert.notStrictEqual(h.engine.getInfo().status, 'idle', 'a mid-teardown re-add must not read idle');
  });
});
