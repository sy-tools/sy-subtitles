# Language Review – 1993-05-18_Shri-Fatima-Puja-Women-are-responsible-for-the-society, 1993-05-18

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter, per `templates/language_review_template.md`.

Paragraph numbers below refer to line numbers in `transcript_uk.txt`.

Mechanical pre-checks (all clean): no Latin/Cyrillic mixing, no `„“”"` quotes (only `«»`, nested also `«»`), no straight apostrophes (only `’` U+2019), no spaced hyphens as dashes (only ` – `), no double spaces, no spaces before punctuation, no space before ellipsis, no em-dash `—`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | Inconsistent reduplication style: hyphenated «дуже-дуже» while the rest of the transcript uses «дуже, дуже» (5× — lines 9, 17, 30, 40, 43); EN has "many, many" | «Внаслідок цього дуже-дуже багато молодих чоловіків було вбито.» | «дуже, дуже багато молодих чоловіків» |
| L2 | 17 | Pleonasm: «взаємодоповнюють одне одного» — the prefix «взаємо-» already expresses mutuality duplicated by «одне одного» | «тому що жінки й чоловіки взаємодоповнюють одне одного» | «жінки й чоловіки доповнюють одне одного» |
| L3 | 25 | Same pleonasm as L2 | «ми любимо одне одного, ми взаємодоповнюємо одне одного» | «ми доповнюємо одне одного» |
| L4 | 21 | Agreement error: plural «всі» + singular collective noun «решта» with plural verb — «всі решта думали» is ungrammatical | «І всі решта досі думали, що це прийшла секретарка.» | «І всі інші досі думали, що це прийшла секретарка.» |
| L5 | 42 | Agreement error: «Усіх решти» mixes plural «усіх» with genitive singular «решти» | «Усіх решти не буде: вони не будуть ні мавпами, ні людьми – кінець.» | «Усієї решти не буде» |
| L6 | 16 | Suspected tense mismatch: present «сердиться» followed by past «мовчала» | «Припустімо, він сердиться, – Я мовчала.» | «Припустімо, він сердиться – Я мовчу.» |
| L7 | 28 | Hortative + future coordination «Ходімо й битимемося» reads non-standard | «Ходімо й битимемося з ним.» | «Ходімо битися з ним.» |
| L8 | 15 | Adverb «ісламськи» in «більш ісламськи орієнтованим» looks awkward | «із суспільства, яке було більш ісламськи орієнтованим» | «більш орієнтованим на іслам» |
| L9 | 34 | Asymmetric punctuation around narrator insertion: opening dash without comma, closing «, –» | «…дружині» – це був початок Сахаджа Йоґи, – «що навіть троє…» | symmetric dashes on both sides |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 14, 18 | «шакті» lowercase; `terms_lookup.yaml` lists Shakti → «Шакті» (uppercase) | «ви – шакті, і ніхто не може придушити шакті»; «жінок ніколи не поважали як шакті» | «Шакті» |
| S2 | 37 | «інкарнаціями» lowercase; glossary rule capitalizes «Інкарнація» (Divine Incarnation) | «Звичайно, вони теж були свого роду інкарнаціями» | «Інкарнаціями» |
| S3 | 43 | «істині» lowercase; glossary rule: «Істина/Істини – uppercase (absolute Truth)» | «ви стоїте на істині цнотливості» | «Істині» |
| S4 | 43 vs 8 | Case inconsistency for the Puja name: dative «Пуджа Фатімі Бі» vs genitive «Пуджу Фатіми» (line 8) and title «Пуджа Шрі Фатіми» | «ця особлива Пуджа Фатімі Бі є Пуджею Вішнумайї» | «Пуджа Фатіми Бі» |

