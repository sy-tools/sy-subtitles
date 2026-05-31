# Design: Mask Vimeo links in the public repo (`video_ref` codec)

**Date:** 2026-05-31
**Branch:** `feat/mask-vimeo-refs` (PR from `main`)
**Status:** Approved design, pending implementation plan.

## Problem

Every `talks/**/meta.yaml` stores a private Vimeo link in plaintext:

```yaml
videos:
- slug: Navaratri-Puja
  vimeo_url: https://vimeo.com/<id>/<hash>   # numeric ID + private hash
```

83 `meta.yaml` files carry such links, plus 4 real embed URLs leak through
`tests/fixtures/amruta_*.html`. In a public repository these are trivially
harvested by GitHub code search, search-engine indexing, and pattern scrapers
(`vimeo\.com/\d+/[0-9a-f]+`). The goal is to **mask** them so they no longer
appear as plaintext.

## Honest threat model (what this is and is not)

This is **obfuscation, not security.** The SPA decodes links client-side, and
the SPA is served from this same public repo (GitHub Pages) — so the decode
function and any "key" are themselves public. Anyone who reads `site/js/` can
reverse it. No amount of extra transform steps changes that.

What the masking **does** achieve (the real, accepted goal):

1. Breaks plaintext harvesting — GitHub code search, search engines, regex
   scrapers no longer find a literal `vimeo.com/ID/HASH`.
2. A naive `base64 -d` on the stored value yields garbage (because of the
   XOR + reverse steps), not a recognizable Vimeo URL — raising the bar for a
   casual curious human.

It does **not** protect against anyone who studies the repository. That is
accepted and explicit.

## Scope decisions (confirmed with user)

- **Threat level:** multi-step deterministic transform + neutral field name.
- **Git history:** out of scope for now. The 83 plaintext links already in
  `git log -p` are left as-is; a history rewrite (`git filter-repo`) will be
  done separately, on the user's signal, once there are no open PRs.
- **Test fixtures:** in scope — replace the 4 real IDs/hashes in
  `tests/fixtures/amruta_*.html` with synthetic values.
- **Field name:** `vimeo_url` → `video_ref`.
- **CI guard:** add a check that fails on plaintext Vimeo links in
  `talks/**/meta.yaml`.
- **Legacy fallback:** none. Readers parse `video_ref` only; `vimeo_url` is
  removed everywhere in the same change. (The migration converts all 83 files
  in this PR, so no mixed state exists.)

## Core principle: decode-at-the-edge

The codec is applied at exactly **two seams per language** — the write seam
(encode) and the read seam (decode). The in-memory / runtime representation
stays the ordinary plaintext `https://vimeo.com/ID/HASH`, so every downstream
consumer (`vimeoEmbed`, playability checks, yt-dlp calls) is **unchanged**.
This keeps the diff minimal and the codec auditable in one place.

## The codec

### Algorithm

Encode operates on the **path after `vimeo.com/`** — i.e. `ID/HASH`
(or just `ID` for a public video without a hash), not the whole URL.

```
payload  = "<id>/<hash>"                      # UTF-8 bytes, e.g. 111111111/aaaaaaaaaa
step 1   = xor(payload_bytes, KEY)           # KEY = fixed project constant, repeating
step 2   = reverse(step1)                     # reverse the byte array
step 3   = base64url(step2)                   # RFC 4648 §5, no padding (no '=')
stored   = "r1" + step3                        # 2-char scheme-version prefix
```

Decode is the exact inverse:

```
ref      -> strip "r1" prefix (assert version == "r1")
         -> base64url_decode
         -> reverse
         -> xor(KEY)
         -> "<id>/<hash>"
         -> "https://vimeo.com/<id>/<hash>"
```

Correctness: `reverse` and `xor` are each their own inverse, so
`decode(encode(x)) == x` by construction.

### Properties

- **Deterministic** (not salted): same input → same output. Required for an
  idempotent migration and clean git diffs.
- **YAML-safe & quote-free:** base64url alphabet is `[A-Za-z0-9_-]`, no padding;
  the `r1` prefix guarantees the value starts with a letter, so it can never be
  misread as YAML structure (e.g. a leading `-`). Written unquoted — does not go
  through the `yamlStr` quoting path.
- **No `vimeo` substring** anywhere in the stored value or the field name.
- **Versioned:** the `r1` prefix lets us change the algorithm later
  (`r2`, ...) without ambiguity.

### Field shape in meta.yaml

```yaml
videos:
- slug: Navaratri-Puja
  title: Navaratri Puja
  video_ref: r1BA0VCBUDFBJMAEheSBxQW1BZUEI   # encoded synthetic example; no vimeo_url field
```

Videos with no link (schema allows empty `videos` / no URL) simply have no
`video_ref` field.

## Two mirrored implementations

Per the project's single-source pattern (`site/js/*.js` loaded by the browser
via `<script>` and `require`d by Node tests; mirrored by a Python module):

- **`tools/vimeo_codec.py`** — `encode_video_ref(url) -> str`,
  `decode_video_ref(ref) -> str`. Pure functions, no I/O.
