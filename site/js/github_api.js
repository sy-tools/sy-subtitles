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

// UTF-8 → base64 for the contents API (btoa alone breaks on non-Latin-1).
// Works in both the browser and Node (btoa is global in Node 16+).
function utf8ToBase64(s) {
  return btoa(unescape(encodeURIComponent(s)));
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

// POST /issues → {number, html_url}. fields: {title, body, labels, assignees}.
function createIssue(api, token, fields, fetchImpl) {
  return ghJson(api + '/issues', token, { method: 'POST', body: fields }, fetchImpl)
    .then(function (r) { return { number: r.number, html_url: r.html_url }; });
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
    { method: 'PUT', body: body }, fetchImpl);
}

function createPull(api, token, opts, fetchImpl) {
  return ghJson(api + '/pulls', token, {
    method: 'POST',
    body: { head: opts.head, base: opts.base, title: opts.title, body: opts.body },
  }, fetchImpl).then(function (r) { return { number: r.number, html_url: r.html_url }; });
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
    utf8ToBase64: utf8ToBase64,
    makeBranchName: makeBranchName,
    createIssue: createIssue,
    addAssignees: addAssignees,
    getBranchHeadSha: getBranchHeadSha,
    createRef: createRef,
    getFileSha: getFileSha,
    putFile: putFile,
    createPull: createPull,
    submitFilesPr: submitFilesPr,
  };
}
