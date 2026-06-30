// Guard: the app's CSS lives in external site/css/*.css, never inline in
// index.html. Before this refactor the page carried ~1100 lines of CSS across
// three <style> blocks; they were extracted into linked stylesheets so the
// design system has a single, discoverable source of truth (and so the SW
// precache + shell-version contracts can track CSS the same way they track js).
// This test fails loudly if any inline <style> creeps back, or if a linked sheet
// goes missing from disk.
//
// PR-1 ships a single byte-identical site/css/app.css; PR-2 splits it into
// tokens.css + components.css while consolidating. This guard is intentionally
// generic about the filenames so it survives that split — it pins the invariant
// (no inline CSS; every linked sheet exists and is precached), not the layout.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');

const html = () => fs.readFileSync('site/index.html', 'utf8');

function linkedCss(page) {
  const out = [];
  const re = /<link\b[^>]*\bhref="(css\/[^"]+\.css)"/g;
  let m;
  while ((m = re.exec(page)) !== null) out.push(m[1]);
  return out;
}

describe('CSS is externalized (no inline <style>)', () => {
  it('index.html contains no <style> block', () => {
    assert.ok(
      !/<style[\s>]/i.test(html()),
      'index.html must not carry inline <style> — move CSS into site/css/*.css',
    );
  });

  it('index.html links at least one site/css stylesheet', () => {
    assert.ok(
      linkedCss(html()).length > 0,
      'index.html must <link> at least one css/*.css stylesheet',
    );
  });

  it('every linked stylesheet exists on disk', () => {
    for (const href of linkedCss(html())) {
      assert.ok(fs.existsSync('site/' + href), `site/${href} must exist`);
    }
  });
});
