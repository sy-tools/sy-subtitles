// Tests for the SPA's XSS defenses in site/index.html:
//   - esc()      — HTML escaper, must be attribute-safe (escape " and ')
//   - safeHref()  — URL scheme allowlist + escaping for href= sinks
//   - source guards — the talk-card / pipeline-DAG sinks must route
//     attacker-influenceable values (amruta_url, talk id, issue_number)
//     through esc()/safeHref() instead of raw concatenation.
//
// esc()/safeHref() live inline in index.html (single-source, no js/ mirror),
// so — like extractI18N in test_spa_cache.js — we extract the real function
// source and eval it, exercising the shipped code rather than a replica.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const HTML = fs.readFileSync('site/index.html', 'utf8');

function loadEsc() {
  const escM = HTML.match(/function esc\(s\) \{[^\n]*\}/);
  assert.ok(escM, 'esc() one-liner not found in index.html');
  return eval('(' + escM[0] + ')');
}

function loadEscapers() {
  const shM = HTML.match(/function safeHref\(u\) \{[^\n]*\}/);
  assert.ok(shM, 'safeHref() one-liner not found in index.html');
  // Parenthesise so eval yields the function expression; safeHref closes over esc.
  const esc = loadEsc();
  const safeHref = eval('(' + shM[0] + ')');
  return { esc, safeHref };
}

describe('SPA esc() — attribute-safe HTML escaping', () => {
  it('escapes double and single quotes', () => {
    const esc = loadEsc();
    assert.strictEqual(esc('"'), '&quot;');
    assert.strictEqual(esc("'"), '&#39;');
  });

  it('still escapes & < > with no double-escaping', () => {
    const esc = loadEsc();
    assert.strictEqual(esc('<a>&"\''), '&lt;a&gt;&amp;&quot;&#39;');
  });

  it('treats null/undefined as empty string', () => {
    const esc = loadEsc();
    assert.strictEqual(esc(null), '');
    assert.strictEqual(esc(undefined), '');
  });
});

describe('SPA safeHref() — URL scheme allowlist + escaping', () => {
  it('passes http(s) and hash routes through unchanged', () => {
    const { safeHref } = loadEscapers();
    assert.strictEqual(safeHref('https://www.amruta.org/x/'), 'https://www.amruta.org/x/');
    assert.strictEqual(safeHref('http://amruta.org'), 'http://amruta.org');
    assert.strictEqual(safeHref('#/review/2020_x'), '#/review/2020_x');
  });

  it('blocks javascript:, data: and protocol-relative URLs', () => {
    const { safeHref } = loadEscapers();
    assert.strictEqual(safeHref('javascript:alert(1)'), '');
    assert.strictEqual(safeHref('data:text/html,<script>alert(1)</script>'), '');
    assert.strictEqual(safeHref('//evil.com'), '');
  });

  it('escapes a quote/tag breakout inside an allowed URL', () => {
    const { safeHref } = loadEscapers();
    assert.strictEqual(
      safeHref('https://x/"><img src=x onerror=alert(1)>'),
      'https://x/&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'
    );
  });

  it('returns empty for empty/garbage input', () => {
    const { safeHref } = loadEscapers();
    assert.strictEqual(safeHref(''), '');
    assert.strictEqual(safeHref(null), '');
    assert.strictEqual(safeHref('not a url'), '');
  });
});

describe('SPA index source — XSS sinks are sanitized (regression guards)', () => {
  it('the amruta date link routes amruta_url through safeHref', () => {
    assert.ok(
      !/href="'\s*\+\s*tk\.amrutaUrl/.test(HTML),
      'raw tk.amrutaUrl is still concatenated straight into an href attribute'
    );
    assert.ok(
      /safeHref\(tk\.amrutaUrl\)/.test(HTML),
      'tk.amrutaUrl is not routed through safeHref()'
    );
  });

  it('the expert pipeline button does not inject the talk id via inline onclick', () => {
    assert.ok(
      !/expert-btn[^>]*onclick=/.test(HTML),
      'expert-btn still carries an inline onclick (raw tk.id sink)'
    );
    assert.ok(
      /querySelector\('\.expert-btn'\)/.test(HTML) && /addEventListener\('click'/.test(HTML),
      'expert-btn copy is not bound via addEventListener'
    );
  });

  it('the pipeline-DAG node() escapes its href', () => {
    assert.ok(
      /safeHref\(href\)/.test(HTML),
      'renderPipelineDAG node() does not pass its href through safeHref()'
    );
  });
});
