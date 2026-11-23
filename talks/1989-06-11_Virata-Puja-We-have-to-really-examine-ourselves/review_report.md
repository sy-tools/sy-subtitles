# Language Review – 1989-06-11_Virata-Puja-We-have-to-really-examine-ourselves, 2026-11-23

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass. No earlier review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers. Header lines are 1–4,
the talk runs from line 6 to line 101 («Нехай Бог благословить усіх вас», line
96; closing remarks, lines 97–101), and the 108-tribe prayer runs from line 102
to line 317.

Mechanical pre-checks were clean: en-dash ` – ` (U+2013, 88×) with spaces,
apostrophe `’` (U+2019), quotes «» balanced on every line, no
Latin/Cyrillic mixing, no double or trailing spaces, no space before
punctuation, `...` with no space before it and no `…` character.
`python -m tools.text_normalize --check` reports 0 violations before and after
the corrections.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 19, 50, 51, 56 | The particle «як-от» (“like, for instance”) takes a hyphen. It is written as two words 4×, which are also the only 4 unhyphenated instances in the whole corpus (239× «як-от»). Each one introduces an example (EN: “Like, you see, in this place…”, “Like you file…”, “like people have an idea…”, “Like I asked somebody…”), not a comparison | «**Як от**, бачите, у цьому місці»; «**Як от** ви складаєте в папку»; «**як от** у людей є ідея»; «**Як от** Я запитала когось» | «**Як-от**, бачите…»; «**Як-от** ви складаєте…»; «**як-от** у людей…»; «**Як-от** Я запитала…» |
| L2 | 45 | Extra comma: two parallel purpose clauses joined by a single «і» are not separated by a comma | «лише для того, щоб підтримувати млявість**,** і щоб не мати жодної дисципліни» | «щоб підтримувати млявість **і** щоб не мати жодної дисципліни» |
| L3 | 52 | Missing comma: the clauses of a compound sentence each have their own subject («ми повинні…») and no common element, so a comma is needed before «і» | «ми повинні вести щось дуже природне **і ми** повинні стати первісними» | «ми повинні вести щось дуже природне**, і ми** повинні стати первісними» |
| L4 | 61 | Parenthetical «з одного боку» is set off on only one side. After the conjunction «тож» it needs commas on both sides, because «тож» and the parenthetical do not form an inseparable unit the way «а втім» does | «**Тож з одного боку,** динамічність треба використовувати для себе» | «**Тож, з одного боку,** динамічність…» |
| L5 | 22 | «одне за одним» is neuter, but the subject is people («ви») | «і ви будете прокляті **одне за одним**» | «один за одним» |
| L6 | 88 | Calqued government «навчатися від» (EN “learn from”) | «І ваші діти також **навчатимуться від вас**» | «вчитимуться у вас» |
| L7 | 37 | Euphony: «і» between vowels | «поширювати Сахаджа Йоґу **і утверджувати** її» | «Йоґу й утверджувати» |
| L8 | 32 | Lexical calque of “very true about” | «це також **дуже правдиве** щодо людей» | «дуже справедливо щодо людей» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 56 | «тапасья» is capitalized mid-sentence. The glossary has lowercase `tapasya → тапасья`, and the same paragraph writes «свою **тапасью**» and line 57 «Але **тапасья** – тут». The sentence-initial «Тапасья – тут» (line 56) is correct as a sentence start | «ми маємо йти в Гімалаї і там виконувати **Тапасью** на холодних вітрах» | «виконувати **тапасью** на холодних вітрах» |
| S2 | 21, 52, 62, 72 | Shri Mataji is addressed with the vocative «Мати» rather than the glossary's «Матінко (звертання)» | «**Мати**, я дуже Тебе люблю»; «**Мати**, я думаю, його може там не бути» | «Матінко, …» |
| S3 | 8 | The relative pronoun for the divine Being is lowercase, while line 102 capitalizes deity relatives («Якій», «Яка», «Кого») | «мозок тієї Істоти, **яку** можна назвати Всемогутнім Богом» | «Яку» |

