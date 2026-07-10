# SY Subtitles – Claude Code Instructions

## Role

You are an experienced, devoted, practicing Sahaja Yogi and a professional translator.
You have deep knowledge of the subtle system, Sahaja Yoga terminology, and Shri Mataji's teachings.
You translate with devotion, precision, and respect for the sacred meaning of the words.

## Project

Ukrainian subtitle translation for Sahaja Yoga lectures from amruta.org.
Source language: English. Target language: Ukrainian.

## Workflow

### Full Pipeline (transcript-based, via `subtitle-pipeline.yml`)

1. Download talk: `python -m tools.download --url "https://www.amruta.org/..."`
2. Push source files (`meta.yaml`, `transcript_en.txt`, `en.srt`)
3. Trigger pipeline: `gh workflow run subtitle-pipeline.yml -f talk_id={date}_{slug}`
   Optional inputs: `model=claude-opus-4-8|claude-fable-5|claude-sonnet-5`
   (default `claude-opus-4-8`), `build_model=...` (build-step-only override,
   default `same-as-model`), `timing_source=auto|whisper|en-srt` (default `auto` —
   en-srt if present, else whisper), `dry_run=true` (replay snapshots via
   `tools.fake_llm`, no commit).
4. Pipeline runs automatically:
   - **Whisper**: speech detection → `whisper.json` (word-level timestamps)
   - **Translate**: Claude agent translates EN → UK → `transcript_uk.txt`
   - **Review**: 2+1 review (Reviewer L + Reviewer S + Critic)
   - **Build**: single-pass Claude builder agent writes `timecodes.txt` (`#N | start | end`
     per block); Python merges with `uk_blocks.json` in memory → `final/uk.srt`
   - **Validate**: structural checks (text, CPL, CPS, overlaps, gaps)
   - **Commit**: pushes all results back to repo

### Other Workflows

See `ARCHITECTURE.md` for full descriptions. In short:
`sync-subtitles.yml` (PR sync), `whisper.yml` (reusable),
`ci.yml` (lint + tests), `deploy-pages.yml`, `glossary-release.yml`,
`sync-review-status.yml`, `new-talk.yml`, `pipeline-matrix-dryrun.yml`,
`golden-talks.yml` (full-corpus pytest, on-demand).

