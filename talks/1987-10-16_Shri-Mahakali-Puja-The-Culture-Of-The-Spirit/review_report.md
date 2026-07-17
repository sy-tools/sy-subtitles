# Language Review – 1987-10-16_Shri-Mahakali-Puja-The-Culture-Of-The-Spirit, 2026-07-17

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter, per `templates/language_review_template.md`.
Source: `transcript_en.txt`. Rules: `CLAUDE.md`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`.

This is a follow-up pass after the 2026-05-30 review (which fixed «Сахаджа Йоґи» ×2 and «тієї Чайтаньї» — both confirmed correct in the current text).

- **Reviewer L** – Language (Orthography + Grammar + Punctuation)
- **Reviewer S** – SY Domain (Capitalization + Terminology + Consistency)
- **Critic** – filters both tables, keeps only genuine errors

Paragraph numbers (§) below are line numbers of `transcript_uk.txt`.

Mechanical scan (automated): no double spaces, no space before punctuation, quotation marks only `«»`, apostrophe only `’` (U+2019), en-dash ` – ` (U+2013) with spaces throughout (no em-dash), ellipsis `...` without space before, no Latin/Cyrillic mixing inside words. Latin-script tokens are intentional citations: the English wordplay («Germ», «Germinate», §8) and the Marathi quote («Nirgunachya bheti alo sagunashi», §26).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | §9 | Possibly missing dash before predicative «те, що» | «Але основне щодо них те, що вони можуть мислити» | «Але основне щодо них – те, що вони можуть мислити» |
| L2 | §10 | Agreement violation: instrumental singular «Чудовим» with subject «ви» (formal plural) | «Чудовим були ви. Це ви робили всю роботу.» | «Чудовими були ви.» |
| L3 | §19 | Predicate agreement: «розсудливість … вбудоване» (fem. head noun vs. neuter predicate) | «розсудливість, знання розсудливості, вбудоване у вас» | «розсудливість, знання розсудливості, вбудована у вас» |
| L4 | §21 | Questionable relative «чим» opening the subordinate clause | «Ми граємо їм на руку, чим ми не зв’язані, а отримуємо допомогу.» | «Ми граємо їм на руку, і цим ми не зв’язані, а отримуємо допомогу.» |
| L5 | §31 | Incoherent construction «турбота, якою воно має бути» (unclear antecedent of «воно») | «Це головне ставлення, головна турбота, якою воно має бути.» | «Це головне ставлення, головна турбота – такими вони мають бути.» |
| L6 | §33 | Verb-government violation: «опікуватися» requires the instrumental case («ким»), not «про них» | «але ми повинні опікуватися й піклуватися про них» | «але ми повинні опікуватися ними й піклуватися про них» |
| L7 | §37 | Undeclined title in accusative position; the text itself treats the title as declinable («Днями вони її читали») | «Ви всі знаєте Атхарва Шірша, чи не так?» | «Ви всі знаєте Атхарва Шіршу, чи не так?» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | §28 | Saint-name inconsistency: «Намадева» everywhere, but once «Намдевом» | «яка працювала з цим Намдевом» | «яка працювала з цим Намадевою» |
| S2 | §28 | Title «Ґуру Ґрантх Сахіб» not declined in locative position | «їх співають у Ґуру Ґрантх Сахіб» | «їх співають у Ґуру Ґрантх Сахібі» |
| S3 | §33 | Capital letter in common-noun «Йоґи», contrary to glossary and the rest of the text (§25: «ви йоґ», «вони йоґи» lowercase) | «ми йоґіджани, і ми маємо бути як Йоґи» | «ми йоґіджани, і ми маємо бути як йоґи» |
| S4 | §35 | Inconsistent spelling within one paragraph: «Крішнапакша» (one word) vs. «Крішна пакша» (two words) | «Ми називаємо це Крішнапакша… а Крішна пакша [темні 14 днів]» | Unify spelling («Крішна пакша») |

Positive checks (no issues found): Shri Mataji pronouns uppercase throughout (Я/Мені/Мою/Мене/Собі; «Ти, Ти це робиш» when a yogi addresses Mother, §11); Guru Nanak singular uppercase (Він/Собою, §27); Mother Earth uppercase (Вона, §11); regular people lowercase in quotes (я, §10–11, §26, §31); «мати Махакалі» §35 correctly lowercase (verb «to have», not Mother). Language names lowercase (англійська §4, пенджабі/маратхі §27, гінді §36–37, санскритською §35). Terms match the glossary: Пуджа, Дух («культура Духа»), Реалізація, реалізована душа, Кундаліні, Вішуддхі, бандхан, блокується (catching), его, карма/акарма, ґани, ашрам, Дівалі, Мати Земля, Пашупаті, сахаджа йоґ/йоґи lowercase, Сахаджа Йоґа uppercase, родовий «Ґанеші», «Нехай Бог благословить усіх вас!» (fixed phrase). Transliteration with ґ/дх consistent (Ґанапатіпуле, Ґатха, ґурудвари, Ґуру Ґрантх Сахіб, Атхарва Шірша, Свадхістхана-family n/a).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | The dash before «те, що» is optional here; the same construction appears without a dash in §25 («найперше в культурі Духа те, що…») — the text is internally consistent, not an error. |
| L | L2 | Keep | Genuine agreement error: with formal «ви», the instrumental predicate must be plural («Чудовими»). |
| L | L3 | Remove | The predicate agrees with the immediately preceding appositive «знання» (neuter) — acceptable Ukrainian agreement, mirroring the loose source structure («the discretion, the knowledge of discretion, is built…»). |
| L | L4 | Remove | Relative «чим» referring to the whole preceding clause is standard Ukrainian («Він запізнився, чим усіх засмутив»); no correction needed. |
| L | L5 | Remove | The English source is itself elliptical and broken («That’s the main attitude, main concern should be»); the proposed fix invents meaning — keep as a faithful rendering of spoken speech. |
| L | L6 | Keep | Genuine government error: «опікуватися про них» is impossible; with a shared object each verb must take its own form («опікуватися ними й піклуватися про них»). |
| L | L7 | Keep | The title is declinable and the text itself declines it («її читали»); accusative «Атхарва Шіршу» makes the sentence grammatical and consistent with the paragraph. |
| S | S1 | Remove | The English source itself alternates «Namadeva» / «this Namdev»; both are accepted variants of the saint’s name — the translation faithfully mirrors the source. |
| S | S2 | Remove | The multi-word sacred title is consistently treated as indeclinable throughout the text («одну десяту Ґуру Ґрантх Сахіб») — an acceptable and internally consistent convention. |
| S | S3 | Keep | Glossary: «йоґ/йоґи» lowercase as a common noun; §25 of this very text uses lowercase («ви йоґ», «вони йоґи») — unification required. |
| S | S4 | Remove | The source contains the same inconsistency («Krishnapaksha» / «Krishna paksha») — the translation reproduces it faithfully. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | §10 | «Чудовим були ви.» | «Чудовими були ви.» |
| 2 | §33 | «ми повинні опікуватися й піклуватися про них» | «ми повинні опікуватися ними й піклуватися про них» |
| 3 | §33 | «ми маємо бути як Йоґи» | «ми маємо бути як йоґи» |
| 4 | §37 | «Ви всі знаєте Атхарва Шірша» | «Ви всі знаєте Атхарва Шіршу» |

## Summary

- Language (L): 7 issues found, 3 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 4

All 4 approved corrections have been applied to `transcript_uk.txt`.
