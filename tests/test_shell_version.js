const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { computeShellVersion } = require('../site/js/shell_version');

const REPO_ROOT = path.join(__dirname, '..');

describe('computeShellVersion — pure logic', () => {
  it('keeps index.html + site/js/*.js, sorts by path, joins 7-char SHAs', () => {
    const entries = [
      { path: 'site/js/preview_state.js', sha: 'bbbbbbbbbb' },
      { path: 'site/index.html', sha: 'aaaaaaaaaa' },
      { path: 'site/js/add_talk_data.js', sha: 'cccccccccc' },
    ];
    // path order: site/index.html < site/js/add_talk_data.js < site/js/preview_state.js
    assert.strictEqual(computeShellVersion(entries), 'aaaaaaa' + 'ccccccc' + 'bbbbbbb');
  });

  it('keeps site/css/*.css (direct only), sorted into the path order', () => {
    // CSS moved out of index.html into site/css/*.css must also drive the shell
    // version — otherwise a CSS-only deploy would not trigger the SPA auto-reload
    // and users would keep stale styling. Nested css is excluded like nested js.
    const entries = [
      { path: 'site/css/components.css', sha: 'dddddddddd' },
      { path: 'site/index.html', sha: 'aaaaaaaaaa' },
      { path: 'site/css/tokens.css', sha: 'eeeeeeeeee' },
      { path: 'site/css/sub/nested.css', sha: 'ffffffffff' }, // nested → excluded
    ];
    // path order: site/css/components.css < site/css/tokens.css < site/index.html
    assert.strictEqual(computeShellVersion(entries), 'ddddddd' + 'eeeeeee' + 'aaaaaaa');
  });

  it('ignores non-shell paths (talks, other dirs, nested js)', () => {
    const entries = [
      { path: 'site/index.html', sha: '1111111111' },
      { path: 'talks/x/final/uk.srt', sha: '2222222222' },
      { path: 'site/sw.js', sha: '3333333333' },          // not under site/js/
      { path: 'site/js/sub/deep.js', sha: '4444444444' }, // nested, excluded
      { path: 'tools/x.js', sha: '5555555555' },
    ];
    assert.strictEqual(computeShellVersion(entries), '1111111');
  });

  it('returns empty string for no entries', () => {
    assert.strictEqual(computeShellVersion([]), '');
    assert.strictEqual(computeShellVersion(null), '');
  });
});

describe('computeShellVersion matches the deploy script', () => {
  it('JS over `git ls-tree HEAD` === tools/compute_shell_version.sh output', () => {
    // Both read the committed HEAD tree, so the file set is identical; this
    // asserts the two implementations agree byte-for-byte (sort, 7-char, join).
    const lsTree = execFileSync(
      'git',
      ['ls-tree', '-r', 'HEAD', '--', 'site/index.html', 'site/js', 'site/css'],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    const entries = lsTree
      .split('\n')
      .filter(Boolean)
      .map(function (line) {
        // "<mode> <type> <sha>\t<path>"
        const tab = line.indexOf('\t');
        const sha = line.slice(0, tab).split(/\s+/)[2];
        return { path: line.slice(tab + 1), sha: sha };
      });
    const fromJs = computeShellVersion(entries);
    const fromSh = execFileSync('bash', ['tools/compute_shell_version.sh'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.strictEqual(fromJs, fromSh);
    assert.ok(fromJs.length >= 7, 'expected at least index.html SHA, got: ' + JSON.stringify(fromJs));
  });
});
