# Passphrase Gate for Preview & Review — Design

- **Date:** 2026-06-01
- **Status:** Approved (design); ready for implementation plan
- **Branch:** `feat/passphrase-gate`

## Goal

When a user first opens a talk's **preview** or **review** view in the SPA,
prompt for a passphrase. Only a correct passphrase lets them through. The
unlock is remembered per browser so they are not asked again — until the site
passphrase is rotated.

## Threat model (honest framing)

This is a **soft gate**, not real access control. The transcripts, SRT, and
`video_ref`s behind preview/review are fetched from the **public** GitHub repo,
so anyone can read that content straight from GitHub raw regardless of the SPA.
The gate logic and the expected hash also ship publicly in the deployed site.

What the gate *does* buy:

- Stops casual / accidental browsing of in-progress review work.
- Lets one shared passphrase be handed to collaborators.
- The **literal passphrase never appears in the repo or git history** — it lives
  only in a GitHub Actions secret; only a slow PBKDF2 **hash** ships, injected at
  deploy time.

What it does **not** buy: protection against anyone who reads the deployed JS,
sets `localStorage` by hand, or fetches the raw content from GitHub. Same stance
as the `video_ref` obfuscation (PR #448).

## Decisions (locked)

| Question | Decision |
| --- | --- |
| Protection level | Hash-checked gate (no literal phrase in source) |
| Re-prompt | Once per browser; rotating the passphrase re-prompts everyone |
| Coverage | Preview **and** review; the index (talk list) stays open |
| Wrong / cancel | Prompt fires **on the index** when a gated link is clicked; correct → navigate; cancel/Esc → stay on index (no navigation). Wrong → inline error + retry. |
| Hash | PBKDF2-HMAC-SHA256, slow (deliberate brute-force cost) |
| Stored unlock | Store the **hash** (not a boolean) and compare it to the current expected hash on every gated access |
| Hash provenance | Passphrase in GitHub secret `GATE_PASSPHRASE`; hash computed + injected at deploy time |
| Passphrase value | Stored only in the `GATE_PASSPHRASE` secret; never committed |
| Prompt copy | Placeholder `"Введіть пароль для доступу"` (single editable string) |

## Architecture

### Components

1. **`site/js/passphrase_gate.js`** — dual-mode shared module (browser global +
   Node `require`), the project's established twin pattern (cf.
   `site/js/vimeo_codec.js`). Pure, DOM-free logic:
   - `GATE_SALT` (hex) and `GATE_ITERATIONS` (int) — committed constants and the
     **single source of truth** for the KDF parameters.
   - `derivePassphraseHash(phrase)` → `Promise<hex>` (Web Crypto PBKDF2 in the
     browser; `node:crypto` `pbkdf2` in Node — both RFC 2898, byte-identical).
   - `verifyPassphrase(phrase, expectedHash)` → `Promise<bool>`.
   - `isGateEnabled(expectedHash)` → `bool` (false when the hash is empty).
   - `isUnlocked(expectedHash, storage)` → `bool` (stored hash === expectedHash).
   - `recordUnlock(expectedHash, storage)` → writes the hash to `sy_gate`.

2. **`tools/passphrase_gate.py`** — Python twin + CLI used **by the deploy
   workflow** to turn the secret into a hash:
   `python -m tools.passphrase_gate hash --salt <hex> --iterations <n> "<phrase>"`
   → prints the hex hash to stdout (and nothing else; the phrase is never
   echoed). Still usable locally to mint a dev/test hash.

3. **`tests/fixtures/passphrase_gate_vectors.json`** — shared `(phrase, salt,
   iterations) → hash` vectors using **synthetic** phrases (never the real passphrase).
   Asserted from both the Node and Python tests so the two implementations stay
   byte-identical.

