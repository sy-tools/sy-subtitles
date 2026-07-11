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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    authHeaders: authHeaders,
    exchangeCode: exchangeCode,
    getViewer: getViewer,
  };
}
