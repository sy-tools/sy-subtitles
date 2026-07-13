// Thin authenticated GitHub API client (fetch-injectable, Node-tested).
// Single source: loaded via <script src="js/github_api.js"> in site/index.html
// AND required by the Node test suite — no inline mirror.
//
// Phase 1 (auth core): the code→token exchange call to workers/oauth-exchange,
// the viewer lookup, and the Authorization header helper. The token is ONLY
// ever sent to api.github.com; the exchange Worker receives the one-shot code,
// never the token.

function authHeaders(token) {
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// POST {code} to the exchange Worker; resolves the access-token string.
// Rejects with Error{status} on HTTP errors or a missing token.
function exchangeCode(exchangeUrl, code, fetchImpl) {
  var f = fetchImpl || fetch;
  return f(exchangeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code }),
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (body) {
      if (!r.ok || !body.token) {
        var e = new Error('exchange failed: ' + (body.error || ('HTTP ' + r.status)));
        e.status = r.status;
        throw e;
      }
      return body.token;
    });
  });
}

// GET /user -> {login, avatar_url}. A 401 rejection means the token was
// revoked — callers should clear the session.
function getViewer(token, fetchImpl) {
  var f = fetchImpl || fetch;
  return f('https://api.github.com/user', { headers: authHeaders(token) })
    .then(function (r) {
      if (!r.ok) {
        var e = new Error('GET /user: HTTP ' + r.status);
        e.status = r.status;
        throw e;
      }
      return r.json();
    })
    .then(function (u) { return { login: u.login, avatar_url: u.avatar_url }; });
}

// ---------------------------------------------------------------------------
// Write path (issues / branches / contents / pulls). Every function takes the
// repo API base (https://api.github.com/repos/<owner>/<name>) and the token —
// the module never guesses the repo. fetchImpl is injectable for tests.
// ---------------------------------------------------------------------------

// Shared JSON request: auth + JSON body + uniform Error{status, message}.
function ghJson(url, token, opts, fetchImpl) {
  var f = fetchImpl || fetch;
  var init = { method: (opts && opts.method) || 'GET', headers: authHeaders(token) };
  if (opts && opts.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(opts.body);
  }
  // keepalive lets a final sync flush survive the page being torn down
  // (pagehide) — the browser finishes the request after the document dies.
  if (opts && opts.keepalive) init.keepalive = true;
  return f(url, init).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (body) {
      if (!r.ok) {
        var e = new Error((body && body.message) || ('HTTP ' + r.status));
        e.status = r.status;
        throw e;
      }
      return body;
    });
  });
}

// A 403 "Resource not accessible by integration" from ghJson means the
// GitHub App is not installed on the repository (or lacks a permission) —
// an admin-fixable configuration problem the UI should name explicitly
// instead of echoing the opaque API message.
function isIntegrationAccessError(err) {
  return !!(err && err.status === 403 && /integration/i.test(err.message || ''));
}

// UTF-8 → base64 for the contents API (btoa alone breaks on non-Latin-1).
// Works in both the browser and Node (btoa is global in Node 16+).
function utf8ToBase64(s) {
  return btoa(unescape(encodeURIComponent(s)));
}

// base64 → UTF-8, tolerating the newlines GitHub wraps content payloads with.
function base64ToUtf8(b64) {
  return decodeURIComponent(escape(atob(String(b64).replace(/\s+/g, ''))));
}

// review/<talk>--<login>--HHMMSS, scrubbed of characters git refs reject.
// Timestamp suffix makes retries collision-free.
function makeBranchName(prefix, login, now) {
  var d = now || new Date();
  var stamp = String(d.getUTCHours()).padStart(2, '0')
    + String(d.getUTCMinutes()).padStart(2, '0')
    + String(d.getUTCSeconds()).padStart(2, '0');
  return (prefix + '--' + login + '--' + stamp)
    .replace(/[ ~^:?*[\]\\]/g, '-')
    .replace(/\.\.+/g, '.');
}

// sync/<login>/<talkId>[--<target>] — deterministic (NO timestamp) on
// purpose: the edit auto-sync branch must be re-findable when the page is
// reopened on any device. An optional target scopes the branch to one edited
// file (v3). Same ref-illegal-char scrub as makeBranchName.
function makeSyncBranchName(login, talkId, target) {
  return ('sync/' + login + '/' + talkId + (target ? '--' + target : ''))
    .replace(/[ ~^:?*[\]\\]/g, '-')
    .replace(/\.\.+/g, '.');
}

// POST /issues → {number, html_url}. fields: {title, body, labels, assignees}.
// fields may include title/body/labels/assignees. Returns number+url+node_id.
function createIssue(api, token, fields, fetchImpl) {
  return ghJson(api + '/issues', token, { method: 'POST', body: fields }, fetchImpl)
    .then(function (r) { return { number: r.number, html_url: r.html_url, node_id: r.node_id }; });
}

