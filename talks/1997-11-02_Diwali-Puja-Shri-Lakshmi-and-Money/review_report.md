# Language Review – Diwali Puja: Shri Lakshmi and Money, 1997-11-02

Reviewed file: `talks/1997-11-02_Diwali-Puja-Shri-Lakshmi-and-Money/transcript_uk.txt`
Reference: `transcript_en.txt`; glossary: `terms_lookup.yaml`, `terms_context.yaml`, `glossary/AGENTS.md`.

Paragraph numbers below are the line numbers in `transcript_uk.txt`.

Automated pre-checks (whole file): no mixed Latin/Cyrillic words, no Latin
characters, no `"` / `„` / `“”` quotes, no `—` or hyphen-as-dash, no space before
punctuation, no double spaces, no `…` character or stray double dots,
apostrophe is consistently `’` (U+2019), and `«»` are balanced on every line.

Corpus consistency checks: `Ґандіджі`, `Сі Пі`, the singular `ракшас`, the header
line format and the `Прахлад` form all match other talks in `talks/`.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 13 | Comma before a single, non-repeated «або» joining homogeneous predicate nouns (the second «можуть бути» is elided in the translation) | «Це можуть бути мафіозні дони, або якісь бандити, якісь чорноринкові спекулянти…» | «Це можуть бути мафіозні дони або якісь бандити, …» |
| 2 | 33 | Anglicism («hundred years old») – in Ukrainian, age is not expressed as «N років старий»; it takes the dative + «було N років» | «А сам той дім був понад сто років старий.» | «А самому тому домові було понад сто років.» |
| 3 | 35 | Number disagreement: plural demonstrative «ці» with singular «Маджидія»; EN has the singular «We are this Majidiya!» | «Ми і є ці Маджидія!» | «Ми і є цей Маджидія!» |
| 4 | 34 | Comparative phrase as part of the predicate set off by a comma | «Люди виглядають, як коні: вони ходять, як коні.» | «Люди виглядають як коні…» |
| 5 | 15 | «що» could be misread as a relative pronoun for «спокуса», which would need «вбиває» | «Гроші – така спокуса для людей, що вбивають усяке відчуття порядності…» | «…що вони вбивають…» |
| 6 | 46 | Pleonasm «дуже унікальним» | «Один із годинників виявився дуже унікальним» | «унікальним» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 55 | Capital «Я» mid-sentence for Prahlada's own words. Prahlada is a great devotee, not an Incarnation, so his pronoun is lowercase (the first «Я» in the paragraph is correctly capitalised as a sentence start) | «…зовсім близько від храму, – Я зробив статую з піску» | «…– я зробив статую з піску» |
| 2 | 52 / 53 | Same person declined in two ways: «про Прахлада» vs «про Прахладу» | «Тож ви, мабуть, чули про Прахлада.» / «скільки з вас читали про Прахладу?» | Unify as «Прахладу» |
| 3 | 27 / 28 / 29 | Inconsistent capitalisation of audience remarks: «(сміх)» vs «(Сміх і оплески)» | «(сміх)» … «(Сміх і оплески)» | «(сміх і оплески)» |
| 4 | 49 | «лінга» rather than the glossary's «Лінгам Шіви» | «велика пінда (лінга) Шрі Махадеви» | «(лінгам)» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | Genuine punctuation error. With the predicate elided, «дони … або якісь бандити» are homogeneous members joined by a single «або», which takes no comma. |
| L | 2 | Keep | Genuine grammar error: «був N років старий» is an Anglicism and not valid Ukrainian. The fix keeps the meaning and the emphasis «сам». |
| L | 3 | Keep | Genuine agreement error. «цей» (not «ці») also restores fidelity to the spoken «this Majidiya», and leads naturally into the granddaughter's question «Хто такий Маджидія?». The singular/plural shift that follows is in the original and stays. |
| L | 4 | Remove | Debatable. In the same sentence, «поводитеся, як коні» and «ходять, як коні» are manner adverbials, where the comma is acceptable. Changing only one would make the sentence inconsistent. Not a clear error. |
| L | 5 | Remove | False positive. This is a result clause («така…, що») whose subject «гроші» is implied from the main clause. It is grammatical as written. |
| L | 6 | Remove | Mirrors the spoken «very unique». Roughness of the original is not to be repaired (AGENTS.md, "Fidelity to the Spoken Original"). |
| S | 1 | Keep | Genuine capitalisation error. Under the deity-pronoun rules, only Shri Mataji and the Incarnations take capitalised pronouns, and Prahlada is neither. |
| S | 2 | Remove | False positive. EN has «Prahlad» in ¶52 and «Prahlada» in ¶53. «Прахлада» is the correct accusative of «Прахлад», a form also used elsewhere in the corpus (1983-03-30). This is a faithful spoken variant, not an error. |
| S | 3 | Remove | Mirrors EN «(laughter)» / «(Laughter and applause)». Both casings already occur in the corpus, and `subtitle_omit.yaml` matches case-insensitively. Style, not error. |
| S | 4 | Remove | The glossary entry is for the compound «Shiva Linga». Here She says «pinda (linga)», and the transliteration of what was spoken is correct. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 13 | «мафіозні дони, або якісь бандити» | «мафіозні дони або якісь бандити» |
| 2 | 33 | «А сам той дім був понад сто років старий.» | «А самому тому домові було понад сто років.» |
| 3 | 35 | «Ми і є ці Маджидія!» | «Ми і є цей Маджидія!» |
| 4 | 55 | «– Я зробив статую з піску» | «– я зробив статую з піску» |

## Summary

- Language (L): 6 issues found, 3 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 4

Overall, the translation is of high quality. Glossary terms are used consistently (Дхарма, Лакшмі Таттва, Махамайя, Набхі, бхут, Калі Юга, Кубера, Нарасімха, Аватара, Лакшмі Паті, обумовленість, сходження, Пуджа). Deity pronouns are correct throughout (Shri Mataji, Lakshmi, Shri Krishna, Shri Vishnu, Sita). Translator's additions are correctly marked in `[ ]`, and typography (`«»`, ` – `, `’`, `...`) is clean.
