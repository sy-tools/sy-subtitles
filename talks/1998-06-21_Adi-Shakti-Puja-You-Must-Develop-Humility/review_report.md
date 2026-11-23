# Language Review – Adi Shakti Puja: You Must Develop Humility, 1998-06-21

Talk: `talks/1998-06-21_Adi-Shakti-Puja-You-Must-Develop-Humility/`
Reviewed file: `transcript_uk.txt` (35 paragraphs, lines 6–40, aligned 1:1 with `transcript_en.txt`)

## Process

2+1 review per `templates/language_review_template.md`:
Reviewer L (Language) and Reviewer S (SY Domain) both read the full text; the
Critic filtered their findings against `glossary/AGENTS.md` (including
"Fidelity to the Spoken Original"), `terms_lookup.yaml` and `terms_context.yaml`.

Mechanical checks, all clean before review:
- No Latin letters mixed into Cyrillic words
- Quotation marks are `«»` only. No `„"`, `""` or `''`, and every line is balanced.
- Dashes are ` – ` (U+2013) only. No hyphen- or em-dash used as a dash.
- No double spaces and no space before punctuation
- Ellipses are `...` with no space before (2 occurrences)
- Apostrophes are `’` (U+2019) only
- Lowercase first-person/third-person pronouns belong only to ordinary people:
  the woman on the plane, the scientist, a person speaking to their own
  temper. Every pronoun for Shri Mataji / Adi Shakti is uppercase
  (Я/Мені/Мене/Моя/Своїй/Сама/Вона/Її/Та, Хто/Яка).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7 (line 7) | Lexical calque: «вийти з (відкриттям/пропозицією)» is a calque of Russian «выйти с»; the normative Ukrainian verb for presenting something publicly is «виступити з» | «і коли він вийшов із цим відкриттям, Я була певною мірою щаслива» | «і коли він виступив із цим відкриттям» |