// GET /issues/<n> → the fields marker-sync needs for the pull/merge step.
function getIssue(api, token, number, fetchImpl) {
  return ghJson(api + '/issues/' + number, token, null, fetchImpl).then(function (r) {
    return { number: r.number, state: r.state, body: r.body || '', node_id: r.node_id, updatedAt: r.updated_at };
  });
}

// PATCH /issues/<n> with arbitrary fields (body and/or state).
function updateIssue(api, token, number, fields, fetchImpl) {
  return ghJson(api + '/issues/' + number, token, { method: 'PATCH', body: fields }, fetchImpl);
}

// PATCH state — teardown (closed) / reopen (open). Swallows 404 (already gone).
function setIssueState(api, token, number, state, fetchImpl) {
  return ghJson(api + '/issues/' + number, token, { method: 'PATCH', body: { state: state } }, fetchImpl)
    .catch(function (e) { if (e && e.status === 404) return null; throw e; });
}

// GET /issues?labels=<label>&state=all — the LIST API is immediately consistent
// (a just-created issue is present at once), unlike the search index. This is the
// sole deterministic re-attach mechanism for marker-sync (matched by title).
function listIssuesByLabel(api, token, label, fetchImpl) {
  return ghJson(api + '/issues?labels=' + encodeURIComponent(label) + '&state=all&per_page=100',
    token, null, fetchImpl).then(function (list) {
    return (list || []).map(function (r) {
      return { number: r.number, title: r.title, state: r.state, node_id: r.node_id, body: r.body || '' };
    });
  });
}

// POST /labels — idempotent; a 422 "already exists" is success.
function ensureLabel(api, token, name, fetchImpl) {
  return ghJson(api + '/labels', token, { method: 'POST', body: { name: name } }, fetchImpl)
    .then(function () { return null; })
    .catch(function (e) { if (e && e.status === 422) return null; throw e; });
}

function addAssignees(api, token, issueNumber, logins, fetchImpl) {
  return ghJson(api + '/issues/' + issueNumber + '/assignees', token,
    { method: 'POST', body: { assignees: logins } }, fetchImpl);
}

function getBranchHeadSha(api, token, branch, fetchImpl) {
  return ghJson(api + '/git/ref/heads/' + branch, token, null, fetchImpl)
    .then(function (r) { return r.object.sha; });
}

function createRef(api, token, branchName, sha, fetchImpl) {
  return ghJson(api + '/git/refs', token,
    { method: 'POST', body: { ref: 'refs/heads/' + branchName, sha: sha } }, fetchImpl);
}

// Blob sha of an existing file (needed to update it), or null when the path
// does not exist yet (create).
function getFileSha(api, token, path, ref, fetchImpl) {
  return ghJson(api + '/contents/' + path + '?ref=' + ref, token, null, fetchImpl)
    .then(function (r) { return r.sha; })
    .catch(function (e) {
      if (e.status === 404) return null;
      throw e;
    });
}

// PUT /contents/<path> — creates or (with sha) updates the file on the branch.
function putFile(api, token, opts, fetchImpl) {
  var body = {
    message: opts.message,
    branch: opts.branch,
    content: utf8ToBase64(opts.content),
  };
  if (opts.sha) body.sha = opts.sha;
  return ghJson(api + '/contents/' + opts.path, token,
    { method: 'PUT', body: body, keepalive: opts.keepalive }, fetchImpl);
}

// GET /contents/<path>?ref=<ref> → {content (decoded UTF-8), sha}, or null
// when the path/ref does not exist yet (the sync branch's 404 = "no sync").
function getFileContent(api, token, path, ref, fetchImpl) {
  return ghJson(api + '/contents/' + path + '?ref=' + ref, token, null, fetchImpl)
    .then(function (r) { return { content: base64ToUtf8(r.content), sha: r.sha }; })
    .catch(function (e) {
      if (e.status === 404) return null;
      throw e;
    });
}

// DELETE /contents/<path> — removes the file from the branch (needs the blob
// sha, like updates do).
function deleteFile(api, token, opts, fetchImpl) {
  return ghJson(api + '/contents/' + opts.path, token, {
    method: 'DELETE',
    body: { message: opts.message, branch: opts.branch, sha: opts.sha },
  }, fetchImpl);
}

function createPull(api, token, opts, fetchImpl) {
  var body = { head: opts.head, base: opts.base, title: opts.title, body: opts.body };
  if (opts.draft !== undefined) body.draft = opts.draft;
  return ghJson(api + '/pulls', token, {
    method: 'POST',
    body: body,
  }, fetchImpl).then(function (r) {
    return { number: r.number, html_url: r.html_url, node_id: r.node_id, draft: r.draft };
  });
}

