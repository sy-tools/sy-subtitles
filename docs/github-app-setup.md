# GitHub App + OAuth Worker setup (one-time, admin)

The review SPA signs users in via a GitHub App; a Cloudflare Worker
(`workers/oauth-exchange/`) swaps the OAuth `code` for a user token.
Until these steps are done, `APP_GH_CLIENT_ID` in `site/index.html` stays
empty and the sign-in UI is hidden.

## 1. Create the GitHub App (org sy-tools)

Settings → Developer settings → GitHub Apps → New GitHub App:

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

## 3. Deploy the Worker

```bash
cd workers/oauth-exchange
wrangler deploy
wrangler secret put GH_CLIENT_ID      # the Iv1.… client id
wrangler secret put GH_CLIENT_SECRET  # the generated secret
```

Note the deployed URL, e.g. `https://sy-subtitles-oauth.<account>.workers.dev`.
Allowed origins live in `wrangler.toml` `[vars] ALLOWED_ORIGINS`.

## 4. Point the SPA at them

In `site/index.html` set:

```js
var APP_GH_CLIENT_ID = 'Iv1.…';
var APP_GH_EXCHANGE_URL = 'https://sy-subtitles-oauth.<account>.workers.dev/exchange';
```

Commit + deploy (Pages). The "Sign in" button appears for everyone; only
collaborators gain useful write actions.

## Rotation / revocation

- Rotate the client secret: regenerate in the App settings, `wrangler secret
  put GH_CLIENT_SECRET` again. Users stay signed in (tokens are unaffected).
- Revoke all user tokens: App settings → Advanced → Revoke all user tokens.
- A revoked/expired token in a browser triggers a silent sign-out on the next
  API call.
