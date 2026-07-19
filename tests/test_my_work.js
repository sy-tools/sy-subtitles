const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseTalkIdFromTitle, classifyWorkRow, buildMyWork, myWorkItemsFor } =
  require('../site/js/my_work');

const TALK = '2001-01-01_Test-Talk';

describe('parseTalkIdFromTitle', () => {
  it('parses the three producer title contracts', () => {
    assert.strictEqual(parseTalkIdFromTitle(`Edit sync: ${TALK} (tester)`), TALK);
    assert.strictEqual(parseTalkIdFromTitle(`Review: ${TALK}`), TALK);
    assert.strictEqual(parseTalkIdFromTitle(`Markers: ${TALK} / Test-Video`), TALK);
  });
  it('falls back to the first date-slug token anywhere in the title', () => {
    assert.strictEqual(parseTalkIdFromTitle(`fix(uk): ${TALK} punctuation`), TALK);
  });
  it('returns null when nothing maps', () => {
    assert.strictEqual(parseTalkIdFromTitle('Random maintenance chore'), null);
    assert.strictEqual(parseTalkIdFromTitle(''), null);
    assert.strictEqual(parseTalkIdFromTitle(null), null);
  });
});

describe('classifyWorkRow', () => {
  const base = { number: 7, title: `Review: ${TALK}`, html_url: 'https://x/7' };
  it('classifies an open issue', () => {
    assert.deepStrictEqual(classifyWorkRow({ ...base, state: 'open' }),
      { talkId: TALK, kind: 'issue', state: 'open', number: 7, url: 'https://x/7' });
  });
  it('classifies a closed issue', () => {
    assert.strictEqual(classifyWorkRow({ ...base, state: 'closed' }).state, 'closed');
  });
  it('classifies an open PR (pull_request key, no merged_at)', () => {
    const r = classifyWorkRow({ ...base, state: 'open', pull_request: { merged_at: null } });
    assert.strictEqual(r.kind, 'pr');
    assert.strictEqual(r.state, 'open');
  });
  it('classifies a merged PR (closed + merged_at)', () => {
    const r = classifyWorkRow({ ...base, state: 'closed',
      pull_request: { merged_at: '2026-07-01T00:00:00Z' } });
    assert.strictEqual(r.state, 'merged');
  });
  it('classifies a closed-unmerged PR (teardown-closed sync PR)', () => {
    const r = classifyWorkRow({ ...base, state: 'closed', pull_request: { merged_at: null } });
    assert.strictEqual(r.state, 'closed');
  });
  it('returns null for an unmappable title', () => {
    assert.strictEqual(classifyWorkRow({ number: 1, title: 'nope', state: 'open', html_url: 'u' }), null);
  });
});

describe('buildMyWork', () => {
  const known = {}; known[TALK] = true;
  it('groups mapped rows by talk and drops unknown talk ids', () => {
    const map = buildMyWork([
      { number: 9, title: `Review: ${TALK}`, state: 'open', html_url: 'u9' },
      { number: 3, title: `Edit sync: ${TALK} (t)`, state: 'open', html_url: 'u3', pull_request: { merged_at: null } },
      { number: 5, title: 'Review: 1900-01-01_Deleted-Talk', state: 'open', html_url: 'u5' },
      { number: 6, title: 'unrelated', state: 'open', html_url: 'u6' },
    ], known);
    assert.deepStrictEqual(Object.keys(map), [TALK]);
    assert.deepStrictEqual(map[TALK].map((i) => i.number), [3, 9]); // sorted by number
  });
});

describe('myWorkItemsFor', () => {
  const map = { [TALK]: [
    { talkId: TALK, kind: 'pr', state: 'open', number: 1, url: 'u1' },
    { talkId: TALK, kind: 'pr', state: 'merged', number: 2, url: 'u2' },
    { talkId: TALK, kind: 'issue', state: 'closed', number: 3, url: 'u3' },
  ] };
  it('normal mode returns only open items', () => {
    assert.deepStrictEqual(myWorkItemsFor(map, TALK, false).map((i) => i.number), [1]);
  });
  it('expert mode returns all states', () => {
    assert.deepStrictEqual(myWorkItemsFor(map, TALK, true).map((i) => i.number), [1, 2, 3]);
  });
  it('tolerates a null map and unknown talk', () => {
    assert.deepStrictEqual(myWorkItemsFor(null, TALK, true), []);
    assert.deepStrictEqual(myWorkItemsFor(map, 'other', true), []);
  });
});
