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

describe('CACHE_VERSION ↔ E2E lockstep', () => {
  // The Playwright E2E (tests/test_service_worker.py) hardcodes the cache name
  // "sy-subtitles-c<N>" in ~15 embedded JS strings to mirror CACHE_VERSION in
  // sw.js. The documented rule ("routing changes must bump CACHE_VERSION") means
  // that number keeps moving (this very PR moved it 3→5). Without this guard, a
  // bump that misses the py test surfaces as a confusing cache-name mismatch deep
  // in a slow Playwright run; here it fails fast and loud at the Node layer.
  // The py file legitimately references OLD versions too (e.g. sy-subtitles-c2 in
  // the cache-purge tests), so the invariant is "the highest version referenced
  // in the py file equals sw.js's CACHE_VERSION", not "every reference equals N".
  it('test_service_worker.py references the current sw.js CACHE_VERSION', () => {
    const sw = fs.readFileSync('site/sw.js', 'utf8');
    const v = sw.match(/var CACHE_VERSION = (\d+);/);
    assert.ok(v, 'CACHE_VERSION not found in site/sw.js');
    const version = Number(v[1]);

    const py = fs.readFileSync('tests/test_service_worker.py', 'utf8');
    const refs = [...py.matchAll(/sy-subtitles-c(\d+)/g)].map((m) => Number(m[1]));
    assert.ok(refs.length > 0, 'expected sy-subtitles-c<N> references in test_service_worker.py');
    assert.ok(
      refs.includes(version),
      `test_service_worker.py must reference the current cache sy-subtitles-c${version}`,
    );
    assert.strictEqual(
      Math.max.apply(null, refs),
      version,
      `test_service_worker.py's newest cache is sy-subtitles-c${Math.max.apply(null, refs)} but sw.js CACHE_VERSION=${version} — bump the py constant`,
    );
  });
});