These were checked and are correct, so they produce no findings:

- **Shri Mataji's pronouns** are uppercase everywhere (Я/Мене/Мені/Мій/Моя/Мої/Моїм/Моєю/Мого/Мою). That includes Her quoted speech («Я знаю, що зроблю це…», ¶55; «навіщо Я видала тебе заміж…», ¶63), the yogi's address «я дуже **Тебе** люблю» (¶21), and «у **Твоєму** співчутті» throughout the prayer.
- **God and the Incarnations:** «Він», «Себе» for Shri Vishnu (¶8) and «Він, мабуть, відібрав нас» for God (¶90) are uppercase. Regular people are lowercase, e.g. Lincoln «як **він**» (¶81) and «тоді **він** думає» (¶91).
- **Pujas and Realization:** «Пуджа» is uppercase in all 9 instances, including the daily «сідати для Пуджі» (¶47). «Реалізація» is uppercase in all 4 instances. «Реалізовані Душі» (EN “Realized souls”) against «реалізованою душею» (EN “realized soul”, ¶81) follows the source and the glossary's two variants.
- **Sahaja Yoga terms:** «сахаджа йоґи / йоґів / йоґах / йоґами / йоґ / йоґа» are lowercase with «ґ». «Сахаджа Йозі» is the correct locative, and «сахаджа культуру» matches the glossary example.
- **Glossary terms:**
  - «обумовленості» (conditionings, ¶27)
  - «живить / живлення» (nourish, ¶10, ¶54)
  - «атакуватимуть» (attack, ¶40)
  - «колективність», «его», «вібрації», «Кундаліні», «Вішуддхі»
  - «Іду, Пінґалу і Сушумну»
  - «Ґанапатіпуле»
  - «Мокша Прадайіні»
  - «Шрі Аді Шакті Бхаґаваті»
  - «мантра Шрі Ґанеші» (genitive «Ґанеші», as `terms_context.yaml` requires)
  - «Ріші Муні»
  - «правосторонній / лівосторонній»
