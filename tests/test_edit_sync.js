const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  syncFilePath, syncBaseKey, collectSyncEntries, applySyncEntries,
  mergeSyncDocs, makeSyncDoc, flattenDoc, unflattenDoc,
  srtSyncTarget, transcriptSyncTarget,
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
  it('target-scoped paths/keys nest the target', () => {
    assert.strictEqual(syncFilePath(TALK, 'video1-uk'), '.review-sync/' + TALK + '/video1-uk.json');
    assert.strictEqual(syncBaseKey(TALK, 'video1-uk'), 'sy_sync_base_' + TALK + '__video1-uk');
  });
});

describe('sync targets (file-scoped)', () => {
  it('srtSyncTarget claims the canonical block store and same-final-lang legacy leftovers', () => {
    const tgt = srtSyncTarget(TALK, 'video1', 'uk');
    assert.strictEqual(tgt.slug, 'video1-uk');
    assert.ok(tgt.filter('srt_edits_' + TALK + '_video1_uk'));
    assert.ok(tgt.filter('review_srt_' + TALK + '_video1_en_uk'));
    assert.ok(tgt.filter('review_srt_' + TALK + '_video1_hi_uk'));
    // other lang / other video / preview markers / canonical of another lang
    assert.ok(!tgt.filter('srt_edits_' + TALK + '_video1_de'));
    assert.ok(!tgt.filter('review_srt_' + TALK + '_video1_en_de'));
    assert.ok(!tgt.filter('srt_edits_' + TALK + '_video2_uk'));
    assert.ok(!tgt.filter('preview_' + TALK + '_video1'));
    assert.ok(!tgt.filter('review_' + TALK));
  });
  it('transcriptSyncTarget claims only the transcript review entry', () => {
    const tgt = transcriptSyncTarget(TALK, 'uk');
    assert.strictEqual(tgt.slug, 'transcript-uk');
    assert.ok(tgt.filter('review_' + TALK));
    assert.ok(!tgt.filter('srt_edits_' + TALK + '_video1_uk'));
    assert.ok(!tgt.filter('preview_' + TALK + '_video1'));
  });
  it('each target names the one file its PR commits', () => {
    assert.strictEqual(srtSyncTarget(TALK, 'video1', 'uk').filePath, 'talks/' + TALK + '/video1/final/uk.srt');
    assert.strictEqual(transcriptSyncTarget(TALK, 'hi').filePath, 'talks/' + TALK + '/transcript_hi.txt');
  });
  it('each target names the one entry whose edits are keyed by the file\'s own index', () => {
    const srt = srtSyncTarget(TALK, 'video1', 'uk');
    assert.strictEqual(srt.editsKey, 'srt_edits_' + TALK + '_video1_uk');
    assert.strictEqual(srt.fileKind, 'srt');
    assert.ok(srt.filter(srt.editsKey));
    const transcript = transcriptSyncTarget(TALK, 'hi');
    assert.strictEqual(transcript.editsKey, 'review_' + TALK);
    assert.strictEqual(transcript.fileKind, 'transcript');
    assert.ok(transcript.filter(transcript.editsKey));
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
  it('a key filter scopes both collection and stale-deletion to one target', () => {
    const CK = 'srt_edits_' + TALK + '_video1_uk';
    const storage = memStorage({
      [CK]: JSON.stringify({ 4: 'sub' }),
      ['review_' + TALK]: JSON.stringify({ marks: {}, edits: { 1: 'transcript' } }),
    });
    const tgt = srtSyncTarget(TALK, 'video1', 'uk');
    // collection sees only the target's key
    assert.deepStrictEqual(Object.keys(collectSyncEntries(TALK, storage, tgt.filter)), [CK]);
    // applying an EMPTY target doc removes the target's key but must NOT touch
    // the transcript key that belongs to a different target
    const changed = applySyncEntries(TALK, {}, storage, tgt.filter);
    assert.deepStrictEqual(changed, [CK]);
    assert.strictEqual(storage.getItem(CK), null);
    assert.ok(storage.getItem('review_' + TALK), 'other-target key survives');
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

describe('mergeSyncDocs against a remote that never held our base', () => {
  const KEY = 'review_' + TALK;
  const entry = (edits) => ({ [KEY]: { marks: {}, edits } });
  const foreign = { remoteNeverSawBase: true };

  it('an item the remote lacks is not a deletion: it was never there to delete', () => {
    const base = entry({ 1: 'one', 2: 'two' });
    const merged = mergeSyncDocs(base, base, entry({ 7: 'seven' }), foreign);
    assert.deepStrictEqual(merged.entries[KEY].edits, { 1: 'one', 2: 'two', 7: 'seven' });
    assert.strictEqual(merged.changedVsRemote, true, 'and the remote has yet to receive it');
    assert.strictEqual(merged.changedVsLocal, true);
  });

  it('without the option the same docs read as a deletion (a remote that descends from the base)', () => {
    const base = entry({ 1: 'one', 2: 'two' });
    const merged = mergeSyncDocs(base, base, entry({ 7: 'seven' }));
    assert.deepStrictEqual(merged.entries[KEY].edits, { 7: 'seven' });
  });

  it('everything else merges as ever: a local deletion stands, a local change wins, a remote value is taken', () => {
    const base = entry({ 1: 'one', 2: 'two', 3: 'three' });
    const local = entry({ 2: 'two, reworded', 3: 'three' });           // 1 deleted, 2 changed
    const remote = entry({ 1: 'one', 2: 'TWO', 3: 'THREE' });
    const merged = mergeSyncDocs(base, local, remote, foreign);
    assert.deepStrictEqual(merged.entries[KEY].edits, { 2: 'two, reworded', 3: 'THREE' });
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

describe('canonical srt_edits entries (shared preview/review block store)', () => {
  const CK = 'srt_edits_' + TALK + '_video1_uk';

  it('collectSyncEntries picks up canonical keys and drops empty maps', () => {
    const storage = memStorage({
      [CK]: JSON.stringify({ 4: 'правка' }),
      ['srt_edits_' + TALK + '_video1_en']: JSON.stringify({}),
      'srt_edits_2000-07-02_Other-Talk_v_uk': JSON.stringify({ 1: 'other' }),
    });
    const entries = collectSyncEntries(TALK, storage);
    assert.deepStrictEqual(Object.keys(entries), [CK]);
    assert.deepStrictEqual(entries[CK], { 4: 'правка' });
  });

  it('applySyncEntries removes stale canonical keys absent from the doc', () => {
    const storage = memStorage({ [CK]: JSON.stringify({ 4: 'gone' }) });
    const changed = applySyncEntries(TALK, {}, storage);
    assert.deepStrictEqual(changed, [CK]);
    assert.strictEqual(storage.getItem(CK), null);
  });

  it('round-trips to the exact JSON saveSrtEdits stores', () => {
    const entry = { 2: 'а', 11: 'б' };
    const rt = unflattenDoc(flattenDoc({ [CK]: entry }));
    assert.strictEqual(JSON.stringify(rt[CK]), JSON.stringify(entry));
    assert.ok(!('marks' in rt[CK]) && !('edits' in rt[CK]),
      'canonical entries stay a plain block map');
  });

  it('merges canonical entries per block', () => {
    const base = { [CK]: { 1: 'a' } };
    const local = { [CK]: { 1: 'a', 2: 'local' } };
    const remote = { [CK]: { 1: 'a', 3: 'remote' } };
    const r = mergeSyncDocs(base, local, remote);
    assert.deepStrictEqual(r.entries[CK], { 1: 'a', 2: 'local', 3: 'remote' });
    assert.strictEqual(r.changedVsLocal, true);
    assert.strictEqual(r.changedVsRemote, true);
  });

  it('an emptied canonical entry disappears from the merged doc', () => {
    const base = { [CK]: { 1: 'v' } };
    const r = mergeSyncDocs(base, {}, base);
    assert.strictEqual(r.entries[CK], undefined);
    assert.strictEqual(r.changedVsRemote, true);
  });
});

describe('placeholder markers (srt_placeholders, beside the canonical block store)', () => {
  const { dropEditsInFile, isSyncSpaceKey } = require('../site/js/edit_sync');
  const { srtEditsKey, srtPlaceholdersKey } = require('../site/js/edit_store');
  const CK = srtEditsKey(TALK, 'video1', 'uk');
  const HK = srtPlaceholdersKey(TALK, 'video1', 'uk');

  it('the SRT target claims the marker key the store writes, for its own video and lang only', () => {
    const tgt = srtSyncTarget(TALK, 'video1', 'uk');
    assert.ok(tgt.filter(HK));
    assert.ok(isSyncSpaceKey(HK, TALK));
    assert.ok(!tgt.filter(srtPlaceholdersKey(TALK, 'video1', 'de')));
    assert.ok(!tgt.filter(srtPlaceholdersKey(TALK, 'video2', 'uk')));
    assert.ok(!transcriptSyncTarget(TALK, 'uk').filter(HK));
  });

  it('travels in the doc as a sibling entry and round-trips as a plain map', () => {
    const storage = memStorage({ [CK]: JSON.stringify({ 4: 'текст' }), [HK]: JSON.stringify({ 4: 'текст' }) });
    const entries = collectSyncEntries(TALK, storage, srtSyncTarget(TALK, 'video1', 'uk').filter);
    assert.deepStrictEqual(entries, { [CK]: { 4: 'текст' }, [HK]: { 4: 'текст' } });
    assert.strictEqual(JSON.stringify(unflattenDoc(flattenDoc(entries))), JSON.stringify(entries));
  });

  it('a marker whose edit is gone or reads differently is not collected', () => {
    const storage = memStorage({
      [CK]: JSON.stringify({ 4: 'текст, змінено' }),
      [HK]: JSON.stringify({ 4: 'текст', 9: 'рядок без правки' }),
    });
    assert.deepStrictEqual(collectSyncEntries(TALK, storage), { [CK]: { 4: 'текст, змінено' } });
  });

  it('a capture adopted from another device arrives with its marker', () => {
    const remote = { [CK]: { 4: 'текст' }, [HK]: { 4: 'текст' } };
    const storage = memStorage();
    applySyncEntries(TALK, mergeSyncDocs({}, {}, remote).entries, storage);
    assert.deepStrictEqual(JSON.parse(storage.getItem(HK)), { 4: 'текст' });
  });

  it('typing into the row on another device ends the placeholder here too', () => {
    const base = { [CK]: { 4: 'текст' }, [HK]: { 4: 'текст' } };
    const remote = { [CK]: { 4: 'текст, змінено' } };
    assert.deepStrictEqual(mergeSyncDocs(base, base, remote).entries, remote);
  });

  it('a merged PR does not land a placeholder: it proposed nothing', () => {
    const local = { [CK]: { 4: 'текст', 5: 'правка' }, [HK]: { 4: 'текст' } };
    const merged = ['', '', '', '', 'текст', 'правка'];
    assert.deepStrictEqual(dropEditsInFile(local, CK, merged), { [CK]: { 4: 'текст' }, [HK]: { 4: 'текст' } });
  });

  it('a merged PR leaves no marker behind for an edit it landed', () => {
    const local = { [CK]: { 5: 'правка' }, [HK]: { 5: 'як було' } };
    assert.deepStrictEqual(dropEditsInFile(local, CK, ['', '', '', '', '', 'правка']), {});
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
  // Simulate a branch deleted out from under the engine (external PR close +
  // branch delete, or a teardown on another device): GitHub answers PUT/GET on
  // a missing branch with 404 "Branch <name> not found". createRef re-creates it.
  let branchGone = !!over.branchGone;
  const gh = {
    calls,
    puts: [],
    // Stateful like the real Contents API: a PUT to the state path makes the
    // file visible to later GETs, a DELETE removes it. An explicit
    // over.remote (value or function) takes precedence.
    _stateFile: null,
    getFileContent: async (api, token, path, ref) => {
      record('getFileContent', [path, ref]);
      if (over.commits && ref in over.commits) {
        let at = over.commits[ref][path];
        if (typeof at === 'function') at = at();
        if (at instanceof Error) throw at;
        return typeof at === 'string' ? { content: at, sha: 'blob_' + ref } : null;
      }
      if (branchGone) return null;                 // 404 on a missing branch -> null
      if ('remote' in over) {
        const r = typeof over.remote === 'function' ? over.remote() : over.remote;
        return r || null;
      }
      return gh._stateFile;
    },
    getBranchHeadSha: async (api, token, branch) => {
      record('getBranchHeadSha', [branch]);
      // Only the sync branch can be the deleted one; the base branch is always there.
      if (branchGone && branch !== 'main') { const e = new Error('Not Found'); e.status = 404; throw e; }
      if (over.branchProbeStatus && branch !== 'main') {
        const e = new Error('probe failed'); e.status = over.branchProbeStatus; throw e;
      }
      return 'head1';
    },
    createRef: async (api, token, name, sha) => {
      record('createRef', [name, sha]);
      if (over.refExists) { const e = new Error('Reference already exists'); e.status = 422; throw e; }
      if (!over.branchStaysGone) branchGone = false;  // the branch exists again
      return {};
    },
    putFile: async (api, token, opts) => {
      if (branchGone) { const e = new Error('Branch ' + opts.branch + ' not found'); e.status = 404; throw e; }
      putCount += 1;
      record('putFile', [opts.path, opts.sha || null, !!opts.keepalive]);
      if (opts.path.indexOf('.review-sync/') === 0) {
        gh.puts.push(JSON.parse(opts.content));
      }
      if (over.putFails && putCount <= over.putFails.length) {
        const spec = over.putFails[putCount - 1];
        if (spec) { const e = new Error(spec.message || 'fail'); e.status = spec.status; throw e; }
      }
      const sha = 'sha_after_put' + (over.shaTag || '') + putCount;
      if (opts.path.indexOf('.review-sync/') === 0) {
        gh._stateFile = { content: opts.content, sha };
      }
      return { content: { sha } };
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
    getFileSha: async (api, token, path, ref) => {
      record('getFileSha', [path, ref]);
      return 'fileblob1';
    },
    deleteFile: async (api, token, opts) => {
      record('deleteFile', [opts.path, opts.branch, opts.sha]);
      if (opts.path.indexOf('.review-sync/') === 0) gh._stateFile = null;
      return {};
    },
    markPullReady: async (token, nodeId) => {
      record('markPullReady', [nodeId]);
      if (over.readyFails) throw new Error('graphql down');
      return {};
    },
    convertPullToDraft: async (token, nodeId) => {
      record('convertPullToDraft', [nodeId]);
      // GraphQL errors carry a message and no HTTP status (see ghGraphql).
      if (over.draftFails) throw new Error(over.draftFails);
      return {};
    },
    closePull: async (api, token, prNumber) => {
      record('closePull', [prNumber]);
      // Hook to simulate a re-edit (or anything) landing mid-teardown.
      if (over.onClosePull) over.onClosePull();
      if (over.closePullFails) { const e = new Error('close failed'); e.status = over.closePullFails; throw e; }
      return { number: prNumber, state: 'closed' };
    },
    // Mirrors the real helper: already-gone (404/422) resolves; other errors
    // throw. Deleting the branch also removes the state file that lived on it.
    deleteRef: async (api, token, branchName) => {
      record('deleteRef', [branchName]);
      const s = over.deleteRefStatus;
      if (s && s !== 404 && s !== 422) { const e = new Error('delete failed'); e.status = s; throw e; }
      gh._stateFile = null;
      return null;
    },
  };
  // The PRs ever opened from the sync branch, newest first. Wired only when a
  // test says what they are, so the rest of the suite keeps exercising an
  // engine that cannot ask. A value, a function, or an Error to throw.
  if ('prs' in over) {
    gh.listPrsByHead = async (api, token, owner, branch) => {
      record('listPrsByHead', [owner, branch]);
      const v = typeof over.prs === 'function' ? over.prs() : over.prs;
      if (v instanceof Error) throw v;
      return v;
    };
  }
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
  it('adopts pre-existing local edits on attach and creates the PR (no fresh edit needed)', async () => {
    const { engine, gh, storage } = makeEngine();
    // Edits already sit in localStorage from a previous session; the user just
    // navigates back onto the page and never types — so no notifyEdit() fires.
    localEdit(storage, 1, 'from a previous session');
    await engine.attach();
    assert.strictEqual(
      engine.getInfo().dirty,
      true,
      'attach must mark un-synced local edits dirty so the first sync triggers',
    );
    await engine.flush();
    const names = gh.calls.map((c) => c[0]);
    assert.ok(
      names.includes('createPull'),
      'a draft PR must be created for edits that predate the engine',
    );
    assert.strictEqual(engine.getInfo().prNumber, 77);
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
  it('an edit onto a branch with a submitted (ready) PR converts it back to draft', async () => {
    // Post-finalize continuation, possibly from another device: the
    // deterministic branch carries an open NON-draft PR. A new edit silently
    // re-drafts it and the sync resumes — fully reversible lifecycle.
    const { engine, gh, storage } = makeEngine({
      existingPr: { number: 12, html_url: 'https://github.com/x/pull/12', node_id: 'PR_n12', draft: false },
    });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'convertPullToDraft').length, 1);
    assert.strictEqual(gh.puts.length, 1);
    const info = engine.getInfo();
    assert.strictEqual(info.prNumber, 12);
    assert.strictEqual(info.prDraft, true);
    assert.strictEqual(info.status, 'synced');
  });
});

describe('engine: teardown on full revert', () => {
  it('reverting the last edit closes the PR, deletes the branch and hides the chip', async () => {
    const { engine, gh, storage } = makeEngine();
    localEdit(storage, 1, 'правка');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().prNumber, 77);   // PR created

    storage.removeItem(RKEY);                             // revert everything
    engine.notifyEdit();
    await engine.flush();

    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'closePull'), ['closePull', 77]);
    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'deleteRef'), ['deleteRef', BRANCH_NAME]);
    const info = engine.getInfo();
    assert.strictEqual(info.status, 'idle');             // chip hides
    assert.strictEqual(info.prNumber, null);             // in-memory base reset
    const base = JSON.parse(storage.getItem(syncBaseKey(TALK)));
    assert.strictEqual(base.prNumber, null);             // persisted base wiped
    assert.strictEqual(base.sha, null);
  });

  it('a fresh edit after teardown re-creates the branch and PR from scratch', async () => {
    const { engine, gh, storage } = makeEngine();
    localEdit(storage, 1, 'a'); engine.notifyEdit(); await engine.flush();
    storage.removeItem(RKEY); engine.notifyEdit(); await engine.flush();  // teardown
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'closePull').length, 1); // PR really closed
    localEdit(storage, 2, 'b'); engine.notifyEdit(); await engine.flush(); // re-edit
    assert.strictEqual(engine.getInfo().prNumber, 77);
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createRef').length, 2); // branch recreated
  });

  it('teardown is best-effort: an already-gone branch (404) still completes', async () => {
    const { engine, storage } = makeEngine({ deleteRefStatus: 404 });
    localEdit(storage, 1, 'a'); engine.notifyEdit(); await engine.flush();
    storage.removeItem(RKEY); engine.notifyEdit(); await engine.flush();
    const info = engine.getInfo();
    assert.strictEqual(info.status, 'idle');             // not an error
    assert.strictEqual(info.prNumber, null);
  });

  it('closes a finalized (ready) PR too — no edits means no PR', async () => {
    const { engine, gh, storage } = makeEngine();
    localEdit(storage, 1, 'a'); engine.notifyEdit(); await engine.flush();
    await engine.finalize();                             // PR -> ready for review
    assert.strictEqual(engine.getInfo().prDraft, false);
    storage.removeItem(RKEY); engine.notifyEdit(); await engine.flush();
    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'closePull'), ['closePull', 77]);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('empty edits with nothing ever synced stays idle (no teardown network)', async () => {
    const { engine, gh } = makeEngine();                 // never synced, no PR
    engine.notifyEdit();                                 // dirty but collect() empty
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'closePull').length, 0);
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'deleteRef').length, 0);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('keeps the PR when the remote branch still carries a concurrent edit', async () => {
    // Two devices, same talk/target: this device reverts to zero, but the other
    // synced an edit we never pulled. Teardown must pull+merge and, finding the
    // merge non-empty, push instead of destroying the branch (which would lose
    // the other device's edit) — the CAS guarantee of the old empty-push path.
    const { engine, gh, storage } = makeEngine();
    localEdit(storage, 1, 'mine');
    engine.notifyEdit();
    await engine.flush();                                 // PR 77; remote = {1:'mine'}
    const remote = JSON.parse(gh._stateFile.content);
    remote.entries[RKEY].edits[5] = 'from phone';         // concurrent device's edit
    gh._stateFile = { content: JSON.stringify(remote), sha: 'sha_concurrent' };

    storage.removeItem(RKEY);                             // revert my only edit
    engine.notifyEdit();
    await engine.flush();

    assert.strictEqual(gh.calls.filter((c) => c[0] === 'closePull').length, 0, 'must NOT close the PR');
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'deleteRef').length, 0, 'must NOT delete the branch');
    assert.strictEqual(JSON.parse(storage.getItem(RKEY)).edits[5], 'from phone', 'concurrent edit merged in');
    assert.notStrictEqual(engine.getInfo().status, 'idle');
  });

  it('a re-edit that lands mid-teardown is not dropped and the chip never lies idle', async () => {
    // undo -> redo: the revert triggers teardown; a new edit arrives while
    // closePull/deleteRef are on the wire. It must survive with the chip honest
    // (not idle) and re-create the PR from the pristine base on the next flush.
    const holder = {};
    const { engine, gh, storage } = makeEngine({
      onClosePull: () => { localEdit(storage, 9, 'redo'); holder.engine.notifyEdit(); },
    });
    holder.engine = engine;
    localEdit(storage, 1, 'first');
    engine.notifyEdit();
    await engine.flush();                                 // PR 77

    storage.removeItem(RKEY);
    engine.notifyEdit();
    await engine.flush();                                 // teardown; onClosePull injects the redo

    const mid = engine.getInfo();
    assert.notStrictEqual(mid.status, 'idle', 'chip must not read idle while an edit is pending');
    assert.strictEqual(mid.prNumber, null);              // base was reset
    assert.strictEqual(JSON.parse(storage.getItem(RKEY)).edits[9], 'redo', 'the redo survived locally');

    await engine.flush();                                 // the pending edit re-creates from scratch
    const after = engine.getInfo();
    assert.strictEqual(after.prNumber, 77);
    assert.strictEqual(after.status, 'synced');
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createRef').length, 2); // branch recreated
  });
});

describe('engine: teardown tombstone (a torn-down state file stays gone)', () => {
  const T0 = 1770000000000;
  const TTL_MS = 5 * 60 * 1000;

  // Sync three edits, then revert them all: PR closed, branch deleted. Returns
  // the state file exactly as it stood on the branch right before the teardown —
  // what a cache or a lagging replica keeps serving afterwards.
  async function syncThenTearDown(engineOver) {
    const ctx = makeEngine({}, {}, engineOver);
    localEdit(ctx.storage, 1, 'one');
    localEdit(ctx.storage, 2, 'two');
    localEdit(ctx.storage, 3, 'three');
    ctx.engine.notifyEdit();
    await ctx.engine.flush();
    const tornDown = ctx.gh._stateFile;
    assert.ok(tornDown, 'the state file was pushed');
    ctx.storage.removeItem(RKEY);
    ctx.engine.notifyEdit();
    await ctx.engine.flush();
    assert.strictEqual(ctx.engine.getInfo().status, 'idle');
    assert.strictEqual(ctx.gh.calls.filter((c) => c[0] === 'deleteRef').length, 1);
    return Object.assign(ctx, { tornDown });
  }

  // A page reload: a brand-new engine over the SAME storage.
  function reopen(storage, over, engineOver) {
    const ctx = makeEngine(over, {}, Object.assign({ storage }, engineOver || {}));
    ctx.storage = storage;
    return ctx;
  }

  it('attach after teardown does not restore the edits from a stale read', async () => {
    const { engine, gh, storage, applied, statuses, tornDown } = await syncThenTearDown();
    gh._stateFile = tornDown;                    // the GET still answers with the old file
    statuses.length = 0;
    await engine.attach();
    assert.strictEqual(storage.getItem(RKEY), null, 'the reverted edits must stay reverted');
    assert.deepStrictEqual(applied, []);
    assert.ok(!statuses.includes('synced'), 'nothing exists on GitHub — never "synced"');
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.strictEqual(JSON.parse(storage.getItem(syncBaseKey(TALK))).sha, null);
  });

  it('survives a reload: a lagging replica serving the torn-down sha is ignored', async () => {
    const first = await syncThenTearDown();
    const { engine, storage, applied, statuses } = reopen(first.storage, { remote: first.tornDown });
    await engine.attach();
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.deepStrictEqual(applied, []);
    assert.ok(!statuses.includes('synced'));
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('the exact torn-down sha is refused even when the doc claims a later time', async () => {
    let clock = T0 + 10000;                      // the doc is stamped 10s "after"...
    const first = await (async () => {
      const ctx = makeEngine({}, {}, { now: () => clock });
      localEdit(ctx.storage, 1, 'one');
      ctx.engine.notifyEdit();
      await ctx.engine.flush();
      const tornDown = ctx.gh._stateFile;
      clock = T0;                                // ...the teardown that deleted it
      ctx.storage.removeItem(RKEY);
      ctx.engine.notifyEdit();
      await ctx.engine.flush();
      return Object.assign(ctx, { tornDown });
    })();
    const { engine, storage } = reopen(first.storage, { remote: first.tornDown }, { now: () => T0 + 1000 });
    await engine.attach();
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('an OLDER revision of the torn-down file (different sha) is ignored too', async () => {
    const first = await syncThenTearDown();
    // The replica is behind the last push: another sha, a lower revision,
    // written before the teardown.
    const older = {
      content: JSON.stringify(makeSyncDoc(TALK,
        { [RKEY]: { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three', 4: 'four' } } },
        0, 'client1', new Date(T0 - 60000).toISOString())),
      sha: 'sha_older_revision',
    };
    const { engine, storage, statuses } = reopen(first.storage, { remote: older });
    await engine.attach();
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.ok(!statuses.includes('synced'));
  });

  it('a NEW doc from another device after the teardown is adopted', async () => {
    const first = await syncThenTearDown();
    // Another device re-created the branch from scratch: revision restarts at 1
    // (not above the torn-down one), but it was written after the teardown.
    const fresh = {
      content: JSON.stringify(makeSyncDoc(TALK,
        { [RKEY]: { marks: {}, edits: { 7: 'from phone' } } },
        1, 'phone', new Date(T0 + 30000).toISOString())),
      sha: 'sha_from_phone',
    };
    const { engine, storage, applied } = reopen(first.storage, { remote: fresh },
      { now: () => T0 + 60000 });
    await engine.attach();
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)).edits, { 7: 'from phone' });
    assert.strictEqual(applied.length, 1);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('a doc with a HIGHER revision is adopted whatever its clock says', async () => {
    const first = await syncThenTearDown();
    const fresh = {
      content: JSON.stringify(makeSyncDoc(TALK,
        { [RKEY]: { marks: {}, edits: { 7: 'from phone' } } },
        9, 'phone', new Date(T0 - 3600000).toISOString())),   // that device's clock is an hour behind
      sha: 'sha_from_phone',
    };
    const { engine, storage } = reopen(first.storage, { remote: fresh });
    await engine.attach();
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)).edits, { 7: 'from phone' });
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('a local re-edit after teardown re-creates from scratch despite a stale read', async () => {
    const first = await syncThenTearDown();
    let stale = true;
    const ctx = reopen(first.storage, { shaTag: '_recreated' });
    const realGet = ctx.gh.getFileContent;
    ctx.gh.getFileContent = async (...args) => {
      const real = await realGet(...args);
      return stale ? first.tornDown : real;
    };
    const { engine, gh, storage } = ctx;
    await engine.attach();
    localEdit(storage, 5, 'new');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createRef').length, 1, 'branch re-created');
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createPull').length, 1, 'fresh PR opened');
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 5: 'new' },
      'only the new edit is pushed — the torn-down ones are not merged back in');
    const statePut = gh.calls.find((c) => c[0] === 'putFile' && c[1].indexOf('.review-sync/') === 0);
    assert.strictEqual(statePut[2], null, 'created without a sha, not as an update of the ghost');
    assert.strictEqual(engine.getInfo().status, 'synced');

    // The replica is STILL behind on the next pull: it must not roll us back.
    await engine.pull(true);
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)).edits, { 5: 'new' });
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(JSON.parse(storage.getItem(syncBaseKey(TALK))).sha, 'sha_after_put_recreated1');
    assert.deepStrictEqual(gh.calls.filter((c) => c[0] === 'getBranchHeadSha' && c[1] !== 'main'), [],
      'a stale read is no evidence that the re-created branch is gone');

    // ...and once it catches up the real file reads as in sync.
    stale = false;
    await engine.pull(true);
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)).edits, { 5: 'new' });
    assert.strictEqual(engine.getInfo().status, 'synced');

    const reloaded = reopen(storage, { remote: gh._stateFile });
    await reloaded.engine.attach();
    assert.strictEqual(reloaded.engine.getInfo().status, 'synced',
      'our own re-created file is the base, not a ghost, though the tombstone still lives');
  });

  it('a CAS conflict after teardown does not merge the torn-down file back in', async () => {
    const first = await syncThenTearDown();
    const { engine, gh, storage } = reopen(first.storage,
      { remote: first.tornDown, putFails: [{ status: 409 }] });
    localEdit(storage, 5, 'new');
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 5: 'new' });
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)).edits, { 5: 'new' });
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('the tombstone expires: it is a bounded guard, not a permanent block', async () => {
    const first = await syncThenTearDown();
    const justBefore = reopen(first.storage, { remote: first.tornDown }, { now: () => T0 + TTL_MS - 1 });
    await justBefore.engine.attach();
    assert.strictEqual(first.storage.getItem(RKEY), null, 'still guarded inside the TTL');

    const after = reopen(first.storage, { remote: first.tornDown }, { now: () => T0 + TTL_MS });
    await after.engine.attach();
    assert.deepStrictEqual(JSON.parse(first.storage.getItem(RKEY)).edits, { 1: 'one', 2: 'two', 3: 'three' },
      'past the TTL a file that is still there is taken at face value');
    assert.strictEqual(JSON.parse(first.storage.getItem(syncBaseKey(TALK))).tombstone, undefined,
      'the expired tombstone is dropped from storage');
  });

  it('a tombstone from a clock that has since moved backwards does not live forever', async () => {
    const first = await syncThenTearDown();
    const { engine, storage } = reopen(first.storage, { remote: first.tornDown },
      { now: () => T0 - 24 * 3600 * 1000 });
    await engine.attach();
    assert.ok(storage.getItem(RKEY), 'an unusable timestamp cannot keep the guard up');
  });
});

