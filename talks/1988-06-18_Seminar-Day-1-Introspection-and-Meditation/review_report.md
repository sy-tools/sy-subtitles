# Language Review – Seminar Day 1, Introspection and Meditation, 1988-06-18

Reviewed file: `transcript_uk.txt` (73 lines; "Paragraph" below = line number in the file).
Reference: `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`.

## Process

2+1 review per `templates/language_review_template.md`:
Reviewer L (orthography, grammar, punctuation) and Reviewer S (SY domain:
capitalization, terminology, consistency) reviewed the full text; the Critic
filtered both tables together.

Mechanical checks run over the whole file before the manual read, all clean:

- No Latin characters mixed into Cyrillic words
- Apostrophe is always `’` (U+2019); no straight `'` or modifier `ʼ`
- Quotation marks are `«»` throughout; no `„"`, `“”` or straight `"`. The only
  unbalanced pair is the two-paragraph prayer in ¶68–69 (opens in 68, closes in 69,
  same as the English)
- Dashes are ` – ` (U+2013) with spaces; no em-dash, no hyphen used as a dash
- Ellipsis `...` with no space before it (¶71)
- No double spaces, no space before punctuation, no missing space after punctuation
- No invisible characters (NBSP, ZWSP)
- Euphony (у/в, і/й, з/із/зі): no breaches found
- Spell check against the vendored hunspell `uk_UA` and `site/dict/words_uk.txt`:
  only proper names and transliterations flagged (майєю, майях, Нірананді,
  удара чарітанам, Стуніє, Харш, Каліутра) plus «перел», which is the correct
  genitive plural (and the Ohienko Bible wording, Matthew 7:6)

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 46 | Two colons in one sentence. The second one introduces the questions; the English has a dash there | «Як Мати, Я сказала б: намагайтеся дуже уважно аналізувати себе: що ми зробили для Сахаджа Йоґи?» | «…аналізувати себе – що ми зробили для Сахаджа Йоґи?» |
| L2 | 60 | The relative clause «яка… така величезна» comes straight after «Мати», so it can be read as describing the Mother rather than the capacity to forgive | «і здатність прощати, як має наша Мати, яка, як ми бачили, така величезна» | Restructure, e.g. «і здатність прощати, яка, як ми бачили, у нашої Матері така величезна» |
| L3 | 25 | «у світу» (genitive of possession) reads awkwardly next to «у світі» | «які проблеми у світу» | «які проблеми має світ» |
| L4 | 40 | «так дуже» is a calque of "so very" | «і Я працюю так дуже напружено» | «і Я працюю так напружено» |
| L5 | 39 | Colon after the conjunction «що» before a quotation | «Не те, що: «Гаразд, я надіслав Матері Її гроші на Її подорож»» | «Не те, що «Гаразд…»» |
| L6 | 61 | First-person possessive where the reflexive is preferred | «а з моїм власним знанням Сахаджа Йоґи» | «а зі своїм власним знанням Сахаджа Йоґи» |
| L7 | 60 | Euphony: consonant cluster «увесь всесвіт» | «охопить увесь всесвіт» | «охопить увесь усесвіт» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 12, 42 | `terms_lookup.yaml` lists Maya as «Майя» (capitalized); the text has it lowercase | «укрита якоюсь майєю. І ця майя…», «у власних майях» | «Майєю», «Майя», «Майях» |
| S2 | 7, 19, 25, 26, 37, 65, 68, 69 | `terms_context.yaml` names «Матінко» as the form of address in prayer; the text uses the vocative «Мати» | «О Мати, хоч яке зло ми досі заподіяли Тобі…» | «Матінко» in the prayers |
| S3 | 42 | The voice shifts inside the paragraph: the quotation has lowercase «мій» (a yogi speaking), then «Що Я з цього отримую?» is uppercase (Shri Mataji) | ««Зрештою, який мій зиск у цьому?» Що Я з цього отримую? Я дещо отримую: Я повернула Своїх дітей…» | Use one voice for the whole passage |
| S4 | 19 | "Whatever small thing I could do" is rendered in a yogi's voice (lowercase «я міг би») and could be Shri Mataji's | «Хоч яку дрібницю я міг би зробити для Сахаджа Йоґи – це важливо» | «Я могла б» |
| S5 | 53 | Pronoun for the Spirit is lowercase right after «Він – Дух» (Shiva) | «подякувати своєму Духові за те, що він приніс світло» | «що Він приніс» |
| S6 | 45, 59 | «Дух» has an inconsistent accusative: inanimate in one place, animate in another | «дурите… свій Дух» vs «Мати дала мені Духа» | Use one form |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | **Keep** | Two colons in one sentence is a real punctuation fault in Ukrainian: the second colon makes the questions look like an explanation of the first clause. The spoken original has a dash here, so ` – ` fixes the punctuation and follows the source. |
| L | 2 | Remove | «Мати» and «здатність» are both feminine, so the sentence is grammatically valid, and «величезна» naturally attaches to the capacity. Restructuring it is a translation-style choice, not a language error. |
| L | 3 | Remove | «у кого/чого є» (у + genitive) is normative Ukrainian, so «які проблеми у світу» is grammatical. A rewording would only be a style preference. |
| L | 4 | Remove | «так дуже» is acceptable in colloquial Ukrainian and conveys the spoken "so very hard". Style only. |
| L | 5 | Remove | The construction follows the spoken "It's not that, 'All right…'". The quotation keeps its first-person direct speech, so the colon is defensible. It is not a clear error. |
| L | 6 | Remove | With a first-person subject, «мій» and «свій» are both normative. Style preference. |
| L | 7 | Remove | Euphony with «всесвіт/усесвіт» is a soft recommendation, and both spellings are in the dictionaries. Style. |
| S | 1 | Remove | False positive. The English says "a maya" and "mayas": the common noun (illusion), not the named principle in the glossary. The corpus has lowercase «майя/майї» for this sense. |
| S | 2 | Remove | Both forms are established in the corpus (163× «Мати,» opening a quotation). The vocative «Мати» is correct Ukrainian and consistent throughout this text. Style choice. |
| S | 3 | Remove | This is the translator's reading of an ambiguous passage, and it matches the source. "I have brought my children… You have to do the same" is Shri Mataji's own voice, and the quotation is what "you have to feel". Changing it would rewrite the speaker. |
| S | 4 | Remove | The sentence continues the yogi's criterion from ¶18 ("What have I done for Sahaja Yoga?"), so the yogi's voice is a sound reading. Not an error. |
| S | 5 | Remove | The English says "your Spirit that **it** has brought light". The Spirit as the individual Self is not an Incarnation, and the uppercase pronoun rule covers Incarnations and Shri Mataji. Lowercase is correct. |
| S | 6 | Remove | Both accusatives of «Дух» are normative (cf. «Святого Духа»). Not an error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 46 | «аналізувати себе: що ми зробили для Сахаджа Йоґи?» (second colon in one sentence) | «аналізувати себе – що ми зробили для Сахаджа Йоґи?» |

