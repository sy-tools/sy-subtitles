# Language Review – You-all-are-Shri-Kalki, 1977-11-01

Reviewed file: `transcript_uk.txt` (574 lines), checked against `transcript_en.txt`,
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.
"Paragraph" = line number in `transcript_uk.txt`.

## Process

- **Reviewer L** – orthography, grammar, punctuation (spelling, word forms, case/gender
  agreement, verb forms, commas, quotes `«»`, dashes ` – `, ellipsis `...`, spacing).
- **Reviewer S** – SY domain (deity pronouns, glossary terms, spiritual-term capitalization,
  language names, consistency).
- **Critic** – filtered both tables; removed false positives and style preferences.

Mechanical checks (all clean, nothing to fix): no mixed Latin/Cyrillic words (the only
Latin token is `ESP`, which the source uses); no `"` `„` `“` `”` quotes; no hyphen or em dash
used as a dash; only U+2019 apostrophes; no double spaces; no space before punctuation; no
`…` character. Nested quotes use `«»` correctly. Lowercase first-person pronouns inside Shri
Mataji's speech all turned out to be quotes of other people, so they are correct. Language
names (англійська, італійська, гінді, санскрит) are lowercase throughout.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 33 | Ungrammatical predicate (`було` + finite future verb) | «моє серце було ніби от-от розірветься» | «моє серце ніби от-от мало розірватися» |
| 2 | 33 | Extra comma between homogeneous predicates joined by a single `і` | «вони так збудилися від цього, і почали текти» | «вони так збудилися від цього і почали текти» |
| 3 | 40 | Incomplete subordinate clause (`до того, як` has no verb) – reads as "before Mahavishnu [did something]"; EN: "made thousands of years before as Mahavishnu" | «Воно було створене за тисячі й тисячі років до того, як Махавішну.» | «Воно було створене як Махавішну за тисячі й тисячі років до того.» |
| 4 | 55 | Russianism (Ukr. `одіяння`) | «пошив собі всіляких одеянь» | «одіянь» |
| 5 | 426 | Russianism (Ukr. `одіяння`) | «Ті, хто носить такі одеяння» | «такі одіяння» |
| 6 | 216 | Semicolon before a direct question (needs colon) | «Ти маєш сказати; що тебе зупиняє?» | «Ти маєш сказати: що тебе зупиняє?» |
| 7 | 309 | Gender agreement: resumptive pronoun after dash must agree with `час` (m.) | «Час – воно просто підказує вам» | «Час – він просто підказує вам» |
| 8 | 320 | Wrong government: `перейматися` takes instrumental, not `про` + acc. | «не доведеться перейматися ні про кого» | «не доведеться турбуватися ні про кого» |
| 9 | 329 | Lexical calque: `художній` describes works/objects, not a person ("he is artistic") | «Він художній.» | «Він артистичний.» |
| 10 | 499 | Same calque as #9 | «Ви стаєте дуже художніми.» | «Ви стаєте дуже артистичними.» |
| 11 | 395 | Spelling: Ukr. `священик` (one н) | «Хіба вони священники?» | «Хіба вони священики?» |
| 12 | 403 | Non-existent verb form (perf. `зарізати` → `заріжете`) | «вводите бадху в буйвола й зарізаєте його» | «й заріжете його» |
| 13 | 452 | Mixed indirect/direct speech: `що` + colon before a direct quote | «сказав Мені, що: «Вони сказали мені…» | «сказав Мені: «Вони сказали мені…» |
| 14 | 473 | Double punctuation `?;` | «хто була «Ра»?; Радха була…» | «хто була «Ра»? Радха була…» |
| 15 | 554 | Gender agreement: addressee is the female newcomer (answer: «Ще одна новачка: Шіла») | «Як тебе звати? Ти Мені так і не сказав.» | «…так і не сказала.» |
| 16 | 32 | Mood mix (indicative + imperative) | «Ви намагаєтеся це робити, збільшуйте цю ділянку» | «Намагайтеся це робити, збільшуйте…» |
| 17 | 418 | Euphony у/в between consonants | «Він вчить вас.» | «Він учить вас.» |
| 18 | 379 | Euphony із/зі before з + consonant | «Із звичайних людей» | «Зі звичайних людей» |
| 19 | 90 | Participle form | «він заблуканий тип» | «заблукалий» |
| 20 | 470 | Infinitive form | «не можуть розіп’ясти Мене» (×2) | «розіп’яти» |
| 21 | 135 | Awkward intensifier | «Дуже чудово.» | «Чудово.» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 33 | Polite capital `Ви` used for a regular person: the yogini is talking to the singer (next line: «Співачка: Це довгий твір») | «Так, що довше Ви співали» | «що довше ви співали» |
| 2 | 28 | Інкарнація – uppercase (Divine Incarnations) | «настільки про інкарнації» | «про Інкарнації» |
| 3 | 383 | Інкарнація – uppercase (×2) | «це нова інкарнація… Це десята інкарнація Шрі Вішну» | «нова Інкарнація… десята Інкарнація Шрі Вішну» |
| 4 | 385 | Інкарнація – uppercase | «Ви – інкарнація Вішну» | «Ви – Інкарнація Вішну» |
| 5 | 467 | Інкарнація – uppercase | «щодо інших інкарнацій» | «щодо інших Інкарнацій» |
| 6 | 467 | Incarnations plural mid-sentence must be lowercase | «на якому ви були, Вони могли розповісти» | «…, вони могли розповісти» |
| 7 | 139 | Стопи – uppercase (Shri Mataji's Feet) | «біля Моєї стопи» | «біля Моєї Стопи» |
| 8 | 295 | Стопи – uppercase (Shri Mataji's Feet) | «під Мою стопу» | «під Мою Стопу» |
| 9 | 478 | Стопи – uppercase (Radha's and Shri Mataji's Feet, ×3) | «ставила в неї Свої стопи… коли Я ставлю Свої стопи у воду… Вона ставила Свої стопи в ріку Ямуну» | «Свої Стопи» (×3) |
| 10 | 42 | Glossary: Rudra → Рудра (capital; corpus has 58 capitalized hits) – ×3 | «одинадцять рудр. Одинадцять рудр… Одинадцять рудр» | «одинадцять Рудр» (×3) |
| 11 | 40 | Glossary: Pranava → Пранава | «створене з «пранави»» | «з «Пранави»» |
| 12 | 40 | Glossary: Omkara → Омкара | «Через вібрації [гінді] омкара.» | «[гінді] Омкара.» |
| 13 | 120, 126 | Glossary: Aarti → Аарті (×2) | «записане аарті»; «чи аарті?» | «Аарті» |
| 14 | 344 | Glossary: Chitta → Чітта | «Своєю чіттою, тобто увагою» | «Своєю Чіттою» |
| 15 | 336 | Terminology – possession (одержимість): EN "You possess yourself also sometimes" (context: "Ego is also another possession"); «опановувати себе» means "to master oneself", the opposite | «Ви іноді й самі себе опановуєте.» | «Ви іноді й самі собою одержимі.» |
| 16 | 484 | Markandeya (a sage) capitalized `Він`, while `його` is lowercase in the same sentence | «бо Він так збуджує Мої чакри… співаєте його» | «бо він так збуджує» |
| 17 | 40 | Істина – uppercase? | «Те саме, що істина.» | «Істина» |
| 18 | 435 | Glossary: Shastras → Шастри | «У якій шастрі це написано» | «шастрі» → «Шастрі» |
| 19 | 15 | Speaker attribution: the text after «Сахаджа йоґиня: Не знаю. Дуже мало.» is clearly Shri Mataji's («Ось Я це кажу») | – | Add «Шрі Матаджі:» label |
| 20 | 452, 455 | Capitalized interrogative `Хто` for Shri Mataji | «про Вас, Хто Ви»; «Ось Хто Вона» | «хто» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | `було` with no complement plus a finite future verb is ungrammatical; the fix also matches «мала розірватися» a few sentences later. |
| L | 2 | Keep | Comma rule: no comma between homogeneous predicates joined by a single `і`. |
| L | 3 | Keep | The clause as written means "before Mahavishnu" and has no verb. The fix restores the EN meaning ("made as Mahavishnu"). |
| L | 4 | Keep | `одеяння` is not standard Ukrainian; the standard form is `одіяння` (СУМ). |
| L | 5 | Keep | Same as L4. |
| L | 6 | Keep | A direct question introduced by «сказати» takes a colon; the semicolon was copied from the EN source. |
| L | 7 | Keep | After a dash the pronoun refers back to `час` and must be masculine. |
| L | 8 | Keep | `перейматися про` is non-normative; `турбуватися про` is correct and keeps the meaning. Every other use of `перейматися` in the text already has the correct government. |
| L | 9 | Keep | "Artistic" for a person is `артистичний`; `художній` describes artefacts (¶412 «художньо оздоблений» is correct and was left alone). |
| L | 10 | Keep | Same as L9. |
| L | 11 | Keep | Orthographic dictionary form is `священик`; `священник` is a Russianism. |
| L | 12 | Keep | `зарізаєте` is not a valid form of `зарізати`. |
| L | 13 | Keep | `що` cannot introduce direct speech; the colon alone is correct. |
| L | 14 | Keep | `?;` is not valid Ukrainian punctuation. |
| L | 15 | Keep | The reply comes from «Ще одна новачка: Шіла», so the verb must be feminine (the parallel question in ¶559 to Alfred correctly stays «сказав»). |
| L | 16 | Remove | Follows the EN source ("You try to do it, increase…"); each clause is grammatical, so this is a style choice. |
| L | 17 | Remove | у/в euphony is a recommendation, not a spelling error. Other euphony variants in the text are also left as they are, to stay consistent. |
| L | 18 | Remove | Euphony variant; `із` is acceptable at the start of a sentence. |
| L | 19 | Remove | `заблуканий` is common in literary usage (cf. «заблукана вівця»), so this is not a clear error. |
| L | 20 | Remove | `розіп’ясти` is an attested variant (Грінченко); not an error. |
| L | 21 | Remove | A literal rendering of "Very great"; a style preference. |
| S | 1 | Keep | The singer is a regular person, so lowercase. Shri Mataji did not sing; context confirms it. |
| S | 2 | Keep | Rule: Інкарнація uppercase. The corpus has 112 uppercase hits and this talk was the outlier; ¶485 of the same talk already uses «Інкарнацією». |
| S | 3 | Keep | Same rule. Kalki, the tenth Incarnation of Vishnu, is a Divine Incarnation. |
| S | 4 | Keep | Same rule; it also matches S3. |
| S | 5 | Keep | Same rule; "other incarnations" means Christ and the others. |
| S | 6 | Keep | Explicit rule: Incarnations plural mid-sentence are lowercase. The sentence-initial «Чому Вони…» just before it stays capitalized by position. |
| S | 7 | Keep | Rule: Стопи uppercase for the Feet of the Deity/Mother. The corpus is uniformly «Мої Стопи». |
| S | 8 | Keep | Same as S7. The yogi's own feet («Мої стопи», ¶225; «в стопах», ¶292–293) correctly stay lowercase. |
| S | 9 | Keep | Same as S7 (Radha's and Shri Mataji's Feet). |
| S | 10 | Keep | Glossary form is `Рудра`, and the whole corpus capitalizes it. |
| S | 11 | Keep | Glossary form is `Пранава`, and the corpus capitalizes it. |
| S | 12 | Keep | Glossary form is `Омкара`, and the corpus capitalizes it. |
| S | 13 | Keep | Glossary form is `Аарті`; these were the only lowercase hits in the corpus. |
| S | 14 | Keep | Glossary form is `Чітта`, and the corpus capitalizes it. |
| S | 15 | Keep | A real mistranslation of SY terminology: «опановуєте» reverses the meaning. Glossary: possessed/possession → одержимий/одержимість. |
| S | 16 | Remove | No settled convention: other talks have both «Він міг бачити» and «він жив» for Markandeya, and the EN capitalizes "He". |
| S | 17 | Remove | The EN is lowercase, and "truth" here is listed with love and joy as qualities of holiness, not used as a term. ¶486 «Істині» (EN "Truth") is already uppercase. |
| S | 18 | Remove | A generic "which shastra"; the corpus is mixed (lowercase in other talks too), so this is not a clear error. |
| S | 19 | Remove | The speaker label comes from the EN source transcript, and the translation correctly mirrors it. The capital «Я» already shows the speaker is Shri Mataji. Re-attributing speakers is outside language review. |
| S | 20 | Remove | Devotional capitalization of `Хто` for Shri Mataji is used consistently and is not an error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 28 | про інкарнації | про Інкарнації |
| 2 | 33 | моє серце було ніби от-от розірветься | моє серце ніби от-от мало розірватися |
| 3 | 33 | збудилися від цього, і почали текти | збудилися від цього і почали текти |
| 4 | 33 | що довше Ви співали | що довше ви співали |
| 5 | 40 | Воно було створене за тисячі й тисячі років до того, як Махавішну. | Воно було створене як Махавішну за тисячі й тисячі років до того. |
| 6 | 40 | з «пранави» | з «Пранави» |
| 7 | 40 | [гінді] омкара | [гінді] Омкара |
| 8 | 42 | одинадцять рудр (×3) | одинадцять Рудр (×3) |
| 9 | 55 | всіляких одеянь | всіляких одіянь |
| 10 | 120 | записане аарті | записане Аарті |
| 11 | 126 | чи аарті? | чи Аарті? |
| 12 | 139 | біля Моєї стопи | біля Моєї Стопи |
| 13 | 216 | Ти маєш сказати; що тебе зупиняє? | Ти маєш сказати: що тебе зупиняє? |
| 14 | 295 | під Мою стопу | під Мою Стопу |
| 15 | 309 | Час – воно просто підказує | Час – він просто підказує |
| 16 | 320 | перейматися ні про кого | турбуватися ні про кого |
| 17 | 329 | Він художній. | Він артистичний. |
| 18 | 336 | Ви іноді й самі себе опановуєте. | Ви іноді й самі собою одержимі. |
| 19 | 344 | Своєю чіттою | Своєю Чіттою |
| 20 | 383 | нова інкарнація… десята інкарнація Шрі Вішну (×2) | нова Інкарнація… десята Інкарнація Шрі Вішну |
| 21 | 385 | Ви – інкарнація Вішну | Ви – Інкарнація Вішну |
| 22 | 395 | священники | священики |
| 23 | 403 | зарізаєте його | заріжете його |
| 24 | 426 | такі одеяння | такі одіяння |
| 25 | 452 | сказав Мені, що: «Вони… | сказав Мені: «Вони… |
| 26 | 467 | щодо інших інкарнацій | щодо інших Інкарнацій |
| 27 | 467 | на якому ви були, Вони могли розповісти | на якому ви були, вони могли розповісти |
| 28 | 473 | хто була «Ра»?; Радха | хто була «Ра»? Радха |
| 29 | 478 | Свої стопи (×3) | Свої Стопи (×3) |
| 30 | 499 | дуже художніми | дуже артистичними |
| 31 | 554 | Ти Мені так і не сказав. (to Sheela) | Ти Мені так і не сказала. |

## Summary

- Language (L): 21 issues found, 15 approved by Critic
- SY Domain (S): 20 issues found, 15 approved by Critic
- Total corrections applied: 30 approved findings = 36 individual text edits (rows 8, 20 and 29
  above cover several occurrences each), all applied to `transcript_uk.txt`. The line count is
  unchanged (574), and a re-scan confirms that none of the old forms remain.
