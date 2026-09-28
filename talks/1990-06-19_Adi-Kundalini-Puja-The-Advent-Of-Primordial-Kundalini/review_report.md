# Language Review – 1990-06-19_Adi-Kundalini-Puja-The-Advent-Of-Primordial-Kundalini, 2026-09-28

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019), quotes «» (one quotation, ¶31, with the full stop
correctly outside the closing mark), no Latin/Cyrillic mixing, no double or
misplaced spaces, no ellipses, `tools.text_normalize --check` passes. Header
lines 3–4 («Медлінг (Австрія)», «Мова промови: англійська | Транскрипт
(українська)») match the corpus convention and the other Mödling talk
(1988-06-08 Ekadasha Rudra Puja). The two `[???]` markers (¶18, ¶23) and the
trailing dash of the interrupted sentence (¶13) mirror the source.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 30 | Missing comma before the subordinate purpose clause; «лише» belongs to the clause, so the comma goes before the particle | «Вони хочуть використати свою силу мовлення **лише щоб** похизуватися своїми знаннями» (EN: “just to show off their knowledge”) | «свою силу мовлення**, лише щоб** похизуватися» |
| L2 | 15 | Predicate agreement with subjects of different gender joined by «чи»: the nearest subject (and the intervening «хто б це не був») is masculine, yet the verb is feminine | «щоб **вона чи він, хто б це не був, поводилася** так» (EN: “she or he, whatever it is, has to behave”) | (consider «поводився») |
| L3 | 23, 26, 31 | Comma at the junction of a coordinating conjunction and a subordinate clause («і, щоб…», «Але, якщо…», «Але, щоб…») when the subordinate part can be removed without restructuring | ¶23 «і **щоб** зробити відображення правдивим, справжнім, ви маєте…»; ¶26 «Але **якщо** ви використаєте трохи ртуті…, воно відображатиме»; ¶31 «Але **щоб** іти далі, ви маєте мати…» | «і, щоб…», «Але, якщо…», «Але, щоб…» |
| L4 | 25 | «насамперед» is an adverb, not a parenthetical word, and is normally not set off by commas | «ви мусите навчитися**, насамперед,** найголовнішого» (EN: “first of all, foremost thing”) | «навчитися насамперед найголовнішого» |
| L5 | 20 | Active present participle «люблячий» is discouraged in modern Ukrainian usage | «такою **люблячою**, такою ніжною» (EN: “so loving, so affectionate”) | (consider «сповненою любові») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 19 | Kundalini pronoun capitalisation inconsistent within the talk: the (Primordial) Kundalini is «Вона/Її/Неї» uppercase in ¶11, 13, 23 (×3), 24 (×3), 29, 32 — including where EN has “it” («It rises» → «Вона піднімається», «how it acts» → «як Вона діє») — but lowercase here | «Тож **вона** діє на обох рівнях» (EN: “So it acts on both the levels” — antecedent «ця Первинна Кундаліні», ¶18) | «Тож **Вона** діє на обох рівнях» |
| S2 | 28 | Same inconsistency: three lowercase pronouns for the Primordial Kundalini in the sentence that announces the talk's subject | «розповісти вам про цю Первинну Кундаліні: як **її** було опрацьовано, як **її** було вбудовано і як **їй** було дано так багато сил» | «як **Її** було опрацьовано, як **Її** було вбудовано і як **Їй** було дано» |
| S3 | 8 | Lowercase «вона» for the power that is named the Primordial Kundalini in the same clause | «одну зі Своїх сил, яку ми можемо назвати Первинною Кундаліні, і **вона** є частиною Її» | (consider «Вона») |
| S4 | 29 | Mixed forms of the practice name within one paragraph: «Сахаджа Йоґу» then twice «Сахадж Йоґу» | «використовувати **Сахаджа Йоґу** для певних цілей, і потайки вони знають, що використовують **Сахадж Йоґу**… Якщо ви почнете використовувати **Сахадж Йоґу**» (EN: “Sahaja Yoga … Sahaj Yoga … Sahaj Yoga”) | (consider unifying to «Сахаджа Йоґу») |
| S5 | 19 | «рашті» transliterates the source's “rashti”; the Sanskrit pair for collective/individual is samaṣṭi/vyaṣṭi, so the source is likely mis-transcribed | «тобто **самашті та рашті**» (EN: “samashti and rashti”) | (would be «в’яшті» — but only if the source were corrected) |

