const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { encodeVideoRef, decodeVideoRef } = require('../site/js/vimeo_codec');

// The contract that keeps the JS codec byte-identical to tools/vimeo_codec.py:
// the same frozen vectors are asserted by tests/test_vimeo_codec.py.
const vectors = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'vimeo_codec_vectors.json'), 'utf-8')
);

// Synthetic, obviously-fake placeholders only — never a real private link.
const CANONICAL_URLS = [
  'https://vimeo.com/111111111/aaaaaaaaaa',
  'https://vimeo.com/222222222/bbbbbbbbbb',
  'https://vimeo.com/123456789',
];

describe('vimeo_codec — round trip', () => {
  CANONICAL_URLS.forEach((url) => {
    it('round-trips ' + url, () => {
      assert.strictEqual(decodeVideoRef(encodeVideoRef(url)), url);
    });
  });
});

describe('vimeo_codec — stored form', () => {
  it('has r1 prefix, no vimeo substring, no slash or padding', () => {
    const ref = encodeVideoRef('https://vimeo.com/111111111/aaaaaaaaaa');
    assert.ok(ref.startsWith('r1'));
    assert.ok(!ref.toLowerCase().includes('vimeo'));
    assert.ok(!ref.includes('/'));
    assert.ok(!ref.includes('='));
    assert.match(ref, /^r1[A-Za-z0-9_-]+$/);
  });
});

describe('vimeo_codec — normalization & errors', () => {
  it('normalizes protocol/www/trailing-slash to canonical on decode', () => {
    ['http://vimeo.com/123/abc', 'https://www.vimeo.com/123/abc/', 'vimeo.com/123/abc'].forEach(
      (variant) => {
        assert.strictEqual(decodeVideoRef(encodeVideoRef(variant)), 'https://vimeo.com/123/abc');
      }
    );
  });

  it('rejects a non-vimeo url', () => {
    assert.throws(() => encodeVideoRef('https://evil.com/123/abc'));
  });

  it('rejects an unknown version on decode', () => {
    assert.throws(() => decodeVideoRef('r9zzzz'));
  });
});

describe('vimeo_codec — cross-language vectors (shared with Python)', () => {
  it('reproduces every frozen vector exactly', () => {
    assert.ok(vectors.length > 0, 'vectors file must not be empty');
    vectors.forEach((vec) => {
      assert.strictEqual(encodeVideoRef(vec.url), vec.ref, 'encode mismatch for ' + vec.url);
      assert.strictEqual(decodeVideoRef(vec.ref), vec.url, 'decode mismatch for ' + vec.ref);
    });
  });
});
