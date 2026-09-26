const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// A module that needs another one says so twice: `require('./x')` for Node,
// and the bare global `x` defines for the browser. Only the first is checked by
// anything else, so a page that loads the module without loading `x` first
// throws at load and loses everything the module defines.

const SITE = path.join(__dirname, '..', 'site');

function pages() {
  return fs.readdirSync(SITE).filter((f) => f.endsWith('.html'));
}

function scripts(page) {
  const html = fs.readFileSync(path.join(SITE, page), 'utf8');
  return [...html.matchAll(/<script\s+src="js\/([\w.-]+\.js)"/g)].map((m) => m[1]);
}

function needs(module) {
  const src = fs.readFileSync(path.join(SITE, 'js', module), 'utf8');
  return [...src.matchAll(/require\(['"]\.\/([\w.-]+?)(?:\.js)?['"]\)/g)].map((m) => m[1] + '.js');
}

describe('every page loads a module after the modules it needs', () => {
  for (const page of pages()) {
    it(page, () => {
      const loaded = scripts(page);
      const missing = [];
      loaded.forEach((module, i) => {
        for (const dep of needs(module)) {
          if (!loaded.slice(0, i).includes(dep)) missing.push(`${module} needs js/${dep} loaded before it`);
        }
      });
      assert.deepStrictEqual(missing, []);
    });
  }

  it('the check sees the pages and the dependencies it is meant to', () => {
    assert.ok(pages().includes('index.html') && pages().includes('styleguide.html'));
    assert.deepStrictEqual(needs('burn_video.js'), ['burn_geometry.js']);
  });
});
