# Language Review – 1979-01-01_Letter, 2026-09-02 (Fable pass)

## Process

2+1 review (Reviewer L + Reviewer S + Critic) on `transcript_uk.txt`
(Letter translated from Marathi, London 1979). Third pass, after the
2026-05-30 review (em-dash + «світильник») and the 2026-07-12 review
(«Хай чого ви забажаєте» → «Усе, чого ви забажаєте», «мараті» → «маратхі»),
both already applied. Source of truth remains the English text on
amruta.org (no Marathi version of this post exists).

Byte-level checks run on the whole file: apostrophe (only U+2019),
dash (only U+2013 with spaces; the single «-» is in «по-різному»),
no U+2014, no Latin letters, no straight/German quotes, no double
spaces, no space before punctuation, no trailing whitespace, no BOM.
Corpus consistency checked for the header lines, the salutation, the
signature and every SY term against the other 97 talks.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | Tense mix «Я зайнята … й не могла написати» | mirrors EN "I am busy … and could not write" | OK — mirrors source, no change |
| L2 | 8 | No comma before the last «і нехай» in the chain «нехай …, нехай …, нехай … і нехай …» | «Мої благословення такі: нехай цей світильник …, нехай його радість …, нехай радісні вигуки … лунають у всіх країнах і нехай ця сила Брахмана …» | OK — the four clauses share the generalizing element «Мої благословення такі:», so the single «і» takes no comma (Правопис §118); no change |
| L3 | 8 | Comma + dash «Усе, чого Я хочу, – щоб …» | subordinate clause closed by comma, then predicate dash | OK — correct «кома і тире» sequence; no change |
| L4 | 8 | Euphony «й/і/у/в» throughout («любові й прекрасні», «роботою й не могла», «розум і багатство», «лунають у всіх», «Тут, у Лондоні») | throughout | OK — all alternations correct; no change |
| L5 | 9 | «ваша розлучена з вами Мати» — possible "divorced" reading | EN "Your separated Mother" | OK — standard literary usage for separation, accepted in the 2026-07-12 pass; no change |
| L6 | 1 | Date header «1 січня 1979» without «року» (sibling letter has «1979 року») | header line | OK — corpus majority is the bare year (90 of 98 talks); no change |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 8, 9 | Deity pronouns (Shri Mataji): Я / Мого / Моє / Мої / Мені / Своє uppercase; «Мати» uppercase in the signature | throughout | OK — no change |
| S2 | 7 | «сахаджа йоґи» lowercase in the salutation | «Мої дорогі сахаджа йоґи,» | OK — common noun per `terms_context.yaml`; matches corpus («усі сахаджа йоґи»); no change |
| S3 | 8 | Glossary check: Сахаджа Йоґа, locative «на Сахаджа Йозі», Наваратрі, Сатья Юга/Юги, Калі Югу/Юги, Брахма Шакті, Брахмана, Дівалі, Чітту, вібраціями, увага | throughout | OK — all match `terms_lookup.yaml`; declensions match corpus usage («у цю Калі Югу», «паросток Сатья Юги», «свою Чітту»); no change |
| S4 | 4, 6 | Language names lowercase: «англійська», «українська», «маратхі» | header + intro line | OK — no change |
| S5 | 8 | «Уся Природа» capitalized | EN "Whole Nature" (capitalized) | OK — mirrors source; Divine Nature personified; no change |
| S6 | 8 | «Бога» uppercase, «всесвіту» lowercase | «роботою Бога», «молекулу всесвіту» | OK — EN "God's work", lowercase "universe"; no change |
| S7 | 8 | «світильник», «просвітлене/просвітлена» | "lamp", "enlightened" | OK — consistent with the 2026-05-30 fix and the corpus; no change |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | False positive — the source has the same tense shift. |
| L | L2 | Remove | Not an error — clauses share a generalizing element; comma-free «і» is correct. |
| L | L3 | Remove | Confirmation — punctuation is correct. |
| L | L4 | Remove | Confirmation — euphony is correct. |
| L | L5 | Remove | False positive — standard literary usage, already accepted. |
| L | L6 | Remove | Not an error — matches corpus majority; sibling letter is the outlier. |
| S | S1–S7 | Remove | Confirmations, not corrections. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| — | — | none | — |

## Summary

- Language (L): 6 issues examined, 0 approved by Critic
- SY Domain (S): 7 issues examined, 0 approved by Critic
- Total corrections applied: 0 — `transcript_uk.txt` is unchanged; the
  text is clean after the two earlier passes.
