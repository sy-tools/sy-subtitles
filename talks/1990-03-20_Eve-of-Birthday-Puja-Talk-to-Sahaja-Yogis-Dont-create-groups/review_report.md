# Language Review – Eve-of-Birthday-Puja-Talk-to-Sahaja-Yogis-Dont-create-groups, 1990-03-20

## Process

`transcript_uk.txt` (155 lines; talk text in paragraphs 6–155) was reviewed against
`transcript_en.txt` by 2 parallel reviewers (L, S) plus 1 Critic filter, following
`templates/language_review_template.md`. Paragraph numbers below are line numbers in
`transcript_uk.txt`, which match `transcript_en.txt` line for line.

Automated sweeps, run before the manual read:
- Latin letters mixed into Cyrillic words: none
- `„"`, `""`, `“”` quotation marks: none (all `«»`)
- Apostrophe: all U+2019 `’` (no `'` or `ʼ`)
- Hyphen or em-dash used as a dash: none (all ` – `)
- `…` character, space before `...`, doubled periods: none
- Double spaces, spaces before punctuation, missing spaces after punctuation, trailing spaces: none
- Hunspell (`site/dict/uk_UA` + `site/dict/words_uk.txt`, via the SPA's vendored Typo.js):
  the only unknown words are proper names and transliterations (Кернс, Ґупта, Хар’яна,
  Шрідхара, відехі, Вайдехі, біріані, Джаґанмата, Sydney suburbs, …). No typos.

Glossary terms checked against `terms_lookup.yaml` / `terms_context.yaml`, all correct:
Сахаджа Йоґа (loc. «в Сахаджа Йозі»), сахаджа йоґ/йоґи, сахаджа/сахадж (both forms allowed),
Парамчайтанья, Аґія, Вішуддхі, бандхан, лівосторонній/правосторонній, Реалізація/Самореалізація,
Мати Земля, Раджа Джанака, Шрі Ґанеша (gen. Ґанеші), День Сахасрари, Ґанапатіпуле,
Джай / кі Джай, Боло. Пуджа is capitalized throughout. Language names are lowercase («гінді»).
Shri Mataji's pronouns (Я/Мені/Мене/Мій/Моя/Себе/Своє/Вона/Її/Нею/Вам/Ваш) are
capitalized in every instance. Lowercase я/мій/моя appear only in quoted speech of yogis,
Nachiketa, Janaka and the child.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Verb government: intransitive «страждати» cannot take «нічого» as a direct object | «І вам також не треба нічого страждати.» | «І вам також не треба ні через що страждати.» |
| L2 | 17 | Pronoun/adjective gender disagrees with the antecedent «людина» (fem.), which appears in the sentences before and after | «…з тією людиною щось не так. Якщо він не може бути колективним, щось не так. Така людина має сісти…» | «Якщо вона не може бути колективною, щось не так.» |
| L3 | 35 | Pronoun gender switches mid-reference: «людини… їй» then «йому… він» in the next sentence | «…з людини, яка егоїстична, їй це може не сподобатися. Але покажіть йому шпильку, він зрозуміє…» | «Але покажіть їй шпильку, вона зрозуміє…» |
| L4 | 59 | Calque of «as it is» | «Тепер для цього – як і є, ви заплатили трохи грошей…» | «…– і так ви заплатили…» |
| L5 | 24 | Imperative form: «очистьтеся / Очистьте» vs «очистіться / Очистіть» | «З’ясуйте це й просто очистьтеся. Очистьте себе!» | «очистіться… Очистіть себе!» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 39 | Incarnation pronoun lowercase. Raja Janaka is capitalized as an Incarnation everywhere else in paras 39–43 (Він/Йому/Нього/Своєму/Ти/Твій); this «he said» is His | «…Гаразд, ми подивимося щодо цього», – сказав він.» | «– сказав Він.» |
| S2 | 39 | Janaka's first-person pronouns lowercase in His own speech | «Проси в мене все; я можу дати тобі…» | «в Мене… Я можу…» |
| S3 | 39 | Case inconsistency within the paragraph: «самореалізованим» vs «Самореалізацію» | «Я хочу стати самореалізованим… але не Самореалізацію» | Unify the case |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | A real grammatical error. «Страждати» is intransitive, so «не треба нічого страждати» is ungrammatical Ukrainian. The spoken roughness («suffer also anything») stays in meaning and structure; only the government is repaired. Fidelity rule: content stays, but the Ukrainian sentence must be correct. |
| L | L2 | Keep | The English «person… he» is normal English. The mismatch exists only in the Ukrainian, where the antecedent «людина» is feminine, so this is agreement, not a repair of the original. «Людина» sits on both sides of the sentence, which makes the mismatch jarring. |
| L | L3 | Keep | Same reasoning as L2. In adjacent sentences, «людини… їй» clashes with «йому… він». Aligning to the antecedent removes an internal inconsistency the translation introduced. |
| L | L4 | Remove | The phrase is understandable in context. It is a translation-style preference, not an orthographic or grammatical error. |
| L | L5 | Remove | Not an error. The project's hunspell dictionary accepts «очистьте/очистьтеся», and both forms are attested in this corpus and in usage. |
| S | S1 | Keep | The rule for individual Incarnations (singular) requires uppercase. The translator already applies it to Janaka consistently, and this lone «він» is an outlier. The English transcript's own capitalization of Janaka is inconsistent, so it is no guide here. |
| S | S2 | Remove | The capitalization rule covers third-person forms (Він/Його/Йому). No rule mandates capitalizing an Incarnation's first person inside a quote, and the English has lowercase «me». Not an error. |
| S | S3 | Remove | The glossary explicitly allows both «Самореалізація» and «самореалізація». The adjective in lowercase is the normal convention. Not an error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | «не треба нічого страждати» (wrong verb government) | «не треба ні через що страждати» |
| 2 | 17 | «Якщо він не може бути колективним» (gender disagreement with «людина») | «Якщо вона не може бути колективною» |
| 3 | 35 | «Але покажіть йому шпильку, він зрозуміє» (gender disagreement with «людини… їй») | «Але покажіть їй шпильку, вона зрозуміє» |
| 4 | 39 | «– сказав він.» (Incarnation pronoun lowercase) | «– сказав Він.» |

## Summary

- Language (L): 5 issues found, 3 approved by Critic
- SY Domain (S): 3 issues found, 1 approved by Critic
- Total corrections applied: 4

Overall, the translation is clean. Orthography, punctuation, quotation marks, dashes,
apostrophes, glossary terminology and Shri Mataji's pronoun capitalization are consistent
throughout. The translator's square-bracket additions ([про те], [їх], [це], [ваші проблеми],
[є], [вона], [людей], [де], [який], [якщо]/[Якщо], [В], [Макг’ю]) follow the fidelity rules and were left intact.
