# Architecture

## Pipeline Flow

```
  amruta.org
      │
      ▼
  ┌─────────┐    git push    ┌──────────────────────────────────────┐
  │ download │ ──────────────►│        subtitle-pipeline.yml         │
  │ (local)  │               │                                      │
  └─────────┘               │  ┌─────────┐   ┌───────────────────┐ │
   meta.yaml                │  │ whisper  │──►│ translate+review  │ │
   transcript_en.txt        │  │ (.yml)   │   │ (Claude)          │ │
   en.srt                   │  └─────────┘   └───────────────────┘ │
                            │                        │              │
                            │                        ▼              │
                            │  ┌──────────────────────────────────┐ │
                            │  │ build (prepare → LLM → assemble)  │ │
                            │  │  Python splits ──► LLM timecodes  │ │
                            │  │  Python assembles ──► uk.srt      │ │
                            │  └──────────────────────────────────┘ │
                            │                        │              │
                            │                        ▼              │
                            │  ┌──────────┐   ┌──────────┐        │
                            │  │ validate  │   │  commit   │───►git │
                            │  └──────────┘   └──────────┘        │
                            └──────────────────────────────────────┘
                                             │
                            ┌────────────────┘
                            ▼
                     ┌─────────────┐
                     │ SPA (Pages) │  reads from raw.githubusercontent.com
                     │ site/       │  review-status.json for badges
                     └─────────────┘
```

## Repository Structure

```
sy-subtitles/
├── talks/                          # Talk data (one dir per talk)
│   └── {date}_{slug}/
│       ├── meta.yaml               # Talk metadata (title, date, videos[]; links as obfuscated video_ref,
│                                  #   a YouTube video's downloadable copies as media_refs — see
│                                  #   "Video providers"; each video's `sync:` role — see "Video sync roles")
│       ├── transcript_en.txt       # English transcript
│       ├── transcript_uk.txt       # Ukrainian translation (pipeline output)
│       ├── review_report.md        # AI review report
│       └── {video_slug}/
│           ├── source/
│           │   ├── en.srt          # English subtitles as downloaded — never edited
│           │   └── whisper.json    # Word-level timestamps
│           ├── work/               # Build intermediates (gitignored + timecodes.txt)
│           │   ├── uk_blocks.json  # Split Ukrainian text blocks
│           │   ├── timing.json     # Compact whisper words / EN SRT blocks
│           │   └── timecodes.txt   # LLM output: #N | start | end per block
│           └── final/
│               ├── uk.srt          # Final Ukrainian subtitles
│               ├── en.srt          # Corrected English (optional); when present it,
│                                  #   not source/en.srt, times the build (srt_utils.timing_en_srt)
│               └── report.txt      # Validation report
├── glossary/                       # Translation knowledge base
│   ├── terms_lookup.yaml           # 374 EN→UK terms
│   ├── terms_context.yaml          # Disambiguation context
│   ├── chakra_map.yaml             # Chakra/deity mappings
│   └── chakra_system.yaml          # Full subtle system reference
├── tools/                          # Python tooling (see tools/ for full listing)
│   ├── download.py                 # Fetch from amruta.org (local only)
│   ├── whisper_run.py              # Whisper speech detection wrapper
│   ├── vimeo_codec.py              # video_ref / media_refs codec, every provider (name is historical)
│   ├── video_media.py              # Resolver of where whisper and burn download a video's file from
│   ├── burn_subtitles.py           # SRT → ASS → ffmpeg+libass burned-in video
│   ├── render_gate.py              # Blocks a burn gate step until the encode passes N%
│   ├── burn_clip.py                # A burn's clip: the one parser, cue re-basing, rendered span
│   ├── build_map.py / build_srt.py # Subtitle builder (prepare → LLM → assemble)
│   ├── builder_data.py             # Whisper / EN-SRT timing query interface
│   ├── validate_subtitles.py       # SRT validation (text, CPS, overlaps, gaps)
│   ├── validate_artifacts.py       # Phase-boundary contract enforcement
│   ├── optimize_srt.py             # Timing optimizer (splits/merges)
│   ├── sync_pr.py                  # Two-pass sync driver for sync-subtitles.yml
│   ├── sync_transcript_to_srt.py   # Forward sync (transcript → SRT)
│   ├── sync_srt_to_transcript.py   # Reverse sync (SRT edits → transcript)
│   ├── resync_srt.py               # Cross-video UK SRT resync
│   ├── offset_srt.py               # Multi-video offset detection
│   ├── align_uk.py                 # Ukrainian text alignment to whisper
│   ├── text_export.py              # SRT → plain text
│   ├── amruta_captions.py          # EN captions (VTT → SRT) for YouTube videos
│   ├── extract_review.py           # Extract SRT text for language review
│   ├── glossary_check.py           # Glossary candidate scanner
│   ├── fetch_transcripts.py        # amruta.org transcript corpus fetcher
│   ├── scrape_listing.py           # amruta.org UK index scraper
│   ├── schemas.py                  # Artifact schema validators
│   ├── workflow_validation*.py     # Workflow input guards
│   ├── fake_llm.py                 # Dry-run snapshot replay
│   ├── verify_snapshot.py          # Dry-run output verifier
│   ├── srt_utils.py                # Shared SRT parsing/writing
│   ├── text_segmentation.py        # Shared text segmentation helpers
│   ├── sync_common.py              # Shared sync helpers
│   └── config.py                   # Threshold constants
├── site/                           # GitHub Pages SPA
│   ├── index.html                  # Preview + Review app shell
│   ├── js/                         # Plain-JS modules (single source, shared with node --test)
│   ├── css/                        # Design tokens + components (tokens.css, components.css)
│   ├── fonts/                      # PT Serif TTF + license — the fullscreen preview AND libass
│   │                               #   (via fontsdir) draw this one file, so lines break alike
│   ├── styleguide.html             # Live design-system catalog
│   ├── sw.js                       # Service worker (offline shell precache)
│   └── icon.png                    # Mahayantra favicon
├── review-status.json              # Review tracking (synced from Issues)
├── templates/                      # Prompt templates
│   └── language_review_template.md
└── .github/workflows/
    ├── subtitle-pipeline.yml       # Main pipeline (whisper→translate→review→build)
    ├── sync-subtitles.yml          # PR-based transcript ↔ SRT sync
    ├── sync-review-status.yml      # Issues → review-status.json
    ├── talk-operator.yml           # Operator issue: talk added → QA → Amruta package → delivery
    ├── wordlist-refresh.yml        # Rebuild site/dict/words_uk.txt on main after talks land
    ├── whisper.yml                 # Reusable whisper workflow
    ├── ci.yml                      # Lint + tests + E2E
    ├── deploy-pages.yml            # Deploy site/ to GitHub Pages
    ├── glossary-release.yml        # Glossary releases
    ├── golden-talks.yml            # Full-corpus golden tests (manual)
    ├── new-talk.yml                # PR-triggered setup for new talks
    ├── pipeline-matrix-dryrun.yml  # Matrix dry-run validation
    └── burn-subtitles.yml          # Render uk.srt into the video (SPA-dispatched)
```

