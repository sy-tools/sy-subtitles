# Language Review – 1995-02-19_Arrival-Talk, 2026-05-29

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel
reviewers (L – Language, S – SY Domain) + 1 Critic filter, per
`templates/language_review_template.md`.

The translation is of high quality. Pronoun capitalization for Shri Mataji
(Я/Мене/Мені/Мою/Моїх; Вона/Її/Неї/Ви/Ваші/Вам/Пані in C.P.'s speech) is correct
throughout; every lowercase pronoun correctly refers to the audience, third
parties, generic nouns, Sahaja Yoga (feminine noun), or C.P. himself. Apostrophes
(all U+2019), quotation marks (all «»), and ellipses (all `...`, no space before)
are clean. No double spaces, no spaces before punctuation, no Latin/Cyrillic
mixing (the only Latin runs — «A», «B+», ICSC — are intentional grade letters and
an exam acronym).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | All (6–28) | Em-dash U+2014 (`—`) used for spaced interjection dashes instead of project-standard en-dash U+2013 (`–`). 60 instances. | `…дуже рада вас бачити — те, що…` | Replace all ` — ` with ` – ` (U+2013, spaces preserved) |
| L2 | 8 | Clipped phrasing "а не так чоловіки" for "not by men so much" | `…мають дбати жінки, саме жінки, а не так чоловіки.` | (consider) "а не так уже й чоловіки" |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 10, 12 | "махайоґ/махайоґами/махайоґів" lowercase vs glossary lemma "Махайоґ" (capital) | `Багато людей стали махайоґами` | (consider) capitalize "Махайоґ" |
| S2 | 19 | "ідеальної Матері" uppercase while "дружини"/"бабусі" lowercase | `…роль ідеальної дружини, ідеальної Матері та ідеальної бабусі…` | (consider) unify capitalization |
| S3 | 28 | "Вібрації" capitalized | `Її Вібрації та ваші вібрації` | (consider) lowercase per glossary `vibrations → вібрації` |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine, well-grounded error. `glossary/CLAUDE.md` mandates "En-dash: ` – ` (U+2013) with spaces for interjections." Corpus confirms: 3393 en-dashes vs 130 em-dashes; 31 of 36 talks use en-dash exclusively. This talk is an outlier. All 60 are spaced both sides, so a clean U+2014→U+2013 swap is safe. |
| L | L2 | Remove | Style preference, not an error. The Ukrainian is intelligible and mirrors the disfluent English source ("not by men so much"). Not a clear grammatical fault. |
| S | S1 | Remove | False positive. The glossary capital "Махайоґ" is the citation form; here the word is a generic common noun for self-proclaimed (false) "mahayogis", lowercase in the English source and consistent with `сахаджа йоґ` (also lowercase as a common noun). Lowercase usage is consistent across the whole text. |
| S | S2 | Remove | False positive. Capitalization faithfully follows the English source, which reveres only "Mother" (the Divine Mother) while leaving the ordinary roles "wife"/"grandmother" lowercase. Internally consistent with `Мати` elsewhere (e.g. para 10). |
| S | S3 | Remove | False positive. Intentional and source-faithful: English distinguishes "Her Vibrations" (Shri Mataji's, capitalized) from "your vibrations" (lowercase); the Ukrainian preserves this deliberate contrast. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | All (6–28) | Em-dash U+2014 (`—`) instead of en-dash U+2013 (`–`) for spaced interjection dashes (60 instances) | Replaced every ` — ` with ` – ` |

## Summary

- Language (L): 2 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 1 systematic fix (60 dash occurrences: U+2014 → U+2013)
