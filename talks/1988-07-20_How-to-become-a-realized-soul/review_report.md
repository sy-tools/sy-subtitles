# Language Review – 1988-07-20_How-to-become-a-realized-soul, 20 July 1988

## Process

2+1 agent language review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`. Special characters and corpus conventions were
verified programmatically (84 transcripts) before deciding each finding.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (84×) | Em-dash U+2014 (`—`) used throughout instead of the project standard en-dash U+2013 (` – `) | glossary/CLAUDE.md: "En-dash: ` – ` (U+2013) with spaces"; template: "Em-dash with spaces (` – `)"; corpus uses en-dash 7333× vs em-dash 739× | Replace all `—` → `–` (spaces already present) |
| L2 | 33, 40, 64, 90, 100 (5×) | Unicode ellipsis `…` (U+2026) instead of `...` (three dots) | glossary/CLAUDE.md: "Ellipsis: `...` (three dots, no space before)"; reviewed corpus: 51 files use `...` vs 13 files `…` | `…` → `...` |
| L3 | 90 | Double terminal punctuation `…. ` (ellipsis + period) | «Реалізації…. оплески» | «Реалізації... оплески» |
| L4 | 47 | Sentence-initial lowercase after terminal period (new independent sentence) | «…дуже могутні.» → «нехай вони поставлять кілька запитань.» | «Нехай вони поставлять кілька запитань.» |
| L5 | 75 | Sentence-initial lowercase after terminal period (new independent sentence) | «…чим є тантрик.» → «вони знають, як зіпсувати ваші інструменти…» | «Вони знають, як зіпсувати ваші інструменти…» |
| L6 | 12 | Euphony: `із здобуттям` vs `зі здобуттям` | «вітаю вас із здобуттям вашої Незалежності» | (proposed `зі`) |
| L7 | 15 | Active participle calque `всепронизуючу` | «Його всепронизуючу силу навколо нас» | (proposed `всепроникну`) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 87 | Term inconsistency: `Сахаджа Йоги` (г) breaks the `Сахаджа Йоґ-` (ґ) spelling used 6× elsewhere in this text (L21, 28, 37, 52) and glossary "Сахаджа Йоґа" | «насолоджуватися Істиною після Сахаджа Йоги» | «…після Сахаджа Йоґи» |
| S2 | 14 | Deity pronoun: Kundalini / Primordial Mother referred to with lowercase `вона`; Kundalini's pronouns are uppercase elsewhere (L31, 36, 58, 71) | «ця Первинна Мати відображена… Коли вона пробуджується» | «Коли Вона пробуджується» |
| S3 | 70 | Deity capitalization + inconsistency with L36: Kundalini-as-Mother written lowercase `мати, ваша мати` whereas L36 has `Мати, ваша власна Мати` | «Кундаліні – це Первинна Всемогутня, ваша власна індивідуальна мати, ваша мати» | «…ваша власна індивідуальна Мати, ваша Мати» (physical-mother `мати` in next clause kept lowercase) |
| S4 | 19 | `Радість` capitalized mid-sentence (Joy) — considered | «а Радість не має двоїстості» | (no change) |
| S5 | 29/52/53 | Hatha/Raja yoga casing varies (`Хатха Йога` / `хатха… раджа йога`) | dialogue | (no change) |
| S6 | 28,29,37,52,53,73 | Generic `йога/йоги` spelled with `г` not `ґ` | «види йоги», «кожна йога», «тантра-йоги» | (no change) |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Documented standard in glossary *and* template; corpus is overwhelmingly en-dash (7333 vs 739, concentrated in 9 files). Genuine systematic deviation. |
| L | L2 | **Keep** | glossary/CLAUDE.md explicitly prescribes `...`; plurality of reviewed talks use it (51 vs 13 files). |
| L | L3 | **Keep** | `…. ` is genuine double terminal punctuation regardless of ellipsis style. |
| L | L4 | **Keep** | L46 ends with a period; L47 is a grammatically independent sentence → must be capitalised. (Distinct from continuations L61/L86 which are mid-sentence.) |
| L | L5 | **Keep** | L74 ends with a period; L75 is a new independent sentence → capitalise. |
| L | L6 | **Remove** | False positive. Both forms are valid; corpus prefers `із з…` (20) over `зі з…` (12). Original is acceptable. |
| L | L7 | **Remove** | False positive. `всепронизуюч-` is attested in the corpus (9×) as an accepted SY-text form; not an error, only a style preference. |
| S | S1 | **Keep** | Clear internal inconsistency (1 of 7 Sahaja-Yoga tokens) against glossary + corpus (705 ґ vs 67 г). |
| S | S2 | **Keep** | Refers to the Primordial Mother/Kundalini (subject of preceding sentence); deity pronoun → uppercase, consistent with the rest of the text. |
| S | S3 | **Keep** | Same referent and phrasing as L36 (which capitalises); deity-as-Mother convention. The following physical-mother reference stays lowercase. |
| S | S4 | **Remove** | Mirrors the source's deliberate capitalisation of "the Joy" as an absolute; defensible, not an error. Not in the mandated spiritual-term list. |
| S | S5 | **Remove** | Mirrors the casual casing of the English source within dialogue; glossary itself lists "Хатха Йога" (г). Trivial. |
| S | S6 | **Remove** | Defensible distinction: branded term `Сахаджа Йоґа` (ґ) vs the naturalised common noun `йога` (г, standard Ukrainian); glossary lists "Хатха Йога" with г. Not an error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (84×) | em-dash `—` → en-dash `–` | global replace |
| 2 | 33,40,64,90,100 (5×) | ellipsis `…` → `...` | global replace |
| 3 | 90 | `…. ` double punctuation | `Реалізації... оплески` |
| 4 | 47 | lowercase sentence start | `Нехай вони поставлять…` |
| 5 | 75 | lowercase sentence start | `Вони знають, як зіпсувати…` |
| 6 | 87 | `Сахаджа Йоги` → `Сахаджа Йоґи` (term consistency) | applied |
| 7 | 14 | `Коли вона` → `Коли Вона` (Kundalini pronoun) | applied |
| 8 | 70 | `індивідуальна мати, ваша мати` → `…Мати, ваша Мати` (Kundalini-as-Mother) | applied |

## Summary

- Language (L): 7 issues found, 5 approved by Critic (2 removed as false positives)
- SY Domain (S): 6 issues found, 3 approved by Critic (3 removed as mirroring-source / defensible)
- Total corrections applied: 8 (2 systematic global replacements covering 89 character occurrences + 6 targeted edits)
