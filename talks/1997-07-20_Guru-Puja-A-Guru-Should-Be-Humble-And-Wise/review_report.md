# Language Review – 1997-07-20_Guru-Puja-A-Guru-Should-Be-Humble-And-Wise, 2026-05-30

## Process

2+1 review of `transcript_uk.txt` (full paragraphed Ukrainian text) against the
English original, `glossary/CLAUDE.md`, `terms_lookup.yaml`, and `terms_context.yaml`.
Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic filtered
their findings; approved corrections were applied to `transcript_uk.txt`.

All quotation/ellipsis findings were verified at the byte level
(`«`=46 / `»`=47 before fix → imbalance localized to paragraph 19; two `…` U+2026
characters confirmed in paragraphs 24 and 37; no Latin/Cyrillic mixing detected).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 14 | Direct speech after a colon begins with a lowercase letter | `...ви чітко побачили б: «я роблю щось не так, мені не слід було цього робити»` | `...побачили б: «Я роблю щось не так...»` |
| L2 | 19 | Unmatched/stray closing guillemet `»` (file had 47 `»` vs 46 `«`; the surplus is here). The clause `тоді ви маєте подумати про це` addresses the yogis (Mother's narration), not quoted advice | `...тоді ви маєте подумати про це: як хтось це робить?» Тож такі...` | `...як хтось це робить? Тож такі...` (remove stray `»`) |
| L3 | 24 | Typographic ellipsis `…` (U+2026) instead of project-mandated three dots `...` | `«Ти ж знаєш, там чорні і…»` | `«Ти ж знаєш, там чорні і...»` |
| L4 | 37 | Typographic ellipsis `…` (U+2026) instead of three dots `...` | `...бо щойно ви стаєте цим… Бачте...` | `...бо щойно ви стаєте цим... Бачте...` |
| L5 | 32 | `звідки він стоїть` — `звідки` ("from where") sits awkwardly with `стоїть` ("stands"); `де` would be cleaner | `...поза цими ґунами, звідки він стоїть і бачить усе...` | (proposed) `...де він стоїть і бачить усе...` |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 9 | `адхарма` lowercase while `Дхарма` is capitalized as a spiritual principle | `...поклоняються адхармі...`, `американського адхармічного життя`, `огидної адхармічної природи` | (proposed) capitalize → `Адхарма` etc. |
| S2 | 13 | Pronoun for the divine power Парамчайтанья is lowercase `вона` | `Як Парамчайтанья діє – як вона діє...` | (proposed) `...як Вона діє...` |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine orthographic rule: пряма мова introduced by a colon must begin with a capital letter. Confirmed it is the only such case in the text (all other colon-introduced quotes are already capitalized). |
| L | L2 | **Keep** | Genuine punctuation error — unbalanced guillemets (47 vs 46), confirmed by byte count localized to paragraph 19. The trailing clause is Mother addressing the yogis, so it is not quoted speech; removing the stray `»` restores balance and matches the sense. |
| L | L3 | **Keep** | `glossary/CLAUDE.md` explicitly mandates `...` (three dots). `…` violates a documented project standard, not a style preference. |
| L | L4 | **Keep** | Same documented-standard violation as L3. |
| L | L5 | **Remove** | Defensible reading: `звідки` can refer back to the position "beyond the gunas" (from where he observes everything). Not a clear error; changing it is a style preference. |
| S | S1 | **Remove** | English original lowercases "adharma"; the term is not in the glossary; the translation is internally consistent (all three instances lowercase). Capitalizing the negation of Дхарма risks over-capitalization with no glossary basis. |
| S | S2 | **Remove** | The English uses the impersonal "it" for Paramchaitanya ("how it works out"); the capitalization rules cover Shri Mataji and individual Incarnations, not the all-pervading power. Lowercase `вона` is defensible and matches the source. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 14 | Lowercase start of direct speech after colon | `«я роблю...»` → `«Я роблю...»` |
| 2 | 19 | Stray unmatched closing guillemet `»` | `...як хтось це робить?»` → `...як хтось це робить?` |
| 3 | 24 | Typographic ellipsis `…` | `і…` → `і...` |
| 4 | 37 | Typographic ellipsis `…` | `цим…` → `цим...` |

## Summary

- Language (L): 5 issues found, 4 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 4

### Notes (verified correct — no change needed)
- Deity-pronoun capitalization (Я/Мене/Мій/Моя for Shri Mataji; Він/Його/Йому for
  Christ, Buddha, Shri Rama) is consistent and correct throughout.
- Saints' pronouns (Кабір, Тредас, Намадева, Тукарам) are correctly lowercase
  mid-sentence and only capitalized when sentence-initial.
- Glossary terminology is accurate: `Парамчайтанья`, `вібрації`, `обумовленості`,
  `ґуни/ґунами/ґун`, `калатіт`, `ґунатіт`, `Шастри`, `Самореалізація/Реалізація`,
  `Дхарма`, `Сахаджа Йоґа/Йоґу/Йоґи/Йозі`.
- `сахаджа йоґ / сахаджа йоґи / йоґів / йоґом / йоґам` correctly lowercase with
  correct hard-stem declension; locative `в Сахаджа Йозі` (ґ→з) correct.
- Language/ideology/ethnicity names lowercase (англійська, українська, християнин,
  єврей, росіяни, ґуджаратці, комунізму).
- Spiritual terms capitalized per rules (Пуджа, Істина, Інкарнація context, Дхарма).
- Quotation marks use `«»` at all levels (including nesting); em-dash ` – ` with
  spaces; apostrophe `’` consistent. No Latin/Cyrillic character mixing.
