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

// Repo access is the second key: a signed-in viewer whose token the repo
// permissions probe confirmed as push=true needs no passphrase. The grant is
// bound to the token it was measured for, so sign-out (or a different account)
// re-locks without anyone having to remember to clear it.
describe('passphrase_gate — repo-access grant', () => {
  it('a push=true grant for the current token counts as access', () => {
    assert.strictEqual(Gate.hasRepoAccess({ token: 'gho_a', push: true }, 'gho_a'), true);
  });
  it('push=false is no access', () => {
    assert.strictEqual(Gate.hasRepoAccess({ token: 'gho_a', push: false }, 'gho_a'), false);
  });
  it('a grant measured for another token is no access (account switch)', () => {
    assert.strictEqual(Gate.hasRepoAccess({ token: 'gho_a', push: true }, 'gho_b'), false);
  });
  it('signed out (no token) is no access even with a stale grant', () => {
    assert.strictEqual(Gate.hasRepoAccess({ token: 'gho_a', push: true }, ''), false);
    assert.strictEqual(Gate.hasRepoAccess({ token: 'gho_a', push: true }, null), false);
  });
  it('no grant yet is no access', () => {
    assert.strictEqual(Gate.hasRepoAccess(null, 'gho_a'), false);
  });
});

describe('passphrase_gate — isAllowed', () => {
  const expected = data.vectors[0].hash;
  it('gate disabled -> allowed', () => {
    assert.strictEqual(Gate.isAllowed('', memStorage(), false), true);
  });
  it('locked, no repo access -> not allowed', () => {
    assert.strictEqual(Gate.isAllowed(expected, memStorage(), false), false);
  });
  it('phrase already entered -> allowed', () => {
    const s = memStorage({ [Gate.STORAGE_KEY]: expected });
    assert.strictEqual(Gate.isAllowed(expected, s, false), true);
  });
  it('repo access -> allowed without the phrase', () => {
    assert.strictEqual(Gate.isAllowed(expected, memStorage(), true), true);
  });
  it('repo access does NOT persist an unlock (stays bound to the session)', () => {
    const s = memStorage();
    Gate.isAllowed(expected, s, true);
    assert.strictEqual(Gate.isUnlocked(expected, s), false);
  });
});
