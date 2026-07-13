const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  srtEditsKey, backupKeyFor, displacedKeyFor,
  loadSrtEdits, saveSrtEdits,
  mapRowsToBlockIdx, splitReviewRowEdits, mergeReviewEditsIntoCanonical,
  loadPreviewLangEdits, loadReviewRowEdits,
  migratePreviewEdits, migrateReviewSrtEdits,
} = require('../site/js/edit_store');

const TALK = '1979-09-27_Shri-Kundalini-Shakti-And-Shri-Jesus-Bombay';
const VIDEO = 'video1';

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

// Storage whose writes start failing after `okWrites` successful setItem calls
// (models a quota error mid-migration).
function throwingStorage(init, okWrites) {
  const s = memStorage(init);
  let writes = 0;
  const orig = s.setItem.bind(s);
  s.setItem = (k, v) => {
    if (writes >= okWrites) throw new Error('QuotaExceededError');
    writes += 1;
    orig(k, v);
  };
  return s;
}

const PREVIEW_KEY = 'preview_' + TALK + '_' + VIDEO;
const LEGACY_SRT_KEY = 'review_srt_' + TALK + '_' + VIDEO + '_en_uk';
const CANON_UK = srtEditsKey(TALK, VIDEO, 'uk');

describe('keys', () => {
  it('srtEditsKey / backupKeyFor / displacedKeyFor formats', () => {
    assert.strictEqual(CANON_UK, 'srt_edits_' + TALK + '_' + VIDEO + '_uk');
    assert.strictEqual(backupKeyFor(PREVIEW_KEY), 'sy_backup_v1_' + PREVIEW_KEY);
    assert.strictEqual(displacedKeyFor(CANON_UK), 'sy_backup_v1_displaced_' + CANON_UK);
  });
});

describe('loadSrtEdits / saveSrtEdits', () => {
  it('round-trips a block-indexed map', () => {
    const storage = memStorage();
    saveSrtEdits(TALK, VIDEO, 'uk', { 4: 'привіт', 7: 'світ' }, storage);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 4: 'привіт', 7: 'світ' });
  });
  it('saving an empty map removes the key', () => {
    const storage = memStorage({ [CANON_UK]: JSON.stringify({ 1: 'x' }) });
    saveSrtEdits(TALK, VIDEO, 'uk', {}, storage);
    assert.strictEqual(storage.getItem(CANON_UK), null);
  });
  it('load tolerates missing key and unparseable/junk values', () => {
    const storage = memStorage({ [srtEditsKey(TALK, VIDEO, 'en')]: 'not json' });
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), {});
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'en', storage), {});
  });
  it('load keeps only string values', () => {
    const storage = memStorage({ [CANON_UK]: JSON.stringify({ 1: 'ok', 2: 5, 3: { nested: true } }) });
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 1: 'ok' });
  });
});

describe('mapRowsToBlockIdx', () => {
  it('maps rows to uk block positions by object identity; null uk -> -1', () => {
    const b0 = { startMs: 0, endMs: 1000, text: 'a' };
    const b1 = { startMs: 1000, endMs: 2000, text: 'b' };
    const rows = [
      { en: null, uk: b0 },
      { en: null, uk: null },
      { en: null, uk: b1 },
      { en: null, uk: b1 }, // spanning: same block on two rows
    ];
    assert.deepStrictEqual(mapRowsToBlockIdx(rows, [b0, b1]), [0, -1, 1, 1]);
  });
  it('handles empty inputs', () => {
    assert.deepStrictEqual(mapRowsToBlockIdx([], []), []);
    assert.deepStrictEqual(mapRowsToBlockIdx(null, null), []);
  });
});

describe('splitReviewRowEdits', () => {
  it('splits row edits into canonical (block-keyed) and legacy (unmappable rows)', () => {
    const split = splitReviewRowEdits({ 0: 'A', 1: 'B', 2: 'C' }, [3, -1, 5]);
    assert.deepStrictEqual(split.canonical, { 3: 'A', 5: 'C' });
    assert.deepStrictEqual(split.legacy, { 1: 'B' });
  });
  it('first row wins when two rows map to the same block', () => {
    const split = splitReviewRowEdits({ 0: 'first', 1: 'second' }, [2, 2]);
    assert.deepStrictEqual(split.canonical, { 2: 'first' });
    assert.deepStrictEqual(split.legacy, {});
  });
});

