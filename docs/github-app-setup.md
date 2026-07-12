# GitHub App + OAuth Worker setup (one-time, admin)

The review SPA signs users in via a GitHub App; a Cloudflare Worker
(`workers/oauth-exchange/`) swaps the OAuth `code` for a user token.
Until these steps are done, `APP_GH_CLIENT_ID` in `site/index.html` stays
empty and the sign-in UI is hidden.

## 1. Create the GitHub App (org sy-tools, manual — GitHub has no CLI for this)

Org **sy-tools** → Settings → Developer settings → GitHub Apps → New GitHub App:

- **Name**: `sy-subtitles-review`
- **Homepage URL**: `https://sy-tools.github.io/sy-subtitles/`
- **Callback URLs** (add both):
  - `https://sy-tools.github.io/sy-subtitles/`
  - `http://localhost:8000/`
- **Expire user authorization tokens**: OFF (the SPA has no refresh logic)
- **Request user authorization (OAuth) during installation**: ON
- **Webhook**: Inactive (uncheck Active)
- **Repository permissions**: Issues RW, Contents RW, Pull requests RW
- **Where can this app be installed**: Only on this account

After creation: note the **Client ID** (`Iv1.…`), generate a **client secret**.

## 2. Install the App

App settings → Install App → sy-tools → Only select repositories →
`sy-subtitles`.

## 3. Set repo secrets (once)

The Worker is deployed by CI (`.github/workflows/deploy-worker.yml`), never
from a laptop. It needs four repo secrets:

```bash
gh secret set GH_OAUTH_CLIENT_ID      # the Iv1.… client id (step 1)
gh secret set GH_OAUTH_CLIENT_SECRET  # the generated client secret (step 1)
gh secret set CLOUDFLARE_ACCOUNT_ID   # Cloudflare dashboard -> Workers -> Account ID
gh secret set CLOUDFLARE_API_TOKEN    # dashboard -> My Profile -> API Tokens ->
                                      #   Create Token -> "Edit Cloudflare Workers" template
```

## 4. Deploy the Worker (CI)

The workflow deploys automatically on every merge to `main` that touches
`workers/oauth-exchange/**`, and can be run by hand:

```bash
gh workflow run deploy-worker.yml
```

It runs `wrangler deploy` and pushes `GH_CLIENT_ID`/`GH_CLIENT_SECRET` to the
Worker from the repo secrets. The deployed URL is
`https://sy-subtitles-oauth.<account-subdomain>.workers.dev` (shown in the run
log). Allowed origins live in `wrangler.toml` `[vars] ALLOWED_ORIGINS`.

## 5. Point the SPA at them

In `site/index.html` set:

```js
var APP_GH_CLIENT_ID = 'Iv1.…';
var APP_GH_EXCHANGE_URL = 'https://sy-subtitles-oauth.<account>.workers.dev/exchange';
```

Commit + deploy (Pages). The "Sign in" button appears for everyone; only
collaborators gain useful write actions.

## Local verification (before merging any of this)

Run the Worker locally instead of deploying:

```bash
cd workers/oauth-exchange
cp .dev.vars.example .dev.vars       # fill in the real Iv1.… id + secret
npx wrangler dev                      # serves http://localhost:8787
```

Serve the SPA on port 8000 (`python -m http.server 8000 -d site`) and point it
at the local Worker via the runtime hooks (no code edits needed) — in the
browser console:

```js
window.__SY_GH_CLIENT_ID = 'Iv1.…';
window.__SY_GH_EXCHANGE_URL = 'http://localhost:8787/exchange';
updateAuthUI();
```

Click "Sign in" → GitHub → redirected back to localhost:8000 → the exchange
hits the local Worker. `http://localhost:8000` is already in the Worker's
`ALLOWED_ORIGINS` and must be one of the App's callback URLs (step 1).
Note: the hooks live only in that tab's session — re-set them after a reload
(the callback handler runs before you can retype them, so for the full
round-trip test serve an injected copy of index.html, e.g. with the snippet in
`tests/test_spa_auth_e2e.py`'s `auth_server` fixture, or temporarily set the
two constants in `site/index.html` without committing).

## Rotation / revocation

- Rotate the client secret: regenerate in the App settings, update the
  `GH_OAUTH_CLIENT_SECRET` repo secret, re-run `deploy-worker.yml`. Users stay
  signed in (tokens are unaffected).
- Revoke all user tokens: App settings → Advanced → Revoke all user tokens.
- A revoked/expired token in a browser triggers a silent sign-out on the next
  API call.
