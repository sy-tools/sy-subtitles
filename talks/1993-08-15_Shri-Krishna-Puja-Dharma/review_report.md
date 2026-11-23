# Language Review – Shri-Krishna-Puja-Dharma, 1993-08-15

## Process

Reviewed `transcript_uk.txt` (84 lines; paragraph numbers below are file line numbers) against `transcript_en.txt`, following `templates/language_review_template.md`. Two reviewers (L and S) went through the text, then a Critic filter checked every finding against `glossary/AGENTS.md` (including "Fidelity to the Spoken Original") and the precedents set in earlier review reports in the corpus.

Automated checks run first, with no findings:
- No Latin letters inside Cyrillic words. The only Latin text is the quoted English word «thought» in ¶54–55, which is intentional.
- No `„"`, `""`, `“”` or `‘` quotes. Every quotation, nested ones included, uses `«»` (e.g. ¶54 `«…слово на кшталт «thought», ви мусите сказати «thought»»`).
- No hyphen-as-dash and no em-dash (U+2014). Every dash is a spaced en-dash ` – `.
- Every apostrophe is `’` (U+2019): п’ять, Об’єднаних, розв’язані, пам’ятає, мадхур’я.
- No double spaces, no space before punctuation, and no invisible characters (NBSP, ZWSP, BOM, soft hyphen).
- The two ellipses (¶30, ¶33) are `...` with no space before them, matching the English `…` breaks.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 41 | Euphony: the preposition «з» starts a sentence before «С». The orthography rule calls for «із» here, and the text itself writes «із Саддамом Хусейном» (¶21) and «із гопіями» (¶21) | «**З** Сахаджа Йоґою їхня Дхарма пробудиться» | «**Із** Сахаджа Йоґою їхня Дхарма пробудиться» |
| L2 | 43 | Extra comma before the single closing «і» in a list of homogeneous predicates (ходять…, роблять…, і повертаються…) | «Тож вони ходять до церкви, роблять усе**,** і повертаються додому з тими самими ідеями» | «…роблять усе і повертаються додому…» |
| L3 | 16 | Comma before a single «і» joining two homogeneous predicates | «…брат матері, був Камса**,** і був такою поганою людиною» | «…був Камса і був такою поганою людиною» |
| L4 | 26 | Active present participle in -уч- («процвітаючий»), which the norm discourages | «таку величезну, прекрасну, багату, **процвітаючу** країну» | «…багату, **квітучу** країну» |
| L5 | 64 | Active present participle in -юч- | «своєю **всепрощаючою** натурою» | «своєю **всепрощенною** натурою» |
| L6 | 41 | Euphony: «з» before «ц» | «Моя турбота про Америку – саме **з** цієї причини» | «саме **із** цієї причини» |
| L7 | 71 | Rare imperfective form | «На цьому все **скінчується**» | «На цьому все **закінчується**» |
| L8 | 17 | Nominative predicate after past-tense «був» (instrumental preferred) | «Він був Шрі **Крішна**, а ми ні» | «Він був Шрі **Крішною**…» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 61 | Emphatic pronoun for Shri Mataji is lowercase. The text capitalizes reverential reflexive and emphatic forms for the Divine everywhere else («бере це на **Себе**», «**Свого** життя», «у **Своїй** невинності»), and the corpus convention is «Сама» for Shri Mataji (46 uses vs 21) | «Я багато разів **сама** використовувала її» | «Я багато разів **Сама** використовувала її» |
| S2 | 80 | «Вірат» (3×) sits beside «Вірата» (¶77, ¶80); the glossary form is «Вірата» | «Вірата проявляється… що Він – **Вірат**, і **Вірат** – це ваш мозок… – це **Вірат**» | «Вірата» throughout |
| S3 | 8 | Relative pronoun for Shri Vishnu is capitalized | «бо Він – це Вішну, **Який** перебуває у Войді» | «…Вішну, **який** перебуває…» |
| S4 | 43 | «Церква» is capitalized in the name of a denomination | «ця Католицька **Церква**» (2×) | «Католицька **церква**» |

Checked by Reviewer S and found correct:
- **Shri Mataji's pronouns** are uppercase everywhere: Я, Мені, Мене, Мною, Моєму («в Моєму серці», ¶51), «зі Мною» (¶62, ¶72). She is addressed as «Ви» (¶62 Gagangiri, ¶72 the Brazilian official) and as «Матінко» (¶29).
- **Other speakers' first person** is lowercase in their quotations:
  - ¶27 the dharmic person
  - ¶57 Babamama's song «на мої очі»
  - ¶62 Gagangiri
  - ¶71 the woman
  - ¶72 the official
  - ¶74 the beggar
  - ¶76 the accuser
  - ¶80 the indulgent person