## Notes for the record (verified correct, no change)

- **Shri Mataji's pronouns**: every reference is uppercase (Я/Мені/Мене/Мій/Моя/Моєму/Мого/Собою/Своїх/Свого), including inverted forms («думала Я», «сказала б Я», «Хотілося б Мені»). Inside the yogis' prayers, «Тобі/Тебе/Ти» are uppercase and the yogi's own «я/мені/мій» is lowercase.
- **God and Christ**: «Його діяння» (God) and «Він – Дух» (Shiva) are uppercase. Pope and cardinal are lowercase.
- **Glossary terms**: Сахаджа Йоґа (loc. Йозі), сахаджа йоґи (lowercase), Реалізація, Дух, Божественне, Кундаліні, чакри, вібрації, бандхан, блокування (caught up), стан свідка, сходження, колективність, Нірананда, бхути, бадхи, Вішва Нірмала Дхарма (consistent with the corpus forms), Дхарма (uppercase; adjective «дхармічне» lowercase), Сахасрара, ліва Вішуддхі, Ґанапатіпуле, Ґанґа, ґуру (generic, lowercase).
- **Language names**: lowercase («англійська», «на санскриті»).
- **Translator's additions**: the brackets taken over from the English ([бачити], [сторони], [паломництво], [це], [що], [якими], [я], [прямо], [непевно]) and the translator's own «вони [дерева]» (¶9) and «ліву [руку]» (¶72) follow the AGENTS.md fidelity rule and were left as they are.
- **Editorial remarks**: «(Сміх)» is used throughout and is covered by `glossary/subtitle_omit.yaml`.

## Summary

- Language (L): 7 issues found, 1 approved by Critic
- SY Domain (S): 6 issues found, 0 approved by Critic
- Total corrections applied: 1
