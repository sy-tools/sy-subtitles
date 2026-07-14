# Language Review – 1990-05-06_Sahasrara-Puja-You-Have-All-Become-Mahayogis-Now, 2026-07-14

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter, per `templates/language_review_template.md`.

- **Reviewer L** – Language (Orthography + Grammar + Punctuation)
- **Reviewer S** – SY Domain (Capitalization + Terminology + Consistency), checked against `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`
- **Critic** – filtered both tables, removed false positives and style-only preferences, resolved conflicts

Paragraph numbers below = line numbers in `transcript_uk.txt` (one paragraph per line; lines 1–4 are the header).

Mechanical pre-checks (whole file): no Latin/Cyrillic mixing, no double spaces, no spaces before punctuation, quotes uniformly `«»`, apostrophe uniformly `’` (U+2019), dash uniformly em-dash with spaces (no style mixing within the transcript), no ellipsis present.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | Wrong genitive case form: «гороскопу» (норма: гороскоп → род. відм. гороскопа; так само вжито в корпусі, напр. розмова 1983-09-17) | «…ми змінюємо наші календарі, що стосується гороскопу» | «…що стосується гороскопа» |
| L2 | 9 | Determiner agreement with compound numeral ending in «один»: «за ці двадцять один рік» (норма радить одн.: «за цей двадцять один рік») | «скільки сил розвинулося у вас усередині за ці двадцять один рік» | «за цей двадцять один рік» |
| L3 | 15 | Non-grammatical quantifier under preposition: «через трохи боягузтва» («через» не сполучається з незмінюваним квантифікатором «трохи») | «…або, можливо, через трохи боягузтва ви приховуєте їх» | «…через певне боягузтво…» |
| L4 | 28 | Collocation calque from EN “take an attitude”: «займете ставлення» («зайняти» сполучається з «позицію/місце», не зі «ставлення») | «Якщо ви займете таке позитивне ставлення, ваша негативність зникне» | «Якщо ви матимете таке позитивне ставлення…» |
| L5 | 28 | Tense: «До Сахаджа Йоґи ми не прив’язані» (теп. час; контекст минулий) | «До Сахаджа Йоґи ми не прив’язані до жодних сімей чи чогось іще» | «…ми не були прив’язані…» |
| L6 | 30 | Collocation: «Усе це "моє" має бути закінчене» (ідіоматично: «з усім цим має бути покінчено») | «Усе це «моє» має бути закінчене передусім!» | «З усім цим «моїм» має бути покінчено передусім!» |
| L7 | 34 | Lexical norm: «рішення проблеми» (рішення = ухвала; розв’язання = solution проблеми/задачі) | «…і дізнаєтеся рішення всієї проблеми» | «…і дізнаєтеся розв’язання всієї проблеми» |
| L8 | 36 | Predicate agreement: «багато хто з вас був одержимими людьми» (одн. «був» + мн. «одержимими людьми»; далі в реченні мн. «стали лідерами і роблять») | «Так багато хто з вас був одержимими людьми, які навіть не могли встояти переді Мною, а тепер стали лідерами» | «Так багато з вас були одержимими людьми…» |
| L9 | 36 | Missing complementizer before subordinate clause: «головне — це скільком людям…» | «але головне — це скільком людям ми даємо Реалізацію» | «але головне — це те, скільком людям ми даємо Реалізацію» |
| L10 | 41 | Euphony (у/в): «у обертанні» — before a vowel-initial word «в» is used regardless of the preceding sound | «скільки залишиться там, у обертанні колеса» | «…там, в обертанні колеса» |
| L11 | 42 | Verb government: «досягти» керує родовим відмінком → relative pronoun must be «якого», not «який» | «Тож це двадцять один аспект, який ви змогли досягти» | «…аспект, якого ви змогли досягти» |
| L12 | 44 | Number agreement: «ви маєте бути… такою людиною, щоб не ставати відразливими» (одн. «людиною» vs мн. «відразливими», далі «ви дивні, чудні люди») | «ви маєте бути, певним чином, у зовнішності, в поведінці, такою людиною, щоб не ставати відразливими» | «…такими людьми, щоб не ставати відразливими» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 24 | Suspected transliteration inconsistency: «до Сахаджа Йоги» (г) vs «Йоґи» (ґ) elsewhere | «прийшли до Сахаджа Йоги заради нашого сходження» | «до Сахаджа Йоґи» |
| S2 | 3, 6 | Place-name transliteration: «Фіуджі» (Fiuggi, іт. [ˈfjuddʒi]; словниково частіше «Ф’юджі») | «Фіуджі (Італія)» | «Ф’юджі (Італія)» |
| S3 | 11 | Capitalization of «Динамічні Сили» (not a glossary term; generic phrase) | «які Динамічні Сили діють у вас тепер» | «динамічні сили»? |

