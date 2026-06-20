# Language Review – The-Revival-of-Indian-Spirituality, 14 December 1998

## Process

2+1 agent review of `transcript_uk.txt` (full paragraphed Ukrainian text):
Reviewer L (Language) and Reviewer S (SY Domain) run in parallel; the Critic
filters both tables and keeps only genuine errors. Approved corrections were
applied to `transcript_uk.txt`.

This is a follow-up pass. A previous review already normalised dashes
(em-dash → en-dash, 103×) and capitalised the element name `Вайю`; both were
re-verified as conformant in this pass (0 × U+2014 / 103 × U+2013 en-dashes;
`Вайю` capitalised consistently in ¶13–14). This pass focused on the
direct-speech punctuation that the earlier pass did not flag.

The one systematic finding was grounded in a corpus check: across
`talks/*/transcript_uk.txt`, declarative direct speech places the sentence
period **outside** the closing guillemet in **2252** cases vs **211** inside
(≈10:1), matching standard Ukrainian Правопис (`А: «П».`). This is the house
convention against which this transcript was measured.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Period inside closing guillemet (declarative direct speech) | `…дуже глибокий.»` | `…дуже глибокий».` |
| L2 | 10 | Period inside closing guillemet | `…перешкоду з минулого.»` | `…з минулого».` |
| L3 | 21 | Period inside closing guillemet | `«Матінко, щоб слухати Тебе.»` | `…слухати Тебе».` |
| L4 | 21 | Period inside closing guillemet | `…і Я дам вам Самореалізацію.»` | `…Самореалізацію».` |
| L5 | 21 | Period inside closing guillemet | `«Матінко, ми чекаємо на нашу Самореалізацію.»` | `…Самореалізацію».` |
| L6 | 21 | Period inside closing guillemet | `«…це ж так очевидно – Твоє обличчя.»` | `…Твоє обличчя».` |
| L7 | 25 | Period inside closing guillemet | `«Вони хотіли б зустрітися з Тобою, Матінко.»` | `…Матінко».` |
| L8 | 25 | Period inside closing guillemet | `…поговорила з ними про це.»` | `…про це».` |
| L9 | 42 | Period inside closing guillemet | `«Гаразд, Я скажу тобі, їдь цим шляхом.»` | `…цим шляхом».` |
| L10 | 42 | Period inside closing guillemet | `«Це Хазрат Бал.»` | `«Це Хазрат Бал».` |
| L11 | 49 | Period inside closing guillemet | `…дай мені мою Самореалізацію.»` | `…Самореалізацію».` |
| L12 | 46 | Four dots / no space after marker | `[нерозбірливо: Отже]....чи можемо` | (considered) keep – source-fidelity transcription artifact |
| L13 | 52 | Unicode `…` + extra dots inside unclear-marker | `Дякую Тобі, Боже…..]` | (considered) keep – inside `[нерозбірливо: …]`, mirrors source |
| L14 | 54 | Informal `!..` | `Журналістика!..` | (considered) keep – faithful rendering of disfluent source |

Verified correct, **not** flagged:
- Interrogative quotes keep `?` inside the guillemet (`«…на увазі?»`, `«Хто вони?»`,
  `«…Як це він тут?»`) — correct per Правопис; left unchanged.
- Trailing-off quote `«ой, я...»` (¶38) keeps the ellipsis inside — correct.
- Book title `«Світло Корану».` (¶9) already had the period outside — correct.
- Apostrophes consistently `’` (U+2019); dashes consistently ` – ` (U+2013, 103×);
  no Latin/Cyrillic mixing; no double spaces.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 21 | Suspected `сахаджа йоги` (г) vs glossary `йоґи` (ґ) | `всі вони досі сахаджа йоґи` | (false positive) text already uses `ґ` — glyph misread |
| S2 | 11 | Capitalisation of `Божественною силою` (EN lowercase "divine") | `всепроникною Божественною силою любові` | (considered) keep – the all-pervading Divine power (Paramchaitanya) |
| S3 | 23 | Capitalisation of `Всесвіт` (EN lowercase "universe") | `Воно так охоплює увесь Всесвіт` | (considered) keep – acceptable for the cosmos as a whole |

Terminology / capitalisation spot-checks (all correct, no change needed):
- Deity pronouns for Shri Mataji consistently uppercase (`Я/Мене/Мій/Сама/Тебе/Тобою`),
  capital `Ви` when interlocutors address Her; in-character seeker voice kept lowercase
  where mid-sentence (`Як я можу це отримати?`, ¶49 — masculine `зробив` confirms
  seeker, not Mataji).
