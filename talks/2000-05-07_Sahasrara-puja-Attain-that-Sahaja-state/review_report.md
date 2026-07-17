# Language Review – 2000-05-07_Sahasrara-puja-Attain-that-Sahaja-state, 2026-07-17

## Process

2 parallel reviewers (L – Language, S – SY Domain) + 1 Critic filter, run on the
full paragraphed `transcript_uk.txt` against `transcript_en.txt`, the glossary
(`terms_lookup.yaml`, `terms_context.yaml`) and `glossary/CLAUDE.md`, per
`templates/language_review_template.md`. Paragraph numbers refer to line numbers
in `transcript_uk.txt` (one paragraph per line; the talk body starts at line 7).

This is a third pass. Earlier reviews (2026-05-30, 2026-06-20) applied
character-level normalization (en-dashes, `«»`, `’`) and the genitive fix
«хіті» → «хоті» (¶44) — all re-verified and confirmed in place. One verdict from
the 2026-06-20 pass is overridden here (see Critic L10); its other Remove
verdicts (¶11 «?», «Страшний Суд», «пуджа мурті») are re-examined and upheld.

**Programmatic character audit (current file):** no double spaces, no space
before punctuation, quotes `«»` only (balanced; nested `«…«…»»` in ¶23 correct),
apostrophes `’` (U+2019) throughout, dashes ` – ` (U+2013) with spaces, ellipsis
`...` without preceding space. The only Latin token is the deliberate channel
name «Star» (¶23), plus the Devanagari gloss निनद् (¶36) mirroring the source.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7 | Nonstandard word form: adjective «невігласний» is not attested (СУМ/ВТССУМ have only the noun «невіглас») | «вони були вкрай **невігласними** людьми – щодо самих себе» | «вони були вкрай **необізнаними** людьми» |
| L2 | 12 | Wrong preposition variant: «зі» is used before consonant clusters (зі свого, зі школи); before «Сау-» (single consonant + vowel) the norm is «із»/«з» | «описувати Мене **зі** «Саундар’я Лахарі»» | «описувати Мене **із** «Саундар’я Лахарі»» |
| L3 | 12 | Missing comma at the junction of conjunctions «що якщо» (no correlate «то» follows; the inner clause can be dropped without restructuring) | «люди були такими, що**_** якщо скажеш їм щось подібне, вони відвернуться» | «такими, що**,** якщо скажеш їм щось подібне, вони відвернуться» |
| L4 | 19 | Aspect/tense mismatch in the «щойно…» conditional: present imperfective + future perfective | «щойно Кундаліні **підіймається**, вони автоматично відмовляться» | «щойно Кундаліні **підійметься**, вони автоматично відмовляться» |
| L5 | 21 | Extra comma before a single «і» joining two homogeneous subordinate clauses sharing one «якщо» | «Якщо кожен має те саме відображення**,** і воно пробуджене, тоді» | «…те саме відображення і воно пробуджене, тоді» |
| L6 | 21 | Missing comma at the junction of conjunctions «бо якщо» (no «то» follows) | «дуже складним, бо**_** якщо ви йдете одним шляхом» | «дуже складним, бо**,** якщо ви йдете одним шляхом» |
| L7 | 23 | Missing comma before the concessive clause «хоч би що…», which must be set off on both sides | «і після того**_** хоч би що він зі Мною говорив, він ніколи цього не опублікував» | «і після того**,** хоч би що він зі Мною говорив, …» |
| L8 | 24 | Missing comma at the junction of conjunctions «що якщо» (no «то» follows) | «Я кажу, що**_** якщо люди досягають Істини» | «Я кажу, що**,** якщо люди досягають Істини» |
| L9 | 29 | Spelling: the normative noun from «дарувати» is «дарування» | «І це **даровання** радості теж невимушене» | «І це **дарування** радості теж невимушене» |
| L10 | 31 | Attributive active present participle in -юч- with a dependent complement — non-normative in literary Ukrainian | «Він наче **переважаюча** своєю любов’ю людина.» | «Він наче людина, **яка переважає** своєю любов’ю.» |
| L11 | 50 | Doubled predicative marker «якими… такими» within one clause | «те, **якими** вони були **такими** милими, такими добрими і такими шанобливими» | «те, **що** вони були такими милими, …» |
| L12 | 11 | Question mark closing an indirect clause («про те, як…») | «про те, як вони можуть отримати Самореалізацію**?**» | «…Самореалізацію**.**» |
| L13 | 21 | «слідувати цьому» reads as a calque | «вони намагатимуться слідувати цьому» | «вони намагатимуться дотримуватися цього» |
| L14 | 13 | «впадали в напади» is a non-idiomatic calque of "get into fits" | «тож вони впадали в напади і в усілякі проблеми» | «тож у них траплялися напади й усілякі проблеми» |
| L15 | 32 | Agreement anacoluthon: «ті… має вічну природу» | «ті, хто є реалізованими душами, хоч би що вони творили, має вічну природу» | «…хоч би що вони творили, це має вічну природу» |
| L16 | 49 | Redundant resumptive pronoun after relative «який» | «темперамент, який ви маєте зрозуміти і шанувати **його**» | «темперамент, який ви маєте зрозуміти і шанувати» |
| L17 | 49 | Accusative after «це» in a predicative construction | «Що ви маєте відчувати – це **ту вдячність**» | «…це **та вдячність**» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 13 | «пуджа» lowercase vs. the «Пуджа» uppercase rule | «Це не якась там **пуджа** мурті (статуї)» | «…**Пуджа** мурті (статуї)» |
| S2 | 28 / 32 / 35 | Inconsistent term form: «сахаджа авастха» (¶28) vs «сахаджавастха» (¶32, ¶35) | «У стані «сахаджа авастха»» / «досягли тієї сахаджавастхи» | unify to one form |
| S3 | 3, 6 | «Кабелла-Ліґуре» vs corpus-majority «Кабелла-Лігуре» (10 vs 5 occurrences) | «Кампус, Кабелла-Ліґуре (Італія)» | «Кабелла-Лігуре» |
| S4 | 18 | «Страшний Суд» — general orthographic norm capitalizes only the first word | «Це **Страшний Суд**.» | «Це **Страшний суд**.» |

