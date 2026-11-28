const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  STATE_BRANCH,
  stateStatusUrl,
  newerStatus,
  fetchReviewStatusFile,
} = require('../site/js/review_status_source');

const RAW_ROOT = 'https://raw.githubusercontent.com/o/r';
const STATE_URL = RAW_ROOT + '/state/review-status.json';
const FALLBACK_URL = RAW_ROOT + '/' + '1'.repeat(40) + '/review-status.json?v=' + 'a'.repeat(40);

function doc(updatedAt, status) {
  return { version: 1, updated_at: updatedAt, talks: { 'talk-a': { status: status || 'pending' } } };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: function () {
      return typeof body === 'string' ? Promise.reject(new SyntaxError('not JSON')) : Promise.resolve(body);
    },
  };
}

function fetchDouble(responseOrNetworkErrorByUrl) {
  const calls = [];
  const impl = function (url, init) {
    calls.push({ url: url, init: init || {} });
    const answer = responseOrNetworkErrorByUrl[url];
    if (answer === undefined) return Promise.reject(new Error('unexpected request: ' + url));
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  };
  impl.calls = calls;
  impl.urls = function () { return calls.map(function (c) { return c.url; }); };
  return impl;
}

describe('stateStatusUrl', () => {
  it('names the file on the data branch, whatever branch the app is showing', () => {
    assert.strictEqual(stateStatusUrl(RAW_ROOT), RAW_ROOT + '/' + STATE_BRANCH + '/review-status.json');
  });
});

describe('newerStatus — the later updated_at wins', () => {
  const OLD = doc('2026-11-28T06:11:38.128059+00:00');
  const NEW = doc('2026-11-28T06:15:02.000001+00:00');

  it('keeps the later copy, whichever side it is on', () => {
    assert.strictEqual(newerStatus(OLD, NEW), NEW);
    assert.strictEqual(newerStatus(NEW, OLD), NEW);
  });
  it('prefers the first argument on a tie, so a re-read replaces what it re-read', () => {
    const twin = doc(NEW.updated_at);
    assert.strictEqual(newerStatus(twin, NEW), twin);
  });
  it('takes the only copy there is', () => {
    assert.strictEqual(newerStatus(OLD, null), OLD);
    assert.strictEqual(newerStatus(null, OLD), OLD);
    assert.strictEqual(newerStatus(undefined, undefined), null);
  });
  it('ranks a copy without a stamp below any stamped one', () => {
    const unstamped = { talks: {} };
    assert.strictEqual(newerStatus(unstamped, OLD), OLD);
    assert.strictEqual(newerStatus(OLD, unstamped), OLD);
  });
  it('orders a stamp written on a whole second before one within that second', () => {
    // Python's isoformat() drops the fraction when it is zero.
    const onTheSecond = doc('2026-11-28T06:15:02+00:00');
    const withinIt = doc('2026-11-28T06:15:02.000001+00:00');
    assert.strictEqual(newerStatus(onTheSecond, withinIt), withinIt);
  });
});

describe('fetchReviewStatusFile', () => {
  it('reads the data branch in one request and never asks for the fallback', async () => {
    const fetchImpl = fetchDouble({ [STATE_URL]: jsonResponse(200, doc('2026-11-28T07:00:00+00:00', 'approved')) });
    const got = await fetchReviewStatusFile({ stateUrl: STATE_URL, fallbackUrl: FALLBACK_URL, fetchImpl });
    assert.strictEqual(got.talks['talk-a'].status, 'approved');
    assert.deepStrictEqual(fetchImpl.urls(), [STATE_URL]);
  });

  it('reads the data branch past the HTTP cache', async () => {
    // raw.githubusercontent answers max-age=300: the browser's own cache would
    // add five minutes on top of the five the CDN may already be behind.
    const fetchImpl = fetchDouble({ [STATE_URL]: jsonResponse(200, doc('2026-11-28T07:00:00+00:00')) });
    await fetchReviewStatusFile({ stateUrl: STATE_URL, fallbackUrl: FALLBACK_URL, fetchImpl });
    assert.strictEqual(fetchImpl.calls[0].init.cache, 'no-store');
  });

  it('falls back when the data branch does not exist yet', async () => {
    const fetchImpl = fetchDouble({
      [STATE_URL]: jsonResponse(404, 'Not Found'),
      [FALLBACK_URL]: jsonResponse(200, doc('2026-11-01T00:00:00+00:00', 'in-progress')),
    });
    const got = await fetchReviewStatusFile({ stateUrl: STATE_URL, fallbackUrl: FALLBACK_URL, fetchImpl });
    assert.strictEqual(got.talks['talk-a'].status, 'in-progress');
    assert.deepStrictEqual(fetchImpl.urls(), [STATE_URL, FALLBACK_URL]);
  });

  it('falls back when the data branch cannot be reached', async () => {
    const fetchImpl = fetchDouble({
      [STATE_URL]: new TypeError('Failed to fetch'),
      [FALLBACK_URL]: jsonResponse(200, doc('2026-11-01T00:00:00+00:00', 'in-progress')),
    });
    const got = await fetchReviewStatusFile({ stateUrl: STATE_URL, fallbackUrl: FALLBACK_URL, fetchImpl });
    assert.strictEqual(got.talks['talk-a'].status, 'in-progress');
  });

  it('falls back when the answer is not a status document', async () => {
    // A captive portal answers 200 with its own page; JSON without `talks`
    // would zero every badge just as an empty set does.
    for (const body of ['<html>sign in</html>', { message: 'hello' }, [], null]) {
      const fetchImpl = fetchDouble({
        [STATE_URL]: jsonResponse(200, body),
        [FALLBACK_URL]: jsonResponse(200, doc('2026-11-01T00:00:00+00:00', 'in-progress')),
      });
      const got = await fetchReviewStatusFile({ stateUrl: STATE_URL, fallbackUrl: FALLBACK_URL, fetchImpl });
      assert.strictEqual(got.talks['talk-a'].status, 'in-progress', 'body: ' + JSON.stringify(body));
    }
  });

  it('rejects when neither copy can be read, so the caller keeps what it has', async () => {
    const fetchImpl = fetchDouble({
      [STATE_URL]: new TypeError('Failed to fetch'),
      [FALLBACK_URL]: jsonResponse(404, 'Not Found'),
    });
    await assert.rejects(
      fetchReviewStatusFile({ stateUrl: STATE_URL, fallbackUrl: FALLBACK_URL, fetchImpl }),
      /Failed to fetch/,
      'the data branch failure is the one worth reporting',
    );
  });

  it('rejects without a second request when no fallback is given', async () => {
    const fetchImpl = fetchDouble({ [STATE_URL]: jsonResponse(404, 'Not Found') });
    await assert.rejects(fetchReviewStatusFile({ stateUrl: STATE_URL, fetchImpl }), /HTTP 404/);
    assert.deepStrictEqual(fetchImpl.urls(), [STATE_URL]);
  });
});
