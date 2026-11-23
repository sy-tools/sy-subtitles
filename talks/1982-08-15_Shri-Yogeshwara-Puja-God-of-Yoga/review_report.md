# Language Review – Shri-Yogeshwara-Puja-God-of-Yoga, 1982-08-15

## Process

Reviewed `transcript_uk.txt` (67 lines: a header plus 62 text paragraphs) line by line
against `transcript_en.txt`. The two files are aligned line for line, so a
paragraph number below is the same line number in both files. The process
followed `templates/language_review_template.md`: Reviewer L and Reviewer S
worked in parallel, then the Critic filtered their findings.

Automated checks run over the full text:
- Latin characters mixed into Cyrillic: none
- Quotation marks other than `«»` (`"`, `„`, `“`, `”`): none; `«»` balanced on every line
- Apostrophes: all U+2019 `’`; no `'`, `ʼ` or backtick
- Dashes: all ` – ` (U+2013) with spaces; no hyphen-as-dash, no `—`
- Double spaces, space before punctuation, missing space after punctuation: none
- Ellipsis: one `…` on paragraph 48. It mirrors the `…` gap marker on the same line of the EN transcript and is left as is.
- Glossary spellings (Йоґа/Йоґешвара/Аґія/Ґанеша/ґани/ґуру with ґ, Вішуддхі, Сахасрара, Кундаліні, Муладхара, Путна, Ямуна, Сударшана, бхут, ракшаси, Брахмадева, Радха, Арджуна): consistent
- Pronouns for Shri Mataji (Я/Мені/Мій/Своїх…): uppercase throughout
- Pronouns for Shri Krishna, Shri Rama, Lord Jesus Christ, Brahmadeva: uppercase. Pronouns for the guru, Freud, Yashoda and Putana: lowercase. Plural "incarnations" (вони/їх): lowercase.
- Closing line: «Нехай Бог благословить вас.» matches EN "May God bless you." (no "all" in the original)

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 37 | Missing dash between a noun subject and a noun predicate with no linking verb. The parallel clause in the same sentence has the dash. | «Оскільки Моє ім’я Нірмала, оскільки Моє ім’я – чистота» | «Оскільки Моє ім’я – Нірмала, оскільки Моє ім’я – чистота» |
| L2 | 55 | Agreement error: «решта» is a feminine noun, so «все решта» is ungrammatical (a calque of «всё остальное») | «відбори, номінації, вибори і все решта» | «відбори, номінації, вибори і все інше» |
| L3 | 22 | Possible calque: «у цьому відношенні» | «ваш ідеал у цьому відношенні – Шрі Крішна» | «ваш ідеал щодо цього – Шрі Крішна» |
| L4 | 57 | Verb forms not parallel: gerund «вишукуючи», then infinitive «відкидати» | «вишукуючи: о, це те, ось цей, той, а потім відкидати» | «…а потім відкидаючи» |
| L5 | 47 | «по» + accusative for purpose; «за» + instrumental may be preferred | «ідіть по сертифікат до бхута» | «ідіть за сертифікатом до бхута» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 11 | Інкарнація (Divine Incarnation) must be uppercase. Every other occurrence in this transcript is uppercase («Він – Інкарнація», «Лише Інкарнації», «Він був Інкарнацією»). | «І саме це Він виявив у Своїй власній інкарнації.» | «…у Своїй власній Інкарнації.» |
| S2 | 19 | Inconsistent capitalization of the relative pronoun for Shri Krishna within one sentence: «який … Який … Який». The transcript otherwise uses uppercase for relative pronouns that refer to the Deity («Йоґешвара, Який усе зробить», «цар, Який завжди поруч»). | «чоловік, який є Шрі Крішна, Який є «Йоґешвара», тобто Який ніколи…» | «чоловік, Який є Шрі Крішна, Який є «Йоґешвара», тобто Який ніколи…» |
| S3 | 63 | Glossary gives «Вірата». The text has «до Вірата» / «це Вірат», which follow the Virat stem. | «ви не зможете дістатися до Вірата. А Йоґешвара – це Вірат.» | «…до Вірати. А Йоґешвара – це Вірата.» |
| S4 | 11 | Істина should be uppercase for absolute Truth | «У санскриті є лише істина або неістина, сатья або асатья, немає десяти слів для істини.» | «Істина … Істини» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Ukrainian punctuation rule: a dash goes between a subject and a predicate that are both nouns in the nominative with no linking verb. The second, parallel clause of the same sentence already has it («Моє ім’я – чистота»), so the first clause is inconsistent. |
| L | L2 | Keep | Real grammatical error. «Решта» is a feminine noun, so the only correct forms are «уся решта» or «все інше». «Все решта» is a non-normative calque. |
| L | L3 | Remove | «В цьому відношенні» is attested in СУМ («в усіх відношеннях»). Replacing it is a style preference, not a correction. |
| L | L4 | Remove | The infinitive can be read as governed by «не ходімо» (purpose: "let us not go … to discard"). The sentence also deliberately mirrors the broken-off spoken list "…this one, that one, then discard". The Ukrainian is admissible, so per the fidelity rule it is not repaired. |
| L | L5 | Remove | «Піти по + знахідний» meaning "go to fetch" is normative per СУМ («піти по воду»). This is a style preference. |
| S | S1 | Keep | Explicit AGENTS.md rule (Інкарнація uppercase for a Divine Incarnation). Krishna's own incarnation is meant, and the lowercase form is the only exception in the transcript. |
| S | S2 | Keep | Same referent (Shri Krishna) in the same sentence with mixed case. Uppercase follows the deity-pronoun rule and the transcript's own convention for relative pronouns that refer to the Deity. |
| S | S3 | Remove | The EN transcript itself switches from "Virata" to "Virat" here, and the translation mirrors the spoken form: «Вірата» for Virata, «Вірат» (gen. «Вірата») for Virat. The corpus has a precedent (1993-10-10 Virata and Viratangana Puja: «Вірат – це найвище»). This is fidelity to what was spoken, not a glossary error. |
| S | S4 | Remove | Here "truth" and "untruth" are discussed as words of the Sanskrit lexicon («немає десяти слів для істини»), not as the absolute Truth. The sentences that do mean the absolute Truth («Дух – єдина Істина в нас») are already uppercase. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 11 | «у Своїй власній інкарнації» – lowercase Інкарнація | «у Своїй власній Інкарнації» |
| 2 | 19 | «чоловік, який є Шрі Крішна» – lowercase pronoun for the Deity, inconsistent with «Який» later in the sentence | «чоловік, Який є Шрі Крішна» |
| 3 | 37 | «Моє ім’я Нірмала» – missing dash between noun subject and noun predicate | «Моє ім’я – Нірмала» |
| 4 | 55 | «і все решта» – agreement error | «і все інше» |

## Summary

- Language (L): 5 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 2 approved by Critic
- Total corrections applied: 4

Overall the translation is of high quality. It is faithful to the spoken original: anacolutha, shifting references and repetitions are kept, and translator additions are marked in square brackets («[такими]», «[Брахмадева]», «[її]», «[з цього]»). Terminology is consistent with the glossary, and deity-pronoun capitalization is applied carefully. The remaining issues were isolated slips.