4. **`site/index.html`** changes:
   - `<script src="js/passphrase_gate.js">` in `<head>` (loaded before the inline
     script, like `vimeo_codec.js`).
   - `var APP_GATE_HASH = '';` placeholder near `APP_DEPLOY_SHA`
     (`index.html:1771`), filled at deploy via `sed`.
   - `var GATE_COPY = 'Введіть пароль для доступу';` (single editable string).
   - Expected hash resolution at verify time:
     `window.__SY_GATE_HASH ?? APP_GATE_HASH ?? ''` (window override for
     tests/dev; injected value in production; empty ⇒ gate disabled).
   - A passphrase modal reusing the existing `.sy-modal` infrastructure
     (`SPA.confirm` machinery at `index.html:2683`): backdrop, focus trap,
     Esc/Enter, animations — extended with a `<input type="password">` and an
     inline error line.
   - `ensureUnlocked()` → `Promise<bool>`: resolves `true` immediately if already
     unlocked or the gate is disabled; otherwise opens the modal, verifies on
     submit (correct → `recordUnlock` + resolve `true`; wrong → inline error,
     stay open; cancel/Esc → resolve `false`).

### Control flow

**Primary — click on a gated link from the index.** A delegated click listener
on the index intercepts anchors targeting `#/preview/…` or `#/review/…`. If the
gate is enabled and not unlocked: `preventDefault()`, call `ensureUnlocked()`
(modal appears while still on the index). On `true`, set `location.hash` to the
intended target. On `false`, do nothing — we stayed on the index.

**Defensive — deep link / pasted URL.** At the top of the `/preview/` and
`/review/` branches of `route()` (`index.html:2841`, `2849`), before the gated
view is made active: if the gate is enabled and not unlocked, render the **index**
view instead, capture the requested target, and call `ensureUnlocked()`. On
`true`, navigate to the captured target (which re-enters `route()`, now
unlocked, and renders normally). On `false`, stay on the index. This closes the
"just type the hash" bypass. No flash of gated content, no hashchange loop (once
unlocked the guard passes).

### Hashing & rotation

- PBKDF2-HMAC-SHA256, 32-byte output, hex-encoded. `GATE_ITERATIONS` chosen for a
  meaningful brute-force cost (target ~0.2–0.5 s in-browser; tunable). `GATE_SALT`
  is a fixed committed 16-byte hex value (public — its only job here is to force a
  fresh brute force per target, which the iteration count dominates anyway).
- The salt is **fixed across deploys** so the injected hash is deterministic and
  stable — otherwise every deploy would change the hash and re-prompt everyone.
- Rotation = change the `GATE_PASSPHRASE` secret and redeploy → new hash injected
  → every stored `sy_gate` value mismatches → everyone re-prompted. This is the
  kill switch. **Note:** changing the secret alone does *not* trigger
  `deploy-pages.yml` (it runs on push to `site/**` or `workflow_dispatch`), so
  rotation means manually re-running the deploy workflow.

### Storage semantics

- Key `sy_gate` (joins the existing `sy_`-prefixed convention) holds the **hash
  string**, not a boolean.
- On every gated access: read `sy_gate`; allow iff it equals the current expected
  hash. `localStorage` (not cookies): the site is static/serverless so cookies add
  nothing, and the "secure" cookie variants need a server. No client store is
  tamper-proof here (the expected hash is public), so this is about
  convenience/consistency, not security.

### Deploy integration (`deploy-pages.yml`)

Extend the existing "Stamp build info" step (which already `sed`s `APP_DEPLOY_SHA`
and `APP_DEPLOY_DATE` into `index.html`):

1. Derive `GATE_SALT` and `GATE_ITERATIONS` from the committed
   `site/js/passphrase_gate.js` (single source of truth; simple extraction).
2. `HASH=$(python -m tools.passphrase_gate hash --salt "$SALT" --iterations "$ITERS" "$GATE_PASSPHRASE")`
   with `GATE_PASSPHRASE` from `secrets.GATE_PASSPHRASE` (env, never echoed).
