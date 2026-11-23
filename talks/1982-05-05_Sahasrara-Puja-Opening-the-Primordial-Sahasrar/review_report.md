# Language Review – Sahasrara-Puja-Opening-the-Primordial-Sahasrar, 1982-05-05

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) against `transcript_en.txt`,
using 2 parallel reviewers (L, S) + 1 critic filter, per `templates/language_review_template.md`.

Paragraph numbering: ¶1 = the first body paragraph (line 6 of `transcript_uk.txt`); the
header lines 1–4 are not numbered. Line numbers are given in brackets.

Mechanical checks run on the whole file, with no hits: Latin letters mixed into Cyrillic
words, apostrophes other than `’` (U+2019), hyphen or em-dash used as a dash (all dashes are
` – ` U+2013), `„"`/`""` quotation marks (only `«»` is used), `…` or a space before `...`,
double spaces, spaces before punctuation, missing spaces after punctuation, doubled
punctuation, trailing whitespace.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | ¶2 (line 7) | Emphatic «це» in a cleft construction reads at first as a copular sentence | «Це ваша щаслива доля і Божа любов здійснили це дивовижне чудо.» | «Саме ваша щаслива доля і Божа любов здійснили це дивовижне чудо.» |
| 2 | ¶8 (line 13) | Comma before «як» in a comparison that is part of the predicate | «які виглядають, як роздуті язики полум’я» | «які виглядають як роздуті язики полум’я» |
| 3 | ¶24 (line 29) | Pleonasm: «як» already expresses degree here («наскільки»), so «як дуже» doubles it; the EN is a plain «that»-clause («you can see that it is very important that…») | «ви бачите, як дуже важливо, щоб усі ці наді утримувалися разом» | «ви бачите, що дуже важливо, щоб усі ці наді утримувалися разом» |
| 4 | ¶24 (line 29) | Euphony з/із before «с»: «із» elsewhere in the text («із серцем», «із Сахаджа Йоґи») | «нечесні з собою» | «нечесні із собою» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | ¶6 (line 11) | Possessive pronoun for the Deities (plural, mid-sentence) capitalised; the rule for plural Incarnations/Deities mid-sentence is lowercase | «І Божества прийшли й сіли на Свої престоли, на Свої золоті престоли» | «І Божества прийшли й сіли на свої престоли, на свої золоті престоли» |
| 2 | ¶6 (line 11) | Personal pronoun for the Deities (plural, mid-sentence) capitalised; same rule | «а потім Вони підняли всю верхівку голови» | «а потім вони підняли всю верхівку голови» |
| 3 | ¶31 (line 36) | Relative pronoun for Krishna capitalised | «І саме це пообіцяв Крішна, Який насправді є Віратою.» | «Крішна, який насправді є Віратою» |

Terms checked against `terms_lookup.yaml` / `terms_context.yaml` and found correct and
consistent across the text: Сахасрара, Кундаліні, наді, Брахмарандхра, Вірата (dat. Віраті,
instr. Віратою), чайтанья (instr. чайтаньєю – the corpus form), сукшми, Реалізація / масова
Реалізація, реалізовані душі, его / суперего, обумовленості, колективність, увага, вібрації,
Дух, Істина, Божественне, Божества, сахаджа йоґ (lowercase; pl. йоґів/йоґами/йоґом), Сахаджа
Йоґа, ґуру (ґ), «Нірмала» in `«»`, Сахасрара Пуджа, «Нехай Бог благословить усіх вас». All
pronouns referring to Shri Mataji are uppercase (Я/Мене/Мені/Мною/Моєму/Своє/Себе), and so are
those referring to God (Він/Свій/Свою). The language name «англійська» in the header is
lowercase.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Remove | The emphatic particle «це» before the subject («Це він зробив») is normal, grammatical Ukrainian, and it mirrors the spoken cleft «It is your fortune and God’s love that…». Changing it is a style preference, not an error. |
| L | 2 | Remove | Debatable punctuation: a comparison with «як» after «виглядати» can be read either as part of the predicate or as a comparative phrase. Not a clear error. |
| L | 3 | Keep | Genuine pleonasm. Swapping in «наскільки» for «як» shows it: «наскільки дуже важливо» is clearly wrong. The fix is minimal and brings the sentence closer to the EN «that it is very important». |
| L | 4 | Remove | Euphony preference only. The corpus uses both «з собою» (28) and «із собою» (41), and «з собою» after a vowel is fully acceptable. |
| S | 1 | Keep | `glossary/AGENTS.md`: plural pronouns mid-sentence are lowercase. The corpus applies this to Божества («Божества виконують свою роботу», «Божества – вони…»). Capitalising follows the EN transcript’s «Their», but the Ukrainian convention is explicit. |
| S | 2 | Keep | Same rule and justification as S1 («Вони» → «вони»). |
| S | 3 | Remove | False positive. Krishna is an individual Incarnation (singular), whose pronouns are uppercase, and capitalising the relative pronoun is consistent with that. The corpus has both forms, so there is no basis for a change. |

No conflicts between L and S: their findings touch different passages.

Deliberately left as is (fidelity to the spoken original, `glossary/AGENTS.md`):
- ¶26 (line 31): «Як говорять пророк? [Шрі Матаджі виправляє Себе] Як говорить пророк?» deliberately reproduces Shri Mataji’s self-corrected slip («How does a prophet speaks?»).
- Translator’s additions in square brackets: «фальшивий [світ]», «[у] ранковий час», «[реалізованими]», «[тоді]», «[– ось що]», «пощадити [нас]», «[в тому, щоб]», «[Це] дуже важлива країна», «[вони] знаходили». They all carry the EN transcript’s own brackets or bridge a missing link, and they are not repaired.
- ¶28 (line 33) «дуже величезна, велика особистість» keeps the spoken «a very, huge, big personality».
- ¶26 (line 31) «колективність – це єдиний спосіб розширити вашу Сахасрару» keeps the spoken shift from «one» to «your».

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶6 (line 11) | «сіли на Свої престоли, на Свої золоті престоли» | «сіли на свої престоли, на свої золоті престоли» |
| 2 | ¶6 (line 11) | «а потім Вони підняли» | «а потім вони підняли» |
| 3 | ¶24 (line 29) | «ви бачите, як дуже важливо, щоб» | «ви бачите, що дуже важливо, щоб» |

## Summary

- Language (L): 4 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 2 approved by Critic
- Total corrections applied: 3 (4 word changes in 2 lines; all applied to `transcript_uk.txt` before this report was written)
