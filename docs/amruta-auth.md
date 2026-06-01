# amruta.org Authentication Cookie

## Overview

amruta.org is a WordPress site behind Cloudflare. Transcripts (EN and UK) and talk listing pages are only accessible to logged-in users — unauthenticated requests return short/empty content or HTTP 4xx.

Authentication is carried by a WordPress session cookie (`wordpress_logged_in_*`). This cookie is **local-only**: it lives in `.env` on your machine and is never used in GitHub Actions. The new-talk pipeline (`new-talk.yml`) and the bookmarklet flow never need it — they receive transcripts as base64 in `meta.yaml` and pull subtitles from Vimeo.

---

## Where the cookie lives

| Location | Purpose |
|---|---|
| `.env` (gitignored) | Holds the real cookie value in `AMRUTA_SESSION_COOKIE=...` |
| `.env.example` | Committed template with empty `AMRUTA_SESSION_COOKIE=` and `VIMEO_COOKIE=` |
| `--cookie` CLI flag | Overrides the env var for one-off runs |

All three download tools read the cookie from the same source:

- `tools/download.py` — talk pages, transcripts, EN SRT
- `tools/fetch_transcripts.py` — bulk EN+UK transcript corpus
- `tools/scrape_listing.py` — talk listing scrape

Each accepts `--cookie "name=value"` to bypass `.env`.

---

## How download.py consumes the cookie

`tools/download.py:79–91`, class `AmrutaDownloader.__init__`:

```python
load_dotenv()
self.session_cookie = session_cookie or os.environ.get("AMRUTA_SESSION_COOKIE", "")
self.session = requests.Session()
self.session.headers["User-Agent"] = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)
if self.session_cookie:
    for part in self.session_cookie.split("; "):
        if "=" in part:
            name, value = part.split("=", 1)
            self.session.cookies.set(name, value, domain=".amruta.org")
```

Key details:
- The string in `AMRUTA_SESSION_COOKIE` is split on `"; "` (semicolon-space).
- Each `name=value` pair is registered on domain `.amruta.org` (leading dot = all subdomains).
- A Chrome User-Agent is set to avoid Cloudflare bot detection.

So the `.env` value must be formatted as a standard browser cookie header string, e.g.:

```
AMRUTA_SESSION_COOKIE=wordpress_logged_in_<hash>=<value>; other_cookie=other_value
```

---

## Cookie structure

The cookie **name** is:

```
wordpress_logged_in_<32hexhash>
```

where `<32hexhash>` is `COOKIEHASH` — the MD5 of the site's `siteurl` option. It is a constant per WordPress installation and does not change unless the site URL changes.

The cookie **value** is URL-encoded. Decoded, it is four fields joined by `|`:

```
USERNAME|EXPIRATION|SESSION_TOKEN|HMAC
```

| Field | Description |
|---|---|
| `USERNAME` | WordPress login name of the authenticated user |
| `EXPIRATION` | Cookie expiry as a Unix epoch timestamp (UTC seconds) |
| `SESSION_TOKEN` | Opaque per-session token stored in `wp_usermeta` |
| `HMAC` | HMAC-SHA256 signature over the other three fields; uses WordPress salts + a fragment of the password hash |

In the raw cookie string the `|` separators are URL-encoded as `%7C`:

```
wordpress_logged_in_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4=USERNAME%7C1807290713%7C<session-token>%7C<hmac>
```

**The values above are placeholders. Never paste a real token or HMAC anywhere.**

### Reading the expiration

```bash
python -c "import datetime; print(datetime.datetime.fromtimestamp(1807290713, datetime.timezone.utc))"
# 2027-04-09 17:11:53+00:00
```

Replace `1807290713` with the actual second field from the decoded cookie value.

---

## Refreshing the cookie via Playwright

Use this when the existing cookie has expired or fetch_transcripts.py starts returning empty files.

### Python snippet (headed browser, manual login)

```python
#!/usr/bin/env python3
"""Harvest a fresh amruta.org session cookie via a headed Playwright browser.

Run once, log in manually, then paste the printed string into .env.
"""
from playwright.sync_api import sync_playwright

TARGET = "https://www.amruta.org/wp-login.php"

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chromium", headless=False)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.goto(TARGET)

    print("Log in manually in the browser window, then press Enter here...")
    input()

    # Grab all cookies for the amruta.org domain
    all_cookies = ctx.cookies(urls=["https://www.amruta.org"])

    # Filter to the WordPress session cookie(s)
    wp_cookies = [
        c for c in all_cookies
        if c["name"].startswith("wordpress_logged_in_")
        # also include wordpress_sec_* if the site uses it (HTTPS-only auth cookie)
        or c["name"].startswith("wordpress_sec_")
    ]

    if not wp_cookies:
        print("ERROR: no wordpress_logged_in_* cookie found — are you logged in?")
    else:
        # Format as "name=value; name2=value2" for AMRUTA_SESSION_COOKIE
        cookie_str = "; ".join(f'{c["name"]}={c["value"]}' for c in wp_cookies)
        print("\nPaste this into .env:")
        print(f"AMRUTA_SESSION_COOKIE={cookie_str}")

    browser.close()
```

Run with:

```bash
python harvest_cookie.py
```

### Manual alternative (DevTools)

1. Open Chrome/Firefox, log in to `https://www.amruta.org`.
2. Open DevTools → **Application** tab → **Storage → Cookies → https://www.amruta.org**.
3. Find the row where **Name** starts with `wordpress_logged_in_`.
4. Copy the **Name** and **Value** columns.
5. Paste into `.env` as `AMRUTA_SESSION_COOKIE=<name>=<value>`.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `HTTP 403` or `HTTP 401` from `fetch_talk_page` | Cookie expired or not set |
| `WARNING — only N chars (cookie expired?)` from `fetch_transcripts.py:71–72` | Transcript body is shorter than 200 chars — login-gated page returned a login prompt instead of content |
| Short HTML blob instead of transcript text | Same — cookie expired |
| Cloudflare challenge / CAPTCHA page | Cookie valid but User-Agent mismatch; `download.py` already sets a Chrome UA, but if you're calling the site directly use the same UA |

When the cookie expires, the expiration field in the decoded value will be in the past. Check with the `python -c` command shown in the Cookie structure section above.

After refreshing the cookie, rerun the failed command — no other state needs to be reset.

---

## Security

- `.env` is listed in `.gitignore`. **Never commit it.**
- The cookie value authenticates as the real WordPress user account. Treat it like a password.
- The `.env.example` file (committed) contains only empty placeholder lines — it is safe to commit.
- Rotate: log out on the WordPress site (invalidates the session token server-side), then harvest a new cookie.