### Video sync roles

A talk's videos are different recordings of the same event, so a subtitle
edit in one has to reach the others. How each video participates is declared
per video in `meta.yaml` under `sync:`, and read only through
`tools/video_roles.py` (`python -m tools.video_roles --talk-dir PATH [--role primary]`):

| Role | Meaning |
|---|---|
| `primary` | Authoritative subtitle text. Exactly one per talk — or none, see below. |
| `derived` | Mirrors the primary's text positionally; keeps its own timing. |
| `independent` | Its own slice of the transcript (a separate talk on the same day, or one part of an event recorded as several); built as its own slice and synced against the transcript, never against the primary. |
| `ignored` | Never read, never written — a yogi's introduction, a presents ceremony, a camera angle with no subtitles. Once declared, it is not sent to whisper either. |

A multi-video talk MUST declare once more than one of its videos carries a
`uk.srt`; there is no default, because a default in a resolver is seen by
nobody and fires in CI. Below that threshold the resolver still answers: the
one subtitled (or lone) video is `primary` and every other video is
`ignored`. Mind the consequence — a second video that simply has not been
built yet resolves to `ignored`, so it is never built and never synced.
Declare the roles as soon as a talk gains a second video. Rules of thumb: the full
recording is `primary` and the `Talk` cut is `derived`; a video without
an EN SRT (`final/en.srt` or `source/en.srt`) cannot be `primary`, since resyncing needs an EN bridge on
both sides.

**A talk with no primary.** Some events were recorded as equal parts — a
workshop on four tapes, each holding a stretch of the one transcript — and no
recording is the authoritative one the others mirror. Every part is then
`independent` and the talk has no primary. A `derived` video copies the
primary, so a talk without one carries none; that combination is refused.

**What the pipeline builds.** `video_roles.build_slugs` — the primary, if any,
then every `independent` video — and `build-timecodes` runs one leg per entry.
When a talk builds more than one video, each leg is a *slice*: its builder
receives the whole transcript, keeps only the blocks its own recording speaks,
and the leg's build manifest says `slice: true`. Text preservation against the
whole transcript cannot hold for a slice, so it is not checked per video
(`validate_subtitles.manifest_validate_flags` reads the flag back for every
re-validation). Instead the commit job runs `tools.slice_coverage` across all
the slices and warns about blocks no video claimed or two did. The manifest
also records which transcript paragraphs the slice speaks
(`tools.slice_paragraphs`), with the paragraph count it was recorded against.
Both edit-sync legs use it: transcript → SRT skips paragraphs the slice does
not carry, and SRT → transcript searches only the slice's own paragraphs.
Short lines («Не знаю.», «Як тебе звати?») recur across tapes, and locating an
edit by text alone writes it onto the wrong tape. A slice refuses a map made
for a different paragraph count, and refuses re-paragraphing, which would
shift the map; a count-preserving re-cut (one split plus one merge) is not
caught. It warns and
never fails: where one part ends and the next begins is the builder's best
effort, and a person checks it. A leg that fails does not hold back the others
— commit ships every leg that passed.

