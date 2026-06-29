// Lockstep guard for the service-worker shell precache (site/sw.js install).
// The SW precaches the app shell so the FIRST visit works offline. Its js list
// must stay in sync with the <script src="js/…"> tags in index.html — a new
// module added to the page but missing from the precache would silently break
// offline boot. This test fails loudly on any drift.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

// Extract the local js modules index.html loads. Tolerant of attribute order so
// a future tag like <script defer src="js/x.js"> or <script type="module" …> is
// still seen — otherwise such a module could be omitted from the precache and the
// lockstep below would pass with the drift undetected (both lists missing it).
function extractPageJs(html) {
  const out = [];
  const re = /<script\b[^>]*\bsrc="(js\/[^"]+\.js)"/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function pageJs() {
  return extractPageJs(fs.readFileSync('site/index.html', 'utf8'));
}

function swArray(name) {
  const sw = fs.readFileSync('site/sw.js', 'utf8');
  const m = sw.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\];'));
  assert.ok(m, name + ' array not found in site/sw.js');
  return (m[1].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1));
}

const shellAssets = () => swArray('SHELL_ASSETS');
const shellCdn = () => swArray('SHELL_CDN');

describe('SW shell precache', () => {
  it('precaches the app shell roots (./, index.html, icon.png)', () => {
    const assets = shellAssets();
    for (const root of ['./', 'index.html', 'icon.png']) {
      assert.ok(assets.includes(root), `SHELL_ASSETS must precache '${root}' so the SPA boots offline`);
    }
  });

  it('precaches exactly the js modules index.html loads (no drift)', () => {
    const page = pageJs().sort();
    const precached = shellAssets().filter((a) => a.startsWith('js/')).sort();
    assert.ok(page.length > 0, 'expected <script src="js/…"> tags in index.html');
    assert.deepStrictEqual(
      precached,
      page,
      'sw.js SHELL_ASSETS js list drifted from index.html <script src="js/…"> tags',
    );
  });

  it('extracts js modules regardless of attribute order (defer/type before src)', () => {
    const html = [
      '<script src="js/a.js"></script>',
      '<script defer src="js/b.js"></script>',
      '<script type="module" src="js/c.js"></script>',
    ].join('\n');
    assert.deepStrictEqual(extractPageJs(html).sort(), ['js/a.js', 'js/b.js', 'js/c.js']);
  });
});

describe('SW CDN precache', () => {
  it('every precached CDN url is loaded verbatim by index.html (catches version drift)', () => {
    const html = fs.readFileSync('site/index.html', 'utf8');
    const cdn = shellCdn();
    assert.ok(cdn.length > 0, 'expected at least one SHELL_CDN entry');
    for (const url of cdn) {
      assert.ok(
        html.includes('<script src="' + url + '"'),
        `SHELL_CDN '${url}' is not loaded verbatim by index.html — a version/url bump on the page would silently break offline boot`,
      );
    }
  });

  it('precaches js-yaml (essential to parse meta.yaml offline)', () => {
    assert.ok(
      shellCdn().some((u) => /js-yaml/.test(u)),
      'js-yaml must stay in SHELL_CDN — without it, meta.yaml cannot be parsed on an offline first visit',
    );
  });
});
