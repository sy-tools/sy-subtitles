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

// ---------------------------------------------------------------------------
// Write-path additions (issues / branches / contents / pulls)
// ---------------------------------------------------------------------------
const {
  utf8ToBase64, makeBranchName, createIssue, addAssignees,
  getBranchHeadSha, createRef, getFileSha, putFile, createPull, submitFilesPr,
  isIntegrationAccessError,
} = require('../site/js/github_api');

describe('isIntegrationAccessError', () => {
  it('recognizes the 403 "Resource not accessible by integration" reply', () => {
    assert.strictEqual(isIntegrationAccessError(
      { status: 403, message: 'Resource not accessible by integration' }), true);
  });
  it('rejects other 403s, other statuses, and empty errors', () => {
    assert.strictEqual(isIntegrationAccessError({ status: 403, message: 'Forbidden' }), false);
    assert.strictEqual(isIntegrationAccessError({ status: 404, message: 'Resource not accessible by integration' }), false);
    assert.strictEqual(isIntegrationAccessError({ status: 403 }), false);
    assert.strictEqual(isIntegrationAccessError(null), false);
  });
});

const API = 'https://api.github.com/repos/sy-tools/sy-subtitles';

// Router double: dispatches on "METHOD url-substring", records every call.
function routerFetch(routes, calls) {
  return async (url, init) => {
    init = init || {};
    const method = init.method || 'GET';
    calls.push({ method, url, body: init.body ? JSON.parse(init.body) : null, headers: init.headers || {} });
    for (const r of routes) {
      if (method === r.method && url.includes(r.match)) {
        return new Response(JSON.stringify(r.payload), {
          status: r.status || 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    throw new Error('unrouted: ' + method + ' ' + url);
  };
}

describe('utf8ToBase64', () => {
  it('encodes Ukrainian text so GitHub decodes it back to UTF-8', () => {
    const b64 = utf8ToBase64('Привіт, Мамо!');
    assert.strictEqual(Buffer.from(b64, 'base64').toString('utf8'), 'Привіт, Мамо!');
  });
});

describe('makeBranchName', () => {
  it('builds prefix--login--HHMMSS from the injected date', () => {
    const d = new Date('2026-07-12T08:05:09Z');
    const name = makeBranchName('review/1993-05-09_Talk', 'slava', d);
    assert.match(name, /^review\/1993-05-09_Talk--slava--\d{6}$/);
  });
  it('sanitizes characters git refs cannot hold', () => {
    const d = new Date('2026-07-12T08:05:09Z');
    const name = makeBranchName('review/a b~c', 'l..in', d);
    assert.ok(!/[ ~^:?*\[\\]/.test(name) && !name.includes('..'));
  });
});

describe('createIssue', () => {
  it('POSTs title/body/labels/assignees with auth and returns number+url', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: '/issues', status: 201,
      payload: { number: 42, html_url: 'https://github.com/x/issues/42' } }], calls);
    const res = await createIssue(API, 'gho_x',
      { title: 'Review: t', body: 'b', labels: ['talk-review'], assignees: ['slava'] }, f);
    assert.deepStrictEqual(res, { number: 42, html_url: 'https://github.com/x/issues/42' });
    assert.strictEqual(calls[0].url, API + '/issues');
    assert.strictEqual(calls[0].headers.Authorization, 'Bearer gho_x');
    assert.deepStrictEqual(calls[0].body,
      { title: 'Review: t', body: 'b', labels: ['talk-review'], assignees: ['slava'] });
  });
  it('rejects with Error{status} on 422', async () => {
    const f = routerFetch([{ method: 'POST', match: '/issues', status: 422,
      payload: { message: 'Validation Failed' } }], []);
    await assert.rejects(createIssue(API, 'gho_x', { title: 't' }, f),
      (e) => e.status === 422 && /Validation Failed/.test(e.message));
  });
});

describe('addAssignees', () => {
  it('POSTs the logins to the issue assignees endpoint', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: '/issues/7/assignees', status: 201,
      payload: { number: 7 } }], calls);
    await addAssignees(API, 'gho_x', 7, ['slava'], f);
    assert.strictEqual(calls[0].url, API + '/issues/7/assignees');
    assert.deepStrictEqual(calls[0].body, { assignees: ['slava'] });
  });
});

