# Language Review – 10th Day of Navaratri, Depth and Content, 1989-10-08

Reviewed file: `transcript_uk.txt` (34 body paragraphs, lines 6–39).
"Paragraph" below means the line number in `transcript_uk.txt`.

Mechanical checks run before the manual pass:
- No Latin characters and no mixed Latin/Cyrillic words.
- No straight quotes, `„“”`, U+2014 em-dashes, hyphen-as-dash, `…` characters, double spaces or spaces before punctuation.
- `«»` balanced: 29 opening and 29 closing; the nested quote in line 27 is correctly `«…«…»»`.
- Apostrophe is U+2019 everywhere.
- Hunspell (`site/dict/uk_UA` + `words_uk.txt`) flags only transliterated SY terms (Бхавасаґарою, Кайлашу, анахата, дакша, спанда, раґи, хому) and the correct imperative «їздіть». No spelling errors.
- Every past-tense verb Shri Mataji uses about Herself is feminine (назвала, виявила, ступала, казала, читала, сказала).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 16 | Extra comma before the dash. «але воно це робить» is a coordinate clause, so no subordinate clause or insertion needs closing. The closing comment «Я так думаю» is set off by the dash alone, and `, –` marks the same boundary twice | «Я цього не роблю, але воно це робить, – Я так думаю.» | «Я цього не роблю, але воно це робить – Я так думаю.» |
| L2 | 31 | Tense shift inside one sentence: present «моляться / проводять», then past «сиділа» | «Вони моляться, вони проводять Пуджу, вони проводять якусь хому, Хаван, і Богиня сиділа…» | «Вони молилися, проводили Пуджу, проводили якусь хому, Хаван, і Богиня сиділа…» |
| L3 | 23 | False start marked with a comma, where an ellipsis would be usual | «Це, вони могли б сказати: «Наш уряд такий, він...»» | «Це... вони могли б сказати: …» |
| L4 | 14 | Comma before the closing dash of an insertion | «А тоді сонце – можна сказати, що це Дух, – випаровує воду.» | «…що це Дух – випаровує воду.» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 27 | Pronoun for Adi Shankaracharya is capitalised mid-sentence, but the glossary lists him under saints and sages, not Incarnations | «Аді Шанкарачар’я усвідомив це, і тому Він відмовився від думки писати…» | «…і тому він відмовився…» |
| S2 | 15 | «Серце» is capitalised here but lowercase everywhere else in the talk | «між вашим Серцем і вашою Бхавасаґарою» | «між вашим серцем…» |
| S3 | 31 | Capitalised «Хаван» sits next to lowercase «хому» in the same list | «вони проводять якусь хому, Хаван» | «хому, хаван» |

Terminology checked against `terms_lookup.yaml` / `terms_context.yaml` with no deviation found:
- Деві Пуджа, Кундаліні, Аді Шакті, Садашіва, реалізовані душі, реалізація
- сахаджа йоґ / йоґи / йоґа, Сахаджа Йоґа / Йозі
- Дух, мар’яди / мар’яд, Бхавасаґара, Кайлаш, шраддга (glossary form, matches the corpus)
- ракшаси, Хаван, Аді Шанкарачар’я, Калі / Дурґа / Махалакшмі / Сарасваті Шакті
- Мати Земля, «віддача на милість» (surrender), обумовленості (conditionings), сходження (ascent), его, Стопи (gen. «Стоп Божественного»), Пуджа, Царство Боже
- «санскритом» (lowercase language name)

Deity pronouns are all correct:
- Shri Mataji: Я / Мене / Мені / Мій / Своїм / Ти / Ви throughout. All lowercase «я» occur only inside quoted speech of other people.
- Kundalini, Devi and the Goddess: Вона / Їй / Своїм / Собою.
- Generic gods, people and the ocean: lowercase.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine double-marking. In Ukrainian, `, –` is used only when the structure itself needs a comma: closing a subordinate clause, closing an apposition, a comma required at the end of a dash insertion, or direct speech followed by the author's words. Here there is only a boundary between coordinate clauses and the closing comment «Я так думаю», so one mark (the dash, which carries the speaker's pause) is enough. Minimal fix: drop the comma. |
| L | L2 | Remove | Faithful to the speaker's vivid historical present (EN: "They are praying… so the Goddess would sit down"). It is acceptable in transcribed oral narrative, and the rewrite would be a stylistic normalisation, not an error fix. |
| L | L3 | Remove | Mirrors the EN false start ("This is the, they could have said…"). How to punctuate an anacoluthon is a style choice, not a codified error. |
| L | L4 | Remove | False positive. The comma closes the subordinate clause «що це Дух» inside the dash insertion. This `, –` sequence is the combination this corpus's reviews consistently accept (cf. «Але те, що Я сказала, – …»). |
| S | S1 | Remove | The EN source deliberately capitalises "He" for Adi Shankaracharya, as a mark of Shri Mataji's reverence. The corpus is not uniform: 1982-09-26 Durga Puja also capitalises his pronoun after an EN "He". No clear rule is broken, so the source capitalisation is kept. |
| S | S2 | Remove | The EN capitalises "Heart" only here, where it is paired with Bhavasagara as a subtle-system centre. The other occurrences are the ordinary heart, so the distinction carries meaning. |
| S | S3 | Remove | False positive. «Хаван» is exactly the glossary form (`Havana / Havan → Хаван`). «хома» is not a glossary term, and the lowercase generic is fine. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 16 | «але воно це робить, – Я так думаю.» (extra comma before the dash) | «але воно це робить – Я так думаю.» |

## Summary

- Language (L): 4 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 1

The translation is of high quality:
- Terminology matches the glossary and the corpus.
- Shri Mataji's pronouns are capitalised and feminine without exception.
- Quotation marks, dashes, apostrophes and ellipses follow the house style.
- The one remaining defect was a redundant comma, now corrected in `transcript_uk.txt`.
