const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  syncFilePath, syncBaseKey, collectSyncEntries, applySyncEntries,
  mergeSyncDocs, makeSyncDoc, flattenDoc, unflattenDoc,
} = require('../site/js/edit_sync');

const TALK = '1979-09-27_Shri-Kundalini-Shakti-And-Shri-Jesus-Bombay';

// Minimal localStorage double (same surface the module touches).
function memStorage(init) {
  const m = new Map(Object.entries(init || {}));
  return {
    get length() { return m.size; },
    key(i) { const k = Array.from(m.keys()); return i < k.length ? k[i] : null; },
    getItem(k) { return m.has(k) ? m.get(k) : null; },
    setItem(k, v) { m.set(k, String(v)); },
    removeItem(k) { m.delete(k); },
  };
}

describe('names', () => {
  it('syncFilePath and syncBaseKey are talk-scoped', () => {
    assert.strictEqual(syncFilePath(TALK), '.review-sync/' + TALK + '.json');
    assert.strictEqual(syncBaseKey(TALK), 'sy_sync_base_' + TALK);
  });
});

describe('collectSyncEntries', () => {
  it('collects review, review_srt and preview entries for the talk only', () => {
    const storage = memStorage({
      ['review_' + TALK]: JSON.stringify({ marks: { 3: 'note' }, edits: { 7: 'текст' } }),
      ['review_srt_' + TALK + '_video1_en_uk']: JSON.stringify({ marks: {}, edits: { 1: 'a' } }),
      ['preview_' + TALK + '_video1']: JSON.stringify({ mode: 'edit', markers: [], edits: { uk: { 4: 'x' } } }),
      'review_2000-07-02_Other-Talk': JSON.stringify({ marks: { 1: 'other' }, edits: {} }),
      ['sy_review_mode_' + TALK]: '{"mode":"srt"}',
      ['sy.preview_pos.' + TALK + '.video1']: '17',
    });
    const entries = collectSyncEntries(TALK, storage);
    assert.deepStrictEqual(Object.keys(entries).sort(), [
      'preview_' + TALK + '_video1',
      'review_' + TALK,
      'review_srt_' + TALK + '_video1_en_uk',
    ]);
    assert.strictEqual(entries['review_' + TALK].edits[7], 'текст');
  });
  it('drops empty entries and unparseable values', () => {
    const storage = memStorage({
      ['review_' + TALK]: JSON.stringify({ marks: {}, edits: {} }),
      ['preview_' + TALK + '_v']: JSON.stringify({ mode: 'edit', markers: [], edits: { uk: {} } }),
      ['review_srt_' + TALK + '_v_en_uk']: 'not json',
    });
    assert.deepStrictEqual(collectSyncEntries(TALK, storage), {});
  });
});

describe('applySyncEntries', () => {
  it('writes entries, removes stale sync-space keys, reports real changes', () => {
    const storage = memStorage({
      ['review_' + TALK]: JSON.stringify({ marks: {}, edits: { 1: 'old' } }),
      ['review_srt_' + TALK + '_v_en_uk']: JSON.stringify({ marks: {}, edits: { 2: 'gone' } }),
      ['sy_review_mode_' + TALK]: '{"mode":"srt"}',
    });
    const entries = {
      ['review_' + TALK]: { marks: {}, edits: { 1: 'new' } },
      ['preview_' + TALK + '_v']: { mode: 'edit', markers: [], edits: { uk: { 3: 'x' } } },
    };
    const changed = applySyncEntries(TALK, entries, storage).sort();
    assert.deepStrictEqual(changed, [
      'preview_' + TALK + '_v',
      'review_' + TALK,
      'review_srt_' + TALK + '_v_en_uk',
    ]);
    assert.strictEqual(JSON.parse(storage.getItem('review_' + TALK)).edits[1], 'new');
    assert.strictEqual(storage.getItem('review_srt_' + TALK + '_v_en_uk'), null);
    // untouched: non-sync-space key survives
    assert.strictEqual(storage.getItem('sy_review_mode_' + TALK), '{"mode":"srt"}');
  });
  it('reports no changes when the storage already matches', () => {
    const entry = { marks: { 1: 'm' }, edits: {} };
    const storage = memStorage({ ['review_' + TALK]: JSON.stringify(entry) });
    const changed = applySyncEntries(TALK, { ['review_' + TALK]: entry }, storage);
    assert.deepStrictEqual(changed, []);
  });
});

