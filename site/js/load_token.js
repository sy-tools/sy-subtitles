'use strict';
// Stale-fetch guards for view/state switches, single-sourced for the SPA and
// the Node test suite (tests/test_load_token.js).
//
// Every mode/language/video switch bumps a token on the shared state object;
// async callbacks capture the token at entry and bail if it is no longer
// current, so a late-resolving fetch can't render the wrong content or write
// edits under the wrong localStorage key. The counter is module-global, so a
// token minted on a replaced state object never matches its successor.

var _loadCounter = 0;

function bumpLoadToken(state) {
  state._loadToken = ++_loadCounter;
  return state._loadToken;
}

function isCurrentLoad(state, token) {
  return !!state && state._loadToken === token;
}

// Append a query parameter to a URL that may or may not already carry one
// (hash-less Vimeo embeds have no query string).
function withQueryParam(url, param) {
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + param;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bumpLoadToken: bumpLoadToken, isCurrentLoad: isCurrentLoad, withQueryParam: withQueryParam };
}
