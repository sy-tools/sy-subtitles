const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseAddTalkHash } = require('../site/js/add_talk_data');

// The bookmarklet encodes its payload exactly like this, then opens the SPA
// at `<base>#/add?data=<encoded>`. These helpers reproduce that round trip so
// the tests exercise the real encode → URL → decode path.
function encodePayload(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}
function hashFor(obj) {
  return '#/add?data=' + encodePayload(obj);
}

const validTalk = {
  t: 'Knots on the Three Channels',
  d: '1978-10-02',
  u: 'https://www.amruta.org/1978/10/02/knots-on-the-three-channels-caxton-hall-1978/',
  loc: 'Caxton Hall',
  v: [{ id: '123456', h: 'abcd', l: 'Talk' }],
  tx: 'Some transcript text.',
};

describe('parseAddTalkHash — routing states', () => {
  it('returns setup when there is no query string', () => {
    assert.deepStrictEqual(parseAddTalkHash('#/add'), { state: 'setup', data: null });
  });

  it('returns setup when query string lacks a data param', () => {
    assert.deepStrictEqual(parseAddTalkHash('#/add?foo=1'), { state: 'setup', data: null });
  });

  it('returns form with parsed data for a valid amruta payload', () => {
    const res = parseAddTalkHash(hashFor(validTalk));
    assert.strictEqual(res.state, 'form');
    assert.deepStrictEqual(res.data, validTalk);
  });

  it('returns wrong_site when the url is not amruta.org', () => {
    const res = parseAddTalkHash(hashFor({ ...validTalk, u: 'https://example.com/x' }));
    assert.strictEqual(res.state, 'wrong_site');
  });

  it('returns wrong_site when the url is missing', () => {
    const { u, ...noUrl } = validTalk;
    const res = parseAddTalkHash(hashFor(noUrl));
    assert.strictEqual(res.state, 'wrong_site');
  });

  it('returns parse_error on a corrupted (non-JSON) data param', () => {
    const res = parseAddTalkHash('#/add?data=' + encodeURIComponent('{not-json'));
    assert.strictEqual(res.state, 'parse_error');
  });
});

// Regression: a literal '%' in the title or transcript (e.g. "100%") used to
// trip a redundant decodeURIComponent on already-decoded text, throwing
// "URI malformed" and surfacing the misleading "Wrong site" error.
describe('parseAddTalkHash — literal percent in content', () => {
  it('parses a title containing a percent sign', () => {
    const obj = { ...validTalk, t: 'You are 100% pure' };
    const res = parseAddTalkHash(hashFor(obj));
    assert.strictEqual(res.state, 'form');
    assert.strictEqual(res.data.t, 'You are 100% pure');
  });

  it('parses a transcript containing percent and ampersand', () => {
    const obj = { ...validTalk, tx: 'He said 30% of attention & more.' };
    const res = parseAddTalkHash(hashFor(obj));
    assert.strictEqual(res.state, 'form');
    assert.strictEqual(res.data.tx, 'He said 30% of attention & more.');
  });

  it('preserves a hash/pound sign in content', () => {
    const obj = { ...validTalk, tx: 'Section #1 and 50% done' };
    const res = parseAddTalkHash(hashFor(obj));
    assert.strictEqual(res.state, 'form');
    assert.strictEqual(res.data.tx, 'Section #1 and 50% done');
  });
});