### Video providers

A talk's video lives on one of two providers, and nothing past the player
widget may depend on which: same timings, same subtitles, same fullscreen
look, same tools. Until 2026-11 every talk was on Vimeo; amruta.org then moved
its talk pages to YouTube, and new talks arrive with YouTube videos. Existing
talks are moved to YouTube video by video, and only a video whose YouTube copy
is the same cut as the Vimeo file its subtitles were timed to — the same audio
at the same moments, start to end — because a different cut would put every
subtitle at the wrong moment while looking fine. A video that is not the same
cut stays on Vimeo, whose links keep working.

**What `meta.yaml` stores, per video.**

| Field | What it is | Who reads it |
|---|---|---|
| `video_ref` | What a viewer watches: a Vimeo link or a YouTube video. | The SPA player; every tool that needs to know the provider. |
| `media_refs` | Downloadable copies of a YouTube video, all the same cut: amruta's Bunny Stream copy, and the Google Drive files in the order amruta's page lists them. Optional, YouTube videos only. | Media downloads only. Never played. |

Both are written by the codec (`tools/vimeo_codec.py`, JS twin
`site/js/vimeo_codec.js` — the name predates the second provider). A ref's
version prefix selects its payload (`r1`, untagged Vimeo; `r2`,
provider-tagged): `r1` is a Vimeo link and carries no provider tag, because it
predates the idea of one; it is left exactly as it was so every stored ref
keeps decoding. `r2` carries a provider tag and is the only form YouTube,
Drive and Bunny Stream ids are stored in. Decoding answers a typed source (provider, id, watch URL), not a bare URL,
so a caller branches on the provider instead of pattern-matching a link.

This is **obfuscation, not secrecy** — the decoder ships in the public SPA. It
exists to defeat plaintext harvesting, so the rule it implies is wider than
`meta.yaml`: no real video or file id appears in anything pushed — not in
fixtures, docs, commit messages, or an Actions log. The tools mask what they
try and name only the provider when they fail; tests use made-up ids.

**Ingest.** The add-talk bookmarklet, the SPA add form and `tools/download.py`
read both page eras: the Vimeo markup of older pages and the YouTube markup.
On a YouTube page a video block carries its Drive download links and,
mostly, a Bunny Stream player (with a "Watch on Bunny" link to the same
video); a block that plays through the YouTube player has no Bunny copy. What
is there is stored as that video's `media_refs`, Bunny first. Of the Drive
links only the "Download MP4" ones are taken; a block with none falls back to
its "Download MPG (full quality)" links, main server before "Server 2" — the
last resort for a video with no smaller copy at all (an MPEG-PS file several
times the size, which Drive's quota may still refuse; ffmpeg reads it whatever
the `.mp4` name it is saved under). A block's mirrors are
taken only from that block, next to the YouTube id that names the video, so a
mirror is never attached to the wrong one. The plaintext guard
(`tests/test_no_plaintext_vimeo.py`) refuses a YouTube, Drive or Bunny link in
a talk's files the same way it refuses a Vimeo one.

**Validation fails closed.** The input guard for a `video_ref`
(`tools/workflow_validation.py`) accepts Vimeo alone unless the caller names
the providers it can handle. A gate in front of code that only knows Vimeo
therefore keeps refusing everything else until that code is taught the new
provider and the gate is widened in the same change — a new provider can never
reach a consumer by default.

**Where the media file comes from.** GitHub's runners cannot download from
YouTube: a spike on 2026-11-23 got "confirm you're not a bot" from every
yt-dlp client, and the only way past it is account cookies in CI, which is
ruled out (ban risk, rotation, a personal account turned into
infrastructure). amruta publishes other copies of its YouTube videos, the
same cut, reachable without credentials:

- **Bunny Stream** — most video blocks on a talk page play through a Bunny
  player and link "Watch on Bunny" (273 of the 300 YouTube videos in this
  repo on 2026-11-24; the rest play through the YouTube player and have no
  Bunny copy). The stream is HLS only (the MP4 fallbacks are
  absent, the original is refused) in 240p–480p renditions, the top one the
  same file as Drive's. A spike on 2026-11-24 (17 videos) measured the same
  duration as Drive within 0.05 s and a constant 21 ms offset — one AAC
  priming frame, far below anything a subtitle can show — and runners
  downloaded 5 of 5 at 6–10 Mbit/s.
- **Google Drive** — amruta's MP4 of the video. It served the runners in
  seconds at first (2026-11-23), then answered 429 to 4 of 4 runner requests
  a day later. It stays as the second mirror.

So:

