// Lockstep guard for the service-worker shell precache (site/sw.js install).
// The SW precaches the app shell so the FIRST visit works offline. Its js list
// must stay in sync with the <script src="js/…"> tags in index.html — a new
// module added to the page but missing from the precache would silently break
// offline boot. This test fails loudly on any drift.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

function pageJs() {
  const html = fs.readFileSync('site/index.html', 'utf8');
  const out = [];
  const re = /<script src="(js\/[^"]+\.js)"/g;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

function shellAssets() {
  const sw = fs.readFileSync('site/sw.js', 'utf8');
  const m = sw.match(/var SHELL_ASSETS = \[([\s\S]*?)\];/);
  assert.ok(m, 'SHELL_ASSETS array not found in site/sw.js');
  return (m[1].match(/'([^']+)'/g) || []).map((s) => s.slice(1, -1));
}

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
});