- **`site/js/vimeo_codec.js`** — `encodeVideoRef(url)`, `decodeVideoRef(ref)`.
  Browser global + `module.exports` (same dual-mode pattern as the other
  `site/js` modules). Loaded via `<script src="js/vimeo_codec.js">` in
  `index.html` `<head>` **before** `add_talk_data.js`, and `require`d by the JS
  tests.
- `KEY` and the `r1` version live once in each module and must match.
- **Cross-language test vectors:** a shared table of
  `{url, encoded}` pairs asserted by both the Python and JS test suites — this
  is what guarantees the two implementations stay byte-identical.

## Integration seams

| # | Location | Current | Change |
|---|----------|---------|--------|
| 1 | `site/js/add_talk_data.js` `buildMetaYaml` (writes `"  vimeo_url: " + v.url`) | plaintext | `"  video_ref: " + encodeVideoRef(v.url)` (unquoted) |
| 2 | `site/index.html` meta parse (~L2911, `vimeo_url: v.vimeo_url \|\| ''`) | reads plaintext | `vimeo_url: v.video_ref ? decodeVideoRef(v.video_ref) : ''` — decode into the in-memory `vimeo_url`; **rest of SPA untouched** |
| 3 | `tools/download.py` `setup_talk` (writes meta.yaml) | writes `vimeo_url` | write `video_ref: encode_video_ref(url)` |
| 4 | `tools/download.py` yt-dlp read seams (`download_vimeo_subs`, `download_video`, the `video["vimeo_url"]` reads ~L472/L494/L611) | reads `vimeo_url` | read `video["video_ref"]` → `decode_video_ref` → real URL for yt-dlp |
| 5 | `tools/schemas.py` `validate_meta_yaml` + `tools/workflow_validation.py` | validates `vimeo_url` via `VIMEO_URL_RE` | new `validate_video_ref(ref)`: `decode_video_ref` then run the existing `VIMEO_URL_RE` on the decoded URL (preserves injection protection) |

### Workflow consumers (discovered during implementation)

`whisper.yml` and `new-talk.yml` build a CI matrix by parsing `meta.yaml`
inline and feed the link to `yt-dlp`. After migration `video["vimeo_url"]` is a
`KeyError`, so these must change too:

- **Matrix build** reads `video["video_ref"]`, validates with
  `validate_video_ref`, and passes the **encoded ref through** the matrix
  (`"video_ref": ...`). The ref stays encoded across job boundaries, so the
  matrix output (visible in public Actions logs) carries no plaintext.
- **Consumer step** decodes once, immediately before `yt-dlp`, via the codec
  CLI, and masks it from logs:
  ```bash
  VIMEO_URL=$(python3 -m tools.vimeo_codec decode "$VIDEO_REF")
  echo "::add-mask::$VIMEO_URL"
  yt-dlp ... "$VIMEO_URL"
  ```
- `new-talk.yml` also has an SRT-download step (Python) that decodes
  `video_ref` → URL before calling `download_vimeo_subs`.
- `tools/vimeo_codec.py` gains a small `argparse` CLI:
  `encode <url>` / `decode <ref>` (ref passed as argv, never interpolated).
- `workflow_validation_cli.py`: `--vimeo-url` → `--video-ref`
  (calls `validate_video_ref`); both workflows' "Validate matrix values" steps
  updated accordingly.

Note: `::add-mask::` only redacts the literal decoded string. That is
sufficient for obfuscation — ephemeral Actions logs are a far smaller surface
than the git history we are deliberately deferring; we do not gold-plate it.

Notes:
- `vimeoEmbed` (index.html ~L3537) is **unchanged** — it still receives a
  plaintext `vimeo_url` from the decoded in-memory object.
- `normalize_vimeo_url` (download.py) still runs on the raw extracted URL
  *before* encoding (extract → normalize → encode → write).
- The bookmarklet is a thin loader; the committed `meta.yaml` is built by the
  SPA through `buildMetaYaml`, so seam #1 covers the bookmarklet→PR path too.
- `workflow_validation_cli.py` `--vimeo_url` arg: add a `--video_ref` mode for
  parity (low priority; keep `--vimeo_url` working as a decoded-URL validator).

## Migration

1. **`python -m tools.mask_video_refs`** — a new CLI tool that walks
   `talks/**/meta.yaml`, and for each video: reads `vimeo_url`, writes
   `video_ref: <encoded>`, removes `vimeo_url`. **Idempotent:** a file that
   already has `video_ref` (and no `vimeo_url`) is left untouched. Preserves
   field order / formatting as much as practical (round-trip-friendly YAML
   edit). Run once over the 83 files in this PR.
2. **Fixtures:** replace the 4 real embed URLs in `tests/fixtures/amruta_*.html`
   with synthetic ones (e.g. `111111111/aaaaaaaaaa`, `222222222/bbbbbbbbbb`, …)
   and update any test assertions that reference those specific IDs. These tests
   verify parsing/extraction, not specific values, so synthetic data is
   equivalent.

   The same applies to every other test/spec/doc file: only synthetic,
   obviously-fake placeholders may appear — never a real private link. The
   live-network integration test (`test_sync_player_integration.py`) stores its
   real video as an **encoded** `video_ref` and decodes it at runtime, so no
   plaintext link is committed.