describe('mergeSyncDocs (three-way, per item)', () => {
  const K = 'review_' + TALK;
  function doc(edits, marks) { return { [K]: { marks: marks || {}, edits: edits } }; }

  it('adopts a remote-only addition', () => {
    const r = mergeSyncDocs(doc({}), doc({}), doc({ 5: 'remote' }));
    assert.strictEqual(r.entries[K].edits[5], 'remote');
    assert.strictEqual(r.changedVsLocal, true);
    assert.strictEqual(r.changedVsRemote, false);
  });
  it('keeps a local-only addition', () => {
    const r = mergeSyncDocs(doc({}), doc({ 5: 'local' }), doc({}));
    assert.strictEqual(r.entries[K].edits[5], 'local');
    assert.strictEqual(r.changedVsLocal, false);
    assert.strictEqual(r.changedVsRemote, true);
  });
  it('a local delete wins over an unchanged remote copy', () => {
    const base = doc({ 5: 'v' });
    const r = mergeSyncDocs(base, doc({}), doc({ 5: 'v' }));
    assert.strictEqual(r.entries[K], undefined); // entry emptied out entirely
    assert.strictEqual(r.changedVsRemote, true);
  });
  it('a remote delete is adopted when local did not touch the item', () => {
    const base = doc({ 5: 'v', 6: 'w' });
    const r = mergeSyncDocs(base, doc({ 5: 'v', 6: 'w' }), doc({ 6: 'w' }));
    assert.deepStrictEqual(r.entries[K].edits, { 6: 'w' });
    assert.strictEqual(r.changedVsLocal, true);
  });
  it('both changed differently: local wins and the loser is flagged for re-push', () => {
    const base = doc({ 5: 'v' });
    const r = mergeSyncDocs(base, doc({ 5: 'mine' }), doc({ 5: 'theirs' }));
    assert.strictEqual(r.entries[K].edits[5], 'mine');
    assert.strictEqual(r.changedVsRemote, true);
    assert.strictEqual(r.changedVsLocal, false);
  });
  it('independent items from both sides merge item-by-item', () => {
    const base = doc({ 1: 'a' });
    const r = mergeSyncDocs(base, doc({ 1: 'a', 2: 'local' }), doc({ 1: 'a', 3: 'remote' }));
    assert.deepStrictEqual(r.entries[K].edits, { 1: 'a', 2: 'local', 3: 'remote' });
    assert.strictEqual(r.changedVsLocal, true);
    assert.strictEqual(r.changedVsRemote, true);
  });
  it('empty local + non-empty remote adopts remote with nothing to push', () => {
    const r = mergeSyncDocs({}, {}, doc({ 5: 'remote' }, { 2: 'note' }));
    assert.deepStrictEqual(r.entries[K].edits, { 5: 'remote' });
    assert.deepStrictEqual(r.entries[K].marks, { 2: 'note' });
    assert.strictEqual(r.changedVsLocal, true);
    assert.strictEqual(r.changedVsRemote, false);
  });
  it('merges preview language-scoped edits and markers by identity', () => {
    const PK = 'preview_' + TALK + '_v';
    const m1 = { time: 10.5, tc: '00:00:10', text: 'sub a', comment: '' };
    const m1edited = { time: 10.5, tc: '00:00:10', text: 'sub a', comment: 'local note' };
    const m2 = { time: 99, tc: '00:01:39', text: 'sub b', comment: 'remote note' };
    const base = { [PK]: { mode: 'marker', markers: [m1], edits: { uk: { 1: 'x' } } } };
    const local = { [PK]: { mode: 'marker', markers: [m1edited], edits: { uk: { 1: 'x' } } } };
    const remote = { [PK]: { mode: 'marker', markers: [m1, m2], edits: { uk: { 1: 'x', 9: 'remote' } } } };
    const r = mergeSyncDocs(base, local, remote);
    const merged = r.entries[PK];
    assert.strictEqual(merged.markers.length, 2);
    assert.strictEqual(merged.markers.find((m) => m.time === 10.5).comment, 'local note');
    assert.strictEqual(merged.markers.find((m) => m.time === 99).comment, 'remote note');
    assert.deepStrictEqual(merged.edits.uk, { 1: 'x', 9: 'remote' });
    // markers stay sorted by time
    assert.ok(merged.markers[0].time <= merged.markers[1].time);
  });
});

