// Guard: the app's CSS lives in external site/css/*.css, never inline in
// index.html. Before this refactor the page carried ~1100 lines of CSS across
// three <style> blocks; they were extracted into linked stylesheets so the
// design system has a single, discoverable source of truth (and so the SW
// precache + shell-version contracts can track CSS the same way they track js).
// This test fails loudly if any inline <style> creeps back, or if a linked sheet
// goes missing from disk.
//
// The app's CSS is two linked sheets: tokens.css (the token/contract layer) then
// components.css (consumers). The generic checks below pin the core invariants
// (no inline CSS; every linked sheet exists); a dedicated check pins the
// tokens-before-components load order the cascade depends on.

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

  it('tokens.css is linked before components.css (cascade order)', () => {
    const sheets = linkedCss(html());
    const t = sheets.indexOf('css/tokens.css');
    const c = sheets.indexOf('css/components.css');
    assert.ok(t !== -1, 'css/tokens.css must be linked');
    assert.ok(c !== -1, 'css/components.css must be linked');
    assert.ok(t < c, 'tokens.css must be linked before components.css');
  });
});