describe('mergeReviewEditsIntoCanonical', () => {
  it('preserves canonical blocks that have no row in this view', () => {
    // block 5 was edited in preview and maps to NO aligned row here.
    const existing = { 3: 'old-3', 5: 'preview-only' };
    const merged = mergeReviewEditsIntoCanonical(existing, { 0: 'edited-3' }, [3, -1]);
    assert.deepStrictEqual(merged, { 3: 'edited-3', 5: 'preview-only' });
  });
  it('a reverted row deletes only its own block, never an unmapped one', () => {
    const existing = { 3: 'x', 5: 'preview-only' };
    // rowToBlock says row 0 -> block 3, but rowEdits is empty (reverted).
    const merged = mergeReviewEditsIntoCanonical(existing, {}, [3]);
    assert.deepStrictEqual(merged, { 5: 'preview-only' });
  });
  it('spanning rows (same block twice): first row wins, block kept once', () => {
    const merged = mergeReviewEditsIntoCanonical({}, { 0: 'first', 1: 'second' }, [2, 2]);
    assert.deepStrictEqual(merged, { 2: 'first' });
  });
  it('empty everything yields an empty map', () => {
    assert.deepStrictEqual(mergeReviewEditsIntoCanonical({}, {}, []), {});
    assert.deepStrictEqual(mergeReviewEditsIntoCanonical(null, null, null), {});
  });
});

describe('loadPreviewLangEdits', () => {
  it('reads canonical edits for the lang', () => {
    const storage = memStorage({ [CANON_UK]: JSON.stringify({ 2: 'к' }) });
    assert.deepStrictEqual(loadPreviewLangEdits(TALK, VIDEO, 'uk', storage), { 2: 'к' });
  });
  it('dual-read: legacy preview leftovers show through, canonical wins on overlap', () => {
    const storage = memStorage({
      [CANON_UK]: JSON.stringify({ 2: 'canonical' }),
      [PREVIEW_KEY]: JSON.stringify({ mode: 'edit', markers: [], edits: { uk: { 2: 'legacy', 9: 'left-behind' } } }),
    });
    assert.deepStrictEqual(loadPreviewLangEdits(TALK, VIDEO, 'uk', storage),
      { 2: 'canonical', 9: 'left-behind' });
  });
});

describe('loadReviewRowEdits', () => {
  it('maps canonical block edits back onto every row of the block', () => {
    const storage = memStorage({ [CANON_UK]: JSON.stringify({ 5: 'текст' }) });
    const rowEdits = loadReviewRowEdits(TALK, VIDEO, 'en', 'uk', [5, 5, -1], storage);
    assert.deepStrictEqual(rowEdits, { 0: 'текст', 1: 'текст' });
  });
  it('dual-read: legacy row edits show for rows without a canonical value', () => {
    const storage = memStorage({
      [CANON_UK]: JSON.stringify({ 5: 'canon' }),
      [LEGACY_SRT_KEY]: JSON.stringify({ marks: {}, edits: { 0: 'stale', 2: 'unmappable' } }),
    });
    const rowEdits = loadReviewRowEdits(TALK, VIDEO, 'en', 'uk', [5, -1, -1], storage);
    assert.deepStrictEqual(rowEdits, { 0: 'canon', 2: 'unmappable' });
  });
});

