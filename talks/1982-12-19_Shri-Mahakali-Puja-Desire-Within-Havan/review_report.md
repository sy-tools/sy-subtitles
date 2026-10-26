# Language Review – 1982-12-19_Shri-Mahakali-Puja-Desire-Within-Havan, 2026-10-26

## Process

Review `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter.

Paragraph numbers below are line numbers of `transcript_uk.txt` (P7 = first talk paragraph,
P8 = «Увесь всесвіт…», P9 = «Тепер це бажання…», P11 = «Махакалі має особливу здатність…»,
P12 = Marathi-part translation «Тепер Я трохи поговорю мовою маратхі…»).

### Review Agents

**Reviewer L – Language (Orthography + Grammar + Punctuation)**
Checked spelling, word forms, Latin/Cyrillic mixing, prefixes, commas, quotation marks
(«» at all levels), en-dash ` – `, ellipsis, spacing, case forms, conjugation, gender agreement.

**Reviewer S – SY Domain (Capitalization + Terminology + Consistency)**
Checked deity-pronoun capitalization (Shri Mataji / Christ / Shri Krishna / Shri Ganesha /
Mahakali / God), glossary terms (`terms_lookup.yaml`, `terms_context.yaml`), spiritual-term
capitalization (Дух, Істина, Стопи, Дхарма, Пуджа, Реалізація), language names in lowercase,
transliteration (ґ / дх / і), consistency of quotation and dash style.

**Critic – Filter + Validate**
Reviewed both tables, removed false positives and style-only findings, kept only genuine errors.

### Mechanical pre-checks (both reviewers)

- Straight apostrophes `'`: 0; straight `"` / German `„`: 0 – all quotes are «», apostrophe is ’.
- Hyphen-as-dash ` - `: 0; em-dash `—`: 0; en-dash ` – `: used consistently.
- Double spaces / space before punctuation / missing space after punctuation: 0.
- Latin letters inside Cyrillic words: 0.
- Every lowercase first-person pronoun (я/мені/мого/моя…) sits inside quoted speech of
  ordinary people or is a reflexive for «ви/ми»; every pronoun for Shri Mataji (Я/Мене/Мені/Мою/
  Себе/Свою…), Christ (Він/Його/Мої), Shri Krishna (Він), Shri Ganesha (Він/Своїй/Їй), Mahakali
  (Вона/Її/Себе) and God (Він) is capitalized. Shivaji Maharaj and Adi Shankaracharya (not
  Incarnations) correctly take lowercase pronouns.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | P9 | Зайва кома перед одиничним «і» між однорідними присудками зі спільним підметом | «Тож ви розширюєте це далі, і починаєте думати» | «Тож ви розширюєте це далі і починаєте думати» |
| L2 | P9 | Милозвучність: «В» на початку речення перед приголосним | «Як я можу дати? В чому моя помилка у віддаванні?» | «…? У чому моя помилка у віддаванні?» |
| L3 | P9 | Милозвучність: «В» на початку речення перед приголосним | «В Сахаджа Йозі ви знаєте всі методи» | «У Сахаджа Йозі ви знаєте всі методи» |
| L4 | P9 | Граматично неузгоджена конструкція «скільки … зробив свій внесок» (How much I have contributed) | «Скільки я зробив свій внесок у це?» | «Який внесок я зробив у це?» |
| L5 | P11 | Кома перед одиничним «і» між однорідними членами | «чутливість у всьому, і любов, яка досягає вершини в радості» | «чутливість у всьому і любов, яка досягає вершини в радості» |
| L6 | P11 | Відсутня крапка в кінці останнього речення абзацу | «…проявиться в сьогоднішній Пуджі. Нехай Бог благословить вас» | «Нехай Бог благословить вас.» |
| L7 | P12 | Відсутня кома перед повторюваним сполучником «і…і» між однорідними присудками | «нічого не їсть і не п’є і не може зігнути спину» | «нічого не їсть і не п’є, і не може зігнути спину» |
| L8 | P12 | Орфографія: нормативна форма «сикх» (правило «дев’ятки», словникова форма; у корпусі скрізь «сикх») | «Він сікх, родом із Пенджабу» | «Він сикх, родом із Пенджабу» |
| L9 | P12 | Присудок не узгоджений із підметом «особа» (ж. р.); узгодження з прикладкою «генерал-сахіб» неправильне | «така висока посадова особа, як командувач Південного командування, генерал-сахіб, сказав Мені» | «…генерал-сахіб, сказала Мені» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | P9 | Термін тонкої системи «Brahmarandhra» у глосарії – «Брахмарандхра» (велика літера; у корпусі 11:1 за велику) | «ваша брахмарандхра – це також серце» | «ваша Брахмарандхра – це також серце» |

