# Language Review – 1987-10-25_Diwali-Puja-Power-of-Innocence-Meaning-of-Nine-of-The-Lakshmis, 1987-10-25

## Process

Review `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter.
Paragraph numbers (¶) = line numbers in `transcript_uk.txt` (identical to `transcript_en.txt`, 174 lines).

Mechanical checks run on the whole file before the manual pass: no Latin letters inside Cyrillic words,
no `„"` / `""` / `‘’` quotes (only `«»`, nested also `«»`), apostrophe is U+2019 throughout, dash is ` – `
(U+2013) everywhere, no `…` character, no space before `...` or other punctuation, no double spaces.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | Missing comma where two subordinating conjunctions meet («що» + «якщо») and there is no correlative «то» | «Люди багато разів помічали, що якщо дитина падає з висоти, вона не гине» | «…помічали, що, якщо дитина падає з висоти, вона не гине» |
| L2 | 44 | Same: «що» + «якщо», no correlative «то» (the clause resumes with «як ми можемо врятувати») | «Тепер слід зрозуміти, що якщо ви збираєтеся перетнути цей океан у човні…» | «…зрозуміти, що, якщо ви збираєтеся…» |
| L3 | 49 | Same: «що» + «(навіть) коли», no «то». The comma goes before the particle «навіть» | «Дуже дивовижно, що навіть коли йдеться про політичні революції…, вони можуть піти на будь-які жертви» | «Дуже дивовижно, що, навіть коли йдеться…» |
| L4 | 50 | Same: «тому що» + «якщо», no «то» | «Тому що якщо ви не звертаєте уваги, інші дивитимуться на вас» | «Тому що, якщо ви не звертаєте уваги, інші…» |
| L5 | 22, 47, 50, 60, 96, 137, 139, 141 (×3), 145 | Unneeded comma after «Тепер» at the start of a sentence. «Тепер» is an adverb, not a parenthetical word, so the comma copies English "Now,". The text already omits it elsewhere (¶20 «Тепер просвітлення», ¶44 «Тепер слід зрозуміти», ¶58 «Тепер подивіться») | «Тепер, це світло…»; «Тепер, люди кажуть…»; «Тепер, не обмахуйтеся…»; «Тепер, для будь-кого…»; «Тепер, перед цим…»; «Тепер, чи знаєте ви…» (×2); «Тепер, ось яке благословення…»; «Тепер, що таке вода?»; «Тепер, Відья Лакшмі…»; «Тепер, не кожна домогосподарка…» | Drop the comma after «Тепер» (11 places). The comma stays where it opens a subordinate clause or a parenthetical: ¶73 «Тепер, якщо…», ¶75/¶149 «Тепер, припустімо, …», ¶136 «Тепер, сьогодні, коли…» (clarifying adverbial of time), ¶150 «Тепер, коли…», «Тепер, навіть якщо…» |
| L6 | 62, 168 | Non-standard construction: «давайте» + synthetic future «матимемо». A Russian calque; the normative form is the 1st-person plural imperative | «Давайте матимемо цю рішучість і давайте матимемо таку відвертість»; «Тепер давайте матимемо людей як храми» | «Маймо цю рішучість і маймо таку відвертість»; «Тепер маймо людей як храми» |
| L7 | 149 | Wrong verb government: «намагатися» takes an infinitive and cannot take the object «що» | «Інакше, хоч би що ви намагалися, люди нічим не насолоджуються» | «Інакше, хоч би як ви намагалися, …» |
| L8 | 49 | «дивитися про» has no direct object (colloquial) | «Днями Я дивилася про боротьбу Леніна» | «дивилася фільм про…» (proposed) |
| L9 | 14 | «копати» for "kick" could be read as "dig" | «Інша людина може копати вас, може бити вас» | «копнути / штовхати ногою» (proposed) |
| L10 | 38 | Junction «тому що» + «якщо» | «Тому що якщо ви дедалі більше заплутуєтеся…, тоді це світло згасає» | «Тому що, якщо…» (proposed) |
| L11 | 13 | Comma in a conjunctionless sentence whose second part sums up the first. A dash would be preferable | «А нерозумні люди завжди агресивні, це одна з ознак» | «…агресивні – це одна з ознак» (proposed) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 97–100 | Mantra formula: «сакшат» is lowercase, but the glossary (`terms_lookup.yaml`, PUJA TERMINOLOGY) fixes it as «Сакшат». «намо намаха» is already correctly lowercase per the glossary | «Ом твамева сакшат Шрі Адья Лакшмі сакшат Шрі Аді Шакті Матаджі…» (8 occurrences in 4 lines) | «Ом твамева Сакшат Шрі Адья Лакшмі Сакшат Шрі Аді Шакті Матаджі…» (×8) |
| S2 | 147 | Compound "Deity + tattwa": the glossary and corpus pattern is a capital «Таттва» (Ґанеша Таттва, Ґуру Таттва/Таттви, Брахма Таттва, Шіва Таттва). «Лакшмі таттви» is the only lowercase occurrence in the corpus | «Звісно, усі Лакшмі таттви – це парасимпатичні сили всередині нас» | «усі Лакшмі Таттви» |
| S3 | 147 | «істина» in lowercase, while the same paragraph has «Істини / Істину / Істиною» (glossary rule: Істина is uppercase) | «Не так: «Ось тобі істина – маєш!»» | «Ось тобі Істина – маєш!» (proposed) |
| S4 | 140–146 | Mixed case for the demonstrative pronoun referring to the Lakshmis: ¶140 «Адья – це Та, що є Первісною», but ¶141/143/144/146 have «Вона та, що…», ¶141 «Відья Лакшмі – це та, що…», ¶145 «та, що є Божеством родини» | see context | Unify (proposed) |
| S5 | 150 | Stage note «(сміх)» in lowercase, while the rest of the text has «(Сміх)» | «Усе, вас закріплено! (сміх)» | «(Сміх)» (proposed) |
| S6 | 148 | Addressing Shri Mataji as «Мати» where the glossary suggests «Матінко» (form of address) | «Він каже: «Мати, я тут задихаюся.»» | «Матінко» (proposed) |
| S7 | 21 | «валайї» in lowercase, while the glossary has «Валайя» (with a capital) | «маленькі круглі валайї, маленькі-маленькі» | «Валайї» (proposed) |