describe('migratePreviewEdits', () => {
  const legacyRaw = JSON.stringify({
    mode: 'edit',
    markers: [{ time: 3, text: 'note' }],
    edits: { uk: { 4: 'ук-правка' }, en: { 1: 'en fix' } },
  });

  it('moves per-lang edits to canonical keys, keeps mode/markers, writes exact backup', () => {
    const storage = memStorage({ [PREVIEW_KEY]: legacyRaw });
    const rep = migratePreviewEdits(TALK, VIDEO, storage);
    assert.strictEqual(rep.migrated, true);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 4: 'ук-правка' });
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'en', storage), { 1: 'en fix' });
    // backup is the byte-exact pre-migration value, never auto-deleted
    assert.strictEqual(storage.getItem(backupKeyFor(PREVIEW_KEY)), legacyRaw);
    // preview state keeps mode/markers but carries no edits any more
    const state = JSON.parse(storage.getItem(PREVIEW_KEY));
    assert.strictEqual(state.mode, 'edit');
    assert.deepStrictEqual(state.markers, [{ time: 3, text: 'note' }]);
    assert.deepStrictEqual(state.edits, {});
  });

  it('is idempotent: a second run is a no-op and keeps the original backup', () => {
    const storage = memStorage({ [PREVIEW_KEY]: legacyRaw });
    migratePreviewEdits(TALK, VIDEO, storage);
    const backupAfterFirst = storage.getItem(backupKeyFor(PREVIEW_KEY));
    const rep2 = migratePreviewEdits(TALK, VIDEO, storage);
    assert.strictEqual(rep2.migrated, false);
    assert.strictEqual(storage.getItem(backupKeyFor(PREVIEW_KEY)), backupAfterFirst);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 4: 'ук-правка' });
  });

  it('existing canonical value wins on conflict (legacy copy survives in backup AND displaced)', () => {
    const storage = memStorage({
      [PREVIEW_KEY]: legacyRaw,
      [CANON_UK]: JSON.stringify({ 4: 'новіша правка' }),
    });
    migratePreviewEdits(TALK, VIDEO, storage);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 4: 'новіша правка' });
    assert.strictEqual(storage.getItem(backupKeyFor(PREVIEW_KEY)), legacyRaw);
    // symmetric with the review-wins case: the superseded preview value is also
    // recorded under the displaced key (not only in the raw preview backup).
    assert.deepStrictEqual(JSON.parse(storage.getItem(displacedKeyFor(CANON_UK))), { 4: 'ук-правка' });
  });

  it('no edits -> no-op, no backup written', () => {
    const storage = memStorage({
      [PREVIEW_KEY]: JSON.stringify({ mode: 'marker', markers: [{ time: 1, text: '' }], edits: {} }),
    });
    const rep = migratePreviewEdits(TALK, VIDEO, storage);
    assert.strictEqual(rep.migrated, false);
    assert.strictEqual(storage.getItem(backupKeyFor(PREVIEW_KEY)), null);
  });

  it('a throwing storage loses nothing: legacy stays intact, reports failure', () => {
    const storage = throwingStorage({ [PREVIEW_KEY]: legacyRaw }, 0);
    const rep = migratePreviewEdits(TALK, VIDEO, storage);
    assert.strictEqual(rep.migrated, false);
    assert.ok(rep.error);
    assert.strictEqual(storage.getItem(PREVIEW_KEY), legacyRaw);
    // dual-read still surfaces the edits even though migration failed
    assert.deepStrictEqual(loadPreviewLangEdits(TALK, VIDEO, 'uk', storage), { 4: 'ук-правка' });
  });

  it('a mid-migration failure (partial canonical write) is retried safely', () => {
    // 2 writes succeed (backup + uk canonical), then the en canonical throws.
    const storage = throwingStorage({ [PREVIEW_KEY]: legacyRaw }, 2);
    const rep = migratePreviewEdits(TALK, VIDEO, storage);
    assert.strictEqual(rep.migrated, false);
    assert.strictEqual(storage.getItem(PREVIEW_KEY), legacyRaw); // legacy untouched
    // retry on a healthy storage completes the move
    const rep2 = migratePreviewEdits(TALK, VIDEO, storage.healed ? storage : (() => {
      const s = memStorage();
      for (let i = 0; i < storage.length; i++) { const k = storage.key(i); s.setItem(k, storage.getItem(k)); }
      return s;
    })());
    assert.strictEqual(rep2.migrated, true);
  });
});

