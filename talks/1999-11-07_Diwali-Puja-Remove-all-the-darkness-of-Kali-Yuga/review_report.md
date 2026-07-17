# Language Review – 1999-11-07_Diwali-Puja-Remove-all-the-darkness-of-Kali-Yuga, 2026-07-17

## Process

2 parallel reviewers (L = Language, S = SY Domain) + 1 Critic filter, run on
`transcript_uk.txt` (full paragraphed Ukrainian text), with the English original
`transcript_en.txt` for reference and `glossary/` for terminology/capitalization rules.
Corpus conventions verified by grep across all `talks/*/transcript_uk.txt`.

This is **review round 2** (2026-07-17). Round 1 (2026-06-20) applied 8 corrections,
all present in the current text — its report is preserved in the Appendix below.
Round 2 re-examines the whole text fresh; one round-1 Critic verdict (the ellipsis
character) is reversed here on new corpus evidence.

Paragraph numbers refer to line numbers of `transcript_uk.txt`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Пропущена кома після вставного «може» | «їм має бути щонайменше вісім тисяч років, а може й більше» | «а може, й більше» (пор. р. 20 того ж тексту: «чи, може, приходили сюди, чи, може, через торсіонну область») |
| L2 | 10 | Зайва кома після пояснювального сполучника «тобто» | «Тобто, як вони могли це знати – можливо, через торсіонну область» | «Тобто як вони могли це знати» |
| L3 | 113 | Зайва кома після пояснювального сполучника «тобто» | «Тобто, що вам треба зробити – це, хоч би куди ви йшли» | «Тобто що вам треба зробити» |
| L4 | 28 | Мала літера на початку прямої мови після двокрапки | «щоб дізнатися: «хто ця спокійна пані, яка приїхала?»» | «щоб дізнатися: «Хто ця спокійна пані, яка приїхала?»» |
| L5 | 63, 100, 118, 119, 122 | Односимвольний знак «…» (U+2026) замість трьох крапок «...» — правило проєкту (glossary/CLAUDE.md: Ellipsis `...`, three dots) | «Я не працювала, як…», «це спостерігає…», «…Мета», «Їх цікавите не…», «щось… [??]» | Замінити всі «…» на «...» (5 входжень) |
| L6 | 84, 123 | «не добре» окремо — можливо, разом («недобре») | «Якщо ви не добре володієте вібраціями» | «Якщо ви недобре володієте вібраціями»? |
| L7 | 12 | Милозвучність: збіг «увесь усесвіт» | «тобто, можна сказати, увесь усесвіт» | «увесь всесвіт»? |
| L8 | 86 | Велика літера після тире всередині речення; у версії 2 (р. 124) те саме місце з малої | «і щойно ці сили починають – Бачте, насправді Я мушу сказати» | «– бачте»? |
| L9 | 28, 33, 60, 77, 88 та ін. (7 входжень) | Крапка після «?»» у кінці речення (за правописом після знака питання перед закритими лапками крапку не ставлять) | «Вони скажуть: «Що поганого?».» | Прибрати крапку після лапок? |

**Punctuation sweep (no issues found):** quotation marks are «» at all levels
(no `"`, `""`, `„"`); apostrophe is consistently `’` (U+2019); dashes are en-dash
` – ` with spaces (no `—`); no double spaces; no spaces before `,.;!?`; no
mixed Latin/Cyrillic letters.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 37 | «ґ’яна» суперечить глосарію: родина gyan- послідовно передається через «г’» (Г’янешвара, Г’янадева, г’яні — terms_lookup.yaml, terms_context.yaml); корпусний прецедент для того самого слова: «г’яною, знанням» (1991-02-16_Mahashivaratri-Puja, р. 92) | «що таке справжнє знання, ґ’яна» | «г’яна» |
| S2 | 92, 125 | «ви блокуєте» (catching) — перевірити проти глосарія «catching/catches → блокування» | «ви можете одразу знати, що ви блокуєте» | «у вас є блокування»? |
| S3 | 124 | Коротка форма «Сахадж Йоґи» поруч із домінантною «Сахаджа Йоґа» | «вони б не прийшли до Сахадж Йоґи» | «Сахаджа Йоґи»? |

