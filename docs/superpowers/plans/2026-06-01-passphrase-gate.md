# Passphrase Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prompt for a passphrase the first time a user opens a talk's preview or review in the SPA; a correct passphrase (verified against a slow PBKDF2 hash) unlocks both views per-browser until the site passphrase is rotated.

**Architecture:** A pure dual-mode JS module (`site/js/passphrase_gate.js`, Node-tested twin of `tools/passphrase_gate.py`) does PBKDF2 hashing + unlock-state checks. `site/index.html` adds a passphrase modal, a click-interceptor on the index, and a `route()` deep-link guard. The literal passphrase lives only in the `GATE_PASSPHRASE` GitHub secret; the deploy workflow computes the hash and `sed`-injects it into `var APP_GATE_HASH`. Unlock is stored as the hash in `localStorage` and compared each access (rotation re-prompts). Empty hash ⇒ gate disabled (fail-open).

**Tech Stack:** Vanilla ES5-style JS (browser + `node --test`), Python stdlib (`hashlib`), Playwright (pytest), GitHub Actions.

**Threat model (keep honest):** This is a SOFT gate. The transcripts/SRT/`video_ref`s stay public on GitHub, and the hash ships in the deployed JS — anyone reading it or hitting GitHub raw can bypass. The gate stops casual browsing and keeps the *literal* passphrase out of the repo. Do not describe it as encryption.

**Fixed constants (used throughout — keep identical in JS, fixture, and any test):**
- `GATE_SALT = 'a3f1c92e6b4d80571e2c9f3a6d8b0e47'` (16-byte hex, public)
- `GATE_ITERATIONS = 200000`
- Storage key: `sy_gate`
- Reference hashes (PBKDF2-HMAC-SHA256, 32-byte hex, computed with the salt+iters above):
  - `test-passphrase` → `289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f`
  - `correct-horse-battery` → `f3267b29331e95b8d025040f16559d2744232110081a3cf1fe8a38592bebd3c7`
- **Never** put the real passphrase or its hash in any committed file. The passphrase exists only in the `GATE_PASSPHRASE` secret; the hash is injected at deploy time. (For local manual testing, derive the hash from the secret value yourself and inject it via `window.__SY_GATE_HASH` in devtools — do not write it to a tracked file.)

---

### Task 1: Python hash module + CLI

**Files:**
- Create: `tools/passphrase_gate.py`
- Test: `tests/test_passphrase_gate.py`

- [ ] **Step 1: Write the failing test**

Create `tests/test_passphrase_gate.py`:

```python
"""Tests for the passphrase-gate hash (tools/passphrase_gate.py).

Twin of site/js/passphrase_gate.js. SOFT gate, not encryption: the hash ships
publicly and the gated content is public on GitHub regardless. These tests pin
the PBKDF2 output and the cross-language vectors shared with the JS twin.
"""

import json
from pathlib import Path

from tools.passphrase_gate import derive_hash, main

SALT = "a3f1c92e6b4d80571e2c9f3a6d8b0e47"
ITERS = 200000
VECTORS_PATH = Path(__file__).parent / "fixtures" / "passphrase_gate_vectors.json"


def test_derive_hash_matches_known_reference():
    assert (
        derive_hash("test-passphrase", SALT, ITERS)
        == "289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f"
    )


def test_derive_hash_is_64_hex_chars():
    h = derive_hash("anything", SALT, ITERS)
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)


def test_cli_hash_prints_only_the_hash(capsys):
    main(["hash", "--salt", SALT, "--iterations", str(ITERS), "test-passphrase"])
    out = capsys.readouterr().out.strip()
    assert out == "289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f"
    # The phrase must never leak to stdout.
    assert "test-passphrase" not in out
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_passphrase_gate.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools.passphrase_gate'`

- [ ] **Step 3: Write minimal implementation**

Create `tools/passphrase_gate.py`:

