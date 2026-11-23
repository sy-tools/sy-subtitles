# Language Review – 1985-05-19_Shri-Ganesha-Puja-You-Should-be-Prepared-to-Change, 19 May 1985

Shri Ganesha Puja, Rome Ashram (Nirmala House), Italy.
Reviewed file: `transcript_uk.txt` (191 lines), against `transcript_en.txt`,
`glossary/AGENTS.md`, `glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.
"Paragraph" below is the line number in `transcript_uk.txt`.

## Process

Reviewer L (language) and Reviewer S (SY domain) each went through the whole
transcript. The Critic then filtered both tables, and the approved corrections
were applied to `transcript_uk.txt`.

Automated checks run over the whole file, all clean:
- No Latin letters inside Cyrillic words. The only Latin token is `T.S.A.` (l. 84), the maker's mark quoted from the card, as in the English.
- Quotes are only `«»`, 40 opening and 40 closing, balanced on every line. No `„"`, `""` or ASCII `'`. All 41 apostrophes are U+2019.
- Dashes are only en-dash ` – ` (71×). No em-dash, and no hyphen used as a dash.
- No double spaces, no space before `, . ; : ! ?`, no `…` character. Ellipses are `...`.
- No lowercase pronoun refers to Shri Mataji. Every lowercase `я/мені/мій/свій…` belongs to a Sahaja Yogi, to Jeremy, or to people quoted by Her (l. 111, 130, 168).
- Every SY term is capitalized: Пуджа/Пуджі/Пудж, Дух, Дхарма, Інкарнація, Стопи (5×), Хаван, Кундаліні. Ґ is used throughout: Ґанеша, Ґуру, Аґія, манґалсутра. There is no `Ганеш*`, `Гуру` or `Агія`.
- Language names are lowercase: англійська, іспанською, маратхі, гінді.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 55 | Paragraph ends with a comma, and the next paragraph opens with a capital («Спершу…»): broken sentence punctuation | «…давайте візьмемо трохи води для омивання,» | «…для омивання.» |
| L2 | 69 | Space before the ellipsis | «Подивімося. Сильно. ...» | «Сильно...» |
| L3 | 101 | Wrong collocation, a calque of "telling the example": in Ukrainian a приклад is *наведений*, not *розповіданий* | «Як Я вчора розповідала йому приклад про одну-єдину Ґуру Пуджу» | «Як Я вчора наводила йому приклад…» |
| L4 | 111 | Calque of "take an incarnation". Ukrainian says *приймати* втілення/Інкарнацію, which is also the corpus form («прийняти Інкарнацію» 3×, «прийняти втілення» 2×) | «Бо коли ви берете Інкарнацію» | «Бо коли ви приймаєте Інкарнацію» |
| L5 | 111 | Loose concessive construction «Хай хто…» | «Хай хто дасть їм будь-що, вони скажуть» | «Хоч би хто що їм дав, вони скажуть» |
| L6 | 125 | Russianism «говорити на [мові]» (cf. рос. «говорить на хинди»). Ukrainian uses «говорити гінді / мовою гінді», which is also the corpus norm (15× vs 1×, this one) and the form this file uses itself («мовою маратхі», l. 140) | «[Шрі Матаджі говорить на гінді]» | «[Шрі Матаджі говорить гінді]» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 47 vs 13–14 | Ritambhara Pragnya's pronouns are capitalized in l. 13–14 but lowercase in l. 47 | l. 13 «Рітамбхара Праг’я, Яка є силою Махалакшмі… як Вона допомагає вам»; l. 47 «Рітамбхари Праг’ї, яка дуже тонка… речами, які вона розігрує» | Capitalize l. 47: «Яка… Вона» |
| S2 | 106 vs 101 | "Deities" capitalized in one paragraph and lowercase in the next | l. 101 «ці Божества цілковито єдині з вами»; l. 106 «А божества в ньому прорахувалися» | «А Божества в ньому…» |
| S3 | 46 | The glossary entry is `Deva → Дева` (capitalized), but the text has lowercase «деви» | «ґани надіслали це девам тут… ви деви, а вони ґани» | «Девам… ви Деви» |
| S4 | 24 | The glossary entry is `Stotra → стотра`, but the text has «стотрам» | «слід читати стотрам [гімн] Ґанеші» | «стотру» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | A Ukrainian sentence cannot end on a comma and then continue in a new paragraph with a capital letter. The English comma here is transcriber punctuation, not something that was spoken, so the fidelity rule does not protect it. A period is the minimal fix. |
| L | L2 | Remove | This is the corpus's established way to render a trailing `. ….` pause or cut-off: the same `Word. ...` pattern appears 10× across talks, and it mirrors EN «Hard. ….». It is a separate pause marker after a complete sentence, not an ellipsis attached to a word. «Сильно...» would also drop the sentence's own period. |
| L | L3 | **Keep** | This is a lexical norm, not a matter of taste: «приклад» collocates with «наводити». «Розповідати» takes narrative objects (історію, випадок, про щось), so «розповідала приклад» is a calque. Changing the verb only is enough. The meaning is unchanged. |
| L | L4 | **Keep** | «Брати Інкарнацію» is a word-for-word calque. The Ukrainian collocation, and the form used elsewhere in the corpus, is «приймати Інкарнацію». Only the verb changes, the meaning stays the same, and the capitalization of Інкарнація stays as it is (correct per `AGENTS.md`). |
| L | L5 | Remove | Colloquial but intelligible Ukrainian («хай хто» = будь-хто), and it renders a loose spoken sentence ("Anybody giving them anything…"). The rewrite is a stylistic preference, not a grammatical repair. |
| L | L6 | **Keep** | «Говорити на + мова» is a recognized Russianism (Антоненко-Давидович, «Як ми говоримо»). The normative Ukrainian form is the one used throughout the corpus and in this file at l. 140. |
| S | S1 | Remove | Ritambhara Pragnya is a power (of Mahalakshmi), not Shri Mataji or an individual Incarnation, so the pronoun rules in `AGENTS.md` do not mandate either case. Each passage follows its source: l. 13–14 have "She… Herself", l. 47 has "which is very subtle… it plays". Capitalizing l. 47 would make the translation more emphatic than the original at that point. |
| S | S2 | Remove | No glossary rule covers «божество». For chakra deities residing in people, the corpus mostly uses lowercase («божества», 26×; e.g. «у кожній чакрі є божество»). The English itself capitalizes "Deities" only in l. 101 and writes "deities in him" in l. 106. Each line follows its source. |
| S | S3 | Remove | Here "devas" means the Italian Sahaja Yogis («ви деви»), set in parallel with «ґани», which the glossary itself gives in lowercase (`Ganas → ґани`). The glossary's «Дева» entry is the name in mantras, not this common noun. |
| S | S4 | Remove | Shri Mataji said "stotram". The transliteration keeps the spoken form, and the glossary itself admits both forms elsewhere (`Kavach / Kavacham`). The bracketed gloss «[гімн]» already explains it. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 55 | «…трохи води для омивання,» (paragraph ending with a comma) | «…трохи води для омивання.» |
| 2 | 101 | «Як Я вчора розповідала йому приклад» | «Як Я вчора наводила йому приклад» |
| 3 | 111 | «Бо коли ви берете Інкарнацію» | «Бо коли ви приймаєте Інкарнацію» |
| 4 | 125 | «[Шрі Матаджі говорить на гінді]» | «[Шрі Матаджі говорить гінді]» |

