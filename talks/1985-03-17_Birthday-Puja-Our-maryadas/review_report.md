# Language Review – 1985-03-17_Birthday-Puja-Our-maryadas, 2026-09-02

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text, 135 lines) against
`transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml` and
`glossary/terms_context.yaml` using 2 parallel reviewers + 1 critic filter
(`templates/language_review_template.md`).

"Paragraph" below = line number in `transcript_uk.txt`.

Mechanical pre-checks (all clean): no Latin letters inside Cyrillic words, no
`""`/`„"` quotes (only `«»`, nested quotes also `«»`), no ` - `/`—` dashes (only ` – `),
no ASCII apostrophes (only `’`), no `…` or ` ...`, no double spaces or spaces before
punctuation. Header line 4 has the language name in lowercase (`англійська`).
Closing blessing «Нехай Бог благословить вас!» matches the EN «May God bless you!»
(no "all" in the source), so the glossary fixed phrase does not apply.

Corpus cross-checks (all `talks/*/transcript_uk.txt`) were run for the disputed
items: `шакті` (lowercase in 8 generic-power contexts elsewhere), `Муладхара чакрою`
(first component undeclined ×3 elsewhere; same pattern for `Аґія чакру/чакрою`),
`як-от` (hyphenated 154× vs. 1 unhyphenated — this talk), `послушн*` (only this talk;
`слухнян*` used elsewhere), `Сахаджа Йоґ` short form (only this talk), `домінуюч*`
(used in 3 other talks).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 14 | Non-literary (розм.) form «послушний»; same paragraph block already uses «неслухняними» | «ви ніколи не зможете бути послушними» | «ви ніколи не зможете бути слухняними» |
| L2 | 15 | Same as L1 | «тоді ви можете бути послушними» | «тоді ви можете бути слухняними» |
| L3 | 21 | Gender agreement: predicate instrumental must agree with neuter subject «божевілля» | «Але найгіршою з усіх буде божевілля» | «Але найгіршим з усіх буде божевілля» |
| L4 | 26 | Non-existent verb form «скакують»; para 36 uses the correct «вскакують» for the same image | «і раптом вони скакують на коня» | «і раптом вони вскакують на коня» |
| L5 | 27 | і/й alternation: after a vowel use «й» (правопис §23) | «щойно ви ідете в зал» | «щойно ви йдете в зал» |
| L6 | 48 | Дієприслівниковий зворот not set off by commas (comma required after the conjunction and before the dash) | «Тож змагаючись із чоловіками в его – ось що ви зробили» | «Тож, змагаючись із чоловіками в его, – ось що ви зробили» |
| L7 | 51 | Euphony: «із» preferred before «з-» | «Леді з залізним прутом» | «Леді із залізним прутом» |
| L8 | 66 | Particle «як-от» is hyphenated | «(сміх) Як от корови тут виглядають» | «(сміх) Як-от корови тут виглядають» |
| L9 | 82 | Extra comma before a single «і» joining homogeneous predicates (доносить, змушує, не шкодить) | «змушує людину зрозуміти, і нікому не шкодить» | «змушує людину зрозуміти і нікому не шкодить» |
| L10 | 86 | Comma between coordinating «і» and subordinate «якщо» clause (no «то» follows; clause is removable) | «і якщо хочете, я подам у відставку» | «і, якщо хочете, я подам у відставку» |
| L11 | 98 | Comma between «що» and inserted «коли» clause (no «то» follows) | «найважливіше те, що коли ви в Сахасрарі, ви стаєте» | «найважливіше те, що, коли ви в Сахасрарі, ви стаєте» |
| L12 | 100 | Case: genitive required after «стану»; bare «Махайоґ» is nominative | «досягти цього стану Махайоґ.» | «досягти цього стану Махайоґа.» |
| L13 | 119 | Active participle «-уч-» is non-normative in literary Ukrainian | «може бути й дуже домінуючою» | «може бути й дуже домінантною» |
| L14 | 126 | Missing comma before purpose clause «щоб» (placed before the particle «лише» that belongs to the clause) | «усі вони приїхали лише щоб зустрітися зі Мною» | «усі вони приїхали, лише щоб зустрітися зі Мною» |
| L15 | 132 | Clunky attributive genitive «вас тих часів» | «це стосується вас тих часів, коли» | «це стосується вас у ті часи, коли» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 62 | Glossary lists «Shakti → Шакті» (uppercase) | «та, хто дасть усю шакті чоловікам» | «та, хто дасть усю Шакті чоловікам» |
| S2 | 58 | Glossary examples decline both parts («в Муладхарі чакрі») | «за своєю Муладхара чакрою» | «за своєю Муладхарою чакрою» |
| S3 | 74 | Reflexive pronoun for Shri Mataji lowercase; text elsewhere capitalizes it («у Своїй лекції», «за Своєю природою», «про Своїх власних дочок», «Сама») | «якщо Я показую свій гнів» | «якщо Я показую Свій гнів» |
| S4 | 76 | «Сахаджа Йоґ» in Ukrainian is the masculine practitioner noun; the practice is «Сахаджа Йоґа» (glossary: always «Сахаджа Йоґа»; short form used nowhere else in corpus) | «Він розуміє Сахаджа Йоґ!» | «Він розуміє Сахаджа Йоґу!» |
| S5 | 117 | Same as S4 | «що таке Сахаджа Йоґ, що це означає» | «що таке Сахаджа Йоґа, що це означає» |
| S6 | 85 | Pronoun for Shri Mataji lowercase inside Indira Gandhi's order; same paragraph has «Її відкликати», «Вона не п’є» | «і що її треба повернути назад» | «і що Її треба повернути назад» |
| S7 | 86 | Pronoun for Shri Mataji lowercase in the minister's reply, next to «Вона дуже порядна пані» | «знаю цю пані, вона дуже гідна» | «знаю цю пані, Вона дуже гідна» |
| S8 | 86 | Same as S7 | «Ми не повинні її турбувати» | «Ми не повинні Її турбувати» |
| S9 | 124 | «Пані» capitalized as a common noun; same sentence has «такої пані» | «такої досконалої Пані» | «такої досконалої пані» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | СУМ marks «послушний» as розм.; literary form «слухняний» is used in the same paragraph («неслухняними») and across the corpus |
| L | L2 | Keep | Same as L1 |
| L | L3 | Keep | Clear agreement error («божевілля» is neuter) |
| L | L4 | Keep | «скакують» is not a Ukrainian verb form; translator's own «вскакують» (para 36) proves intent |
| L | L5 | Keep | Normative і/й alternation after a vowel; minimal, safe change |
| L | L6 | Keep | Mandatory punctuation of a дієприслівниковий зворот |
| L | L7 | Remove | Euphony preference only; «з залізним» is widely attested and not an error |
| L | L8 | Keep | Orthographic: «як-от» is hyphenated; corpus uses the hyphenated form 154× |
| L | L9 | Keep | Comma before a single «і» between homogeneous members is an error |
| L | L10 | Keep | Rule on adjacent conjunctions applies (clause removable, no «то») |
| L | L11 | Keep | Same rule as L10 |
| L | L12 | Keep | Genitive is grammatically required; corpus «Махайоґ» elsewhere is nominative |
| L | L13 | Remove | Stylistic norm, not an error; the corpus uses «домінуючий» forms in three other talks, so changing here would create inconsistency |
| L | L14 | Keep | Subordinate purpose clause must be comma-separated |
| L | L15 | Remove | Attributive genitive is intelligible and grammatical; rewording is a style preference |
| S | S1 | Remove | Generic sense «power/energy» (source: «give all the shakti to men»); corpus consistently uses lowercase «шакті» in such contexts (8×) |
| S | S2 | Remove | Corpus convention keeps the first component undeclined («Муладхара чакрою» ×3, «Аґія чакру/чакрою»); original is consistent with it |
| S | S3 | Keep | Rule: Shri Mataji pronouns ALWAYS uppercase; internal consistency with «Своїй/Своєю/Своїх/Сама» in this text |
| S | S4 | Keep | Prevents a real misreading («he understands a Sahaja Yogi») and aligns with glossary «Сахаджа Йоґа» |
| S | S5 | Keep | Same as S4 |
| S | S6 | Keep | Rule: Shri Mataji pronouns ALWAYS uppercase; inconsistent within the same paragraph |
| S | S7 | Keep | Same as S6 |
| S | S8 | Keep | Same as S6 |
| S | S9 | Remove | Mirrors the source's deliberate «lady … Lady» capitalization; reverential, not a rule violation |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 14 | «бути послушними» | «бути слухняними» |
| 2 | 15 | «бути послушними» | «бути слухняними» |
| 3 | 21 | «найгіршою з усіх буде божевілля» | «найгіршим з усіх буде божевілля» |
| 4 | 26 | «вони скакують на коня» | «вони вскакують на коня» |
| 5 | 27 | «ви ідете в зал» | «ви йдете в зал» |
| 6 | 48 | «Тож змагаючись із чоловіками в его – ось що» | «Тож, змагаючись із чоловіками в его, – ось що» |
| 7 | 66 | «Як от корови» | «Як-от корови» |
| 8 | 74 | «Я показую свій гнів» | «Я показую Свій гнів» |
| 9 | 76 | «Він розуміє Сахаджа Йоґ!» | «Він розуміє Сахаджа Йоґу!» |
| 10 | 82 | «зрозуміти, і нікому не шкодить» | «зрозуміти і нікому не шкодить» |
| 11 | 85 | «і що її треба повернути назад» | «і що Її треба повернути назад» |
| 12 | 86 | «і якщо хочете, я подам» | «і, якщо хочете, я подам» |
| 13 | 86 | «цю пані, вона дуже гідна» | «цю пані, Вона дуже гідна» |
| 14 | 86 | «не повинні її турбувати» | «не повинні Її турбувати» |
| 15 | 98 | «те, що коли ви в Сахасрарі, ви стаєте» | «те, що, коли ви в Сахасрарі, ви стаєте» |
| 16 | 100 | «стану Махайоґ.» | «стану Махайоґа.» |
| 17 | 117 | «що таке Сахаджа Йоґ, що це означає» | «що таке Сахаджа Йоґа, що це означає» |
| 18 | 126 | «приїхали лише щоб зустрітися» | «приїхали, лише щоб зустрітися» |

