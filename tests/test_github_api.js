const { describe, it } = require('node:test');
const assert = require('node:assert');
const { authHeaders, exchangeCode, getViewer } = require('../site/js/github_api');

function fetchDouble(status, payload, capture) {
  return async (url, init) => {
    if (capture) { capture.url = url; capture.init = init || {}; }
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

describe('authHeaders', () => {
  it('builds a Bearer header from a token and {} from nothing', () => {
    assert.deepStrictEqual(authHeaders('gho_x'), { Authorization: 'Bearer gho_x' });
    assert.deepStrictEqual(authHeaders(null), {});
    assert.deepStrictEqual(authHeaders(''), {});
  });
});

describe('exchangeCode', () => {
  it('POSTs {code} as JSON and resolves the token', async () => {
    const capture = {};
    const token = await exchangeCode('https://w.example/exchange', 'c1', fetchDouble(200, { token: 'gho_t' }, capture));
    assert.strictEqual(token, 'gho_t');
    assert.strictEqual(capture.url, 'https://w.example/exchange');
    assert.strictEqual(capture.init.method, 'POST');
    assert.deepStrictEqual(JSON.parse(capture.init.body), { code: 'c1' });
  });
  it('rejects with Error{status} on an {error} payload', async () => {
    await assert.rejects(
      exchangeCode('https://w.example/exchange', 'c1', fetchDouble(502, { error: 'bad_verification_code' })),
      (e) => e.status === 502 && /bad_verification_code/.test(e.message));
  });
  it('rejects on a 200 without token (malformed worker reply)', async () => {
    await assert.rejects(exchangeCode('https://w.example/exchange', 'c1', fetchDouble(200, {})));
  });
});

describe('getViewer', () => {
  it('GETs /user with the Bearer header and trims the profile', async () => {
    const capture = {};
    const u = await getViewer('gho_x', fetchDouble(200, { login: 'ira', avatar_url: 'http://a/i.png', id: 5 }, capture));
    assert.deepStrictEqual(u, { login: 'ira', avatar_url: 'http://a/i.png' });
    assert.strictEqual(capture.url, 'https://api.github.com/user');
    assert.strictEqual(capture.init.headers.Authorization, 'Bearer gho_x');
  });
  it('rejects with status 401 on a revoked token', async () => {
    await assert.rejects(getViewer('gho_x', fetchDouble(401, { message: 'Bad credentials' })),
      (e) => e.status === 401);
  });
});
