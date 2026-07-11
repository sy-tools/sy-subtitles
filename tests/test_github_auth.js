const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  makeAuthState, buildAuthorizeUrl, parseAuthCallback, isValidAuthCallback,
  stripAuthParams, saveAuth, getAuthToken, getAuthUser, clearAuth,
} = require('../site/js/github_auth');

function fakeStorage() {
  const m = {};
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    _m: m,
  };
}

describe('makeAuthState', () => {
  it('produces 32 lowercase hex chars from the injected RNG', () => {
    const state = makeAuthState((arr) => { for (let i = 0; i < arr.length; i++) arr[i] = i * 16 + 15; });
    assert.match(state, /^[0-9a-f]{32}$/);
    assert.strictEqual(state.slice(0, 4), '0f1f');
  });
  it('zero bytes still yield fixed-width hex (leading zeros kept)', () => {
    const state = makeAuthState((arr) => arr.fill(0));
    assert.strictEqual(state, '0'.repeat(32));
  });
});

describe('buildAuthorizeUrl', () => {
  it('points at github authorize with encoded client_id, state, redirect_uri', () => {
    const u = buildAuthorizeUrl('Iv1.abc', 's&1', 'http://localhost:8000/?repo=a/b');
    assert.ok(u.startsWith('https://github.com/login/oauth/authorize?'));
    assert.ok(u.includes('client_id=Iv1.abc'));
    assert.ok(u.includes('state=s%261'));
    assert.ok(u.includes('redirect_uri=http%3A%2F%2Flocalhost%3A8000%2F%3Frepo%3Da%2Fb'));
  });
});

describe('parseAuthCallback / isValidAuthCallback', () => {
  it('extracts code+state from a callback query', () => {
    assert.deepStrictEqual(parseAuthCallback('?repo=a/b&code=c1&state=s1'), { code: 'c1', state: 's1' });
  });
  it('returns null when there is no code (normal page loads)', () => {
    assert.strictEqual(parseAuthCallback('?repo=a/b'), null);
    assert.strictEqual(parseAuthCallback(''), null);
  });
  it('accepts only a matching non-empty saved state (CSRF)', () => {
    assert.strictEqual(isValidAuthCallback({ code: 'c', state: 's1' }, 's1'), true);
    assert.strictEqual(isValidAuthCallback({ code: 'c', state: 's1' }, 's2'), false);
    assert.strictEqual(isValidAuthCallback({ code: 'c', state: '' }, ''), false);
    assert.strictEqual(isValidAuthCallback({ code: 'c', state: 's1' }, null), false);
    assert.strictEqual(isValidAuthCallback(null, 's1'), false);
  });
});

describe('stripAuthParams', () => {
  it('removes auth params but keeps app params like repo/branch', () => {
    assert.strictEqual(
      stripAuthParams('?repo=a%2Fb&code=c&state=s&installation_id=1&setup_action=install&branch=dev'),
      '?repo=a%2Fb&branch=dev');
  });
  it('returns empty string when nothing is left', () => {
    assert.strictEqual(stripAuthParams('?code=c&state=s'), '');
  });
});

describe('auth storage', () => {
  it('round-trips token and trimmed user profile', () => {
    const s = fakeStorage();
    saveAuth('gho_x', { login: 'ira', avatar_url: 'http://a/i.png', extra: 'dropped' }, s);
    assert.strictEqual(getAuthToken(s), 'gho_x');
    assert.deepStrictEqual(getAuthUser(s), { login: 'ira', avatar_url: 'http://a/i.png' });
    clearAuth(s);
    assert.strictEqual(getAuthToken(s), null);
    assert.strictEqual(getAuthUser(s), null);
  });
  it('getAuthUser survives corrupted JSON', () => {
    const s = fakeStorage();
    s.setItem('sy_gh_user', '{nope');
    assert.strictEqual(getAuthUser(s), null);
  });
});