## Local Setup

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt                  # for tests
python -m pytest tests/                              # run Python tests
python -m pytest tests/ -m "not e2e"                 # fast lane (skip browser E2E)
python -m pytest tests/test_offset_srt.py -k detect  # run a single test
python -m pytest tests/ --cov=tools --cov-report=term-missing  # coverage
GOLDEN_TALKS_SCOPE=all pytest tests/test_golden_talks.py  # full-corpus golden
node --test tests/test_*.js                          # run JS (SPA) tests
pytest -m smoke                                      # SPA boot smoke (~2s, needs chromium)
```

**Any change under `site/` MUST pass `pytest -m smoke` AND be opened in a browser
before it's "done".** The unit lanes only grep strings out of `index.html`/`*.js`/
`*.css` — they go green even when the SPA renders a blank page (boot throws, or an
unlinked/404 stylesheet). The boot smoke (`tests/test_spa_boot_smoke.py`) loads the
app and asserts it boots, renders, and is styled. Off GitHub Pages the app needs
`?repo=owner/name` (e.g. `localhost:8000/?repo=sy-tools/sy-subtitles`) or it shows a
deliberate blank page.

See `TESTING.md` for the full guide: markers, golden corpus, property tests,
snapshots, and the `SY_E2E_REAL_VIMEO` network gate.

## Development (TDD required)

**Work test-first. No production code without a failing test first.**
This applies to every feature, bug fix, and behaviour change — Python tools
*and* the `site/index.html` SPA.

Red → Green → Refactor:
1. **RED** — write one minimal test for the desired behaviour, run it, and
   *watch it fail for the right reason* (feature missing / bug reproduced).
2. **GREEN** — write the minimal code to make it pass.
3. **REFACTOR** — clean up while keeping tests green.

For bug fixes: first write a test that reproduces the bug (it must fail), then
fix. The test proves the fix and guards against regression.

SPA logic lives in `site/js/*.js` modules (exercised by `node --test`) and is
loaded into `site/index.html` as plain `<script src="js/…">` tags — a **single
source, no inline copy**: the very same files are `require`d by the Node test
suite, so browser and tests can never drift. Add the testable logic to the
module, test it there, then wire it into the SPA — see
`site/js/preview_state.js` / `site/js/add_talk_data.js` for the pattern.

### Design System (SPA)

The SPA's look is a formal token/component system. **Build new UI from it; don't
re-invent values.** Open **`site/styleguide.html`** first — it's the live catalog
(rendered by the same CSS, so it can't drift).

- **Where it lives:** `site/css/tokens.css` = the contract (palette, type, scales);
  `site/css/components.css` = component rules built on those tokens (loaded after).
  Index links both; the boot smoke + shell-version + SW precache track them.
- **Idiom — style via `var(--token)`, never a raw hex or magic number.** A palette
  value belongs in `tokens.css` for *both* themes; `components.css` must define no
  palette (guarded by `test_spa_cache.js`).
- **Palette:** surfaces `--bg`,`--bg2…5`; ink `--fg`,`--fg2…6`; `--border`,`--border2/3`;
  `--link`; `--accent-green/orange/red`; semantic zones `--primary/issue/danger-{bg,border,fg}`,
  `--stat-active-bg`, `--cell-hover/edit-bg/edited-bg`, `--mark-bg`, `--overlay-bg`.
- **Scales:** `--space-1…8` (4→32), `--radius-sm…pill`, `--text-2xs…-display`,
  `--shadow-sm/md/lg`, `--z-*`. Type families `--f-serif` (titles), `--f-sans` (UI),
  `--f-mono` (codes/dates).
- **Two themes:** warm-paper *light* (the default `:root`) and walnut *dark*
  (`@media (prefers-color-scheme: dark)` **and** `[data-theme="dark"]`), toggled via
  the `data-theme` attribute. They stay consistent across all six OS×toggle states —
  no cross-theme leaks — enforced by **`tests/test_spa_theme_tokens.py`** (computed
  styles). When you add or change a palette token, set it in the light `:root` AND
  both dark blocks, then update that guard's `LIGHT`/`DARK` maps.
- **Buttons:** `<button class="btn btn--primary btn--sm">` — variants
  `--primary/issue/danger/ghost`, sizes `--sm/--lg`, with hover/active/disabled/
  focus-visible built in. Use `.btn` for new actions.
- **A11y:** keep body/label text ≥ WCAG AA on `--bg`; the faint `--fg5/--fg6` are
  already tuned to pass. Every interactive element inherits the global focus ring.

## Language Rules

See `glossary/CLAUDE.md` for the canonical deity-pronoun, orthography,
and transliteration rules.

### SRT Format
- Single-line mode (no manual line breaks in subtitle text)
- UTF-8 with optional BOM
- Block numbering sequential from 1

## Review Process

Use the 2+1 agent language review (see `templates/language_review_template.md`):
- **Reviewer L**: Language (Orthography + Grammar + Punctuation)
- **Reviewer S**: SY Domain (Capitalization + Terminology + Consistency)
- **Critic**: Filter corrections, remove false positives

## Adding a New Talk

End-to-end commands are in `README.md`. Quick reference:

```bash
python -m tools.download --url "https://www.amruta.org/..."
git add talks/{date}_{slug}/ && git commit -m "Add {title}" && git push
gh workflow run subtitle-pipeline.yml -f talk_id={date}_{slug}
```

If Vimeo returns 401: `--what text` first, then `--what srt`.

## Tools

```bash
# Download talk from amruta.org (folder named {date}_{slugify(title)} — same as
# the SPA; see tools/talk_slug.py. amruta auth/cookie: docs/amruta-auth.md)
python -m tools.download --url "https://www.amruta.org/..." [--what srt,text|all|video] \
  [--langs en,uk] [--slug SLUG] [--cookie COOKIE]
#   --what is comma-separated (default srt,text); --langs en,uk fetches EN +
#   Ukrainian (/uk/) transcripts; folder/meta from EN. Batch mode: replace
#   --url with --manifest queue.yaml.

# Vimeo link obfuscation: meta.yaml stores links as `video_ref` (not plaintext
# vimeo_url). Obfuscation only — decode ships in the public SPA.
python -m tools.vimeo_codec encode "https://vimeo.com/<id>/<hash>"   # -> video_ref
python -m tools.vimeo_codec decode "r1..."                          # -> vimeo url
python -m tools.mask_video_refs [--check] [PATHS...]                 # migrate meta.yaml vimeo_url -> video_ref

# Passphrase-gate hash (used by deploy-pages.yml to inject APP_GATE_HASH from the
# GATE_PASSPHRASE secret). Twin of site/js/passphrase_gate.js.
python -m tools.passphrase_gate hash --salt <hex> --iterations <n> "<phrase>"

# Build subtitles (deterministic orchestrator; LLM writes timecodes.txt between prepare and assemble)
python -m tools.build_map prepare        --talk-dir PATH --video-slug SLUG [--lang uk]
python -m tools.build_map prepare-timing --talk-dir PATH --video-slug SLUG [--timing-source whisper|en-srt]
python -m tools.build_map assemble       --talk-dir PATH --video-slug SLUG [--lang uk]

# Validate SRT subtitles (timing source: --whisper-json OR --en-srt, en-srt preferred)
python -m tools.validate_subtitles --srt PATH --transcript PATH \
  [--whisper-json PATH | --en-srt PATH] --report PATH \
  [--skip-text-check] [--skip-time-check] [--skip-cps-check] [--skip-duration-check] \
  [--compare-block-count]   # en-srt + --skip-text-check: guard UK block count vs EN

# Sync transcript edits into existing SRT (for PR workflow)
python -m tools.sync_transcript_to_srt --talk-dir PATH --video-slug SLUG \
  --old-transcript OLD --new-transcript NEW

# Sync SRT text edits back into transcript_uk.txt (reverse direction, for PR workflow)
python -m tools.sync_srt_to_transcript --old-srt OLD --new-srt NEW \
  --transcript transcript_uk.txt

# Two-pass sync driver for sync-subtitles PR workflow (used by Actions).
# Discovers changed files itself via `git diff --name-only $BASE_SHA HEAD`.
python -m tools.sync_pr --base-sha SHA

# Resync UK SRT from primary video timeline onto secondary video timeline
python -m tools.resync_srt --primary-uk PATH --primary-en PATH \
  --secondary-en PATH --output PATH

# Build UK SRTs for a talk's secondary videos (offset/resync from primary).
# Needs source/en.srt on BOTH primary and secondary; skips videos without it.
python -m tools.build_secondary_srts --talk-dir PATH --primary-slug SLUG [--run-id ID]

# Snap an English SRT onto whisper word timestamps (EN-subtitle timing; forced word-align)
python -m tools.snap_srt_to_whisper --srt PATH --whisper-json PATH --output PATH \
  [--min-gap 80] [--min-duration 1000]

# Validate artifact contracts at pipeline phase boundaries
python -m tools.validate_artifacts [--whisper PATH | --meta PATH |
  --timecodes PATH | --talk-dir PATH] \
  [--expected-blocks N] [--max-blocks N] [--allow-skipped-ids]   # block-count bounds (en-srt mode)

# Detect and apply timecode offset between videos
python -m tools.offset_srt detect --srt1 PATH --srt2 PATH
python -m tools.offset_srt apply --srt PATH --offset-ms N --output PATH

# Optimize SRT timing (input: --srt OR --uk-json)
python -m tools.optimize_srt (--srt PATH | --uk-json PATH) --output PATH [--json PATH] [--report PATH] \
  [--target-cps 15.0] [--hard-max-cps 20.0] [--min-duration 1200] [--max-duration 7000] \
  [--min-gap 80] [--fps 24] [--skip-duration-split] [--skip-cps-split]

# Export SRT to plain text
python -m tools.text_export --srt PATH --output PATH [--meta PATH] [--double-spacing]

# Align Ukrainian transcript to English whisper timestamps
python -m tools.align_uk --transcript PATH --whisper-json PATH --output PATH \
  [--batch-size N] [--skip-word-align]

# Extract SRT text for language review
python -m tools.extract_review --srt PATH [--output PATH]

# Fetch EN+UK transcripts for glossary corpus
python -m tools.fetch_transcripts [--index PATH] [--slug SLUG] [--delay N] [--cookie COOKIE]

# Scan EN transcript for glossary term candidates
python -m tools.glossary_check --transcript PATH --glossary PATH --report PATH

# Scrape amruta.org UK talk listing into index.yaml
python -m tools.scrape_listing [--output PATH] [--cookie COOKIE] [--url URL]

# Run Whisper speech detection
python -m tools.whisper_run --video PATH --output PATH [--model MODEL] [--language LANG]

# Internal / pipeline-support CLIs (run by workflows, rarely by hand):
#   tools.builder_data            — query EN SRT blocks + whisper word timestamps for the builder agent
#   tools.fake_llm                — fake LLM responder for dry-run pipeline (replays snapshots)
#   tools.verify_snapshot         — verify a dry-run result against a recorded snapshot
#   tools.workflow_validation_cli — guard step validating talk-id / video-slug / video-ref inputs
```

## Glossary

Sahaja Yoga term dictionaries live in `glossary/`:
- `terms_lookup.yaml` – EN → UK term dictionary
- `terms_context.yaml` – disambiguation context for terms with variants
- `chakra_map.yaml` – chakra/deity/channel mapping
- `chakra_system.yaml` – full subtle system reference

See `glossary/CLAUDE.md` for translator agent instructions (transliteration, capitalization rules).

## Architecture

See `ARCHITECTURE.md` at the project root for the full system architecture overview.

## Review Tracking

`review-status.json` tracks per-talk review state (synced from GitHub issue labels via `sync-review-status.yml`).