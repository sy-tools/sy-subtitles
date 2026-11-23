# Language Review – 1996-07-28_Guru-Puja-Criteria-To-Introspect-Yourself, 28 липня 1996

Пуджа Ґуру, Кабелла Ліґуре (Італія). Reviewed: `transcript_uk.txt` (57 paragraphs of body text plus header), checked against `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.

Paragraph numbers are line numbers in `transcript_uk.txt`. Lines 1–4 are the header, and the body starts at line 6.

## Mechanical checks (run before manual review)

| Check | Result |
|---|---|
| Latin characters / mixed Latin–Cyrillic words | Only `S.T.` (P13, the Maharashtra State Transport abbreviation, kept as in the original). No mixed-script words. |
| Apostrophe | All `’` (U+2019). No `'`, `ʼ` or backtick. |
| Quotation marks | Only `«»`. No `„"`, `""` or `“”`. P29 has one more `«` than `»` and P30 one more `»` than `«`: the quote opened in P29 closes in P30, as in the English. |
| Dashes | All ` – ` (U+2013) with spaces. No ` - ` or `—`. |
| Double spaces / space before punctuation | None. |
| Ellipsis | `...` only, with no space before it (P30 `від...?`, P42, P51). No `…`. |

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | P15 | Comma before a comparative phrase that is part of a compound nominal predicate (link verb `бути` + `як святий`). Such phrases are not set off by commas. | «…ви маєте бути, як святий.» | «…ви маєте бути як святий.» |
| L2 | P12 | Comma before a comparative phrase that could be read as manner (`як?` = по-святому). | «…щоб він умів жити, як святий.» | «…щоб він умів жити як святий.» |
| L3 | P6 | `священник/священників` spelled with double н. Possibly a Russianism, where `священик` is the norm. | «Немає ні пап, ні священників… Священники в них є…» | `священиків`, `Священики` |
| L4 | P50 | Active participle in `-ючий`, possibly a calque (normative alternatives: `всепрощенний`, `всепрощальний`). | «…буде всепрощаючим, буде люблячим.» | «…буде всепрощенним…» |
| L5 | P15, P50 | `не важко` written separately, where the joined form `неважко` might be expected. | «Це не важко, це не важко…», «Ви можете, це не важко.» | `неважко` |
| L6 | P49 | Euphony: `тут вдієш` (consonant + в + consonant). | «…то що тут вдієш?» | «…то що тут удієш?» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | P8 / P51 | Inconsistent capitalization of the same term: `Ґурупаду` vs `ґурупаду`. | «…щоб отримати цю Ґурупаду…» / «…отримаєте свою ґурупаду.» | Unify one way |
| S2 | P57, P59 vs P6–P39 | `Реалізацію` capitalized in the after-Puja talk, lowercase `реалізацію` elsewhere. | «…ви отримали свою Реалізацію.», «…ми дали Реалізацію.» | Unify one way |
| S3 | P26 vs P18/P27/P31 | `океан` lowercase in P26, `Океан` capitalized elsewhere. | «…пірнули в океан цього співчуття…» | `Океан` |
| S4 | P9 | `самореалізованими душами` lowercase, while the English has `Self-realised souls`. | «…який ми можемо назвати самореалізованими душами.» | `Самореалізованими Душами` |

Verified as correct (no finding):
- **Shri Mataji's pronouns** are all uppercase: Я/Мені/Мене/Мій/Моя/Моє/Мої/Моїм/Моєю/Мною/Своїм. Every lowercase я/мені/мене/мій is a quoted ordinary person (seekers, a false guru, the Hare Krishna man, the generic «я»).
- **Christ is singular and uppercase**: Він/Його/Нього (P34, P36). Mary is uppercase: Її (P34). Paramchaitanya is uppercase: Вона (P9, matching the English `It`). Shri Mataji in reported speech is uppercase: Ви/Вас/Вашої/Вона (P16, P29, P39, P43).
- **Ordinary gurus, the false guru and Nityanandswami** are lowercase: нього/він/йому.
- **Terminology** matches the glossary: Пуджа Ґуру (used throughout), Парамчайтанья, Нірананда, Ріші та Муні, Патанджалі, Шрі Ґанеша (genitive Шрі Ґанеші), Шрі Крішна, бандхан, сахаджа йоґ/йоґи/йоґів/йоґам/йоґами/йоґах, Сахаджа Йоґа / в Сахаджа Йозі, обумовленість/обумовленості (conditioning), стан без думок (thoughtless), стан усвідомлення без думок (thoughtless awareness), сходження (ascent), ніріччха (cf. Іччха), саньясі.
- **Spiritual terms** are capitalized: Пуджа, Дух/Духа, Істина/Істину, Самореалізація where the English has Self-realisation.
- **Language name** is lowercase: «маратхі» (P27), «англійська» (header).
- **Translator's square-bracket additions** are all minimal bridges or carried over from the English brackets: [дійти], [тепер], [ми], [люди], [це], [будьте], [з ними], [багато], [Він сказав:], [якщо], [від цього], [раніше], [якби], [Вони], [ним], [Через], [із], [але], [бути], [треба], [ви мусите], [Махараштри].

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | This is a real punctuation error. `як святий` is the nominal part of the compound predicate after `бути` («ви маєте бути [ким? яким?] як святий»), and Ukrainian punctuation does not set such a phrase off with commas («Ти була як сон»). The rest of the repo writes `бути як …` with no comma (26 times, against 2 with a comma). |
| L | L2 | Remove | Borderline. `жити, як святий` can be read as a real comparison ("live like a saint does") as well as manner, and the repo uses both forms (`жити, як святий` occurs elsewhere). Changing it would be a style preference, not a clear error. |
| L | L3 | Remove | False positive. Both `священик` and `священник` are in the bundled dict_uk hunspell dictionary (`site/dict/uk_UA.dic`), and both appear widely in the repo. The original is correct. |
| L | L4 | Remove | Style preference. `всепрощаючий` is established in literary usage and sits naturally next to `люблячий`, which is in the dictionary, in the same list. It is not an error. |
| L | L5 | Remove | False positive. Writing `не важко` separately is correct when the negation is emphatic or contrastive. Here it answers «ви можете подумати, що Я прошу вас про щось… небезпечне», and «зовсім не важко» requires the separate form. |
| L | L6 | Remove | Trivial. The у/в alternation is a matter of euphony, not orthography, and `що тут вдієш` is a standard written form of this idiom. |
| S | S1 | Remove | Faithful to the source. The English itself writes `Gurupada` in P8 and `gurupada` in P51, and the translation mirrors that. Both forms are acceptable. |
| S | S2 | Remove | Faithful to the source. The English capitalizes `Realisation` only in P57/P59. The glossary allows both `Реалізація` and `реалізація`. |
| S | S3 | Remove | Faithful to the source. The English has lowercase `the ocean of this compassion` (P26) and capitalized `the Ocean` (P31) and `Ocean of Joy/Love` (P18/P27). |
| S | S4 | Remove | False positive. The glossary entry `realized soul → реалізована душа` allows lowercase, and P57 «реалізовані душі» is consistent with it. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | P15 | «ви маєте бути, як святий.»: unnecessary comma before a comparative phrase in the compound predicate | «ви маєте бути як святий.» |

## Summary

- Language (L): 6 issues found, 1 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: 1

The translation is very clean. Orthography, apostrophes, quotation marks, dashes and ellipses are fully consistent. All deity and Shri Mataji pronouns are capitalized correctly, glossary terminology is used consistently, and translator's additions follow the square-bracket fidelity rule. The only change applied to `transcript_uk.txt` is the comma removal in P15.
