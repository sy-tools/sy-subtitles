// Parity tests for the text hygiene rules (JS twin of tools/text_normalize.py).
// Reads the SAME fixture as tests/test_text_normalize_parity.py so the two
// implementations cannot drift apart silently.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const mod = require('../site/js/text_sanitize.js');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'text_hygiene_cases.json'), 'utf8')
);

const FNS = {
  sanitize_invisible: (c) => mod.sanitizeInvisible(c.input),
  sanitize_field_text: (c) => mod.sanitizeFieldText(c.input),
  normalize_uk_typography: (c) => mod.normalizeUkTypography(c.input),
  sanitize_edited_text: (c) => mod.sanitizeEditedText(c.input, c.lang),
};

for (const c of fixture.cases) {
  test(`${c.fn}(${JSON.stringify(c.input)}) === ${JSON.stringify(c.expected)}`, () => {
    const fn = FNS[c.fn];
    assert.ok(fn, `unknown fixture fn: ${c.fn}`);
    assert.strictEqual(fn(c), c.expected);
  });
}

test('every fixture function name is exercised', () => {
  const used = new Set(fixture.cases.map((c) => c.fn));
  for (const name of Object.keys(FNS)) {
    assert.ok(used.has(name), `fixture has no case for ${name}`);
  }
});