## CI guard (regression prevention)

A dedicated test `tests/test_no_plaintext_vimeo.py` scans tracked
`talks/**/meta.yaml` and **fails** if any contains a plaintext Vimeo link
(`vimeo\.com/\d+(?:/[0-9a-f]+)?` or `player\.vimeo\.com`). It runs as part of
the existing `python -m pytest tests/` step in `ci.yml` — no new workflow
wiring needed. Scoped to `meta.yaml` so synthetic example URLs in
tests/fixtures don't trip it. This prevents a hand-edited or regressed file
from re-introducing a plaintext link.

## Testing (TDD — RED first, per CLAUDE.md)

Write the failing test before each piece of production code.

**Python (`tests/`):**
- `test_vimeo_codec.py`: round-trip `decode(encode(url)) == url` for ID+hash and
  ID-only; known-vector assertions (shared table); `r1` prefix present; decoded
  value matches `VIMEO_URL_RE`; rejects malformed `video_ref` (bad prefix, bad
  base64).
- `test_mask_video_refs.py`: converts a sample meta.yaml; idempotency (second
  run is a no-op); leaves empty/linkless videos alone.
- `test_schemas.py` / `test_workflow_validation.py`: `validate_video_ref`
  accepts a valid encoded ref, rejects one that decodes to an injection
  (`https://evil.com/#vimeo.com/1`), rejects plaintext `vimeo_url`.
- CI-guard test: a fixture meta.yaml with a plaintext link fails the guard; an
  encoded one passes.
- `test_download.py`: `setup_talk` writes `video_ref` (not `vimeo_url`); the
  yt-dlp read seam decodes correctly. Update fixtures to synthetic IDs.

**JS (`tests/test_*.js`, `node --test`):**
- `test_vimeo_codec.js`: round-trip + the **same** known-vector table as Python
  (cross-language byte-identity).
- `test_add_talk_data.js`: `buildMetaYaml` emits `video_ref: r1...` and **no**
  `vimeo_url`; the emitted ref decodes back to the input URL.
- SPA parse tests (`test_sync_player.py`, `test_preview_spa.py`,
  `test_talk_actions.js`, `test_spa_cache.js`): meta with `video_ref` yields a
  playable video; empty/missing `video_ref` yields a non-playable one. Update
  these fixtures from `vimeo_url:` to `video_ref:`.

## Files

**New:**
- `tools/vimeo_codec.py`
- `site/js/vimeo_codec.js`
- `tools/mask_video_refs.py`
- `tests/test_vimeo_codec.py`, `tests/test_vimeo_codec.js`,
  `tests/test_mask_video_refs.py`
- `tests/test_no_plaintext_vimeo.py` (CI guard; runs under the existing pytest step)

**Modified:**
- `site/index.html` (parse seam; `<script>` include)
- `site/js/add_talk_data.js` (encode on write)
- `tools/download.py` (encode on write; decode on read)
- `tools/schemas.py`, `tools/workflow_validation.py`,
  `tools/workflow_validation_cli.py` (validate `video_ref`)
- `tests/fixtures/amruta_*.html` (synthetic IDs) + assertions
- All test fixtures using `vimeo_url:` → `video_ref:`
- `talks/**/meta.yaml` ×83 (via migration tool)
- Docs that describe the field: `ARCHITECTURE.md`, `CLAUDE.md`, `README.md`,
  and any meta.yaml schema docs (rename `vimeo_url` → `video_ref`, note it's
  encoded).

## Out of scope (explicit)

- Git history rewrite (deferred; user's separate signal).
- Real access control (gated runtime endpoint). Noted as the only thing that
  would truly protect the links; not pursued.
- Shell-version bump (`compute_shell_version.sh`) is automatic — adding
  `js/vimeo_codec.js` to the shell is covered by the existing app-shell
  versioning; confirm the include is picked up.

## Build / verification order

1. Codec modules (Py + JS) + cross-language vectors — RED→GREEN.
2. Validation (`validate_video_ref`) — RED→GREEN.
3. Write/read seams (download.py, add_talk_data.js, index.html parse) — RED→GREEN.
4. Migration tool + run it on the 83 files; fixtures to synthetic IDs.
5. CI guard.
6. Docs.
7. Full suite: `python -m pytest tests/`, `node --test tests/test_*.js`,
   lint. Serve the SPA locally so the user can verify playback before commit
   (per `feedback_test_app_locally_before_commit`).

## Verification gate (the real done-check)

The CI guard is scoped to `meta.yaml`; the true completeness check is a
**whole-tree** scan for any real-looking private link:

```bash
git grep -nE "vimeo\.com/[0-9]+/[0-9a-f]+"
```

After the sweep, the only matches allowed are **synthetic placeholders** in
test fixtures (e.g. `111111111/aaaaaaaaaa`). No real ID/hash may remain in any
tracked file at HEAD. (Intermediate commits on this branch will still carry the
originals — that is the deferred history rewrite, out of scope here.)
