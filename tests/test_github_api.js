const { describe, it } = require('node:test');
const assert = require('node:assert');
const { authHeaders, exchangeCode, getViewer, listIssueComments, passQa,
  withDeadline, GH_REQUEST_TIMEOUT_MS } = require('../site/js/github_api');

// Statuses the Fetch spec forbids a body on; Response throws otherwise.
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

function fetchDouble(status, payload, capture) {
  return async (url, init) => {
    if (capture) { capture.url = url; capture.init = init || {}; }
    const body = NULL_BODY_STATUSES.has(status) ? null : JSON.stringify(payload);
    return new Response(body, {
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
  it('GETs /user with the Bearer header and keeps login, avatar and the numeric id', async () => {
    const capture = {};
    const u = await getViewer('gho_x', fetchDouble(200, { login: 'ira', avatar_url: 'http://a/i.png', id: 5, email: 'x' }, capture));
    assert.deepStrictEqual(u, { login: 'ira', avatar_url: 'http://a/i.png', id: 5 });
    assert.strictEqual(capture.url, 'https://api.github.com/user');
    assert.strictEqual(capture.init.headers.Authorization, 'Bearer gho_x');
  });
  it('rejects with status 401 on a revoked token', async () => {
    await assert.rejects(getViewer('gho_x', fetchDouble(401, { message: 'Bad credentials' })),
      (e) => e.status === 401);
  });
});

// One canned response per request, in order; every request is recorded.
function fetchScript(responses, calls) {
  let i = 0;
  return async (url, init) => {
    calls.push({ url, method: (init && init.method) || 'GET', body: init && init.body });
    const [status, payload] = responses[i++];
    const body = NULL_BODY_STATUSES.has(status) ? null : JSON.stringify(payload);
    return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
  };
}

const OP_API = 'https://api.github.com/repos/o/r';

describe('listIssueComments', () => {
  it('returns author login and body of each comment', async () => {
    const calls = [];
    const rows = await listIssueComments(OP_API, 't', 7, fetchScript([[200, [
      { user: { login: 'github-actions[bot]', id: 1 }, body: 'hi', id: 9 },
    ]]], calls));
    assert.deepStrictEqual(rows, [{ user: { login: 'github-actions[bot]' }, body: 'hi' }]);
    assert.strictEqual(calls[0].url, OP_API + '/issues/7/comments?per_page=100&page=1');
  });
  it('pages on until a short page', async () => {
    const calls = [];
    const full = Array.from({ length: 100 }, () => ({ user: { login: 'a' }, body: 'x' }));
    const rows = await listIssueComments(OP_API, 't', 7, fetchScript([[200, full], [200, [{ user: { login: 'b' }, body: 'y' }]]], calls));
    assert.strictEqual(rows.length, 101);
    assert.strictEqual(calls[1].url, OP_API + '/issues/7/comments?per_page=100&page=2');
  });
});

describe('passQa', () => {
  it('adds op:qa-passed when the issue does not carry it', async () => {
    const calls = [];
    await passQa(OP_API, 't', 7, fetchScript([[200, { number: 7, labels: [{ name: 'op:qa' }] }], [200, []]], calls));
    assert.deepStrictEqual(calls.map((c) => c.method + ' ' + c.url), [
      'GET ' + OP_API + '/issues/7',
      'POST ' + OP_API + '/issues/7/labels',
    ]);
    assert.deepStrictEqual(JSON.parse(calls[1].body), { labels: ['op:qa-passed'] });
  });
  it('removes and re-adds a label left by a failed run, so the bot sees a new labeled event', async () => {
    const calls = [];
    await passQa(OP_API, 't', 7, fetchScript([
      [200, { number: 7, labels: [{ name: 'op:qa' }, { name: 'op:qa-passed' }] }], [200, []], [200, []],
    ], calls));
    assert.deepStrictEqual(calls.map((c) => c.method + ' ' + c.url), [
      'GET ' + OP_API + '/issues/7',
      'DELETE ' + OP_API + '/issues/7/labels/op%3Aqa-passed',
      'POST ' + OP_API + '/issues/7/labels',
    ]);
  });
  it('rejects with the status when GitHub refuses', async () => {
    await assert.rejects(passQa(OP_API, 't', 7, fetchScript([[403, { message: 'no' }]], [])), (e) => e.status === 403);
  });
});

// ---------------------------------------------------------------------------
// Write-path additions (issues / branches / contents / pulls)
// ---------------------------------------------------------------------------
const {
  utf8ToBase64, makeBranchName, createIssue, addAssignees, issueHasAssignee,
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
      payload: { number: 42, html_url: 'https://github.com/x/issues/42', node_id: 'I_42',
        assignees: [{ login: 'slava' }] } }], calls);
    const res = await createIssue(API, 'gho_x',
      { title: 'Review: t', body: 'b', labels: ['talk-review'], assignees: ['slava'] }, f);
    assert.deepStrictEqual(res, { number: 42, html_url: 'https://github.com/x/issues/42', node_id: 'I_42',
      assignees: [{ login: 'slava' }] });
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

describe('issueHasAssignee', () => {
  it('is true only when the login is among the returned assignees', () => {
    assert.strictEqual(issueHasAssignee({ assignees: [{ login: 'iryna' }] }, 'iryna'), true);
    assert.strictEqual(issueHasAssignee({ number: 311, assignees: [] }, 'iryna'), false);
    assert.strictEqual(issueHasAssignee({ number: 311 }, 'iryna'), false);
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
    assert.strictEqual(res.number, 9);
    assert.strictEqual(res.html_url, 'https://github.com/x/pull/9');
    assert.deepStrictEqual(calls[0].body, { head: 'review/b', base: 'main', title: 't', body: 'b' });
  });
  it('createPull passes draft through and plucks node_id + draft from the reply', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: '/pulls', status: 201,
      payload: { number: 9, html_url: 'https://github.com/x/pull/9', node_id: 'PR_node9', draft: true } }], calls);
    const res = await createPull(API, 'gho_x',
      { head: 'sync/u/t', base: 'main', title: 't', body: 'b', draft: true }, f);
    assert.strictEqual(calls[0].body.draft, true);
    assert.strictEqual(res.node_id, 'PR_node9');
    assert.strictEqual(res.draft, true);
  });
});

