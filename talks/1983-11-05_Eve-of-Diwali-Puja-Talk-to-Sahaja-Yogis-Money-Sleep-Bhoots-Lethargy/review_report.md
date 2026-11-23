# Language Review – 1983-11-05_Eve-of-Diwali-Puja-Talk-to-Sahaja-Yogis-Money-Sleep-Bhoots-Lethargy, 1983-11-05

## Process

`transcript_uk.txt` (85 paragraphs) was checked paragraph by paragraph against
`transcript_en.txt` (also 85 paragraphs; paragraph numbers below count non-empty lines,
so they are the same in both files). Two reviewers worked in parallel and a Critic
filtered their findings, as `templates/language_review_template.md` requires. The rules
came from `glossary/AGENTS.md`, `glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.

Automated checks run over the whole text, all clean:
- No Latin letters, and no words mixing Latin and Cyrillic
- No `""`, `„"` or `“”` quotes; `«»` are balanced in every paragraph
- No straight `'` or `ʼ` apostrophes; every apostrophe is `’` (U+2019)
- No hyphen or em-dash used as a dash; every dash is ` – ` (U+2013)
- No double spaces, no spaces before punctuation, no missing spaces after punctuation
- No `…` character, no space before `...`, no `..` or `....`
- No invisible characters (NBSP, ZWSP, BOM inside the text)
- `[]` and `()` are balanced in every paragraph
- Every lowercase first-person pronoun (я/мені/мене/мій/моя…) is in someone else's
  quoted speech: seekers, the restaurant owner, CP, the lady in paragraph 25. Every one
  of Shri Mataji's pronouns is uppercase, including in Her own quoted speech in
  paragraphs 40, 66 and 67 (Я/Мені/Мене/Мій/Моя/Себе/Сама/Свої/Своєї).
- God's and Christ's pronouns are uppercase (Він/Йому/Його, paragraphs 9, 12, 17, 56, 64).
  Pronouns for Shri Mataji in the third person are uppercase (Неї/Вона, paragraphs 13, 43, 46).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 41 | Wrong agreement: «решта» is a feminine noun, so the pronoun must be feminine accusative. «усе решту» is a common Russian-influenced error. | «…і дав нам усе решту, і наступного дня в нас була чудова чола» | «усю решту» |
| L2 | 42 | Plural verb with the collective noun «решта» | «а решта слухають» | «а решта слухає» |
| L3 | 6 | Calque-like construction | «і Я дуже щаслива з цього» | «щаслива з цього приводу» |
| L4 | 35 | Possibly non-standard imperfective form | «мають таку звичку – розпродувати це» | «розпродавати» |
| L5 | 34 | Elliptical comparison without a preposition | «набагато більша, ніж будь-кого з цих людей» | «ніж у будь-кого» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 57 | Emphatic pronoun for Shri Mataji is lowercase, while elsewhere «Сама» is uppercase | «Матінко, як Ви впораєтеся з цим самі?» | «Самі» |
| S2 | 67 | Pronoun for the Spirit is lowercase | «Ось Дух – коли він входить у вас» | «Він» |
| S3 | 11 vs 22/30/35 | Inconsistent case: «Реалізованою Душею» here, «реалізована душа» elsewhere | «перш ніж стати Реалізованою Душею» | lowercase everywhere |
| S4 | 16 vs 17 | Name spelled two ways | «Рамадаси» / «Рамдас Свамі» | unify |

Terminology confirmed as correct and consistent (no finding): бхут/бхути/бхутівський (48+),
одержимий/одержимість, блокування (catches), ґуру (lowercase for human gurus), сахаджа йоґ/йоґи/йоґів,
Сахаджа Йоґа/Йоґу/Йоґою/Йозі (never «Йоґі»), Пуджа/Пуджі/Пуджу/Пуджею (always uppercase),
Аді Шакті, Дух / Святий Дух, Істина, Дхарма, Стопа/Стіп (Shri Mataji's Feet), Лакшмі Таттва,
пунья/пуньї/пунью, кшема, ґани, Ґанешею (instrumental), Мати Земля, тамаса (lowercase,
consistent), Сушумна, Дівалі; language names lowercase (англійська, маратхі).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Real grammar error. «Решта» is a feminine noun, so the agreeing pronoun is «усю» (accusative): «дав усю решту». «Усе решту» breaks gender agreement. |
| L | L2 | Remove | With «решта» referring to people, a plural verb is an accepted construction in Ukrainian (agreement by sense). Not an error. |
| L | L3 | Remove | A style preference. The sentence is grammatical and understandable, and it follows the spoken «very happy about it». |
| L | L4 | Remove | False positive. «Розпродувати» is a dictionary form (СУМ), interchangeable with «розпродавати». |
| L | L5 | Remove | An elliptical comparison («ніж [цінність] будь-кого»), acceptable in speech-like text. A style preference, not an error. |
| S | S1 | Remove | The capitalization rule covers the personal and possessive pronouns of Shri Mataji's own speech. In a seeker's polite address, only «Ви» is capitalized, and it already is. |
| S | S2 | Remove | The capitalization rule applies to Incarnations. Lowercase «він» for the Spirit is correct, and it sits in a seeker's quoted question. |
| S | S3 | Remove | Not an inconsistency. The translation follows the English: «Realized soul» (paragraph 11, capitalized) and «realized soul(s)» (22, 30, 35, lowercase). The glossary allows both forms. |
| S | S4 | Remove | Faithful to the spoken original. The English itself has «Ramadasa» (16) and «Ramdas Swamy» (17). Unifying them would repair the original, which `glossary/AGENTS.md` forbids. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 41 | «і дав нам усе решту» – gender agreement error with the feminine noun «решта» | «і дав нам усю решту» |

## Summary

- Language (L): 5 issues found, 1 approved by the Critic
- SY Domain (S): 4 issues found, 0 approved by the Critic
- Total corrections applied: 1 (applied to `transcript_uk.txt`, verified: the old wording no longer appears)

Overall assessment: a high-quality, faithful translation. The deity pronouns, glossary terms
and Ukrainian typography (`«»`, ` – `, `’`, `...`) are consistent throughout. The square-bracketed
additions ([такого], [то], [обережними], [зображення], [поїсти], [вона]) are minimal and correctly marked,
and the speaker's spoken roughness is kept rather than repaired.
