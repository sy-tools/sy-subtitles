# Language Review – England-has-to-become-Jerusalem, 22 June 1982

## Process

2+1 review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt` against the
English original, `glossary/CLAUDE.md` language rules, and the glossary term
dictionaries.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (185×) | Wrong dash glyph: em-dash `—` (U+2014) used throughout instead of mandated en-dash `–` (U+2013) | `…трохи раніше — Г'янешвара` | Replace every ` — ` with ` – ` (keep surrounding spaces) |
| L2 | 51 | Mixed Latin/Cyrillic: Latin `á` (U+00E1) inside a Cyrillic word | `Малá, вона зовсім маленька` | `Мала, вона зовсім маленька` |
| L3 | 10 | Possible non-standard imperative form | `Краще ви відповідьте мені` | (→ відповідайте?) — flagged |
| L4 | 50 | Number agreement: plural verbs for singular antecedent (horse/dog) | `вони просто пройдуть… наче ведуть парад` | (→ воно пройде… наче веде?) — flagged |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 72 | Lowercase pronoun for an individual Incarnation (Christ/Mahavishnu); capitalized everywhere else in this passage | `…що це був він — Махавішну` | `…що це був Він — Махавішну` |
| S2 | 72 | Same — lowercase pronoun for Christ/Mahavishnu | `І він збирається вбрати наші карми` | `І Він збирається вбрати наші карми` |
| S3 | 76 | Lowercase pronouns for Mohammed Sahib (Incarnation/Primordial Master); same paragraph uses capitalized `Він` ×3 | `…досі його не прийняли… щодня його розпинають` | `…досі Його не прийняли… щодня Його розпинають` |
| S4 | 21–22 | Lowercase pronouns for Kundalini (`вона/її`) vs uppercase `Вона/Її` elsewhere | `Але вона ще не проявилася… її називають` | (capitalize for consistency?) — flagged |
| S5 | 33 | Short form `Сахадж Йозі` vs dominant `Сахаджа Йоґ-` elsewhere | `…зрілості в Сахадж Йозі` | (→ Сахаджа Йозі?) — flagged |
| S6 | 77 | Capital in mocking title `«пану Христу»` vs lowercase `«христа»` (77, 79) | `скажіть цьому «пану Христу»` | (lowercase?) — flagged |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | `glossary/CLAUDE.md` mandates en-dash `–` (U+2013); all 15 sampled corpus talks use it, this file is the sole outlier with U+2014. Systematic orthographic error. |
| L | L2 | **Keep** | Latin `á` mixed into Cyrillic — unambiguous error. Confirmed via codepoint scan (U+00E1). |
| L | L3 | Remove | `відповідьте` is a plausible (if uncommon) perfective imperative; correcting risks introducing an error. Not confidently wrong. |
| L | L4 | Remove | Faithful to the source ("it will just walk like a king, as if it's leading a parade"); the EN itself mixes number. Stylistic, not an error. |
| S | S1 | **Keep** | Christ/Mahavishnu is an individual Incarnation — capitalized in 68–74 (`Він`, `Його`). Lowercase here is an inconsistency. |
| S | S2 | **Keep** | Same referent/rule as S1. |
| S | S3 | **Keep** | Mohammed Sahib capitalized (`Він` ×3) in the very same paragraph; lowercase object pronouns are inconsistent. Per rule, `Його` uppercase for Incarnations. |
| S | S4 | Remove | Defensible: the pronoun grammatically agrees with the common noun `сила` *before* the power is named/personified as the Mother; capitalization correctly begins once it becomes `Кундаліні`/`Вона`. Internally logical, not an error. |
| S | S5 | Remove | The EN reads "in **Sahaj Yog**" (short form) precisely here; the translation faithfully mirrors it. Glossary states сахаджа/сахадж are interchangeable, "за оригіналом". |
| S | S6 | Remove | Defensible distinction: `«пан Христос»` is a mock proper title (cf. EN "Mr Christ"), while generic `«христос»` stays lowercase. Consistent with the EN. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (185×) | em-dash `—` instead of en-dash `–` | ` — ` → ` – ` throughout |
| 2 | 51 | Latin `á` in `Малá` | `Мала` |
| 3 | 72 | lowercase `він` (Christ/Mahavishnu) | `Він` |
| 4 | 72 | lowercase `він` (Christ/Mahavishnu) | `Він` |
| 5 | 76 | lowercase `його` ×2 (Mohammed Sahib) | `Його` ×2 |

## Summary

- Language (L): 4 issues found, 2 approved by Critic
- SY Domain (S): 6 issues found, 3 approved by Critic
- Total corrections applied: 5 findings (188 individual replacements: 185 dashes + 1 Latin char + 4 pronoun capitals across 3 findings)
