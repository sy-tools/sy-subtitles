# Language Review – 1989-07-23_Guru-Puja-Creativity, 2026-08-07

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter, per `templates/language_review_template.md`.

- **Reviewer L – Language**: orthography, grammar, punctuation (spelling, word forms, Latin/Cyrillic mix, commas, quotation marks `«»`, dash ` – `, apostrophe `’`, case forms, agreement).
- **Reviewer S – SY Domain**: deity pronoun capitalization, glossary term consistency (`glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`), spiritual term capitalization, language names lowercase.
- **Critic**: filters both tables, removes false positives and style preferences, keeps only genuine errors.

Automated character checks were also run: no Latin characters, no double/trailing spaces, no straight/German quotes, no wrong apostrophe variants (U+2019 only), dash is en-dash U+2013 with spaces throughout, guillemets balanced. One invalid letter combination found (`шь`), reported as L1.

Paragraph numbers below refer to body paragraphs of the talk (¶1 = «Сьогодні нам довелося витратити...»).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶9 | «лакшья» — сполучення «шь» неможливе в українській орфографії; в запозиченнях після «ш» перед «я» пишеться апостроф (пор. «миш’як»; у глосарії — «Матс’я», «яг’я», «арг’я») | «якщо творчість – наша мета, лакшья, то для цього нам слід очистити увагу» | «лакш’я» |
| L2 | ¶9 | «дуже прекрасна» — інтенсифікатор при абсолютному прикметнику (калька з "very beautiful") | «І радість бачити своє відображення в іншій людині дуже прекрасна.» | «прекрасна» / «дуже красива» |
| L3 | ¶8 | «Куди ми звертаємо нашу увагу» — нормативна сполука «звертати увагу на що» | «Куди ми звертаємо нашу увагу найбільше?» | «На що ми найбільше звертаємо нашу увагу?» |
| L4 | ¶9 | Кома перед одиничним «і» між однорідними присудками | «нам слід очистити увагу, і очистити її любов’ю, співчуттям» | вилучити кому |
| L5 | ¶5 | «поводитеся із ситуацією» — сполучуваність ("handle the situation") | «Лише якщо ви поводитеся із ситуацією та особистістю дуже дбайливо» | «даєте раду ситуації» / «обходитеся з ситуацією» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ¶2 | «принцип Ґуру» з малої літери — глосарій подає «Принцип Ґуру» | «у всіх нас закладений принцип Ґуру» | «Принцип Ґуру»? |
| S2 | ¶12 | «хітху» — у санскриті *hita* без придиху; можливо, «хіту» | «Ви маєте дбати про благо – хітху.» | «хіту»? |
| S3 | ¶20 | «Ґанеша Стуті» — англ. "Stuthi"; чи не має бути «Стутхі» за конвенцією придихових? | «заспівати Ґанеша Стуті» | «Стутхі»? |

Verified correct (no findings): усі займенники Шрі Матаджі з великої літери (Я/Мені/Моїх/Мої/Мій/Моїм, Мати, Матір’ю — ¶8, ¶16–¶19); «Ґуру» з великої щодо власного Ґуру/Шрі Матаджі та «ґуру» з малої в загальному значенні — усі 30+ випадків відповідають оригіналу; «Принцип Ґуру», «Бхавасаґара», «Свадхістхана чакра», «Набхі чакра», «Кундаліні», «Шакті», «Океан Ілюзії»; «сахаджа йоґ/йоґів» з малої, відмінювання за глосарієм; «Сахаджа Йоґа/Йоґи»; «Пуджа/Пуджі» з великої; «Стопи» з великої; «віддача на милість» (surrender); «обумовленості» (conditionings); «его»; «сходження» (ascent); «реалізовані душі» з малої (за оригіналом); «Атхарва Шірша» за глосарієм; «Нехай Бог благословить усіх вас.» — точна фіксована формула; назви мов з малої літери.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Справжня орфографічна помилка: «шь» — неприпустиме сполучення; апостроф обов’язковий (пор. «миш’як» та глосарійні «Матс’я», «яг’я», «арг’я»). |
| L | L2 | Remove | Стилістичне вподобання; розмовний регістр промови, точно відтворює "very beautiful" оригіналу. |
| L | L3 | Remove | Допустима розмовна конструкція напряму в усному мовленні; наступне речення вживає нормативне «звертаємо увагу на». Не помилка. |
| L | L4 | Remove | Кома допустима як приєднувальна конструкція, що відтворює паузу оригіналу ("...we should purify, and to be purified with love"). |
| L | L5 | Remove | Стилістичне вподобання; конструкція зрозуміла й відтворює оригінал. Не помилка. |
| S | S1 | Remove | Хибнопозитивне: оригінал сам розрізняє "the principle of Guru" (мала) і "Guru Principle" (велика); переклад свідомо віддзеркалює це розрізнення. |
| S | S2 | Remove | Переклад іде за написанням джерела ("hitha"); терміна немає в глосарії; недостатньо підстав для виправлення. |
| S | S3 | Remove | Оригінал правильний: санскр. *stuti* (स्तुति) без придиху; англійське "th" — анґлізоване написання, тож «Стуті» вірно. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶9 | «лакшья» (неприпустиме «шь») | «лакш’я» |

## Summary

- Language (L): 5 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 1

The translation is of high quality: deity pronoun capitalization, Ґуру/ґуру case distinction, and glossary terminology are consistent throughout; punctuation (guillemets, en-dash with spaces, U+2019 apostrophe) is uniform. The single approved correction («лакшья» → «лакш’я») has been applied to `transcript_uk.txt`.
