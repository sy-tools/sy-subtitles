const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const { shellVersionInput, computeShellVersion } = require('../site/js/shell_version');

const REPO_ROOT = path.join(__dirname, '..');

function sha256Prefix(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);
}

describe('shellVersionInput — which files make up the app shell', () => {
  it('keeps index.html + site/js/*.js as "path sha" lines in path order', () => {
    const entries = [
      { path: 'site/js/preview_state.js', sha: 'bbbbbbbbbb' },
      { path: 'site/index.html', sha: 'aaaaaaaaaa' },
      { path: 'site/js/add_talk_data.js', sha: 'cccccccccc' },
    ];
    assert.strictEqual(
      shellVersionInput(entries),
      'site/index.html aaaaaaaaaa\n'
        + 'site/js/add_talk_data.js cccccccccc\n'
        + 'site/js/preview_state.js bbbbbbbbbb\n',
    );
  });

  it('keeps site/css/*.css (direct only), sorted into the path order', () => {
    // A CSS-only deploy must still trigger the auto-reload, or users keep stale
    // styling. Nested css is excluded like nested js.
    const entries = [
      { path: 'site/css/components.css', sha: 'dd' },
      { path: 'site/index.html', sha: 'aa' },
      { path: 'site/css/tokens.css', sha: 'ee' },
      { path: 'site/css/sub/nested.css', sha: 'ff' },
    ];
    assert.strictEqual(
      shellVersionInput(entries),
      'site/css/components.css dd\nsite/css/tokens.css ee\nsite/index.html aa\n',
    );
  });

  it('ignores non-shell paths (talks, other dirs, nested js)', () => {
    const entries = [
      { path: 'site/index.html', sha: '11' },
      { path: 'talks/x/final/uk.srt', sha: '22' },
      { path: 'site/sw.js', sha: '33' },
      { path: 'site/js/sub/deep.js', sha: '44' },
      { path: 'tools/x.js', sha: '55' },
    ];
    assert.strictEqual(shellVersionInput(entries), 'site/index.html 11\n');
  });

  it('is empty for no entries', () => {
    assert.strictEqual(shellVersionInput([]), '');
    assert.strictEqual(shellVersionInput(null), '');
  });
});

describe('computeShellVersion — a fixed-length fingerprint', () => {
  it('is the first 12 hex chars of SHA-256 over the input', async () => {
    const entries = [
      { path: 'site/index.html', sha: 'aaaaaaaaaa' },
      { path: 'site/js/a.js', sha: 'bbbbbbbbbb' },
    ];
    const v = await computeShellVersion(entries, crypto.webcrypto.subtle);
    assert.strictEqual(v, sha256Prefix(shellVersionInput(entries)));
    assert.match(v, /^[0-9a-f]{12}$/);
  });

  it('stays 12 chars no matter how many files the shell has', async () => {
    const entries = [];
    for (let i = 0; i < 500; i++) entries.push({ path: 'site/js/m' + i + '.js', sha: 'f'.repeat(40) });
    assert.strictEqual((await computeShellVersion(entries, crypto.webcrypto.subtle)).length, 12);
  });

  it('changes when any one shell file changes', async () => {
    const a = [{ path: 'site/index.html', sha: '1' }, { path: 'site/css/tokens.css', sha: '2' }];
    const b = [{ path: 'site/index.html', sha: '1' }, { path: 'site/css/tokens.css', sha: '3' }];
    const s = crypto.webcrypto.subtle;
    assert.notStrictEqual(await computeShellVersion(a, s), await computeShellVersion(b, s));
  });

  it('is empty when there is no shell or no WebCrypto (insecure context)', async () => {
    assert.strictEqual(await computeShellVersion([], crypto.webcrypto.subtle), '');
    assert.strictEqual(await computeShellVersion([{ path: 'site/index.html', sha: '1' }], undefined), '');
  });
});

describe('computeShellVersion matches the deploy script', () => {
  it('JS over `git ls-tree HEAD` === tools/compute_shell_version.sh output', async () => {
    // Both read the committed HEAD tree, so the file set is identical; this
    // asserts the two implementations agree byte-for-byte.
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
    const fromJs = await computeShellVersion(entries, crypto.webcrypto.subtle);
    const fromSh = execFileSync('bash', ['tools/compute_shell_version.sh'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    assert.match(fromJs, /^[0-9a-f]{12}$/);
    assert.strictEqual(fromSh, fromJs);
  });
});
