# Language Review – 1979-01-01_Letter-Human-Chitta-has-many-illusions, 2026-06-01

## Process

2+1 review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt` against
`transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and
`glossary/terms_context.yaml`.

The source is a short letter (1979, translated from Marathi). The Ukrainian
translation is accurate and faithful; terminology and capitalization are
already strong. The main genuine defect is inconsistent dash style.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7 | Mixed dash style — em-dash `—` (U+2014) used 7×, en-dash `–` (U+2013) used once. Project mandates ` – ` (U+2013) with spaces. | `Кундаліні — це…`, `Шакті — це…`, `сказала, — … — можна`, `Істина — одне`, `Всесвіті — в`, `Бхаґаваті — силою` | Replace all `—` with ` – ` (U+2013, spaces both sides) |
| L2 | 7 | Possibly non-normative passive participle | `Коли вони усунені` | `усунуті` (candidate) |
| L3 | 7 | Missing comma at conjunction collision (сурядний `і` + підрядний `хоча`, no correlative `то`) | `праведність, і хоча Вона є Матір’ю` | `праведність, і, хоча Вона є Матір’ю` |
| L4 | 9 | Euphony preference at sentence start before consonant | `В Сахаджа Йозі` | `У Сахаджа Йозі` (candidate) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 7 | Possible Spirit-pronoun capitalization | `Вібрації… линуть від Духа, бо його світло сяє` | `Його` (candidate) |
| S2 | 7 | Plural-deity capitalization | `Навіть Боги не зрозуміли їх` | `боги` (candidate) |

Terminology spot-check (all correct, no change needed): Чітта, Кундаліні,
Шакті, Бхаґаваті, Санкальпа, Брахма Таттва / Брахма / Брахма Шакті, Джада Шакті,
Саундар’я Шакті, Параматма, Дух, Істина, Сахаджа Йоґа (locative `Сахаджа Йозі` —
correct ґ→з alternation), `Парам-йозі` (consistent). Language names lowercase
(`англійська`, `українська`, `мараті`). Apostrophes use `’` (U+2019).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine. `glossary/CLAUDE.md` and the review template both mandate ` – ` (U+2013). The text mixes U+2014 (×7) with U+2013 (×1); template explicitly flags "mixed dashes within the same transcript". Normalising removes the inconsistency. |
| L | L2 | Remove | Both `усунутий` and `усунений` are attested in real Ukrainian usage (cf. `усунений з посади`); not a clear-cut error. Leave the translator's form. |
| L | L3 | **Keep** | Збіг сполучників rule: when a coordinating `і` is immediately followed by a subordinate `хоча` and no correlative `то` follows the subordinate clause, a comma is placed after `і`. The translator already applies this pattern correctly later in the same paragraph (`і, віддавши своє серце на милість,`), so the fix also restores internal consistency. |
| L | L4 | Remove | Trivial euphony preference. `В` after a vowel-final pause is acceptable; meaning is unaffected. Not an error. |
| S | S1 | Remove | The English original uses lowercase "its"; pronoun-for-Spirit is outside the mandated capitalization scope (`glossary/CLAUDE.md` lists only Shri Mataji + Incarnations for pronoun caps). `Дух` as a noun is already correctly capitalized. Keep `його` lowercase to avoid over-capitalization. |
| S | S2 | Remove | Plural deities. Capitalization mirrors the source ("Gods") and the SY cosmological register (devas); no internal-consistency conflict. Acceptable as-is. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 7 | Em-dash `—` (U+2014) ×7, inconsistent with the en-dash convention | All `—` → ` – ` (U+2013, spaces both sides) |
| 2 | 7 | Missing comma at `і` + `хоча` conjunction collision | `і, хоча Вона є Матір’ю` |

## Summary

- Language (L): 4 issues found, 2 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 2 (correction #1 normalises 7 dash occurrences)
