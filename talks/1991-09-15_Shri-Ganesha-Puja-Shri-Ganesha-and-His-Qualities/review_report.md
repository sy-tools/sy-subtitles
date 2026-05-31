# Language Review – 1991-09-15 Shri Ganesha Puja: Shri Ganesha and His Qualities

## Process

2+1 review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml`,
and `terms_context.yaml`. The whole corpus was sampled to confirm
house-style conventions for punctuation, transliteration, and
capitalization.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all | Em-dash `—` (U+2014) used for interjections instead of en-dash `–` (U+2013) — 85 occurrences. Violates `glossary/CLAUDE.md` (En-dash ` – ` U+2013) and house style (corpus 6514 en-dash vs 740 em-dash). | `…вічна істота, вічне дитя` etc. | Replace ` — ` → ` – ` (85×) |
| L2 | all | Single-character ellipsis `…` (U+2026) instead of three dots `...` — 20 occurrences. Violates `glossary/CLAUDE.md` (Ellipsis `...` three dots). | `що… нині існує велика мода` | Replace `…` → `...` (20×) |
| L3 | 17 | Relative adjective from a city name wrongly capitalized | `Я хотіла купити Римський «ашрам»` | `римський «ашрам»` |
| L4 | 26 | Wrong case government — `слухняний` governs the dative, not `до` + genitive (corpus: `слухняний своїй…`) | `Чому Він був таким слухняним до Своєї Матері?` | `слухняним Своїй Матері` |
| L5 | 11 | `порочне коло` flagged as a possible calque for "vicious circle" | `Це порочне коло, мушу сказати` | (consider `замкнене коло`) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 26 | `Йоги` written with `г` instead of `ґ` — breaks the Sanskrit-g → ґ rule and is inconsistent with `Сахаджа Йоґа` / `Йозі` / `йоґ` used everywhere else in this very text | `стійкість у ваших досягненнях Сахаджа Йоги` | `Сахаджа Йоґи` |
| S2 | 10 | Divine Incarnation should be capitalized per `glossary/CLAUDE.md` (`Інкарнація – uppercase`); corpus 47 uppercase vs 2 lowercase | `Обидві ці речі цілком відсутні в інкарнації Шрі Ґанеші` | `в Інкарнації Шрі Ґанеші` |
| S3 | 24 | `моє его` lowercase vs `Я дам Чайтанью` uppercase within the same hypothetical attributed to Shri Ganesha — possible inconsistency | `«…Я дам Чайтанью, дам життя цій людині, — і моє его підніметься»` | (consider `Моє его`) |
| S4 | 6, 24 | `«Чайтанью»` quoted on first use but `Чайтанья`/`Чайтанью` later unquoted — quoting inconsistency | `Він дає Чайтанью` | (consider unify) |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Explicit glossary rule + overwhelming house style. Real, systematic orthography error. |
| L | L2 | **Keep** | Explicit glossary rule (`...` three dots). Real, systematic orthography error. |
| L | L3 | **Keep** | Relative adjectives from toponyms are lowercase in Ukrainian (`римський`); it is not part of an official proper name. |
| L | L4 | **Keep** | `слухняний` + dative is the normative government; `слухняний до` is non-standard. Corpus confirms `слухняний своїй`. |
| L | L5 | **Remove** | `порочне коло` is established in this corpus (5 occurrences, equal to `замкнене коло`). Acceptable variant, not an error. |
| S | S1 | **Keep** | Transliteration rule (Sanskrit g → ґ) and internal consistency: every other `Йоґ-` form in the text uses `ґ`. |
| S | S2 | **Keep** | Glossary explicitly capitalizes `Інкарнація`; strong corpus precedent (47:2). |
| S | S3 | **Remove** | Voice is ambiguous (doubt voiced by yogis vs. Ganesha); original not clearly wrong; correction debatable either direction. |
| S | S4 | **Remove** | The English source is itself inconsistent (`'Chaitanya'` then `Chaitanya`); the translation faithfully mirrors it. Style, not error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all | Em-dash `—` → en-dash `–` (interjections) | ` – ` (85×) |
| 2 | all | Single-char ellipsis `…` → `...` | `...` (20×) |
| 3 | 17 | `Римський «ашрам»` | `римський «ашрам»` |
| 4 | 26 | `слухняним до Своєї Матері` | `слухняним Своїй Матері` |
| 5 | 26 | `Сахаджа Йоги` (`г`) | `Сахаджа Йоґи` (`ґ`) |
| 6 | 10 | `в інкарнації Шрі Ґанеші` | `в Інкарнації Шрі Ґанеші` |

## Summary

- Language (L): 5 issues found, 4 approved by Critic
- SY Domain (S): 4 issues found, 2 approved by Critic
- Total corrections applied: 6 (105 punctuation-character replacements + 4 targeted edits)

### Notes
The translation is otherwise of high quality. Deity-pronoun capitalization
is handled correctly throughout (Shri Mataji `Я/Мені/Мене/Мною`; Shri Ganesha
and Christ `Він/Його/Йому/Себе/Свою`; yogis addressing the Mother `Ти/Тебе/Тобою`;
regular people lowercase). Quotation marks (`«»`, 52 balanced pairs), the
apostrophe (`’`, U+2019), spacing, and term transliteration (`Ґанеша`, `Чайтанья`,
`Муладхара`, `Адхістхан`, `Калі Юга`, `Стіп`, `Дух`) are all correct. No mixed
Latin/Cyrillic characters, no stray Russian letters, no spacing defects were found.