Verified as correct (no findings): deity pronoun capitalization for Shri Mataji (Я/Мені/Мене/Мій/Моя/Свого/Себе/Сама, «Ви/Ваша» when addressed) — consistent throughout; Fatima's pronouns uppercase (Вона/Її/Своїх, «де була Вона»); Mohammed «Він» uppercase (Incarnation singular); Ali's pronouns lowercase, mirroring EN; Hassan/Hussein plural «вони» lowercase per rules. Terminology matches the glossary: «Ґруха Лакшмі», «ліва Набхі», «ліва Вішуддхі», «Вішнумайя» (Вішнумайєю/Вішнумайї), «Шрі Ґанеша» with genitive «Ґанеші», «в Сахаджа Йозі» / «Сахаджа Йоґи», «сахаджа йоґ/йоґиня/йоґами» lowercase, «тапас/тапасья», «Дівалі», «Мати Земля» (dative «Матері Землі»), «Пуджа/Пуджі» uppercase, «Мохаммед» per glossary, «блокування» for catches. Language and religion names lowercase («англійська», «санскрит», «іслам», «суніти»); «на Заході» (noun) uppercase vs «західні ідеї» lowercase — both correct. «Ґанеша Стуті» is the correct rendering of "Ganesha Stuthi" (Sanskrit *stuti* has no aspirate). «Нехай Бог благословить вас» matches EN "May God bless you" (no "all").

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine intra-text inconsistency: 5× «дуже, дуже» vs 1× «дуже-дуже»; EN uses comma form "many, many" in this very sentence. Normalize. |
| L | L2 | Keep | Real pleonasm; «доповнюють одне одного» is the standard editorial fix, meaning unchanged. |
| L | L3 | Keep | Same as L2. |
| L | L4 | Keep | Genuine grammatical agreement error; «всі інші» preserves EN "all the rest" meaning. |
| L | L5 | Keep | Genuine agreement error; «Усієї решти не буде» is grammatical and keeps the wording closest to the original. |
| L | L6 | Remove | False positive: past «мовчала» renders EN habitual "I would keep quiet" (repeated past behaviour); «, –» is valid Ukrainian punctuation here. |
| L | L7 | Remove | Trivial: coordination of hortative and future («ходімо й побачимо» type) is attested in living speech; this is a spoken-lecture transcript. |
| L | L8 | Remove | Stylistic preference: adverbs in -ськи without «по-» are normative (рабськи, геройськи, звірськи); meaning is clear and compact, mirrors EN "Islamic-oriented". |
| L | L9 | Remove | Trivial typographic preference; current punctuation mirrors the EN dash structure and is acceptable. |
| S | S1 | Remove | False positive: EN deliberately uses lowercase "shakti" here — generic principle ("you are shakti"), not the Deity name; glossary uppercase applies to the Divine Power aspect (Three Powers of God). Translation correctly follows the original's case. |
| S | S2 | Remove | False positive: «свого роду інкарнаціями» is a generic, hedged plural ("a kind of incarnations"), not a title reference to a specific Divine Incarnation; plural mid-sentence lowercase is consistent with the capitalization rules. |
| S | S3 | Remove | False positive: «істина цнотливості» is a qualified genitive construction ("the truth of chastity"), not the standalone absolute Truth the glossary rule targets. |
| S | S4 | Remove | False positive: the case difference mirrors EN prepositions ("Puja **of** Fatima" vs "Puja **for** Fatima Bi"); dative «Пуджа Фатімі Бі» is grammatical Ukrainian for a puja dedicated to her. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | «дуже-дуже багато молодих чоловіків» | «дуже, дуже багато молодих чоловіків» |
| 2 | 17 | «жінки й чоловіки взаємодоповнюють одне одного» | «жінки й чоловіки доповнюють одне одного» |
| 3 | 21 | «І всі решта досі думали» | «І всі інші досі думали» |
| 4 | 25 | «ми взаємодоповнюємо одне одного» | «ми доповнюємо одне одного» |
| 5 | 42 | «Усіх решти не буде» | «Усієї решти не буде» |

## Summary

- Language (L): 9 issues found, 5 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: 5

All 5 approved corrections have been applied to `transcript_uk.txt`. The translation is of high quality overall: deity-pronoun capitalization, glossary terminology, quotation marks («» at all levels), dashes, apostrophes, and ellipses are consistent throughout; the approved fixes address two grammatical agreement errors, two pleonasms, and one intra-text style inconsistency.
