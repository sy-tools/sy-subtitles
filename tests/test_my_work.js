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
  const base = { number: 7, title: `Markers: ${TALK} / Test-Video`, html_url: 'https://x/7' };
  it('excludes "Review:" tracking issues — creating one is not doing the work', () => {
    // A "Review: <id>" issue is a tracking artifact whoever clicks
    // take-for-review first; the review's owner is the ASSIGNEE (the
    // reviewer field), which the assigned source already covers. Without
    // this exclusion, a talk someone else reviews shows up in the
    // creator's "work I started" group (live bug: issue #2 Guru-Puja).
    assert.strictEqual(classifyWorkRow({ number: 2, title: `Review: ${TALK}`, state: 'open', html_url: 'u2' }), null);
  });
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
  it('classifies a draft PR as its own state', () => {
    const r = classifyWorkRow({ ...base, state: 'open', draft: true,
      pull_request: { merged_at: null } });
    assert.strictEqual(r.state, 'draft');
  });
  it('classifies a merged PR (closed + merged_at)', () => {
    const r = classifyWorkRow({ ...base, state: 'closed',
      pull_request: { merged_at: '2026-07-01T00:00:00Z' } });
    assert.strictEqual(r.state, 'merged');
  });
  it('excludes a closed-unmerged PR (teardown-closed sync noise)', () => {
    assert.strictEqual(
      classifyWorkRow({ ...base, state: 'closed', pull_request: { merged_at: null } }), null);
  });
  it('returns null for an unmappable title', () => {
    assert.strictEqual(classifyWorkRow({ number: 1, title: 'nope', state: 'open', html_url: 'u' }), null);
  });
});

describe('buildMyWork', () => {
  const known = {}; known[TALK] = true;
  it('groups mapped rows by talk and drops unknown talk ids', () => {
    const map = buildMyWork([
      { number: 9, title: `Markers: ${TALK} / Test-Video`, state: 'open', html_url: 'u9' },
      { number: 3, title: `Edit sync: ${TALK} (t)`, state: 'open', html_url: 'u3', pull_request: { merged_at: null } },
      { number: 5, title: 'Markers: 1900-01-01_Deleted-Talk / V', state: 'open', html_url: 'u5' },
      { number: 6, title: 'unrelated', state: 'open', html_url: 'u6' },
      { number: 2, title: `Review: ${TALK}`, state: 'open', html_url: 'u2' },
    ], known);
    assert.deepStrictEqual(Object.keys(map), [TALK]);
    assert.deepStrictEqual(map[TALK].map((i) => i.number), [3, 9]); // sorted; Review: #2 excluded
  });
});

describe('myWorkItemsFor', () => {
  const map = { [TALK]: [
    { talkId: TALK, kind: 'pr', state: 'open', number: 1, url: 'u1' },
    { talkId: TALK, kind: 'pr', state: 'merged', number: 2, url: 'u2' },
    { talkId: TALK, kind: 'issue', state: 'closed', number: 3, url: 'u3' },
    { talkId: TALK, kind: 'pr', state: 'draft', number: 4, url: 'u4' },
  ] };
  it('normal mode returns active items (open + draft)', () => {
    assert.deepStrictEqual(myWorkItemsFor(map, TALK, false).map((i) => i.number), [1, 4]);
  });
  it('expert mode returns all states', () => {
    assert.deepStrictEqual(myWorkItemsFor(map, TALK, true).map((i) => i.number), [1, 2, 3, 4]);
  });
  it('tolerates a null map and unknown talk', () => {
    assert.deepStrictEqual(myWorkItemsFor(null, TALK, true), []);
    assert.deepStrictEqual(myWorkItemsFor(map, 'other', true), []);
  });
});