Verified as correct (no change): «сахаджа йоґ / сахаджа йоґи / йоґів / йоґами» (lowercase,
hard stem), «Сахаджа Йоґа / Йоґу / Йозі / Йоґою», «Пуджа / Пуджу / Пуджі / Пудж», «Дух / Духом /
Духа», «Істина», «Стопи», «Дхарма», «Реалізація», «Кундаліні», «Махакалі Шакті», «Махамайя
Шакті», «Аді Шакті», «Шрі Ґанеша / Ґанешею / Ґанеші / вісім Ґанеш», «Шрі Ґанапаті», «Ґаурі»,
«Шрі Лакшмі», «Аді Шанкарачар’я», «Саундар’я Лахарі», «Вівека Чудамані», «яг’ю», «бхути /
бхутів / махабхути», «Ґанґу», «Пунья Бхумі», «Васудхайва Кутумбакам», «Йоґакшемам вахам’яхам»,
«кшему», «карм», language names «англійська / гінді / маратхі / санскритом» in lowercase,
«Фройд» (consistent within the talk and the dominant corpus form).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Однорідні присудки зі спільним підметом, з’єднані одиничним «і», комою не розділяються. |
| L | L2 | Keep | Чинне правило чергування у/в: на початку речення перед приголосним уживається «у». Така сама практика в попередніх звітах корпусу. |
| L | L3 | Keep | Те саме правило, що й L2. |
| L | L4 | Keep | «Скільки я зробив свій внесок» – граматично невдала калька; «Який внесок я зробив у це?» точно передає «How much I have contributed to this». |
| L | L5 | Remove | «і любов, яка…» має приєднувальний відтінок (друга частина з власним підрядним), кома тут допустима й відтворює паузу оригіналу – не помилка. |
| L | L6 | Keep | Останнє речення абзацу без крапки – пропущений розділовий знак (в оригіналі теж бракує, але це дефект транскрипції, а не авторська пунктуація). |
| L | L7 | Keep | Повторюваний сполучник «і…і» між однорідними членами вимагає коми перед другим «і». |
| L | L8 | Keep | «Сикх» – словникова форма; «сікх» – орфографічна помилка. Корпус: «сикх/сикхи/сикхізм» скрізь. |
| L | L9 | Keep | Присудок узгоджується з підметом «особа» (жіночий рід), а не з прикладкою «генерал-сахіб». |
| S | S1 | Keep | Форма глосарія («Brahmarandhra → Брахмарандхра») і переважна форма корпусу; у цьому тексті єдине написання з малої. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| L1 | P9 | «розширюєте це далі, і починаєте думати» | «розширюєте це далі і починаєте думати» |
| L2 | P9 | «В чому моя помилка у віддаванні?» | «У чому моя помилка у віддаванні?» |
| L3 | P9 | «В Сахаджа Йозі ви знаєте всі методи» | «У Сахаджа Йозі ви знаєте всі методи» |
| L4 | P9 | «Скільки я зробив свій внесок у це?» | «Який внесок я зробив у це?» |
| L6 | P11 | «Нехай Бог благословить вас» (без крапки) | «Нехай Бог благословить вас.» |
| L7 | P12 | «не їсть і не п’є і не може зігнути спину» | «не їсть і не п’є, і не може зігнути спину» |
| L8 | P12 | «Він сікх» | «Він сикх» |
| L9 | P12 | «посадова особа … генерал-сахіб, сказав Мені» | «посадова особа … генерал-сахіб, сказала Мені» |
| S1 | P9 | «ваша брахмарандхра» | «ваша Брахмарандхра» |

All approved corrections have been applied to `transcript_uk.txt`; a post-apply grep confirmed
none of the original forms remain, and `tools.text_normalize --check` passes on the file.

## Summary

- Language (L): 9 issues found, 8 approved by Critic
- SY Domain (S): 1 issue found, 1 approved by Critic
- Total corrections applied: 9
