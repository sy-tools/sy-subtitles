# Language Review – Sahasrara-Puja-Achieve-Complete-Freedom, 1995-05-07

## Process

Reviewed `transcript_uk.txt` (104 paragraphs) against `transcript_en.txt` using
the 2+1 process from `templates/language_review_template.md`: Reviewer L
(language), Reviewer S (SY domain), then a Critic filter. Paragraph numbers count
non-empty lines, with the date line as ¶1.

Automated checks run before reading:
- Mixed Latin/Cyrillic words: none
- `„“”"` or straight quotes: none; `«»` balanced on every line, nested quotes use `«»`
- Apostrophe: 26 × U+2019, no `'`, `ʼ` or `` ` ``
- Dashes: only ` – ` (U+2013); no ` - ` and no em-dash
- Ellipsis: always `...`, never `…`, four dots or a space before
- Double spaces, space before punctuation, missing space after punctuation, trailing whitespace, NBSP or zero-width characters: none

Overall the translation is of high quality. It stays close to the spoken
original, its translator's additions in `[ ]` are minimal and well placed, and
capitalization and terminology are consistent from start to end.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 72 | Unneeded comma between two same-level subordinate clauses joined by a single «і» (both depend on «думають») | «як вони думають, що вони щось особливе, і що їм треба робити себе особливими» | «як вони думають, що вони щось особливе і що їм треба робити себе особливими» |
| 2 | 101 | «зазвичай» is an adverb that modifies the predicate, not a parenthetical word (вставне слово), so commas cannot set it off mid-clause | «казала речі, яких, зазвичай, не мала б казати» | «казала речі, яких зазвичай не мала б казати» |
| 3 | 18 | Possible gender mismatch: feminine «людину», then masculine «його» / «йому» | «ви сердитеся на цю людину і вбили цю людину – отже, ви насправді врятували його! Йому не доведеться…» | «врятували її! Їй не доведеться…» |
| 4 | 87 | Odd use of the collective noun «листя» with «одне … інше» | «Одне листя з цього боку, інше з того боку» | «Одні листки з цього боку, інші – з того» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 46 | «дух» in lowercase, while the glossary gives Spirit → «Дух» | «Тож ваш дух вільний, і коли ви помираєте…» | «ваш Дух вільний» |
| 2 | 43 | «Реальності» capitalized, but the EN has lowercase «reality» | «для всього, що треба зробити в ім’я Реальності» | «в ім’я реальності» |

Checked by Reviewer S and found correct (no findings):
- **Shri Mataji's pronouns:** uppercase everywhere, including reflexives («Собі», «Свою роботу», «Свого чоловіка», «Свою любов») and inside Her own quoted speech («у Мене немає політики»).
- **People addressing Mother:** «Ти/Тебе/Твоя/Твої Стопи» (¶57, 60, 63, 70, 83, 89) and «Ви/Вам/Ваш» (¶75 the Delhi lady, ¶84 the architect) are uppercase. Mother's replies to people («ваша», «ви любите Мене?», «Що з вами?») are lowercase.
- **Third-person reference:** «Мати покликала мене! … з Нею» (¶71) is uppercase.
- **Terms checked against the glossary:** Сахасрара, Аґія, Парамчайтанья, Реалізація (uppercase) / реалізована душа (lowercase), обумовленості (conditionings), колективність, вібрації, лівосторонні, ашрами, ґуру, сахаджа спосіб.
- **Sahaja Yoga declension:** Сахаджа Йоґи / Йоґу / Йозі, never «Йоґі». Sahaja yogi forms: сахаджа йоґ / йоґа / йоґом / йоґи / йоґів / йоґами, and сахаджа йоґиня.
- **Spiritual terms:** Пуджа / Сахасрара Пуджа / на Сахасрара Пуджі, Стопи, Істина («шукачами Істини»), Царство Боже / Царства Божого, Божественна Любов, Всепроникна Сила, Божества.
- **Closing phrases:** «Нехай Бог благословить усіх вас!» (¶102) follows the glossary's fixed phrase. «Нехай Бог благословить вас!» (¶104) matches «May God bless you!», which has no «all».
- **Lowercase names:** the language name «англійська» and the nationalities («француз», «англійців») are lowercase.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | Real punctuation error. Same-level subordinate clauses joined by one «і» take no comma between them. The text itself does this correctly in ¶13 («що безперечно отримали новий вимір … і що ви відчуваєте»), so the change also restores internal consistency. |
| L | 2 | Keep | Real punctuation error. «зазвичай» is not on the list of parenthetical words, and here it sits mid-clause and directly modifies «не мала б казати». The EN comma marks a spoken pause, but fidelity covers content, not punctuation: the Ukrainian sentence must still be correctly punctuated. The meaning is unchanged. |
| L | 3 | Remove | False positive. The original referent is «хтось» («є хтось, хто завдав вам клопоту»), which is masculine. Masculine agreement with a male referent is acceptable, and it mirrors the spoken «him». |
| L | 4 | Remove | Style preference. «листя» used with «одне … інше» is colloquial but understandable, and it is not a grammatical error. |
| S | 1 | Remove | False positive. The EN has lowercase «spirit», meaning the individual soul that departs at death (compare «душа, яка відходить», ¶45, and «їхні духи», ¶22). It is not the Spirit (Atma) as divine essence. |
| S | 2 | Remove | Not an error. Capitalizing «Реальність» as absolute Reality is a defensible SY convention, and the glossary does not regulate it. Changing it would be a style preference. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 72 | «…що вони щось особливе, і що їм треба робити себе особливими» – unneeded comma before «і» between same-level clauses | «…що вони щось особливе і що їм треба робити себе особливими» |
| 2 | 101 | «яких, зазвичай, не мала б казати» – commas around a non-parenthetical adverb | «яких зазвичай не мала б казати» |

## Summary

- Language (L): 4 issues found, 2 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 2 (both applied to `transcript_uk.txt`)