**Verified with no findings:** deity-pronoun capitalization is correct
throughout — Shri Mataji's pronouns consistently uppercase (Я/Мене/Мені/Мною/
Мій/Моя/Мої; others addressing Her: ¶12 «хто **Вона**!», ¶46 «**Мамо**, як
**Ти** могла…»), while the ego-«я» (¶30), the physical «я» (¶20) and Kabir's
first-person «я» (¶49 — saint-poet, not an Incarnation) are correctly lowercase.
Glossary terms all match: Сахасрара, Кундаліні, Сахаджа Йоґа (locative «в
Сахаджа Йозі», instrumental «Сахаджа Йоґою», genitive «Сахаджа Йоґи»), сахаджа
йоґ/йоґи/йоґів/йоґам (lowercase, hard-stem plural), Пуджа Дурґи, Калі Юга,
прохолодний вітерець, вібрації, одержима, ґуру, его, Дух/Духа, Істина,
Інкарнації, реалізовані душі (lowercase generic, per glossary), Тур’я, Кабір,
Аді Шакті, Царство Боже, Абсолютне Знання, Океан Вічності. Language names
lowercase (англійська; «санскритом», sentence-initial «Санскритом» ¶28 correct).
Closing blessing matches the fixed phrase exactly: «Нехай Бог благословить усіх
вас.» (period per original).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine lexical error: «невігласний» is not in the dictionaries (only the noun «невіглас»); «необізнаними» also collocates with the following «щодо…» |
| L | L2 | **Keep** | Euphony norm violation, not a preference: «зі» requires a following consonant cluster; before «Сау-» only «із»/«з» are standard |
| L | L3 | **Keep** | Codified punctuation rule (comma between adjacent conjunctions when no «то» follows), not a style option |
| L | L4 | **Keep** | Real aspect mismatch; «підійметься … відмовляться» restores the future-conditional concord the sentence intends («Я знала: щойно…») |
| L | L5 | **Keep** | Codified rule: homogeneous subordinate clauses joined by a single «і» take no comma |
| L | L6 | **Keep** | Same codified rule as L3 |
| L | L7 | **Keep** | Concessive «хоч би що…» clause must be comma-delimited; without the comma the sentence misparses («після того хоч би що…») |
| L | L8 | **Keep** | Same codified rule as L3 |
| L | L9 | **Keep** | Clear spelling error; normative form «дарування» |
| L | L10 | **Keep** — overrides 2026-06-20 Remove | The prior pass rejected a rewrite that changed the lexeme; this minimal fix keeps «переважає своєю любов’ю» (sense and register intact) and only converts the non-normative attributive -юч- participle with a dependent complement into a relative clause — the standard editorial remedy |
| L | L11 | **Keep** | «якими… такими» double-marks the predicative — ungrammatical in any register; minimal fix «якими» → «що» |
| L | L12 | Remove | False positive (upheld from 2026-06-20): mirrors the source's own free-indirect rhetorical question ("…as to: how they can get Self-realisation?") — deliberate oral style |
| L | L13 | Remove | Style preference: «слідувати» is dictionary-attested (colloquial); not an error |
| L | L14 | Remove | Spoken-register calque mirroring "get into fits"; meaning clear, rewrite not required |
| L | L15 | Remove | The anacoluthon exists in the English original ("those who are Realised-souls, whatever they create, is of eternal nature"); preserving oral syntax is intended |
| L | L16 | Remove | Mirrors the source's own trailing pronoun ("which you have to understand, and respect it"); oral anacoluthon, not an error |
| L | L17 | Remove | Defensible ellipsis («[ви маєте відчувати] ту вдячність»); the accusative is grammatically motivated |
| S | S1 | Remove | False positive (upheld): generic dismissive use ("some sort of the murti puja"), matching the source's lowercase; the uppercase rule targets named ceremonies, which are correctly capitalized in the text (Сахасрара Пуджа, Пуджу Дурґи) |
| S | S2 | Remove | Faithful to the source, which itself alternates ('sahaja avastha' ¶28 vs 'sahajavastha' ¶32/¶35); not a translation inconsistency |
| S | S3 | Remove | The file is internally consistent (both occurrences «Ліґуре»); the corpus itself is split 10:5, so harmonization is a corpus-level decision outside a single-talk review |
| S | S4 | Remove | Upheld from 2026-06-20: mirrors the source («Last Judgment») and the translation's reverential capitalization of sacred concepts (Океан Вічності, Царство Боже, Абсолютне Знання); corpus is split 3:3 and the glossary is silent. Recommend a future glossary ruling |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 7 | вкрай невігласними людьми | вкрай необізнаними людьми |
| 2 | 12 | описувати Мене зі «Саундар’я Лахарі» | описувати Мене із «Саундар’я Лахарі» |
| 3 | 12 | були такими, що якщо скажеш їм щось подібне | були такими, що, якщо скажеш їм щось подібне |
| 4 | 19 | щойно Кундаліні підіймається, вони автоматично відмовляться | щойно Кундаліні підійметься, вони автоматично відмовляться |
| 5 | 21 | те саме відображення, і воно пробуджене, тоді | те саме відображення і воно пробуджене, тоді |
| 6 | 21 | дуже складним, бо якщо ви йдете одним шляхом | дуже складним, бо, якщо ви йдете одним шляхом |
| 7 | 23 | і після того хоч би що він зі Мною говорив | і після того, хоч би що він зі Мною говорив |
| 8 | 24 | Я кажу, що якщо люди досягають Істини | Я кажу, що, якщо люди досягають Істини |
| 9 | 29 | І це даровання радості | І це дарування радості |
| 10 | 31 | Він наче переважаюча своєю любов’ю людина. | Він наче людина, яка переважає своєю любов’ю. |
| 11 | 50 | те, якими вони були такими милими | те, що вони були такими милими |

## Summary

- Language (L): 17 issues found, 11 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: **11**

The translation remains of very high quality: SY terminology, deity-pronoun
capitalization and glossary consistency required no changes. All applied
corrections are hard orthography/grammar/punctuation fixes; source-mirroring
oral syntax and reverential capitalization were deliberately left untouched.