// First open PR whose head is <owner>:<branch>, or null. Used to re-attach
// the edit-sync draft PR on page reopen (and after a lost create response).
function findOpenPrByHead(api, token, owner, branch, fetchImpl) {
  return ghJson(api + '/pulls?head=' + encodeURIComponent(owner + ':' + branch)
    + '&state=open', token, null, fetchImpl)
    .then(function (list) {
      if (!list || !list.length) return null;
      var r = list[0];
      return { number: r.number, html_url: r.html_url, node_id: r.node_id, draft: r.draft };
    });
}

// Draft <-> ready transitions are GraphQL-only (REST has no endpoint).
// Both reject when the reply carries errors.
function ghGraphql(token, query, variables, fetchImpl) {
  return ghJson('https://api.github.com/graphql', token, {
    method: 'POST',
    body: { query: query, variables: variables },
  }, fetchImpl).then(function (r) {
    if (r && r.errors && r.errors.length) {
      throw new Error(r.errors[0].message || 'GraphQL error');
    }
    return r;
  });
}

function markPullReady(token, nodeId, fetchImpl) {
  return ghGraphql(token,
    'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{isDraft}}}',
    { id: nodeId }, fetchImpl);
}

function convertPullToDraft(token, nodeId, fetchImpl) {
  return ghGraphql(token,
    'mutation($id:ID!){convertPullRequestToDraft(input:{pullRequestId:$id}){pullRequest{isDraft}}}',
    { id: nodeId }, fetchImpl);
}

// PATCH /pulls/<n> {state:'closed'} — closes the PR without merging. Edit sync
// calls this to tear a sync PR down when the last edit is reverted. Best-effort:
// a 404 (the PR was already deleted server-side) resolves as success so a
// teardown retry does not get wedged; closing an already-closed PR returns 200.
function closePull(api, token, prNumber, fetchImpl) {
  return ghJson(api + '/pulls/' + prNumber, token,
    { method: 'PATCH', body: { state: 'closed' } }, fetchImpl)
    .catch(function (e) {
      if (e && e.status === 404) return null;
      throw e;
    });
}

// DELETE /git/refs/heads/<branch> — removes the branch. The repo's
// delete-on-merge only fires on merge, so a plain close leaves the branch;
// this removes it. Best-effort: a 404/422 (already gone) resolves as success
// so teardown stays idempotent. Slashes in <branch> are kept (git ref path).
function deleteRef(api, token, branchName, fetchImpl) {
  return ghJson(api + '/git/refs/heads/' + branchName, token,
    { method: 'DELETE' }, fetchImpl)
    .catch(function (e) {
      if (e && (e.status === 404 || e.status === 422)) return null;
      throw e;
    });
}

// One-button PR: base head sha → new branch → per-file (blob sha on base →
// PUT to branch, sequential to keep commit order) → open the PR. A failure
// after the branch exists carries e.branch so the UI can link to the orphan
// branch; a retry uses a fresh timestamped name, so there are no collisions.
function submitFilesPr(api, token, opts, fetchImpl) {
  var branchCreated = false;
  return getBranchHeadSha(api, token, opts.base, fetchImpl)
    .then(function (sha) { return createRef(api, token, opts.branch, sha, fetchImpl); })
    .then(function () {
      branchCreated = true;
      var chain = Promise.resolve();
      opts.files.forEach(function (file) {
        chain = chain.then(function () {
          return getFileSha(api, token, file.path, opts.base, fetchImpl);
        }).then(function (sha) {
          return putFile(api, token, {
            path: file.path,
            branch: opts.branch,
            message: opts.commitMessage,
            content: file.content,
            sha: sha,
          }, fetchImpl);
        });
      });
      return chain;
    })
    .then(function () {
      return createPull(api, token, {
        head: opts.branch, base: opts.base, title: opts.prTitle, body: opts.prBody,
      }, fetchImpl);
    })
    .then(function (pr) { return { number: pr.number, html_url: pr.html_url, branch: opts.branch }; })
    .catch(function (e) {
      if (branchCreated) e.branch = opts.branch;
      throw e;
    });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    authHeaders: authHeaders,
    exchangeCode: exchangeCode,
    getViewer: getViewer,
    isIntegrationAccessError: isIntegrationAccessError,
    utf8ToBase64: utf8ToBase64,
    base64ToUtf8: base64ToUtf8,
    makeBranchName: makeBranchName,
    makeSyncBranchName: makeSyncBranchName,
    createIssue: createIssue,
    getIssue: getIssue,
    updateIssue: updateIssue,
    setIssueState: setIssueState,
    listIssuesByLabel: listIssuesByLabel,
    ensureLabel: ensureLabel,
    addAssignees: addAssignees,
    getBranchHeadSha: getBranchHeadSha,
    createRef: createRef,
    getFileSha: getFileSha,
    getFileContent: getFileContent,
    deleteFile: deleteFile,
    putFile: putFile,
    createPull: createPull,
    findOpenPrByHead: findOpenPrByHead,
    markPullReady: markPullReady,
    convertPullToDraft: convertPullToDraft,
    closePull: closePull,
    deleteRef: deleteRef,
    submitFilesPr: submitFilesPr,
  };
}