describe('flatten/unflatten shape stability', () => {
  it('round-trips entries to the exact JSON the app itself stores', () => {
    // Byte-identical shapes matter: doFlush's "unchanged" fast path and
    // applySyncEntries' change detection compare JSON strings.
    const PK = 'preview_' + TALK + '_v';
    const RK = 'review_' + TALK;
    const m = { time: 5, tc: '00:00:05', text: 'sub', comment: 'c' };
    const preview = { mode: 'edit', markers: [m], edits: { uk: { 1: 'x' } } };
    const review = { marks: { 2: 'note' }, edits: { 1: 'y' } };
    const rt = unflattenDoc(flattenDoc({ [PK]: preview, [RK]: review }));
    assert.strictEqual(JSON.stringify(rt[PK]), JSON.stringify(preview));
    assert.strictEqual(JSON.stringify(rt[RK]), JSON.stringify(review));
    assert.ok(!('marks' in rt[PK]), 'preview entries carry no marks field');
    assert.ok(!('markers' in rt[RK]), 'review entries carry no markers field');
  });
});

describe('makeSyncDoc', () => {
  it('wraps entries with version/revision/client/talkId', () => {
    const d = makeSyncDoc(TALK, { a: 1 }, 4, 'k3b9x2', '2026-07-13T22:00:00Z');
    assert.deepStrictEqual(d, {
      version: 1, revision: 4, updatedAt: '2026-07-13T22:00:00Z',
      client: 'k3b9x2', talkId: TALK, entries: { a: 1 },
    });
  });
});

// ---------------------------------------------------------------------------
// Sync engine
// ---------------------------------------------------------------------------
const { createSyncEngine } = require('../site/js/edit_sync');

const RKEY = 'review_' + TALK;
const BRANCH_NAME = 'sync/tester/' + TALK;

// Manual timer harness: engine timers only fire when the test says so.
function timerHarness() {
  let seq = 0;
  const timers = new Map();
  return {
    set(fn, ms) { seq += 1; timers.set(seq, { fn, ms }); return seq; },
    clear(id) { timers.delete(id); },
    fire(maxMs) {
      const due = [...timers].filter(([, t]) => t.ms <= maxMs);
      due.forEach(([id]) => timers.delete(id));
      due.forEach(([, t]) => t.fn());
    },
    delays() { return [...timers.values()].map((t) => t.ms); },
  };
}

// Drain resolved promise chains (gh stubs resolve immediately).
async function settle() { for (let i = 0; i < 50; i++) await Promise.resolve(); }

// gh double: every call recorded as [name, ...detail]; behavior overridable.
function ghStub(over) {
  over = over || {};
  const calls = [];
  function record(name, detail) { calls.push([name].concat(detail || [])); }
  let putCount = 0;
  let pullCount = 0;
  const gh = {
    calls,
    puts: [],
    getFileContent: async (api, token, path, ref) => {
      record('getFileContent', [path, ref]);
      const r = typeof over.remote === 'function' ? over.remote() : over.remote;
      return r || null;
    },
    getBranchHeadSha: async (api, token, branch) => { record('getBranchHeadSha', [branch]); return 'head1'; },
    createRef: async (api, token, name, sha) => {
      record('createRef', [name, sha]);
      if (over.refExists) { const e = new Error('Reference already exists'); e.status = 422; throw e; }
      return {};
    },
    putFile: async (api, token, opts) => {
      putCount += 1;
      record('putFile', [opts.path, opts.sha || null, !!opts.keepalive]);
      gh.puts.push(JSON.parse(opts.content));
      if (over.putFails && putCount <= over.putFails.length) {
        const spec = over.putFails[putCount - 1];
        if (spec) { const e = new Error(spec.message || 'fail'); e.status = spec.status; throw e; }
      }
      return { content: { sha: 'sha_after_put' + putCount } };
    },
    createPull: async (api, token, opts) => {
      pullCount += 1;
      record('createPull', [opts.head, opts.base, !!opts.draft]);
      if (over.draftUnsupported && opts.draft) {
        const e = new Error('Draft pull requests are not supported in this repository.');
        e.status = 422;
        throw e;
      }
      if (over.pullFails && pullCount <= over.pullFails.length) {
        const spec = over.pullFails[pullCount - 1];
        if (spec) { const e = new Error(spec.message || 'fail'); e.status = spec.status; throw e; }
      }
      return { number: 77, html_url: 'https://github.com/x/pull/77', node_id: 'PR_n77', draft: !!opts.draft };
    },
    findOpenPrByHead: async (api, token, owner, branch) => {
      record('findOpenPrByHead', [owner, branch]);
      return over.existingPr || null;
    },
  };
  return gh;
}

