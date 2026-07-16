# Language Review – 1984-07-10 The Experience of Truth (Part IV), 2026-07-16

## Process

2+1 review of `transcript_uk.txt` (Ukrainian) against `transcript_en.txt` (English),
using `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`.
Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic filtered
their findings; approved corrections were applied to `transcript_uk.txt`.

Paragraph numbers correspond to line numbers in `transcript_uk.txt`.

> **Note.** This is the second review round for this talk. The first round
> (2026-05-30) applied 10 edits (ellipsis normalization `…`→`...`, capital letters
> at the start of quoted direct speech ×4, Shri Mataji pronouns «Вона»×2/«Вам»,
> «йоги»→«йоґи») — all verified as still in place. This round found residual
> misses of the same deity-pronoun class (S1–S3) plus new grammar/punctuation
> issues. One first-round verdict («Боже царство», then rejected as trivial) is
> overridden this round with corpus evidence — see Critic Filter. The first
> round's editorial decision on the lowercase generic «я» (paras 25/32) is
> upheld — see S5/S6.

Character-level checks re-confirmed the document is clean on: quotation marks
(only `«»`), apostrophes (only `’` U+2019), dashes (only spaced en-dash ` – `
U+2013), ellipsis (`...`, no space before), no double spaces, no space before
punctuation, and no Latin/Cyrillic mixing (only the intentional publication name
`«Bedfordshire Journal»` and Roman numeral `IV`).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 3, 7 | Транслітерація геогр. назви: правопис §129 вимагає «и» після «ч» у географічних назвах перед приголосним (Чикаго, Чилі — пор. правильне «Йоркшир» у §39 цього ж тексту); «і» після «з» зберігається (як Занзібар) | «Чізік Таун-хол» | «Чизік Таун-хол» |
| L2 | 12 | Вставна конструкція «можна сказати» не відокремлена комою після «або» (пор. правильне «або, як ми кажемо,» у §24) | «або можна сказати, ваш мозок розвивається» | «або, можна сказати, ваш мозок розвивається» |
| L3 | 44 | Те саме, що L2 | «або можна сказати, своїм причиновим началом» | «або, можна сказати, своїм причиновим началом» |
| L4 | 25 | Пропущена кома між сполучником «і» та дієприслівниковим зворотом «дивлячись на нього» (зворот можна переставити — кома обов'язкова) | «бачте, і дивлячись на нього, якщо є думка» | «бачте, і, дивлячись на нього, якщо є думка» |
| L5 | 29 | Хибне керування: «вражений» вимагає орудного відмінка (вражений чим), а не «від чого» | «усіляких речей, від яких Я була вражена» | «усіляких речей, якими Я була вражена» |
| L6 | 31 | Порушення узгодження: антецедент «людина» (одн., жін.) → присвійний займенник має бути «її», не «їхні» (EN singular they: «their eyes are twinkling») | «в очах людини, яка є реалізованою душею, їхні очі іскряться» | «її очі іскряться» |
| L7 | 27 | Порушення узгодження предикатива з «ви»: скрізь у тексті — множина («стаєте колективно свідомими», «сповненими спокою», «можете бути нечесними»); корпус: «ви стаєте одержимими» 3× проти 1× однини (лише тут) | «якщо ви стаєте одержимим, ви, можливо, не маєте думок» | «якщо ви стаєте одержимими» |
| L8 | 45 | Неприпустиме подвійне підсилення: «вкрай» — абсолютний інтенсифікатор, не поєднується з «дуже» (EN «very extreme» передається самим «вкрай»); єдине входження в корпусі | «лівосторонні люди, які дуже вкрай лівосторонні» | «лівосторонні люди, які вкрай лівосторонні» |
| L9 | 11 | Присудок у множині перед однорідними підметами, найближчий підмет в однині | «виникали велика сварка, і бійка, і те, і се» | (розглянуто: «виникала») |
| L10 | 21 | Позірна розбіжність маркерів переліку «спершу … а по-друге» | «що спершу треба піднестися, а по-друге, Він прийшов показати» | (розглянуто: «по-перше») |
| L11 | 30, 31 | Милозвучність: «з самого» → «із самого» перед «с» | «з самого погляду», «з самого вигляду» | (розглянуто: «із самого») |
| L12 | 17 | Розмовне вживання «що стосується Істини» в середині речення без співвідносного «у тому» | «немає розбіжності в думках, що стосується Істини» | (розглянуто: «у тому, що стосується Істини») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 34 | Займенник Шрі Матаджі з малої — пропущений у першому раунді залишок тієї самої серії, що вже виправлена («і Вона вийшла й зцілила мене», «а Вона сказала» — те саме мовлення хлопця) | «індійська пані, вона була вдягнена в біле сарі» | «індійська пані, Вона була вдягнена в біле сарі» |
| S2 | 31 | Звертання до Шрі Матаджі на «ти» з малої (чоловік Шрі Матаджі); корпус послідовно капіталізує: «Мати, Ти», «Матінко, чи Ти», «Звідки Ти» тощо; цей же текст капіталізує «Ви»/«Вам» до Неї (§§37, 41) | «Він сказав: як ти робиш таке зауваження» | «як Ти робиш таке зауваження» |
| S3 | 37 | Звертання до Шрі Матаджі на «ви» з малої; у цьому ж абзаці та сама пані звертається з великої («Вам не здається» — виправлено першим раундом) | «вона сказала: чим це ви насолоджуєтеся» | «чим це Ви насолоджуєтеся» |
| S4 | 39 | «Боже царство» з малої проти «Його Царство» через одне речення (той самий референт); корпус: «Царство Боже» / «Його Царство» з великої 25+×, малої «царство» немає ніде, крім цього місця | «це все Боже царство, у яке ви входите» | «це все Боже Царство» |
| S5 | 25 | «я» з малої в мовленні Шрі Матаджі («я підходжу й бачу ці квіти, тоді я реагую…» ×5) — правило «ALWAYS uppercase» | «Наприклад, я підходжу й бачу ці квіти» | (розглянуто: «Я» ×5) |
| S6 | 32 | Те саме: «я бачу індійця й одразу думаю» | «скажімо, я бачу індійця» | (розглянуто: «Я») |
| S7 | 11 | Звертання «Мати» замість глосарного «Матінко (звертання)» | «Мати, які вібрації йдуть від цього пса» | (розглянуто: «Матінко») |
| S8 | 21 | Непослідовність в одному абзаці: «прийшли на цю Землю» поруч із «прийшов на цю землю» ×2 | «прийшли на цю Землю, щоб встановити рівновагу» | (розглянуто: «землю») |
| S9 | 39 | «Матінка» (наз. відм.) замість глосарного «Мати» | «зараз Матінка говорить» | (розглянуто: «Мати говорить») |
| S10 | 10 | «Хазарат Бхал» — реальна святиня зветься Хазратбал (Срінагар) | «Вона називається Хазарат Бхал» | (розглянуто: «Хазратбал») |

> Verified correct (no change): Shri Mataji pronouns uppercase throughout narrative
> self-reference (Я/Мені/Мене/Мною/Мій/Моя/Моє, §§8–10, 14–18, 22, 24–25, 31–34,
> 37–38, 41, 43–48); Christ «Він/Його/Нього» uppercase (§§19, 29), Rama/Krishna «Він»
> (§21); Incarnations plural lowercase mid-sentence («вони кажуть те саме», §§20–21);
> God «Нього/Його/Він/Свого» (§39); regular people lowercase (Paul «він», §§17, 19;
> «Його взагалі не мало там бути» §19 — capital justified by sentence start). Generic
> quoted «я» correctly lowercase (§§9, 25, 34, 39, 42, 47). Spiritual terms per
> glossary: Істина (consistently capitalized, no lowercase instances), Дух, Святий
> Дух, Божественне, Інкарнації, Кундаліні, Войд, Пуджа-класу термінів немає;
> «духа» (§13, spirit-entity) correctly lowercase. Glossary terminology: Сахаджа
> Йоґа/Йоґи (ґ everywhere), сахаджа йоґ/йоґи/йоґів (lowercase, hard-stem plural),
> Калі Юга/Кріта Юга («Кріта Юзі» — correct г→з alternation), Сат Ґуру,
> Сат-Чід-Ананда/Ананду, ґріхастха, Ґуру Нанак, Лао-Цзи, Раджа Джанака, Нанак,
> Мойсей, Мохаммед Сахіб (3×), Мати Земля, реалізована душа, одержимий,
> лівосторонній/правосторонній, его, сходження, тантрік (Sanskrit «і» per project
> convention, overrides дев'ятка). Address forms «Матінко» (§§38, 41). Language
> names lowercase («англійська», header). Second-person address to Shri Mataji
> capitalized: «чи знаєте Ви» (§41), «Вам не здається» (§37), «Ви згадали сяйво»
> (§45).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Rule-backed: правопис §129 (geographic names take «и» after «ч» before a consonant — Чикаго, Чилі, Чорногорія); the text itself correctly writes «Йоркшир» by the same rule. Minimal fix «Чізік»→«Чизік»; «-зік» stands (з not in the geographic «и» list, cf. Занзібар). No conflict: `meta.yaml` stores the location in English only. |
| L | L2 | **Keep** | Genuine punctuation error: parenthetical «можна сказати» requires commas on both sides. The translator's own «або, як ми кажемо, через наш Дух» (§24) and corpus dominance (19× «або, можна сказати,» vs 4× without, 2 of the 4 being this talk) confirm the convention. |
| L | L3 | **Keep** | Same as L2. |
| L | L4 | **Keep** | Rule-backed: a movable adverbial-participle phrase after «і» is set off by a comma between the conjunction and the phrase. |
| L | L5 | **Keep** | Genuine government error: «вражений» + orudnyi («якими»), never «від яких». Minimal swap preserves word order. |
| L | L6 | **Keep** | Clear agreement error: «людина… їхні очі» mixes singular antecedent with plural possessive (calque of EN singular they). The next clause confirms singular framing («в очах такої людини»). §18 «їхні очі одержимі» is correct (antecedent «вони») and untouched. |
| L | L7 | **Keep** | Predicative adjectives with generic «ви» are plural everywhere else in this text and in the corpus (3:1); the lone singular is jarring and unmotivated. |
| L | L8 | **Keep** | «дуже вкрай» is an impossible collocation in Ukrainian («вкрай» is already absolute); EN «very extreme» is fully carried by «вкрай». Sole occurrence in the entire corpus. |
| L | L9 | **Remove** | A predicate preceding several coordinated subjects may take the plural; «виникали» is defensible. Same verdict as the 2026-05-30 round (its L7). |
| L | L10 | **Remove** | False positive: EN «you have to ascend first» — «first» modifies the ascending («спершу треба піднестися»), it is not an enumeration marker; only «secondly» enumerates. The translation is faithful and grammatical. |
| L | L11 | **Remove** | З/із alternation before «с» is a euphony recommendation, not a binding rule; «з самого» is widespread in edited Ukrainian prose. Style preference. |
| L | L12 | **Remove** | Colloquial syntax mirroring the source's spoken register («as far as the truth is concerned» mid-sentence); meaning is clear, a rewrite would be interpretation, not correction. |
| S | S1 | **Keep** | Residual miss of the exact class the 2026-05-30 round fixed (its S1/S2, same paragraph, same speaker): «і Вона вийшла й зцілила мене» is already uppercase two clauses earlier. Rule: Shri Mataji ALWAYS uppercase. |
| S | S2 | **Keep** | Corpus capitalizes 2nd-person address to Shri Mataji consistently («Мати, Ти», «Матінко, чи не заздриш Ти», «Звідки Ти», «Матінко, Ви»), and this document already does so for «Ви/Вам» (§§37, 41 — one fixed by the first round). «ти» from Her husband is the lone lowercase remnant. |
| S | S3 | **Keep** | Same speaker and paragraph as the first round's approved «Вам не здається» fix; leaving «чим це ви» lowercase is internally inconsistent. |
| S | S4 | **Keep** | *Overrides the 2026-05-30 Critic's «trivial» verdict (its S6) with corpus evidence:* «Царство Боже»/«Його Царство» is capitalized in 25+ places across the corpus with zero lowercase counterexamples outside this line; «Його Царство» one sentence later in this very paragraph has the capital. The EN realm/Kingdom lexical difference collapses in Ukrainian (same word «Царство»), so the capitalization split cannot be «за оригіналом». |
| S | S5 | **Remove** | Upholds the 2026-05-30 round's documented editorial decision: the lowercase «я» in §25 is intentional role-play of the unrealized, reactive mind («я реагую назовні»), deliberately contrasted with genuine self-reference «Я сиджу тут… і думаю про когось» (§33, uppercase). Reversing a documented, semantically motivated choice without new evidence would churn the text. |
| S | S6 | **Remove** | Same as S5 — §32 «я бачу індійця й одразу думаю: о, з якої він країни» is the same role-played reactive mind (Shri Mataji elsewhere states She does not react). |
| S | S7 | **Remove** | «Мати,» as address is corpus-attested ~160× (incl. «Мати, Ти», «Мати, чи не зупиниш Ти»); the glossary lists «Мати» as a valid rendering of «Mother» and notes «Матінко» as *an* address form, not the only one. Not an error. |
| S | S8 | **Remove** | Mirrors the source's own capitalization («on this Earth» for the Primordial Masters vs «on this earth» for Rama/Christ); corpus is genuinely mixed (15× «на цю Землю» vs 19× «на цю землю»), so no convention is violated; «Земля» capital is defensible as the planet. Not flagged by the first round either. |
| S | S9 | **Remove** | «Матінка» is a natural affectionate nominative matching the vocative «Матінко» and is corpus-attested («Матінка просить»); it renders the devotee's inner voice («зараз Матінка говорить») better than the neutral «Мати». Style, not error. |
| S | S10 | **Remove** | The source itself transcribes the shrine as spoken («Hazarat Bhal»); the translation faithfully preserves Shri Mataji's pronunciation. Normalizing to the encyclopedic «Хазратбал» would diverge from the source transcript. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 3 | «Чізік Таун-хол» (і після ч у геогр. назві) | «Чизік Таун-хол, Лондон (Англія)» |
| 2 | 7 | «Чізік Таун-хол» | «Чизік Таун-хол, Лондон (Велика Британія), 10 липня 1984.» |
| 3 | 12 | Вставне «можна сказати» без коми після «або» | «або, можна сказати, ваш мозок розвивається» |
| 4 | 44 | Те саме | «або, можна сказати, своїм причиновим началом» |
| 5 | 25 | Кома між «і» та дієприслівниковим зворотом | «бачте, і, дивлячись на нього, якщо є думка» |
| 6 | 29 | Керування «вражений від» → орудний | «усіляких речей, якими Я була вражена» |
| 7 | 31 | «людина… їхні очі» → «її очі» | «яка є реалізованою душею, її очі іскряться» |
| 8 | 27 | «ви стаєте одержимим» → множина | «якщо ви стаєте одержимими» |
| 9 | 45 | «дуже вкрай» → «вкрай» | «лівосторонні люди, які вкрай лівосторонні» |
| 10 | 34 | Займенник Шрі Матаджі з малої | «індійська пані, Вона була вдягнена в біле сарі» |
| 11 | 31 | Звертання до Шрі Матаджі «ти» → «Ти» | «Він сказав: як Ти робиш таке зауваження» |
| 12 | 37 | Звертання до Шрі Матаджі «ви» → «Ви» | «чим це Ви насолоджуєтеся, справді насолоджуєтеся?» |
| 13 | 39 | «Боже царство» → «Боже Царство» | «це все Боже Царство, у яке ви входите» |

## Summary

- Language (L): **12** issues found, **8** approved by Critic
- SY Domain (S): **10** issues found, **4** approved by Critic
- Total corrections applied: **13** (12 findings; L1 fixed at two loci)

### Notes
- The first round's 10 corrections were all verified as still in place before this
  round's edits.
- The translation remains of high quality: after this round, deity-pronoun
  capitalization is fully consistent, including second-person address to Shri
  Mataji («Ти/Ви/Вам») and the boy's narrative about the lady in white (§34).
- The deliberate lowercase generic «я» (role-played reactive mind, §§25, 32, 42)
  is preserved as a documented editorial decision of the 2026-05-30 round.
- No structural, character-level, or glossary-term violations remain detectable
  by automated scan.
