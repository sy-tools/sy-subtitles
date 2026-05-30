# Language Review – 2000-05-07_Sahasrara-puja-Attain-that-Sahaja-state, 2026-05-30

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text) against `transcript_en.txt`
using 2 parallel reviewers (L – Language, S – SY Domain) + 1 Critic filter, per
`templates/language_review_template.md`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`.

Punctuation/character audit (programmatic): quotes `«»` 70/70 balanced (no `„"`/`""`);
apostrophes all `’` (U+2019, 22×); ellipsis `...` (1×, no space before); no Latin/Cyrillic
mixing inside words; no double spaces. Dash audit: 41× em-dash `—` (U+2014), 0× en-dash.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (41×) | Em-dash `—` (U+2014) used for interjections; glossary mandates en-dash `–` (U+2013) with spaces. Corpus-wide convention is en-dash (5886 vs 696). This file is an outlier (0 en / 41 em). | `…невігласними людьми — щодо самих себе…` | Replace `—` → `–` (keep surrounding spaces) |
| L2 | 8 | Non-standard close/reopen of `«»` around an author interjection within continuous direct speech; first part ends with `!` so author's words take a period and continuation is capitalised. Inconsistent with the correct pattern used in ¶23 (`«…, — сказала Я, — …»`). | `«О Боже мій!» — сказала Я, — «як же Я дам їй Реалізацію?»` | `«О Боже мій! – сказала Я. – Як же Я дам їй Реалізацію?»` |
| L3 | 21 | Lexical calque `слідувати цьому`; more idiomatic Ukrainian `дотримуватися цього`. | `…вони намагатимуться слідувати цьому.` | `…дотримуватися цього` |
| L4 | 31 | Attributive active present participle `переважаюча` (`-юч-`), non-normative in standard Ukrainian. | `Він наче переважаюча своєю любов’ю людина.` | rephrase, e.g. `…людина, що перемагає своєю любов’ю` |
| L5 | 11 | Question mark on a reported-speech clause (`про те, як…`). | `…говорили … про те, як вони можуть отримати Самореалізацію?` | `…Самореалізацію.` |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 13, 22, 35 | Proper noun *Sahaja Yoga* spelled with plain `г` (`Йоги`/`Йогою`) instead of `ґ` (Sanskrit `g` → `ґ`, glossary `Сахаджа Йоґа`). Inconsistent with `сахаджа йоґи`/`йоґів`/`йоґам` (with `ґ`) used elsewhere in the same text and with locative `Йозі`. | `…диво Сахаджа Йоги.` / `…незадоволені Сахаджа Йогою.` / `…подорожі Сахаджа Йоги` | `Сахаджа Йоґи` / `Сахаджа Йоґою` / `Сахаджа Йоґи` |
| S2 | 13 | `пуджа мурті` lowercase vs glossary `Пуджа` (uppercase ceremony name); all other instances in text are uppercase (`Пуджу Дурґи`, `Сахасрара Пуджа`). | `Це не якась там пуджа мурті (статуї)…` | `Пуджа мурті` (?) |
| S3 | 18 | `Страшний Суд` — second word capitalised; conventional Ukrainian is `Страшний суд`. | `Це Страшний Суд.` | `Страшний суд` (?) |
| S4 | 8 | `мій` lowercase in Shri Mataji's own utterance (`О Боже мій!`). | `«О Боже мій! …` | `Мій` (?) |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Explicit glossary orthography rule (`En-dash: ` – ` (U+2013)`) + overwhelming corpus convention. Genuine systematic error. |
| L | L2 | **Keep** | Genuine punctuation error; closing/reopening `«»` mid-utterance is non-standard, and the same transcript (¶23) shows the correct continuous pattern. |
| L | L3 | Remove | `слідувати` is dictionary-attested; correction is a style preference, not a clear error. |
| L | L4 | Remove | Active participle is tolerated in transcribed spoken text; rephrasing risks altering the "over-powering" sense. Not a clear-cut error. |
| L | L5 | Remove | The `?` faithfully mirrors the source's own idiosyncratic phrasing (`…how they can get Self-realisation?`). |
| S | S1 | **Keep** | Transliteration rule (`g` → `ґ`) + internal inconsistency with `йоґи`/`йоґів` in the same text. Genuine terminology error. |
| S | S2 | Remove | Dismissive generic context (`якась там пуджа мурті` = mere statue-worship, explicitly contrasted with a living deity) justifies lowercase; uppercasing here would be incongruous. |
| S | S3 | Remove | `Страшний Суд` is an accepted religious-capitalisation variant; not a definitive error. |
| S | S4 | Remove | `О Боже мій!` is an idiomatic exclamation; capitalising `Мій` would look unnatural. `Боже` is already capitalised. Not an error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (41×) | Em-dash `—` instead of en-dash `–` | `—` → `–` |
| 2 | 13 | `Сахаджа Йоги` (plain `г`) | `Сахаджа Йоґи` |
| 3 | 22 | `Сахаджа Йогою` (plain `г`) | `Сахаджа Йоґою` |
| 4 | 35 | `Сахаджа Йоги` (plain `г`) | `Сахаджа Йоґи` |
| 5 | 8 | Close/reopen `«»` around author interjection | `«О Боже мій! – сказала Я. – Як же Я дам їй Реалізацію?»` |

## Summary

- Language (L): 5 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic (covering 3 text instances)
- Total corrections applied: 45 edits (41 em→en dashes, 3 `Йоґа` transliterations, 1 quote restructure) across 5 approved correction types

### Notes (verified correct — no change)
- Deity pronoun capitalization for Shri Mataji is consistent throughout (`Я/Мені/Мій/Моя`,
  and `Вона`/`Ти`/`Мамо` when others address Her, e.g. ¶12 `хто Вона!`, ¶46 `Мамо, як Ти могла…`).
- Spiritual terms correctly capitalised: `Дух/Духа/Дусі`, `Істина/Істину`, `Реалізація/Самореалізація`,
  `Пуджа` (ceremony), `Інкарнації`, `Абсолютне Знання`.
- `Реальність`/`реальність` correctly tracks the source's case (capital where EN capitalises, lower in ¶30).
- Language names lowercase (`англійська`, `санскритом`); sentence-initial `Санскритом` (¶28) correctly capitalised.
- Practitioner term `сахаджа йоґ/йоґи/йоґів` correctly lowercase with `ґ`; `Сахаджа Йоґа`/`Йозі`
  (organisation) correctly capitalised; locative `Йозі` (ґ→з alternation) correct.
- Kabir's first-person quote (¶49) kept lowercase — saint-poet, not in the deity/Incarnation list.
- Closing blessing matches the fixed phrase: `Нехай Бог благословить усіх вас.`
