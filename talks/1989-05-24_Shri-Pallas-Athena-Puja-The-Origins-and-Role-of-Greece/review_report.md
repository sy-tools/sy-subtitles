# Language Review – Shri Pallas Athena Puja: The Origins and Role of Greece, 1989-05-24

Reviewed: `transcript_uk.txt` (80 paragraphs, lines 6–85; aligned 1:1 with `transcript_en.txt`).
References: `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`.
"Paragraph" below is the line number in `transcript_uk.txt`.

Automated pre-checks were clean, with no findings: no Latin letters or mixed Latin/Cyrillic words; only `’` (U+2019) apostrophes; only `«»` quotation marks; `–` (U+2013) dashes with spaces, with no `—` and no hyphen used as a dash; `...` ellipses with no `…` character; no double spaces, no space before punctuation and no missing space after it.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | Case error: the transitive verb «означати» takes the accusative. The gloss is unquoted, so the nominative cannot be read as a citation of a term. | «Як Я вже казала вам раніше, «Афіна» означає Первинна Мати.» | «…«Афіна» означає Первинну Матір.» |
| L2 | 34 | Lexical calque (false friend): EN *formidable job* means a very hard task. Ukrainian «грізний» means menacing or threatening and does not mean "difficult". | «І в нас грізне завдання через цих ортодоксів...» | «І в нас надзвичайно складне завдання через цих ортодоксів...» |
| L3 | 37 | Genitive of a city name: by the 2019 Pravopys §82, settlement names take -а. | «правив в області, можна сказати, Кандагару, Афганістану» | «…Кандагара, Афганістану» |
| L4 | 84 | Same case error as L1: «означає» + an unquoted common noun in the nominative. | «Знаєте, що таке стуті? «Стуті» означає хвала.» | «…«Стуті» означає хвалу.» |
| L5 | 50 | Agreement with «хто»: the singular is the norm («ті, хто був»), and the singular is used elsewhere in the text (¶57, ¶58). | «ті, хто були справжніми ґуру, вони не приймали будь-кого» | «ті, хто був справжніми ґуру…» |
| L6 | 31 | An adverb modifies a relative adjective, giving "quite well industrial". EN has *quite a good industrial … country*. | «став досить добре індустріальною, тобто розвиненою країною» | «став досить доброю індустріальною, тобто розвиненою країною» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 22 | Plural pronoun for the Incarnations, mid-sentence, is capitalized. It was copied from EN "We'll". | «Інкарнаціям доводилося … казати: «Якщо ви робитимете так, Ми муситимемо зробити ось це»» | «…так, ми муситимемо зробити ось це» |
| S2 | 37 | Plural pronoun for the Gods/Deities, mid-sentence, is capitalized. It was copied from EN "Them". | «Навіть і в міфології, в Індії, про Них говорять так.» | «…про них говорять так.» |
| S3 | 37 | Plural pronoun for the Gods, mid-sentence (after «Тобто»), is capitalized. It was copied from EN "They". | «Тобто Вони інкарнувалися, Боги інкарнувалися тут» | «Тобто вони інкарнувалися, Боги інкарнувалися тут» |
| S4 | 54 | Mixed casing of a glossary term. `terms_lookup.yaml` gives «Реалізована Душа / реалізована душа», and «Реалізовані душі» (capital Р, lowercase д) is neither form. The corpus uses the lowercase form far more often (57× «реалізовані душі»). | «бо ви Реалізовані душі» | «бо ви реалізовані душі» |
| S5 | 75 | «істина» is lowercase. AGENTS.md: «Істина» is uppercase when it means the absolute Truth. | «Ось про що Я говорила – про Будду, про істину, про повагу.» | «…про Істину…» |
| S6 | 57 | Name form differs from the glossary («Нанак»). | «Потім прийшов Нанака» | «Потім прийшов Нанак» |
| S7 | 10 / 12 | Emphatic pronoun for a Deity is capitalized inconsistently. | «сама Афіна жила» (¶10) vs «Сама Аді Шакті була» (¶12) | Use the same casing in both |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | «означати» is transitive (accusative). A bare nominative is acceptable only as a quoted citation, as the text itself does in ¶40 («що означає «лев»»). Here the gloss is unquoted. |
| L | L2 | **Keep** | A genuine lexical error. «грізне завдання» reads as "a menacing task", and nowhere does «грізний» mean "difficult". «надзвичайно складне» renders *formidable* without changing what was said. It also avoids repeating «величезне завдання» from the previous paragraph. |
| L | L3 | **Remove** | Kandahar is both a city and a province. In "the area of … Kandahar and Afghanistan" the regional reading is natural, and §82 gives region and province names the -у ending (as with «Афганістану», which stands next to it). Not a clear error. |
| L | L4 | **Keep** | Same grammar as L1. The fix keeps the two glosses in the text consistent. |
| L | L5 | **Remove** | Plural agreement with a plural antecedent («ті, хто були») is an accepted variant in modern Ukrainian. This is a style preference, not an error. |
| L | L6 | **Remove** | «досить добре індустріальною» is grammatical, though less elegant, and the meaning comes through. This is a style preference. |
| S | S1 | **Keep** | `glossary/AGENTS.md`: Incarnations in the plural, mid-sentence, take lowercase. The corpus applies this to all plural deity pronouns, including possessives (earlier reviews changed «Свої» → «свої» for Божества). The capital letter here only copies the EN transcript. |
| S | S2 | **Keep** | Same rule: a plural pronoun for Deities, mid-sentence. |
| S | S3 | **Keep** | Same rule. The pronoun is not sentence-initial, because «Тобто» comes before it. |
| S | S4 | **Keep** | Glossary consistency. The mixed form is not among the glossary's variants. The lowercase variant matches the glossary and the corpus norm. |
| S | S5 | **Remove** | EN has "about truth" in lowercase, in a list of topics of Her talks («про Будду, про істину, про повагу»). It does not clearly mean the absolute Truth, so the capitalization rule does not clearly apply. |
| S | S6 | **Remove** | False positive under "Fidelity to the Spoken Original". EN has "Nanaka" here, and the spoken form stays. |
| S | S7 | **Remove** | Not an error. In «сама Афіна», «сама» is an emphatic determiner before the noun, and lowercase is standard. Capitalizing «Сама Аді Шакті» (EN "Herself") is also acceptable. No rule is violated. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 8 | «означає Первинна Мати.» | «означає Первинну Матір.» |
| 2 | 22 | «Ми муситимемо зробити ось це» | «ми муситимемо зробити ось це» |
| 3 | 34 | «грізне завдання» | «надзвичайно складне завдання» |
| 4 | 37 | «про Них говорять так» | «про них говорять так» |
| 5 | 37 | «Тобто Вони інкарнувалися» | «Тобто вони інкарнувалися» |
| 6 | 54 | «бо ви Реалізовані душі» | «бо ви реалізовані душі» |
| 7 | 84 | «Стуті» означає хвала. | «Стуті» означає хвалу. |