```python
"""Passphrase-gate hash — Python twin of site/js/passphrase_gate.js.

Used by .github/workflows/deploy-pages.yml to turn the GATE_PASSPHRASE secret
into the PBKDF2 hash injected into the SPA (var APP_GATE_HASH). The literal
passphrase is NEVER printed or committed; only the hash is emitted.

This is a SOFT gate, NOT encryption: the hash ships publicly in the deployed
site and the content behind the gate is public on GitHub regardless. The JS
twin (site/js/passphrase_gate.js) must produce identical output, enforced by
the shared vectors in tests/fixtures/passphrase_gate_vectors.json.
"""

from __future__ import annotations

import hashlib


def derive_hash(phrase: str, salt_hex: str, iterations: int) -> str:
    """PBKDF2-HMAC-SHA256(phrase, salt) -> 32-byte digest as lowercase hex."""
    dk = hashlib.pbkdf2_hmac(
        "sha256", phrase.encode("utf-8"), bytes.fromhex(salt_hex), iterations, dklen=32
    )
    return dk.hex()


def main(argv: list[str] | None = None) -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Compute the passphrase-gate hash.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("hash", help="phrase -> PBKDF2 hex hash")
    h.add_argument("phrase")
    h.add_argument("--salt", required=True, help="salt as hex")
    h.add_argument("--iterations", type=int, required=True)
    args = parser.parse_args(argv)

    if args.cmd == "hash":
        print(derive_hash(args.phrase, args.salt, args.iterations))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_passphrase_gate.py -v`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/passphrase_gate.py tests/test_passphrase_gate.py
