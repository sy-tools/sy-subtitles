// GitHub sign-in session logic (pure, storage-injectable) for the review SPA.
// Single source: loaded by the browser via <script src="js/github_auth.js">
// in site/index.html AND required by the Node test suite — no inline mirror.
//
// The SPA authenticates as a GitHub App user (user-to-server token, token
// expiration disabled in the app settings) via the standard web flow: redirect
// to github.com/login/oauth/authorize carrying a one-shot CSRF `state`, then
// swap the returned ?code for a token through workers/oauth-exchange (the
// exchange needs the app's client_secret, which must not ship in the SPA).

var GH_TOKEN_KEY = 'sy_gh_token';
var GH_USER_KEY = 'sy_gh_user';

// One-shot CSRF state: 16 random bytes as 32 hex chars. The RNG is injectable
// for deterministic tests; production uses WebCrypto.
function makeAuthState(getRandomValues) {
  var rng = getRandomValues || function (a) { return crypto.getRandomValues(a); };
  var bytes = new Uint8Array(16);
  rng(bytes);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) hex += (bytes[i] + 256).toString(16).slice(1);
  return hex;
}

function buildAuthorizeUrl(clientId, state, redirectUri) {
  return 'https://github.com/login/oauth/authorize'
    + '?client_id=' + encodeURIComponent(clientId)
    + '&state=' + encodeURIComponent(state)
    + '&redirect_uri=' + encodeURIComponent(redirectUri);
}

// {code, state} from a callback query string, or null on normal page loads.
function parseAuthCallback(search) {
  var p = new URLSearchParams(search || '');
  var code = p.get('code');
  return code ? { code: code, state: p.get('state') || '' } : null;
}

// CSRF check: callback state must equal the state saved before the redirect,
// and both must be non-empty.
function isValidAuthCallback(params, savedState) {
  return !!(params && params.state && savedState && params.state === savedState);
}

// Drop auth params (code/state + GitHub-App install extras) from a query
// string while preserving app params like ?repo= and ?branch=.
function stripAuthParams(search) {
  var p = new URLSearchParams(search || '');
  p.delete('code'); p.delete('state');
  p.delete('installation_id'); p.delete('setup_action');
  var s = p.toString();
  return s ? '?' + s : '';
}

function saveAuth(token, user, storage) {
  var s = storage || localStorage;
  s.setItem(GH_TOKEN_KEY, token);
  s.setItem(GH_USER_KEY, JSON.stringify({ login: user.login, avatar_url: user.avatar_url }));
}
function getAuthToken(storage) {
  return (storage || localStorage).getItem(GH_TOKEN_KEY) || null;
}
function getAuthUser(storage) {
  // JSON.parse(null) is null — the desired "no user" result for a missing key.
  try { return JSON.parse((storage || localStorage).getItem(GH_USER_KEY)); }
  catch (e) { return null; }
}
function clearAuth(storage) {
  var s = storage || localStorage;
  s.removeItem(GH_TOKEN_KEY);
  s.removeItem(GH_USER_KEY);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    makeAuthState: makeAuthState,
    buildAuthorizeUrl: buildAuthorizeUrl,
    parseAuthCallback: parseAuthCallback,
    isValidAuthCallback: isValidAuthCallback,
    stripAuthParams: stripAuthParams,
    saveAuth: saveAuth,
    getAuthToken: getAuthToken,
    getAuthUser: getAuthUser,
    clearAuth: clearAuth,
    GH_TOKEN_KEY: GH_TOKEN_KEY,
    GH_USER_KEY: GH_USER_KEY,
  };
}
