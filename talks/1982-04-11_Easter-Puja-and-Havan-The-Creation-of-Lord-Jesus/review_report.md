# Language Review – 1982-04-11_Easter-Puja-and-Havan-The-Creation-of-Lord-Jesus, 2026-11-16

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6; 815 lines, matching `transcript_en.txt` line for line).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019) only, quotes «» only (no `„“` / `""`), ellipsis always
`...` with no space before, no double or misplaced spaces, brackets balanced.
No mixed Latin/Cyrillic words (the only Latin is «VHS» ¶327, 333 and the
multiplication sign in ¶124, see L14). Hyphen-minus appears only inside
compounds and verse/number ranges.

Spell-check against the vendored hunspell dictionary (`site/dict/uk_UA`) plus
the project wordlist: 4166 unique word forms outside the havan names
(¶610–812); 92 not in the dictionary, all of them proper names, Sanskrit terms,
biblical forms («возлежав», «повіквічне», «Раббуні») or vocatives («красо»,
«величе») — no typos found.

The 102 havan names (¶610–812) were compared one by one with the English
transliteration: all follow the ґ / дх / short-і conventions and the glossary
forms (Нішкаланка, Нірвікальпа, Нішкрія, Махадеві, Махамайя, Тріґунатміка,
Сат-Чід-Ананда, Даїні).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | «певним чином» set off by commas although it is an adverbial, not a parenthetical | «Усе це було**, певним чином,** визначено наперед» | «Усе це було певним чином визначено наперед» |
| L2 | 28 | Ungrammatical government: «хотіти» cannot take a «що»-clause (calque of “wanted that they must suffer”) | «Вони **хотіли, що мусять** страждати, бо не визнавали за Христом заслуги страждання» | «Вони **хотіли, щоб їм довелося** страждати, бо…» |
| L3 | 35 | Euphony: «у» (not «в») before a cluster with ф («сф») | «ви входите **в сферу** колективності» | «ви входите **у сферу** колективності» |
| L4 | 39 | Missing comma between two parentheticals («на жаль» + «мушу сказати») | «яке, **на жаль мушу сказати**, піде вниз» | «яке, **на жаль, мушу сказати**, піде вниз» |
| L5 | 251 | Euphony: «із» preferred before a sibilant | «що **з собаками** там поводяться» | «що **із собаками** там поводяться» |
| L6 | 279 | Missing space between the ellipsis and the bracketed omission (elsewhere: «Бог (...)» ¶273, «просто... (нерозбірливі слова)» ¶289) | «християни **б...(...)** що це в кістці» | «християни **б... (...)** що це в кістці» |
| L7 | 292 | Extra comma after «І так само» (not a parenthetical; calque of “And equally, …”) | «**І так само, ви** не можете прийти до цієї духовної Реалізації» | «**І так само ви** не можете прийти…» |
| L8 | 301 | Building name written without the hyphen and with a doubled «л»; the same text hyphenates «Найтінґейл-Лейн», «Ріджентс-парку», and the corpus form is «Кекстон-Холі» | «зустріч у **Кекстон Холлі** в середу» | «зустріч у **Кекстон-Холі** в середу» |
| L9 | 351 | Interrogative sentence («чи правильно я зрозуміла…») ends with a full stop | «…а наступного дня – **Пуджа.**» | «…а наступного дня – **Пуджа?**» |
| L10 | 447, 469, 472 | Euphony of the prefix у-/в- after a consonant / at sentence start | «слід **встати**», «було б **врятовано**», «**Встань** і читай» | «слід устати», «було б урятовано», «Устань і читай» |
| L11 | 468 | «й» after a consonant (allowed only after a vowel) | «30Багато **ж й** інших знамень учинив Ісус» | «30Багато **ж і** інших знамень учинив Ісус» |
| L12 | 527 | Interrogative request («Чи могли б ви…») ends with a full stop | «Чи могли б ви обережно, знову, зав’язати **його.**» | «…зав’язати **його?**» |
| L13 | 113, 147, 150, 153 | Unbalanced «» in the «Шрімад Деві Бхаґаватам» reading (nested quote opened, only one level closed) | «Ґевін: **«**Нараяна сказав: **«**О Деварші! … сонць**»**.» | add closing «»» where a nested speech ends |
| L14 | 124 | Latin «x» used as a multiplication sign | «50 x 10 x 4 x 2 мільйонів миль» | «50 × 10 × 4 × 2» |
| L15 | 13, 15 | Sanskrit «мала» (*mala*) is a homograph of the verb «мала», which also occurs in the same sentence — the term reads as a verb | «як Він був створений, що **мала**, тобто... … Вона **мала** покрити Себе»; «Він був із **мали**» | set the term in quotes: «що «мала», тобто...», «із «мали»» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 14 (×2) | Tattwa compound not in the glossary pattern «X Таттва» (Брахма Таттва, Ґуру Таттва, Ґанеша Таттва); the same text has «Брахма Таттва» five times | «Там була **Прутхві-таттва**»; «як-от **Прутхві-таттва**, елемент землі» | «**Прутхві Таттва**» |
| S2 | 292 | «істина» lowercase where it stands for the absolute Truth, listed with God and the Spirit as the goal of Realisation | «до Бога, чи до свого Духа, чи до **істини**» | «…чи до **Істини**» |
| S3 | 275, 597 | «істина» lowercase | «чисте блаженство, чиста свідомість та **істина**»; «воїнами **істини** й праведності» | «Істина», «Істини» |
| S4 | 380, 381, 383 | Glossary: `namoh namaha` → «намо намаха» (lowercase) | «Шрі Нірмала Деві **Намо Намаха**.» | «Шрі Нірмала Деві **намо намаха**.» |
| S5 | 380, 381, 383 | «Твамева» uppercase in the Three Great Mantras vs «твамева» in the 102 havan lines | «Ом **Твамева** Сакшат» / «Ом **твамева** Сакшат» | «Ом твамева Сакшат» |
| S6 | 450 | Deity pronoun: «самого» lowercase next to «Себе»; the repeat of the same verse has «від Самої Себе» (¶454), and «Сам» is capitalised for Deities throughout (¶143, 386, 414, 460, 491) | «Вона не говоритиме (від) **самого** Себе» | «(від) **Самого** Себе» |
| S7 | 814 | One Deity, two cases in one sentence | «Просіть у **Самого** Агні – одна рука до **нього**» | «одна рука до **Нього**» |
| S8 | 11, 22 | «реалізація» lowercase next to «Реалізація» | «отримати свою **реалізацію** через Христа … отримати **Реалізацію**»; «до **реалізації**» | «Реалізацію», «Реалізації» |
| S9 | 35 | «Маха Йоґа» as two words while the glossary has «Махайоґ» | «Це і є **Маха Йоґа**» | «Махайоґа» |

