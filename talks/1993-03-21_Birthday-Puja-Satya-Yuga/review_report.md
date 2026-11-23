# Language Review – 1993-03-21_Birthday-Puja-Satya-Yuga, 21 March 1993

Birthday Puja (Satya Yuga), New Delhi.
Reviewed file: `transcript_uk.txt` (paragraph numbers = file line numbers; the
body starts at line 6). Reference: `transcript_en.txt`, `glossary/`.

## Process

2+1 review per `templates/language_review_template.md`:
Reviewer L (language) and Reviewer S (SY domain) worked in parallel; the Critic
filtered both tables together and approved only genuine errors. Spoken roughness
(broken sentences, shifted references, translator's `[additions]`) was not
repaired, per `glossary/AGENTS.md`, "Fidelity to the Spoken Original".

Mechanical checks found nothing: no Latin letters inside Cyrillic words,
no straight or typographic `""`/`„“` quotes (only `«»`), no hyphen used as a dash
(only ` – `), all apostrophes U+2019, no double spaces, no space before
punctuation, no invisible characters, and no lowercase Shri Mataji pronouns
(Я/Мені/Мене/Мій/Моя…).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 11 | Plural verb with «хто» (normative singular); inconsistent with «тих, хто прийшов» in the same paragraph | «багато таких, хто були шукачами дуже низького рівня» | «хто був шукачем…» |
| L2 | 12 | Calque «відданість, яку ви маєте» + dative | «та відданість, яку ви маєте Сахаджа Йозі» | «ваша відданість Сахаджа Йозі» |
| L3 | 21 | Case mismatch: genitive demonstrative «цих» with nominative numeral «чотирнадцять» in an existential «було» clause | «в нас було лише цих чотирнадцять сахаджа йоґів» | «в нас було лише ці чотирнадцять сахаджа йоґів» |
| L4 | 28 | «заподіяти» normally takes the accusative («заподіяти шкоду») | «вони можуть заподіяти вам якоїсь шкоди»; «Як вони можуть заподіяти нам шкоди?» | «якусь шкоду» / «шкоду» |
| L5 | 40 | Subject–predicate disagreement: «мають» (3rd pl.) agrees with neither «кожен» (3rd sg.) nor «усі ви» (2nd pl.). The generalising «усі ви» restarts the subject, so it takes a dash and the predicate agrees with it (euphony: «маєте взятися») | «Тож кожен у цьому світі, чи то в праві, чи в будь-якій іншій галузі, усі ви, мають узятися за Сахаджа Йоґу» | «…чи в будь-якій іншій галузі, – усі ви маєте взятися за Сахаджа Йоґу» |
| L6 | 52 | Non-parallel object clauses: a colon introduces a bare clause, then «і що» attaches a conjunctional clause that has nothing to pair with | «одразу знають: тут є щось особливе, і що в них [у вас] є якісь дуже унікальні якості» | «одразу знають, що тут є щось особливе і що в них [у вас] є…» |
| L7 | 58 | «з одного боку… з іншого боку» are parenthetical and should take commas | «Якщо з одного боку ви розслаблені, то з іншого боку ви маєте бути динамічними» | «Якщо, з одного боку, … то, з іншого боку, …» |
| L8 | 46 | Comma after the conjunction «тобто» | «Тобто, уявіть: якщо в Самарканді…» | «Тобто уявіть:» |
| L9 | 61 | Colloquial «від завтра» | «Сатья Юга починається від завтра» | «з завтрашнього дня» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 18 | Glossary/corpus: Kabir → **Кабір** (`terms_lookup.yaml`). The corpus renders Shri Mataji's spoken «Kabira» as nominative «Кабір» in every other talk (1977-11-01, 1979-04-22, 1986-09-07, 1998-05-10, 2000-05-07). In Ukrainian, «Кабіра» reads as the genitive/accusative of Кабір | «вражена більше, ніж сам Кабіра» | «вражена більше, ніж сам Кабір» |
| S2 | 13 | Shri Mataji's emphatic pronoun is lowercase here but capitalised everywhere else in this transcript («Я Сама», para 9; «Сама… Сама», para 54) and in most of the corpus | «Я не могла б зробити це сама.» | «Я не могла б зробити це Сама.» |
| S3 | 30 | «божественності» is lowercase, but «Божественність» is capitalised elsewhere | «провадив своє життя, сповнене гідності й божественності» | «Божественності» |
| S4 | 14, 21, 57 | Address «Мати» vs glossary «Матінко (звертання)» | «Цього разу, Мати, ми…»; «Мати, знаєш…»; «Але, Мати, у нас…» | «Матінко» |
| S5 | 9 | «стільки Шляхів, стільки Налі» looks like a mistranscription in the EN source (Walis/Nabis?) | «стільки святих, стільки Шляхів, стільки Налі» | Re-interpret the terms |
| S6 | 10 | «деват і дев» is lowercase, but the glossary has «Дева» capitalised | «є небагато деват і дев» | «Деват і Дев» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | Plural agreement after «хто» with a plural antecedent («таких») is an accepted variant in Ukrainian, not an error. |
| L | L2 | Remove | Style preference. The phrase is grammatical and the meaning is clear. |
| L | L3 | **Keep** | A real case-agreement error. With numerals of 5+ in the nominative, the demonstrative goes in the nominative («ці п’ять», «усі чотирнадцять»). «Цих чотирнадцять» mixes cases. |
| L | L4 | Remove | Partitive genitive with a perfective verb is acceptable («заподіяти лиха / шкоди»). It is a register choice, not an error. |
| L | L5 | **Keep** | A real agreement error. «мають» agrees with no subject in the sentence. The dash marks the speaker's restart with «усі ви», so the spoken structure is kept (no repair of content). |
| L | L6 | **Keep** | The syntax is genuinely broken in the Ukrainian («і що» has no parallel «що»). The fix keeps both clauses and the translator's «[у вас]» bridge; only the conjunction and punctuation change. |
| L | L7 | Remove | «Side» is used literally here: Shri Mataji continues with «that side is where…» → «саме з того боку». So it is not a parenthetical, and para 11 uses the same unpunctuated pattern. |
| L | L8 | Remove | Trivial. «Тобто» works here as a spoken «I mean». |
| L | L9 | Remove | An acceptable colloquial form that matches the spoken register. |
| S | S1 | **Keep** | Glossary and corpus consistency for a fixed proper name. «Kabira» is the Hindi pronunciation of the same name, not a different name, so the fidelity rule does not apply. The nominative «Кабіра» also reads as an oblique case in Ukrainian. |
| S | S2 | **Keep** | Deity-pronoun consistency for Shri Mataji: 3 capitalised against 1 lowercase in the same transcript. |
| S | S3 | Remove | The English has lowercase «divinity» here, describing the quality of a saint's human life, not the Divine. Lowercase is correct. |
| S | S4 | Remove | Per `terms_context.yaml`, «Матінко» is the address used in prayer. Vocative «Мати» is grammatical and is the dominant corpus form in quoted speech. |
| S | S5 | Remove | Fidelity: the translation renders what the English transcript records. Reinterpreting the words would put the translator's reading into Her mouth. |
| S | S6 | Remove | The glossary «Дева» is a name or title (cf. Дева Вані). The generic plural for classes of celestial beings stays lowercase, as in the EN text and the corpus («девати», «деват»). |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 13 | «Я не могла б зробити це сама.» | «Я не могла б зробити це Сама.» |
| 2 | 18 | «вражена більше, ніж сам Кабіра.» | «вражена більше, ніж сам Кабір.» |
| 3 | 21 | «в нас було лише цих чотирнадцять сахаджа йоґів» | «в нас було лише ці чотирнадцять сахаджа йоґів» |
| 4 | 40 | «чи в будь-якій іншій галузі, усі ви, мають узятися за Сахаджа Йоґу» | «чи в будь-якій іншій галузі, – усі ви маєте взятися за Сахаджа Йоґу» |
| 5 | 52 | «одразу знають: тут є щось особливе, і що в них [у вас] є» | «одразу знають, що тут є щось особливе і що в них [у вас] є» |

## Summary

- Language (L): 9 issues found, 3 approved by Critic
- SY Domain (S): 6 issues found, 2 approved by Critic
- Total corrections applied: 5
