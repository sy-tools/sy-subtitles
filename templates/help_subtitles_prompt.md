# Subtitles for a portal video tutorial

You are writing the subtitles of one short video tutorial about the SY Subtitles
portal (the web app this repository publishes). A Ukrainian speaker walks
through the portal on screen. Speech recognition has already cut the speech
into timed cues; you write the text of each cue, first in Ukrainian, then in
English. You never see or change a timestamp: Python puts your texts back on
the cue timings.

## Input (in the work directory you were given)

- `meta.json`: `{"title": ..., "ref": ...}`, the video's title as the portal lists it.
- `cues.json`: an array of cues, `{"start", "end", "text"}`. `text` is raw
  speech recognition (Whisper, Ukrainian): it mishears words, glues or splits
  them (`ім 'я`, `будь -якого`), misspells names (`нікнейн`, `Гітхаб` for
  GitHub) and drops or misplaces punctuation.
- `ui.json`: every interface string of the portal, `key -> {"uk", "en"}`.

Also read, in the repository: `glossary/CLAUDE.md` (Ukrainian orthography,
capitalisation, transliteration) and `glossary/terms_lookup.yaml` (Sahaja Yoga
terms, English to Ukrainian), for the few places the speaker uses them.

## Output (write both files into the same work directory)

- `uk.json`: a JSON array of strings, **exactly one per cue, in cue order**.
- `en.json`: a JSON array of strings, the English of each Ukrainian cue, same length.

## Ukrainian (`uk.json`)

Correct the recognition; do not rewrite the speaker.

- Fix misheard and misspelt words, glued or split words, and punctuation, by
  the rules in `glossary/CLAUDE.md`. Keep the speaker's own words and order;
  drop only pure fillers (`ну`, `е-е`) when the sentence reads better without.
- When the speaker names something on screen (a button, a menu item, a tab, a
  status), write it **exactly as `ui.json` has it in Ukrainian**, in «ялинках».
  Recognition rarely gets these right; match by meaning.
- Product names stay as they are written: GitHub, Google, Apple, Vimeo,
  Amruta / Амрута (as the speaker says it), Claude.
- Each cue keeps the words spoken during it. A sentence may run on into the
  next cue; do not move words between cues to complete it.
- A cue is shown on its own for a few seconds: at most about 84 characters,
  never more than 120. No line breaks inside a cue.

## English (`en.json`)

Translate each Ukrainian cue into natural, plain English for someone learning
to use the portal.

- Interface names: **exactly as `ui.json` has them in English**, in "double
  quotes". The English reader sees the English interface, so the subtitle must
  name what is on their screen, not translate the Ukrainian label anew.
- Sahaja Yoga terms: the English the glossary maps them from.
- Same cue boundaries as the Ukrainian: a cue's English says what that cue's
  Ukrainian says. Same length limits.

## Before you finish

Check both files parse as JSON arrays of strings with exactly as many entries
as `cues.json`, and that no entry is empty. Report how many cues you wrote and
any place you were unsure of what was said.