### Verified Clean (no findings)
- Shri Mataji's pronouns are uppercase throughout (Я/Мені/Мене/Мій/Моя/Моєї/Мого/Моїм), including in the editorial note in ¶27 («Її чоловіка»).
- Singular Incarnations and Deities are capitalized consistently: Socrates, Abraham, Moses, Christ, Mohammad, Nanaka, Narasimha, Indra, Parashurama, Athena, Mother of Mercy (Він/Його/Йому/Ним/Який/Себе/Собі/Своїми; Вона/Її).
- Ordinary people are lowercase: Hiranyakashipu, Prahlad («яку я зробив»), Alexander, Hitler, Vasco da Gama. Hiranyakashipu's saintly wife is also lowercase («щоб врятувати її»).
- Glossary terms are as listed: Сахаджа Йоґа / в Сахаджа Йозі, сахаджа йоґи/йоґів/йоґами, Пуджа, Аді Шакті, Набхі чакра, Маніпура, Вішуддхі, Сахасрара, Свадхістхана, Аґія, Кундаліні, Махакалі/Махасарасваті/Махалакшмі, Ґанеша (gen. Ґанеші), сваямбху, Дхарми, Інкарнація, лівосторонній/правосторонній, десять заповідей, Калі Юга (loc. Калі Юзі), Парашурама, Шрі Рама, Нарасімха, Брахмадева, асура, ґани, ґуру, ашрам, Реалізація, стан усвідомлення без думок, стан без думок, сприятливість, Будда, Авраам, Мойсей, Мохаммед, Пурани, Афіна, Ґреґуар (corpus spelling).
- Language names are lowercase (¶4 «англійська», ¶9 «англійською»).
- The closing blessing «Нехай Бог благословить вас!» (¶62, ¶80) matches EN "May God bless you!", which has no "all", so «вас» is correct.
- The translator additions in square brackets (¶19 «[були]», ¶20 «[вони]», ¶22 «[люди]», ¶56 «[хто]») are minimal and correctly placed, as the fidelity rule requires. The spoken roughness is kept as spoken: the broken-off sentences in ¶18, ¶44, ¶56 and ¶82, «(Єремії) (Левит?)» in ¶17, and «Нанака» in ¶57.

## Summary

- Language (L): 6 issues found, 3 approved by Critic
- SY Domain (S): 7 issues found, 4 approved by Critic
- Total corrections applied: 7
