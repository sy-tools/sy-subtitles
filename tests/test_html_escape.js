// The XSS cases for esc()/safeHref() — quote escaping, blocked schemes, tag
// breakout — are in tests/test_spa_xss.js, next to the sink guards they serve.
const { describe, it } = require('node:test');
const assert = require('node:assert');

const { safeHref } = require('../site/js/html_escape');

describe('safeHref() — the allowed schemes', () => {
  it('lets a mailto: link through', () => {
    assert.strictEqual(safeHref('mailto:someone@example.org'), 'mailto:someone@example.org');
  });

  it('reads the scheme case-insensitively', () => {
    assert.strictEqual(safeHref('HTTPS://example.org/x'), 'HTTPS://example.org/x');
    assert.strictEqual(safeHref('JavaScript:alert(1)'), '');
  });
});