describe('branch + contents + pull primitives', () => {
  it('getBranchHeadSha reads object.sha from git/ref', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'GET', match: '/git/ref/heads/main',
      payload: { object: { sha: 'abc123' } } }], calls);
    assert.strictEqual(await getBranchHeadSha(API, 'gho_x', 'main', f), 'abc123');
  });
  it('createRef POSTs refs/heads/<name> with the sha', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: '/git/refs', status: 201,
      payload: { ref: 'refs/heads/b' } }], calls);
    await createRef(API, 'gho_x', 'review/b', 'abc123', f);
    assert.deepStrictEqual(calls[0].body, { ref: 'refs/heads/review/b', sha: 'abc123' });
  });
  it('getFileSha returns the blob sha, and null on 404 (new file)', async () => {
    const f = routerFetch([
      { method: 'GET', match: '/contents/talks/a.txt', payload: { sha: 'blob1' } },
      { method: 'GET', match: '/contents/none.txt', status: 404, payload: { message: 'Not Found' } },
    ], []);
    assert.strictEqual(await getFileSha(API, 'gho_x', 'talks/a.txt', 'main', f), 'blob1');
    assert.strictEqual(await getFileSha(API, 'gho_x', 'none.txt', 'main', f), null);
  });
  it('putFile PUTs base64 content to the branch, sha only when updating', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'PUT', match: '/contents/', status: 201,
      payload: { content: {} } }], calls);
    await putFile(API, 'gho_x',
      { path: 'talks/t/transcript_uk.txt', branch: 'review/b', message: 'm', content: 'Привіт', sha: 'blob1' }, f);
    await putFile(API, 'gho_x',
      { path: 'talks/t/new.txt', branch: 'review/b', message: 'm', content: 'x', sha: null }, f);
    assert.strictEqual(calls[0].url, API + '/contents/talks/t/transcript_uk.txt');
    assert.strictEqual(Buffer.from(calls[0].body.content, 'base64').toString('utf8'), 'Привіт');
    assert.strictEqual(calls[0].body.sha, 'blob1');
    assert.strictEqual(calls[0].body.branch, 'review/b');
    assert.ok(!('sha' in calls[1].body));
  });
  it('createPull POSTs head/base/title/body and returns number+url', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: '/pulls', status: 201,
      payload: { number: 9, html_url: 'https://github.com/x/pull/9' } }], calls);
    const res = await createPull(API, 'gho_x', { head: 'review/b', base: 'main', title: 't', body: 'b' }, f);
    assert.deepStrictEqual(res, { number: 9, html_url: 'https://github.com/x/pull/9' });
    assert.deepStrictEqual(calls[0].body, { head: 'review/b', base: 'main', title: 't', body: 'b' });
  });
});