function makeEngine(over, storageInit, engineOver) {
  const timers = timerHarness();
  const gh = ghStub(over);
  const statuses = [];
  const applied = [];
  const storage = memStorage(storageInit || {});
  const engine = createSyncEngine(Object.assign({
    api: 'https://api.github.com/repos/sy-tools/sy-subtitles',
    owner: 'sy-tools',
    repo: 'sy-tools/sy-subtitles',
    token: 'gho_x',
    login: 'tester',
    talkId: TALK,
    base: 'main',
    branch: BRANCH_NAME,
    storage,
    gh,
    now: () => 1770000000000,
    setTimeoutFn: timers.set.bind(timers),
    clearTimeoutFn: timers.clear.bind(timers),
    isOffline: (e) => /fetch failed/.test((e && e.message) || ''),
    onStatus: (s) => statuses.push(s),
    onRemoteApplied: (keys) => applied.push(keys),
    clientId: 'client1',
  }, engineOver || {}));
  return { engine, timers, gh, statuses, applied, storage };
}

function localEdit(storage, idx, text) {
  const cur = JSON.parse(storage.getItem(RKEY) || '{"marks":{},"edits":{}}');
  cur.edits[idx] = text;
  storage.setItem(RKEY, JSON.stringify(cur));
}

function remoteDoc(edits, revision, sha) {
  return {
    content: JSON.stringify(makeSyncDoc(TALK,
      { [RKEY]: { marks: {}, edits: edits } }, revision || 1, 'other', '2026-07-13T21:00:00Z')),
    sha: sha || 'sha_remote1',
  };
}

describe('engine: debounce + coalesce', () => {
  it('one push 15s after the last edit; re-edits re-arm the timer', async () => {
    const { engine, timers, gh, storage } = makeEngine();
    localEdit(storage, 1, 'а');
    engine.notifyEdit();
    localEdit(storage, 1, 'аб');
    engine.notifyEdit();
    timers.fire(14999);
    await settle();
    assert.strictEqual(gh.puts.length, 0);
    timers.fire(15000);
    await settle();
    assert.strictEqual(gh.puts.length, 1);
    assert.strictEqual(gh.puts[0].entries[RKEY].edits[1], 'аб');
  });
  it('blur (flushSoon) pushes after the 1.5s coalesce window', async () => {
    const { engine, timers, gh, storage } = makeEngine();
    localEdit(storage, 2, 'x');
    engine.notifyEdit();
    engine.flushSoon();
    timers.fire(1500);
    await settle();
    assert.strictEqual(gh.puts.length, 1);
  });
  it('does nothing when no edit happened (not dirty)', async () => {
    const { engine, timers, gh } = makeEngine();
    engine.flushSoon();
    timers.fire(20000);
    await settle();
    await engine.flush();
    assert.strictEqual(gh.calls.length, 0);
  });
});

