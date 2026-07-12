const { describe, it } = require('node:test');
const assert = require('node:assert');
const { handleExchange } = require('../workers/oauth-exchange/exchange');

const ENV = {
  GH_CLIENT_ID: 'Iv1.test',
  GH_CLIENT_SECRET: 'shhh',
  ALLOWED_ORIGINS: 'https://sy-tools.github.io,http://localhost:8000',
};

function req(opts) {
  opts = opts || {};
  return new Request('https://worker.example/exchange', {
    method: opts.method || 'POST',
    headers: Object.assign({ Origin: opts.origin || 'https://sy-tools.github.io' }, opts.headers || {}),
    body: opts.method === 'OPTIONS' || opts.method === 'GET' ? undefined
      : JSON.stringify(opts.body !== undefined ? opts.body : { code: 'abc123' }),
  });
}

// fetch double for github.com/login/oauth/access_token
function ghFetch(status, payload, capture) {
  return async (url, init) => {
    if (capture) { capture.url = url; capture.init = init; }
    return new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

describe('handleExchange', () => {
  it('exchanges a code for a token and passes client credentials to GitHub', async () => {
    const capture = {};
    const r = await handleExchange(req({}), ENV, ghFetch(200, { access_token: 'gho_x' }, capture));
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(await r.json(), { token: 'gho_x' });
    assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), 'https://sy-tools.github.io');
    assert.strictEqual(capture.url, 'https://github.com/login/oauth/access_token');
    const sent = JSON.parse(capture.init.body);
    assert.deepStrictEqual(sent, { client_id: 'Iv1.test', client_secret: 'shhh', code: 'abc123' });
    assert.strictEqual(capture.init.headers['Accept'], 'application/json');
  });

  it('answers OPTIONS preflight with 204 + CORS headers', async () => {
    const r = await handleExchange(req({ method: 'OPTIONS' }), ENV, ghFetch(200, {}));
    assert.strictEqual(r.status, 204);
    assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), 'https://sy-tools.github.io');
    assert.match(r.headers.get('Access-Control-Allow-Methods'), /POST/);
  });

  it('rejects a disallowed origin with 403 and no CORS grant', async () => {
    const r = await handleExchange(req({ origin: 'https://evil.example' }), ENV, ghFetch(200, {}));
    assert.strictEqual(r.status, 403);
    assert.strictEqual(r.headers.get('Access-Control-Allow-Origin'), null);
  });

  it('rejects non-POST with 405', async () => {
    const r = await handleExchange(req({ method: 'GET' }), ENV, ghFetch(200, {}));
    assert.strictEqual(r.status, 405);
  });

  it('rejects a missing/blank code with 400 without calling GitHub', async () => {
    let called = false;
    const f = async () => { called = true; return new Response('{}'); };
    for (const body of [{}, { code: '' }, { code: 42 }, null]) {
      const r = await handleExchange(req({ body }), ENV, f);
      assert.strictEqual(r.status, 400);
    }
    assert.strictEqual(called, false);
  });

  it('maps a GitHub error payload to 502 {error} (never leaks the secret)', async () => {
    const r = await handleExchange(req({}), ENV, ghFetch(200, { error: 'bad_verification_code' }));
    assert.strictEqual(r.status, 502);
    const body = await r.json();
    assert.strictEqual(body.error, 'bad_verification_code');
    assert.ok(!JSON.stringify(body).includes('shhh'));
  });

  it('maps a GitHub HTTP failure to 502', async () => {
    const r = await handleExchange(req({}), ENV, ghFetch(500, {}));
    assert.strictEqual(r.status, 502);
  });
});
