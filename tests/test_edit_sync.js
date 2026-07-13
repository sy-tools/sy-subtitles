const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  syncFilePath, syncBaseKey, collectSyncEntries, applySyncEntries,
  mergeSyncDocs, makeSyncDoc,
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

describe('makeSyncDoc', () => {
  it('wraps entries with version/revision/client/talkId', () => {
    const d = makeSyncDoc(TALK, { a: 1 }, 4, 'k3b9x2', '2026-07-13T22:00:00Z');
    assert.deepStrictEqual(d, {
      version: 1, revision: 4, updatedAt: '2026-07-13T22:00:00Z',
      client: 'k3b9x2', talkId: TALK, entries: { a: 1 },
    });
  });
});
