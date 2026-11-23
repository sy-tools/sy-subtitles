# Language Review – Mahalakshmi-Puja-The-Importance-of-Puja, 1986-05-24

## Process

Review of `transcript_uk.txt` (302 lines, line-aligned 1:1 with `transcript_en.txt`)
using 2 parallel reviewers + 1 critic filter, per `templates/language_review_template.md`.
Paragraph numbers below are line numbers in `transcript_uk.txt`.

Mechanical scans run before the manual pass: Latin/Cyrillic mixing, straight or
German/English quotes, ASCII apostrophes, em-dashes and hyphens used as dashes,
double spaces, spaces before punctuation, the Unicode ellipsis, non-standard
apostrophes (U+02BC/U+2018), NBSP/zero-width characters, `г`/`ґ` in SY terms, and
lowercase `пудж*`/`стоп*`/`дух*`/`інкарнац*`. None found an issue. The only
spaces before `...` are at lines 140, 142 and 203, where they mirror the leading
`…` of the English transcript.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 93 | Full stop after a closing quotation mark when the quoted speech ends in `?` | Воррен (убік): «Вона дотрималася форми?». Йоґ: «Це те саме». | «Вона дотрималася форми?» Йоґ: «Це те саме». |
| 2 | 278 | Full stop after a closing quotation mark when the quoted speech ends in `?` | [Йоґ: «Можна Вам допомогти, Шрі Матаджі?».] | [Йоґ: «Можна Вам допомогти, Шрі Матаджі?»] |
| 3 | 105 | Comma instead of a colon in a sentence without a conjunction, where the second part gives the content of «скажіть їй» | Просто скажіть їй, це хитрість, яку Я втнула. | Просто скажіть їй: це хитрість, яку Я втнула. |
| 4 | 251 | у/в euphony: в between consonants | Нам слід встати. | Нам слід устати. |
| 5 | 234 | у/в euphony: в after a pause, before a consonant | Тканину туди, в куток. | Тканину туди, у куток. |
| 6 | 26 | «можливо» used as the predicate «it is possible» | Лише в сучасні часи можливо сфотографувати Інкарнацію. | …можна сфотографувати… |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 141 | Capitalization of «Богів» (the Devas, plural) | Індра – це Бог... цар Богів, усіх Богів. | цар богів, усіх богів |
| 2 | 58 | Capitalization of «Божества» (deities of the chakras) | тоді елементи щасливі й Божества в чакрах щасливі | божества |

Verified as correct (no change needed):
- **Shri Mataji's pronouns**: uppercase everywhere (Я/Мені/Мене/Моя/Мої/Мого/Себе/Собі/Сама/Своє/Своєї/Її/Неї/Вона).
- **Pronouns for Christ, Shri Ganesha, Vishnu, God, Mother Mary and the Adi Shakti**: uppercase in the singular (Він/Його/Вона/Свою).
- **Plural Incarnations and deities**: lowercase (своє тіло, вони випромінюють).
- **Lowercase pronouns that look like Shri Mataji's**: none of them refer to Her. Lines 95 and 124 are Warren and a yogi. Line 191 is a yogi, capitalized only because it starts the sentence. Lines 79, 87, 91 and 93 refer to a lady or to the swastika.
- **Glossary terms**: all match.
  - Махалакшмі, Садашіва, Сіта, Радха, «Деві Махатм’ям», Шрі Ґанеша (gen./dat. Ґанеші), Махавішну, Вірата, Вішну Таттва, Омкара, Мати Земля, сваямбху, реалізовані душі.
  - Ґанапатіпуле, Маха Ґанеша (corpus form), Аді Шакті, Махамайя, масова Самореалізація, Святий Дух, Аґія чакра.
  - Деві стотра, Нішкала, кумкум, чандан ґандха, Аарті, Боло … кі! / Джай!, Кундаліні, Вішуддхі, бандхан.
  - Нехай Бог благословить усіх вас / вас.
- **Spiritual terms**: Пуджа, Стопи, Інкарнація and Божественне are uppercase throughout. «десять заповідей» is lowercase, per the glossary.
- **Language names**: lowercase (іспанською, англійська). Names of peoples are lowercase too (іспанців, англійці).
- **Transliteration**: ґ is used consistently in Ґуру/Ґанеша/Аґія/йоґ/Бхаґаваті/ґандха. The only words with г are ordinary Ukrainian ones (гірлянда, йогурт, його).
- **Translator's additions in [brackets]**: these are minimal and match the spoken original (lines 30, 32, 33, 55, 68, 121, 291).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | Ukrainian rule: when direct speech ends in `?`, `!` or `...` inside the quotation marks, no full stop goes after the closing `»`. The corpus already follows this almost everywhere (about 1,780 `?»`/`!»` without a stop against about 110 with one). |
| L | 2 | Keep | Same rule as L1. |
| L | 3 | Keep | Here the second part of a sentence without a conjunction gives the content of a verb of speech («скажіть їй»), so a colon is required. As it stands, the comma joins two clauses with nothing to link them. The same construction on line 80 («просто скажіть: спершу…») already has the colon, so this also makes the talk consistent with itself. The spoken content is unchanged. |
| L | 4 | Remove | у/в alternation is a recommendation for euphony, not an orthography error. «слід встати» is normal and widely used. |
| L | 5 | Remove | Same as L4: a euphony preference, not an error. |
| L | 6 | Remove | Modern Ukrainian accepts «можливо» as a predicate («можливо зробити»). This is a style preference. |
| S | 1 | Remove | The English transcript capitalizes «the Gods» here, and the corpus is mixed (Богів 10 / богів 15). Where Shri Mataji is explaining the prayer to Shri Ganesha, uppercase for divine beings is defensible, so this is not an error. |
| S | 2 | Remove | This is the only occurrence in the talk, so there is no inconsistency within the text. The corpus uses both forms, Божества leaning slightly ahead. Uppercase for the deities of the chakras is a legitimate reverential choice. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 93 | «Вона дотрималася форми?». | «Вона дотрималася форми?» |
| 2 | 278 | «Можна Вам допомогти, Шрі Матаджі?».] | «Можна Вам допомогти, Шрі Матаджі?»] |
| 3 | 105 | Просто скажіть їй, це хитрість | Просто скажіть їй: це хитрість |

## Summary

- Language (L): 6 issues found, 3 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 3

Overall the translation is high quality. Terminology matches the glossary,
capitalization of deity pronouns is correct, and the dashes, quotation marks and
apostrophes are consistent throughout. The spoken roughness of the original
(broken-off sentences, repetitions, shifting references) is kept faithfully, with
minimal translator's additions in brackets. The three corrections are punctuation
only and do not change any wording.
