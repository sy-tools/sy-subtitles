# Language Review – 1979-01-01_Letter-Human-Chitta-has-many-illusions, 2026-07-12 (Fable pass)

## Process

2+1 review (Reviewer L + Reviewer S + Critic) on `transcript_uk.txt`
(Letter translated from Marathi, 1979, THE LIFE ETERNAL). Second pass,
after the 2026-06-01 review (dash style + conjunction comma already
applied). Marathi original checked on amruta.org: the /mr/ page exists
but states "Transcript (Marathi) – NEEDED", so the English translation
remains the only available source. Editorial markers from the source
(e.g. "(??)") are preserved.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7 | Comma before the closing dash of a parenthetical: the comma after «сказала» closes the що-clause before the FIRST dash; no comma belongs before the second | «…Я сказала, – правильне воно чи хибне, – можна встановити…» | «…Я сказала, – правильне воно чи хибне – можна встановити…» |
| L2 | 7 | Invalid rection «навчитися, що…» (навчитися чого / + inf., not a що-clause) | «на власному досвіді навчитеся, що любов та Істина – одне ціле» (EN "learn … that") | «на власному досвіді пізнаєте, що…» |
| L3 | 7 | Reflexive possessive required with 2nd-person subject | «ви усвідомите вашу дуже тонку Брахма Таттву» | «ви усвідомите свою дуже тонку Брахма Таттву» |
| L4 | 7 | Sentence-initial «В» before a consonant (у/в alternation) | «В Сахаджа Йозі вона є силою…» | «У Сахаджа Йозі вона є силою…» |
| L5 | 8 | Politeness capitalization «Ваша» addressing MANY readers (uppercase is for letters to one person); Letter 1 closes lowercase | «Назавжди Ваша, Мати Нірмала» | «Назавжди ваша, Мати Нірмала» |
| L6 | 7 | «Коли вони усунені» → «Коли їх усунено»? | impersonal preference | OK — both forms valid, no change |
| L7 | 7 | «це турбує вашу увагу» — awkward collocation | mirrors awkward EN "disturbs your attention" | OK — mirrors source, no change |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 6 | «з мараті» — minority transliteration; corpus norm «маратхі» (14 vs 3 files), aspirate convention (тх/дх) | «Лист, перекладений з мараті, 1979 р.» | «…з маратхі, 1979 р.» |
| S2 | 7 | Dangling idiom «віддавши своє серце на милість» — «на милість» requires a complement (кому?) and adds meaning absent in EN "surrendering your heart" | «і, віддавши своє серце на милість, звільнитися від ілюзії» | «і, віддавши своє серце, звільнитися від ілюзії» |
| S3 | 7 | Kundalini pronouns «Вона» uppercase | mirrors EN "She"; consistent within the text | OK — no change |
| S4 | 7 | Glossary check: Кундаліні Шакті, Бхаґаваті, Санкальпа, Брахма Таттва, Параматма, Чітта, Джада/Саундар’я Шакті, Брахман | throughout | OK — all match `terms_lookup.yaml`, no change |
| S5 | 7 | «вічно люблячої» — active participle | style preference | OK — established SY usage, no change |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine punctuation rule (no stray comma before the closing dash here). |
| L | L2 | Keep | Genuine rection error; «пізнаєте» is faithful to EN "learn". |
| L | L3 | Keep | Genuine grammar (reflexive possessive). |
| L | L4 | Keep | Genuine у/в orthography at sentence start. |
| L | L5 | Keep | Orthography: uppercase Ви/Ваша only when addressing one person; also aligns with Letter 1. |
| L | L6, L7 | Remove | Preferences / source-mirroring, not errors. |
| S | S1 | Keep | Corpus consistency + transliteration convention. |
| S | S2 | Keep | Dangling idiom adds unsupported meaning; removal restores fidelity. |
| S | S3–S5 | Remove | Confirmations, not corrections. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 6 | «з мараті» | «з маратхі» |
| 2 | 7 | «…чи хибне, – можна…» | «…чи хибне – можна…» |
| 3 | 7 | «навчитеся, що» | «пізнаєте, що» |
| 4 | 7 | «вашу дуже тонку Брахма Таттву» | «свою дуже тонку Брахма Таттву» |
| 5 | 7 | «В Сахаджа Йозі» | «У Сахаджа Йозі» |
| 6 | 7 | «віддавши своє серце на милість» | «віддавши своє серце» |
| 7 | 8 | «Назавжди Ваша» | «Назавжди ваша» |

## Summary

- Language (L): 7 issues found, 5 approved by Critic
- SY Domain (S): 5 issues found, 2 approved by Critic
- Applied to `transcript_uk.txt`: 7 corrections
