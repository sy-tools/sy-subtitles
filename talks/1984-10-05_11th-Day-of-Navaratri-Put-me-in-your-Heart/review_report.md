# Language Review – 1984-10-05_11th-Day-of-Navaratri-Put-me-in-your-Heart, 2026-09-21

## Process

Reviewed `transcript_uk.txt` (112 lines, one paragraph per line; paragraph numbers
below are file line numbers) against `transcript_en.txt`, `glossary/CLAUDE.md`,
`glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`, using the 2+1
scheme from `templates/language_review_template.md`: Reviewer L (language) and
Reviewer S (SY domain) in parallel, then the Critic filter, then application.

Mechanical pre-scan (clean): no Latin letters inside Cyrillic words, no `„"`/`""`
quotes, no U+2014 em-dash or hyphen-as-dash, no double spaces or space before
punctuation, no `…` or ` ...`, apostrophe is U+2019 throughout, no Russian
letters. Nested quotes use `«»` at every level (paras 32, 46).

Deity-pronoun audit (clean): every first-person pronoun in Shri Mataji’s speech
(paras 27–112) is capitalised (Я/Мене/Мені/Мною/Моє/Мої/Себе/Своїх); lowercase
`я/мене/мій` occurs only inside quoted speech of yogis, the journalist, the
relative and the closing prayer; `Вона/Її/Їй/Неї` are capitalised wherever they
refer to Shri Mataji and lowercase where they refer to dedication, the
Kundalini, Ruth, the Polish woman, a country or "that person". Shri Ganesha and
Christ take `Він/Його/Йому`. `Ви/Вас/Ваші/Ти/Твої/Свої` addressed to Mother are
capitalised. Language names are lowercase (англійська, італійська, французька,
гінді). Spiritual terms: Дух, Інкарнація, Пуджа, Стопи, Реалізація capitalised;
`дух Шрі Ґанеші` (para 27, "spirit" = attitude) correctly lowercase.
Glossary terms verified: Кундаліні, Сахасрара, Аґія, Вішуддхі, Хамса,
Брахмарандхра, Екадаша, Нірвікальпа, Махамайя, шраддга, бхути, обумовленості,
одержимий, блокування, гхі, віддача на милість, в Сахаджа Йозі, сахаджа йоґ(и/ів),
Ґуру Пуджа. Closing line "May God bless you." (no "all") → «Нехай Бог благословить
вас.» is correct.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 19 | Comma before a single «чи» between homogeneous members | …казати «але це», «але те», чи «проблема в тому-то й тому-то»… | «але це», «але те» чи «проблема в тому-то й тому-то» |
| L2 | 19 | Comma before a single «чи» between homogeneous predicates | …якщо ви кажете «але», чи кажете «проблема в тому», нічого не вийде… | якщо ви кажете «але» чи кажете «проблема в тому» |
| L3 | 21 | «не далеко» written apart with no contrast (= близько → one word) | …але чудо не далеко позаду в цих європейських містах. | але чудо недалеко позаду |
| L4 | 33 | «як-от» must be hyphenated (149 hyphenated instances in the corpus, this is the only unhyphenated one; para 53 of this talk has «як-от») | Як от хтось приїхав з Америки… | Як-от хтось приїхав з Америки |
| L5 | 47 | Comma before a single «і» joining two homogeneous «де…» clauses | Де Мати має бути утверджена, і де Їй мають поклоняться й обожнювати Її. | …утверджена і де Їй мають поклонятися… |
| L6 | 43 | Adjacent subordinators «що якщо» with no «то» following need a comma between them | …як уже гарно влаштовано, що якщо Кундаліні має прорватися, вона має прорватися через серцеву чакру? | …влаштовано, що, якщо Кундаліні має прорватися, вона… |
| L7 | 53, 73 | Adjacent subordinators «бо коли» (same rule as L6) | Ви не говорите, бо коли ви говорите… / …бо коли я бачу Вас, я відчуваю… | бо, коли ви говорите… / бо, коли я бачу Вас… |
| L8 | 57 | Comma before a single «чи» joining two homogeneous conditional clauses | Але якщо ви не на тій точці прийому, чи якщо вас там немає, нічого не працює… | …не на тій точці прийому чи якщо вас там немає… |
| L9 | 59 | «– це що ви…» is not a valid construction; the demonstrative «те» is required | Тож те, що Я маю вам сказати, – це що ви повинні зрозуміти свою відповідальність. | – це те, що ви повинні зрозуміти… |
| L10 | 96 | «самозначущість» is a non-dictionary calque of "self-importance" | Забудьте самозначущість. | Забудьте про власну значущість. |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 10 | Inconsistent casing of the interjection: «боже мій» here vs «Боже мій!» in paras 15, 17, 20 and «Боже, спаси вас усіх» in para 64 (corpus: 13 «Боже мій» vs 2 lowercase) | Вона тут уже, боже мій, стільки років… | Вона тут уже, Боже мій, стільки років |
| S2 | 20 | Accusative of «Аґія чакра»: glossary context declines both parts («В Агії чакрі», «в Муладхарі чакрі»); this talk itself has «повз Аґію» (para 12); corpus majority «Аґію чакру» | …робимо все міцнішою й міцнішою цю Аґія чакру, центр Господа Ісуса Христа… | цю Аґію чакру |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Clear rule: no comma before a single чи/або/і between homogeneous members. |
| L | L2 | Keep | Same rule; «кажете «але» чи кажете «проблема в тому»» are homogeneous predicates of one clause. |
| L | L3 | Keep | No opposition («не далеко, а близько») is expressed; the meaning is «близько позаду», so «недалеко» is one word. Only instance in the corpus. |
| L | L4 | Keep | Orthographic norm; the corpus is otherwise unanimous (149 : 1) and the same talk uses «як-от» in para 53. |
| L | L5 | Remove | The two «Де…» fragments mirror the English sentence fragments and can equally be read as independent parts of a compound sentence, where the comma before «і» is correct. Ambiguous structure – not a clear error. |
| L | L6 | Keep | Textbook case: two subordinating conjunctions in a row with no «то/тоді» after the embedded clause take a comma between them. |
| L | L7 | Remove | Same rule in principle, but «бо коли» at clause start is rendered without a comma 18 : 1 across the corpus and reads as oral-speech pacing; enforcing it here would be a style change, not an error fix. |
| L | L8 | Keep | Two homogeneous subordinate clauses («якщо…» / «якщо…») joined by a single «чи»: no comma. |
| L | L9 | Keep | «це що» is ungrammatical as a predicate link; «це те, що» is the only standard form. |
| L | L10 | Remove | «само-» compounds are productive in Ukrainian and the word is transparent in context; replacing it is a lexical preference, not a correction of an error. |
| S | S1 | Keep | Same interjection rendered two ways in one transcript; the capitalised form is used everywhere else in this text and dominates the corpus. |
| S | S2 | Keep | Glossary examples decline both words of chakra names; the talk already declines the bare name («повз Аґію»); «цю Аґію чакру» restores agreement of the demonstrative with the noun phrase. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | Вона тут уже, боже мій, стільки років | Вона тут уже, Боже мій, стільки років |
| 2 | 19 | «але це», «але те», чи «проблема в тому-то й тому-то» | «але це», «але те» чи «проблема в тому-то й тому-то» |
| 3 | 19 | якщо ви кажете «але», чи кажете «проблема в тому» | якщо ви кажете «але» чи кажете «проблема в тому» |
| 4 | 20 | цю Аґія чакру | цю Аґію чакру |
| 5 | 21 | але чудо не далеко позаду | але чудо недалеко позаду |
| 6 | 33 | Як от хтось приїхав з Америки | Як-от хтось приїхав з Америки |
| 7 | 43 | влаштовано, що якщо Кундаліні має прорватися, вона | влаштовано, що, якщо Кундаліні має прорватися, вона |
| 8 | 57 | не на тій точці прийому, чи якщо вас там немає | не на тій точці прийому чи якщо вас там немає |
| 9 | 59 | – це що ви повинні зрозуміти | – це те, що ви повинні зрозуміти |

All nine corrections were applied to `transcript_uk.txt` with exact single-match
replacement and verified by grep before this report was written.

## Summary

- Language (L): 10 issues found, 7 approved by Critic
- SY Domain (S): 2 issues found, 2 approved by Critic
- Total corrections applied: 9
