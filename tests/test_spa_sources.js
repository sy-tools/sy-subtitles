const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  loadedScriptPaths,
  loadedScripts,
  spaSources,
  sourcesMentioning,
  linesInLoadOrder,
} = require('./spa_sources');

const SITE = path.join(__dirname, '..', 'site');
// One page for both readers (tests/test_spa_sources.py takes the same file).
const PAGE = require('./fixtures/loaded_scripts_page.json');

describe('the scripts a page loads', () => {
  it('are its own js/ script tags in order — no vendored code, no CDN, no path that is not a tag', () => {
    assert.deepStrictEqual(loadedScriptPaths(PAGE.html.join('\n')), PAGE.loaded);
  });
});

describe('the sources of the real page', () => {
  it('are index.html followed by every script it loads', () => {
    const sources = spaSources();
    assert.strictEqual(sources[0].name, 'index.html');
    assert.ok(sources.length > 10, 'parsed the script tags');
    assert.deepStrictEqual(sources.slice(1).map((s) => s.name), loadedScripts().map((s) => s.name));
    for (const s of sources) assert.ok(s.text.length > 0, s.name + ' is empty');
  });

  it('cover every site/js module the page names, and only those', () => {
    const onDisk = fs.readdirSync(path.join(SITE, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);
    const loaded = loadedScripts().map((s) => s.name);
    assert.deepStrictEqual(loaded.filter((name) => !onDisk.includes(name)), [], 'a tag names a file that is not there');
    // Not loaded by a tag: a worker, the service worker's router and the
    // bookmarklet run in scopes of their own.
    assert.deepStrictEqual(onDisk.filter((name) => !loaded.includes(name)).sort(),
      ['js/bookmarklet.js', 'js/sw_routing.js', 'js/typo_worker.js'],
      'a site/js file the page does not load is outside every source guard: load it, or list it here');
  });

  it('are searched by string or by pattern, minus the modules excused', () => {
    assert.deepStrictEqual(sourcesMentioning('function getOverallStatus'), ['js/pipeline_stages.js']);
    assert.deepStrictEqual(sourcesMentioning(/function\s+getOverallStatus/g), ['js/pipeline_stages.js']);
    assert.deepStrictEqual(sourcesMentioning('function getOverallStatus', ['js/pipeline_stages.js']), []);
  });
});

describe('lines in load order', () => {
  const files = { 'js/a.js': 'a1\na2', 'js/b.js': 'b1' };
  const order = (page) => linesInLoadOrder(page.join('\n'), (name) => files[name]).map((l) => l.source + ':' + l.n + ' ' + l.line);

  it('put each script right after the line that loads it', () => {
    const page = ['<head>', '<script src="js/a.js"></script><script src="js/b.js"></script>', '</head>', '<script>', 'boot();', '</script>'];
    assert.deepStrictEqual(order(page), [
      'index.html:1 <head>',
      'index.html:2 <script src="js/a.js"></script><script src="js/b.js"></script>',
      'js/a.js:1 a1',
      'js/a.js:2 a2',
      'js/b.js:1 b1',
      'index.html:3 </head>',
      'index.html:4 <script>',
      'index.html:5 boot();',
      'index.html:6 </script>',
    ]);
  });

  it('put a deferred script after the whole page, which is when it runs', () => {
    const page = ['<script defer src="js/a.js"></script>', '<script src="js/b.js"></script>', '<script>boot();</script>'];
    assert.deepStrictEqual(order(page), [
      'index.html:1 <script defer src="js/a.js"></script>',
      'index.html:2 <script src="js/b.js"></script>',
      'js/b.js:1 b1',
      'index.html:3 <script>boot();</script>',
      'js/a.js:1 a1',
      'js/a.js:2 a2',
    ]);
  });

  it('hold every line of the real page and of each script it loads', () => {
    const expected = spaSources().reduce((sum, s) => sum + s.text.split('\n').length, 0);
    assert.strictEqual(linesInLoadOrder().length, expected);
  });
});
