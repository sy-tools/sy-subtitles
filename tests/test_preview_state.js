const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  defaultPreviewState,
  loadPreviewState,
  applyEditsToSrt,
  canReusePreviewPlayer,
  previewPosKey,
  loadPreviewPos,
  savePreviewPos,
  shouldResumePreviewPos,
  previewPosToPersist,
} = require('../site/js/preview_state');
const { findActiveSubtitleIdx } = require('../site/js/preview_srt_parser');

// In-memory storage double — matches just enough of localStorage
// surface (getItem/setItem/removeItem) for loadPreviewState.
function makeStorage(initial) {
  const store = Object.assign({}, initial || {});
  return {
    data: store,
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem(k, v) {
      store[k] = String(v);
    },
    removeItem(k) {
      delete store[k];
    },
  };
}

describe('defaultPreviewState', () => {
  it('has marker mode and empty collections', () => {
    const s = defaultPreviewState();
    assert.strictEqual(s.mode, 'marker');
    assert.deepStrictEqual(s.markers, []);
    assert.deepStrictEqual(s.edits, {});
  });
  it('returns a fresh object each call', () => {
    const a = defaultPreviewState();
    const b = defaultPreviewState();
    a.markers.push({ time: 1, tc: '00:00:01', text: 'x', comment: '' });
    assert.strictEqual(b.markers.length, 0);
  });
});

describe('canReusePreviewPlayer — keep the live player on re-entry', () => {
  const live = { talkId: 'T', videoSlug: 'v1', player: {} };

  it('reuses when same talk+video, a player exists, and the iframe is present', () => {
    assert.strictEqual(canReusePreviewPlayer(live, 'T', 'v1', true), true);
  });
  it('rebuilds when the video differs', () => {
    assert.strictEqual(canReusePreviewPlayer(live, 'T', 'v2', true), false);
  });
  it('rebuilds when the talk differs', () => {
    assert.strictEqual(canReusePreviewPlayer(live, 'OTHER', 'v1', true), false);
  });
  it('rebuilds when there is no player yet', () => {
    assert.strictEqual(canReusePreviewPlayer({ talkId: 'T', videoSlug: 'v1' }, 'T', 'v1', true), false);
  });
  it('rebuilds when the iframe is gone', () => {
    assert.strictEqual(canReusePreviewPlayer(live, 'T', 'v1', false), false);
  });
  it('rebuilds on first entry (empty/missing previous state)', () => {
    assert.strictEqual(canReusePreviewPlayer({}, 'T', 'v1', true), false);
    assert.strictEqual(canReusePreviewPlayer(null, 'T', 'v1', true), false);
  });
});

describe('loadPreviewState — migration and precedence', () => {
  const talkId = '2001-01-01_Test';
  const videoSlug = 'v1';
  const newKey = 'preview_' + talkId + '_' + videoSlug;
  const legacyKey = 'markers_preview_' + talkId + '_' + videoSlug;

  it('returns default when neither key is present', () => {
    const storage = makeStorage();
    const state = loadPreviewState(talkId, videoSlug, storage);
    assert.strictEqual(state.mode, 'marker');
    assert.deepStrictEqual(state.markers, []);
    assert.deepStrictEqual(state.edits, {});
    // Default is not written back to storage until user mutates.
    assert.strictEqual(storage.getItem(newKey), null);
  });

  it('reads the new key and leaves storage untouched', () => {
    const payload = {
      mode: 'edit',
      markers: [{ time: 1, tc: '00:00:01', text: 'a', comment: '' }],
      edits: { uk: { 3: 'нове' } },
    };
    const storage = makeStorage({ [newKey]: JSON.stringify(payload) });
    const state = loadPreviewState(talkId, videoSlug, storage);
    assert.deepStrictEqual(state, payload);
    assert.strictEqual(storage.getItem(legacyKey), null);
  });

  it('migrates legacy markers-only key to new shape and removes legacy', () => {
    const legacyMarkers = [
      { time: 12.3, tc: '00:00:12', text: 'hi', comment: 'c1' },
      { time: 45.6, tc: '00:00:45', text: 'bye', comment: '' },
    ];
    const storage = makeStorage({
      [legacyKey]: JSON.stringify(legacyMarkers),
    });
    const state = loadPreviewState(talkId, videoSlug, storage);
    assert.strictEqual(state.mode, 'marker');
    assert.deepStrictEqual(state.markers, legacyMarkers);
    assert.deepStrictEqual(state.edits, {});
    assert.strictEqual(storage.getItem(legacyKey), null);
    const stored = JSON.parse(storage.getItem(newKey));
    assert.deepStrictEqual(stored.markers, legacyMarkers);
    assert.strictEqual(stored.mode, 'marker');
  });

  it('prefers new key when both exist and drops legacy', () => {
    const legacy = [{ time: 1, tc: '00:00:01', text: 'old', comment: '' }];
    const payload = {
      mode: 'edit',
      markers: [],
      edits: { uk: { 0: 'x' } },
    };
    const storage = makeStorage({
      [legacyKey]: JSON.stringify(legacy),
      [newKey]: JSON.stringify(payload),
    });
    const state = loadPreviewState(talkId, videoSlug, storage);
    assert.deepStrictEqual(state, payload);
    assert.strictEqual(storage.getItem(legacyKey), null);
  });

  it('falls back to default on corrupted new key', () => {
    const storage = makeStorage({ [newKey]: '{not-json' });
    const state = loadPreviewState(talkId, videoSlug, storage);
    assert.strictEqual(state.mode, 'marker');
    assert.deepStrictEqual(state.markers, []);
  });

  it('coerces missing fields from partial new payload', () => {
    const storage = makeStorage({
      [newKey]: JSON.stringify({ mode: 'edit' }),
    });
    const state = loadPreviewState(talkId, videoSlug, storage);
    assert.strictEqual(state.mode, 'edit');
    assert.deepStrictEqual(state.markers, []);
    assert.deepStrictEqual(state.edits, {});
  });
});