3. `sed -i "s/var APP_GATE_HASH = '';/var APP_GATE_HASH = '${HASH}';/" site/index.html`.
4. **Assert** `APP_GATE_HASH` is non-empty afterward; **fail the deploy loudly**
   if the secret was missing/renamed (so we never silently ship an open gate).

This does not affect the auto-reload mechanism: `compute_shell_version.sh` hashes
**committed git blob SHAs at HEAD**, independent of deploy-time working-tree edits
(its own comment says so). Adding a new `site/js/*.js` file is auto-covered by the
existing `site/js/*.js` glob in both `compute_shell_version.sh` and
`computeShellVersion()`.

### Fail-open

Empty expected hash (local dev, tests without an override, or a missing secret in
a misconfigured deploy) ⇒ `isGateEnabled` is false ⇒ no prompt, content opens.
The deploy-time non-empty assertion is what prevents a *production* deploy from
silently shipping an open gate.

### Dev / test seam

The Playwright server already injects `window.__SY_REPO` into the served HTML; add
`window.__SY_GATE_HASH` the same way so tests exercise a known hash (computed from
a synthetic test phrase + the committed salt/iters). Local manual dev runs
fail-open (no gate) unless the override is set.

## Testing (TDD, red→green→refactor)

**Node — `tests/test_passphrase_gate.js`:**
- `derivePassphraseHash` matches the shared vector for a known `(phrase, salt, iters)`.
- `verifyPassphrase`: true for the correct phrase, false for a wrong one.
- `isUnlocked`: false when storage empty; false when stored ≠ expected (rotation);
  true when stored === expected.
- `recordUnlock` writes the expected hash to `sy_gate`.
- `isGateEnabled`: false for empty hash, true otherwise.

**Python — `tests/test_passphrase_gate.py`:**
- `hash` CLI output equals the shared vector for the same `(phrase, salt, iters)`.
- Cross-language: the vectors file is the same one the Node test asserts against.
- The CLI prints only the hash (no phrase leakage).

**Playwright — additions to `tests/test_preview_spa.py`** (inject
`window.__SY_GATE_HASH` for a known test phrase):
- Locked → clicking a preview link on the index shows the modal; index stays
  active (preview not rendered).
- Wrong phrase → inline error, no navigation.
- Correct phrase → navigates to preview; modal gone.
- After unlock → second click / reload does not prompt (persisted).
- Cancel/Esc → modal closes, stays on index.
- Deep link to `#/review/…` while locked → redirected to index + modal; correct →
  proceeds to review.
- Gate disabled (no override, empty `APP_GATE_HASH`) → preview/review open with no
  prompt (fail-open).

**Guard test:** assert `site/index.html` still contains the literal
`var APP_GATE_HASH = '';` placeholder so the deploy `sed` target cannot silently
disappear.

## Files

**New:** `site/js/passphrase_gate.js`, `tools/passphrase_gate.py`,
`tests/test_passphrase_gate.js`, `tests/test_passphrase_gate.py`,
`tests/fixtures/passphrase_gate_vectors.json`.

**Modified:** `site/index.html` (script include, `APP_GATE_HASH` placeholder,
`GATE_COPY`, modal, `ensureUnlocked`, index click interception, `route()` guard),
`.github/workflows/deploy-pages.yml` (compute + inject + assert),
`tests/test_preview_spa.py` (override + gate-flow tests), `CLAUDE.md` (tool list
entry for `python -m tools.passphrase_gate`).

## Non-goals

- Real access control / content confidentiality (content is public on GitHub).
- Encrypting content at rest.
- Per-talk passphrases, multiple users, or rate limiting.
- Git-history rewrite of past plaintext (separate, deferred task).

## Open items

- Exact prompt copy — placeholder `"Введіть пароль для доступу"` for now; the user
  will supply final wording before/at implementation.
