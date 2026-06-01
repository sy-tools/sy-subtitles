const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Gate = require('../site/js/passphrase_gate');

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'passphrase_gate_vectors.json'), 'utf-8')
);

function memStorage(initial) {
  const m = Object.assign({}, initial || {});
  return {
    getItem(k) { return k in m ? m[k] : null; },
    setItem(k, v) { m[k] = String(v); },
  };
}

describe('passphrase_gate — constants match the shared fixture', () => {
  it('GATE_SALT and GATE_ITERATIONS equal the fixture', () => {
    assert.strictEqual(Gate.GATE_SALT, data.salt);
    assert.strictEqual(Gate.GATE_ITERATIONS, data.iterations);
  });
});

describe('passphrase_gate — derivePassphraseHash (cross-language)', () => {
  data.vectors.forEach((vec) => {
    it('reproduces the frozen hash for ' + vec.phrase, async () => {
      assert.strictEqual(await Gate.derivePassphraseHash(vec.phrase), vec.hash);
    });
  });
});

describe('passphrase_gate — verifyPassphrase', () => {
  const expected = data.vectors[0].hash;
  it('true for the correct phrase', async () => {
    assert.strictEqual(await Gate.verifyPassphrase(data.vectors[0].phrase, expected), true);
  });
  it('false for a wrong phrase', async () => {
    assert.strictEqual(await Gate.verifyPassphrase('nope', expected), false);
  });
  it('false when the expected hash is empty (gate disabled)', async () => {
    assert.strictEqual(await Gate.verifyPassphrase(data.vectors[0].phrase, ''), false);
  });
});

describe('passphrase_gate — isGateEnabled', () => {
  it('false for empty, true for a hash', () => {
    assert.strictEqual(Gate.isGateEnabled(''), false);
    assert.strictEqual(Gate.isGateEnabled(data.vectors[0].hash), true);
  });
});

describe('passphrase_gate — unlock state (stores + compares the hash)', () => {
  const expected = data.vectors[0].hash;
  it('false when storage is empty', () => {
    assert.strictEqual(Gate.isUnlocked(expected, memStorage()), false);
  });
  it('false when the stored hash differs (rotation re-prompts)', () => {
    const s = memStorage({ sy_gate: 'old-rotated-away-hash' });
    assert.strictEqual(Gate.isUnlocked(expected, s), false);
  });
  it('true when the stored hash equals the expected hash', () => {
    const s = memStorage({ sy_gate: expected });
    assert.strictEqual(Gate.isUnlocked(expected, s), true);
  });
  it('recordUnlock writes the expected hash under sy_gate', () => {
    const s = memStorage();
    Gate.recordUnlock(expected, s);
    assert.strictEqual(s.getItem('sy_gate'), expected);
    assert.strictEqual(Gate.isUnlocked(expected, s), true);
  });
});