describe('preview playback position — persist & resume (#7)', () => {
  const talkId = '2001-01-01_Test';
  const videoSlug = 'v1';
  const key = 'sy.preview_pos.' + talkId + '.' + videoSlug;

  it('previewPosKey builds the namespaced key (its own, not the marker/edit key)', () => {
    assert.strictEqual(previewPosKey(talkId, videoSlug), key);
  });

  it('loadPreviewPos returns 0 when nothing is stored', () => {
    const storage = makeStorage();
    assert.strictEqual(loadPreviewPos(talkId, videoSlug, storage), 0);
  });

  it('round-trips a saved position as float seconds', () => {
    const storage = makeStorage();
    savePreviewPos(talkId, videoSlug, storage, 123.45);
    assert.strictEqual(storage.getItem(key), '123.45');
    assert.strictEqual(loadPreviewPos(talkId, videoSlug, storage), 123.45);
  });

  it('does NOT touch the marker/edit payload key', () => {
    const storage = makeStorage();
    savePreviewPos(talkId, videoSlug, storage, 42);
    assert.strictEqual(storage.getItem('preview_' + talkId + '_' + videoSlug), null);
  });

  it('loadPreviewPos returns 0 for a non-numeric / corrupt value', () => {
    const storage = makeStorage({ [key]: 'not-a-number' });
    assert.strictEqual(loadPreviewPos(talkId, videoSlug, storage), 0);
  });

  it('loadPreviewPos returns 0 for a negative stored value', () => {
    const storage = makeStorage({ [key]: '-12' });
    assert.strictEqual(loadPreviewPos(talkId, videoSlug, storage), 0);
  });

  it('savePreviewPos clamps a negative position to 0', () => {
    const storage = makeStorage();
    savePreviewPos(talkId, videoSlug, storage, -5);
    assert.strictEqual(loadPreviewPos(talkId, videoSlug, storage), 0);
  });

  it('savePreviewPos ignores NaN / non-finite and leaves the prior value', () => {
    const storage = makeStorage();
    savePreviewPos(talkId, videoSlug, storage, 50);
    savePreviewPos(talkId, videoSlug, storage, NaN);
    savePreviewPos(talkId, videoSlug, storage, Infinity);
    assert.strictEqual(loadPreviewPos(talkId, videoSlug, storage), 50);
  });

  it('savePreviewPos swallows storage exceptions (quota / private mode)', () => {
    const throwing = { setItem() { throw new Error('quota'); }, getItem() { return null; } };
    assert.doesNotThrow(() => savePreviewPos(talkId, videoSlug, throwing, 10));
  });

  it('shouldResumePreviewPos skips trivial near-start positions, resumes deeper ones', () => {
    assert.strictEqual(shouldResumePreviewPos(0), false);
    assert.strictEqual(shouldResumePreviewPos(3), false);
    assert.strictEqual(shouldResumePreviewPos(3.5), true);
    assert.strictEqual(shouldResumePreviewPos(120), true);
  });
  it('shouldResumePreviewPos rejects non-finite / non-number inputs', () => {
    assert.strictEqual(shouldResumePreviewPos(NaN), false);
    assert.strictEqual(shouldResumePreviewPos(Infinity), false);
    assert.strictEqual(shouldResumePreviewPos('5'), false);
    assert.strictEqual(shouldResumePreviewPos(null), false);
    assert.strictEqual(shouldResumePreviewPos(undefined), false);
  });
});

