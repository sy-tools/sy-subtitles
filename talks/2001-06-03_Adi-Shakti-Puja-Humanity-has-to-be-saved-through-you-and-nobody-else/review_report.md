# Language Review – 2001-06-03_Adi-Shakti-Puja-Humanity-has-to-be-saved-through-you-and-nobody-else, 2026-06-06

## Process

2+1 agent review of `transcript_uk.txt` against `transcript_en.txt`, the glossary
(`terms_lookup.yaml`, `terms_context.yaml`), and the capitalization / orthography
rules in `glossary/CLAUDE.md`. Reviewers L (Language) and S (SY Domain) ran in
parallel; the Critic filtered both tables, removing false positives and accepted
variants; approved corrections were applied.

Character-level checks were grounded in the corpus (86 existing
`transcript_uk.txt` files) and the convention files, to distinguish genuine
deviations from accepted variants.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (55×) | Wrong dash glyph: em-dash `—` (U+2014) used throughout; project convention and `glossary/CLAUDE.md` mandate en-dash `–` (U+2013) with spaces. Corpus uses U+2013 in 91% of dashes (7425 vs 710); convention files use U+2013 exclusively. This file is 100% em-dash, 0% en-dash. | `…цей цілісний всесвіт — всесвіти за всесвітами.` | `…цей цілісний всесвіт – всесвіти за всесвітами.` |
| L2 | 3 | Place name hyphenation `Кабелла-Лігуре` | `Кампус, Кабелла-Лігуре (Італія)` | (candidate) `Кабелла Лігуре` |
| L3 | 20 | Number agreement `більшість із них не знали` | `більшість із них не знали про Кундаліні` | (candidate) `більшість із них не знала` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 22 | Shri Mataji's first-person pronoun `я` written lowercase. Per `glossary/CLAUDE.md`, the speaker's `Я` is ALWAYS uppercase. (Only lowercase standalone `я` in the file.) | `…з будь-якою співчутливою людиною, я думаю, –` | `…з будь-якою співчутливою людиною, Я думаю, –` |
| S2 | 20 | `Дао`/`Дзен` capitalized, but para 17 has them lowercase (`люди дао`, `люди дзен`). Internal inconsistency; Ukrainian convention lowercases these teachings. | `ті люди — люди Дао та Дзен` | `ті люди – люди дао та дзен` |
| S3 | 13 | Adjective `Духовного` over-capitalized. Glossary capitalizes only the noun `Дух`; corpus lowercases the adjective `духовний` in 187 of ~192 mid-sentence cases. | `…вашого Духовного пробудження…` | `…вашого духовного пробудження…` |
| S4 | 45 | Same adjective rule: `Духовний працівник`. | `…ви — Духовний працівник, ви не соціальний працівник.` | `…ви – духовний працівник, ви не соціальний працівник.` |
| S5 | 25 | `Квантова теорія` over-capitalized. A scientific term, not a spiritual proper name; lowercase in Ukrainian orthography. | `…що Квантова теорія, про яку зараз говорять учені…` | `…що квантова теорія, про яку зараз говорять учені…` |
| S6 | 32 | `Страшним Судом` — both words capitalized | `…гри, яку ми називаємо Страшним Судом.` | (candidate) `Страшним судом` |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Documented convention (`glossary/CLAUDE.md`: "En-dash: `–` (U+2013) with spaces"; template lists it as a check). Corpus is 91% en-dash; this file is 0%. Genuine orthography conformance, not style preference. |
| L | L2 | Remove | Corpus is split (`Кабелла-Лігуре` 9 × vs `Кабелла Лігуре` 7 ×). No dominant standard → accepted variant, not an error. |
| L | L3 | Remove | `більшість + із них` legitimately licenses plural predicate agreement in Ukrainian; not an error. |
| S | S1 | **Keep** | Unambiguous deity-pronoun rule. `я думаю` = Shri Mataji speaking ("I think"). Must be `Я`. |
| S | S2 | **Keep** | Real internal inconsistency vs para 17; lowercase is the correct and consistent form. |
| S | S3 | **Keep** | Glossary capitalizes the noun `Дух` only; adjective norm is lowercase (corpus 187:~5). |
| S | S4 | **Keep** | Same rule as S3; applied consistently. |
| S | S5 | **Keep** | `квантова теорія` is a common-noun phrase in Ukrainian; EN emphasis caps don't carry over. |
| S | S6 | Remove | Corpus uses both `Страшний Суд`/`Страшним Судом` and `Страшний суд`/`Страшного суду`. Accepted variant in the sacred register → not flagged. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (55×) | em-dash `—` (U+2014) | en-dash `–` (U+2013), spaces preserved |
| 2 | 22 | `я думаю` (Shri Mataji) | `Я думаю` |
| 3 | 20 | `люди Дао та Дзен` | `люди дао та дзен` |
| 4 | 13 | `Духовного пробудження` | `духовного пробудження` |
| 5 | 45 | `Духовний працівник` | `духовний працівник` |
| 6 | 25 | `Квантова теорія` | `квантова теорія` |

## Summary

- Language (L): 3 issues found, 1 approved by Critic (systematic, 55 occurrences)
- SY Domain (S): 6 issues found, 5 approved by Critic
- Total corrections applied: 6 distinct fixes (60 substitutions: 55 dash glyphs + 5 capitalization/terminology)

### Notes (verified correct — no change)

- Deity / Shri Mataji pronouns (`Я`, `Мене`, `Мені`, `Моя`, `Мій`, `Вона`, `Її`,
  `Він`/`Його` for Shiva & Ganesha) — all correctly capitalized; plural Incarnations
  `вони всі` (para 33) correctly lowercase.
- Lowercase `мною`/`моїм`/`моєю` in para 40 are inside followers' quoted speech
  (regular people) — correctly lowercase.
- Spiritual nouns `Пуджа`, `Самореалізація`/`Реалізація`, `Істина`, `Інкарнація`,
  `Дух`/`Духа`, `Творіння`, `Божественне` — correctly capitalized.
- Language names `англійська`, `українська` — correctly lowercase.
- Glossary terms (`Аді Шакті`, `Кундаліні`, `Шрі Ґанеша`, `Садашіва`, `Шіви`,
  `Шрі Махадеви`, `Сахаджа Йоґа` + cases, `сахаджа йоґ`/`йоґи`/`йоґів`/`йоґам`/
  `йоґами`) — consistent and correct; `Йоґ` always written with `ґ`.
- Apostrophe is U+2019 throughout; quotation marks are `«»` (U+00AB/U+00BB) at all
  levels; no Latin characters mixed into Cyrillic words; no double spaces, no
  stray spacing before punctuation.
