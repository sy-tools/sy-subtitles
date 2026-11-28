// Escaping for text and links written into innerHTML. Single source: loaded
// by the browser via <script src="js/html_escape.js"> in site/index.html AND
// required by the Node test suite — no inline mirror.

function esc(s) { return (s||'').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
// Allow only http(s)/hash-route/mailto hrefs (blocks javascript:, data:,
// protocol-relative //host), then HTML-escape so a quote/tag cannot break out
// of the href="" attribute. Returns '' for disallowed/empty URLs.
function safeHref(u) { return /^(https?:\/\/|#|mailto:)/i.test(u || '') ? esc(u) : ''; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { esc: esc, safeHref: safeHref };
}
