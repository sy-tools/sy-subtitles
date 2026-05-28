# Language Review – 1978-10-02_Knots-On-The-Three-Channels, 2026-05-28

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8, 12, 13, 17, 22, 30, 51, 55, 72, 78, 80 | Single-character ellipsis `…` (U+2026) used instead of three dots | «…а все, що поза цим…»; «…приходять до нас… заходьте» | `…` → `...` |
| L2 | 126 | `пів` with indeclinable noun written together | «бо це **півсарі**, а ви продаєте» | `пів сарі` (2019 orthography: пів + noun written separately) |
| L3 | 122 | Redundant doubled `у вас` | «щоб і **у вас** було добро **у вас**, і ви поважали себе» | «щоб і у вас було добро, і ви поважали себе» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 40, 93, 131 | Transliteration: Sanskrit *g* must be `ґ`; genitive of «Сахаджа Йоґа» written with `г` | «розуміння Сахаджа **Йоги**», «настанови Сахаджа **Йоги**», «організації Сахаджа **Йоги**» (para 131 also has «Сахаджа Йоґа» with `ґ` in the same sentence) | Сахаджа **Йоґи** |
| S2 | 20 | Shri Mataji's own first-person pronoun lowercase (mid-sentence narration) | «переступають межу, **я** б сказала, або просто зриваються» | **Я** б сказала |
| S3 | 49 | Shri Mataji's own first-person pronoun lowercase (mid-sentence narration) | «що їх роблять люди, **я** не знаю, що вони там усе роблять» | **Я** не знаю |
| S4 | 73 | Pronoun referring to Shri Mataji lowercase (inside ego-person's quote) | «Ні, я не можу цього стерпіти! Чому **вона** це сказала?» | Чому **Вона** це сказала? |
| S5 | 118 | Shri Mataji's possessive lowercase (Mother addressing «my child») | «Нічого поганого, дитино **моя**, але ти втрачаєш красу ранку.» | дитино **Моя** |
| S6 | 20, 30, 34 | «All-pervading Power» capitalization inconsistent | «всепроникаюча сила» (20) vs «Всепроникаючої Сили» (30), «Всепроникаюче» (34) | (consider Всепроникаюча Сила) |
| S7 | 9, 14, 24, 25, 73, 134 | «істина» lowercase vs glossary rule «Істина – uppercase (absolute Truth)» | «ніж істина», «абсолютна істина», «на істині» | (consider Істина) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Glossary mandates `...` (three dots, no space before); corpus convention confirms it — 18 of 19 other talks use three dots, only 1 uses `…`. Clear deviation from documented standard. |
| L | L2 | **Remove** | «сарі» is indeclinable and «half-sari» functions as a product-concept; the separate-writing rule is borderline here. Low confidence — avoid over-correction. |
| L | L3 | **Remove** | Mirrors the source's own redundancy («have good in you and you respect yourself»); awkward but not ungrammatical — stylistic, not an error. |
| S | S1 | **Keep** | Transliteration rule: Sanskrit *g* → `ґ` (not `г`). Genitive of «Йоґа» keeps `ґ` (no г→з alternation, unlike locative «Йозі»). Para 131 holds both forms in one sentence — a genuine internal inconsistency. |
| S | S2 | **Keep** | Shri Mataji's own first person («I would say»), plain narration, not quoted speech. Rule: Shri Mataji pronouns ALWAYS uppercase. |
| S | S3 | **Keep** | Shri Mataji's own first person («I don't know»), plain narration. Same rule. |
| S | S4 | **Keep** | The pronoun's referent is Shri Mataji; the rule applies even when others speak of Her (cf. para 93 «Матінко, **Ти** забрала…», and the very next sentence «**Вона** сказала нам це»). |
| S | S5 | **Keep** | The Mother's possessive «my child»; para 75 sets the precedent «Дитино **Моя**». Capitalize for rule + consistency. |
| S | S6 | **Remove** | Translation faithfully mirrors the source case: lowercase «all pervading power» in the skeptic's doubt (para 20), capitalized «All-pervading Power» in paras 30/34. Faithful to source — not a clear error. |
| S | S7 | **Remove** | Text is internally consistent (lowercase throughout). Here «truth» is used generically (truth vs. falsehood), while the divine-absolute weight is carried by «Реальність» (consistently capitalized). Mass-capitalization would be over-correction. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 8, 12, 13, 17, 22, 30, 51, 55, 72, 78, 80 | `…` (single-char ellipsis) | `...` (three dots) — 11 instances |
| 2 | 40, 93, 131 | Сахаджа Йоги | Сахаджа Йоґи — 3 instances |
| 3 | 20 | я б сказала | Я б сказала |
| 4 | 49 | я не знаю | Я не знаю |
| 5 | 73 | Чому вона це сказала? | Чому Вона це сказала? |
| 6 | 118 | дитино моя | дитино Моя |

## Summary

- Language (L): 3 issues found, 1 approved by Critic
- SY Domain (S): 7 issues found, 5 approved by Critic
- Total corrections applied: 6 distinct corrections (18 individual replacements: 11 ellipses + 3 «Йоґи» + 4 deity-pronoun fixes)
