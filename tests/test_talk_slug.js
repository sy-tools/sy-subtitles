// Parity tests for the canonical talk slugify (JS twin of tools/talk_slug.py).
// Reads the SAME fixture as tests/test_talk_slug.py so the two implementations
// cannot drift apart silently.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { slugify } = require('../site/js/talk_slug.js');

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'slug_cases.json'), 'utf8')
);

for (const c of fixture.cases) {
  test(`slugify(${JSON.stringify(c.input)}) === ${JSON.stringify(c.expected)}`, () => {
    assert.strictEqual(slugify(c.input), c.expected);
  });
}

test('slugify matches the SPA for the Raksha Bandhan talk', () => {
  assert.strictEqual(slugify('Raksha Bandhan and Maryadas'), 'Raksha-Bandhan-and-Maryadas');
});
