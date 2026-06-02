# Design: amruta download multi-language, slug unification, auth docs

Date: 2026-06-01
Status: Approved (single PR)

## Problem

Four related issues around `tools/download.py` and the SPA add-talk flow:

1. **No auth docs.** Local amruta.org access uses a WordPress session cookie
   (`AMRUTA_SESSION_COOKIE` in `.env`). Its structure, lifetime, and how to
   refresh it (extract a fresh cookie from a Playwright/browser session) are
   undocumented — future agents have to reverse-engineer it.

2. **`download.py` is English-only.** It always writes `transcript_en.txt` and
   uses `--sub-langs en`. amruta serves translations at a `/uk/` (and `/ru/`,
   `/de/`, …) URL prefix with the *same* `.entry-content` structure, but the
   tool can't fetch them.

3. **Folder-name divergence.** Same talk → two different folder names:
   - SPA → `1984-08-11_Raksha-Bandhan-and-Maryadas`
     (`date + '_' + slugify(h1_title)`, case preserved, no location).
   - `download.py` → `1984-08-11_Raksha-Bandhan-And-Maryadas-Hounslow`
     (`parse_amruta_url`: URL slug, `.capitalize()` per word, location kept).
   The URL slug is lowercased, so the SPA's title-case (`and` lowercase) can
   only be reproduced from the **page title**, not the URL. SPA is the source
   of truth. Root cause of future drift: the JS `slugify` lives **inline** in
   `site/index.html:5318` and the JS test uses a **separate copy**
   (`slugifyTest` in `tests/test_spa_cache.js:1666`).

4. **Broken transcript for `1984-08-11_Raksha-Bandhan-and-Maryadas`.** Both
   `transcript_en.txt` (synthesized by `new-talk.yml` from the old bookmarklet's
   base64) and `transcript_uk.txt` (a manual commit by the user, 2026-05-24)
   have glued sentences (`report.I must say`, `світі.Отже`, `Йоґи.Один`). The
   current `download.py` extractor produces clean paragraphs.

## Decisions (from user)

| # | Decision |
|---|----------|
| 2 | API shape: `download.py --url <any-lang URL> --langs en,uk`. Detect language from the URL prefix; default `--langs` = the URL's own language. Folder/meta/slug always resolved from the **EN** page. |
| 4a | Re-download **both** EN+UK; before commit, **diff** old vs new `transcript_uk.txt`. Same translation, only re-paragraphed → commit. Different translation → stop and ask. |
| 4b/3 | Transcript header: **keep the page `<h4>`** (current `download.py` behavior). No header-synthesis change. So task 3 is purely the folder-slug. |
| 4c | After EN changes, the committed `final/uk.srt` is stale → **rebuild uk.srt** from the new transcripts **without re-translating** (preserve the amruta UK text). |

## Design

### Shared slug core (prevents future drift)
- `site/js/talk_slug.js` *(new)* — canonical `slugify(text)`; single source.
  `site/index.html` loads it via `<script src="js/talk_slug.js">`; inline
  `slugify` removed; `slugifyTest` copy removed from `test_spa_cache.js`.
- `tools/talk_slug.py` *(new)* — Python twin, byte-identical algorithm:
  strip `[^a-zA-Z0-9 -]`, whitespace → `-`, collapse `-+`, trim leading/trailing `-`.
- `tests/fixtures/slug_cases.json` *(new)* — shared golden fixture (input → slug).
- `tests/test_talk_slug.py` + `tests/test_talk_slug.js` — both read the same
  fixture, so the two implementations cannot diverge silently.

### Task 3 — folder name
- `download.py` folder = `{date}_{slugify(extract_title(EN_soup))}` (h1 title,
  like the SPA). `parse_amruta_url` kept for the **date** and as a **fallback**
  slug when the title is empty. `--slug` override unchanged.
- `slugify_video_name` (video slugs) **untouched** — separate behavior
  (`\w` vs `[a-zA-Z0-9]`), out of scope.
- Delete the untracked duplicate `talks/1984-08-11_Raksha-Bandhan-And-Maryadas-Hounslow/`.