**Capitalization / terminology sweep (no issues found):**
- Shri Mataji pronouns always uppercase: Я/Мене/Мені/Мій/Моя/Себе/Своїм/Мною (lines 10, 26–29, 53, 62–66, 76–77, 82, 86, 94, 102, 108, 110–115, 119, 130–135); «Ви/Вас/Ти» addressed to Shri Mataji uppercase (29, 63). The generic ego-speaker «я» (75) and the servant «він» (68) correctly lowercase; Nala/Kali dialogue pronouns (47–49) correctly lowercase.
- Deity pronouns for Athena / Primordial Mother / Lakshmi / Mother uppercase: Вона/Себе/Свою/Неї/Та, Хто (11–15, 25, 69, 72–73, 82, 95–96, 122).
- Glossary terms correct and consistent: Дівалі (середній рід послідовно), Калі Юга → Юзі/Югу, Сатья Юзі, Набхі / Набхі чакра, Маніпур двіпа, Кундаліні, Махакалі, Махасарасваті, Махалакшмі, Принцип Лакшмі, Аді Шакті, Афіна, Ґанеша (відмінювання Ґанешу/Ґанеші за глосарієм), сваямбху, Пурани, бхрама/бхранті, ґуру, его (мала), сахаджа йоґ/йоґи/йоґів/йоґом/йоґами (мала літера, тверда основа), Сахаджа Йоґа → Йоґи/Йоґу/Йоґою/Йозі (велика, ґ→з у місцевому), «віддані на милість» (surrender).
- Spiritual terms capitalized per rule: Дух (50, 74, 118), Істина/Істини (39, 41, 46, 50, 52, 100, 106, 128–129), Пуджа (2, 6, 24, 102, 128), Реалізація/Самореалізація (усюди), Дхарма — n/a. Language names lowercase (англійська, українська, гінді, санскрит). Fixed blessing «Нехай Бог благословить усіх вас» (116) exactly per formula; «...благословить вас» (115, 137) matches EN without "all".

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | «може» тут вставне («maybe more»), відокремлюється комами; той самий транскрипт у р. 20 послідовно ставить коми при «може». Виправлення відновлює внутрішню однорідність. |
| L | L2 | **Keep** | Після сполучника «тобто» кома не ставиться (кома лише перед ним). Корпус переважно без коми (157 випадків проти 20). |
| L | L3 | **Keep** | Те саме правило, той самий зворот. |
| L | L4 | **Keep** | Пряма мова після двокрапки починається з великої літери; знак питання й лапки без змін. |
| L | L5 | **Keep** — reverses round-1 verdict | Правило проєкту явно називає форму: «Ellipsis: `...` (three dots...)». Корпусна перевірка: 58 файлів transcript_uk.txt вживають «...» і лише 9 (включно з цим) — «…». Це не «spacing-only» правило, а усталена корпусна конвенція; вирівнюємо. |
| L | L6 | **Remove** | Хибнопозитивне: роздільне написання припустиме як заперечення присудкової групи («не [дуже] добре володієте»); попереднє речення має «не дуже добре володіє» — паралельна конструкція. Не однозначна помилка. |
| L | L7 | **Remove** | Милозвучність — стилістична преференція, «усесвіт» — нормативний варіант. Не помилка. |
| L | L8 | **Remove** | Велика літера віддзеркалює обрив і рестарт речення в оригіналі ("start– You see…"); у версії 2 англійський оригінал має малу ("start– see actually"), і переклад теж. Обидва місця вірні своєму джерелу. |
| L | L9 | **Remove** | Практика корпусу змішана (86 входжень «?».» проти 83 «?»» без крапки); у межах цього транскрипту всі 7 випадків оформлені однаково. Масова правка задля спірного трактування правила зламала б внутрішню однорідність — лишаємо як усталений стиль проєкту. |
| S | S1 | **Keep** | Глосарій передає родину gyan- через «г’» (Г’янешвара, Г’янадева, г’яні), і корпус уже містить «г’яною» для того самого слова gyana (1991-02-16). «ґ’яна» — відхилення від усталеної передачі. |
| S | S2 | **Remove** | Хибнопозитивне: неперехідне «ви блокуєте» — усталений сахадж-узус у корпусі («які центри ви блокуєте», «чи блокуєте ви цей центр», «Чому ви блокуєте?» — кілька промов). Глосарій дає лише іменник «блокування»; дієслівний узус йому не суперечить. |
| S | S3 | **Remove** | Хибнопозитивне: глосарій (terms_context.yaml, Sahaj/Sahaja) прямо дозволяє взаємозамінні форми «сахадж»/«сахаджа»; англійський оригінал версії 2 саме тут має "sahaj yoga"/"Sahaj Yog", і переклад вірно це віддзеркалює (велика літера вже виправлена в раунді 1). |