git commit -m "Add passphrase-gate PBKDF2 hash module + CLI (Python twin)"
```

---

### Task 2: Shared cross-language vectors fixture

**Files:**
- Create: `tests/fixtures/passphrase_gate_vectors.json`
- Modify: `tests/test_passphrase_gate.py` (add cross-language vector test)

- [ ] **Step 1: Write the failing test**

Append to `tests/test_passphrase_gate.py`:

```python
def test_cross_language_vectors_match():
    """Frozen vectors shared byte-for-byte with tests/test_passphrase_gate.js.

    This is the contract that keeps the Python and JS hashes identical. Phrases
    are synthetic — NEVER the real passphrase.
    """
    data = json.loads(VECTORS_PATH.read_text(encoding="utf-8"))
    assert data["salt"] == SALT
    assert data["iterations"] == ITERS
    assert data["vectors"], "vectors file must not be empty"
    for vec in data["vectors"]:
        assert derive_hash(vec["phrase"], data["salt"], data["iterations"]) == vec["hash"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_passphrase_gate.py::test_cross_language_vectors_match -v`
Expected: FAIL — `FileNotFoundError` (fixture missing)

- [ ] **Step 3: Create the fixture**

Create `tests/fixtures/passphrase_gate_vectors.json`:

```json
{
  "salt": "a3f1c92e6b4d80571e2c9f3a6d8b0e47",
  "iterations": 200000,
  "vectors": [
    {
      "phrase": "test-passphrase",
      "hash": "289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f"
    },
    {
      "phrase": "correct-horse-battery",
      "hash": "f3267b29331e95b8d025040f16559d2744232110081a3cf1fe8a38592bebd3c7"
    }
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest tests/test_passphrase_gate.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/fixtures/passphrase_gate_vectors.json tests/test_passphrase_gate.py
git commit -m "Add shared passphrase-gate hash vectors (Python side)"
```

---

### Task 3: JS hash module (dual-mode twin)

**Files:**
- Create: `site/js/passphrase_gate.js`
- Create: `tests/test_passphrase_gate.js`
- Modify: `tests/test_passphrase_gate.py` (add JS-constants drift guard)

- [ ] **Step 1: Write the failing Node test**

Create `tests/test_passphrase_gate.js`:

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/test_passphrase_gate.js`
Expected: FAIL — `Cannot find module '../site/js/passphrase_gate'`

- [ ] **Step 3: Write minimal implementation**

Create `site/js/passphrase_gate.js`:

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/test_passphrase_gate.js`
Expected: PASS (all suites)

- [ ] **Step 5: Add the JS-constants drift guard (Python)**

Append to `tests/test_passphrase_gate.py`:

```python
def test_js_module_constants_match_vectors():
    """The JS twin's GATE_SALT/GATE_ITERATIONS must match the fixture, so the
    deploy workflow (which greps them out of the JS) computes the right hash."""
    js = (Path(__file__).parent.parent / "site" / "js" / "passphrase_gate.js").read_text()
    data = json.loads(VECTORS_PATH.read_text(encoding="utf-8"))
    assert f"GATE_SALT = '{data['salt']}'" in js
    assert f"GATE_ITERATIONS = {data['iterations']}" in js
```

- [ ] **Step 6: Run both test suites**

Run: `python -m pytest tests/test_passphrase_gate.py -v && node --test tests/test_passphrase_gate.js`
Expected: PASS (Python 5 tests; Node all suites)

- [ ] **Step 7: Commit**

```bash
git add site/js/passphrase_gate.js tests/test_passphrase_gate.js tests/test_passphrase_gate.py
git commit -m "Add passphrase-gate JS hash module (dual-mode twin) + cross-language tests"
```

---

### Task 4: Wire the gate seam into index.html (static bits)

**Files:**
- Modify: `site/index.html` (script include ~line 23; `APP_GATE_HASH` + `GATE_COPY` ~line 1772; modal CSS ~lines 1013–1083)
- Modify: `tests/test_passphrase_gate.py` (placeholder guard)

- [ ] **Step 1: Write the failing placeholder-guard test**

Append to `tests/test_passphrase_gate.py`:

```python
def test_index_html_has_gate_hash_placeholder():
    """The deploy workflow seds this exact line; if it ever changes, the deploy
    silently ships an empty (disabled) gate. Pin the sed target."""
    idx = (Path(__file__).parent.parent / "site" / "index.html").read_text()
    assert "var APP_GATE_HASH = '';" in idx
    assert "js/passphrase_gate.js" in idx
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_passphrase_gate.py::test_index_html_has_gate_hash_placeholder -v`
Expected: FAIL — assertion error (placeholder/script not present yet)

- [ ] **Step 3: Add the `<script>` include**

In `site/index.html`, after line 23 (`<script src="js/talk_actions.js"></script>`), add:

```html
<script src="js/passphrase_gate.js"></script>
```

- [ ] **Step 4: Add the injected-hash placeholder + prompt copy**

In `site/index.html`, find (around line 1771):

```javascript
var APP_DEPLOY_SHA = ''; // app-shell version (index.html + js/*.js) at deploy
var APP_DEPLOY_DATE = ''; // deploy date YYYY-MM-DD
```

Add immediately after the `APP_DEPLOY_DATE` line:

```javascript
var APP_GATE_HASH = ''; // passphrase-gate PBKDF2 hash, injected at deploy from the GATE_PASSPHRASE secret (empty => gate disabled / fail-open)
var GATE_COPY = 'Введіть пароль для доступу'; // passphrase prompt heading
```

- [ ] **Step 5: Add modal input CSS**

In `site/index.html`, read the modal style block (~lines 1013–1083) and add these two rules immediately after the `.sy-modal-actions { ... }` rule:

```css
    .sy-modal-input { width: 100%; box-sizing: border-box; padding: 8px 10px; margin-top: 6px; font-size: 15px; border: 1px solid var(--border, #cccccc); border-radius: 6px; background: var(--bg, #ffffff); color: var(--fg, #111111); }
    .sy-modal-error { color: #c0392b; font-size: 13px; margin-top: 6px; }
```

- [ ] **Step 6: Run the guard test + full JS/PY suites**

Run: `python -m pytest tests/test_passphrase_gate.py -v`
Expected: PASS (6 tests)

- [ ] **Step 7: Commit**

```bash
git add site/index.html tests/test_passphrase_gate.py
git commit -m "Wire passphrase-gate seam into the SPA shell (script, placeholder, copy, CSS)"
```

---

### Task 5: Passphrase modal + index click-interception (E2E-driven)

**Files:**
- Modify: `tests/test_preview_spa.py` (gate fixtures + flow tests)
- Modify: `site/index.html` (modal + `gateExpectedHash`/`ensureUnlocked` + click listener; add after `SPA.toast` ~line 2771)

- [ ] **Step 1: Write the failing E2E tests**

Append to `tests/test_preview_spa.py`:

```python
GATE_TEST_PHRASE = "test-passphrase"
GATE_TEST_HASH = "289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f"


def _enable_gate(pg):
    """Inject the expected hash so the gate is active (set BEFORE goto)."""
    pg.add_init_script(f"window.__SY_GATE_HASH = '{GATE_TEST_HASH}';")


class TestPassphraseGate:
    def test_clicking_preview_link_prompts_on_index(self, server, page):
        _enable_gate(page)
        goto_spa(page, server)
        page.wait_for_selector("a.preview-link", timeout=10000)
        page.click("a.preview-link")
        page.wait_for_selector("#sy-gate-input", timeout=2000)
        # Still on the index; preview NOT rendered.
        assert "active" in page.locator("#view-index").get_attribute("class")
        assert "active" not in page.locator("#view-preview").get_attribute("class")

    def test_wrong_passphrase_shows_error_no_nav(self, server, page):
        _enable_gate(page)
        goto_spa(page, server)
        page.wait_for_selector("a.preview-link", timeout=10000)
        page.click("a.preview-link")
        page.fill("#sy-gate-input", "wrong-phrase")
        page.click(".sy-modal-btn.primary")
        page.wait_for_selector(".sy-modal-error", state="visible", timeout=2000)
        assert "active" not in page.locator("#view-preview").get_attribute("class")
        assert page.locator("#sy-gate-input").count() == 1  # modal still open

    def test_correct_passphrase_navigates_to_preview(self, server, page):
        _enable_gate(page)
        goto_spa(page, server)
        page.wait_for_selector("a.preview-link", timeout=10000)
        page.click("a.preview-link")
        page.fill("#sy-gate-input", GATE_TEST_PHRASE)
        page.press("#sy-gate-input", "Enter")
        # 6000ms: PBKDF2(200k) verify + preview render can be slow on CI.
        page.wait_for_selector("#view-preview.active", timeout=6000)
        assert page.locator(".sy-modal").count() == 0

    def test_cancel_stays_on_index(self, server, page):
        _enable_gate(page)
        goto_spa(page, server)
        page.wait_for_selector("a.preview-link", timeout=10000)
        page.click("a.preview-link")
        page.wait_for_selector("#sy-gate-input", timeout=2000)
        page.click(".sy-modal-btn:not(.primary)")
        page.wait_for_selector(".sy-modal", state="detached", timeout=2000)
        assert "active" in page.locator("#view-index").get_attribute("class")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_preview_spa.py::TestPassphraseGate -v`
Expected: FAIL — `#sy-gate-input` never appears (modal/wiring not implemented). If Playwright is not installed the class is skipped; install with `pip install playwright && playwright install chromium`.

- [ ] **Step 3: Implement the modal + helpers + click interceptor**

In `site/index.html`, immediately after the `SPA.toast = function(msg) { ... };` block (ends ~line 2771), add:

```javascript
// ----- Passphrase gate (soft, client-side) -----
// Expected hash: test/dev override first, then the deploy-injected value.
// Empty => gate disabled (fail-open). See site/js/passphrase_gate.js.
function gateExpectedHash() {
  if (typeof window !== 'undefined' && typeof window.__SY_GATE_HASH === 'string') {
    return window.__SY_GATE_HASH;
  }
  return APP_GATE_HASH || '';
}

// Resolves true if access is allowed (gate disabled, already unlocked, or a
// correct passphrase was just entered); false if the user cancelled.
function ensureUnlocked() {
  var expected = gateExpectedHash();
  if (!PassphraseGate.isGateEnabled(expected)) return Promise.resolve(true);
  if (PassphraseGate.isUnlocked(expected, localStorage)) return Promise.resolve(true);
  return SPA.passphrasePrompt(expected);
}

SPA.passphrasePrompt = function(expectedHash) {
  return new Promise(function(resolve) {
    var prev = document.activeElement;
    var backdrop = document.createElement('div');
    backdrop.className = 'sy-modal-backdrop';
    var modal = document.createElement('div');
    modal.className = 'sy-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    var h = document.createElement('h3');
    h.className = 'sy-modal-title';
    h.textContent = GATE_COPY;
    modal.appendChild(h);

    var input = document.createElement('input');
    input.type = 'password';
    input.id = 'sy-gate-input';
    input.className = 'sy-modal-input';
    input.setAttribute('autocomplete', 'current-password');
    modal.appendChild(input);

    var err = document.createElement('div');
    err.className = 'sy-modal-error';
    err.style.display = 'none';
    err.textContent = 'Невірний пароль';
    modal.appendChild(err);

    var actions = document.createElement('div');
    actions.className = 'sy-modal-actions';
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'sy-modal-btn';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Скасувати';
    var okBtn = document.createElement('button');
    okBtn.className = 'sy-modal-btn primary';
    okBtn.type = 'button';
    okBtn.textContent = 'Увійти';
    actions.appendChild(cancelBtn);
    actions.appendChild(okBtn);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    var done = false;
    function close(val) {
      if (done) return; done = true;
      backdrop.style.animation = 'sy-fade-in .12s reverse';
      setTimeout(function() { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 120);
      document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus) try { prev.focus(); } catch(_){}
      resolve(val);
    }
    function submit() {
      PassphraseGate.verifyPassphrase(input.value, expectedHash).then(function(ok) {
        if (ok) {
          PassphraseGate.recordUnlock(expectedHash, localStorage);
          close(true);
        } else {
          err.style.display = '';
          input.value = '';
          input.focus();
        }
      });
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(false); }
      if (e.key === 'Enter')  { e.preventDefault(); submit(); }
    }
    backdrop.addEventListener('click', function(e) { if (e.target === backdrop) close(false); });
    cancelBtn.addEventListener('click', function() { close(false); });
    okBtn.addEventListener('click', submit);
    document.addEventListener('keydown', onKey, true);
    setTimeout(function() { input.focus(); }, 20);
  });
};

// Intercept clicks on gated links from the index so the prompt appears BEFORE
// navigation. Correct phrase -> navigate; cancel -> stay put (no navigation).
document.addEventListener('click', function(e) {
  var a = e.target && e.target.closest ? e.target.closest('a') : null;
  if (!a) return;
  var href = a.getAttribute('href') || '';
  if (!/^#\/(preview|review)\//.test(href)) return;
  var expected = gateExpectedHash();
  if (!PassphraseGate.isGateEnabled(expected)) return;          // gate off -> normal nav
  if (PassphraseGate.isUnlocked(expected, localStorage)) return; // already unlocked
  e.preventDefault();
  ensureUnlocked().then(function(ok) { if (ok) location.hash = href; });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `python -m pytest tests/test_preview_spa.py::TestPassphraseGate -v`
Expected: PASS (4 tests)

> If `test_correct_passphrase_navigates_to_preview` fails at the verify step
> (modal never closes / no navigation), confirm `crypto.subtle` is available in
> the test page. It IS on `http://127.0.0.1` (a secure context in Chromium), so
> a failure here points to a wiring bug, not a missing API.

- [ ] **Step 5: Commit**

```bash
git add site/index.html tests/test_preview_spa.py
git commit -m "Add passphrase modal + index click-gate (prompt before navigation)"
```

---

### Task 6: Deep-link guard + persisted unlock + fail-open (E2E-driven)

**Files:**
- Modify: `tests/test_preview_spa.py` (3 more gate tests)
- Modify: `site/index.html` (`route()` guard; ~line 2831)

- [ ] **Step 1: Write the failing E2E tests**

Append to `class TestPassphraseGate` in `tests/test_preview_spa.py`:

```python
    def test_deep_link_to_review_while_locked_redirects_and_prompts(self, server, page):
        _enable_gate(page)
        goto_spa(page, server, "#/review/2001-01-01_Test-Talk")
        page.wait_for_selector("#sy-gate-input", timeout=4000)
        # Redirected to the index; review NOT rendered.
        assert "active" in page.locator("#view-index").get_attribute("class")
        assert "active" not in page.locator("#view-review").get_attribute("class")
        # Correct phrase -> proceeds to the originally-requested review.
        page.fill("#sy-gate-input", GATE_TEST_PHRASE)
        page.press("#sy-gate-input", "Enter")
        page.wait_for_selector("#view-review.active", timeout=6000)

    def test_already_unlocked_browser_skips_prompt(self, server, page):
        _enable_gate(page)
        page.add_init_script(f"localStorage.setItem('sy_gate', '{GATE_TEST_HASH}');")
        goto_spa(page, server, "#/preview/2001-01-01_Test-Talk/Test-Video")
        page.wait_for_selector("#view-preview.active", timeout=6000)
        assert page.locator("#sy-gate-input").count() == 0

    def test_gate_disabled_opens_without_prompt(self, server, page):
        # No _enable_gate(): APP_GATE_HASH is empty -> fail-open.
        goto_spa(page, server, "#/preview/2001-01-01_Test-Talk/Test-Video")
        page.wait_for_selector("#view-preview.active", timeout=6000)
        assert page.locator("#sy-gate-input").count() == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m pytest tests/test_preview_spa.py::TestPassphraseGate -k "deep_link or already_unlocked or disabled" -v`
Expected: `test_deep_link...` FAILS (review renders, no prompt). `test_already_unlocked...` and `test_gate_disabled...` may already PASS (the click-gate path doesn't touch direct navigation, and unlocked/empty already short-circuit) — that's fine; the deep-link test is the one driving the guard.

- [ ] **Step 3: Implement the `route()` deep-link guard**

In `site/index.html`, find the start of `route()` (line 2831):

```javascript
function route() {
  var hash = location.hash.slice(1) || '/';

  // Pause video when leaving preview
```

Insert the guard between the `hash` line and the `// Pause video` comment:

```javascript
function route() {
  var hash = location.hash.slice(1) || '/';

  // Soft passphrase gate: a gated route reached while locked (e.g. a pasted
  // deep link) redirects to the index and prompts there; only a correct
  // passphrase proceeds to the original target.
  if (hash.startsWith('/preview/') || hash.startsWith('/review/')) {
    var gateHash = gateExpectedHash();
    if (PassphraseGate.isGateEnabled(gateHash) && !PassphraseGate.isUnlocked(gateHash, localStorage)) {
      var target = hash;
      if (previewState && previewState.player) { try { previewState.player.pause(); } catch(e) {} }
      document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
      history.replaceState(null, '', location.pathname + location.search);
      showIndex();
      ensureUnlocked().then(function(ok) { if (ok) location.hash = target; });
      return;
    }
  }

  // Pause video when leaving preview
```

(`location.hash = target` where `target` is e.g. `/preview/...` — the setter adds the leading `#`, re-firing `route()`, now unlocked, which renders the view.)

- [ ] **Step 4: Run the full gate E2E class**

Run: `python -m pytest tests/test_preview_spa.py::TestPassphraseGate -v`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the WHOLE preview SPA suite (no regressions)**

Run: `python -m pytest tests/test_preview_spa.py -v`
Expected: PASS (all existing + 7 new). The existing preview/review tests still pass because they never set `__SY_GATE_HASH`, so the gate is disabled (fail-open).

- [ ] **Step 6: Commit**

```bash
git add site/index.html tests/test_preview_spa.py
git commit -m "Guard deep links to preview/review with the passphrase gate"
```

---

### Task 7: Deploy-time hash injection

**Files:**
- Modify: `.github/workflows/deploy-pages.yml` (new step after "Stamp build info")

- [ ] **Step 1: Add the injection step**

In `.github/workflows/deploy-pages.yml`, after the `Stamp build info` step and before `Upload artifact`, add:

```yaml
      - name: Inject passphrase-gate hash
        env:
          GATE_PASSPHRASE: ${{ secrets.GATE_PASSPHRASE }}
        run: |
          set -euo pipefail
          if [ -z "${GATE_PASSPHRASE:-}" ]; then
            echo "::error::GATE_PASSPHRASE secret is empty/unset — refusing to ship an open gate"
            exit 1
          fi
          # GATE_SALT / GATE_ITERATIONS are the single source of truth in the JS module.
          SALT=$(grep -oE "GATE_SALT = '[0-9a-f]+'" site/js/passphrase_gate.js | grep -oE "[0-9a-f]{8,}")
          ITERS=$(grep -oE "GATE_ITERATIONS = [0-9]+" site/js/passphrase_gate.js | grep -oE "[0-9]+")
          if [ -z "$SALT" ] || [ -z "$ITERS" ]; then
            echo "::error::could not read GATE_SALT/GATE_ITERATIONS from site/js/passphrase_gate.js"
            exit 1
          fi
          HASH=$(python3 -m tools.passphrase_gate hash --salt "$SALT" --iterations "$ITERS" "$GATE_PASSPHRASE")
          sed -i "s/var APP_GATE_HASH = '';/var APP_GATE_HASH = '${HASH}';/" site/index.html
          # Assert the injection landed — never silently ship an empty (disabled) gate.
          grep -q "var APP_GATE_HASH = '${HASH}';" site/index.html || {
            echo "::error::gate hash injection failed (placeholder not found?)"
            exit 1
          }
          echo "Gate hash injected (length=${#HASH})"
```

(Notes: `python3` + stdlib only — no pip install needed; the secret is passed via env and never echoed; only the hash length is logged.)

- [ ] **Step 2: Lint the workflow YAML locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy-pages.yml')); print('yaml ok')"`
Expected: `yaml ok`

- [ ] **Step 3: Dry-run the extraction + hash locally (proves the step's logic)**

Run:
```bash
SALT=$(grep -oE "GATE_SALT = '[0-9a-f]+'" site/js/passphrase_gate.js | grep -oE "[0-9a-f]{8,}")
ITERS=$(grep -oE "GATE_ITERATIONS = [0-9]+" site/js/passphrase_gate.js | grep -oE "[0-9]+")
echo "salt=$SALT iters=$ITERS"
python3 -m tools.passphrase_gate hash --salt "$SALT" --iterations "$ITERS" test-passphrase
```
Expected: `salt=a3f1c92e6b4d80571e2c9f3a6d8b0e47 iters=200000` then `289fa9ee16cb75d517736c68cd7d9a646fde31efead2e17b59c3219bd1548f5f`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "Inject passphrase-gate hash from GATE_PASSPHRASE secret at deploy"
```

---

### Task 8: Docs, full test sweep, PR

**Files:**
- Modify: `CLAUDE.md` (tool list)

- [ ] **Step 1: Add the tool to CLAUDE.md**

In `CLAUDE.md`, in the `## Tools` code block, add (near the `vimeo_codec` entry):

```bash
# Passphrase-gate hash (used by deploy-pages.yml to inject APP_GATE_HASH from the
# GATE_PASSPHRASE secret). Twin of site/js/passphrase_gate.js.
python -m tools.passphrase_gate hash --salt <hex> --iterations <n> "<phrase>"
```

- [ ] **Step 2: Run the entire test suite**

Run:
```bash
python -m pytest tests/ -q
node --test tests/test_*.js
```
Expected: all green (Python incl. the new gate tests + Playwright; JS incl. the new gate module tests).

- [ ] **Step 3: Verify no secret leaked into source (scan the WHOLE tree)**

The real invariant: source must never contain a populated `APP_GATE_HASH` — the
hash is only ever injected into the deploy artifact, never committed. (Do not
grep for the literal passphrase here; writing it into the check would itself be
the leak. Scan everything — no path exclusions.)

Run: `git grep -nE "APP_GATE_HASH = '[0-9a-fA-F]{16,}'"`
Expected: NO matches (committed `index.html` keeps `var APP_GATE_HASH = '';`).

Also confirm the secret value never reached any commit on this branch. Run the
following, substituting the real passphrase you set in the `GATE_PASSPHRASE`
secret for `<passphrase>` (do not write it into any tracked file):
Run: `git log -p origin/main..HEAD | grep -i "<passphrase>"`
Expected: NO output.

- [ ] **Step 4: Commit + push + open PR**

```bash
gh auth status   # confirm active account is SlavaSubotskiy
git add CLAUDE.md
git commit -m "Document the passphrase-gate hash tool"
git push -u origin feat/passphrase-gate
gh pr create --base main --title "Add soft passphrase gate for preview/review" \
  --body "$(cat <<'EOF'
Soft client-side passphrase gate. On first navigation to a talk's preview or
review the SPA prompts for a passphrase; a correct phrase (verified against a
slow PBKDF2 hash) unlocks both views per-browser until the passphrase is rotated.

- Hash-checked, not encryption: content stays public on GitHub; the hash ships
  publicly. The gate stops casual browsing and keeps the literal passphrase out
  of the repo (it lives only in the GATE_PASSPHRASE secret; the hash is injected
  at deploy time into APP_GATE_HASH).
- Unlock stored as the hash in localStorage and compared each access — rotating
  the passphrase re-prompts everyone.
- Index stays open; preview + review are gated (click-intercept on the index +
  route() deep-link guard). Empty hash => fail-open; deploy asserts non-empty.

Spec: docs/superpowers/specs/2026-06-01-passphrase-gate-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: After the PR deploys to Pages, smoke-test live**

Open the deployed site, click a preview link, confirm the prompt appears, enter the real passphrase (the value in the `GATE_PASSPHRASE` secret), confirm it unlocks and is remembered on reload. (Local manual check: serve `site/` and set `window.__SY_GATE_HASH` via devtools to the hash you derive from the secret value with `python -m tools.passphrase_gate hash --salt <salt> --iterations <iters> "<passphrase>"`, plus `?repo=sy-tools/sy-subtitles` for the repo override.)

---

## Self-Review

**Spec coverage:**
- Hash-checked gate (PBKDF2) → Tasks 1, 3. ✓
- Passphrase in secret, hash injected at deploy → Task 7. ✓
- Once-per-browser, rotation re-prompts (store + compare hash) → Task 3 (`isUnlocked`/`recordUnlock`), Task 6 (persisted test). ✓
- Coverage preview+review, index open → Task 5 (click-intercept on `.preview-link`/`.review-link`), Task 6 (route guard); index never gated. ✓
- Prompt on index, correct→navigate, cancel→stay → Task 5. ✓
- Deep-link guard → Task 6. ✓
- Fail-open + deploy non-empty assertion → Task 6 test, Task 7 step. ✓
- PBKDF2 cross-language identical → Tasks 1–3 shared vectors. ✓
- Dev/test seam `window.__SY_GATE_HASH` → Task 5 `_enable_gate`. ✓
- Placeholder copy `"Введіть пароль для доступу"` → Task 4 `GATE_COPY`. ✓
- Twin tests + fixtures (synthetic phrases) → Tasks 1–3. ✓
- CLAUDE.md tool entry → Task 8. ✓

**Placeholder scan:** No `TBD`/`TODO`; every code/step shows full content and exact commands. ✓

**Type/name consistency:** `PassphraseGate` namespace with `GATE_SALT`, `GATE_ITERATIONS`, `STORAGE_KEY`, `derivePassphraseHash`, `verifyPassphrase`, `isGateEnabled`, `isUnlocked`, `recordUnlock` used identically in module (Task 3), index wiring (Tasks 5–6), and tests. `gateExpectedHash`/`ensureUnlocked`/`SPA.passphrasePrompt` defined in Task 5 and consumed by the Task 6 guard. Storage key `sy_gate` consistent across JS, tests, and the persisted-unlock test. ✓
