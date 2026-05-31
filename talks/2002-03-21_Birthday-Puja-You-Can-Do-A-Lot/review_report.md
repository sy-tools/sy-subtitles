# Language Review – 2002-03-21_Birthday-Puja-You-Can-Do-A-Lot, 2026-05-31

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, the glossary (`terms_lookup.yaml`,
`terms_context.yaml`), and the orthography rules in `glossary/CLAUDE.md`.

The translation is of high quality overall: quotation marks are consistently
`«»` (20 balanced pairs, no `„"`/`""`), apostrophes are all `’` (U+2019, no
straight `'`), no Latin characters are mixed into the Cyrillic, the
Самореалізація/Реалізація distinction tracks the English Self-Realisation/
Realisation, `сахаджа йоґ(и)` is correctly lowercase, deity declensions and the
locative `Сахаджа Йозі` are correct. Findings below are therefore narrow.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | All (¶6,7,8,13,18,21,25,29,36,39,42,44,45,46,48,53,54,55,57,58,60,61,65,66,68,71,72,76,77,86,90) | Wrong dash glyph: em-dash `—` (U+2014) used for interjections | `Що це — любов`, `Ви — сахаджа йоґ`, `вбивство — вбий цього` … (51 occurrences) | Replace with project-standard en-dash ` – ` (U+2013) per `glossary/CLAUDE.md` |
| L2 | 7 | Ellipsis as single glyph `…` (U+2026) instead of three dots | `…в нашій країні… Дивлячись на неї` | `...` (three dots, no space before) per `glossary/CLAUDE.md` |
| L3 | 50 | Pronoun/gender agreement: antecedent `одна людина` (fem.) referred to by masc. `його` | `лише одна людина була реалізованою душею; тож його закидали камінням` | (candidate) `її закидали` — to agree with `людина` |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 90 | Deity-pronoun over-capitalization: the introspective `I` is the generic Sahaja Yogi (the listener), not Shri Mataji, so the first person must be lowercase | `«Що Я зробив зі свого життя як сахаджа йоґ?»` (EN: "What have I done out of my life as Sahaja Yogi?") | `«Що я зробив …»` |
| S2 | 2 (title) | Common noun `Дня` capitalized mid-title | `Пуджа Дня народження: Ви можете зробити багато` | (candidate) `Пуджа дня народження…` |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Real orthographic non-conformance. `glossary/CLAUDE.md` mandates en-dash `–` (U+2013) for interjections; the project standard is overwhelming (75 corpus files use en-dash vs 9 with em-dash). Objective rule, not style. |
| L | L2 | **Keep** | Real. `glossary/CLAUDE.md` requires `...` (three literal dots); the precomposed `…` glyph is non-conformant. |
| L | L3 | **Remove** | False positive. `людина` is grammatically feminine but the referent is a specific male prophet figure; узгодження за змістом (sense-agreement with masc. `його`, mirroring EN "him") is defensible and changing to `її` would obscure the male referent. |
| S | S1 | **Keep** | Real terminology/capitalization error. Uppercase `Я` is reserved for Shri Mataji; here the quoted "I" is the listener's self-introspection ("What have I done…as Sahaja Yogi"), so it must be lowercase `я`. |
| S | S2 | **Remove** | Out of scope / trivial. The corpus is itself inconsistent for "Birthday Puja" (`Пуджа Дня народження`, `Пуджа на День народження`, `Пуджа з нагоди Дня народження`, `Пуджа на День Народження`); title styling is conventional, not a body-translation error. Title left unchanged to avoid scope-creep. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | All (51×) | Em-dash `—` (U+2014) for interjections | En-dash ` – ` (U+2013) |
| 2 | 7 | `…` (U+2026) | `...` |
| 3 | 90 | `«Що Я зробив …»` (generic yogi, not Shri Mataji) | `«Що я зробив …»` |

## Summary

- Language (L): 3 issues found, 2 approved by Critic
- SY Domain (S): 2 issues found, 1 approved by Critic
- Total corrections applied: 3 (covering 53 character-level changes — 51 dashes + 1 ellipsis + 1 pronoun)