## Notes (verified correct, no change)

- **Glossary terms.** All match `terms_lookup.yaml`:
  - Рітамбхара Праг’я, inflected Праг’ї / Праг’єю
  - Махакалі, Махалакшмі, Кундаліні, Аґія, Сур’я, Омкара, Сахасрара, Муладхара
  - Ґанеша Таттва, бхути, ґани, мар’яди, Кубера, Аді Шакті, Хаван, Ґуру Пуджа
  - колективність, Дух, вібрації
  - віддача на милість (surrender)
  - сахаджа йоґ / йоґиня / йоґи
  - «Нехай Бог благословить усіх вас» (fixed form)
- **Ґанеша declension** follows `terms_context.yaml`: Ґанеші (gen./dat./loc.), Ґанешу (acc.).
- **Deity pronouns are capitalized:**
  - Shri Ganesha: Він/Його/Йому/Який/Свій
  - Mahakali: Яка/Їй
  - Kundalini and Mother Earth: Вона
  - Rama and Kubera: Він/Який
- **Shri Mataji is always capitalized**, including Guido's «у Своїй спальні» (l. 94) and the addresses «Вашої Пуджі», «Вам» (l. 154, 165).
- **The original's roughness is kept as spoken:**
  - «спускатися [підійматися] вгору» (l. 16)
  - «Він – Володар, Він – Володар» (l. 8)
  - «прив’язані до них? Давайте використовувати це» (l. 44)
  - the broken-off sentences in l. 10, 64, 105, 162
  - translator's additions in brackets, e.g. «[дар] вашого брата», «[колективу]», «[парасолька від сонця]»
- **Other items checked and found correct:**
  - The vocatives Анно and Мачіндранатху.
  - Ґреґуар, which is the dominant spelling in the corpus (108×).
  - The forms «зі Мною» and «вийшла цілком промокла», both acceptable Ukrainian.

## Summary

- Language (L): 6 issues found, 4 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: 4