- **Virata and Virat:** «Вірата» / «Вірат» follow the source's own alternation of “Virata” and “Virat”, and both decline correctly («Пуджу Вірати», «сили Вірата», «країна Вірата»).
- **Lowercase names:** language names («англійська», line 4) and nationalities («індійці», «американці», «англійці», «іспанці», «європейці») are lowercase.
- **Closing blessing:** «Нехай Бог благословить усіх вас.» (lines 96, 101) matches the fixed glossary formula.
- **Tribe prayer (lines 102–317):** the response formula is identical in all 106 «Йоґи:» lines (106 in the EN as well). Established ethnonyms decline in the genitive plural (могікан, делаварів, семінолів, гуронів, шаєнів, ютів…) and the rest are left indeclinable, which is consistent and correct. The pronunciation notes («вимова: …») are carried over faithfully from the EN transcript.
- **Translator's additions** «бо [Він] – це ціле» (¶10), «захопили [все] тут» (¶19) and «означає [одяг], який» (¶87) are minimal and correctly placed in brackets.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | This is a codified spelling (Правопис: the particle «-от» takes a hyphen in «як-от»), and the corpus agrees (239 : 4, with all 4 exceptions in this talk). In every instance the EN “like” introduces an example, so «як-от» is the right connector, not a comparative «як». Other reviews have approved the same fix as precedent. |
| L | L2 | **Keep** | This is a genuine punctuation rule: homogeneous subordinate clauses joined by a single «і» take no comma. The EN “then not to have any discipline” gives no grounds for a pause comma. |
| L | L3 | **Keep** | The rule is mandatory: parts of a compound sentence joined by «і», each with its own subject and with no common member or common subordinate conjunction, are separated by a comma. The similar strings in ¶64 («що ви маєте…, ви маєте бути кмітливими і ви маєте знати все») and ¶94 («Можливо, ви недостатньо глибокі і ви не такі…») were checked. They are correctly left without a comma because of the common «що» / «Можливо», so only ¶52 is wrong. |
| L | L4 | **Keep** | A parenthetical must be set off on both sides. A comma is dropped between a conjunction and the parenthetical only in fixed units with «а» («а втім», «а може»), and «тож» is not one of them. The current text closes the parenthetical but leaves it open at the front. |
| L | L5 | **Remove** | The EN “you'll be cursed one after another” is ambiguous: it can mean the people, the two countries just named, or curse after curse. Neuter «одне за одним» works as an adverbial “one after another” and is used that way in the corpus («Рахуйте свої благословення одне за одним»). Forcing «один за одним» would settle an ambiguity that is in the source. |
| L | L6 | **Remove** | «навчатися від когось» is widespread in modern Ukrainian, and the meaning is unambiguous. The change would be a stylistic preference, not a correction. |
| L | L7 | **Remove** | The і/й alternation is a tendency rule («переважно»), not a strict norm. Prior Critics removed tendency-rule findings of this kind (з/із, у/в). |
| L | L8 | **Remove** | «правдивий» (“true, matching reality”) is understood correctly here. The change would be a style preference. |
| S | S1 | **Keep** | This is a genuine inconsistency inside one paragraph: the glossary term is lowercase, and the same word appears lowercase two sentences earlier and in the next paragraph. The capital in the EN transcript at this spot is a transcriber's inconsistency, not something She said. Normalizing case does not alter the spoken content, so the fidelity rule is not touched. |
| S | S2 | **Remove** | This is a false positive. «Мати» is a correct Ukrainian vocative form, and the glossary lists «Матінко» as one option, not a mandate. The corpus uses both (154× «Мати,» against 274× «Матінко,» in quoted address), and this transcript is consistent within itself (4× «Мати»). Changing it would be churn. |
| S | S3 | **Remove** | The AGENTS.md capitalization rule covers personal pronouns of Shri Mataji and the Incarnations, not relative pronouns. The corpus overwhelmingly writes a lowercase relative after «Бог»/«Божество» (≈45 lowercase to 9 uppercase). The uppercase relatives in line 102 belong to a separate speaker's formal prayer and set no rule for the talk. This is not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 19 | «Як от, бачите, у цьому місці» | «Як-от, бачите, у цьому місці» |
| 2 | 50 | «[Сміх] Як от ви складаєте в папку» | «[Сміх] Як-от ви складаєте в папку» |
| 3 | 51 | «до вашої Реалізації, як от у людей є ідея» | «до вашої Реалізації, як-от у людей є ідея» |
| 4 | 56 | «Як от Я запитала когось» | «Як-от Я запитала когось» |
| 5 | 45 | «щоб підтримувати млявість, і щоб не мати жодної дисципліни» | «щоб підтримувати млявість і щоб не мати жодної дисципліни» |
| 6 | 52 | «ми повинні вести щось дуже природне і ми повинні стати первісними» | «ми повинні вести щось дуже природне, і ми повинні стати первісними» |
| 7 | 61 | «Тож з одного боку, динамічність» | «Тож, з одного боку, динамічність» |
| 8 | 56 | «там виконувати Тапасью на холодних вітрах» | «там виконувати тапасью на холодних вітрах» |

## Summary

- Language (L): 8 issues found, 4 approved by Critic (L1 covers 4 instances)
- SY Domain (S): 3 issues found, 1 approved by Critic
- Total corrections applied: 8 (all applied to `transcript_uk.txt`;
  `tools.text_normalize --check` clean afterwards)

Overall, the translation is of high quality. It is faithful to the spoken
original, including Shri Mataji's broken-off and self-correcting sentences, and
it uses deity capitalization and glossary terminology consistently. The
remaining corrections are small orthography and punctuation fixes.