### Task 2 — multi-language
- `--langs en,uk` (default = URL's own language; fallback `en`).
- `detect_lang_from_url` + `strip_lang_prefix` / `build_lang_url` helpers.
  amruta language URLs use a 2-letter path prefix: `/uk/1984/...`, base = EN.
- Per language: build the variant URL → `fetch_talk_page` → `extract_transcript`
  → `transcript_{lang}.txt`. Folder/meta resolved once from the EN page.
- `meta.yaml language` = **spoken** language (unchanged when fetching UK).
  A `transcript_uk.txt` file is a *translation* — a different axis; presence is
  the signal, not the `language` field.
- Header: keep each page's own `<h4>`.

### Task 1 — auth docs
- `docs/amruta-auth.md` *(new)*: cookie structure
  `wordpress_logged_in_<hash> = username|expiration|token|hmac` (URL-encoded,
  `%7C` = `|`); `.env`/`AMRUTA_SESSION_COOKIE`; how `requests.Session` applies it
  (`domain=.amruta.org`); lifetime/expiry; **how to extract a fresh cookie from a
  Playwright session** (`context.cookies()` → filter `wordpress_logged_in_*`).
  Placeholder example only — never the real token. Pointer added in `CLAUDE.md`.

### Task 4 — data
- Fetch EN(clean) + UK(`/uk/`) into the canonical folder via the new tool.
- Diff old vs new `transcript_uk.txt` (decision 4a).
- Rebuild `final/uk.srt` without re-translating: `build_map prepare` →
  write `timecodes.txt` → `build_map assemble` → `validate_subtitles`.
  (First confirm whether `subtitle-pipeline` can skip translate when
  `transcript_uk.txt` exists; if so, a CI trigger is an option.)

## Plan / commits (single PR, ordered)
1. docs: `docs/amruta-auth.md` + `CLAUDE.md` pointer.
2. shared slug: `talk_slug.{py,js}` + fixture + two tests; de-inline SPA slug.
3. `download.py`: folder slug from title (task 3).
4. `download.py`: `--langs` multi-language (task 2).
5. data: re-download EN+UK for the talk + rebuild `uk.srt` (task 4).

## TDD
RED first for every behavior change: slug parity (shared fixture), `detect_lang_from_url`,
`--langs` → `transcript_{lang}.txt`, folder-slug-from-title.

## Execution notes (task 4, as built)

- **Folder unification:** `download.py` now produces `1984-08-11_Raksha-Bandhan-and-Maryadas` (matches the SPA). Untracked download.py duplicate `…-And-Maryadas-Hounslow/` deleted.
- **Header:** kept the EN page `<h4>` ("Talk to Sahaja Yogis … – VERIFIED"). The `/uk/` page's `<h4>` is malformed (mixed EN/UK, no "Talk Language:" line) and carries a video-description preamble ("Audio with Ukrainian subtitles", "2 ч.:…", "3 ч.:…"); for this talk the canonical 4-line Ukrainian header was restored and the preamble dropped (per user).
- **Glue:** amruta's own in-sentence run-ons in EN ("see?So", "Yoga.And", "you.TIE") are real in the source — left untouched, the downloader is not changed to "de-glue".
- **EN↔UK paragraph counts do NOT match** (EN 102 vs UK 126): amruta authors the EN and `/uk/` pages with different `<p>`/`<br>` structure (EN 35 `<p>`/68 `<br>`; UK 81/51). Not a downloader bug; `build_map prepare` reads only `transcript_uk.txt`, so uk.srt is unaffected. Not pursued.
- **uk.srt rebuild:** Opus builder aligned 831 UK blocks to whisper word timestamps. The video is abridged vs the transcript — 11 audio-absent blocks at the ~39:37 edit and 3 trailing blocks past the last spoken word were dropped (same content the previous SRT skipped). Optimized with `--target-cps 19` (dense talk) → CPS>20: 0, matching the previous SRT (768 blocks, ends 00:48:52,230, avg CPS 15.4); glue 27 → 0.

## Risks / notes
- `gh` active account must be **SlavaSubotskiy** before any push (`.claude/CLAUDE.md`).
- amruta is behind Cloudflare; the WP cookie may be needed for `/uk/` fetches too.
- The `<h4>` title on this page ("Talk to Sahaja Yogis") differs from the h1
  ("Raksha Bandhan and Maryadas"); folder/meta use h1, transcript header uses h4
  (intentional, per decision 4b).
