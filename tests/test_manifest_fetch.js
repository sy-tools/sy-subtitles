const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  rateLimitInfo,
  makeManifestError,
  minutesUntilReset,
  reviewStatusFallback,
  staleNotice,
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

describe('reviewStatusFallback — never clobber good statuses with empties', () => {
  const good = { talks: { a: { status: 'approved' }, b: { status: 'in-progress' } } };
  const cached = { talks: { a: { status: 'approved' } } };
  const empty = { talks: {} };

  it('keeps the current in-memory status when it has entries (ignores cache)', () => {
    assert.strictEqual(reviewStatusFallback(good, cached), good);
  });
  it('falls back to the cached copy when current is empty', () => {
    assert.strictEqual(reviewStatusFallback(empty, cached), cached);
  });
  it('falls back to the cached copy when current is null', () => {
    assert.strictEqual(reviewStatusFallback(null, cached), cached);
  });
  it('returns an empty status set when neither current nor cache has data', () => {
    assert.deepStrictEqual(reviewStatusFallback(empty, empty), { talks: {} });
    assert.deepStrictEqual(reviewStatusFallback(null, null), { talks: {} });
  });
  it('treats a current without a talks map as empty', () => {
    assert.strictEqual(reviewStatusFallback({}, cached), cached);
  });
  it('ignores a cached object that lacks a talks map', () => {
    assert.deepStrictEqual(reviewStatusFallback(empty, {}), { talks: {} });
    assert.deepStrictEqual(reviewStatusFallback(null, {}), { talks: {} });
  });
});

describe('staleNotice — persistent stale-banner content', () => {
  const now = 1700000000 * 1000;
  it('returns null for a fresh (or missing) manifest', () => {
    assert.strictEqual(staleNotice(null, now), null);
    assert.strictEqual(staleNotice({ talks: [] }, now), null);
    assert.strictEqual(staleNotice({ _stale: false }, now), null);
  });
  it('reports offline for a network/http stale reason', () => {
    assert.deepStrictEqual(staleNotice({ _stale: true, _staleReason: 'network' }, now), { key: 'stale.offline', min: null });
    assert.deepStrictEqual(staleNotice({ _stale: true, _staleReason: 'http' }, now), { key: 'stale.offline', min: null });
  });
  it('reports a rate-limit with minutes when a future reset is known', () => {
    assert.deepStrictEqual(
      staleNotice({ _stale: true, _staleReason: 'rate_limit', _rlReset: 1700000000 + 600 }, now),
      { key: 'stale.rate_limit', min: 10 },
    );
  });
  it('falls back to offline when a rate-limit reset is absent or already past', () => {
    assert.deepStrictEqual(staleNotice({ _stale: true, _staleReason: 'rate_limit', _rlReset: null }, now), { key: 'stale.offline', min: null });
    assert.deepStrictEqual(staleNotice({ _stale: true, _staleReason: 'rate_limit', _rlReset: 1700000000 - 100 }, now), { key: 'stale.offline', min: null });
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