describe('engine: bootstrap', () => {
  it('first push creates branch, state file (no sha) and a draft PR', async () => {
    const { engine, gh, storage } = makeEngine();
    localEdit(storage, 1, 'перший');
    engine.notifyEdit();
    await engine.flush();
    const names = gh.calls.map((c) => c[0]);
    assert.deepStrictEqual(names, [
      'getFileContent', 'findOpenPrByHead', 'getBranchHeadSha', 'createRef', 'putFile', 'createPull',
    ]);
    assert.deepStrictEqual(gh.calls[3], ['createRef', BRANCH_NAME, 'head1']);
    assert.strictEqual(gh.calls[4][2], null); // no sha: brand-new file
    assert.deepStrictEqual(gh.calls[5], ['createPull', BRANCH_NAME, 'main', true]);
    const info = engine.getInfo();
    assert.strictEqual(info.prNumber, 77);
    assert.strictEqual(info.prUrl, 'https://github.com/x/pull/77');
    assert.strictEqual(info.status, 'synced');
    // base meta persisted for the next session
    const base = JSON.parse(storage.getItem(syncBaseKey(TALK)));
    assert.strictEqual(base.prNumber, 77);
    assert.strictEqual(base.sha, 'sha_after_put1');
  });
  it('tolerates an already-existing branch ref (422)', async () => {
    const { engine, gh, storage } = makeEngine({ refExists: true });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.puts.length, 1);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
  it('falls back to a non-draft PR when drafts are unsupported (422)', async () => {
    const { engine, gh, storage } = makeEngine({ draftUnsupported: true });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    const pulls = gh.calls.filter((c) => c[0] === 'createPull');
    assert.deepStrictEqual(pulls.map((c) => c[3]), [true, false]);
    assert.strictEqual(engine.getInfo().prNumber, 77);
  });
  it('adopts an existing draft PR on the branch instead of creating a second one', async () => {
    const { engine, gh, storage } = makeEngine({
      existingPr: { number: 12, html_url: 'https://github.com/x/pull/12', node_id: 'PR_n12', draft: true },
    });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createPull').length, 0);
    assert.strictEqual(engine.getInfo().prNumber, 12);
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(gh.puts.length, 1);
  });
  it('goes silent when the branch already carries a submitted (ready) PR', async () => {
    // Post-finalize: the deterministic branch has an open NON-draft PR.
    // Pushing state onto it would dirty a human-facing PR — stay local-only.
    const { engine, gh, storage } = makeEngine({
      existingPr: { number: 12, html_url: 'https://github.com/x/pull/12', node_id: 'PR_n12', draft: false },
    });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.puts.length, 0);
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createRef').length, 0);
    assert.strictEqual(engine.getInfo().status, 'idle');
    // ...and stays silent on later edits without re-asking GitHub
    const callsBefore = gh.calls.length;
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.length, callsBefore);
  });
});

describe('engine: destroy vs in-flight flush', () => {
  it('destroy() resolves after the in-flight flush and suppresses its tail', async () => {
    let releasePut;
    const putGate = new Promise((res) => { releasePut = res; });
    const { engine, gh, storage } = makeEngine();
    const origPut = gh.putFile;
    gh.putFile = async (...a) => { await putGate; return origPut(...a); };
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    const flushP = engine.flush();
    await settle(); // flush is now parked on the PUT
    let destroyed = false;
    const destroyP = engine.destroy().then(() => { destroyed = true; });
    await settle();
    assert.strictEqual(destroyed, false, 'destroy must wait for the in-flight flush');
    releasePut();
    await flushP;
    await destroyP;
    assert.strictEqual(destroyed, true);
    // the tail (PR creation) was suppressed by the dispose
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createPull').length, 0);
  });
});

