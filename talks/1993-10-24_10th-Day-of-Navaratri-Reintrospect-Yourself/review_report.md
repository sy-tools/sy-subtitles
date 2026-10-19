# Language Review – 1993-10-24_10th-Day-of-Navaratri-Reintrospect-Yourself, 2026-10-19

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019), quotes «» at all levels (nested quote in ¶21 also «»),
ellipsis `...` with no space before, no Latin/Cyrillic mixing, no double or
misplaced spaces, no invisible characters. Hyphenated forms all correct
(«дуже-дуже», «шість-сім», «давним-давно», «по-справжньому», «врешті-решт»,
«ось-ось», «такий-то й такий-то», «Хампті-Дампті», «Лос-Анджелес»).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | Verb form: 3rd-person plural «підносяться» with the 2nd-person subject «ви» | «коли **ви підносяться**, непомітно цей матеріалізм захоплює вас» (EN: “when you are rising”) | «коли **ви підноситеся**, непомітно…» |
| L2 | 10 | Case: «більше за» governs the accusative («за всіх Шумбх, Нішумбх»), but the coordinated tail slips into the genitive «всього такого» | «більше за всіх Шумбх, Нішумбх **і всього такого**» (EN: “than all the Shumba, Nishumbas and all that”) | «більше за всіх Шумбх, Нішумбх **і все таке**» |
| L3 | 20 | Gender agreement: the quoted self-examination is a woman's («готую для чоловіка»), and the next sentence contrasts it with «Чоловіки також можуть подумати так само», yet the verb is masculine | «**Що я зробив** для Сахаджа Йоґи? Крім того, що дбаю про своїх дітей, готую для чоловіка – і це все?» | «**Що я зробила** для Сахаджа Йоґи? Крім того…» |
| L4 | 21 | Spelling of the letter name: the orthographic dictionary form is «ігрек» (from French *i grec*; not a Sanskrit term, so the glossary's ґ rule does not apply) | «для ікс, **іґрек**, зет» | «для ікс, **ігрек**, зет» |
| L5 | 24 | The conjunction «як-от» (“for instance”) is hyphenated; written here as two words | «**Як от** Я сказала, що ця Католицька Церква ось-ось закінчиться» (EN: “Like I said that this Catholic Church is about to finish”) | «**Як-от** Я сказала, що…» |
| L6 | 25 | Pronoun agreement with the grammatically feminine «Людина» | «**Людина**, яка є сахаджа йоґом, – це перлина… що куди б ви **його** не привели» (EN: “you take him”) | (consider «куди б ви **її** не привели») |
| L7 | 8 vs 19, 24 | Mixed rendering of the repeated intensifier: «дуже-дуже» (¶8) vs «дуже, дуже» (¶19, ¶24 ×2) | «дуже-дуже крихітна частка» / «дуже, дуже важливий час» | (consider unifying) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 23 | Possible pronoun case: lowercase «я» outside the quotation that follows — if this is Shri Mataji speaking of Herself, it must be «Я» | «І ось що **я** маю зробити – і все! «Мені байдуже, чи доведеться мені зіткнутися з Раваною…»» (EN: “And that is what I have to do – finished! ‘I don't care whether I have to face Ravana…’”) | (consider «Я», or move the sentence inside the quotation) |
| S2 | 6 vs 20 | Two forms of the ceremony name: «Пуджу Деві» (¶6) and «Деві Пуджі» (¶20); glossary lists «Деві Пуджа» | «щоб провести **Пуджу Деві**» / «останній день **Деві Пуджі**» | (consider unifying to «Деві Пуджа») |

Checked and found correct (no findings): Shri Mataji pronouns uppercase in
every instance (Я/Мене/Мені/Мною/Мій/Моя/Моє/Мої/Себе/Своєму — ¶10–25),
including «Ви» when devotees address Her in quoted speech (¶12, ¶17, ¶21);
Goddess/Devi/Kali Mata pronouns uppercase («Вона», «Її», «Їй» — ¶6, 7, 11,
13); Shri Rama pronouns uppercase («Він», «Його», «Йому», «Нього», «Себе» —
¶14, ¶22); God «Він» uppercase (¶20); plural incarnations lowercase («вони
приходили» ¶6); regular people lowercase (the saint «його/він» ¶11, the Guru
«він» ¶12, the leader, the senior yogi, the «gem» ¶24–25); «Ґуру» uppercase
mirrors the source (¶12); glossary terms correct and consistent — Шакті, Аді
Шакті, Джаґадамба, Дурґа, Дхарма, Інкарнація (uppercase throughout), Істина,
Дух, Пуджа, Реалізація, Самореалізація, Кундаліні, Нірвана, Калі Юга, Махамайя,
Майя, Шрі Рама, Равана, Шрі Ґанеша (genitive «Ґанеші»), Калі Мата, Дашера
(corpus form), тапасья/тапасьї/тапасью, бандхан, бхакти, «віддатися на
милість» / «віддачі на милість» for *surrender*, «живити» for *nourish*,
«сахаджа йоґ / йоґиня / йоґи / йоґів / йоґами» lowercase with ґ, «в Сахаджа
Йозі» (locative); «На санскриті» and «англійська» lowercase; «реалізованих
душ» lowercase matches the lowercase source; «Атма Г’яна» follows the
corpus transliteration of *gyan* («Г’янешвара», «Г’янадева»); closing «Нехай
Бог благословить вас. Нехай Бог благословить вас.» matches the source exactly
(no “all”, no exclamation); editorial remarks «(сміється)» preserved as in
the source.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Unambiguous conjugation error: «ви» requires «підноситеся». The corpus uses «ви підносите(ся)» 11× and never «ви підносяться». |
| L | L2 | **Keep** | Genuine case error, not style: «за» takes the accusative, and «все таке» is the accusative form («всього такого» appears in the corpus only after genitive-governing words — «до всього такого», «після … і всього такого»). The corpus writes «і все таке» 63×. Minimal fix. |
| L | L3 | **Keep** | Gender agreement is a listed review criterion. The context fixes the speaker as a woman beyond doubt («готую для чоловіка»), and the very next sentence («Чоловіки також можуть подумати так само») only makes sense if the first thought was a woman's. The three other corpus instances of «Що я зробив для Сахаджа Йоґи» are gender-neutral contexts and are not affected. |
| L | L4 | **Keep** | Dictionary spelling, not preference: Ukrainian orthographic dictionaries give «ігрек»; the word is a French-derived letter name, outside the scope of the glossary's Sanskrit-ґ convention. This is the corpus's only occurrence, so no consistency precedent pulls the other way. |
| L | L5 | **Keep** | «Як-от» is the codified hyphenated conjunction, and the corpus writes it that way 77× against this single unhyphenated instance. Mixed style within the corpus is a review criterion. |
| L | L6 | **Remove** | Semantic (meaning-based) agreement with a male referent is acceptable in spoken register; the source has “him”, the intervening «сахаджа йоґом» is masculine, and the following quoted «Він – перлина» already commits to the masculine. Changing one pronoun would leave the passage no more consistent. |
| L | L7 | **Remove** | Both forms are orthographically valid: the hyphen is the norm for the reduplicated adverb, and the comma renders a spoken repetition with a pause (the source has “very, very” everywhere). Not an error; style only. |
| S | S1 | **Remove** | The attribution is genuinely ambiguous in the source: the sentence launches the model-yogi's inner speech («Я сахаджа йоґ, мені байдуже…»), which the translator consistently keeps in lowercase, and the sentence belongs to that voice rather than to Shri Mataji speaking of Herself. Capitalizing would assert a reading the source does not force. |
| S | S2 | **Remove** | Not an inconsistency: the two forms follow two different source phrasings — “the puja of the Devi” (¶6, a genitive construction) and “the Devi Puja” (¶20, the ceremony name from the glossary). Both are correct Ukrainian and both capitalize «Пуджа» per the glossary. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | коли ви підносяться, непомітно | коли ви підноситеся, непомітно |
| 2 | 10 | більше за всіх Шумбх, Нішумбх і всього такого | більше за всіх Шумбх, Нішумбх і все таке |
| 3 | 20 | «Що я зробив для Сахаджа Йоґи? Крім того, що дбаю про своїх дітей, готую для чоловіка | «Що я зробила для Сахаджа Йоґи? Крім того, що дбаю про своїх дітей, готую для чоловіка |
| 4 | 21 | для ікс, іґрек, зет | для ікс, ігрек, зет |
| 5 | 24 | Як от Я сказала, що ця Католицька Церква | Як-от Я сказала, що ця Католицька Церква |

## Summary

- Language (L): 7 issues found, 5 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 5

The translation is of high quality: faithful to the spoken source, with
devotional register, correct deity-pronoun capitalization throughout, and SY
terminology fully aligned with the glossary and the rest of the corpus. All
punctuation characters already followed Ukrainian orthography. The five
applied fixes are one verb-conjugation slip, one case-agreement slip after
«більше за», one gender-agreement fix in a woman's quoted self-examination,
one dictionary spelling («ігрек»), and one hyphenated conjunction («як-от»)
brought in line with the rest of the corpus. All discretionary items — a
semantic pronoun agreement, the «дуже-дуже»/«дуже, дуже» rendering, an
ambiguous first-person attribution, and the two source-driven forms of the
Devi Puja name — were filtered out by the Critic as not genuine errors.
All five corrections were applied and verified (each present exactly once,
old forms absent, line count unchanged, `tools.text_normalize --check` clean)
before this report was written.
