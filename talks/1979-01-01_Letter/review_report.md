# Language Review – 1979-01-01_Letter, 2026-07-12 (Fable pass)

## Process

2+1 review (Reviewer L + Reviewer S + Critic) on `transcript_uk.txt`
(Letter translated from Marathi, London 1979). Second pass, after the
2026-05-30 review (em-dash + «світильник» fixes already applied).
Marathi original checked on amruta.org: no Marathi version of this post
exists (hreflang: en/it/pl/tr only), so the English translation remains
the only available source.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | Broken concessive construction: «Хай чого ви забажаєте» mixes the fixed marker «хай що» with the genitive rection of «забажати» | «Хай чого ви забажаєте – те й станеться.» (EN: "Whatever you desire will happen.") | «Усе, чого ви забажаєте, станеться.» |
| L2 | 8 | Tense mix «Я зайнята … й не могла написати» | mirrors EN "I am busy … and could not write" | OK — mirrors source, no change |
| L3 | 9 | «розлучена з вами Мати» — possible "divorced" reading | EN "Your separated Mother" | OK — «розлучений з кимось» is standard literary usage for separation; no change |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 6 | «з мараті» — minority transliteration; corpus norm is «маратхі» (14 files vs 3), consistent with the aspirate convention (тх/дх) | «Лист, перекладений з мараті.» | «Лист, перекладений з маратхі.» |
| S2 | 8 | Glossary check: Кундаліні, Наваратрі, Сатья Юга, Калі Юга, Брахма Шакті, Брахман, Дівалі, Чітта, locative «Сахаджа Йозі» | throughout | OK — all match `terms_lookup.yaml`, no change |
| S3 | 8 | Deity pronouns (Shri Mataji): Я/Мого/Моє/Мої/Мені/Своє uppercase | throughout | OK — no change |
| S4 | 8 | «Уся Природа» capitalized | EN "Whole Nature" (capitalized) | OK — mirrors source, no change |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine grammar error: «хай чого» is not a valid concessive; replacement is faithful to EN. |
| L | L2 | Remove | False positive — the source has the same tense shift. |
| L | L3 | Remove | False positive — standard literary usage. |
| S | S1 | Keep | Corpus consistency + Mantra-Book aspirate transliteration convention. |
| S | S2–S4 | Remove | Confirmations, not corrections. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 8 | «Хай чого ви забажаєте – те й станеться.» | «Усе, чого ви забажаєте, станеться.» |
| 2 | 6 | «з мараті» | «з маратхі» |

## Summary

- Language (L): 3 issues found, 1 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Applied to `transcript_uk.txt`: 2 corrections