describe('submitFilesPr', () => {
  const FILES = [
    { path: 'talks/t/transcript_uk.txt', content: 'Нове' },
    { path: 'talks/t/extra.txt', content: 'x' },
  ];
  function routes(overrides) {
    return Object.assign({
      ref: { method: 'GET', match: '/git/ref/heads/main', payload: { object: { sha: 'base1' } } },
      newRef: { method: 'POST', match: '/git/refs', status: 201, payload: {} },
      sha1: { method: 'GET', match: '/contents/talks/t/transcript_uk.txt', payload: { sha: 'old1' } },
      sha2: { method: 'GET', match: '/contents/talks/t/extra.txt', status: 404, payload: {} },
      put: { method: 'PUT', match: '/contents/', status: 201, payload: { content: {} } },
      pull: { method: 'POST', match: '/pulls', status: 201,
        payload: { number: 5, html_url: 'https://github.com/x/pull/5' } },
    }, overrides);
  }
  it('runs ref->branch->per-file(sha,put)->pull and returns the PR', async () => {
    const calls = [];
    const f = routerFetch(Object.values(routes()), calls);
    const res = await submitFilesPr(API, 'gho_x', {
      branch: 'review/b', base: 'main', files: FILES,
      commitMessage: 'edit', prTitle: 'T', prBody: 'B',
    }, f);
    assert.deepStrictEqual(res, { number: 5, html_url: 'https://github.com/x/pull/5', branch: 'review/b' });
    const seq = calls.map((c) => c.method + ' ' + c.url.replace(API, ''));
    assert.deepStrictEqual(seq, [
      'GET /git/ref/heads/main',
      'POST /git/refs',
      'GET /contents/talks/t/transcript_uk.txt?ref=main',
      'PUT /contents/talks/t/transcript_uk.txt',
      'GET /contents/talks/t/extra.txt?ref=main',
      'PUT /contents/talks/t/extra.txt',
      'POST /pulls',
    ]);
    // update carries the old sha, brand-new file none
    assert.strictEqual(calls[3].body.sha, 'old1');
    assert.ok(!('sha' in calls[5].body));
  });
  it('a failure after the branch exists rejects with .branch for the UI link', async () => {
    const f = routerFetch(Object.values(routes({
      put: { method: 'PUT', match: '/contents/', status: 409, payload: { message: 'Conflict' } },
    })), []);
    await assert.rejects(submitFilesPr(API, 'gho_x', {
      branch: 'review/b', base: 'main', files: FILES,
      commitMessage: 'edit', prTitle: 'T', prBody: 'B',
    }, f), (e) => e.status === 409 && e.branch === 'review/b');
  });
  it('a failure before the branch exists rejects without .branch', async () => {
    const f = routerFetch(Object.values(routes({
      ref: { method: 'GET', match: '/git/ref/heads/main', status: 401, payload: { message: 'Bad credentials' } },
    })), []);
    await assert.rejects(submitFilesPr(API, 'gho_x', {
      branch: 'review/b', base: 'main', files: FILES,
      commitMessage: 'edit', prTitle: 'T', prBody: 'B',
    }, f), (e) => e.status === 401 && !e.branch);
  });
});

// ---------------------------------------------------------------------------
// Repo write-access probe: GET the repo root and read permissions.push.
// A user-to-server token reflects the USER's effective rights, so push=false
// means "not added to the repo" — the read-only-mode trigger.
// ---------------------------------------------------------------------------
const { getRepoPermissions } = require('../site/js/github_api');

describe('getRepoPermissions', () => {
  it('GETs the repo api root with the Bearer header and resolves {push:true}', async () => {
    const capture = {};
    const p = await getRepoPermissions('https://api.github.com/repos/o/r', 'gho_x',
      fetchDouble(200, { permissions: { push: true, pull: true } }, capture));
    assert.deepStrictEqual(p, { push: true });
    assert.strictEqual(capture.url, 'https://api.github.com/repos/o/r');
    assert.strictEqual(capture.init.headers.Authorization, 'Bearer gho_x');
  });
  it('resolves {push:false} when the user has read-only access', async () => {
    const p = await getRepoPermissions('https://api.github.com/repos/o/r', 'gho_x',
      fetchDouble(200, { permissions: { push: false, pull: true } }));
    assert.deepStrictEqual(p, { push: false });
  });
  it('resolves {push:false} when permissions are absent from the payload', async () => {
    const p = await getRepoPermissions('https://api.github.com/repos/o/r', 'gho_x',
      fetchDouble(200, { full_name: 'o/r' }));
    assert.deepStrictEqual(p, { push: false });
  });
  it('rejects with Error{status} on a non-OK reply (rate limit, bad token)', async () => {
    await assert.rejects(
      getRepoPermissions('https://api.github.com/repos/o/r', 'gho_x',
        fetchDouble(403, { message: 'API rate limit exceeded' })),
      (e) => e.status === 403 && /rate limit/.test(e.message));
  });
});