describe('migrateReviewSrtEdits', () => {
  const legacyRaw = JSON.stringify({
    marks: { 1: 'коментар' },
    edits: { 0: 'правка-0', 1: 'непереносима', 2: 'правка-2' },
  });
  const ROW_TO_BLOCK = [3, -1, 5];

  it('moves mappable row edits to canonical; marks and unmappable edits stay in legacy', () => {
    const storage = memStorage({ [LEGACY_SRT_KEY]: legacyRaw });
    const rep = migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', ROW_TO_BLOCK, storage);
    assert.strictEqual(rep.migrated, true);
    assert.strictEqual(rep.moved, 2);
    assert.strictEqual(rep.unmappable, 1);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 3: 'правка-0', 5: 'правка-2' });
    const legacy = JSON.parse(storage.getItem(LEGACY_SRT_KEY));
    assert.deepStrictEqual(legacy.marks, { 1: 'коментар' });
    assert.deepStrictEqual(legacy.edits, { 1: 'непереносима' });
    assert.strictEqual(storage.getItem(backupKeyFor(LEGACY_SRT_KEY)), legacyRaw);
  });

  it('review value wins over canonical; the displaced value is preserved', () => {
    const storage = memStorage({
      [LEGACY_SRT_KEY]: legacyRaw,
      [CANON_UK]: JSON.stringify({ 3: 'з превю' }),
    });
    migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', ROW_TO_BLOCK, storage);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 3: 'правка-0', 5: 'правка-2' });
    const displaced = JSON.parse(storage.getItem(displacedKeyFor(CANON_UK)));
    assert.deepStrictEqual(displaced, { 3: 'з превю' });
  });

  it('removes the legacy key entirely when nothing is left in it', () => {
    const storage = memStorage({
      [LEGACY_SRT_KEY]: JSON.stringify({ marks: {}, edits: { 0: 'a' } }),
    });
    migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', [7], storage);
    assert.strictEqual(storage.getItem(LEGACY_SRT_KEY), null);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 7: 'a' });
  });

  it('is idempotent: a second run with the same rows is a no-op', () => {
    const storage = memStorage({ [LEGACY_SRT_KEY]: legacyRaw });
    migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', ROW_TO_BLOCK, storage);
    const rep2 = migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', ROW_TO_BLOCK, storage);
    assert.strictEqual(rep2.migrated, false);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 3: 'правка-0', 5: 'правка-2' });
  });

  it('duplicate rows on one block: first row wins, the loser survives in backup only', () => {
    const raw = JSON.stringify({ marks: {}, edits: { 0: 'перший', 1: 'другий' } });
    const storage = memStorage({ [LEGACY_SRT_KEY]: raw });
    migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', [2, 2], storage);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', storage), { 2: 'перший' });
    assert.strictEqual(storage.getItem(LEGACY_SRT_KEY), null);
    assert.strictEqual(storage.getItem(backupKeyFor(LEGACY_SRT_KEY)), raw);
  });

  it('a throwing storage loses nothing: legacy intact, dual-read still works', () => {
    const storage = throwingStorage({ [LEGACY_SRT_KEY]: legacyRaw }, 0);
    const rep = migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', ROW_TO_BLOCK, storage);
    assert.strictEqual(rep.migrated, false);
    assert.ok(rep.error);
    assert.strictEqual(storage.getItem(LEGACY_SRT_KEY), legacyRaw);
    const rowEdits = loadReviewRowEdits(TALK, VIDEO, 'en', 'uk', ROW_TO_BLOCK, storage);
    assert.deepStrictEqual(rowEdits, { 0: 'правка-0', 1: 'непереносима', 2: 'правка-2' });
  });
});

describe('cross-mode consolidation (preview <-> review)', () => {
  it('either migration order converges with review winning; every value survives somewhere', () => {
    const previewRaw = JSON.stringify({ mode: 'edit', markers: [], edits: { uk: { 3: 'превю' } } });
    const reviewRaw = JSON.stringify({ marks: {}, edits: { 0: 'ревю' } });

    // order A: preview first, then review
    const a = memStorage({ [PREVIEW_KEY]: previewRaw, [LEGACY_SRT_KEY]: reviewRaw });
    migratePreviewEdits(TALK, VIDEO, a);
    migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', [3], a);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', a), { 3: 'ревю' });
    assert.strictEqual(a.getItem(backupKeyFor(PREVIEW_KEY)), previewRaw);
    assert.deepStrictEqual(JSON.parse(a.getItem(displacedKeyFor(CANON_UK))), { 3: 'превю' });

    // order B: review first, then preview
    const b = memStorage({ [PREVIEW_KEY]: previewRaw, [LEGACY_SRT_KEY]: reviewRaw });
    migrateReviewSrtEdits(TALK, VIDEO, 'en', 'uk', [3], b);
    migratePreviewEdits(TALK, VIDEO, b);
    assert.deepStrictEqual(loadSrtEdits(TALK, VIDEO, 'uk', b), { 3: 'ревю' });
    assert.strictEqual(b.getItem(backupKeyFor(PREVIEW_KEY)), previewRaw);
  });
});
