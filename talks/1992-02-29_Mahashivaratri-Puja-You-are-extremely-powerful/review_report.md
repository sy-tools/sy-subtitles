# Language Review – 1992-02-29 Mahashivaratri Puja: You are extremely powerful, 2026-05-31

## Process

2+1 review of `transcript_uk.txt` (full paragraphed Ukrainian text): Reviewer L
(Language) + Reviewer S (SY Domain) run in parallel, Critic filters.

Block numbers below refer to the numbered content blocks (6–28) in
`transcript_uk.txt`.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (6–28) | Wrong dash glyph — em-dash `—` (U+2014) used throughout instead of the prescribed en-dash `–` (U+2013) with spaces | `…Бог Всемогутній — Той, Хто…`, `…це бачення вашої Матері, бо Шіва — лише свідок…` (58 occurrences) | Replace ` — ` → ` – ` everywhere |
| L2 | 16 | Quote-initial word not capitalized — first word of direct speech after a colon must start with a capital | `Мер Кабелли сказав Мені: «мене дивує, що в церкві…` | `…сказав Мені: «Мене дивує, що в церкві…` |
| L3 | 10 | Subject–predicate agreement: relative `хто` takes a singular predicate (cf. correct `Ті, хто не вписується` in block 19) | `…ви ті, хто збираються створити ту велику спільноту.` | `…ви ті, хто збирається створити ту велику спільноту.` |
| L4 | 6 | Euphony: `з` is preferred before a word beginning with a vowel | `так багато вас із Австралії` | `…з Австралії` |
| L5 | 9 | Euphony: `з` after a vowel before a single consonant | `які люди створюються із Сахаджа Йоги` | `…з Сахаджа Йоги` |
| L6 | 10 | Superlative `найлегше` combined with `ніж`-comparison (next sentence correctly uses comparative `легше … ніж`) | `Для вас найлегше бути праведними, ніж навпаки.` | `Для вас легше бути праведними, ніж навпаки.` |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 13 | Possible over-capitalization of `Серце` (not in the capitalization list) | `Воно стало таким великим Серцем, що охоплює весь усесвіт` | `…великим серцем…` |
| S2 | 11, 14 | Possible over-capitalization of `Природа` | `насолоджуєтеся всім цим місцем, Природою`; `не створюють жодних проблем Природі` | `…природою` / `…природі` |

**Confirmed clean (no findings):**
- Deity-pronoun capitalization — all of Shri Mataji's pronouns (Я/Мене/Мені/Мій/Моя/Сама/Себе) uppercase; devotees addressing Mother use uppercase Ти/Тобі/Тобою/Тебе; third-person deity pronouns (Він/Його/Нього/Той/Хто) uppercase; quoted regular people's pronouns lowercase. Verified programmatically.
- Terminology vs glossary — Шіва/Садашіва, Дух, Дхарма, Інкарнація, Пуджа/Ґуру Пуджа, Самореалізація/Реалізація, Кундаліні, вібрації, его, Джняна (uppercase) / бхакті / карма (lowercase), Нішкрія, пунья, тапасья/аскеза, Вішва Нірмала Дхарма, Мойсей, Мохаммед, Ґуру Нанак, Будда, Махавіра — all correct.
- `Сахаджа Йоґа` (uppercase) vs `сахаджа йоґ(и)` (lowercase) and the locative `Сахаджа Йозі` (ґ→з) — all correct per glossary.
- Language names lowercase (англійська, українська); nationalities/religions lowercase (австралійці, росіяни, румуни, християнство, іслам, індуїзм).
- Quotation marks: 70 `«` / 70 `»`, balanced; no `"`/`„` anywhere. Apostrophe: `’` (U+2019) only. No double spaces, no space-before-punctuation, no Latin/Cyrillic mixing.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Project rule (`glossary/CLAUDE.md`) explicitly prescribes en-dash `–` (U+2013); corpus confirms — 6641 U+2013 in 74 files vs 713 U+2014 in 9. This file uses only U+2014 (outlier). Genuine systematic deviation. |
| L | L2 | **Keep** | First word of a direct-speech quote after a colon must be capitalized. Clear orthography error. |
| L | L3 | **Keep** | Prescriptive `хто` + singular predicate; also restores internal consistency with block 19 (`хто не вписується`). Low-risk, meaning unchanged. |
| L | L4 | Remove | `із`/`з` before a vowel is an acceptable euphonic variant; not an error. Style preference. |
| L | L5 | Remove | Same — euphonic variant, not an error. |
| L | L6 | Remove | The Ukrainian deliberately mirrors the source's emphatic "the easiest thing … than"; changing it alters the rendered nuance. Judgment call, not a clear error. |
| S | S1 | Remove | `Серце` is not in the capitalization list, but the capital here mirrors the source's reverential "Heart" (cosmic Heart where the Spirit shines) and is used consistently. Corpus shows a minority precedent (31 capitalized). Not a clear error. |
| S | S2 | Remove | Same reasoning — capital `Природа` mirrors the source's "the Nature"/"Nature" and is consistent within the transcript. Not a clear error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| L1 | all (6–28) | Em-dash `—` (U+2014) used instead of prescribed en-dash `–` (U+2013) | ` — ` → ` – ` (58 occurrences) |
| L2 | 16 | Quote-initial lowercase after colon | `«мене дивує` → `«Мене дивує` |
| L3 | 10 | `хто` + plural predicate | `хто збираються створити` → `хто збирається створити` |

## Summary

- Language (L): 6 issues found, 3 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 3 findings (L1 = 58 dash glyph replacements, L2, L3)