Checked and found correct (no entry): Shri Mataji’s pronouns uppercase in every
form, including inside yogis’ lines (Ти/Тебе/Твій/Її Стопи/Їй); lowercase
first person in all non-Deity voices; Christ, Krishna, Mahavishnu/Virata,
Buddha (¶283), the Holy Ghost as «Вона» (¶448–454) uppercase; «його» for the
egg lowercase (¶9, 23); «дух» lowercase where it is a ghost or a state of mind
(¶396, 491); Пуджа, Хаван, Аарті, Інкарнація, Дух, Стопи capitalised
throughout; «сахаджа йоґи» lowercase and correctly declined, «у Сахаджа Йозі»;
Аґія чакра declined in both parts; language names lowercase («англійська»,
«з індійської мови», «на івриті»); glossary forms Деві Махатм’ям, Маркандея,
Вайкунтха, Омкара, Ґаятрі Мантра, Мати Земля, бадхи, обумовленості,
«блокується», «стан усвідомлення без думок», «віддача на милість»,
Сахасрара Свамині Мокша Прадайіні, ґрантхі, Пралая, Агні, and the fixed
blessing «Нехай Бог благословить усіх вас».

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | «певним чином» here is the speaker’s hedge (“in a way”), intonationally detached; the corpus writes it both with and without commas. Not a clear error. |
| L | L2 | Keep | Genuine grammar error: «хотіли, що мусять» is not Ukrainian. The fix keeps the sense (“wanted to have to suffer”) with a «щоб»-clause. |
| L | L3 | Keep | Orthography §23: «у» before в, ф and consonant clusters with them, regardless of the preceding sound. The translation observes this everywhere else; single outlier. |
| L | L4 | Keep | Two adjacent parentheticals are separated by a comma; the corpus has «на жаль, мушу сказати» elsewhere. |
| L | L5 | Remove | The rule for «із» before sibilants is advisory («переважно»); «з собаками» after a vowel is acceptable. |
| L | L6 | Keep | Real spacing slip; the other four bracketed omissions in the text all have the space. |
| L | L7 | Keep | «так само» is not a parenthetical; the comma is a carry-over from English punctuation. |
| L | L8 | Keep | Compound foreign names take a hyphen, as the two other such names in this text do; «Кекстон-Холі» is the spelling already used in the corpus for the same hall. |
| L | L9 | Keep | A «чи»-question must end with a question mark, whatever the English transcript has. |
| L | L10 | Remove | Prefix у-/в- alternation is a recommendation, not a rule; both forms are normative. Style preference. |
| L | L11 | Keep | «й» after a consonant breaks the categorical part of the і/й rule; «ж і інших» is also the wording of the Ukrainian Bible text being quoted. |
| L | L12 | Keep | Same as L9: «Чи могли б ви…» is interrogative in form. |
| L | L13 | Remove | The imbalance is in the source: the nested speeches (Narayana, the Virata boy, Shri Krishna) run across Shri Mataji’s interjections and several paragraphs, so the reading is cut mid-quote. All quotes are «» as required; adding closers would mark speech as ended where it is not. |
| L | L14 | Remove | Mirrors the source formula; not a mixed-script word and not a subtitle-readable error. |
| L | L15 | Remove | Clarity suggestion, not an error; the transliteration itself is correct. Left for the human reviewer: ¶13 and ¶15 may read better with «мала» in quotes. |
| S | S1 | Keep | The glossary writes every Tattwa compound as two capitalised words even where the English has a lowercase “tattwa” (Guru tattwa → Ґуру Таттва); the text itself uses «Брахма Таттва». Consistency fix. |
| S | S2 | Keep | `glossary/CLAUDE.md`: Істина uppercase for absolute Truth. Here it is the goal reached through Realisation, in one series with Бога and Духа. |
| S | S3 | Remove | ¶275 lists qualities in lowercase («блаженство», «свідомість», «істина»); ¶597 pairs «істини й праведності» as virtues. Generic use, matching the source. |
| S | S4 | Keep | Explicit glossary entry «намо намаха»; most renderings of the Three Great Mantras in the corpus already have it lowercase. |
| S | S5 | Remove | No glossary entry for «твамева»; the capital follows the source, and the corpus consistently writes «Ом Твамева Сакшат» in the Three Great Mantras. |
| S | S6 | Keep | Deity pronoun rule; inconsistent with ¶454 and with every other «Сам/Самого» in the text. The masculine form is left as is — it mirrors the yogi’s “(of) himself”. |
| S | S7 | Keep | Agni is addressed as a Deity («Просіть у Самого Агні»), so the pronoun in the same sentence must match. |
| S | S8 | Remove | The glossary maps both cases and the translation follows the English, which is lowercase in exactly these two places. |
| S | S9 | Remove | Different term (Maha Yoga, not Maha Yogi); no glossary entry, and the corpus has both «Маха Йоґа» and «Махайоґа». |