All 18 corrections were applied to `transcript_uk.txt` with exact single-match
replacements (verified: 18 new forms present, 0 old forms remaining; file still
135 lines, no BOM, UTF-8).

Verified as correct (no change needed): «Войд» (glossary), «Вішнумайя/Вішнумайї/
Вішнумайю», «бхути/бхут», «Кундаліні», «Сахасрарі», «Ґуру Таттва/Таттві», «Принцип
Ґуру», «Інкарнацію», «Реалізацію», «Пуджа/Пуджі», «Дух/Духа/Дусі», «Мої Стопи» vs.
lowercase «стопах» for ordinary feet, «Мати/Матері/Матінко» for Shri Mataji,
«сахаджа йоґ/йоґи/йоґів/йоґиня/йоґині», «в Сахаджа Йозі», «лівосторонніми»,
«обумовленості», «одержимі», «тамасік/тамасіки», «Шіваджі», «Індіра Ґанді»,
second-person «Ви/Ти» addressed to Shri Mataji capitalized, lowercase «дух» for the
husband's morale (para 70), lowercase «вона» for Indira Gandhi and the diplomat's
wife.

## Summary

- Language (L): 15 issues found, 12 approved by Critic
- SY Domain (S): 9 issues found, 6 approved by Critic
- Total corrections applied: 18