| L2 | 26 (line 26) | Missing dash between an infinitive subject and a predicate introduced by «це» (Правопис: «Жити – це боротися»). The parenthetical «Я б сказала» is closed by its comma, and the dash must then follow before «це». | «бачити [вади] в Сахаджа Йозі, Я б сказала, це ще дуже початкова річ» | «бачити [вади] в Сахаджа Йозі, Я б сказала, – це ще дуже початкова річ» |
| L3 | 25 (line 25) | «напевно» may be read as "probably", which weakens EN "positively" | «Перше, що ви повинні визначити, – це напевно: «Скільком ви дали реалізацію?»» | «це неодмінно:» |
| L4 | 33 (line 33) | «народилися особливо» reads as incomplete ("especially") for EN "specially born" | «але ви народилися особливо, тож усвідомте свою цінність» | «народилися по-особливому» |
| L5 | 12 (line 12) | Comma after sentence-initial «Особливо», which is not a parenthetical word | «Особливо, ви будете вражені, що християнська релігія…» | «Особливо ви будете вражені…» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 12 (line 12) | Inconsistent capitalization of the same term: in the next sentence (line 13) it is «Принципу Матері», and the corpus uses «Принцип Матері» for the divine principle (1998-05-10 Sahasrara Puja; cf. glossary «Принцип Ґуру») | «люди мають повне уявлення про принцип Матері, який здійснив усе» | «про Принцип Матері, який здійснив усе» |
| S2 | 15, 21, 22, 25 | Mixed «Реалізація» / «реалізація» | «скільком людям ми дали реалізацію?» vs «Вам дали Реалізацію» | Unify to «Реалізація» |
| S3 | 33 (line 33) | «Часу Розквіту» is capitalized, while EN has lowercase "blossom times" | «в цей переломний момент Часу Розквіту» | «часу розквіту» |
| S4 | 40 (line 40) | Closing blessing differs from the glossary's fixed phrase «Нехай Бог благословить усіх вас» | «Нехай Бог благословить вас.» | «Нехай Бог благословить усіх вас.» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | This is a real lexical calque. Ukrainian usage guides (Караванський, Антоненко-Давидович) prescribe «виступити з ініціативою/пропозицією», not «вийти з…». In Ukrainian, «вийти з відкриттям» literally means "to walk out carrying a discovery". The fix is one word and does not touch the meaning. |
| L | L2 | **Keep** | The rule is clear: a dash goes before «це» linking an infinitive subject to the predicate. The translator applies it elsewhere in the same text («Сказати щось, завдати комусь болю – дуже гріховно», «Що вам допоможе найбільше – це…»). |
| L | L3 | Remove | False positive. Normatively «напевно» means «безперечно, точно» (СУМ, sense 1), and style guides keep it apart from «мабуть» ("probably"). That is exactly EN "positively", so the original is correct. |
| L | L4 | Remove | «особливо» in the sense «по-особливому, не так, як інші» is listed in СУМ (sense 2). The phrase is grammatical, and it closely mirrors the spoken "specially born". This is a style preference, not an error. |
| L | L5 | Remove | The comma reproduces the spoken discourse marker "Especially," and does not hinder comprehension. Removing it would make «особливо» modify «вражені» and shift the nuance. Trivial, so not approved. |
| S | S1 | **Keep** | The same concept is capitalized two different ways in two adjacent sentences. The text also says «який здійснив усе» ("that has worked out everything"), so this is the divine principle. That matches «Принципу Матері» on line 13 and corpus usage. |
| S | S2 | Remove | The variation mirrors the EN source exactly ("realization" vs "Realization"), and `terms_lookup.yaml` lists both forms as valid (Реалізація / реалізація). It is not an error. |
| S | S3 | Remove | "Blossom Time" is a recognized concept in Shri Mataji's teaching, so capitalizing it is a defensible translator choice. Capitalization is not changed by judgement alone. |
| S | S4 | Remove | False positive. The glossary phrase translates "May God bless you **all**", but the EN here is "MAY GOD BLESS YOU" with no "all". Adding «усіх» would put a word into Her mouth (Fidelity rule). «Нехай» is correctly used. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 7 (line 7) | «коли він вийшов із цим відкриттям» – calque | «коли він виступив із цим відкриттям» |
| 2 | 12 (line 12) | «про принцип Матері, який здійснив усе» – inconsistent capitalization | «про Принцип Матері, який здійснив усе» |
| 3 | 26 (line 26) | «Я б сказала, це ще дуже початкова річ» – missing dash before «це» | «Я б сказала, – це ще дуже початкова річ» |

## Notes (verified correct, no change)

- **Fidelity to the original was preserved, rightly.** The translation leaves
  Shri Mataji's spoken roughness unrepaired: «Усе це Я зробила в іншій книжці,
  яку Я зараз збираюся написати», the unfinished «але коли ви розумієте, що
  Вона зробила», «Один всесвіт... існує 14 Бхуван», the fragment «Аді Шакті,
  Яка є четвертим виміром…», and the "we" in «що те, що ми робимо». The
  translator's additions are minimal and bracketed: «[такими]» twice and
  «[вади]». The source's own additions «[світи]», «[у Пуні]» and
  «[Сапташрунґі в Насіку]» are kept.
- **Glossary terms are correct:** Аді Шакті, Пуджа, Сахасрара, Махакалі,
  Махасарасваті, Махалакшмі, Шрі Ґанеша (acc. Ґанешу), Вірата, пітхи, Кундаліні,
  Майя, сваямбху, Мати Земля, сходження, Реалізація/реалізація, реалізована
  душа, его, Дух, Аґія чакра (loc. Аґії чакрі), Шакті, Божественне, Матінко
  (address).
- **Sahaja Yoga forms are correct:** «в Сахаджа Йозі» for both locative and
  dative, «сахаджа йоґи/йоґів/йоґами», «сахаджа йоґинь», «сахадж роботу».
- **Sanskrit transliteration uses ґ:** Чатуршрінґі, Сапташрунґі, Ґанеша, ґуру.
- **Language and religion names are lowercase:** англійська, іслам,
  християнська, індуїстська.
- **Direct-speech punctuation is correct throughout,** for example
  «Ні, – сказав він, – я просто…» and «…енергії», – і саме це…

## Summary

- Language (L): 5 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 3