No conflicts between L and S suggestions.

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| L2 | 28 | «Вони хотіли, що мусять страждати» | «Вони хотіли, щоб їм довелося страждати» |
| L3 | 35 | «ви входите в сферу колективності» | «ви входите у сферу колективності» |
| L4 | 39 | «яке, на жаль мушу сказати, піде вниз» | «яке, на жаль, мушу сказати, піде вниз» |
| L6 | 279 | «християни б...(...) що це в кістці» | «християни б... (...) що це в кістці» |
| L7 | 292 | «І так само, ви не можете прийти» | «І так само ви не можете прийти» |
| L8 | 301 | «у Кекстон Холлі» | «у Кекстон-Холі» |
| L9 | 351 | «а наступного дня – Пуджа.» | «а наступного дня – Пуджа?» |
| L11 | 468 | «Багато ж й інших знамень» | «Багато ж і інших знамень» |
| L12 | 527 | «зав’язати його.» | «зав’язати його?» |
| S1 | 14 (×2) | «Прутхві-таттва» | «Прутхві Таттва» |
| S2 | 292 | «чи до істини» | «чи до Істини» |
| S4 | 380, 381, 383 | «Намо Намаха» | «намо намаха» |
| S6 | 450 | «(від) самого Себе» | «(від) Самого Себе» |
| S7 | 814 | «одна рука до нього» | «одна рука до Нього» |

All 14 corrections are applied to `transcript_uk.txt` (17 replacements, since
S1 occurs twice and S4 three times). Line count is unchanged.

## Summary

- Language (L): 15 issues found, 9 approved by Critic
- SY Domain (S): 9 issues found, 5 approved by Critic
- Total corrections applied: 14