// ---------------------------------------------------------------------------
// Edit auto-sync primitives
// ---------------------------------------------------------------------------
const {
  base64ToUtf8, makeSyncBranchName, getFileContent, findOpenPrByHead,
  markPullReady, convertPullToDraft, deleteFile, closePull, deleteRef,
  getIssue, updateIssue, setIssueState, listIssuesByLabel, ensureLabel,
} = require('../site/js/github_api');

describe('issue sync primitives (marker sync)', () => {
  it('createIssue passes labels and plucks number/url/node_id/assignees', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: '/issues', status: 201,
      payload: { number: 3, html_url: 'u', node_id: 'I_3' } }], calls);
    const r = await createIssue(API, 'gho_x', { title: 't', body: 'b', labels: ['markers'] }, f);
    assert.deepStrictEqual(calls[0].body.labels, ['markers']);
    assert.deepStrictEqual(r, { number: 3, html_url: 'u', node_id: 'I_3', assignees: [] });
  });
  it('getIssue reads number/state/body/node_id', async () => {
    const f = routerFetch([{ method: 'GET', match: '/issues/5', status: 200,
      payload: { number: 5, state: 'open', body: 'B', node_id: 'I_5', updated_at: 'T' } }], []);
    assert.deepStrictEqual(await getIssue(API, 'gho_x', 5, f),
      { number: 5, state: 'open', body: 'B', node_id: 'I_5' });
  });
  it('getIssue bypasses the HTTP cache', async () => {
    let seenInit = null;
    const f = async (url, init) => { seenInit = init; return new Response('{}', { status: 200 }); };
    await getIssue(API, 'gho_x', 5, f);
    assert.strictEqual(seenInit.cache, 'no-store');
  });
  it('getFileContent bypasses the HTTP cache', async () => {
    let seenInit = null;
    const f = async (url, init) => { seenInit = init; return new Response('{"content":"","sha":"s"}', { status: 200 }); };
    await getFileContent(API, 'gho_x', '.review-sync/t.json', 'sync/u/t', f);
    assert.strictEqual(seenInit.cache, 'no-store');
  });
  it('other requests leave the cache mode alone', async () => {
    let seenInit = null;
    const f = async (url, init) => { seenInit = init; return new Response('{}', { status: 200 }); };
    await updateIssue(API, 'gho_x', 5, { body: 'b' }, f);
    assert.ok(!('cache' in seenInit));
  });
  it('updateIssue PATCHes the given fields', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'PATCH', match: '/issues/5', status: 200,
      payload: { number: 5, state: 'open', body: 'NB' } }], calls);
    await updateIssue(API, 'gho_x', 5, { body: 'NB' }, f);
    assert.deepStrictEqual(calls[0].body, { body: 'NB' });
  });
  it('setIssueState closes/reopens and swallows 404', async () => {
    const calls = [];
    const ok = routerFetch([{ method: 'PATCH', match: '/issues/5', status: 200,
      payload: { number: 5, state: 'closed' } }], calls);
    await setIssueState(API, 'gho_x', 5, 'closed', ok);
    assert.deepStrictEqual(calls[0].body, { state: 'closed' });
    const gone = routerFetch([{ method: 'PATCH', match: '/issues/9', status: 404,
      payload: { message: 'Not Found' } }], []);
    assert.strictEqual(await setIssueState(API, 'gho_x', 9, 'closed', gone), null);
  });
  it('listIssuesByLabel GETs labels=&state=all and maps rows', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'GET', match: '/issues?', status: 200,
      payload: [{ number: 7, title: 'Markers: t / v', state: 'open', node_id: 'I_7', html_url: 'u7', body: 'B',
        updated_at: '2026-08-12T21:57:55Z' }] }], calls);
    const rows = await listIssuesByLabel(API, 'gho_x', 'markers', f);
    assert.ok(/labels=markers/.test(calls[0].url) && /state=all/.test(calls[0].url), calls[0].url);
    // updated_at rides along so same-title duplicates can be ranked by activity
    // (js/review_issue.js pickReviewIssue).
    assert.deepStrictEqual(rows[0],
      { number: 7, title: 'Markers: t / v', state: 'open', node_id: 'I_7', html_url: 'u7', body: 'B',
        updated_at: '2026-08-12T21:57:55Z' });
  });
  it('listIssuesByLabel pages through until a short page (I2)', async () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ number: i + 1, title: 'T' + (i + 1),
      state: 'open', node_id: 'I', html_url: 'u', body: '' }));
    const tail = [{ number: 101, title: 'LAST', state: 'closed', node_id: 'I', html_url: 'u', body: '' }];
    const calls = [];
    const f = routerFetch([
      { method: 'GET', match: '&page=1', status: 200, payload: full },
      { method: 'GET', match: '&page=2', status: 200, payload: tail },
    ], calls);
    const rows = await listIssuesByLabel(API, 'gho_x', 'markers', f);
    assert.strictEqual(rows.length, 101, 'both pages are merged');
    assert.strictEqual(rows[100].title, 'LAST');
    assert.strictEqual(calls.length, 2, 'stops after the short second page');
  });
  it('ensureLabel POSTs and tolerates a 422 already-exists', async () => {
    const f422 = routerFetch([{ method: 'POST', match: '/labels', status: 422,
      payload: { message: 'already_exists' } }], []);
    assert.strictEqual(await ensureLabel(API, 'gho_x', 'markers', f422), null);
  });
});