describe('engine: pull finds no state file while the base says "synced"', () => {
  const ENTRY = { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three' } };
  // What a client holds when its edits are all "synced" (base == local) against
  // a state file that is no longer there.
  function seeded(metaOver) {
    return {
      [RKEY]: JSON.stringify(ENTRY),
      [syncBaseKey(TALK)]: JSON.stringify(Object.assign({
        doc: { [RKEY]: ENTRY }, sha: 'sha_gone', revision: 3,
        prNumber: null, prUrl: null, nodeId: null, prDraft: null, fileShas: {}, branch: BRANCH_NAME,
      }, metaOver || {})),
    };
  }

  const WRITES = ['createRef', 'putFile', 'createPull'];
  const writes = (gh) => gh.calls.filter((c) => WRITES.includes(c[0])).map((c) => c[0]);
  const base = (storage) => JSON.parse(storage.getItem(syncBaseKey(TALK)));

  it('branch gone: the edits show as not synced, and opening the page pushes nothing', async () => {
    const { engine, gh, storage, timers } = makeEngine({ branchGone: true }, seeded());
    await engine.attach();
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)).edits, ENTRY.edits, 'the edits are kept');
    assert.strictEqual(engine.getInfo().status, 'pending', 'edits on screen must show a chip, and not a synced one');
    assert.strictEqual(base(storage).sha, null, 'the stale base is wiped');
    assert.deepStrictEqual(base(storage).doc, {});
    assert.strictEqual(engine.getInfo().dirty, false);
    assert.deepStrictEqual(timers.delays(), [], 'no push is armed');
    assert.deepStrictEqual(writes(gh), []);
  });

  it('branch gone: none of the automatic triggers re-creates the branch or the PR', async () => {
    const { engine, gh, timers } = makeEngine({ branchGone: true }, seeded());
    await engine.attach();
    await engine.flush();                        // `online`
    await engine.flush({ keepalive: true });     // tab hidden, pagehide
    engine.flushSoon();                          // a field losing focus
    await engine.pull(true);                     // the tab focused again
    await engine.pull(true);
    timers.fire(60000);
    await settle();
    assert.deepStrictEqual(writes(gh), []);
    assert.strictEqual(engine.getInfo().status, 'pending');
  });

  it('branch gone: opening the page again later still pushes nothing', async () => {
    const first = makeEngine({ branchGone: true }, seeded());
    await first.engine.attach();
    await first.engine.destroy();
    const { engine, gh, timers } = makeEngine({ branchGone: true }, {}, { storage: first.storage });
    await engine.attach();
    assert.deepStrictEqual(timers.delays(), []);
    assert.deepStrictEqual(writes(gh), []);
    assert.strictEqual(engine.getInfo().status, 'pending');
  });

  it('branch gone: the next real edit re-creates the branch and a draft PR with ALL the edits', async () => {
    const { engine, gh, storage } = makeEngine({ branchGone: true }, seeded());
    await engine.attach();
    localEdit(storage, 4, 'four');
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(writes(gh), ['createRef', 'putFile', 'createPull']);
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, Object.assign({ 4: 'four' }, ENTRY.edits));
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(engine.getInfo().prNumber, 77);
  });

  it('branch gone: an edit the page closed on before its push is pushed on the next open', async () => {
    const first = makeEngine({ branchGone: true }, seeded());
    await first.engine.attach();
    localEdit(first.storage, 4, 'four');
    first.engine.notifyEdit();
    await first.engine.destroy();
    const { engine, gh, timers } = makeEngine({ branchGone: true }, {}, { storage: first.storage });
    await engine.attach();
    assert.strictEqual(timers.delays().length, 1, 'a push is armed');
    await engine.flush();
    assert.deepStrictEqual(writes(gh), ['createRef', 'putFile', 'createPull']);
  });

  it('branch gone: "sync now" is the user asking, and it pushes', async () => {
    const { engine, gh } = makeEngine({ branchGone: true }, seeded());
    await engine.attach();
    await engine.flush({ force: true });
    assert.deepStrictEqual(writes(gh), ['createRef', 'putFile', 'createPull']);
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, ENTRY.edits);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('branch gone, then the branch is back with the state file: it is merged as usual', async () => {
    const { engine, gh, storage } = makeEngine({ branchGone: true }, seeded());
    await engine.attach();
    const fresh = makeEngine({ remote: remoteDoc({ 1: 'one', 2: 'two', 3: 'three' }, 1, 'sha_back') },
      {}, { storage });
    await fresh.engine.attach();
    assert.strictEqual(fresh.engine.getInfo().status, 'synced');
    assert.strictEqual(base(storage).sha, 'sha_back');
    assert.strictEqual(base(storage).orphaned, undefined);
    assert.deepStrictEqual(writes(gh).concat(writes(fresh.gh)), []);
  });

  it('branch gone with a cached PR: the dead PR coordinates are dropped, nothing is pushed', async () => {
    const { engine, gh } = makeEngine({ branchGone: true },
      seeded({ prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', prDraft: true }));
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.strictEqual(engine.getInfo().prNumber, null);
    assert.deepStrictEqual(writes(gh), []);
  });

  it('a "branch gone" answer that arrives after a push re-created the branch does not wipe the new base', async () => {
    const { engine, gh, storage } = makeEngine({ branchGone: true }, seeded());
    const probeAnswer = (() => { let release; const p = new Promise((r) => { release = r; }); return { p, release }; })();
    const realProbe = gh.getBranchHeadSha;
    gh.getBranchHeadSha = async (api, token, branch) => {
      if (branch === 'main') return realProbe(api, token, branch);
      await probeAnswer.p;                       // asked while the branch was gone, answered late
      const e = new Error('Not Found'); e.status = 404; throw e;
    };
    const pulling = engine.pull(true);
    await settle();
    localEdit(storage, 4, 'four');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'synced');
    const pushed = base(storage);
    probeAnswer.release();
    await pulling;
    assert.deepStrictEqual(base(storage), pushed, 'the base of the push stands');
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(engine.getInfo().prNumber, 77);
  });

  it('branch alive (finalized on another device): nothing is re-pushed', async () => {
    // The state file is removed by a finalize; the branch and its PR live on.
    // Re-pushing here would drag a submitted PR back to draft.
    const { engine, gh, storage, timers } = makeEngine({},
      seeded({ prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', prDraft: false }));
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'ready');
    assert.deepStrictEqual(timers.delays(), [], 'no push armed');
    assert.strictEqual(gh.puts.length, 0);
    assert.strictEqual(JSON.parse(storage.getItem(syncBaseKey(TALK))).sha, 'sha_gone', 'base untouched');
  });

  it('a failed branch probe changes nothing (the next pull asks again)', async () => {
    const { engine, storage, timers } = makeEngine({ branchProbeStatus: 500 }, seeded());
    await engine.attach();
    assert.deepStrictEqual(timers.delays(), []);
    assert.strictEqual(JSON.parse(storage.getItem(syncBaseKey(TALK))).sha, 'sha_gone');
  });

  // --- the branch is gone because its PR was MERGED -------------------------
  // What landed is read off the file at the PR's merge commit, edit by edit.
  const FILE = 'talks/' + TALK + '/transcript_uk.txt';
  const FACT = { filePath: FILE, editsKey: RKEY, parseFile: (content) => content.split('\n') };
  const MERGED = [{ number: 12, state: 'closed', merged: true, mergeCommitSha: 'mergesha12' }];
  // Not merged is decided by `merged` alone, whatever commit the PR names.
  const CLOSED = [{ number: 12, state: 'closed', merged: false, mergeCommitSha: 'mergesha12' }];
  const ALL_LANDED = 'zero\none\ntwo\nthree';
  const cachedPr = { prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', prDraft: false };
  const mergedWith = (fileAtMerge, prs) => (
    { branchGone: true, prs: prs || MERGED, commits: { mergesha12: { [FILE]: fileAtMerge } } });
  const mergeReads = (gh) => gh.calls.filter((c) => c[0] === 'getFileContent' && c[1] === FILE);
  const edits = (storage) => JSON.parse(storage.getItem(RKEY)).edits;

  it('merged PR: every edit the merged file holds has landed and is cleared', async () => {
    const { engine, gh, storage, timers, applied } = makeEngine(mergedWith(ALL_LANDED), seeded(cachedPr), FACT);
    await engine.attach();
    assert.strictEqual(storage.getItem(RKEY), null, 'nothing is left to propose a second time');
    assert.deepStrictEqual(applied, [[RKEY]], 'the open view is told to re-read its edits');
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.strictEqual(engine.getInfo().prNumber, null);
    assert.strictEqual(base(storage).sha, null);
    assert.deepStrictEqual(base(storage).doc, {});
    assert.strictEqual(base(storage).orphaned, undefined, 'nothing is held back: there is nothing');
    assert.deepStrictEqual(timers.delays(), []);
    assert.deepStrictEqual(writes(gh), []);
    assert.deepStrictEqual(gh.calls.filter((c) => c[0] === 'listPrsByHead'), [['listPrsByHead', 'sy-tools', BRANCH_NAME]]);
    assert.deepStrictEqual(mergeReads(gh), [['getFileContent', FILE, 'mergesha12']],
      'the target\'s own file, as the merge commit has it');
  });

  it('merged PR: an edit the merged file does not hold stays, held back — whatever the base says', async () => {
    // The base claims all three were synced. The file is what merged.
    const { engine, gh, storage, timers } = makeEngine(mergedWith('zero\none\nTWO, as main has it\nthree'),
      seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), { 2: 'two' });
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.strictEqual(base(storage).orphaned, true);
    assert.deepStrictEqual(timers.delays(), [], 'kept, and not pushed for the user');
    assert.deepStrictEqual(writes(gh), []);
  });

  it('merged PR: an edit this device never synced is cleared too, once the merged file reads the same', async () => {
    const init = seeded(Object.assign({ doc: {} }, cachedPr));
    const { engine, gh, storage, timers } = makeEngine(mergedWith(ALL_LANDED), init, FACT);
    await engine.attach();
    assert.strictEqual(timers.delays().length, 1, 'un-synced edits arm a push; the push is what meets the merge');
    timers.fire(15000);
    await settle();
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.deepStrictEqual(writes(gh), [], 'nothing is left to open a PR for');
  });

  it('merged PR: the file is compared index by index', async () => {
    const { engine, storage } = makeEngine(mergedWith('one\ntwo\nthree\nzero'), seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits, 'the same texts, each one block away');
  });

  it('merged PR: the file is not at the merge commit — nothing is cleared, the edits are held back', async () => {
    const { engine, gh, storage } = makeEngine({ branchGone: true, prs: MERGED, commits: { mergesha12: {} } },
      seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(mergeReads(gh), [['getFileContent', FILE, 'mergesha12']]);
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.strictEqual(base(storage).orphaned, true);
    assert.strictEqual(base(storage).sha, null, 'a file that is not there will not be there next time either');
    assert.deepStrictEqual(writes(gh), []);
  });

  it('merged PR: the merged file cannot be read — nothing is cleared or forgotten, the next pull asks again', async () => {
    let fileAtMerge = Object.assign(new Error('boom'), { status: 502 });
    const { engine, gh, storage, timers } = makeEngine(mergedWith(() => fileAtMerge), seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(base(storage).prNumber, 12, 'the PR number is what finds the merge — keep it');
    assert.strictEqual(base(storage).sha, 'sha_gone');
    assert.strictEqual(engine.getInfo().status, 'pending', 'edits on screen never sit under a hidden chip');
    assert.deepStrictEqual(timers.delays(), []);
    assert.deepStrictEqual(writes(gh), []);
    fileAtMerge = ALL_LANDED;
    await engine.pull(true);
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('merged PR: a 401 on the merged file is a revoked token, reported as one', async () => {
    const denied = Object.assign(new Error('Bad credentials'), { status: 401 });
    const { engine, storage } = makeEngine(mergedWith(denied), seeded(cachedPr), FACT);
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(engine.getInfo().error.kind, 'auth');
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
  });

  it('merged PR: a file that cannot be parsed clears nothing', async () => {
    const broken = Object.assign({}, FACT, { parseFile: () => { throw new Error('not an SRT'); } });
    const { engine, storage } = makeEngine(mergedWith(ALL_LANDED), seeded(cachedPr), broken);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(base(storage).orphaned, true);
  });

  it('merged PR with no merge commit named: there is no file to read, nothing is cleared', async () => {
    const prs = [{ number: 12, state: 'closed', merged: true, mergeCommitSha: null }];
    const { engine, gh, storage } = makeEngine(mergedWith(ALL_LANDED, prs), seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.deepStrictEqual(mergeReads(gh), []);
    assert.strictEqual(base(storage).orphaned, true);
  });

  it('an engine that names no file to check clears nothing on a merge', async () => {
    for (const missing of ['filePath', 'editsKey', 'parseFile']) {
      const opts = Object.assign({}, FACT, { [missing]: undefined });
      const { engine, gh, storage } = makeEngine(mergedWith(ALL_LANDED), seeded(cachedPr), opts);
      await engine.attach();
      assert.deepStrictEqual(edits(storage), ENTRY.edits, missing);
      assert.deepStrictEqual(mergeReads(gh), [], missing);
      assert.strictEqual(base(storage).orphaned, true, missing);
    }
  });

  it('merged PR: edits the merged file lacks are newer work — they alone go into the new PR', async () => {
    const init = seeded(cachedPr);
    init[RKEY] = JSON.stringify({ marks: {}, edits: { 1: 'one', 2: 'two, reworded', 3: 'three', 4: 'four' } });
    const { engine, gh, storage, timers } = makeEngine(mergedWith(ALL_LANDED), init, FACT);
    await engine.attach();
    timers.fire(15000);
    await settle();
    assert.deepStrictEqual(edits(storage), { 2: 'two, reworded', 4: 'four' });
    assert.deepStrictEqual(writes(gh), ['createRef', 'putFile', 'createPull']);
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 2: 'two, reworded', 4: 'four' });
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('closed PR: a push that finds the branch gone still carries every edit', async () => {
    const init = seeded(cachedPr);
    init[RKEY] = JSON.stringify({ marks: {}, edits: Object.assign({ 4: 'four' }, ENTRY.edits) });
    const { engine, gh, timers } = makeEngine(mergedWith(ALL_LANDED, CLOSED), init, FACT);
    await engine.attach();
    timers.fire(15000);
    await settle();
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, Object.assign({ 4: 'four' }, ENTRY.edits));
    assert.deepStrictEqual(mergeReads(gh), [], 'nothing merged, nothing to read');
  });

  it('a push that finds the branch gone and cannot learn why pushes nothing', async () => {
    const init = seeded(cachedPr);
    init[RKEY] = JSON.stringify({ marks: {}, edits: Object.assign({ 4: 'four' }, ENTRY.edits) });
    const boom = Object.assign(new Error('boom'), { status: 500 });
    const { engine, gh, storage, timers } = makeEngine({ branchGone: true, prs: boom }, init, FACT);
    await engine.attach();
    timers.fire(15000);
    await settle();
    assert.deepStrictEqual(writes(gh), [], 'landed edits must not be proposed again on a guess');
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(base(storage).sha, 'sha_gone');
    assert.deepStrictEqual(edits(storage), Object.assign({ 4: 'four' }, ENTRY.edits));
  });

  it('a push that finds its PR merged and cannot read the merged file pushes nothing', async () => {
    const init = seeded(cachedPr);
    init[RKEY] = JSON.stringify({ marks: {}, edits: Object.assign({ 4: 'four' }, ENTRY.edits) });
    const boom = Object.assign(new Error('boom'), { status: 502 });
    const { engine, gh, storage, timers } = makeEngine(mergedWith(boom), init, FACT);
    await engine.attach();
    timers.fire(15000);
    await settle();
    assert.deepStrictEqual(writes(gh), [], 'landed edits must not be proposed again on a guess');
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(base(storage).prNumber, 12);
    assert.deepStrictEqual(edits(storage), Object.assign({ 4: 'four' }, ENTRY.edits));
  });

  // A finalize removes the state file and forgets its sha, so that device holds
  // a base with a PR number and no sha — and it is the device most likely to
  // see its PR merged.
  const finalized = Object.assign({ sha: null }, cachedPr);

  it('finalized here, then merged: the landed edits are cleared and the chip stops saying "ready"', async () => {
    const { engine, gh, storage } = makeEngine(mergedWith(ALL_LANDED), seeded(finalized), FACT);
    await engine.attach();
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.strictEqual(engine.getInfo().prNumber, null);
    assert.deepStrictEqual(writes(gh), []);
  });

  it('finalized here and still open: the PR stays "ready" and nothing is touched', async () => {
    const { engine, gh, storage } = makeEngine({ prs: MERGED, commits: { mergesha12: { [FILE]: ALL_LANDED } } },
      seeded(finalized), FACT);
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'ready');
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(base(storage).prNumber, 12);
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'listPrsByHead').length, 0, 'asked only once the branch is gone');
  });

  it('finalized here, then merged: an edit made before any pull opens a new PR with that edit alone', async () => {
    const { engine, gh, storage } = makeEngine(mergedWith(ALL_LANDED), seeded(finalized), FACT);
    localEdit(storage, 4, 'four');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'convertPullToDraft').length, 0, 'a merged PR cannot go back to draft');
    assert.deepStrictEqual(writes(gh), ['createRef', 'putFile', 'createPull']);
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 4: 'four' });
    assert.deepStrictEqual(edits(storage), { 4: 'four' });
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('no local edits left (the SPA retired them) and the branch gone: the dead PR is forgotten', async () => {
    const init = seeded(finalized);
    delete init[RKEY];
    const { engine, storage } = makeEngine(mergedWith(ALL_LANDED), init, FACT);
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.strictEqual(engine.getInfo().prNumber, null);
    assert.deepStrictEqual(base(storage).doc, {});
  });

  it('merged PR: marks are not edits — nothing merged them anywhere, they stay', async () => {
    const withMark = { marks: { 5: 'check this' }, edits: ENTRY.edits };
    const init = seeded(Object.assign({ doc: { [RKEY]: withMark } }, cachedPr));
    init[RKEY] = JSON.stringify(withMark);
    const { engine, storage } = makeEngine(mergedWith(ALL_LANDED), init, FACT);
    await engine.attach();
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)), { marks: { 5: 'check this' }, edits: {} });
    assert.strictEqual(engine.getInfo().status, 'pending');
  });

  it('closed without a merge: the edits are on no branch and stay, as before', async () => {
    const { engine, gh, storage, timers } = makeEngine(mergedWith(ALL_LANDED, CLOSED), seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.strictEqual(base(storage).orphaned, true);
    assert.strictEqual(base(storage).sha, null);
    assert.deepStrictEqual(timers.delays(), []);
    assert.deepStrictEqual(writes(gh), []);
  });

  it('held-back edits that were then all retired leave no "not synced" chip behind', async () => {
    const { engine, storage } = makeEngine({ branchGone: true, prs: CLOSED }, seeded(cachedPr));
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'pending');
    storage.removeItem(RKEY);
    await engine.pull(true);
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.strictEqual(base(storage).orphaned, undefined);
  });

  it('no PR was ever opened from the branch: the edits stay', async () => {
    const { engine, storage } = makeEngine(mergedWith(ALL_LANDED, []), seeded(), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(base(storage).orphaned, true);
  });

  it('the PR this device synced with decides, not a later one from the same branch', async () => {
    // The branch name is deterministic, so it carries every PR generation.
    const laterMerged = [{ number: 15, state: 'closed', merged: true, mergeCommitSha: 'mergesha15' },
      { number: 12, state: 'closed', merged: false, mergeCommitSha: null }];
    const kept = makeEngine(Object.assign(mergedWith(ALL_LANDED, laterMerged),
      { commits: { mergesha15: { [FILE]: ALL_LANDED } } }), seeded(cachedPr), FACT);
    await kept.engine.attach();
    assert.deepStrictEqual(edits(kept.storage), ENTRY.edits, '#12 never merged');
    assert.deepStrictEqual(mergeReads(kept.gh), [], '#15 is not the PR this base names');
  });

  // The cached number can be an earlier generation's: a pull adopts another
  // device's state file — which that device pushed for ITS new PR — and the
  // number stays. Only the newest PR of the branch can be the one the state
  // just held belonged to, so an older number proves nothing about it.
  it('a cached PR that is not the newest of the branch says nothing: its merge is not read', async () => {
    const laterClosed = [{ number: 15, state: 'closed', merged: false, mergeCommitSha: null },
      { number: 12, state: 'closed', merged: true, mergeCommitSha: 'mergesha12' }];
    const { engine, gh, storage } = makeEngine(mergedWith(ALL_LANDED, laterClosed), seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits, 'the edits may be #15\'s, which never merged');
    assert.deepStrictEqual(mergeReads(gh), []);
    assert.strictEqual(base(storage).orphaned, true, 'kept and held, like any branch that is simply gone');
    assert.strictEqual(base(storage).prNumber, null);
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.deepStrictEqual(writes(gh), []);
  });

  it('a cached PR older than a later MERGED one is not compared with either merge', async () => {
    const bothMerged = [{ number: 15, state: 'closed', merged: true, mergeCommitSha: 'mergesha15' },
      { number: 12, state: 'closed', merged: true, mergeCommitSha: 'mergesha12' }];
    const { engine, gh, storage } = makeEngine(Object.assign(mergedWith(ALL_LANDED, bothMerged),
      { commits: { mergesha12: { [FILE]: ALL_LANDED }, mergesha15: { [FILE]: ALL_LANDED } } }),
    seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.deepStrictEqual(mergeReads(gh), []);
  });

  it('a state file adopted from another device\'s NEW PR is not judged by the old PR\'s merge', async () => {
    // This device synced with #12, which merged. Another device re-created the
    // branch as #15 and pushed; the pull below adopts that state — the number
    // stays 12. #15 is then closed without a merge and its branch deleted.
    let live = remoteDoc({ 1: 'one', 2: 'two', 3: 'three' }, 9, 'sha_of_15');
    let gone = false;
    const prs = [{ number: 15, state: 'closed', merged: false, mergeCommitSha: null },
      { number: 12, state: 'closed', merged: true, mergeCommitSha: 'mergesha12' }];
    const { engine, gh, storage } = makeEngine(
      { remote: () => live, prs: prs, commits: { mergesha12: { [FILE]: ALL_LANDED } } }, seeded(cachedPr), FACT);
    const probe = gh.getBranchHeadSha;
    gh.getBranchHeadSha = async (api, token, branch) => {
      if (gone && branch !== 'main') throw Object.assign(new Error('Not Found'), { status: 404 });
      return probe(api, token, branch);
    };
    await engine.attach();
    assert.strictEqual(base(storage).sha, 'sha_of_15', 'the other device\'s state was adopted');
    live = null; gone = true;
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), ENTRY.edits, 'nothing #15 proposed ever merged');
    assert.deepStrictEqual(mergeReads(gh), []);
  });

  // GitHub closes a PR when its head branch is deleted. "Our PR is open" next
  // to "its branch is gone" is two reads of different moments, and so is a
  // list that does not know our PR yet. Neither is "closed".
  const OPEN = [{ number: 12, state: 'open', merged: false, mergeCommitSha: null }];
  const unsettled = [
    ['listed as still open', OPEN],
    ['missing from an empty list', []],
    ['missing from a list that ends before it', [{ number: 9, state: 'closed', merged: true, mergeCommitSha: 'mergesha9' }]],
  ];
  unsettled.forEach(([what, firstAnswer]) => {
    it('branch gone, our PR ' + what + ': nothing is dropped or forgotten, the next pull asks again', async () => {
      let answer = firstAnswer;
      const { engine, gh, storage, timers } = makeEngine(mergedWith(ALL_LANDED, () => answer), seeded(cachedPr), FACT);
      await engine.attach();
      assert.deepStrictEqual(edits(storage), ENTRY.edits);
      assert.strictEqual(base(storage).sha, 'sha_gone', 'the base stands');
      assert.strictEqual(base(storage).prNumber, 12, 'the PR number is what finds the merge — keep it');
      assert.strictEqual(base(storage).orphaned, undefined);
      assert.strictEqual(engine.getInfo().status, 'pending', 'edits on screen never sit under a hidden chip');
      assert.deepStrictEqual(timers.delays(), []);
      assert.deepStrictEqual(writes(gh), []);
      assert.deepStrictEqual(mergeReads(gh), []);
      answer = MERGED;
      await engine.pull(true);
      assert.strictEqual(storage.getItem(RKEY), null, 'once GitHub agrees with itself, the landed edits go');
      assert.strictEqual(engine.getInfo().status, 'idle');
    });

    it('a push that finds the branch gone and our PR ' + what + ' pushes nothing', async () => {
      const init = seeded(cachedPr);
      init[RKEY] = JSON.stringify({ marks: {}, edits: Object.assign({ 4: 'four' }, ENTRY.edits) });
      const { engine, gh, storage, timers } = makeEngine(mergedWith(ALL_LANDED, firstAnswer), init, FACT);
      await engine.attach();
      timers.fire(15000);
      await settle();
      assert.deepStrictEqual(writes(gh), [], 'a landed edit must not be proposed again on a guess');
      assert.strictEqual(engine.getInfo().status, 'error');
      assert.strictEqual(base(storage).prNumber, 12);
      assert.strictEqual(base(storage).sha, 'sha_gone');
      assert.deepStrictEqual(edits(storage), Object.assign({ 4: 'four' }, ENTRY.edits));
    });
  });

  it('with no PR number cached, a merged PR of the branch is not taken for this one', async () => {
    const prs = [{ number: 15, state: 'closed', merged: true, mergeCommitSha: 'mergesha12' }];
    const { engine, gh, storage } = makeEngine(mergedWith(ALL_LANDED, prs), seeded(), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(base(storage).orphaned, true, 'kept and held, like any branch that is simply gone');
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.deepStrictEqual(writes(gh), []);
    assert.deepStrictEqual(mergeReads(gh), []);
  });

  it('a failed PR lookup drops nothing and forgets nothing: the next pull asks again', async () => {
    let answer = Object.assign(new Error('boom'), { status: 500 });
    const { engine, gh, storage, timers } = makeEngine(mergedWith(ALL_LANDED, () => answer), seeded(cachedPr), FACT);
    await engine.attach();
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(base(storage).sha, 'sha_gone');
    assert.strictEqual(base(storage).prNumber, 12, 'the PR number is what finds the merge — keep it');
    assert.strictEqual(engine.getInfo().status, 'pending', 'edits on screen never sit under a hidden chip');
    assert.deepStrictEqual(timers.delays(), []);
    assert.deepStrictEqual(writes(gh), []);
    answer = MERGED;
    await engine.pull(true);
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('a 401 from the PR lookup is a revoked token, reported as one', async () => {
    const denied = Object.assign(new Error('Bad credentials'), { status: 401 });
    const { engine, storage } = makeEngine({ branchGone: true, prs: denied }, seeded(cachedPr), FACT);
    await engine.attach();
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(engine.getInfo().error.kind, 'auth');
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
  });

  it('a merged file that arrives after a push re-created the branch touches nothing', async () => {
    const { engine, gh, storage } = makeEngine(mergedWith(ALL_LANDED), seeded(cachedPr), FACT);
    let release;
    const held = new Promise((r) => { release = r; });
    const realRead = gh.getFileContent;
    gh.getFileContent = async (api, token, path, ref) => {
      if (path === FILE) await held;
      return realRead(api, token, path, ref);
    };
    const pulling = engine.pull(true);
    await settle();
    gh.getFileContent = realRead;                // the push asks for itself, and is answered
    localEdit(storage, 4, 'four');
    engine.notifyEdit();
    await engine.flush();
    const pushed = base(storage);
    assert.deepStrictEqual(pushed.doc[RKEY].edits, { 4: 'four' });
    release();
    await pulling;
    assert.deepStrictEqual(edits(storage), { 4: 'four' });
    assert.deepStrictEqual(base(storage), pushed, 'the base of the push stands');
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
});

describe('dropEditsInFile (what a merged PR leaves of the local edits)', () => {
  const { dropEditsInFile } = require('../site/js/edit_sync');
  const CANON = 'srt_edits_' + TALK + '_video1_uk';
  const LEGACY = 'review_srt_' + TALK + '_video1_en_uk';

  it('drops an edit only where the merged file reads the same at that index', () => {
    const local = { [CANON]: { 0: 'a', 1: 'b2', 2: 'c' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['a', 'b', 'c']), { [CANON]: { 1: 'b2' } });
  });

  it('the same text at another index is not this edit', () => {
    const local = { [CANON]: { 0: 'b', 1: 'a' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['a', 'b']), local);
  });

  it('an index the merged file does not have is kept', () => {
    const local = { [CANON]: { 7: 'a' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['a']), local);
  });

  it('a name every array answers to is not an index', () => {
    const local = { [CANON]: { length: 1, constructor: 'x' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['a']), local);
  });

  it('transcript edits are compared paragraph by paragraph; marks are no file content and stay', () => {
    const local = { [RKEY]: { marks: { 1: 'm' }, edits: { 1: 'p1', 2: 'p2, reworded' } } };
    assert.deepStrictEqual(dropEditsInFile(local, RKEY, ['p0', 'p1', 'p2']),
      { [RKEY]: { marks: { 1: 'm' }, edits: { 2: 'p2, reworded' } } });
  });

  it('an entry left with nothing is gone', () => {
    assert.deepStrictEqual(dropEditsInFile({ [RKEY]: { marks: {}, edits: { 1: 'p1' } } }, RKEY, ['p0', 'p1']), {});
  });

  it('only the named entry is keyed by the file\'s index: row-keyed leftovers are never compared', () => {
    const local = { [CANON]: { 0: 'a' }, [LEGACY]: { marks: {}, edits: { 0: 'a' } } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['a']), { [LEGACY]: { marks: {}, edits: { 0: 'a' } } });
  });

  it('with no file text to compare with, nothing has landed', () => {
    const local = { [CANON]: { 0: 'a' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, null), local);
    assert.deepStrictEqual(dropEditsInFile(local, CANON, []), local);
    assert.deepStrictEqual(dropEditsInFile(local, null, ['a']), local);
  });

  it('does not touch what it was given', () => {
    const local = { [CANON]: { 0: 'a', 1: 'x' } };
    dropEditsInFile(local, CANON, ['a']);
    assert.deepStrictEqual(local, { [CANON]: { 0: 'a', 1: 'x' } });
  });
});

describe('dropEditsInFile compares an edit as the push writes it', () => {
  const { dropEditsInFile } = require('../site/js/edit_sync');
  const { sanitizeInvisible: clean } = require('../site/js/text_sanitize');
  const CANON = 'srt_edits_' + TALK + '_video1_uk';

  it('an edit holding NBSP or zero-width characters has landed once the file reads its cleaned text', () => {
    const local = { [CANON]: { 0: 'one\u00a0two', 1: 'three\u200b', 2: 'fo\u00adur', 3: 'five' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['one two', 'three', 'four', 'FIVE'], clean),
      { [CANON]: { 3: 'five' } });
  });

  it('the file is read the same way: characters the push would strip from it are no difference', () => {
    const local = { [CANON]: { 0: 'one two' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['one\u00a0two'], clean), {});
  });

  it('what the sanitizer leaves alone is still a difference', () => {
    const local = { [CANON]: { 0: 'one  two', 1: 'three ' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['one two', 'three'], clean), local);
  });

  it('with no sanitizer the comparison is the bare one', () => {
    const local = { [CANON]: { 0: 'one\u00a0two', 1: 'b' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['one two', 'b']), { [CANON]: { 0: 'one\u00a0two' } });
  });

  it('a placeholder is told by its own stored text, not by the cleaned one', () => {
    const PH = 'srt_placeholders_' + TALK + '_video1_uk';
    const local = { [CANON]: { 0: 'one\u00a0two' }, [PH]: { 0: 'one\u00a0two' } };
    assert.deepStrictEqual(dropEditsInFile(local, CANON, ['one two'], clean), local);
  });
});

// The whole way round, with the SPA's own builder and parser: what is stored
// -> the file the push builds -> the bytes it sends -> the same file read back
// at the merge commit -> the stored edit is recognised in it.
describe('engine: an edit with invisible characters is recognised in the file its own push wrote', () => {
  const { parseSRT } = require('../site/js/preview_srt_parser');
  const { applyEditsToSrt } = require('../site/js/preview_state');
  const { srtEditsKey, loadSrtEdits } = require('../site/js/edit_store');
  const { sanitizeInvisible: clean } = require('../site/js/text_sanitize');
  const CANON = srtEditsKey(TALK, 'video1', 'uk');
  const tgt = srtSyncTarget(TALK, 'video1', 'uk');
  const BLOCKS = parseSRT('1\n00:00:01,000 --> 00:00:02,000\nнуль\n\n2\n00:00:03,000 --> 00:00:04,000\nодин\n\n'
    + '3\n00:00:05,000 --> 00:00:06,000\nдва\n\n4\n00:00:07,000 --> 00:00:08,000\nтри\n\n');
  // index.html syncFileTexts('srt')
  const srtTexts = (content) => parseSRT(content).map((b) => b.text);
  const STORED = {
    0: 'нуль\u00a0і\u202fще',
    1: '\u200bодин\ufeff, змі\u00adнено',
    3: 'три, без невидимого',
  };

  function wired(over, storageInit) {
    const h = makeEngine(over, storageInit, {
      target: tgt.slug, entryFilter: tgt.filter, filePath: tgt.filePath, editsKey: tgt.editsKey,
      parseFile: srtTexts, sanitize: clean,
      buildFiles: () => [{ path: tgt.filePath,
        content: applyEditsToSrt(BLOCKS, loadSrtEdits(TALK, 'video1', 'uk', h.storage)) }],
    });
    return h;
  }
  const dump = (storage) => {
    const out = {};
    for (let i = 0; i < storage.length; i++) out[storage.key(i)] = storage.getItem(storage.key(i));
    return out;
  };

  it('stored edit -> built file -> sanitized push -> parsed merge commit: every edit has landed', async () => {
    const first = wired(undefined, { [CANON]: JSON.stringify(STORED) });
    let pushedFile = null;
    const put = first.gh.putFile;
    first.gh.putFile = async (api, token, opts) => {
      if (opts.path === tgt.filePath) pushedFile = opts.content;
      return put(api, token, opts);
    };
    first.engine.notifyEdit();
    await first.engine.flush();
    assert.ok(pushedFile, 'the SRT was pushed');
    assert.ok(!/[\u00a0\u202f\u200b\ufeff\u00ad]/.test(pushedFile), 'the push sends no invisible characters');
    assert.deepStrictEqual(JSON.parse(first.storage.getItem(CANON)), STORED, 'the store still holds them');

    // The PR merges exactly what was pushed; the branch is deleted.
    const later = wired({ branchGone: true,
      prs: [{ number: 77, state: 'closed', merged: true, mergeCommitSha: 'merge77' }],
      commits: { merge77: { [tgt.filePath]: pushedFile } } }, dump(first.storage));
    await later.engine.attach();
    assert.strictEqual(later.storage.getItem(CANON), null, 'every edit is in the merged file');
    assert.strictEqual(later.engine.getInfo().status, 'idle');
  });
});

// A base can say "submitted" (prDraft === false) for a PR that
// has since been merged or closed: GitHub then refuses the conversion back to
// draft, before anything is pushed. That answer is the same news a push to a
// deleted branch brings, and takes the same road.
describe('engine: the re-draft finds its PR closed', () => {
  const ENTRY = { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three' } };
  const WITH_NEW = { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three', 4: 'four' } };
  const FILE = 'talks/' + TALK + '/transcript_uk.txt';
  const FACT = { filePath: FILE, editsKey: RKEY, parseFile: (content) => content.split('\n') };
  const REFUSED = 'Pull request is closed';
  const MERGED = [{ number: 12, state: 'closed', merged: true, mergeCommitSha: 'mergesha12' }];
  const CLOSED = [{ number: 12, state: 'closed', merged: false, mergeCommitSha: null }];
  const OPEN = [{ number: 12, state: 'open', merged: false, mergeCommitSha: null }];
  const WRITES = ['createRef', 'putFile', 'createPull'];
  const writes = (gh) => gh.calls.filter((c) => WRITES.includes(c[0])).map((c) => c[0]);
  const base = (storage) => JSON.parse(storage.getItem(syncBaseKey(TALK)));
  const edits = (storage) => JSON.parse(storage.getItem(RKEY)).edits;
  const mergeReads = (gh) => gh.calls.filter((c) => c[0] === 'getFileContent' && c[1] === FILE);
  const converts = (gh) => gh.calls.filter((c) => c[0] === 'convertPullToDraft').length;
  function submitted(metaOver, localEntry) {
    return {
      [RKEY]: JSON.stringify(localEntry || WITH_NEW),
      [syncBaseKey(TALK)]: JSON.stringify(Object.assign({
        doc: { [RKEY]: ENTRY }, sha: 'sha_base', revision: 3,
        prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', prDraft: false,
        fileShas: {}, branch: BRANCH_NAME,
      }, metaOver || {})),
    };
  }
  const merged = (fileAtMerge, more) => Object.assign({ branchGone: true, draftFails: REFUSED, prs: MERGED,
    commits: { mergesha12: { [FILE]: fileAtMerge } } }, more || {});

  it('merged: the flush is not left in error — what landed goes, the rest opens a fresh PR', async () => {
    const { engine, gh, storage, timers } = makeEngine(merged('zero\none\ntwo\nthree'), submitted(), FACT);
    await engine.attach();
    timers.fire(15000);
    await settle();
    assert.strictEqual(converts(gh), 1, 'asked once, and not again after the answer');
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.deepStrictEqual(edits(storage), { 4: 'four' });
    assert.deepStrictEqual(writes(gh), ['createRef', 'putFile', 'createPull']);
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 4: 'four' });
    assert.strictEqual(engine.getInfo().prNumber, 77);
    assert.deepStrictEqual(mergeReads(gh), [['getFileContent', FILE, 'mergesha12']]);
  });

  it('merged: the pull after a refused flush does not re-arm the same failing flush for ever', async () => {
    const { engine, gh, timers } = makeEngine(merged('zero\none\ntwo\nthree'), submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    await engine.pull(true);
    timers.fire(15000);
    await settle();
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(converts(gh), 1);
  });

  it('merged: every edit the merged file does not hold is kept', async () => {
    const { engine, gh, storage } = makeEngine(merged('zero\none\nTWO, as main has it\nthree'), submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(edits(storage), { 2: 'two', 4: 'four' });
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 2: 'two', 4: 'four' });
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('merged, and the unpushed edit landed too: nothing is left, and no PR is opened for nothing', async () => {
    const { engine, gh, storage } = makeEngine(merged('zero\none\ntwo\nthree\nfour'), submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(storage.getItem(RKEY), null);
    assert.deepStrictEqual(writes(gh), []);
    assert.strictEqual(engine.getInfo().status, 'idle');
    assert.strictEqual(engine.getInfo().prNumber, null);
  });

  it('merged, but the merged file cannot be read: nothing is pushed on a guess, nothing forgotten', async () => {
    const boom = Object.assign(new Error('boom'), { status: 502 });
    const { engine, gh, storage } = makeEngine(merged(boom), submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(writes(gh), []);
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(base(storage).prNumber, 12);
    assert.strictEqual(base(storage).sha, 'sha_base');
    assert.deepStrictEqual(edits(storage), WITH_NEW.edits);
  });

  it('closed without a merge, its branch left behind: every edit is kept and goes to a fresh PR', async () => {
    const { engine, gh, storage } = makeEngine(
      { draftFails: REFUSED, prs: CLOSED, remote: remoteDoc(ENTRY.edits, 3, 'sha_base') }, submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.deepStrictEqual(edits(storage), WITH_NEW.edits);
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, WITH_NEW.edits);
    assert.deepStrictEqual(writes(gh), ['putFile', 'createPull'], 'the branch is there; only the PR is new');
    assert.strictEqual(engine.getInfo().prNumber, 77);
    assert.strictEqual(engine.getInfo().prDraft, true);
    assert.deepStrictEqual(mergeReads(gh), [], 'nothing merged, nothing to read');
  });

  it('a later PR of the same branch means ours is closed: the live one is adopted, no merge is read', async () => {
    // One head can hold one open PR, so a higher number says ours is not it —
    // even when the list does not reach back to ours.
    const prs = [{ number: 15, state: 'open', merged: false, mergeCommitSha: null }];
    const { engine, gh, storage } = makeEngine({
      draftFails: REFUSED, prs, remote: remoteDoc(ENTRY.edits, 3, 'sha_base'),
      commits: { mergesha12: { [FILE]: 'zero\none\ntwo\nthree' } },
      pullFails: [{ status: 422, message: 'A pull request already exists for sy-tools:' + BRANCH_NAME }],
      existingPr: { number: 15, html_url: 'https://github.com/x/pull/15', node_id: 'PR_n15', draft: true },
    }, submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(engine.getInfo().prNumber, 15);
    assert.strictEqual(engine.getInfo().nodeId, 'PR_n15');
    assert.deepStrictEqual(edits(storage), WITH_NEW.edits, 'the state held is #15\'s, which has not merged');
    assert.deepStrictEqual(mergeReads(gh), []);
  });

  it('refused although the PR is open: an error like any other — nothing is reset, nothing pushed', async () => {
    const { engine, gh, storage } = makeEngine(
      { draftFails: 'Something went wrong', prs: OPEN, remote: remoteDoc(ENTRY.edits, 3, 'sha_base') },
      submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(engine.getInfo().error.message, 'Something went wrong');
    assert.deepStrictEqual(writes(gh), []);
    assert.deepStrictEqual(base(storage).doc, { [RKEY]: ENTRY });
    assert.strictEqual(base(storage).prNumber, 12);
    assert.deepStrictEqual(edits(storage), WITH_NEW.edits);
  });

  it('refused, and what became of the PR cannot be learned: the refusal is reported, nothing is reset', async () => {
    const boom = Object.assign(new Error('boom'), { status: 500 });
    const { engine, gh, storage } = makeEngine({ branchGone: true, draftFails: REFUSED, prs: boom }, submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.strictEqual(engine.getInfo().error.message, REFUSED);
    assert.deepStrictEqual(writes(gh), []);
    assert.strictEqual(base(storage).prNumber, 12);
    assert.deepStrictEqual(edits(storage), WITH_NEW.edits);
  });

  it('an engine that cannot ask about its PR reports the refusal as before', async () => {
    const { engine, gh, storage } = makeEngine({ branchGone: true, draftFails: REFUSED }, submitted(), FACT);
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'error');
    assert.deepStrictEqual(writes(gh), []);
    assert.deepStrictEqual(edits(storage), WITH_NEW.edits);
  });

  it('with nothing typed since, a merged PR is met by the pull, which opens no PR for what stays', async () => {
    const { engine, gh, storage, timers } = makeEngine(merged('zero\none\nTWO, as main has it\nthree'),
      submitted(null, ENTRY), FACT);
    await engine.attach();
    timers.fire(60000);
    await settle();
    assert.deepStrictEqual(edits(storage), { 2: 'two' });
    assert.strictEqual(base(storage).orphaned, true);
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.deepStrictEqual(writes(gh), []);
    assert.strictEqual(converts(gh), 0);
  });
});

// The sync branch name is deterministic, so a state file can be
// one that was created anew — after a merge or a teardown deleted the branch,
// or after a finalize removed the file — by a device that never held what this
// one has as its base. What such a file lacks, nobody deleted.
// The state file's revision tells the two apart: every push that builds on a
// file writes a higher revision than that file had (the blob sha is the lock),
// so a file whose revision is not above our base's was not built on it.
describe('engine: a state file that was not built on our base', () => {
  const ENTRY = { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three' } };
  const base = (storage) => JSON.parse(storage.getItem(syncBaseKey(TALK)));
  const edits = (storage) => JSON.parse(storage.getItem(RKEY)).edits;
  function synced(metaOver, localEntry) {
    return {
      [RKEY]: JSON.stringify(localEntry || ENTRY),
      [syncBaseKey(TALK)]: JSON.stringify(Object.assign({
        doc: { [RKEY]: ENTRY }, sha: 'sha_base', revision: 5,
        prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', prDraft: true,
        fileShas: {}, branch: BRANCH_NAME,
      }, metaOver || {})),
    };
  }

  it('pull: a re-created branch deletes none of the edits it never held', async () => {
    const { engine, gh, storage, timers } = makeEngine({ remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new') }, synced());
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one', 2: 'two', 3: 'three', 7: 'seven' });
    assert.strictEqual(base(storage).sha, 'sha_new');
    assert.strictEqual(engine.getInfo().status, 'pending', 'the new branch has yet to receive them');
    timers.fire(15000);
    await settle();
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 1: 'one', 2: 'two', 3: 'three', 7: 'seven' });
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createPull').length, 0, 'into the PR that is there');
  });

  it('pull: a file at the very revision of our base, under another sha, is not its successor either', async () => {
    const { engine, storage } = makeEngine({ remote: remoteDoc({ 7: 'seven' }, 5, 'sha_new') }, synced());
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one', 2: 'two', 3: 'three', 7: 'seven' });
  });

  it('pull: a file built on our base still deletes — the other device held the edit and removed it', async () => {
    const { engine, gh, storage, timers } = makeEngine(
      { remote: remoteDoc({ 1: 'one', 7: 'seven' }, 6, 'sha_next') }, synced());
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one', 7: 'seven' });
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.deepStrictEqual(timers.delays(), []);
    assert.strictEqual(gh.puts.length, 0);
  });

  it('once a re-created file is adopted, deletions made on top of it propagate again', async () => {
    // Our counter (5) is above the new file's (1), and stays there until we
    // push. The next push of the other device is revision 2: below our
    // counter, and all the same built on the file we now hold.
    let live = remoteDoc({ 7: 'seven' }, 1, 'sha_new');
    const { engine, storage } = makeEngine({ remote: () => live }, synced());
    await engine.pull(true);
    assert.strictEqual(base(storage).baseRevision, 1, 'the revision of the file held, not our counter');
    assert.strictEqual(base(storage).revision, 5);
    live = remoteDoc({ 1: 'one', 2: 'two', 3: 'three' }, 2, 'sha_new2');
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one', 2: 'two', 3: 'three' }, 'edit 7 was removed there');
  });

  it('our own push is a base too: a deletion built on it propagates', async () => {
    const { engine, gh, storage } = makeEngine({}, synced({ sha: null, doc: {}, revision: 0, prNumber: null }));
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(base(storage).baseRevision, 1);
    gh._stateFile = remoteDoc({ 1: 'one' }, 2, 'sha_other');
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one' });
  });

  it('once we have pushed, the pushed file is the base: a file not above its revision is no successor', async () => {
    let live = remoteDoc({ 7: 'seven' }, 1, 'sha_new');
    const { engine, gh, storage, timers } = makeEngine({ remote: () => live }, synced());
    await engine.pull(true);
    timers.fire(15000);
    await settle();
    assert.strictEqual(gh.puts.at(-1).revision, 6);
    assert.strictEqual(base(storage).baseRevision, 6);
    live = remoteDoc({ 9: 'nine' }, 3, 'sha_newer');
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one', 2: 'two', 3: 'three', 7: 'seven', 9: 'nine' });
  });

  it('finalized here, the state file re-created elsewhere: the edits of the submitted PR are not deleted', async () => {
    // A finalize removes the state file; the base keeps the doc and no sha.
    const { engine, storage } = makeEngine({ remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new') },
      synced({ sha: null, baseRevision: 5, prDraft: false }));
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one', 2: 'two', 3: 'three', 7: 'seven' });
  });

  it('finalize keeps the revision of the file it removed, to judge the next one by', async () => {
    const { engine, gh, storage } = makeEngine();
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    await engine.finalize();
    assert.strictEqual(base(storage).sha, null);
    assert.strictEqual(base(storage).baseRevision, 1);
    gh._stateFile = remoteDoc({ 7: 'seven' }, 1, 'sha_new');
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'x', 7: 'seven' });
  });

  it('push: a write that collides with a re-created file merges the same way', async () => {
    const init = synced(null, { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three', 4: 'four' } });
    const { engine, gh, storage } = makeEngine(
      { remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new'), putFails: [{ status: 409 }] }, init);
    engine.notifyEdit();
    await engine.flush();
    const all = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 7: 'seven' };
    assert.deepStrictEqual(edits(storage), all);
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, all);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });

  it('a state file that cannot be parsed deletes nothing', async () => {
    const { engine, storage } = makeEngine({ remote: { content: 'not json', sha: 'sha_junk' } }, synced());
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
  });

  // The PR coordinates in the base are those of the branch that was. A branch
  // created anew has a PR of its own.
  const NEW_PR = { number: 15, html_url: 'https://github.com/x/pull/15', node_id: 'PR_n15', draft: true };

  it('pull: the PR of the re-created branch replaces the one the base named', async () => {
    const chip = [];
    const { engine, storage } = makeEngine(
      { remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new'), existingPr: NEW_PR }, synced({ prDraft: false }),
      { onStatus: (status, info) => chip.push([status, info.prNumber]) });
    await engine.pull(true);
    const info = engine.getInfo();
    assert.deepStrictEqual([info.prNumber, info.prUrl, info.nodeId, info.prDraft],
      [15, 'https://github.com/x/pull/15', 'PR_n15', true]);
    assert.strictEqual(base(storage).prNumber, 15);
    assert.deepStrictEqual(chip.at(-1), ['pending', 15], 'the chip is told of its new link, and keeps its tone');
  });

  it('pull: no open PR on the re-created branch — the coordinates stay as they were', async () => {
    const { engine } = makeEngine({ remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new') }, synced());
    await engine.pull(true);
    assert.strictEqual(engine.getInfo().prNumber, 12);
  });

  it('pull: a failed PR lookup costs nothing — the merge stands', async () => {
    const { engine, gh, storage } = makeEngine({ remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new') }, synced());
    gh.findOpenPrByHead = async () => { throw Object.assign(new Error('boom'), { status: 500 }); };
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), { 1: 'one', 2: 'two', 3: 'three', 7: 'seven' });
    assert.strictEqual(engine.getInfo().prNumber, 12);
    assert.strictEqual(engine.getInfo().status, 'pending');
  });

  it('push: a failed PR lookup does not fail a push that went through', async () => {
    const init = synced(null, { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three', 4: 'four' } });
    const { engine, gh } = makeEngine(
      { remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new'), putFails: [{ status: 409 }] }, init);
    gh.findOpenPrByHead = async () => { throw Object.assign(new Error('boom'), { status: 500 }); };
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(engine.getInfo().prNumber, 12);
  });

  it('pull: a file built on our base asks nothing about the PR', async () => {
    const { engine, gh } = makeEngine(
      { remote: remoteDoc({ 1: 'one', 7: 'seven' }, 6, 'sha_next'), existingPr: NEW_PR }, synced());
    await engine.pull(true);
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'findOpenPrByHead').length, 0);
    assert.strictEqual(engine.getInfo().prNumber, 12);
  });

  it('push: colliding with a re-created file, the push ends attached to that branch\'s PR', async () => {
    const init = synced(null, { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three', 4: 'four' } });
    const { engine, gh } = makeEngine(
      { remote: remoteDoc({ 7: 'seven' }, 1, 'sha_new'), putFails: [{ status: 409 }], existingPr: NEW_PR }, init);
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().prNumber, 15);
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createPull').length, 0);
  });
});

// "Our PR is open" beside "its branch is gone", or a list
// that does not hold our PR, is retried on every pull. An answer that never
// comes must not hold the device for ever.
describe('engine: an unsettled PR answer is not waited on for ever', () => {
  const ENTRY = { marks: {}, edits: { 1: 'one', 2: 'two', 3: 'three' } };
  const FILE = 'talks/' + TALK + '/transcript_uk.txt';
  const FACT = { filePath: FILE, editsKey: RKEY, parseFile: (content) => content.split('\n') };
  const OPEN = [{ number: 12, state: 'open', merged: false, mergeCommitSha: null }];
  const MERGED = [{ number: 12, state: 'closed', merged: true, mergeCommitSha: 'mergesha12' }];
  const MIN = 60 * 1000;
  const T0 = 1770000000000;
  const base = (storage) => JSON.parse(storage.getItem(syncBaseKey(TALK)));
  const edits = (storage) => JSON.parse(storage.getItem(RKEY)).edits;
  function seeded() {
    return {
      [RKEY]: JSON.stringify(ENTRY),
      [syncBaseKey(TALK)]: JSON.stringify({
        doc: { [RKEY]: ENTRY }, sha: 'sha_gone', revision: 3,
        prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', prDraft: true,
        fileShas: {}, branch: BRANCH_NAME,
      }),
    };
  }
  function make(prs) {
    let clock = T0;
    const made = makeEngine({ branchGone: true, prs, commits: { mergesha12: { [FILE]: 'zero\none\ntwo\nthree' } } },
      seeded(), Object.assign({ now: () => clock }, FACT));
    made.advance = (ms) => { clock += ms; };
    return made;
  }

  it('past the wait it is taken for "not merged": every edit is kept, held back, and nothing is pushed', async () => {
    const { engine, gh, storage, timers, advance } = make(OPEN);
    await engine.pull(true);
    advance(4 * MIN);
    await engine.pull(true);
    assert.strictEqual(base(storage).prNumber, 12, 'still asking');
    assert.strictEqual(base(storage).orphaned, undefined);
    advance(2 * MIN);
    await engine.pull(true);
    assert.deepStrictEqual(edits(storage), ENTRY.edits);
    assert.strictEqual(base(storage).orphaned, true);
    assert.strictEqual(base(storage).sha, null);
    assert.strictEqual(base(storage).prNumber, null);
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.deepStrictEqual(timers.delays(), []);
    assert.strictEqual(gh.calls.filter((c) => ['createRef', 'putFile', 'createPull'].includes(c[0])).length, 0);
  });

  it('the wait survives a reload', async () => {
    const first = make(OPEN);
    await first.engine.pull(true);
    await first.engine.destroy();
    const { engine } = makeEngine({ branchGone: true, prs: OPEN }, {},
      Object.assign({ now: () => T0 + 6 * MIN, storage: first.storage }, FACT));
    await engine.pull(true);
    assert.strictEqual(base(first.storage).orphaned, true);
  });

  it('an answer that settles within the wait is acted on as ever', async () => {
    let answer = OPEN;
    const { engine, storage, advance } = make(() => answer);
    await engine.pull(true);
    advance(2 * MIN);
    answer = MERGED;
    await engine.pull(true);
    assert.strictEqual(storage.getItem(RKEY), null, 'the landed edits go');
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('a lookup that fails outright is not an unsettled answer: it is asked again, however long', async () => {
    const boom = Object.assign(new Error('boom'), { status: 500 });
    const { engine, storage, advance } = make(boom);
    await engine.pull(true);
    advance(60 * MIN);
    await engine.pull(true);
    assert.strictEqual(base(storage).prNumber, 12);
    assert.strictEqual(base(storage).orphaned, undefined);
  });

  it('a base that moves on ends the wait: a later unsettled answer starts its own', async () => {
    const waited = (over) => Object.assign(seeded(), { [syncBaseKey(TALK)]: JSON.stringify(Object.assign(
      JSON.parse(seeded()[syncBaseKey(TALK)]), { unsettledSince: T0 - 10 * MIN }, over || {})) });
    const pulled = makeEngine({ remote: remoteDoc(ENTRY.edits, 4, 'sha_back') }, waited());
    await pulled.engine.pull(true);
    assert.strictEqual(base(pulled.storage).unsettledSince, undefined, 'a state file fetched and merged');
    const pushed = makeEngine({}, waited());
    localEdit(pushed.storage, 4, 'four');
    pushed.engine.notifyEdit();
    await pushed.engine.flush();
    assert.strictEqual(pushed.engine.getInfo().status, 'synced');
    assert.strictEqual(base(pushed.storage).unsettledSince, undefined, 'a state file pushed');
  });

  it('a clock set back does not stretch the wait without bound', async () => {
    const { engine, storage, advance } = make(OPEN);
    await engine.pull(true);
    advance(-60 * MIN);
    await engine.pull(true);                     // the stamp is in the future: started over
    assert.strictEqual(base(storage).prNumber, 12);
    advance(6 * MIN);
    await engine.pull(true);
    assert.strictEqual(base(storage).orphaned, true);
  });
});

describe('engine: self-heal on an externally deleted branch', () => {
  // Seeds a "synced" base pointing at a PR whose branch was deleted out of band
  // (PR closed + branch deleted on github.com, or a teardown on another device).
  function seededSynced() {
    return {
      [syncBaseKey(TALK)]: JSON.stringify({
        doc: {}, sha: 'oldsha', revision: 1,
        prNumber: 77, prUrl: 'https://github.com/x/pull/77', nodeId: 'PR_n77',
        prDraft: true, fileShas: {}, branch: BRANCH_NAME,
      }),
    };
  }

  it('re-creates the branch + a fresh PR when a push hits "Branch not found"', async () => {
    const { engine, gh, storage } = makeEngine({ branchGone: true }, seededSynced());
    localEdit(storage, 1, 'again');
    engine.notifyEdit();
    await engine.flush();

    const info = engine.getInfo();
    assert.strictEqual(info.status, 'synced', 'heals to synced, not error');
    assert.strictEqual(info.prNumber, 77, 'a fresh PR was created');
    assert.ok(gh.calls.some((c) => c[0] === 'createRef'), 'branch was re-created');
    assert.ok(gh.calls.some((c) => c[0] === 'createPull'), 'a new PR was opened');
    assert.strictEqual(gh.puts.at(-1).entries[RKEY].edits[1], 'again', 'the edit reached the branch');
    const base = JSON.parse(storage.getItem(syncBaseKey(TALK)));
    assert.strictEqual(base.sha !== null && base.sha !== 'oldsha', true, 'base advanced to the new state');
  });

  it('surfaces an error (no infinite loop) if the branch stays gone after re-create', async () => {
    const { engine, gh, storage } = makeEngine({ branchGone: true, branchStaysGone: true }, seededSynced());
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(engine.getInfo().status, 'error', 'one retry then surfaces the error');
    // Exactly one heal attempt: createRef is tried once, never in a loop.
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createRef').length, 1);
  });
});

describe('engine: real-file commits', () => {
  it('pushes the rebuilt real file alongside the state file', async () => {
    const files = [{ path: 'talks/' + TALK + '/transcript_uk.txt', content: 'ПОВНИЙ ФАЙЛ' }];
    const { engine, gh, storage } = makeEngine({}, null, { buildFiles: () => files });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    const filePuts = gh.calls.filter((c) => c[0] === 'putFile' && c[1] === files[0].path);
    assert.strictEqual(filePuts.length, 1);
    // the blob sha for the real file was looked up on the sync branch
    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'getFileSha'),
      ['getFileSha', files[0].path, BRANCH_NAME]);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
  it('caches the real file sha across pushes', async () => {
    const files = [{ path: 'talks/' + TALK + '/transcript_uk.txt', content: 'V1' }];
    const { engine, gh, storage } = makeEngine({}, null, { buildFiles: () => files });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    localEdit(storage, 1, 'y');
    files[0].content = 'V2';
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'getFileSha').length, 1);
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'putFile' && c[1] === files[0].path).length, 2);
  });
});

describe('engine: only the target\'s own file is committed', () => {
  const FILE = 'talks/' + TALK + '/transcript_uk.txt';
  const OTHER = 'talks/' + TALK + '/video1/final/uk.srt';
  const putsOf = (gh, path) => gh.calls.filter((c) => c[0] === 'putFile' && c[1] === path);

  it('a file built for another target is not pushed', async () => {
    const { engine, gh, storage } = makeEngine({}, null,
      { buildFiles: () => [{ path: OTHER, content: 'ANOTHER VIEW' }], filePath: FILE });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(putsOf(gh, OTHER), [], 'another target\'s file does not belong on this branch');
    assert.strictEqual(gh.puts.length, 1, 'the state file still goes up');
  });

  it('the target\'s own file, built beside a foreign one, is the only one pushed', async () => {
    const { engine, gh, storage } = makeEngine({}, null, {
      buildFiles: () => [{ path: OTHER, content: 'ANOTHER VIEW' }, { path: FILE, content: 'WHOLE FILE' }],
      filePath: FILE,
    });
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(putsOf(gh, FILE).length, 1);
    assert.deepStrictEqual(putsOf(gh, OTHER), []);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
});

describe('engine: a state file that went up without its file', () => {
  // The PR merges the files, not the state file, so what landed is read off
  // the merged file. What this device believes it pushed is not consulted.
  const FILE = 'talks/' + TALK + '/transcript_uk.txt';
  const FACT = { filePath: FILE, editsKey: RKEY, parseFile: (content) => content.split('\n') };
  const base = (storage) => JSON.parse(storage.getItem(syncBaseKey(TALK)));

  async function reopenedAfterMerge(storage, fileAtMerge) {
    const prs = [{ number: 77, state: 'closed', merged: true, mergeCommitSha: 'mergesha77' }];
    const later = makeEngine({ branchGone: true, prs, commits: { mergesha77: { [FILE]: fileAtMerge } } }, {},
      Object.assign({ storage }, FACT));
    await later.engine.attach();
    return later;
  }

  it('the file PUT failed, the PR merged without the edit: the edit stays on the device', async () => {
    const first = makeEngine({ putFails: [null, { status: 502, message: 'Bad Gateway' }] }, null,
      Object.assign({ buildFiles: () => [{ path: FILE, content: 'p0\nx' }] }, FACT));
    localEdit(first.storage, 1, 'x');
    first.engine.notifyEdit();
    await first.engine.flush();
    assert.strictEqual(first.engine.getInfo().status, 'error');
    assert.deepStrictEqual(base(first.storage).doc[RKEY].edits, { 1: 'x' }, 'the state file did go up');
    await first.engine.destroy();

    const { engine } = await reopenedAfterMerge(first.storage, 'p0\np1');
    assert.deepStrictEqual(JSON.parse(first.storage.getItem(RKEY)).edits, { 1: 'x' });
    assert.strictEqual(engine.getInfo().status, 'pending');
    assert.strictEqual(base(first.storage).orphaned, true);
  });

  it('the file did go up and merged: the edit is cleared', async () => {
    const first = makeEngine({}, null, Object.assign({ buildFiles: () => [{ path: FILE, content: 'p0\nx' }] }, FACT));
    localEdit(first.storage, 1, 'x');
    first.engine.notifyEdit();
    await first.engine.flush();
    await first.engine.destroy();
    await reopenedAfterMerge(first.storage, 'p0\nx');
    assert.strictEqual(first.storage.getItem(RKEY), null);
  });

  it('an edit only ever adopted from another device is cleared by the same reading', async () => {
    const OPEN_PR = { number: 77, html_url: 'https://github.com/x/pull/77', node_id: 'PR_n77', draft: true };
    const first = makeEngine({ remote: remoteDoc({ 4: 'theirs' }), existingPr: OPEN_PR }, null, FACT);
    await first.engine.attach();
    assert.deepStrictEqual(JSON.parse(first.storage.getItem(RKEY)).edits, { 4: 'theirs' });
    await first.engine.destroy();
    await reopenedAfterMerge(first.storage, 'p0\np1\np2\np3\ntheirs');
    assert.strictEqual(first.storage.getItem(RKEY), null);
  });

  it('the base keeps no record of which files this device pushed', async () => {
    const { engine, storage } = makeEngine({}, null,
      Object.assign({ buildFiles: () => [{ path: FILE, content: 'p0\nx' }] }, FACT));
    localEdit(storage, 1, 'x');
    engine.notifyEdit();
    await engine.flush();
    assert.deepStrictEqual(Object.keys(base(storage)).sort(),
      ['baseRevision', 'branch', 'doc', 'fileShas', 'nodeId', 'prDraft', 'prNumber', 'prUrl', 'revision', 'sha']);
  });
});

describe('engine: finalize + re-draft lifecycle', () => {
  async function bootstrapped(over, engineOver) {
    const made = makeEngine(over, null, engineOver);
    localEdit(made.storage, 1, 'x');
    made.engine.notifyEdit();
    await made.engine.flush();
    return made;
  }
  it('finalize deletes the state file, flips ready and reports the PR', async () => {
    const { engine, gh } = await bootstrapped();
    const pr = await engine.finalize();
    assert.deepStrictEqual(pr, { number: 77, html_url: 'https://github.com/x/pull/77' });
    const del = gh.calls.find((c) => c[0] === 'deleteFile');
    assert.ok(del && del[1] === syncFilePath(TALK) && del[2] === BRANCH_NAME);
    assert.deepStrictEqual(gh.calls.find((c) => c[0] === 'markPullReady'), ['markPullReady', 'PR_n77']);
    const info = engine.getInfo();
    assert.strictEqual(info.status, 'ready');
    assert.strictEqual(info.prDraft, false);
  });
  it('finalize flushes pending edits first', async () => {
    const { engine, gh, storage } = await bootstrapped();
    localEdit(storage, 2, 'останнє');
    engine.notifyEdit();
    await engine.finalize();
    assert.strictEqual(gh.puts.length, 2);
    assert.ok(JSON.stringify(gh.puts[1]).includes('останнє'));
    const seq = gh.calls.map((c) => c[0]);
    assert.ok(seq.indexOf('deleteFile') > seq.lastIndexOf('putFile'), 'delete follows the last push');
  });
  it('announces syncing before the work, so the chip fills the wait', async () => {
    // Finalize is 3-4 sequential calls fired from a dropdown item that closes
    // itself. Without this the chip kept its old tone the whole time and the
    // click looked like it did nothing.
    const { engine, statuses } = await bootstrapped();
    statuses.length = 0;
    const p = engine.finalize();
    assert.strictEqual(statuses[0], 'syncing', 'emitted before the first await');
    await p;
    assert.strictEqual(statuses[statuses.length - 1], 'ready');
  });
  it('restores the previous status when finalize fails, never a stuck spinner', async () => {
    const { engine, statuses } = await bootstrapped({ readyFails: true });
    assert.strictEqual(engine.getInfo().status, 'synced');
    statuses.length = 0;
    await assert.rejects(engine.finalize(), /graphql down/);
    assert.strictEqual(engine.getInfo().status, 'synced', 'not left on syncing');
    assert.strictEqual(statuses[statuses.length - 1], 'synced');
  });
  it('a pull landing mid-finalize neither repaints the chip nor eats the restore', async () => {
    // focus / visibilitychange fire pull(), and tabbing away to GitHub during
    // finalize is the likeliest thing a user does here. Unguarded, pull writes
    // 'synced' over the progress tone, and the failure restore then sees a
    // status it does not recognise and says nothing — leaving the chip claiming
    // "synced" for a PR that was never finalized.
    const { engine, statuses } = await bootstrapped({ readyFails: true });
    const p = engine.finalize();
    statuses.length = 0;
    await engine.pull(true);
    assert.deepStrictEqual(statuses, [], 'the pull repainted nothing');
    assert.strictEqual(engine.getInfo().status, 'syncing');
    await assert.rejects(p, /graphql down/);
    assert.strictEqual(engine.getInfo().status, 'synced');
  });
  it('restores pending, not synced, when an edit landed while finalize ran', async () => {
    const { engine, storage } = await bootstrapped({ readyFails: true });
    const p = engine.finalize();
    localEdit(storage, 2, 'нове');
    engine.notifyEdit();
    await assert.rejects(p, /graphql down/);
    assert.strictEqual(engine.getInfo().status, 'pending', 'an unflushed edit is not "synced"');
  });
  it('keeps the progress tone across its own pre-flush', async () => {
    // finalize()'s comment claims it owns the chip while it runs. Its own
    // flush writes 'synced' — a green "done" flashing three requests before
    // the work is actually done.
    const { engine, statuses, storage } = await bootstrapped();
    localEdit(storage, 2, 'нове');
    engine.notifyEdit();
    statuses.length = 0;
    await engine.finalize();
    assert.ok(!statuses.slice(0, -1).includes('synced'),
      `no 'synced' before the end, got ${JSON.stringify(statuses)}`);
    assert.strictEqual(statuses[statuses.length - 1], 'ready');
  });

  it('restores a state that is true NOW, not the one it snapshotted', async () => {
    // The pre-flush pushes everything and moves the status on; restoring the
    // status from before it means the chip says "pending" for a talk with
    // nothing pending, and no debounce will ever clear it (dirty is false).
    const { engine, storage } = await bootstrapped({ readyFails: true });
    localEdit(storage, 2, 'нове');
    engine.notifyEdit();
    assert.strictEqual(engine.getInfo().status, 'pending');
    await assert.rejects(engine.finalize(), /graphql down/);
    const inf = engine.getInfo();
    assert.strictEqual(inf.dirty, false, 'the pre-flush pushed it');
    assert.strictEqual(inf.status, 'synced', 'so "pending" would be a lie');
  });

  it('never restores a transient syncing — the chip would spin forever', async () => {
    const { engine, gh, storage } = await bootstrapped({ readyFails: true });
    localEdit(storage, 2, 'нове');
    engine.notifyEdit();
    const inFlight = engine.flush();          // status -> 'syncing'
    assert.strictEqual(engine.getInfo().status, 'syncing');
    const p = engine.finalize();
    await inFlight;
    await assert.rejects(p, /graphql down/);
    assert.notStrictEqual(engine.getInfo().status, 'syncing');
    assert.ok(gh.calls.length > 0);
  });

  it('leaves an error the flush surfaced instead of painting over it', async () => {
    const { engine, storage } = await bootstrapped({
      // null = let the bootstrap push through; the finalize pre-flush is the
      // second put, and that is the one that fails.
      putFails: [null, { status: 500, message: 'Server error' }],
      readyFails: true,
    });
    localEdit(storage, 2, 'нове');
    engine.notifyEdit();
    await assert.rejects(engine.finalize(), /graphql down/);
    const inf = engine.getInfo();
    assert.strictEqual(inf.status, 'error', 'the push really did fail');
    assert.ok(inf.error && inf.error.message, 'and still says why');
  });

  it('stays quiet after destroy when the finalize chain SUCCEEDS', async () => {
    // The failure tail guards on `disposed`; the success tail eight lines
    // above did not, so a talk left mid-finalize painted the next talk's chip.
    const { engine, statuses } = await bootstrapped();
    const p = engine.finalize();
    await engine.destroy();
    statuses.length = 0;
    await p;
    assert.deepStrictEqual(statuses, []);
  });

  it('refuses a second finalize while one is already running', async () => {
    const { engine } = await bootstrapped();
    const first = engine.finalize();
    await assert.rejects(engine.finalize(), /already finalizing/);
    await first;
  });

  it('stays quiet after destroy when the finalize chain then fails', async () => {
    // Same contract every other tail in this engine honours: once destroyed,
    // no more status emissions — the chip belongs to whatever view is up now.
    const { engine, statuses } = await bootstrapped({ readyFails: true });
    const p = engine.finalize();
    await engine.destroy();
    statuses.length = 0;
    await assert.rejects(p, /graphql down/);
    assert.deepStrictEqual(statuses, []);
  });
  it('the first edit after finalize re-drafts the PR and recreates the state', async () => {
    const { engine, gh, storage } = await bootstrapped();
    await engine.finalize();
    localEdit(storage, 2, 'нове');
    engine.notifyEdit();
    await engine.flush();
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'convertPullToDraft').length, 1);
    assert.strictEqual(gh.puts.length, 2); // state file re-created
    const info = engine.getInfo();
    assert.strictEqual(info.prDraft, true);
    assert.strictEqual(info.status, 'synced');
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
  it('drops a response whose GET was overtaken by our own push', async () => {
    const { engine, gh, storage, applied } = makeEngine();
    localEdit(storage, 1, 'перша');
    engine.notifyEdit();
    await engine.flush();
    const realGet = gh.getFileContent;
    let release;
    const held = new Promise((r) => { release = r; });
    gh.getFileContent = async (...args) => { const file = await realGet(...args); await held; return file; };
    const pulling = engine.pull(true);
    gh.getFileContent = realGet;
    localEdit(storage, 1, 'друга');
    engine.notifyEdit();
    await engine.flush();
    release();
    await pulling;
    assert.strictEqual(JSON.parse(storage.getItem(RKEY)).edits[1], 'друга',
      'the pre-push body must not overwrite the edit that was pushed after it');
    assert.deepStrictEqual(applied, []);
    await engine.pull(true);
    assert.strictEqual(JSON.parse(storage.getItem(RKEY)).edits[1], 'друга');
  });
});

// Local edits can leave storage without a notifyEdit: the SPA retires an edit
// once the loaded file already has its text. The engine learns of it from the
// pull that follows, which is the only place local, base and remote meet.
describe('engine: pull notices local state that left the base behind', () => {
  const LIVE = { marks: {}, edits: { 1: 'one', 2: 'two' } };
  function live(localEntry) {
    const init = {
      [syncBaseKey(TALK)]: JSON.stringify({
        doc: { [RKEY]: LIVE }, sha: 'sha_live', revision: 3,
        prNumber: 12, prUrl: 'https://github.com/x/pull/12', nodeId: 'PR_n12', prDraft: true,
        fileShas: {}, branch: BRANCH_NAME,
      }),
    };
    if (localEntry) init[RKEY] = JSON.stringify(localEntry);
    return init;
  }
  const liveRemote = () => remoteDoc(LIVE.edits, 3, 'sha_live');

  it('an edit retired locally is taken off the live PR by the next push', async () => {
    const { engine, gh, timers } = makeEngine({ remote: liveRemote() },
      live({ marks: {}, edits: { 2: 'two' } }));
    await engine.pull(true);
    assert.strictEqual(engine.getInfo().status, 'pending', 'the PR still carries the retired edit');
    assert.deepStrictEqual(timers.delays(), [15000]);
    timers.fire(15000);
    await settle();
    assert.strictEqual(gh.puts.length, 1);
    assert.deepStrictEqual(gh.puts[0].entries[RKEY].edits, { 2: 'two' });
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'createPull').length, 0, 'the PR is kept, not re-created');
  });

  it('every edit retired: the live PR has nothing left to propose and is torn down', async () => {
    const { engine, gh, timers } = makeEngine({ remote: liveRemote() }, live(null));
    await engine.pull(true);
    timers.fire(15000);
    await settle();
    assert.deepStrictEqual(gh.calls.filter((c) => c[0] === 'closePull' || c[0] === 'deleteRef'),
      [['closePull', 12], ['deleteRef', BRANCH_NAME]]);
    assert.strictEqual(gh.puts.length, 0);
    assert.strictEqual(engine.getInfo().status, 'idle');
  });

  it('every edit retired, but another device added one meanwhile: the PR stays for it', async () => {
    const { engine, gh, storage, timers } = makeEngine(
      { remote: remoteDoc({ 1: 'one', 2: 'two', 9: 'з телефона' }, 4, 'sha_newer') }, live(null));
    await engine.pull(true);
    timers.fire(15000);
    await settle();
    assert.deepStrictEqual(JSON.parse(storage.getItem(RKEY)).edits, { 9: 'з телефона' });
    assert.deepStrictEqual(gh.puts.at(-1).entries[RKEY].edits, { 9: 'з телефона' });
    assert.strictEqual(gh.calls.filter((c) => c[0] === 'closePull').length, 0);
  });

  it('local equal to the base arms nothing', async () => {
    const { engine, gh, timers } = makeEngine({ remote: liveRemote() }, live(LIVE));
    await engine.pull(true);
    assert.deepStrictEqual(timers.delays(), []);
    assert.strictEqual(engine.getInfo().status, 'synced');
    assert.strictEqual(gh.puts.length, 0);
  });

  it('does not re-arm over an edit that is already waiting for its push', async () => {
    const { engine, storage, timers } = makeEngine({ remote: liveRemote() }, live(LIVE));
    localEdit(storage, 5, 'five');
    engine.notifyEdit();
    await engine.pull(true);
    assert.deepStrictEqual(timers.delays(), [15000], 'one debounce, the edit\'s own');
    assert.strictEqual(engine.getInfo().status, 'pending');
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
    const { engine, storage, applied } = makeEngine({
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

describe('engine: target-scoped coexistence', () => {
  // Two engines for the same talk but different targets (a video SRT and the
  // transcript) must each sync only their own keys, to their own state path,
  // without deleting the other target's local edits.
  it('two targets sync independently and never clobber each other', async () => {
    const CK = 'srt_edits_' + TALK + '_video1_uk';
    const storage = memStorage({
      [CK]: JSON.stringify({ 4: 'sub-edit' }),
      ['review_' + TALK]: JSON.stringify({ marks: {}, edits: { 1: 'transcript-edit' } }),
    });
    const srt = srtSyncTarget(TALK, 'video1', 'uk');
    const tr = transcriptSyncTarget(TALK, 'uk');
    const shared = {
      api: 'https://api.github.com/repos/sy-tools/sy-subtitles', owner: 'sy-tools',
      token: 'gho_x', login: 'tester', talkId: TALK, base: 'main', storage,
      now: () => 1770000000000, clientId: 'client1',
      isOffline: () => false,
    };
    const ghA = ghStub();
    const ghB = ghStub();
    const tA = timerHarness(); const tB = timerHarness();
    const engA = createSyncEngine(Object.assign({}, shared, {
      gh: ghA, target: srt.slug, entryFilter: srt.filter,
      branch: 'sync/tester/' + TALK + '--' + srt.slug,
      setTimeoutFn: tA.set.bind(tA), clearTimeoutFn: tA.clear.bind(tA),
    }));
    const engB = createSyncEngine(Object.assign({}, shared, {
      gh: ghB, target: tr.slug, entryFilter: tr.filter,
      branch: 'sync/tester/' + TALK + '--' + tr.slug,
      setTimeoutFn: tB.set.bind(tB), clearTimeoutFn: tB.clear.bind(tB),
    }));

    engA.notifyEdit(); await engA.flush(); await settle();
    engB.notifyEdit(); await engB.flush(); await settle();

    // Each engine wrote to its OWN state path.
    assert.ok(ghA.calls.some((c) => c[0] === 'putFile' && c[1] === '.review-sync/' + TALK + '/video1-uk.json'));
    assert.ok(ghB.calls.some((c) => c[0] === 'putFile' && c[1] === '.review-sync/' + TALK + '/transcript-uk.json'));
    // Each doc carries ONLY its own target's entry.
    assert.deepStrictEqual(Object.keys(ghA.puts[0].entries), [CK]);
    assert.deepStrictEqual(Object.keys(ghB.puts[0].entries), ['review_' + TALK]);
    // Neither engine deleted the other's local edit.
    assert.ok(storage.getItem(CK));
    assert.ok(storage.getItem('review_' + TALK));
    // Base metas are stored under distinct target-scoped keys.
    assert.ok(storage.getItem(syncBaseKey(TALK, srt.slug)));
    assert.ok(storage.getItem(syncBaseKey(TALK, tr.slug)));
    assert.strictEqual(storage.getItem(syncBaseKey(TALK)), null);
  });
});

// --- File-content hygiene ------------------------------------------------------
//
// Collaborators still hold edits containing NBSP in localStorage from before the
// input fields were fixed; this is the last gate before the bytes reach GitHub.
// Invisible characters ONLY -- `content` is a whole rebuilt file, so the
// field-level rule would collapse its newlines and destroy the SRT.
const { sanitizeInvisible } = require('../site/js/text_sanitize');

describe('engine: rebuilt file hygiene', () => {
  const SRT_PATH = 'talks/' + TALK + '/video1/final/uk.srt';

  // gh.putFile is resolved on the stub at call time, so wrapping it after
  // construction captures exactly what the engine sends.
  function capturePuts(engineOver) {
    const h = makeEngine(undefined, undefined, engineOver);
    const seen = [];
    const origPut = h.gh.putFile;
    h.gh.putFile = async (api, token, opts) => { seen.push(opts); return origPut(api, token, opts); };
    return Object.assign({ seen }, h);
  }

  async function pushOnce(h) {
    localEdit(h.storage, 1, 'а');
    h.engine.notifyEdit();
    h.timers.fire(15000);
    await settle();
  }

  it('strips invisible characters from rebuilt files before putFile', async () => {
    const dirty = '1\n00:00:01,000 --> 00:00:02,000\nПривіт\u00a0світ\u200b\n\n';
    const h = capturePuts({
      buildFiles: () => [{ path: SRT_PATH, content: dirty }],
      sanitize: sanitizeInvisible,
    });
    await pushOnce(h);

    const srt = h.seen.filter((o) => o.path === SRT_PATH);
    assert.strictEqual(srt.length, 1, 'the rebuilt SRT was not pushed');
    assert.ok(!srt[0].content.includes('\u00a0'), 'NBSP reached putFile');
    assert.ok(!srt[0].content.includes('\u200b'), 'ZWSP reached putFile');
    assert.ok(srt[0].content.includes('Привіт світ'), 'NBSP was deleted instead of folded to a space');
    assert.ok(
      srt[0].content.includes('00:00:01,000 --> 00:00:02,000'),
      'SRT line structure was destroyed -- the field-level rule was applied by mistake',
    );
  });

  it('passes content through unchanged when no sanitizer is wired', async () => {
    // edit_sync.js must stay loadable in a context that never pulls the twin in.
    const content = '1\n00:00:01,000 --> 00:00:02,000\nplain\n\n';
    const h = capturePuts({ buildFiles: () => [{ path: SRT_PATH, content: content }] });
    await pushOnce(h);

    const srt = h.seen.filter((o) => o.path === SRT_PATH);
    assert.strictEqual(srt.length, 1);
    assert.strictEqual(srt[0].content, content);
  });
});


// --- index.html wiring -----------------------------------------------------
//
// The engine-side hygiene tests above inject `sanitize` themselves, so the
// one line in index.html that actually wires sanitizeInvisible into
// ensureEditSync could be deleted with every test green. Pin the wiring the
// way test_spa_cache.js pins the stylesheet links: by reading the source.
describe('index.html wiring', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8');

  it('tells the sync engine which file its target commits', () => {
    assert.match(html, /filePath:\s*tgt\.filePath/);
  });

  it('tells the sync engine how to read that file back: the entry it indexes, and its parser', () => {
    assert.match(html, /editsKey:\s*tgt\.editsKey/);
    assert.match(html, /parseFile:\s*syncFileTexts\(tgt\.fileKind\)/);
  });

  it('passes sanitizeInvisible into the sync engine', () => {
    assert.match(html, /sanitize:\s*sanitizeInvisible/);
  });

  it('shares no top-level function name with edit_store.js (one global scope: the later script wins)', () => {
    const topLevel = (file) => new Set(
      [...fs.readFileSync(path.join(__dirname, '..', 'site', 'js', file), 'utf8')
        .matchAll(/^function\s+([\w$]+)\s*\(/gm)].map((m) => m[1]));
    const store = topLevel('edit_store.js');
    assert.deepStrictEqual([...topLevel('edit_sync.js')].filter((name) => store.has(name)), []);
  });

  it('loads text_sanitize.js before the inline app code that calls it', () => {
    const tag = html.indexOf('src="js/text_sanitize.js"');
    assert.notStrictEqual(tag, -1, 'text_sanitize.js script tag missing');
  });
});