Checked and found correct (no findings): Shri Mataji pronouns uppercase in
all instances («Я», «Сама», «Собі», «Мою», «Моїх», «Мої», «Я була», «Я
впевнена» — ¶21, 23, 28, 31, 32); Adi Shakti / Primordial Mother «Вона»,
«Своїх», «Її» uppercase (¶8, 16); «Інкарнація» uppercase in every instance
including the plural, with the plural Incarnations' pronouns lowercase («їх
посилали», «вони мають досягти», «усі вони», ¶9) per the rule; deities plural
lowercase pronouns («вони виконали», «їм», ¶22); «Пуджа/Пуджу/Пуджі» uppercase;
«Божественного/Божественному/Божественним» uppercase; glossary terms correct —
«Кундаліні», «Сахасрара/Сахасрарі/Сахасрари», «Аді Шакті», «Афіни», «Махамайєю/
Махамайї», «Калі Юги/Югу», «Реалізацію», «Самореалізацію», «масову Реалізацію»,
«сходження», «аскези», «его», «обумовленості» (conditionings) vs «умовностей»
(conditions), «віддача/віддатися на милість» (surrender), «живлення», «протокол»,
«бандхану», «мантру», «вібрації», «чакр», «Махавіра», «Махайоґами»; «сахаджа
йоґи/йоґами» lowercase with the hard-stem plural per glossary; «Сахаджа Йозі»
locative with ґ→з; «тапас/тапасі/тапасу» transliterates the source's “tapas”
(the glossary's «тапасья» is for “tapasya”) and agrees with corpus usage;
language name «англійська» lowercase; closing blessing «Нехай Бог благословить
усіх вас.» matches the fixed glossary formula.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine punctuation error: a subordinate purpose clause is left unmarked. The restrictive particle «лише» opens that clause («just to show off»), so the comma belongs before it, as in 15 corpus instances of «, лише щоб». Minimal, unambiguous fix. |
| L | L2 | **Remove** | Grey area, not a clear-cut error: the clause's real subject is «така особа» (feminine) and the feminine singular reflects the referent (the Mahamaya incarnation is Shri Mataji Herself). Switching to masculine would shift that nuance; a plural predicate with «чи» is non-normative. The only instance of this construction in the corpus is this one. |
| L | L3 | **Remove** | Debatable rule with a settled repo convention against it: the corpus writes «Але якщо» 230× vs «Але, якщо» 4×, «Але щоб» 10× vs 0, «Тож якщо» 64× vs 10×. Applying it here would make this talk the outlier and would have to extend to «Тож якщо» (¶25, 26) to stay consistent. Not an error a reader would perceive. |
| L | L4 | **Remove** | The commas render the source's spoken aside (“first of all, foremost thing,”) and the corpus accepts both (4× with commas). Intonational punctuation, not a codified error. |
| L | L5 | **Remove** | «люблячий» is a dictionary word, used 12× across the corpus; replacing it is a style preference and the source's “so loving” has no better one-word equivalent. |
| S | S1 | **Keep** | Mixed styles within one transcript is an explicit review criterion. The translator's own practice capitalises the Kundalini's pronouns ten times, including where EN has “it” (¶23), so the lowercase here — with the same antecedent («ця Первинна Кундаліні», ¶18) — is an inconsistency, not a choice. The corpus is split (22 uppercase / 32 lowercase), so in-talk consistency governs. |
| S | S2 | **Keep** | Same criterion as S1: the sentence names the Primordial Kundalini and then refers to Her three times in lowercase, one paragraph before «про Неї» (¶29) and four after «Вона Сама» (¶24). Capitalising aligns with every other pronoun for Her in this talk. |
| S | S3 | **Remove** | False positive: the grammatical antecedent is the common noun «сила» («одну зі Своїх сил»), and the lowercase «вона» usefully distinguishes the power from the Mother's «Її» in the same clause. |
| S | S4 | **Remove** | The glossary lists «сахаджа»/«сахадж» as interchangeable, with the form following the original, and the EN has “Sahaj Yoga” at exactly these two points. The variant appears in 9 other talks (18×). Not an error. |
| S | S5 | **Remove** | Source fidelity: the translation renders the transcript as published; correcting a suspected transcription slip in the English is outside a language review and would desynchronise the UK text from the EN it is aligned to. Noted for the record only. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 19 | Тож вона діє на обох рівнях | Тож Вона діє на обох рівнях |
| 2 | 28 | як її було опрацьовано, як її було вбудовано і як їй було дано так багато сил | як Її було опрацьовано, як Її було вбудовано і як Їй було дано так багато сил |
| 3 | 30 | свою силу мовлення лише щоб похизуватися | свою силу мовлення, лише щоб похизуватися |

## Summary

- Language (L): 5 issues found, 1 approved by Critic
- SY Domain (S): 5 issues found, 2 approved by Critic
- Total corrections applied: 3

The translation is of high quality: faithful to the spoken source, devotional
in register, and fully aligned with the glossary on terminology, deity-pronoun
capitalisation for Shri Mataji and the Adi Shakti, and Ukrainian punctuation
characters. The three applied fixes are one missing comma before a purpose
clause and two consistency fixes bringing the Kundalini's pronouns in ¶19 and
¶28 into line with the uppercase «Вона/Її/Неї» the translator uses everywhere
else in this talk. All discretionary items — junction commas the corpus does
not use, the «Сахадж Йоґа» variant the glossary permits, and the source's
“rashti” — were filtered out by the Critic.