No conflicts between L and S.

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | «а може й більше» | «а може, й більше» |
| 2 | 10 | «Тобто, як вони могли це знати» | «Тобто як вони могли це знати» |
| 3 | 113 | «Тобто, що вам треба зробити» | «Тобто що вам треба зробити» |
| 4 | 28 | «дізнатися: «хто ця спокійна пані, яка приїхала?»» | «дізнатися: «Хто ця спокійна пані, яка приїхала?»» |
| 5 | 37 | «знання, ґ’яна» | «знання, г’яна» |
| 6 | 63, 100, 118, 119, 122 | «…» (U+2026), 5 входжень | «...» (три крапки) |

## Summary

- Language (L): 9 issues found, 5 approved by Critic
- SY Domain (S): 3 issues found, 1 approved by Critic
- Total corrections applied: 6 (10 changed spots across 10 lines)

Overall: the translation is of very high quality — faithful to the original
(including broken-off phrases and [??] markers in both versions), with consistent
glossary terminology and impeccable deity-pronoun capitalization. Round-2 findings
are pinpoint punctuation fixes and one transliteration alignment with the glossary.

---

## Appendix: Review Round 1 – 2026-06-20 (preserved verbatim)

### Process

2 parallel reviewers (L = Language, S = SY Domain) + 1 Critic filter, run on
`transcript_uk.txt` (full paragraphed Ukrainian text), with the English original
`transcript_en.txt` for reference and `glossary/` for terminology/capitalization rules.

### Results

#### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 39 | Negative pronoun after a preposition must be split by the particle «ні» | «де ми не прив’язані **до нічого**, що може нас принизити» | «де ми не прив’язані **ні до чого**, що може нас принизити» |
| L2 | 63, 100, 118, 119, 122 | Ellipsis uses the single character «…» (U+2026) rather than the three-dot «...» mentioned in `glossary/CLAUDE.md` | «Я не працювала, як**…**», «це спостерігає**…** це спостерігає», «**…**Мета, яка є вашою», «Їх цікавите не**…**», «використовувати щось**…** [??]» | «...» (three dots) |

**Punctuation sweep (no issues found):** quotation marks are «» at all levels
(no `"`, `""`, `„"`); apostrophe is consistently `’` (U+2019); dashes are en-dash
` – ` with spaces (no `—`); no double spaces; no spaces before `,.;!?`; no
mixed Latin/Cyrillic letters. Language names lowercase (англійська, гінді, санскрит).

#### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 56, 86, 89, 108, 130 | Genitive of «Сахаджа Йоґа» written with **г** («Йоги»), inconsistent with the glossary canonical «Йоґа» (ґ) and with every other inflected form in this same text (Йоґу, Йоґою, Йозі ← ґ→з) | «прийдуть до Сахаджа **Йоги**», «не прийшли до Сахаджа **Йоги**», «приходять до Сахаджа **Йоги**», «речі з Сахаджа **Йоги**» (×2) | «Сахаджа **Йоґи**» |
| S2 | 124 (Version 2) | «Sahaja Yoga» as the name of the practice must always be capitalized (glossary: «Завжди з великої літери»); here lowercase, while the very same paragraph capitalizes «Сахаджа Йоґу» / «Сахаджа Йозі» | «не прийшли до **сахадж йоґи**», «приходять до **сахадж йоґи** на короткий час» | «**Сахадж Йоґи**» (capitalized; short form kept per EN «Sahaj Yog») |