describe('previewPosToPersist — gate the live position write (#7 fix)', () => {
  // Centralizes the "what to persist" decision so the index.html flushers never
  // write a sentinel: the fresh-entry 0 (resume seek not yet landed) or the
  // end-of-video position (we want a clean restart, signalled by _ended).
  it('returns null without a talk (nothing to key on)', () => {
    assert.strictEqual(previewPosToPersist(null), null);
    assert.strictEqual(previewPosToPersist({}), null);
    assert.strictEqual(previewPosToPersist({ currentTime: 120 }), null);
  });
  it('returns the position for a resumable mid-video time', () => {
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: 3.5 }), 3.5);
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: 600 }), 600);
  });
  it('returns null for the fresh-load sentinel 0 and any <=3s (would clobber a saved point)', () => {
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: 0 }), null);
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: 2 }), null);
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: 3 }), null);
  });
  it('returns null once the video has ended, even at a large time (clean restart)', () => {
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: 600, _ended: true }), null);
  });
  it('returns null for a non-finite / non-number currentTime', () => {
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: NaN }), null);
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v', currentTime: Infinity }), null);
    assert.strictEqual(previewPosToPersist({ talkId: 'T', videoSlug: 'v' }), null);
  });
});

describe('findActiveSubtitleIdx', () => {
  const subs = [
    { index: 1, startMs: 1000, endMs: 5000, text: 'First' },
    { index: 2, startMs: 6000, endMs: 10000, text: 'Second' },
  ];

  it('returns 0 at start of first block', () => {
    assert.strictEqual(findActiveSubtitleIdx(subs, 1000), 0);
  });
  it('returns 0 in middle of first block', () => {
    assert.strictEqual(findActiveSubtitleIdx(subs, 3000), 0);
  });
  it('returns -1 at exact end (exclusive)', () => {
    assert.strictEqual(findActiveSubtitleIdx(subs, 5000), -1);
  });
  it('returns -1 in gap between blocks', () => {
    assert.strictEqual(findActiveSubtitleIdx(subs, 5500), -1);
  });
  it('returns 1 inside second block', () => {
    assert.strictEqual(findActiveSubtitleIdx(subs, 7000), 1);
  });
  it('returns -1 before all', () => {
    assert.strictEqual(findActiveSubtitleIdx(subs, 0), -1);
  });
  it('returns -1 after all', () => {
    assert.strictEqual(findActiveSubtitleIdx(subs, 15000), -1);
  });
  it('handles empty array', () => {
    assert.strictEqual(findActiveSubtitleIdx([], 1000), -1);
  });
});

describe('applyEditsToSrt', () => {
  const blocks = [
    { index: 1, startMs: 1000, endMs: 5000, text: 'First' },
    { index: 2, startMs: 6000, endMs: 10000, text: 'Second' },
    { index: 3, startMs: 11000, endMs: 15000, text: 'Third' },
  ];

  it('empty edits rebuild identical SRT', () => {
    const out = applyEditsToSrt(blocks, {});
    const expected = [
      '1',
      '00:00:01,000 --> 00:00:05,000',
      'First',
      '',
      '2',
      '00:00:06,000 --> 00:00:10,000',
      'Second',
      '',
      '3',
      '00:00:11,000 --> 00:00:15,000',
      'Third',
      '',
    ].join('\n');
    assert.strictEqual(out, expected);
  });

  it('replaces one block text', () => {
    const out = applyEditsToSrt(blocks, { 1: 'Перший' });
    assert.match(out, /\n2\n00:00:06,000 --> 00:00:10,000\nПерший\n/);
    // Other blocks untouched.
    assert.match(out, /\nFirst\n/);
    assert.match(out, /\nThird\n/);
  });

  it('replaces multiple blocks', () => {
    const out = applyEditsToSrt(blocks, { 0: 'A', 2: 'C' });
    const lines = out.split('\n');
    assert.strictEqual(lines[2], 'A');
    assert.strictEqual(lines[10], 'C');
  });

  it('preserves multiline edits', () => {
    const out = applyEditsToSrt(blocks, { 0: 'Line 1\nLine 2' });
    assert.ok(
      out.startsWith('1\n00:00:01,000 --> 00:00:05,000\nLine 1\nLine 2\n'),
      'expected multiline edit at block 0, got: ' + out.slice(0, 80),
    );
  });

  it('ignores edits with indices outside block range', () => {
    const out = applyEditsToSrt(blocks, { 99: 'ghost' });
    assert.doesNotMatch(out, /ghost/);
    // Result equals empty-edits case.
    assert.strictEqual(out, applyEditsToSrt(blocks, {}));
  });

  it('edit equal to original is effectively a noop', () => {
    const out = applyEditsToSrt(blocks, { 0: 'First' });
    assert.strictEqual(out, applyEditsToSrt(blocks, {}));
  });

  it('returns empty string for empty blocks', () => {
    assert.strictEqual(applyEditsToSrt([], {}), '');
  });

  it('keeps sequential numbering starting at 1', () => {
    const out = applyEditsToSrt(blocks, {});
    const lines = out.split('\n');
    assert.strictEqual(lines[0], '1');
    assert.strictEqual(lines[4], '2');
    assert.strictEqual(lines[8], '3');
  });
});
