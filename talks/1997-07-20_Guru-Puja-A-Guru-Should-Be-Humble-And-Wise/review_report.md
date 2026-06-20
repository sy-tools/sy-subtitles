# Language Review – 1997-07-20_Guru-Puja-A-Guru-Should-Be-Humble-And-Wise, 2026-06-20

## Process

2+1 agent language review of `transcript_uk.txt` against the English original
(`transcript_en.txt`), the SY glossary (`glossary/CLAUDE.md`,
`terms_lookup.yaml`, `terms_context.yaml`) and the project orthography rules.

Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic
filtered both tables and resolved verdicts; approved corrections were applied.

Paragraph numbers below refer to line numbers in `transcript_uk.txt`.

> **Prior pass (2026-05-30).** A previous review already applied 4 corrections,
> now present in the text: ¶14 capitalized direct speech after a colon
> (`«Я роблю…»`); ¶19 removed a stray closing `»`; ¶24 and ¶37 replaced the
> typographic ellipsis `…` (U+2026) with three dots `...`. Those items are
> re-verified clean below and are **not** re-counted as new findings.

### Automated typography pass (clean)

A byte-level scan confirmed the source is now typographically impeccable:

- Quotation marks: 46 `«` / 46 `»`, balanced; no straight `"`, no `„"`, no `""`.
- Apostrophes: 28× U+2019 `’`; no straight `'` inside words; no stray U+02BC/U+0301.
- Dashes: all interjection dashes are spaced en-dash ` – ` (U+2013); no em-dash
  (U+2014); no hyphen-minus used as a dash.
- Ellipsis: only literal `...` (three dots, no space before); no U+2026.
- No Latin characters mixed into Cyrillic words.
- `Сахаджа Йоґа` and all inflections (`Йоґа/Йоґи/Йоґу/Йоґою/Йозі`) consistently
  use ґ (U+0491); locative `Йозі` correct throughout.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶13 | Lexical Russianism: `слідувати` (+ dat.) meaning "to follow/adhere to" is a calque; normative Ukrainian uses `дотримуватися` (+ gen.). The translation itself already uses `дотримуватися` in ¶31 (`релігії, якої слід дотримуватися`). | «…що б ви не відчували на своїх вібраціях, ви маєте цьому **слідувати**.» | «…ви маєте цього **дотримуватися**.» |
| L2 | ¶10 | Sentence is declarative in form (`Тож нам слід подивитися, як розвинути…`) yet ends with `?`. | «Тож нам слід подивитися, як розвинути ці сили всередині нас**?**» | (considered) replace `?` with `.` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ¶9 | `Дхарма` is capitalized (sacred principle) but its antonym `адхармі/адхармічного/адхармічної` is lowercase — possible capitalization inconsistency. | «…не вірять у жодну **Дхарму**. Вони цілковито поклоняються **адхармі**…» | (considered) `Адхарма` for parallelism |
| S2 | ¶13, ¶26 | `Парамчайтанья` is referenced with the lowercase pronoun `вона`; the divine `божественне світло` is lowercase — possible reverential-capitalization gap. | «Як Парамчайтанья діє – як **вона** діє…» | (considered) `Вона` |
| S3 | ¶27 | Shri Rama's pronouns are uppercase (`Він/Його/Йому`), but the pronouns of Sita (`вона`) and the brother/Lakshmana (`йому/він`) are lowercase — possible Incarnation-pronoun inconsistency. | «Тоді **вона** їсть і каже…», «…тож **йому** це не подобається… і **він** гнівається.» | (considered) `Вона`; brother per portrayal |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine lexical correction. `слідувати чомусь` ("to follow/adhere") is a recognized calque; `дотримуватися чогось` is idiomatic and is **already used by this same translation in ¶31**, so the fix also restores internal consistency. |
| L | L2 | Remove | The English source poses this as a rhetorical question (`…we should see?`). The `?` faithfully preserves Shri Mataji's questioning intonation; converting to `.` is a stylistic judgment, not a clear error. |
| S | S1 | Remove | Intentional, meaningful distinction: `Дхарма` is capitalized as a positive sacred principle (per `glossary/CLAUDE.md`); `адхарма` is its **negation** (unrighteousness), not a sacred term. The English capitalizes neither; the three instances are internally consistent. No glossary basis to capitalize the negation. |
| S | S2 | Remove | `Парамчайтанья` is the all-pervading divine **power/energy** (English "it" — "how it works out"; `бажання Всемогутнього Бога` in ¶17), not a personified Incarnation. The deity-pronoun rule targets Shri Mataji and named Incarnations. Lowercase `вона`/`божественне світло` is applied consistently; defensible. |
| S | S3 | Remove | The translation applies a consistent, defensible **focus-based** convention: the venerated Deity of the anecdote (Shri Rama) takes uppercase pronouns throughout, while the secondary narrative figures stay lowercase mid-sentence (uppercase only at sentence start, e.g. `Йому це не подобається`). Capitalizing the brother — explicitly portrayed as spiritually immature and angry (`ще на півдорозі… гнівається`) — would be inappropriate; capitalizing only Sita would break the internal consistency. Keep as translated. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| L1 | ¶13 | Russianism `слідувати` (+ dat.) | `ви маєте цьому слідувати` → `ви маєте цього дотримуватися` |

## Summary

- Language (L): 2 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied this pass: **1** (prior pass on 2026-05-30: 4)

### Notes (verified correct — no change needed)

The translation is of high quality. The following were checked and confirmed correct:

- **Deity-pronoun capitalization** is consistent and correct throughout:
  Shri Mataji always uppercase (`Я/Мені/Моя/Мене/Моїй`); second-person address to
  the Divine uppercase (`Ти`, `Матінко`, and `Матері` in ¶40); singular
  Incarnations in focus uppercase (`Христос – Він` ¶25; Shri Rama `Він/Його/Йому`
  ¶27); the generic aspirant guru lowercase (`він` for "a guru" ¶32–33);
  false gurus lowercase (`ґуру` ¶20, ¶36); saint-poets lowercase mid-sentence,
  uppercase only when sentence-initial (Tukaram ¶30; Kabir/Tredas/Namadeva ¶37);
  regular people lowercase.
- **Glossary terminology / transliteration**: `Парамчайтанья`, `вібрації`,
  `обумовленості` (correctly distinguished from `умовності`), `ґуни/ґунами/ґун`,
  `«калатіт»`, `«ґунатіт»`, `Шастри`, `Самореалізація/Реалізація`, `Дхарма`,
  `Тукарам`, `Кабіра`, `Будда`, `Шрі Рама`. ґ/дх/і transliteration correct.
- **Sahaja Yoga inflections**: `Сахаджа Йоґа/Йоґу/Йоґи/Йоґою`, locative
  `в Сахаджа Йозі` (ґ→з) correct; `сахаджа йоґ / йоґи / йоґів / йоґом / йоґам`
  lowercase with correct hard-stem declension.
- **Lowercase** language/ideology/ethnicity names: `англійська`, `українська`,
  `санскритом`, `християнин`, `єврей`, `росіяни`, `ґуджаратці`, `комунізму`.
- **Spiritual-term capitalization** per rules: `Пуджа`, `Істина`, `Дух`-class
  terms, `Дхарма`; `Захід/Схід` (civilizational regions) and `Бог/Богом/Боже`.
- **Number formatting**: `50 000`, `4000`, `300 доларів` correct.
- **Punctuation**: `«»` at all levels including nesting (¶18, ¶19); spaced en-dash
  ` – `; apostrophe `’`; literal `...`. Comma+en-dash combinations (e.g. ¶8, ¶16)
  are standard Ukrainian and correct.