**Capitalization / terminology sweep (no issues found):**
- Shri Mataji pronouns always uppercase: Я/Мене/Мені/Мій/Моя/Своєму/Своїм (lines 10, 26, 27, 28, 29, 53, 62–66, 76, 86, 94, 102, 108, 111, 114, 115). The generic ego-speaker «я» at line 75 is correctly lowercase.
- Deity pronouns for Athena / Primordial Mother / Lakshmi uppercase: Вона/Себе/Свою/Неї/Та, Хто (lines 11–15, 25, 69, 72, 73, 82, 95–96).
- «Калі Юга» (era) pronouns correctly lowercase (line 31); «Калі» (demon in the Nala story, lines 47–49) correctly takes lowercase pronouns я/мене/ти.
- Glossary terms correct and consistent: Дівалі, Калі Юга, Сатья Юга, Набхі / Набхі чакра, Кундаліні, Махакалі, Махасарасваті, Махалакшмі, Лакшмі, Афіна, Аді Шакті, Ґанеша (ґ; declension Ґанешу/Ґанеші), сваямбху, Пурани, Маніпур двіпа, Самореалізація/Реалізація, Дух, Істина, Пуджа, бхрама/бхранті, ґуру (ґ).
- Spiritual terms capitalized per rule: Дух (50, 74), Істина/Істини (39, 41, 46, 50, 57, 71, 106), Пуджа (24, 102), Самореалізація/Реалізація. Generic «боги й богині», «християнство», «Біблія/Коран» handled correctly.

#### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine grammar error. Ukrainian negative pronouns governed by a preposition must be split: «ні до чого», not «до нічого». Real, unambiguous. |
| L | L2 | **Remove** | `…` (U+2026) is a typographically valid Ukrainian ellipsis; the `...` in the style note illustrates *spacing* («no space before»), which is already satisfied. Changing 5 instances is churn with no correctness benefit — a style preference, not an error. *(Superseded in round 2: corpus evidence 58 vs 9 files + literal rule text.)* |
| S | S1 | **Keep** | Real consistency/transliteration error. Canonical lemma is «Йоґа» (ґ, per glossary + «Sanskrit g → ґ» convention); the genitive «Йоги» (г) clashes with Йоґу/Йоґою/Йозі used everywhere else in the text. Normalizing to «Йоґи» makes the whole paradigm consistent. |
| S | S2 | **Keep** | Real capitalization error against a firm SY rule. The proper name of the practice is always capitalized in Ukrainian regardless of EN casing (cf. language names always lowercase). Reinforced by internal inconsistency within the same paragraph. |

No conflicts between L and S. No false positives among the kept items.

#### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 39 | «не прив’язані до нічого» | «не прив’язані ні до чого» |
| 2 | 56 | «до Сахаджа Йоги» (г) | «до Сахаджа Йоґи» (ґ) |
| 3 | 86 | «до Сахаджа Йоги» (г) | «до Сахаджа Йоґи» (ґ) |
| 4 | 89 | «до Сахаджа Йоги» (г) | «до Сахаджа Йоґи» (ґ) |
| 5 | 108 | «речі з Сахаджа Йоги» (г) | «речі з Сахаджа Йоґи» (ґ) |
| 6 | 130 | «речі з Сахаджа Йоги» (г) | «речі з Сахаджа Йоґи» (ґ) |
| 7 | 124 | «не прийшли до сахадж йоґи» | «не прийшли до Сахадж Йоґи» |
| 8 | 124 | «приходять до сахадж йоґи» | «приходять до Сахадж Йоґи» |

### Summary (Round 1)

- Language (L): 2 issues found, 1 approved by Critic
- SY Domain (S): 2 issue-types found (7 occurrences), both approved by Critic
- Total corrections applied: 8 (1 grammar + 7 terminology/capitalization across 6 paragraphs)