Verified clean (no findings): deity pronouns for Shri Mataji uppercase throughout (Я/Мені/Мого/Мною; Мати/Вона in ¶17, 40, 46; Ти/Тобі addressed to Mother in ¶32); «сахаджа йоґ/йоґи/йоґів» lowercase with correct plural «йоґи» (not «йоґі»); locative «в Сахаджа Йозі» (¶29, 40, 44) per glossary; «Махайоґ/Махайоґи/Махайоґами/Махайоґою» per glossary; «Парамчайтанья/Парамчайтаньї/Парамчайтанью», «Майї», «Вішнумайю», «Аґії», «маріяди», «стан усвідомлення без думок», «прохолодний вітерець», «его» lowercase, «Дух», «Істина/Істину/Істини», «Реалізацію», «сходження» — all per glossary; language names lowercase (¶4); «фальшиві ґуру» lowercase — correct (not the divine Guru); «мати» lowercase in ¶36 (common noun) — correct.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine case-form error; орфографічний словник: гороскоп, -а; corpus already uses «гороскопа». |
| L | L2 | Remove | Disputed norm: with numerals in «…один» both singular and plural determiners are attested; the «fix» is not clearly better. Not a definite error. |
| L | L3 | Keep | «через трохи + род. відм.» is ungrammatical (prepositions do not govern the invariable quantifier «трохи»); minimal idiomatic fix «через певне боягузтво» preserves EN “maybe little cowardice”. |
| L | L4 | Keep | Real collocation error (calque of “take an attitude”); «зайняти ставлення» does not exist in Ukrainian. Minimal fix «матимете». |
| L | L5 | Remove | The EN source itself has the present tense (“Before Sahaja Yoga, we are not attached”); translation faithfully mirrors the spoken quirk. Not a translation error. |
| L | L6 | Remove | Original is grammatical and comprehensible; proposed fix restructures the sentence and changes the quoted «моє». Style preference, not an error. |
| L | L7 | Keep | Standard editorial norm: «розв’язання проблеми» (solution) vs «рішення» (ухвала). Genuine lexical error. |
| L | L8 | Keep | Genuine agreement error; plural harmonizes with the sentence tail («стали лідерами і роблять»). Approved as «Так багато з вас були…» (normative plural with «багато з вас»). |
| L | L9 | Remove | «головне — це + підрядне» without «те» is acceptable in spoken register; adding «те,» is a style preference. |
| L | L10 | Keep | Orthography euphony rule (правопис 2019): «в» before vowel-initial words regardless of preceding sound. |
| L | L11 | Keep | Genuine government error: «досягти» + род. відм. → «якого». |
| L | L12 | Keep | Genuine number-agreement error within one sentence; «такими людьми» is the minimal harmonizing fix. |
| S | S1 | Remove | **False positive.** Byte-level check (hexdump: `d2 91` = ґ) confirms the file already reads «Йоґи»; no occurrence of «Йоги» (plain г) exists in the transcript. Visual ґ/г confusion. |
| S | S2 | Remove | Proper-noun variant used consistently in this talk's title, header and metadata (and the EN-side folder naming); changing the transcript alone would desync files. Out of scope for a language pass. |
| S | S3 | Remove | EN source capitalizes “Dynamic Forces”; translation faithfully mirrors the source's emphasis. Not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 8 | що стосується гороскопу | що стосується гороскопа |
| 2 | 15 | через трохи боягузтва | через певне боягузтво |
| 3 | 28 | Якщо ви займете таке позитивне ставлення | Якщо ви матимете таке позитивне ставлення |
| 4 | 34 | дізнаєтеся рішення всієї проблеми | дізнаєтеся розв’язання всієї проблеми |
| 5 | 36 | Так багато хто з вас був одержимими людьми | Так багато з вас були одержимими людьми |
| 6 | 41 | там, у обертанні колеса | там, в обертанні колеса |
| 7 | 42 | аспект, який ви змогли досягти | аспект, якого ви змогли досягти |
| 8 | 44 | такою людиною, щоб не ставати відразливими | такими людьми, щоб не ставати відразливими |

All 8 corrections applied to `transcript_uk.txt`.

## Summary

- Language (L): 12 issues found, 8 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic (incl. 1 false positive caught by byte-level verification)
- Total corrections applied: 8