describe('closePull / deleteRef (edit-sync teardown)', () => {
  it('closePull PATCHes the PR to state=closed', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'PATCH', match: '/pulls/5', status: 200,
      payload: { number: 5, state: 'closed' } }], calls);
    await closePull(API, 'gho_x', 5, f);
    assert.strictEqual(calls[0].method, 'PATCH');
    assert.ok(/\/pulls\/5$/.test(calls[0].url), calls[0].url);
    assert.deepStrictEqual(calls[0].body, { state: 'closed' });
  });
  it('closePull swallows an already-gone PR (404) so teardown stays idempotent', async () => {
    const f = routerFetch([{ method: 'PATCH', match: '/pulls/', status: 404,
      payload: { message: 'Not Found' } }], []);
    assert.strictEqual(await closePull(API, 'gho_x', 9, f), null);
  });
  it('closePull rethrows other errors (e.g. 500)', async () => {
    const f = routerFetch([{ method: 'PATCH', match: '/pulls/', status: 500,
      payload: { message: 'boom' } }], []);
    await assert.rejects(() => closePull(API, 'gho_x', 9, f), (e) => e.status === 500);
  });
  it('deleteRef DELETEs refs/heads/<branch> (slashes kept)', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'DELETE', match: '/git/refs/heads/', status: 200, payload: {} }], calls);
    await deleteRef(API, 'gho_x', 'sync/u/talk--v1-uk', f);
    assert.strictEqual(calls[0].method, 'DELETE');
    assert.ok(/\/git\/refs\/heads\/sync\/u\/talk--v1-uk$/.test(calls[0].url), calls[0].url);
  });
  it('deleteRef swallows an already-gone branch (404 and 422)', async () => {
    for (const status of [404, 422]) {
      const f = routerFetch([{ method: 'DELETE', match: '/git/refs/heads/', status,
        payload: { message: 'Reference does not exist' } }], []);
      assert.strictEqual(await deleteRef(API, 'gho_x', 'b', f), null);
    }
  });
  it('deleteRef rethrows other errors (e.g. 500)', async () => {
    const f = routerFetch([{ method: 'DELETE', match: '/git/refs/heads/', status: 500,
      payload: { message: 'boom' } }], []);
    await assert.rejects(() => deleteRef(API, 'gho_x', 'b', f), (e) => e.status === 500);
  });
});

describe('base64ToUtf8', () => {
  it('round-trips UTF-8 through utf8ToBase64', () => {
    const s = 'Привіт ✓ — "лапки"';
    assert.strictEqual(base64ToUtf8(utf8ToBase64(s)), s);
  });
  it('tolerates the newlines GitHub inserts into content payloads', () => {
    const b64 = utf8ToBase64('Привіт, Мамо!');
    const wrapped = b64.slice(0, 8) + '\n' + b64.slice(8) + '\n';
    assert.strictEqual(base64ToUtf8(wrapped), 'Привіт, Мамо!');
  });
});

describe('makeSyncBranchName', () => {
  it('is deterministic: sync/<login>/<talkId> with no timestamp', () => {
    assert.strictEqual(
      makeSyncBranchName('slava', '1979-09-27_Shri-Kundalini'),
      'sync/slava/1979-09-27_Shri-Kundalini');
    assert.strictEqual(
      makeSyncBranchName('slava', '1979-09-27_Shri-Kundalini'),
      makeSyncBranchName('slava', '1979-09-27_Shri-Kundalini'));
  });
  it('scrubs characters git refs cannot hold', () => {
    const name = makeSyncBranchName('l..in', 'a b~c^d:e?f*g[h]i\\j');
    assert.ok(!/[ ~^:?*\[\]\\]/.test(name) && !name.includes('..'));
  });
  it('appends a --<target> segment when a target is given (still deterministic)', () => {
    assert.strictEqual(
      makeSyncBranchName('slava', '1979-09-27_Talk', 'video1-uk'),
      'sync/slava/1979-09-27_Talk--video1-uk');
    assert.strictEqual(
      makeSyncBranchName('slava', '1979-09-27_Talk', 'transcript-uk'),
      makeSyncBranchName('slava', '1979-09-27_Talk', 'transcript-uk'));
  });
});

describe('getFileContent', () => {
  it('GETs contents?ref= and decodes base64 body with sha', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'GET', match: '/contents/.review-sync/t.json',
      payload: { content: utf8ToBase64('{"a":"Привіт"}') + '\n', sha: 'blob9' } }], calls);
    const res = await getFileContent(API, 'gho_x', '.review-sync/t.json', 'sync/u/t', f);
    assert.deepStrictEqual(res, { content: '{"a":"Привіт"}', sha: 'blob9' });
    assert.strictEqual(calls[0].url, API + '/contents/.review-sync/t.json?ref=sync/u/t');
  });
  it('resolves null on 404 (no sync yet)', async () => {
    const f = routerFetch([{ method: 'GET', match: '/contents/', status: 404,
      payload: { message: 'Not Found' } }], []);
    assert.strictEqual(await getFileContent(API, 'gho_x', '.review-sync/t.json', 'sync/u/t', f), null);
  });
  it('rejects on other errors', async () => {
    const f = routerFetch([{ method: 'GET', match: '/contents/', status: 500,
      payload: { message: 'boom' } }], []);
    await assert.rejects(getFileContent(API, 'gho_x', '.review-sync/t.json', 'sync/u/t', f),
      (e) => e.status === 500);
  });
});

