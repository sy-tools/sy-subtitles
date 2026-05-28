// Parses the bookmarklet payload carried in the SPA hash route `#/add?data=...`
// into a routing decision. Mirrored verbatim into site/index.html (showAddTalk);
// the Node test suite exercises this module.
//
// Returns one of:
//   { state: 'setup', data: null }  — no payload present
//   { state: 'error', data: null }  — payload missing/corrupt or not an amruta.org URL
//   { state: 'form',  data: obj  }  — valid payload ready to populate the form
function parseAddTalkHash(hash) {
  var qm = hash.indexOf('?');
  if (qm === -1 || hash.indexOf('data=') === -1) {
    return { state: 'setup', data: null };
  }

  var params = new URLSearchParams(hash.slice(qm));
  var dataStr = params.get('data');
  var data;
  try {
    // URLSearchParams.get() already percent-decodes. A second decodeURIComponent
    // here threw "URI malformed" on any literal '%' in the title/transcript
    // (e.g. "100%"), which surfaced as the misleading "Wrong site" error.
    data = JSON.parse(dataStr);
  } catch (e) {
    return { state: 'error', data: null };
  }

  if (!data.u || data.u.indexOf('amruta.org') === -1) {
    return { state: 'error', data: null };
  }

  return { state: 'form', data: data };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseAddTalkHash: parseAddTalkHash };
}
