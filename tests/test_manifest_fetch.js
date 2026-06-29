const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  rateLimitInfo,
  makeManifestError,
  minutesUntilReset,
} = require('../site/js/manifest_fetch');

// header getter double — case-sensitive exact map (production passes a
// case-insensitive r.headers.get, but we query the canonical casing).
function hdr(map) {
  return function (name) {
    return Object.prototype.hasOwnProperty.call(map, name) ? map[name] : null;
  };
}

describe('rateLimitInfo', () => {
  it('flags a 403 with remaining=0 as rate-limited and parses the reset epoch', () => {
    const info = rateLimitInfo(403, hdr({ 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '1700000000' }));
    assert.strictEqual(info.rateLimited, true);
    assert.strictEqual(info.rlReset, 1700000000);
  });
  it('flags a 429 with remaining=0 as rate-limited', () => {
    const info = rateLimitInfo(429, hdr({ 'X-RateLimit-Remaining': '0' }));
    assert.strictEqual(info.rateLimited, true);
    assert.strictEqual(info.rlReset, null);
  });
  it('a 403 with remaining>0 is NOT rate-limited (auth/abuse, not quota)', () => {
    const info = rateLimitInfo(403, hdr({ 'X-RateLimit-Remaining': '12' }));
    assert.strictEqual(info.rateLimited, false);
    assert.strictEqual(info.rlReset, null);
  });
  it('a 500 is never rate-limited regardless of headers', () => {
    const info = rateLimitInfo(500, hdr({ 'X-RateLimit-Remaining': '0' }));
    assert.strictEqual(info.rateLimited, false);
  });
  it('ignores a malformed / non-positive reset header', () => {
    assert.strictEqual(rateLimitInfo(403, hdr({ 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': 'nope' })).rlReset, null);
    assert.strictEqual(rateLimitInfo(403, hdr({ 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '0' })).rlReset, null);
  });
  it('tolerates missing headers and a missing getter', () => {
    assert.strictEqual(rateLimitInfo(403, hdr({})).rateLimited, false);
    assert.strictEqual(rateLimitInfo(403, null).rateLimited, false);
  });
});

describe('makeManifestError', () => {
  it('is an Error carrying status + rate-limit fields and a readable message', () => {
    const e = makeManifestError(403, { rateLimited: true, rlReset: 1700000000 });
    assert.ok(e instanceof Error);
    assert.match(e.message, /403/);
    assert.strictEqual(e.status, 403);
    assert.strictEqual(e.rateLimited, true);
    assert.strictEqual(e.rlReset, 1700000000);
  });
  it('defaults the rate fields when info is missing', () => {
    const e = makeManifestError(500);
    assert.strictEqual(e.status, 500);
    assert.strictEqual(e.rateLimited, false);
    assert.strictEqual(e.rlReset, null);
  });
});

describe('minutesUntilReset', () => {
  const now = 1700000000 * 1000;
  it('rounds the minutes until reset up', () => {
    assert.strictEqual(minutesUntilReset(1700000000 + 60, now), 1);
    assert.strictEqual(minutesUntilReset(1700000000 + 61, now), 2);
  });
  it('returns 0 when the reset is already in the past', () => {
    assert.strictEqual(minutesUntilReset(1700000000 - 100, now), 0);
  });
  it('returns null when there is no reset', () => {
    assert.strictEqual(minutesUntilReset(null, now), null);
    assert.strictEqual(minutesUntilReset(0, now), null);
  });
});