describe('findOpenPrByHead', () => {
  it('queries pulls?head=<owner>:<branch>&state=open and returns the first PR', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'GET', match: '/pulls?head=',
      payload: [{ number: 3, html_url: 'https://github.com/x/pull/3', node_id: 'PR_n3', draft: true }] }], calls);
    const res = await findOpenPrByHead(API, 'gho_x', 'sy-tools', 'sync/u/t', f);
    assert.deepStrictEqual(res, { number: 3, html_url: 'https://github.com/x/pull/3', node_id: 'PR_n3', draft: true });
    assert.ok(calls[0].url.includes('/pulls?head=' + encodeURIComponent('sy-tools:sync/u/t') + '&state=open'));
  });
  it('resolves null when no open PR has that head', async () => {
    const f = routerFetch([{ method: 'GET', match: '/pulls?head=', payload: [] }], []);
    assert.strictEqual(await findOpenPrByHead(API, 'gho_x', 'sy-tools', 'sync/u/t', f), null);
  });
});

describe('listPrsByHead', () => {
  const { listPrsByHead } = require('../site/js/github_api');
  it('asks for every state, newest first, and says which were merged, and at which commit', async () => {
    const calls = [];
    // An un-merged PR carries a merge_commit_sha too: GitHub's test merge.
    const f = routerFetch([{ method: 'GET', match: '/pulls?head=', payload: [
      { number: 9, state: 'closed', merged_at: null, merge_commit_sha: 'testmerge9', html_url: 'u9' },
      { number: 7, state: 'closed', merged_at: '2026-11-01T10:00:00Z', merge_commit_sha: 'merge7', html_url: 'u7' },
    ] }], calls);
    const res = await listPrsByHead(API, 'gho_x', 'sy-tools', 'sync/u/t', f);
    assert.deepStrictEqual(res, [
      { number: 9, state: 'closed', merged: false, mergeCommitSha: null, html_url: 'u9' },
      { number: 7, state: 'closed', merged: true, mergeCommitSha: 'merge7', html_url: 'u7' },
    ]);
    const url = calls[0].url;
    assert.ok(url.includes('/pulls?head=' + encodeURIComponent('sy-tools:sync/u/t')), url);
    assert.match(url, /[?&]state=all(&|$)/);
    assert.match(url, /[?&]sort=created(&|$)/);
    assert.match(url, /[?&]direction=desc(&|$)/);
  });
  it('bypasses the HTTP cache: the answer decides whether local edits are dropped', async () => {
    let seenInit = null;
    const f = async (url, init) => { seenInit = init; return new Response('[]', { status: 200 }); };
    assert.deepStrictEqual(await listPrsByHead(API, 'gho_x', 'sy-tools', 'sync/u/t', f), []);
    assert.strictEqual(seenInit.cache, 'no-store');
  });
  it('rejects on an HTTP error instead of reporting "no PR"', async () => {
    const f = routerFetch([{ method: 'GET', match: '/pulls?head=', status: 500, payload: { message: 'boom' } }], []);
    await assert.rejects(listPrsByHead(API, 'gho_x', 'sy-tools', 'sync/u/t', f));
  });
});

describe('markPullReady', () => {
  it('POSTs the GraphQL mutation with the PR node id', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: 'api.github.com/graphql',
      payload: { data: { markPullRequestReadyForReview: { pullRequest: { isDraft: false } } } } }], calls);
    await markPullReady('gho_x', 'PR_n3', f);
    assert.strictEqual(calls[0].url, 'https://api.github.com/graphql');
    assert.strictEqual(calls[0].headers.Authorization, 'Bearer gho_x');
    assert.match(calls[0].body.query, /markPullRequestReadyForReview/);
    assert.deepStrictEqual(calls[0].body.variables, { id: 'PR_n3' });
  });
  it('rejects when the GraphQL reply carries errors', async () => {
    const f = routerFetch([{ method: 'POST', match: 'api.github.com/graphql',
      payload: { errors: [{ message: 'not mergeable' }] } }], []);
    await assert.rejects(markPullReady('gho_x', 'PR_n3', f), /not mergeable/);
  });
});

describe('convertPullToDraft', () => {
  it('POSTs the GraphQL mutation with the PR node id', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'POST', match: 'api.github.com/graphql',
      payload: { data: { convertPullRequestToDraft: { pullRequest: { isDraft: true } } } } }], calls);
    await convertPullToDraft('gho_x', 'PR_n3', f);
    assert.match(calls[0].body.query, /convertPullRequestToDraft/);
    assert.deepStrictEqual(calls[0].body.variables, { id: 'PR_n3' });
  });
  it('rejects when the GraphQL reply carries errors', async () => {
    const f = routerFetch([{ method: 'POST', match: 'api.github.com/graphql',
      payload: { errors: [{ message: 'nope' }] } }], []);
    await assert.rejects(convertPullToDraft('gho_x', 'PR_n3', f), /nope/);
  });
});

describe('deleteFile', () => {
  it('DELETEs contents/<path> with sha + branch + message', async () => {
    const calls = [];
    const f = routerFetch([{ method: 'DELETE', match: '/contents/.review-sync/t.json',
      payload: { commit: {} } }], calls);
    await deleteFile(API, 'gho_x',
      { path: '.review-sync/t.json', branch: 'sync/u/t', message: 'remove sync state', sha: 'blob9' }, f);
    assert.deepStrictEqual(calls[0].body,
      { message: 'remove sync state', branch: 'sync/u/t', sha: 'blob9' });
  });
});