- Singular Incarnation pronoun uppercase: `коли Він це сказав` (Mohammad sahib, ¶11).
- `Кундаліні … Вона` personified uppercase (¶34, ¶36) — matches EN "She".
- Element names capitalised as named principles: `Вайю` (¶13–14), `Джал`, `Агні`,
  `Теджасва`, `Агні Таттва`, `Джал Таттва` — internally consistent.
- Glossary terms correct: `Кундаліні`, `Сахаджа Йоґа` / loc. `Сахаджа Йозі`,
  `сахаджа йоґи/йоґів`, `Аґію чакру`, `Сушумна Наді`, `прохолодний вітерець`,
  `Самореалізація/Реалізація`, `масову Реалізацію`, `Г’янадева/Г’янешвара`,
  `Ґуру Нанак`, `Кабір`, `Шіва`, `Ґанґа`, `Пурани`, `обумовленість`,
  `Святого Духа`, `Мати Земля`, `Царстві Божому`.
- `ґ` transliteration correct throughout (`ґуру`, `йоґи/йоґів`, `Ґанґа`).
- Language names lowercase: `англійська`, `гінді`, `санскрит`; ethnonyms lowercase
  (`британці`, `росіяни`, `індуси`, `мусульмани`, `греки`, `ізраїльтяни`).
- `стопи` (physical feet, ¶48/¶54) correctly lowercase — not the deity `Стопи`.
- Speaker labels (`Шрі Матаджі:`, `Чоловік:`, `Жінка:`, `Йоґ:`) match the EN source
  transcript labels — appropriate for the paragraphed transcript.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1–L11 | **Keep** | Genuine deviation from Ukrainian Правопис (`А: «П».`) and from the house convention (corpus 2252:211 period-outside). All 11 are `автор: «П.»` declaratives that end the author's sentence. |
| L | L12 | Remove | Faithful rendering of `[UNCLEAR So]….can we` inside an unclear-marker; preserves source disfluency. |
| L | L13 | Remove | Inside `[нерозбірливо: …]`; mirrors EN `Thank you God…..`. |
| L | L14 | Remove | `!..` reproduces the abrupt, disfluent source (`Journalism!..`); not an orthographic error worth altering. |
| S | S1 | Remove | False positive — `grep` confirms the text already reads `сахаджа йоґи` (ґ); the `ґ`/`г` glyph was misread on first pass. |
| S | S2 | Remove | `Божественна сила` = the all-pervading Divine power; uppercase is an accepted SY convention, not an error. |
| S | S3 | Remove | `Всесвіт` (the Universe as cosmos) is acceptably capitalised in Ukrainian; not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | Period inside guillemet | `глибокий.»` → `глибокий».` |
| 2 | 10 | Period inside guillemet | `минулого.»` → `минулого».` |
| 3 | 21 | Period inside guillemet | `слухати Тебе.»` → `слухати Тебе».` |
| 4 | 21 | Period inside guillemet | `дам вам Самореалізацію.»` → `Самореалізацію».` |
| 5 | 21 | Period inside guillemet | `нашу Самореалізацію.»` → `Самореалізацію».` |
| 6 | 21 | Period inside guillemet | `Твоє обличчя.»` → `Твоє обличчя».` |
| 7 | 25 | Period inside guillemet | `з Тобою, Матінко.»` → `Матінко».` |
| 8 | 25 | Period inside guillemet | `про це.»` → `про це».` |
| 9 | 42 | Period inside guillemet | `їдь цим шляхом.»` → `шляхом».` |
| 10 | 42 | Period inside guillemet | `Це Хазрат Бал.»` → `Бал».` |
| 11 | 49 | Period inside guillemet | `дай мені мою Самореалізацію.»` → `Самореалізацію».` |

## Summary

- Language (L): 14 issues raised, 11 approved by Critic (3 removed as source-fidelity artifacts)
- SY Domain (S): 3 issues raised, 0 approved by Critic (1 false positive, 2 acceptable conventions)
- Total corrections applied this pass: **11**

The translation is of high quality: deity-pronoun capitalisation, `ґ`
transliteration, glossary terminology, dashes (U+2013), and the `«»` quotation
style are all applied consistently. The only remaining systematic issue was the
sentence period sitting inside the closing guillemet in declarative direct
speech — now aligned with the house convention and Ukrainian Правопис.