- CI (whisper, burn) downloads a YouTube video **only** from its `media_refs`
  mirrors — Bunny first, then Drive in stored order, whatever order the refs
  are stored in — and never attempts YouTube itself. Whisper takes the
  smallest Bunny rendition (it needs only the audio, the same AAC track in
  every rendition), a render the best one up to 480p. A YouTube video with
  no mirror is skipped by whisper with a warning rather than queued to fail,
  and refused by burn before the run invests in anything.
  A YouTube link added by hand is such a video — the mirrors come only from
  amruta's page at ingest — so its whisper timings have to come from
  `local_whisper`, and it cannot be burned in CI.
- A home connection (`tools/local_whisper.py`) tries the mirrors in the
  same order and then YouTube itself, which does answer a residential IP. A committed
  `whisper.json` makes the pipeline skip whisper for that video.
- Vimeo videos download from Vimeo as before, including its occasional refusal
  of data-centre IPs — `local_whisper` exists for that case too.

The whisper and burn workflows and `local_whisper` take their download
candidates from one resolver, `tools/video_media.py`, rather than building a
URL themselves. Two things stand outside it, both local and by hand:
`local_whisper` lets its operator name a source URL in place of a video's
link, and `tools/download.py` still fetches a Vimeo video itself when asked
for one — a legacy path that knows Vimeo only and does nothing for a YouTube
video.

**Where EN subtitles come from.** A Vimeo video's come from Vimeo's own text
tracks. A YouTube video's come from amruta's public captions repository
(`tools/amruta_captions.py`): amruta's curated tracks, on the same timeline as
the video. They are taken as published — no machine-caption heuristic —
because `source/en.srt` is already an input a person may correct through
`final/en.srt`. The repository is filled daily, so "no captions yet" is an
ordinary answer and never an error: they are fetched when the talk is added
(`new-talk.yml`) and asked for again by the pipeline before it resolves the
timing source. A video that never gets captions is timed from whisper, as any
video without an EN SRT is.

**The player.** The SPA drives either provider's SDK through one adapter
(`site/js/video_player.js`) with the interface the Vimeo SDK already had, so
the preview, the sync player and fullscreen call one API. The chrome around
the player is still per provider — the control-bar heights fullscreen
reserves, how close to the end playback is frozen to keep the provider's end
screen away, how a failed load is handled — and the YouTube values there were
measured in the browser, not guessed. A Drive or Bunny mirror is a
download, never something the page plays.

**Decided against.**

- *Bunny Stream as a player.* The Bunny player refuses any foreign
  referrer: amruta restricts embedding to its own domain, and it would play
  on our origin only by suppressing or forging the referrer, i.e. by
  sidestepping that restriction. We do not build on that. A download is a
  different request, and Bunny serves it without amruta's referrer: the
  resolver passes none, and yt-dlp's Bunny extractor names only Bunny's own
  player page.
- *Bunny's captions.* Its EN track is cue-for-cue the one in amruta's
  captions repository, which stays the one source of EN subtitles.
- *A "refresh the videos of an existing talk" flow.* There is none. A dead
  mirror is replaced by hand in `meta.yaml` with the codec's CLI. Three
  mirrors per video make that rare; a flow can be its own project if it turns
  out not to be.
- *Storing the full-quality files.* Only the streaming-quality MP4 mirrors are
  stored when a video has them: a render's target is what the viewer watches
  on YouTube. The MPGs are stored only for a video that has nothing else.

## Workflows

### subtitle-pipeline.yml (main)
Triggered manually via `workflow_dispatch`. Full pipeline:
1. **Discover** — finds videos and determines what needs processing
2. **Whisper** — calls `whisper.yml` for word-level speech timestamps
   (only for videos a runner can fetch — see "Video providers")
3. **Translate + Review** — a Claude agent translates EN→UK, then 2+1 review
4. **Build** — `build_map.py prepare` → single-pass LLM timecodes (`build-timecodes` job) → `build_map.py assemble` → `build_srt.py`
5. **Validate** — text preservation, CPS, timing checks
6. **Commit** — pushes the talk's results as a bot PR + creates a review
   tracking Issue. It does not touch `site/dict/words_uk.txt`: see
   wordlist-refresh.yml

### sync-subtitles.yml
Triggered on PRs that modify `transcript_uk.txt` **or** `*/final/uk.srt`,
except `bot/*` branches: a pipeline build regenerates both sides together, so
there is no reviewer edit to reconcile, and a sync pass would rewrite the
transcript the build was made from.
Its bot commit also carries a rebuilt `site/dict/words_uk.txt`: a reviewer's
edit changes the corpus the wordlist is generated from, so the PR would
otherwise ship text the typo hints underline.
Runs the sync driver (`tools/sync_pr.py`): SRT edits are first synced
back into the transcript (reverse), a block boundary moved on a derived
video is carried straight to the primary (re-cuts cannot travel through a
transcript), then the transcript is synced out to every video's SRT
(forward) — text-only swaps, no re-timing — and validates.
A block removed from a derived video's SRT is not a deletion: that SRT is a
projection of the primary, so the block is text this cut does not hold (a clip
that ends before its caption track does), and the transcript and the primary
keep it. The run annotates it; text leaves the talk only through the primary
or the transcript. Its word edits still travel.