describe('keepalive passthrough', () => {
  it('putFile with keepalive:true sets keepalive on the fetch init', async () => {
    let seenInit = null;
    const f = async (url, init) => { seenInit = init; return new Response('{}', { status: 201 }); };
    await putFile(API, 'gho_x',
      { path: 'x.json', branch: 'b', message: 'm', content: 'x', keepalive: true }, f);
    assert.strictEqual(seenInit.keepalive, true);
  });
  it('putFile without keepalive leaves the init flag unset', async () => {
    let seenInit = null;
    const f = async (url, init) => { seenInit = init; return new Response('{}', { status: 201 }); };
    await putFile(API, 'gho_x', { path: 'x.json', branch: 'b', message: 'm', content: 'x' }, f);
    assert.ok(!('keepalive' in seenInit));
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
  it('announces each phase through onStep BEFORE its requests go out', async () => {
    // The busy button reads its label off these steps, so the name must land
    // before the wait it describes — not after.
    const calls = [];
    const steps = [];
    const f = routerFetch(Object.values(routes()), calls);
    await submitFilesPr(API, 'gho_x', {
      branch: 'review/b', base: 'main', files: FILES,
      commitMessage: 'edit', prTitle: 'T', prBody: 'B',
      onStep: (name) => steps.push([name, calls.length]),
    }, f);
    assert.deepStrictEqual(steps, [
      ['branch', 0],  // before the base-sha lookup
      ['commit', 2],  // after ref + refs POST, before the per-file work
      ['pr', 6],      // after both files, before POST /pulls
    ]);
  });
  it('always returns a promise — a throwing onStep rejects, never throws', async () => {
    // step('commit') and step('pr') run inside .then(), so they reject. The
    // first one must behave the same, or submitFilesPr breaks the
    // always-returns-a-promise contract on one branch only.
    const f = routerFetch(Object.values(routes()), []);
    const opts = {
      branch: 'review/b', base: 'main', files: FILES,
      commitMessage: 'edit', prTitle: 'T', prBody: 'B',
    };
    let out;
    assert.doesNotThrow(() => {
      out = submitFilesPr(API, 'gho_x',
        Object.assign({ onStep: () => { throw new Error('painter died'); } }, opts), f);
    });
    assert.strictEqual(typeof out.then, 'function');
    await assert.rejects(out, /painter died/);
  });
  it('reports the phase it died in, and survives a missing onStep', async () => {
    const steps = [];
    const f = routerFetch(Object.values(routes({
      put: { method: 'PUT', match: '/contents/', status: 409, payload: { message: 'Conflict' } },
    })), []);
    const opts = {
      branch: 'review/b', base: 'main', files: FILES,
      commitMessage: 'edit', prTitle: 'T', prBody: 'B',
    };
    await assert.rejects(submitFilesPr(API, 'gho_x',
      Object.assign({ onStep: (n) => steps.push(n) }, opts), f), /Conflict/);
    assert.deepStrictEqual(steps, ['branch', 'commit'], 'never reached the PR step');
    // No onStep at all is the pre-existing call shape — it must still work.
    await assert.rejects(submitFilesPr(API, 'gho_x', opts, f), /Conflict/);
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

const { listIssuesByCreator } = require('../site/js/github_api');

describe('listIssuesByCreator', () => {
  const API = 'https://api.github.com/repos/o/r';
  function pagedFetch(pages, seen) {
    return async (url) => {
      seen.push(url);
      const page = Number(new URL(url).searchParams.get('page'));
      return new Response(JSON.stringify(pages[page - 1] || []), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    };
  }
  it('GETs /issues?creator&state=all and maps rows (pull_request + draft + state_reason kept)', async () => {
    const seen = [];
    const rows = await listIssuesByCreator(API, 't', 'tester', pagedFetch([[
      { number: 1, title: 'Review: x', state: 'open', html_url: 'u1', node_id: 'n1' },
      { number: 2, title: 'Edit sync: x (tester)', state: 'closed', html_url: 'u2',
        pull_request: { merged_at: '2026-07-01T00:00:00Z', url: 'p2' } },
      { number: 3, title: 'Edit sync: y (tester)', state: 'open', html_url: 'u3', draft: true,
        pull_request: { merged_at: null, url: 'p3' } },
      // state_reason separates an issue that got done from one that was
      // dropped — classifyWorkRow colours the badge by it.
      { number: 4, title: 'Markers: z / v', state: 'closed', html_url: 'u4',
        state_reason: 'not_planned' },
    ]], seen));
    assert.strictEqual(seen.length, 1);
    assert.match(seen[0], /\/issues\?creator=tester&state=all&per_page=100&page=1$/);
    assert.deepStrictEqual(rows, [
      { number: 1, title: 'Review: x', state: 'open', html_url: 'u1', draft: false,
        state_reason: null, pull_request: null },
      { number: 2, title: 'Edit sync: x (tester)', state: 'closed', html_url: 'u2', draft: false,
        state_reason: null, pull_request: { merged_at: '2026-07-01T00:00:00Z' } },
      { number: 3, title: 'Edit sync: y (tester)', state: 'open', html_url: 'u3', draft: true,
        state_reason: null, pull_request: { merged_at: null } },
      { number: 4, title: 'Markers: z / v', state: 'closed', html_url: 'u4', draft: false,
        state_reason: 'not_planned', pull_request: null },
    ]);
  });
  it('pages until a short page', async () => {
    const full = Array.from({ length: 100 }, (_, i) => (
      { number: i, title: 't', state: 'open', html_url: 'u' }));
    const seen = [];
    const rows = await listIssuesByCreator(API, 'a b', 'a b', pagedFetch([full, [full[0]]], seen));
    assert.strictEqual(rows.length, 101);
    assert.strictEqual(seen.length, 2);
    assert.match(seen[0], /creator=a%20b/); // creator is URI-encoded
  });
});

// ---------------------------------------------------------------------------
// Actions API (burned-in subtitle render): dispatch the workflow, find the
// run, follow its jobs, and locate the artifact.
// ---------------------------------------------------------------------------
const {
  dispatchWorkflow,
  listWorkflowRuns,
  getRunJobs,
  listRunArtifacts,
} = require('../site/js/github_api');

// Reuses the module-level API constant declared above (same origin shape;
// the tests below only assert on URL suffixes, not the repo it points at).

describe('dispatchWorkflow', () => {
  it('POSTs ref and inputs to the workflow dispatch endpoint', async () => {
    const capture = {};
    await dispatchWorkflow(API, 'gho_x', 'burn-subtitles.yml', 'main',
      { talk_id: 't' }, fetchDouble(204, {}, capture));
    assert.strictEqual(capture.url,
      API + '/actions/workflows/burn-subtitles.yml/dispatches');
    assert.strictEqual(capture.init.method, 'POST');
    assert.deepStrictEqual(JSON.parse(capture.init.body),
      { ref: 'main', inputs: { talk_id: 't' } });
  });

  it('rejects with the status so the UI can explain a 403', async () => {
    await assert.rejects(
      dispatchWorkflow(API, 'gho_x', 'w.yml', 'main', {},
        fetchDouble(403, { message: 'Resource not accessible by integration' })),
      (e) => e.status === 403);
  });
});

describe('listWorkflowRuns', () => {
  it('returns the runs array for the workflow', async () => {
    const capture = {};
    const runs = await listWorkflowRuns(API, 'gho_x', 'burn-subtitles.yml',
      fetchDouble(200, { workflow_runs: [{ id: 7 }] }, capture));
    assert.deepStrictEqual(runs, [{ id: 7 }]);
    assert.match(capture.url, /\/actions\/workflows\/burn-subtitles\.yml\/runs/);
  });

  it('returns [] when the payload has no runs key', async () => {
    assert.deepStrictEqual(
      await listWorkflowRuns(API, 'gho_x', 'w.yml', fetchDouble(200, {})), []);
  });
});

describe('getRunJobs', () => {
  it('returns the jobs array for a run', async () => {
    const capture = {};
    const jobs = await getRunJobs(API, 'gho_x', 42,
      fetchDouble(200, { jobs: [{ name: 'burn' }] }, capture));
    assert.deepStrictEqual(jobs, [{ name: 'burn' }]);
    assert.strictEqual(capture.url, API + '/actions/runs/42/jobs');
  });
});

describe('listRunArtifacts', () => {
  it('returns the artifacts array for a run', async () => {
    const capture = {};
    const arts = await listRunArtifacts(API, 'gho_x', 42,
      fetchDouble(200, { artifacts: [{ id: 9, expired: false }] }, capture));
    assert.deepStrictEqual(arts, [{ id: 9, expired: false }]);
    assert.strictEqual(capture.url, API + '/actions/runs/42/artifacts');
  });
});

// ---------------------------------------------------------------------------
// The already-created videos: every successful burn of the retention week, by
// every author and for every talk, read from the runs list alone.
// ---------------------------------------------------------------------------
const { listBurnRuns } = require('../site/js/github_api');

describe('listBurnRuns', () => {
  const SINCE = '2026-09-06T12:00:00Z';
  // Spelled out rather than rebuilt with encodeURIComponent, so the test cannot
  // agree with the code by construction.
  const FIRST = API + '/actions/workflows/burn-subtitles.yml/runs'
    + '?status=success&created=%3E%3D2026-09-06T12%3A00%3A00Z&per_page=100';

  // Serves `pages` (1-based, from the page= parameter) under one total_count
  // and records every request.
  function pagedRuns(pages, totalCount, seen) {
    return async (url, init) => {
      seen.push({ url, init: init || {} });
      const m = /[?&]page=(\d+)/.exec(url);
      const page = m ? Number(m[1]) : 1;
      return new Response(JSON.stringify({
        total_count: totalCount, workflow_runs: pages[page - 1] || [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  }
  const runs = (from, n) => Array.from({ length: n }, (_, i) => ({ id: from + i }));

  it('asks for the week of successful runs by every author in one request', async () => {
    const seen = [];
    const got = await listBurnRuns(API, 'gho_x', 'burn-subtitles.yml', SINCE,
      pagedRuns([[{ id: 7 }]], 1, seen));
    assert.deepStrictEqual(got, [{ id: 7 }]);
    assert.strictEqual(seen.length, 1);
    assert.strictEqual(seen[0].url, FIRST);
    assert.strictEqual(seen[0].init.headers.Authorization, 'Bearer gho_x');
  });

  it('returns [] when the payload has no runs key', async () => {
    const seen = [];
    const f = async (url) => {
      seen.push(url);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    assert.deepStrictEqual(await listBurnRuns(API, 'gho_x', 'w.yml', SINCE, f), []);
    assert.strictEqual(seen.length, 1);
  });

  it('follows the next page while total_count says more runs exist', async () => {
    // The query spans every talk and every author, so a busy week passes a
    // hundred renders — and a video past the hundredth must not silently vanish.
    const seen = [];
    const got = await listBurnRuns(API, 'gho_x', 'burn-subtitles.yml', SINCE,
      pagedRuns([runs(1, 100), runs(101, 50)], 150, seen));
    assert.deepStrictEqual(got.map((r) => r.id), runs(1, 150).map((r) => r.id));
    assert.deepStrictEqual(seen.map((s) => s.url), [FIRST, FIRST + '&page=2']);
  });

  it('stops at a short page, whatever total_count claims', async () => {
    const seen = [];
    const got = await listBurnRuns(API, 'gho_x', 'burn-subtitles.yml', SINCE,
      pagedRuns([runs(1, 100), runs(101, 30)], 500, seen));
    assert.strictEqual(got.length, 130);
    assert.strictEqual(seen.length, 2);
  });

  it('asks for no empty page once total_count is reached', async () => {
    const seen = [];
    await listBurnRuns(API, 'gho_x', 'burn-subtitles.yml', SINCE,
      pagedRuns([runs(1, 100)], 100, seen));
    assert.strictEqual(seen.length, 1);
  });

  it('gives up after ten pages', async () => {
    const seen = [];
    const full = Array.from({ length: 20 }, (_, p) => runs(p * 100 + 1, 100));
    const got = await listBurnRuns(API, 'gho_x', 'burn-subtitles.yml', SINCE,
      pagedRuns(full, 5000, seen));
    assert.strictEqual(seen.length, 10);
    assert.strictEqual(got.length, 1000);
    assert.strictEqual(seen[9].url, FIRST + '&page=10');
  });

  it('rejects when a later page fails, rather than listing part of the week', async () => {
    const f = async (url) => (/&page=2/.test(url)
      ? new Response(JSON.stringify({ message: 'API rate limit exceeded' }), { status: 403 })
      : new Response(JSON.stringify({ total_count: 150, workflow_runs: runs(1, 100) }),
                     { status: 200 }));
    await assert.rejects(listBurnRuns(API, 'gho_x', 'burn-subtitles.yml', SINCE, f),
      (e) => e.status === 403);
  });
});

const { getWorkflowFile } = require('../site/js/github_api');

describe('pipeline dispatch primitives', () => {
  const API = 'https://api.github.com/repos/o/r';

  it('dispatchWorkflow hands back the run details GitHub now returns', async () => {
    const r = await dispatchWorkflow(API, 'gho_x', 'subtitle-pipeline.yml', 'main', { talk_id: 'x' },
      fetchDouble(200, { workflow_run_id: 7, html_url: 'h', run_url: 'r' }));
    assert.strictEqual(r.workflow_run_id, 7);
  });

  it('dispatchWorkflow still resolves on the old 204 with no body', async () => {
    const r = await dispatchWorkflow(API, 'gho_x', 'burn-subtitles.yml', 'main', {},
      fetchDouble(204, null));
    assert.deepStrictEqual(r, {});
  });

  it('getWorkflowFile reads the file at a ref through the contents API, decoded', async () => {
    const capture = {};
    const text = 'name: Пайплайн\n';
    const r = await getWorkflowFile(API, 'gho_x', 'subtitle-pipeline.yml', 'feat/x',
      fetchDouble(200, { encoding: 'base64', content: Buffer.from(text).toString('base64') }, capture));
    assert.strictEqual(capture.url,
      API + '/contents/.github/workflows/subtitle-pipeline.yml?ref=feat%2Fx');
    assert.strictEqual(r, text);
  });
});

const { listIssuesByLabelConditional } = require('../site/js/github_api');

describe('listIssuesByLabelConditional', () => {
  const PAGE1 = API + '/issues?labels=talk-review&state=all&per_page=100';
  const PAGE2 = 'https://api.github.com/repositories/1/issues?labels=talk-review&state=all&per_page=100&page=2';

  function pagedFetch(pages, calls) {
    return async (url, init) => {
      const headers = (init && init.headers) || {};
      calls.push({ url, headers });
      const p = pages[url];
      if (!p) throw new Error('unexpected url ' + url);
      if (p.status && p.status !== 200) {
        return { ok: false, status: p.status, headers: { get: (n) => (p.headers || {})[n] || null },
          json: async () => ({ message: p.message || 'err' }) };
      }
      if (headers['If-None-Match'] && headers['If-None-Match'] === p.etag) {
        return { ok: false, status: 304, headers: { get: () => null }, json: async () => { throw new Error('304 has no body'); } };
      }
      const h = { ETag: p.etag, Link: p.next ? '<' + PAGE1 + '>; rel="prev", <' + p.next + '>; rel="next"' : null };
      return { ok: true, status: 200, headers: { get: (n) => h[n] || null }, json: async () => p.rows };
    };
  }
  const twoPages = () => ({
    [PAGE1]: { etag: '"a"', next: PAGE2, rows: [{ number: 1, title: 'A' }, { number: 2, title: 'PR', pull_request: {} }] },
    [PAGE2]: { etag: '"b"', rows: [{ number: 3, title: 'C' }] },
  });
  const pick = (r) => ({ n: r.number });

  it('follows the Link header, drops pull requests and maps rows', async () => {
    const calls = [];
    const res = await listIssuesByLabelConditional(API, 'gho_x', 'talk-review', { mapRow: pick }, pagedFetch(twoPages(), calls));
    assert.deepStrictEqual(calls.map((c) => c.url), [PAGE1, PAGE2]);
    assert.strictEqual(calls[0].headers.Authorization, 'Bearer gho_x');
    assert.deepStrictEqual(res.rows, [{ n: 1 }, { n: 3 }]);
    assert.deepStrictEqual(res.pages.map((p) => p.etag), ['"a"', '"b"']);
  });

  it('replays each page\'s ETag; a 304 reuses that page\'s rows and its next link', async () => {
    const first = await listIssuesByLabelConditional(API, 'gho_x', 'talk-review', { mapRow: pick }, pagedFetch(twoPages(), []));
    const world = twoPages();
    world[PAGE2] = { etag: '"b2"', rows: [{ number: 4, title: 'D' }] };
    const calls = [];
    const res = await listIssuesByLabelConditional(API, 'gho_x', 'talk-review',
      { mapRow: pick, cached: { pages: first.pages } }, pagedFetch(world, calls));
    assert.deepStrictEqual(calls.map((c) => c.headers['If-None-Match']), ['"a"', '"b"']);
    assert.deepStrictEqual(res.rows, [{ n: 1 }, { n: 4 }], 'page 1 from cache, page 2 fresh');
    assert.deepStrictEqual(res.pages.map((p) => p.etag), ['"a"', '"b2"']);
  });

  it('does not send a cached ETag for a different URL', async () => {
    const calls = [];
    await listIssuesByLabelConditional(API, 'gho_x', 'talk-review',
      { mapRow: pick, cached: { pages: [{ url: API + '/issues?labels=other', etag: '"z"', rows: [], next: null }] } },
      pagedFetch(twoPages(), calls));
    assert.strictEqual(calls[0].headers['If-None-Match'], undefined);
  });

  it('never follows a next link that leaves the API origin (the token rides along)', async () => {
    const world = twoPages();
    world[PAGE1].next = 'https://evil.example/issues?page=2';
    const calls = [];
    const res = await listIssuesByLabelConditional(API, 'gho_x', 'talk-review', { mapRow: pick }, pagedFetch(world, calls));
    assert.strictEqual(calls.length, 1);
    assert.deepStrictEqual(res.rows, [{ n: 1 }]);
  });

  it('rejects with status and a header getter so the caller can classify a rate limit', async () => {
    const world = { [PAGE1]: { status: 403, message: 'API rate limit exceeded',
      headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '1700000000' } } };
    await assert.rejects(
      listIssuesByLabelConditional(API, 'gho_x', 'talk-review', { mapRow: pick }, pagedFetch(world, [])),
      (e) => e.status === 403 && e.headerGet('X-RateLimit-Remaining') === '0' && /rate limit/.test(e.message));
  });
});

describe('withDeadline', () => {
  const flush = () => new Promise((res) => setImmediate(res));
  const hung = (signals) => (url, init) => { signals.push(init && init.signal); return new Promise(() => {}); };

  function addAssigneesWithin(timeoutMs, fetchImpl) {
    return withDeadline((f) => addAssignees('https://api.github.com/repos/o/r', 'gho_x', 42, ['tester'], f),
      { timeoutMs, fetchImpl });
  }

  it('gives up after 15 seconds by default', async (t) => {
    assert.strictEqual(GH_REQUEST_TIMEOUT_MS, 15000);
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let outcome = 'pending';
    const p = withDeadline((f) => f('https://api.example/x', {}), { fetchImpl: hung([]) });
    p.then(() => { outcome = 'resolved'; }, () => { outcome = 'rejected'; });
    t.mock.timers.tick(14999);
    await flush();
    assert.strictEqual(outcome, 'pending');
    t.mock.timers.tick(1);
    await assert.rejects(p, (e) => e.name === 'TimeoutError');
  });

  it('rejects at the deadline — not before — with a TimeoutError naming the work, and aborts the request', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const signals = [];
    let outcome = 'pending';
    const p = withDeadline((f) => f('https://api.example/x', { method: 'POST' }),
      { timeoutMs: 500, what: 'claim', fetchImpl: hung(signals) });
    p.then(() => { outcome = 'resolved'; }, () => { outcome = 'rejected'; });

    t.mock.timers.tick(499);
    await flush();
    assert.strictEqual(outcome, 'pending');
    assert.ok(signals.length === 1 && signals[0] && !signals[0].aborted);

    t.mock.timers.tick(1);
    await assert.rejects(p, (e) => e.name === 'TimeoutError' && e.status === undefined
      && e.message === 'claim: no answer in 500 ms');
    assert.ok(signals[0].aborted, 'the hung request was aborted');
  });

  it('hands the init through to the fetch with the signal added, and leaves the original alone', async () => {
    const seen = [];
    const init = { method: 'POST', headers: { A: 'b' } };
    await withDeadline((f) => f('https://api.example/x', init),
      { timeoutMs: 500, fetchImpl: async (url, i) => { seen.push([url, i]); return 'ok'; } });
    assert.strictEqual(seen[0][0], 'https://api.example/x');
    assert.strictEqual(seen[0][1].method, 'POST');
    assert.deepStrictEqual(seen[0][1].headers, { A: 'b' });
    assert.ok(seen[0][1].signal);
    assert.strictEqual(init.signal, undefined);
  });

  it('a body that never arrives times out too', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const headersOnly = async () => ({ ok: true, status: 201, json: () => new Promise(() => {}) });
    const p = addAssigneesWithin(500, headersOnly);
    await flush();
    t.mock.timers.tick(500);
    await assert.rejects(p, (e) => e.name === 'TimeoutError');
  });

  it('an answer in time resolves with it and leaves no timer behind', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const signals = [];
    const answered = fetchDouble(201, { number: 42, assignees: [{ login: 'tester' }] });
    const issue = await addAssigneesWithin(500, (url, init) => { signals.push(init.signal); return answered(url, init); });
    assert.deepStrictEqual(issue.assignees, [{ login: 'tester' }]);
    t.mock.timers.tick(60000);
    assert.ok(signals.length === 1 && !signals[0].aborted, 'the timer was cleared: nothing is aborted later');
  });

  it('a failure in time rejects with the request\'s own error and clears the timer', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const signals = [];
    const refused = fetchDouble(403, { message: 'nope' });
    await assert.rejects(
      addAssigneesWithin(500, (url, init) => { signals.push(init.signal); return refused(url, init); }),
      (e) => e.status === 403 && e.message === 'nope');
    t.mock.timers.tick(60000);
    assert.ok(signals.length === 1 && !signals[0].aborted);
  });

  it('work that throws before it returns a promise rejects with that error', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const signals = [];
    const p = withDeadline((f) => { f('https://api.example/x', {}); throw new Error('boom'); },
      { timeoutMs: 500, fetchImpl: hung(signals) });
    await assert.rejects(p, /boom/);
    t.mock.timers.tick(60000);
    assert.ok(!signals[0].aborted, 'the timer was cleared');
  });
});

describe('freshFetch — a read that guards a create must not come from the HTTP cache', () => {
  const { freshFetch } = require('../site/js/github_api');
  it('adds cache: no-store and keeps method, headers and signal', async () => {
    const seen = [];
    const signal = new AbortController().signal;
    const f = freshFetch((url, init) => { seen.push({ url, init }); return Promise.resolve('ok'); });
    const init = { method: 'GET', headers: { Authorization: 'Bearer x' }, signal };
    assert.strictEqual(await f('u', init), 'ok');
    assert.deepStrictEqual(seen[0].init, { method: 'GET', headers: { Authorization: 'Bearer x' }, signal, cache: 'no-store' });
    assert.strictEqual(init.cache, undefined, 'the caller init is not mutated');
  });
  it('the review-claim issue list goes through freshFetch', () => {
    const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'site', 'index.html'), 'utf8');
    assert.match(html, /listIssuesByLabel\(API, token, REVIEW_ISSUE_LABEL, freshFetch\(f\)\)/);
  });
});