describe('engine: no-op protection', () => {
  it('never bootstraps a branch/PR when there is nothing to sync', async () => {
    // e.g. a mode toggle marks the state dirty without any real edit —
    // not even a lookup GET is spent on it (attach() covers adoption).
    const { engine, gh } = makeEngine();
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(gh.calls, []);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });
  it('skips the PUT when the doc is unchanged since the last push', async () => {
    const { engine, gh, storage } = makeEngine();
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.puts.length, 1);
    engine.notifyEdit(); // dirty again, but storage did not change
    await engine.flush();
    assert.strictEqual(gh.puts.length, 1);
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(engine.getInfo().dirty, false);
  });
  it('flush({force}) retries the PR creation after it failed once', async () => {
    const { engine, gh, storage } = makeEngine({ pullFails: [{ status: 500, message: 'boom' }] });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(engine.getInfo().prNumber, null);
    await engine.flush({ force: true });
    assert.strictEqual(gh.puts.length, 1); // state already pushed — no re-PUT
    assert.strictEqual(engine.getInfo().prNumber, 77);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
});

describe('engine: CAS conflict', () => {
  it('409 -> pull fresh remote, merge, retry with the fresh sha', async () => {
    let after409 = false;
    const { engine, gh, storage, applied } = makeEngine({
      remote: () => (after409 ? remoteDoc({ 9: 'віддалений' }, 3, 'sha_fresh') : null),
      putFails: [{ status: 409, message: 'is at ... but expected' }],
    });
    localEdit(storage, 1, 'локальний');
    engine.notifyEdit();
    const origPut = gh.putFile;
    // flip the remote into existence once the first PUT has conflicted
    gh.putFile = async (...a) => { const p = origPut(...a); after409 = true; return p; };
    await engine.flush();
    assert.strictEqual(gh.puts.length, 2);
    const finalDoc = gh.puts[1];
    assert.strictEqual(finalDoc.entries[RKEY].edits[1], 'локальний');
    assert.strictEqual(finalDoc.entries[RKEY].edits[9], 'віддалений');
    // remote-won items were applied into local storage too
    assert.strictEqual(JSON.parse(storage.getItem(RKEY)).edits[9], 'віддалений');
    assert.strictEqual(applied.length, 1);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
  it('persistent 409s end in an error status after 3 attempts', async () => {
    const { engine, gh, storage } = makeEngine({
      remote: () => remoteDoc({ 9: 'r' }, 3, 'sha_fresh'),
      putFails: [{ status: 409 }, { status: 409 }, { status: 409 }],
    });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(gh.puts.length, 3);
  });
});

describe('engine: pull', () => {
  it('adopts remote edits on a clean client without pushing', async () => {
    const { engine, gh, storage, applied, timers } = makeEngine({ remote: remoteDoc({ 5: 'з телефона' }, 2) });
    await engine.pull(true);
    assert.strictEqual(JSON.parse(storage.getItem(RKEY)).edits[5], 'з телефона');
    assert.deepStrictEqual(applied, [[RKEY]]);
    timers.fire(60000);
    await settle();
    assert.strictEqual(gh.puts.length, 0);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
  it('merges into dirty local state and schedules a re-push', async () => {
    const { engine, gh, storage, timers } = makeEngine({ remote: remoteDoc({ 5: 'з телефона' }, 2) });
    localEdit(storage, 1, 'тут');
    engine.notifyEdit();
    await engine.pull(true);
    timers.fire(15000);
    await settle();
    assert.strictEqual(gh.puts.length, 1);
    assert.deepStrictEqual(gh.puts[0].entries[RKEY].edits, { 1: 'тут', 5: 'з телефона' });
  });
  it('is throttled: a second non-forced pull within 60s is skipped', async () => {
    const { engine, gh } = makeEngine({ remote: remoteDoc({ 5: 'r' }, 2) });
    await engine.pull();
    await engine.pull();
    const gets = gh.calls.filter((c) => c[0] === 'getFileContent');
    assert.strictEqual(gets.length, 1);
  });
});

describe('engine: offline + auth failures', () => {
  it('network failure parks the sync as pending and retries cleanly', async () => {
    const { engine, gh, storage } = makeEngine({ putFails: [{ status: undefined, message: 'fetch failed' }] });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'pending');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(gh.puts.length, 2);
  });
  it('401 surfaces as an auth error', async () => {
    const { engine, storage } = makeEngine({ putFails: [{ status: 401, message: 'Bad credentials' }] });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    const info = engine.getInfo();
    assert.strictEqual(info.status, 'error');
    assert.strictEqual(info.error.kind, 'auth');
  });
});

describe('engine: attach', () => {
  it('re-attaches to an existing remote + PR found by head', async () => {
    const { engine, gh, storage, applied } = makeEngine({
      remote: remoteDoc({ 4: 'збережене' }, 6),
      existingPr: { number: 12, html_url: 'https://github.com/x/pull/12', node_id: 'PR_n12', draft: true },
    });
    await engine.attach();
    assert.strictEqual(JSON.parse(storage.getItem(RKEY)).edits[4], 'збережене');
    assert.strictEqual(applied.length, 1);
    const info = engine.getInfo();
    assert.strictEqual(info.prNumber, 12);
    assert.strictEqual(info.prUrl, 'https://github.com/x/pull/12');
  });
  it('uses the cached PR from the base meta without querying /pulls', async () => {
    const baseMeta = {
      doc: {}, sha: 'sha_old', revision: 2,
      prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', branch: BRANCH_NAME,
    };
    const { engine, gh } = makeEngine(
      { remote: remoteDoc({ 4: 'v' }, 2, 'sha_old') },
      { [syncBaseKey(TALK)]: JSON.stringify(baseMeta) });
    await engine.attach();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'findOpenPrByHead').length, 0);
    assert.strictEqual(engine.getInfo().prUrl, 'https://github.com/x/pull/12');
  });
  it('stays idle (chip hidden) when there is no remote and no local edits', async () => {
    const { engine, gh } = makeEngine();
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.strictEqual(gh.puts.length, 0);
  });
});
