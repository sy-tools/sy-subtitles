# Language Review – 1979-01-01_Letter, 2026-05-30

## Process

2+1 review (Reviewer L + Reviewer S + Critic) on `transcript_uk.txt`
(Letter translated from Marathi, London 1979).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | Em-dash U+2014 (`—`) used instead of project-mandated en-dash U+2013 (`–`) with spaces (3 occurrences) | `Я хочу, — щоб`; `забажаєте — те`; `багатство — усе` | Replace `—` → `–`, keep surrounding spaces |
| L2 | 8 | Apostrophe character check | `з’явиться`, `пам’ятаючи` | OK — uses U+2019 `’` (correct), no change |
| L3 | 8 | Quotation marks | none present in source | OK — no quotes needed, no change |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 8 | Inconsistent rendering of "lamp": `лампу` once vs `світильник` 3× | `Першу лампу буде запалено` vs `багато світильників`, `цей світильник` | `Першу лампу` → `Перший світильник` (gender-agree; `буде запалено` impersonal stays) |
| S2 | 8 | `Уся Природа` — capitalization of природа | EN "Whole Nature" (capitalized) | Proposed: lowercase `природа` |
| S3 | 8 | Deity pronouns (Shri Mataji): `Я`, `Мого`, `Моє`, `Мої`, `Мені`, `Своє` | throughout | OK — all correctly uppercase, no change |
| S4 | 8 | Glossary terms: Сахаджа Йоґа, Наваратрі, Сатья Юга, Калі Юга, Брахма Шакті, Брахман, Дівалі, Чітта; locative `Сахаджа Йозі`; `мараті` (lowercase) | throughout | OK — all match glossary, no change |
| S5 | 9 | `Мати` (Mother = Shri Mataji) capitalized | `ваша розлучена з вами Мати, Нірмала` | OK — correct per glossary, no change |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Clear violation of `glossary/CLAUDE.md`: en-dash U+2013 with spaces is mandated; file used U+2014. |
| L | L2 | Remove | False positive — apostrophe already U+2019. |
| L | L3 | Remove | False positive — no quotes in source. |
| S | S1 | Keep | Genuine consistency error; `світильник` is the majority (3×) and contextually correct term for the Diwali oil-lamp; `лампа` (electric-lamp connotation) is the outlier. |
| S | S2 | Remove | Source deliberately personifies/capitalizes "Nature" in a sacred register; mirroring that capitalization is a defensible translator choice, not an error. Trivial style preference. |
| S | S3 | Remove | False positive — pronouns correct. |
| S | S4 | Remove | False positive — terminology correct. |
| S | S5 | Remove | False positive — correct. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 8 | Em-dash U+2014 instead of en-dash U+2013 (×3) | `—` → `–` (spaces preserved) |
| 2 | 8 | "lamp" rendered inconsistently | `Першу лампу буде запалено того дня.` → `Перший світильник буде запалено того дня.` |

## Summary

- Language (L): 3 issues raised, 1 approved by Critic
- SY Domain (S): 5 issues raised, 1 approved by Critic
- Total corrections applied: 2 (3 em-dash replacements + 1 lexical-consistency fix)
