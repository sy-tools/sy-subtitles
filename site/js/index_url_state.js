// Pure helpers for reflecting the index view's search/filter state in real URL
// query params (?q=, ?f=). Single source: loaded by the browser via
// <script src="js/index_url_state.js"> in site/index.html AND required by the
// Node test suite — no inline mirror.
//
// Why query params, not the hash: the router deliberately strips the hash on the
// index (history.replaceState to pathname + search) but PRESERVES location.search
// — and ?branch= already lives there. So index state belongs in query params too,
// and buildIndexSearch must round-trip every unrelated param (branch) untouched.
//
// There is intentionally no ?sort= — the index has no sort control to bind it to.

var INDEX_FILTERS = ['all', 'needs-review', 'in-review', 'pending', 'approved'];

function _params(search) {
  try {
    return new URLSearchParams(search || '');
  } catch (_) {
    return new URLSearchParams();
  }
}

function readIndexQuery(search) {
  return _params(search).get('q') || '';
}

// Returns the filter only when it is one of the known values; otherwise null,
// which the caller reads as "fall back to the saved/default filter".
function readIndexFilter(search) {
  var f = _params(search).get('f');
  return f && INDEX_FILTERS.indexOf(f) !== -1 ? f : null;
}

// Build the new query string (no leading '?') from the current search plus the
// desired index state. q is omitted when empty; f is omitted when it equals the
// mode default or is not a known filter. All other params survive.
function buildIndexSearch(currentSearch, state) {
  var params = _params(currentSearch);
  var query = (state && state.query) || '';
  var filter = (state && state.filter) || '';
  var defaultFilter = (state && state.defaultFilter) || '';

  if (query) params.set('q', query);
  else params.delete('q');

  if (filter && filter !== defaultFilter && INDEX_FILTERS.indexOf(filter) !== -1) {
    params.set('f', filter);
  } else {
    params.delete('f');
  }

  return params.toString();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INDEX_FILTERS: INDEX_FILTERS,
    readIndexQuery: readIndexQuery,
    readIndexFilter: readIndexFilter,
    buildIndexSearch: buildIndexSearch,
  };
}