The driver resolves its own baseline: the last `github-actions[bot]` commit
carrying the `Sync-Bot: v1` trailer on this branch, else the merge-base with
`origin/main`. Never the PR base — that would replay edits the bot has already
applied. It also discovers the changed files itself, scoped to
`transcript_uk.txt` and `final/uk.srt`.

The bot commit is pushed with `GITHUB_TOKEN` and `[skip ci]` (so the sync does
not re-trigger itself), which means no CI run starts on it — yet it is now the
PR head, where the required `gate` must report. So the same step dispatches
`ci.yml` onto the branch right after the push (#1132): `workflow_dispatch` is
the one event that token is allowed to fire.

### sync-review-status.yml
Triggered on Issue label/assign changes. Syncs GitHub Issues → `review-status.json`.
Auto-updates labels: assign → `review:in-progress`, close → `review:approved`.

### whisper.yml
Reusable workflow. Downloads video, runs Whisper for word-level timestamps.
Also `workflow_dispatch` callable with a `force` flag.
The download goes through `tools/video_media.py`, and only the talk id and
video slug travel in the job matrix — never the ref — so the link is decoded
and masked inside the step that uses it. A YouTube video with no mirror
(Bunny or Drive) is not queued: a runner cannot fetch it, so discovery warns and names
`tools/local_whisper.py` instead of scheduling a job that can only fail (see
"Video providers").

### ci.yml
Runs on every push to `main` and on every pull request: ruff lint, Python
tests, JS tests, Playwright E2E. Default golden-talks scope is the curated
fixture; full-corpus run lives in `golden-talks.yml`.

The trigger is deliberately unfiltered. Which lanes are needed is decided by
the `changes` job, which owns the watched-path list, and the lanes skip when
nothing they cover moved. It sorts a change into two classes: **code** (tools,
tests, the SPA, dependencies, workflows) runs every lane; **data** (the talk
tree) runs the unit lane alone, because that is where every reader of talk
data lives — text hygiene, the schemas, the plaintext-link scan, the golden
corpus — while lint, the JS suite and the browser shards open no talk file. A
change with both runs everything. Pipeline, whisper and translation PRs are
pure data, and so are their merge commits on `main`: a talk costs one test job
per run, not seven, and a browser flake cannot fail a pipeline that is waiting
to merge its own output. The point of that shape is `gate`: it depends on
every lane, runs with `if: always()`, and passes only when each lane succeeded
or was skipped — so it is always reported and can be the single **required
status check** on `main`. Requiring a lane directly would wedge any PR whose
paths skip it, and requiring nothing at all is how a PR whose run never
arrived merged untested (#1069).
It also takes `workflow_dispatch`, solely so the sync bot can give its own
commit a `gate` (see sync-subtitles.yml); with no range to compare, `changes`
runs every lane for that event.
The typo-hint wordlist check (`tools.build_wordlist --check`) runs only on a
pull request that touches `site/dict/`, `glossary/` or the generator: talks
land without the list, so on a talk-only PR it would only measure how far the
base is behind wordlist-refresh.yml.

### Bot PRs (`.github/scripts/bot-pr.sh`)
Pipeline, whisper and review-status results reach `main` as a PR with
auto-merge, never a direct push, so they pass `gate` like any other change.
They are opened with a token minted for the bot GitHub App
(`vars.BOT_APP_ID` + `BOT_APP_PRIVATE_KEY`), not with `GITHUB_TOKEN`:
GitHub holds every run on a PR that `github-actions[bot]` opened until a person
approves it, no repository setting lifts that, and a held run never reports
`gate` — the PR then waits forever. When there is no App token (App not
configured, or minting failed) the jobs fall back to `GITHUB_TOKEN` and warn
that the PR needs that approval, rather than losing what the run produced.

The key is a secret of the `main` environment, never a repository secret. That
environment admits only the `main` branch, so a workflow pushed on another
branch cannot read it; reaching it takes a commit merged into `main`. The
minting jobs run in that environment, so running them from a branch needs the
branch admitted to `main` for the run, exactly as the pipeline's LLM jobs
already do. The one step that sees the key runs an action pinned to a commit.

`sync-review-status` also waits (`BOT_PR_WAIT_MERGE_SECONDS`) until its PR has
merged. Its runs are serialized, but issue events come in bursts and every run
rewrites `updated_at`: a run that branched off `main` before the previous PR
landed would conflict with it and never auto-merge.

### wordlist-refresh.yml
`site/dict/words_uk.txt` is one sorted file generated from every talk and the
glossary. When each pipeline PR rebuilt it, parallel runs rebuilt it from the
same old `main`, their new words landed on neighbouring lines, and every PR
after the first merged went `dirty` on that file alone — auto-merge never
fires on a conflict. So talk PRs leave it alone, and this workflow rebuilds it
from the live `main` tip on every push that changes a `transcript_uk.txt`, a
`final/uk.srt` or the glossary (or on dispatch), as one bot PR that waits for
its merge. Runs are serialized without cancelling the running one: a burst of
merges ends in one running refresh plus one pending, which picks up everything
that landed meanwhile. A leftover refresh PR (red, or not merged in time) is
closed before the next one opens. An unchanged list opens nothing.

### deploy-pages.yml
Deploys `site/` to GitHub Pages on changes under `site/`.

### glossary-release.yml
Tags and packages glossary releases.

### golden-talks.yml
Manual `workflow_dispatch` — runs `tests/test_golden_talks.py` with
`GOLDEN_TALKS_SCOPE=all` against every shipped `uk.srt`.

### new-talk.yml
Triggered when a PR adds a new talk directory; bootstraps metadata.
It does **not** run whisper: the subtitle pipeline runs it for any video that
still lacks a `whisper.json`, and talks timed from the EN SRT never need it.
EN subtitles come from the video's provider: a Vimeo video's from Vimeo, a
YouTube video's from amruta's captions repository (`tools/amruta_captions.py`).
That repository is filled daily, so a talk added before its captions landed
gets none here; `subtitle-pipeline.yml` asks again at the start of
`prepare-build`, before the timing source is resolved, and commits what it
finds with its results.

### pipeline-matrix-dryrun.yml
Replays the subtitle pipeline using `tools.fake_llm` snapshots — exercises
the build/sync stack without burning Claude calls.

### burn-subtitles.yml
`workflow_dispatch` from the preview SPA: downloads the video (through
`tools/video_media.py` — a YouTube video from its Bunny or Drive mirror, checked before
the run invests in anything; see "Video providers"), burns
`final/uk.srt` into the picture — the whole video or a clip of it — with
ffmpeg+libass reproducing the fullscreen subtitle look, and uploads the MP4 as a
7-day artifact. Sizing arrives as ratios measured in the browser (see
`tools/burn_subtitles.py`).

**The run name is the record of a render.** The REST API does not return a
run's `workflow_dispatch` inputs, and the SPA lists a talk's rendered, unexpired
videos with a single request for this workflow's recent successful runs. So
whatever that list shows is written into `run-name`: the human label first, so
a run is found by eye in the Actions list; then talk/video, the actor who
rendered it, the subtitle scale and the clip; and the caller's `request_id`
last, because `workflow_dispatch` returns no run id and matching that token is
how the SPA finds the run it just started. The segments are read from the
right, since the label is free text and may contain the separator itself.
`subs_scale` changes nothing in the picture; it is recorded only to be listed.

**A clip is cut by the render, not by the download.** The whole video is still
downloaded. ffmpeg seeks on the input side, so the output clock starts at zero,
and the cues are re-based onto that clock before the ASS document is built and
before the font probe, so both see only what the fragment draws. The gates
measure the span actually rendered — END clamped to the downloaded file — not
the source, or a clip would never near 100% and `Finish render` would fail it
as truncated; for the same reason the final verdict pairs its proportional
floor with a small absolute slack, since one frame of a short clip outweighs
the floor. Audio is re-encoded only for a clip: a copied stream can start only
at one of the source's packets, not at the seek point. Output and artifact
names do not depend on the clip. `tools/burn_clip.py` is the one parser of the
`clip` input, shared by the input guard, the burner and the span computation.

**Two refs, on purpose.** The workflow file and `tools/` come from the ref the
dispatch names — always the deployed SPA's own version. The subtitles come from
the `source_ref` input, checked out separately into `content/`, because a
reviewer's edit-sync branch is cut from `main` once and never fast-forwarded:
dispatching against it would run whatever renderer `main` happened to carry on
the day they first edited.

The job runs ffmpeg **once**, detached, writing an `-progress` file, and then
declares twenty cheap named steps (`Render 5%` … `Render 95%`, `Finish render`)
that each block in `tools/render_gate.py` until the encode passes that
threshold. That shape exists because a *step completing* is the only live,
CORS-clean progress channel a browser has into a running job — the log blob
404s mid-run and annotations appear only at finalisation — and the SPA already
polls the job's step list. So the bar is made of facts: each completed step
name credits a fixed slice of it (`BURN_STEP_WEIGHTS` in
`site/js/burn_video.js`, pinned against these step names by
`tests/test_burn_workflow_steps.py`). The grid is 5% because the corpus's
longest talk encodes in about 50 minutes, where 10% gates would leave the bar
motionless for over five minutes at a time.

## Subtitle Builder (V2)

Three-phase architecture:
1. **Prepare** (Python, deterministic) — splits Ukrainian text into subtitle-sized blocks and prepares timing data (`build_map.py prepare` / `prepare-timing`)
2. **Build timecodes** (LLM, single pass) — one Claude builder agent (model selectable via the `model` input) receives the UK blocks + EN transcript + timing source (whisper words or en.srt) and writes `timecodes.txt` (`#N | start | end` per block). The LLM returns ONLY timecodes, never modifies text
3. **Assemble** (Python, deterministic) — merges `timecodes.txt` with `uk_blocks.json` in memory and generates SRT via `build_srt.py`

Key principle: **LLM determines timing, Python guarantees text integrity.**

## SPA (GitHub Pages)

App shell at `site/index.html` plus plain-JS modules under `site/js/`
(shared single-source with the Node test suite), the token/component CSS
under `site/css/` (`tokens.css` + `components.css`, catalogued live in
`site/styleguide.html`), and a service worker (`site/sw.js` +
`site/js/sw_routing.js`) that precaches the shell for offline use:
- **Index** — talk list with search/filter, review status badges (from `review-status.json`)
- **Preview** — video player (Vimeo or YouTube, behind one adapter:
  `site/js/video_player.js`) + subtitle overlay + markers
- **Review** — side-by-side EN/UK transcript editor

Data sources (zero backend):
- GitHub Trees API → talk discovery (1 API call, cached with ETag)
- `raw.githubusercontent.com` → meta.yaml, SRT, transcripts
- `review-status.json` → review badges (static file, no API cost)
- GitHub Issues API → the same badges, live, for a signed-in session
  (`site/js/review_status_live.js`). The file trails a label change by the
  minutes its workflow and the raw CDN take; the issues do not. The file stays
  the base: it is all an anonymous visitor reads, and what is shown when the API
  fails. The issue → status mapping exists twice (that module and
  `.github/scripts/sync-review-status.py`), held together by
  `tests/fixtures/review_status_mapping.json`, which both test suites run.
- `localStorage` → markers, edits, preferences, cache

### Burned videos in the preview

The download menu's video item renders; it never downloads. A click opens two
choices — the whole video, or a fragment chosen in a floating panel — and while a
run is followed the item is its progress readout. A finished render is not one
of its faces: that face used to hide the offer to build for as long as the
subtitles stayed the same, which is exactly when a reviewer wants a fragment of
them. The finished video joins the **list of created videos** under the item
instead, and every download starts from a row of it.

That list is one request for `burn-subtitles.yml`'s successful runs within the
artifact retention, parsed back out of each run's name
(`parseBurnRunTitle` in `site/js/burn_video.js`): the run name is the only place
a render's talk, author, subtitle scale and span survive, because the API does
not return dispatch inputs. It shows every author's renders of the video on
screen and names the author only when it is someone else. The SPA and the
workflow pin the shared shape against each other from both languages
(`tests/test_burn_video.js` parses the YAML's run-name back;
`tests/test_burn_workflow.py` pins the separator, the shortest clip and the
retention).

The fragment panel is deliberately **not modal**: the reviewer finds the
boundaries by playing and seeking the player underneath it, and its buttons read
the player's position at millisecond precision. It refuses what the workflow
would refuse — a render already in flight, edits still syncing, the wrong
language, an impossible span — before anything is dispatched.

### Typo hints

A preference (the gear menu) underlines words that neither a general Ukrainian
dictionary nor this project's own vocabulary knows, live in the subtitle editor.
Neither source alone is usable here: the dictionary flags every transliterated
term (`Ґрантхі`, `абхішека`), and a bare corpus without morphology flags every
inflected form. Their intersection is what makes the hints quiet enough to leave
on. Measured on a real reviewer PR, 11 flags across 403 edited blocks, all 11
genuine, where the dictionary alone gave 55. Across the whole approved corpus —
1.3M word tokens in 268 files — it flags 32 occurrences of 7 words, and every
one is a real defect: `Mати`, `Toм`, `Aле`, `iндивідуально` and the like, whose
first letter is Latin. Nothing else in the corpus is flagged at all.

Both sides ask their own question of the same word. The dictionary is asked
about it AS WRITTEN (it holds `Лакшмі`, not `лакшмі`, and keys its apostrophes
with `'`); the wordlist is asked about the folded form. `tools/build_wordlist.py`
judges the corpus by exactly that rule, so a word is never in neither place:
lowercasing before asking once underlined 610 forms of this material's own
vocabulary — `Ісус`, `Христос`, `Крішна`, `Лакшмі`.

What this cannot do is judge a name by its case. The list is keyed by the folded
form, so a name the corpus writes lowercase somewhere legitimate — `лакшмі` in a
mantra, `деві` in `Сарва деві дева` — is thereafter accepted in lowercase
everywhere. Capitalisation of the sacred vocabulary stays a matter for the
language review (`glossary/AGENTS.md`), not for these hints.

A word mixing Cyrillic and Latin is flagged without asking either source: it is
wrong however its pieces are judged, and the corpus holds no legitimate word of
that shape. Read as Cyrillic only, `Mати` left the fragment `ати`, which the
builder then shipped as vocabulary — so the most invisible typo in the language
was also the one the hints could never see.

- `site/dict/uk_UA.{aff,dic}` — vendored hunspell dictionary (MPL 1.1, `dict_uk`)
- `site/dict/words_uk.txt` — only what that dictionary MISSES, built from the
  talks and the glossary by `tools/build_wordlist.py`
- `site/js/typo_worker.js` — holds both; parsing the dictionary costs ~4 s and
  ~290 MB, so it runs off the main thread and only while the preference is on
- `site/js/typo_hints.js` — which words to flag (pure; twin of the tokenizer in
  `tools/build_wordlist.py`, pinned by `tests/fixtures/wordlist_normalization_cases.json`)

Painting goes through the CSS Custom Highlight API, so the text is decorated
where it stands — no wrapper element, and therefore no disturbance to the caret,
the undo stack, or the text the edit store saves.

### Video tutorials

The tutorials are not this repository's: `sy-tools/sy-help` holds their
catalog, files, subtitles and the workflows that publish them (its README says
how). The portal only renders that repository's `catalog.json` from its Pages
site, in a sheet over the current view (`site/js/help_sheet.js`): a portal
installed on an iPhone's home screen opens a link in Safari, which shares none
of its storage, so a separate page would find the gate locked and the session
gone. The sheet opens behind the same passphrase gate as the translation pages.

Whoever can push to the help repository also gets an Edit mode
(`site/js/help_admin.js` + `help_admin_view.js`) that commits `catalog.json`
and uploads new recordings with their own sign-in. A browser cannot upload a
release asset (no CORS on `uploads.github.com`, nor on Git LFS), so a recording
goes up as 30 MiB git blobs to an `inbox/<file>` branch that the help
repository's ingest workflow publishes.

The service worker leaves `<video>`/`<audio>` and any `Range` request to the
network (`bypassesWorker` in `site/js/sw_routing.js`): answering them through
the worker broke seeking after a pause.

## Review Tracking

```
Pipeline completes → creates Issue (review:pending)
                          │
Reviewer assigns self ────► Action: label → review:in-progress
                          │         JSON updated
Reviewer closes Issue ────► Action: label → review:approved
                                    JSON updated
SPA reads review-status.json → shows badges
```

### Finalization (operator)

The operator holds a talk before and after the translator: runs the subtitle
pipeline, then reviews the translator's edits, runs QA and delivers the files
to Amruta. Each talk gets a second issue, `Operator: {talk_id}` (label
`talk-operator`, assignee from `roles.yaml`), driven by `talk-operator.yml`
and `subtitle-pipeline.yml` through `tools/talk_operator.py`:

| `op:*` label | Set when |
|---|---|
| `op:pipeline` | a new `talks/*/meta.yaml` lands on `main` (a push, so hand-pushed talks count) |
| `op:translator` | `subtitle-pipeline.yml` opened `Review:` — all subtitles built; talks added before this stage get their issue here |
| `op:review` | a translator `sync/{login}/{talk_id}--*` PR leaves draft |
| `op:qa` | that PR merged and no other ready sync PR is open, or the operator added `op:take` at `op:translator` (the edits landed without a translator PR); either way the bot also closes `Review:` with `review:approved` |
| `op:take` | a trigger, not a stage: the operator's "Take to QA" in the SPA; the bot removes it, and from anyone not in `roles.yaml` or at any other stage it changes nothing else |
| `op:qa-passed` | the operator: QA done |
| `op:ready` | `tools/amruta_package.py` committed `talks/{id}/_for_Amruta/` and posted the Gmail compose link |
| `op:delivered` | the operator closed the issue from `op:ready`; `amruta_delivery` (date + package commit) appended to `meta.yaml` |
| `op:back-to-qa` | a trigger, not a stage: the operator's "Back to QA" on a sent (or packaged) talk; the bot reopens the issue at `op:qa`, so the ordinary cycle rebuilds `_for_Amruta/` from `main` and the next close appends a second `amruta_delivery` entry. Same trust rule as `op:take` |

Labels are the state. The workflow edits issues with GITHUB_TOKEN, which
fires no other workflow — so the bot sets `review:approved` itself and its
`status` job calls `sync-review-status.yml` explicitly. `review-status.json`
keeps `status` as the translator's state (the SPA reads it) and adds
`operator_stage`, `operator`, `operator_issue` when an `Operator:` issue exists.

How far the pipeline got is not a label: the SPA reads it from the artifacts
(`whisper.json`, `transcript_uk.txt`, `review_report.md`, `final/uk.srt`), so a
partial or failed run cannot leave a stage that lies. The SPA's operator mode
splits `op:pipeline` into "New" (no artifact) and "Pipeline" (some), and places
talks without an `Operator:` issue the same way (`site/js/operator.js`).

Only an operator acts: anyone with triage access (translators push their sync
branches here, so they have it) can add `op:qa-passed` or close the issue, so
the workflow checks the event's sender id against `roles.yaml`. A non-operator's
`op:qa-passed` is removed, and a non-operator's close at `op:ready` is reopened;
neither packages nor records anything.

Spending Claude tokens is a role too: `subtitle-pipeline.yml` lets a run that
translates, reviews or builds start only for an operator flagged `llm: true`,
matched by the numeric id of whoever triggered it. It reads `roles.yaml` from
`main`, never from the dispatched ref, where any writer could grant themselves
the flag. Whisper-only and dry runs stay open to every writer.