- **Incarnations' pronouns** are uppercase: Shri Krishna and Shri Vishnu (Він/Його/Йому/Свій/Себе, Той, Хто), Christ (¶11 «і Він каже»), Shiva (¶16 «у Своїй невинності») and the Prophet Mohammed (¶19, «Він не говорив…»). Regular people are lowercase: Kansa («не пощадив його», ¶16), Lincoln (¶32), Columbus (¶33), the servant (¶46), Gagangiri (¶62) and the official (¶72).
- **Glossary terms:**
  - Вішну, Войд, Набхі, Дхарма (uppercase as a noun in all 30 uses; the adjective дхармічний is lowercase)
  - десять Ґуру vs фальшиві ґуру (lowercase), десять заповідей
  - Гокул, гопії/гопи, Калія, Путна, Кубера, Ліла / Ліладхара, Сакші Сварупа, ракшаси, Шрі Рама
  - Кундаліні, Сушумна, Махалакшмі, Вішуддхі чакра, права/ліва Вішуддхі and ліва сторона (lowercase side, as in the corpus)
  - мадхур’я (accusative мадхур’ю, as in the corpus), Сахасрара, карми
  - Сахаджа Йоґа (Йоґи/Йоґою), сахаджа йоґ/йоґи/йоґами (lowercase, plural in -и)
  - Реалізація, реалізовані душі (lowercase, as in the English), Царство Боже, Дух, Істина, Божественний
  - «Нехай Бог благословить вас!» (the English has no "all", so «усіх» is correctly absent)
- **Transliteration:** ґлані, Ґаґанґірі (Sanskrit g → ґ), санньясі (as in the corpus), Камса (as in the corpus), Баба Мама.
- **Language names** are lowercase («англійську», ¶54).
- **Translator's additions** in square brackets are well formed («[їх]», «[місцевих жителів]», «[вірні]», «[зі] Шрі Крішною [на цьому] кінець», «[покарані]»).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | The sentence opens with «з» directly before «С». This is the same case as the precedent where «З собою» at sentence start became «Із собою» and the Critic kept it. The text also uses «із» before sibilants elsewhere («із Саддамом», ¶21), so this is an internal inconsistency as well. |
| L | L2 | **Keep** | A genuine punctuation error. In a closed list of homogeneous predicates joined by a single closing «і» («ходять…, роблять…, і повертаються…»), Ukrainian puts no comma before «і». The comma copies the English layout. |
| L | L3 | Remove | «і був такою поганою людиною» adds a further characterization (приєднувальне «і до того ж») after a long subject with appositions, and the repeated «був» marks it as a separate statement. The comma is acceptable here. |
| L | L4 | Remove | Style preference. «процвітаючий» is attested in dictionaries; the -уч- objection is a stylistic recommendation, not an orthographic error. |
| L | L5 | Remove | Style preference, for the same reason as L4. «всепрощаючий» is in common, attested use. |
| L | L6 | Remove | Corpus precedent («з Самості», «з середини»): «з» after a word ending in a vowel is acceptable. This is a recommendation, not an error. |
| L | L7 | Remove | «скінчуватися» (imperfective of «скінчитися») is a valid dictionary verb, so «скінчується» is correct. Replacing it would be a style choice. |
| L | L8 | Remove | A nominative predicate with «бути» («був Шрі Крішна») is acceptable in Ukrainian. Also, the line contrasts the name itself ("He was Shri Krishna, we are not"). |
| S | S1 | **Keep** | The rule is that Shri Mataji's pronouns are always uppercase. This text consistently capitalizes the reverential reflexive and emphatic forms for the Divine, so the lone lowercase «сама» for Shri Mataji is an inconsistency. That matches the corpus precedent, where the Critic kept capitalizing «Самі/Сама» for Shri Mataji for internal consistency. |
| S | S2 | Remove | The two forms copy the English transcript, which itself writes "Viraata" (¶77, ¶80) and "Viraat" (¶80). The corpus has both «Вірат» and «Вірата», including the reviewed talk 1993-10-10, which also follows "Virat"/"Virata". It is a transliteration variant of the same name, not a terminology error. |
| S | S3 | Remove | False positive. Uppercase relative pronouns for an Incarnation are consistent with «Той, Хто» throughout the text. The corpus precedent (1982-05-05, «Крішна, Який») kept the capital form. |
| S | S4 | Remove | Corpus convention: «Католицька Церква» is capitalized in every corpus occurrence, matching the English "Catholic Church". A style choice, not an error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 41 | «З Сахаджа Йоґою їхня Дхарма пробудиться» (euphony at sentence start before «С») | «Із Сахаджа Йоґою їхня Дхарма пробудиться» |
| 2 | 43 | «роблять усе, і повертаються додому» (extra comma before the closing «і») | «роблять усе і повертаються додому» |
| 3 | 61 | «Я багато разів сама використовувала її» (lowercase emphatic pronoun for Shri Mataji) | «Я багато разів Сама використовувала її» |

## Summary

- Language (L): 8 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 3

All three approved corrections were applied to `transcript_uk.txt` before this report was written. Overall the translation is of high quality: orthography, quotation and dash style, apostrophes, deity-pronoun capitalization, and glossary terminology are consistent across all 84 lines. Rough spots carried over from the spoken original are kept, as the fidelity rule requires: ¶16 «Одна якість, яку Він має… – це прощення. Він не вірив у прощення», ¶56 «чхаєте» for "sneezing", and ¶80 the shift from «Той, хто» to «ви».