Checked by Reviewer S and found correct: all Shri Mataji first-person pronouns are uppercase (Я/Мені/Мене/Мій/Моя/Моє/Мого/Моїй/Сама/Своїми/Своєму, plus «Та, Хто» ¶56 and «Хто Я» ¶61). Other speakers' «я/мені/мене» in quotations are lowercase (¶13, 15, 55, 62, 148, 162). Pronouns for Ganesha (¶41 «Він очищає вас, Він омиває вас»), Vishnu/Virata (¶147), Lakshmi (¶140–149) and Mary (¶140 «Її називали Мері») are uppercase. The housewife in ¶145 («вона може бути жахливою істотою») and the brother in ¶71 are correctly lowercase. «Вас/Вам/Ваших» addressing Shri Mataji in dialogue is uppercase (¶31, 148, 160, 164). «Стопи» ¶88/92, «Пуджа/Пуджі» ¶38/84/136/174, «Дух» ¶46, «Інкарнацій» ¶168 and «Божество/Божества» are uppercase. «реалізованою душею» and «реалізацію» are lowercase, which the glossary allows. Glossary terms match: Шрі Ґанеша (Ґанеші), Кундаліні, Сахасрара, бандхан, блокування (catching), вібрації, ашрам, Шастри, Хануман, Аді Шакті, Вірата, Діпаавалі, Дівалі Пуджа, Ґанеша Атхарва Шірша, Ґруха/Раджа Лакшмі, сахаджа йоґ / йоґиня / йоґи / йоґів / йоґу / йоґа (lowercase, hard stem), Сахаджа Йоґа / в Сахаджа Йозі, «Нехай Бог благословить усіх вас!» (¶80). Language names are lowercase («мовою гінді чи маратхі» ¶124, «санскритом» ¶150, «англійська» ¶4).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Правопис 2019 rule: at the junction of two subordinating conjunctions the comma is required unless the correlative «то/так/але» follows. There is none here. This matches earlier approvals in the corpus. |
| L | L2 | Keep | Same rule. The sentence never reaches a «то» because the main clause is the question «як ми можемо врятувати…?». |
| L | L3 | Keep | Same rule. With a particle, the comma goes before it («що, навіть коли»), as in earlier approved fixes («що, навіть приїхавши…»). |
| L | L4 | Keep | Same rule for «тому що» + «якщо». No «то» follows («інші дивитимуться…»). The precedent «бо, якщо» was approved before. |
| L | L5 | Keep | «Тепер» is a temporal adverb, not a parenthetical word, so the comma is a calque of "Now,". The text already writes «Тепер» without a comma in ¶20/44/58/119/130/131/133, so this is also an internal inconsistency. Matches several earlier approvals. The justified commas (¶73, 75, 136, 149, 150 ×2) stay untouched. |
| L | L6 | Keep | «давайте + synthetic future» is non-standard. The imperative «маймо» is the normative form, and the same correction was approved earlier («давайте знатимемо» → «знаймо»). The sentence structure and meaning do not change. |
| L | L7 | Keep | «намагатися що» is impossible government. «хоч би як ви намагалися» is a minimal edit with no change of meaning (EN "whatever you may try"). The same fix was approved earlier. |
| L | L8 | Remove | Colloquial but understandable. The proposed fix adds «фільм», which is not in the original (the medium is not named), so the change would add content. |
| L | L9 | Remove | False positive. In СУМ, «копати» has the sense «бити ногою (ногами)», and next to «бити вас» the meaning is clear. |
| L | L10 | Remove | False positive. The main clause opens with the correlative «тоді», which works like «то». No comma is required at the junction. |
| L | L11 | Remove | A style preference. A comma is acceptable here and it mirrors the spoken rhythm. |
| S | S1 | Keep | Explicit glossary entry «sakshat → Сакшат». The mantra lines are otherwise already glossary-conformant («намо намаха» lowercase). The same correction was approved in an earlier talk. |
| S | S2 | Keep | Consistent with the glossary entries «Ґуру Таттва», «Ґанеша Таттва», «Брахма Таттва» and with every other "Deity + Таттва" compound in the corpus. |
| S | S3 | Remove | The original deliberately writes lowercase "truth" inside the crude quoted remark («Now this is the truth – have it!»), unlike the surrounding "Truth". The translation follows the source distinction. Not a clear error. |
| S | S4 | Remove | The capitalisation rule covers personal pronouns (Вона/Її/Їй), and all of those are correct. The demonstrative «та» in «Вона та, що…» is not covered. ¶140 «Та, що є Первісною» is a stand-alone epithet definition. Each instance is defensible, so this is a style matter. |
| S | S5 | Remove | Mirrors the source, which has lowercase "(laughter)" here. A trivial typographic matter, not an error. |
| S | S6 | Remove | «Мати» is the correct vocative of «мати», and the glossary lists «Мати» alongside «Матінко». This is the son-in-law's casual address. |
| S | S7 | Remove | Here "valayas" is used generically ("little round circles"), not as the name of the specific centre that the glossary capitalises. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | помічали, що якщо дитина падає | помічали, що, якщо дитина падає |
| 2 | 44 | слід зрозуміти, що якщо ви збираєтеся | слід зрозуміти, що, якщо ви збираєтеся |
| 3 | 49 | Дуже дивовижно, що навіть коли йдеться | Дуже дивовижно, що, навіть коли йдеться |
| 4 | 50 | Тому що якщо ви не звертаєте уваги | Тому що, якщо ви не звертаєте уваги |
| 5 | 22 | Тепер, це світло може сягати | Тепер це світло може сягати |
| 6 | 47 | Тепер, люди кажуть | Тепер люди кажуть |
| 7 | 50 | Тепер, не обмахуйтеся | Тепер не обмахуйтеся |
| 8 | 60 | Тепер, для будь-кого | Тепер для будь-кого |
| 9 | 96 | Тепер, перед цим | Тепер перед цим |
| 10 | 137 | Тепер, чи знаєте ви | Тепер чи знаєте ви |
| 11 | 139 | Тепер, чи знаєте ви | Тепер чи знаєте ви |
| 12 | 141 | Тепер, ось яке благословення | Тепер ось яке благословення |
| 13 | 141 | Тепер, що таке вода? | Тепер що таке вода? |
| 14 | 141 | Тепер, Відья Лакшмі | Тепер Відья Лакшмі |
| 15 | 145 | Тепер, не кожна домогосподарка | Тепер не кожна домогосподарка |
| 16 | 62 | Давайте матимемо цю рішучість і давайте матимемо таку відвертість | Маймо цю рішучість і маймо таку відвертість |
| 17 | 168 | Тепер давайте матимемо людей як храми | Тепер маймо людей як храми |
| 18 | 149 | хоч би що ви намагалися | хоч би як ви намагалися |
| 19 | 97–100 | Ом твамева сакшат … сакшат Шрі Аді Шакті (×8) | Ом твамева Сакшат … Сакшат Шрі Аді Шакті (×8) |
| 20 | 147 | усі Лакшмі таттви | усі Лакшмі Таттви |

## Summary

- Language (L): 11 issues found, 7 approved by Critic (L1–L7)
- SY Domain (S): 7 issues found, 2 approved by Critic (S1–S2)
- Total corrections applied: 20 approved edits (28 individual text changes: 11× comma after «Тепер», 4× conjunction-junction comma, 3× «давайте матимемо» → «маймо», 1× «хоч би як», 8× «Сакшат», 1× «Таттви»)

Overall the translation is of high quality. Deity and Shri Mataji pronouns, glossary terms, quotation marks, dashes and apostrophes are correct and consistent throughout. The corrections are punctuation, two grammar fixes and two glossary-casing alignments. No change affects meaning.
