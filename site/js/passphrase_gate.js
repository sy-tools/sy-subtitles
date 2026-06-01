// Passphrase gate — Python twin: tools/passphrase_gate.py.
//
// SOFT gate, NOT encryption: this file ships in the public SPA and the gated
// content is public on GitHub regardless. PBKDF2 only raises the cost of
// brute-forcing the phrase from the (public) hash; it does not protect content.
//
// Single source: loaded by the browser via <script src="js/passphrase_gate.js">
// in site/index.html AND required by tests/test_passphrase_gate.js. The hashing
// stays byte-identical to the .py twin (shared vectors in
// tests/fixtures/passphrase_gate_vectors.json).
//
// GATE_SALT / GATE_ITERATIONS are the single source of truth for the KDF params
// (deploy-pages.yml greps them out to compute the injected hash).

(function () {
  var GATE_SALT = 'a3f1c92e6b4d80571e2c9f3a6d8b0e47'; // 16-byte hex (public)
  var GATE_ITERATIONS = 200000;
  var STORAGE_KEY = 'sy_gate';

  function hexToBytes(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }
  function bytesToHex(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return s;
  }

  function derivePassphraseHash(phrase) {
    // Node (tests): synchronous PBKDF2, wrapped so the API matches the browser's
    // async Web Crypto path. Both are RFC 2898 PBKDF2-HMAC-SHA256 -> identical.
    if (typeof module !== 'undefined' && module.exports) {
      var nodeCrypto = require('crypto');
      var hex = nodeCrypto
        .pbkdf2Sync(Buffer.from(phrase, 'utf-8'), Buffer.from(GATE_SALT, 'hex'), GATE_ITERATIONS, 32, 'sha256')
        .toString('hex');
      return Promise.resolve(hex);
    }
    var enc = new TextEncoder();
    return crypto.subtle
      .importKey('raw', enc.encode(phrase), { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: hexToBytes(GATE_SALT), iterations: GATE_ITERATIONS, hash: 'SHA-256' },
          key,
          256
        );
      })
      .then(function (bits) { return bytesToHex(bits); });
  }

  function verifyPassphrase(phrase, expectedHash) {
    if (!expectedHash) return Promise.resolve(false);
    return derivePassphraseHash(phrase).then(function (h) { return h === expectedHash; });
  }

  function isGateEnabled(expectedHash) { return !!expectedHash; }

  function isUnlocked(expectedHash, storage) {
    if (!expectedHash) return false;
    try { return storage.getItem(STORAGE_KEY) === expectedHash; } catch (e) { return false; }
  }

  function recordUnlock(expectedHash, storage) {
    try { storage.setItem(STORAGE_KEY, expectedHash); } catch (e) {}
  }

  var api = {
    GATE_SALT: GATE_SALT,
    GATE_ITERATIONS: GATE_ITERATIONS,
    STORAGE_KEY: STORAGE_KEY,
    derivePassphraseHash: derivePassphraseHash,
    verifyPassphrase: verifyPassphrase,
    isGateEnabled: isGateEnabled,
    isUnlocked: isUnlocked,
    recordUnlock: recordUnlock,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // Node (tests)
  } else {
    this.PassphraseGate = api; // Browser: single namespace global
  }
}).call(typeof globalThis !== 'undefined' ? globalThis : this);
