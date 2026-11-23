# Language Review – 1994-05-08_Sahasrara-Puja-Mahamaya-Swarupa, 2026-11-23

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
no em-dash or hyphen-as-dash; apostrophe `’` (U+2019) only; quotes «» only, no
`„"`/`""`; no Latin/Cyrillic mixing; no double spaces or spaces before
punctuation; ellipsis `...` (no `…`). The «» pairs that look unbalanced on lines
14/15 and 73/74 are single quotations that run across a paragraph break, exactly
as in the English (lines 14–15 and 73–74), so they are correct.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 73 | Conjunction «що» plus a colon before direct speech: indirect and direct speech are mixed, and a colon cannot follow a subordinating conjunction | «Але в тому звіті він **написав, що: «У нас є** майно Сахаджа Йоґи…» | «Але в тому звіті він **написав: «У нас є** майно Сахаджа Йоґи…» |
| L2 | 72 | The sentence has no main predicate. The English is a cleft sentence (“And **it is** that knowledge, which is intuitive, we can call it **[which]** comes through Mahamaya”), but the Ukrainian drops “it is”, so the bracketed «[яке]», carried over from the English, opens a second relative clause and nothing closes the sentence | «**І саме це знання**, яке є інтуїтивним, можна сказати, [яке] приходить через Махамайю.» | «**І це саме те знання**, яке є інтуїтивним, можна сказати, [яке] приходить через Махамайю.» |
| L3 | 26 | Pleonasm: «дедалі більше» already means “more and more”, so «й більше» repeats it | «бо вони повинні мати **дедалі більше й більше** свободи» | «дедалі більше свободи» |
| L4 | 25 | «як» can be read as “how” rather than “since/as” | «Матінко, **як Ти розв’язуєш** проблеми сахаджа йоґів, чому б Тобі не розв’язати…» | «Матінко, **оскільки Ти розв’язуєш**…» |
| L5 | 82 | Active present participle in «-ючий», which Ukrainian norms discourage | «тієї вічно **струменіючої** Махамайї» | (consider «вічно плинної») |
| L6 | 61 | Plural predicate with the quantity word «мало» (while ¶13 uses the singular «багато… робило») | «дуже мало людей **їздять** кататися на лижах» | «дуже мало людей **їздить**» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 12, 63 (also 21) | Lowercase feminine pronoun for Mahamaya, the Goddess, while Her other pronouns are uppercase | ¶12 «Вона буде Махамайєю… Але **вона** також діє на людей, які шукають»; ¶63 «Даючи урок одній людині, **вона** приголомшує щонайменше тисячі»; ¶21 «без **неї** ви не можете стати переді Мною» | «Вона» / «Неї» |
| S2 | 21 | Glossary lists «Сакар / Ніракар» capitalised; the text has it lowercase | «Я можу бути просто тут у **ніракарі**, у безформній формі» | «у **Ніракарі**» |
| S3 | 81 | Glossary lists «Ананда» capitalised; the text has it lowercase | «насолоджувалися Ніранандою, нічим, крім **ананди**, нічим, крім радості» | «крім **Ананди**» |
| S4 | 9 | AGENTS.md capitalises «Істина» for the absolute Truth | «А проблема з **істиною** в тому, що вона не може піти на компроміс» | «з **Істиною**» |

Checked and found correct (no findings):
- **Shri Mataji's pronouns** are uppercase in every instance (Я/Мене/Мені/Мною/Мій/Моя/Моє/Мої, Вона/Її/Їй in the visitors' quotes in ¶17, ¶29), and so are Тобі/Ти in address (¶24, 25). Every lowercase «я/мій/моє» is inside a quotation of another speaker (¶14, 16, 38, 43, 48, 58, 60, 73, 75).
- **Emphatic and reflexive forms** «Я Сама» (¶30), «у Свій власний» (¶80) and «за Свого життя» (¶92) follow the corpus convention (23× «Я Сама» against 6× «Я сама»; capitalised «Свій/Свого» is standard).
- **Relative pronoun** «Вішну, Який став Рамою» (¶29): there is no rule on relative pronouns and the corpus is split, so it was not flagged.
- **Paramchaitanya** is «вона» in lowercase (¶30–34), matching the English “it”, the all-pervading power.
- **Glossary terms match:** Сахасрара, Аґія, Махамайя (declined correctly: Махамайєю, Махамайї, Махамайю), Махамайя Сварупа, Парамчайтанья, Брахмарандхра, Нірананда, Вірата/Віратангана, Калі Юзі (locative, corpus 12×), ракшаси (lowercase), обумовленість/обумовленості, віддача на милість, сходження, Реалізація, Інкарнація/Інкарнації (uppercase), Дух («свободу Духа»), Мати Земля, Радха, Ґанеша Пуджа and Сахасрара Пуджа (Пуджа uppercase).
- **Sahaja forms:** «сахаджа йоґ / сахаджа йоґа (acc.) / сахаджа йоґи / йоґів / йоґам» are correct. «Сахаджа Йозі» is the correct locative. «сахаджа культура», «сахаджа спосіб» and «сахаджа особистістю» are lowercase modifiers as in the glossary's own examples.
- **Language names** are lowercase («англійська газета» ¶52, header line 4).
- **The closing blessing** «Нехай Бог благословить вас!» matches the English “May God bless you!”. The source has no “all”, so the fixed «усіх вас» formula does not apply.
- **Translator's brackets** carry the English ones over faithfully: [бо], [своє], [з], [бути], [сторона], [коли], [баронів], [оголошення], [для], [тепер є], [все], [хто], [яке]. «[йоґи]» (¶69) bridges a reference that shifts (singular “a Sahaj Yogi” taken up as “they”), exactly as AGENTS.md prescribes. «сахаджа [люди]/[людиною]» (¶45, 47) and «[діє]» (¶76) are minimal and legitimate additions.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | A genuine punctuation error, and prior reviews ruled the same way on this exact pattern (1977-11-01 You all are Shri Kalki, 1991-05-05 Sahasrara Puja, 1993-07-04 Guru Puja: «що: «» → «: «»). Dropping the function word «що» loses nothing of what was said; this same transcript already renders “said that, “…”” as «сказали: «…»» (¶29) and «закликали людей: «…»» (¶65). |
| L | L2 | **Keep** | A real grammatical gap, not a matter of taste: the Ukrainian sentence has no main predicate. Putting back «це… те» restores the English “it is”, so the fix is *more* faithful to the spoken words, not a repair of them. It also gives the English bracket «[яке]» the job it has in the source, completing the cleft “it is that knowledge [which] comes”. |
| L | L3 | **Remove** | The doubling renders the speaker's own repetition (“more freedom and more freedom”). Under the fidelity rule, a spoken repetition stays as it is. The intensifying redundancy is a feature of colloquial speech, not a grammatical error. |
| L | L4 | **Remove** | False positive. «як» in a causal/conditional sense (“since, if”) is a standard dictionary meaning in Ukrainian, and the comma plus the following «чому б Тобі…» leaves no doubt about the reading. Changing it is a style preference. |
| L | L5 | **Remove** | «струменіючий» is an established literary epithet in elevated style, and it fits this devotional passage. The restriction on «-ючий» participles is a stylistic recommendation, not a rule, so this is not an error. |
| L | L6 | **Remove** | With «мало/багато» and an animate subject, Ukrainian grammar allows both the singular and the plural predicate. Neither form is an error, and the two paragraphs are not parallel constructions that would need to match. |
| S | S1 | **Remove** | The translator mapped the English pronouns deliberately and consistently through the whole talk: English “it” becomes lowercase «вона/неї» (¶12, 21, 63) and English “She/Her” becomes uppercase «Вона/Її/Неї» (¶26, 56, 58, 63, 68, 71–72, 77–78, 80, 83–84). Ukrainian has no neuter pronoun for the feminine noun «Махамайя», so capitalisation is the only way to keep the speaker's own it/She distinction. The corpus does the same, e.g. the 1985-04-20 Mahamaya Shakti seminar: «Махамайя діє. Перш за все, вона приголомшує вас». Making all of them uppercase would erase a distinction that was spoken. |
| S | S2 | **Remove** | The English has lowercase “nirakaar”, used here as a common noun (the state of formlessness) and glossed at once as «у безформній формі». The corpus writes this concept-noun in lowercase elsewhere (1990-08-31 Hanumana Puja «Він може входити в ніракар», 1995-09-10 Ganesha Puja «вони вірять у ніракар»). The glossary's uppercase «Ніракар» names the aspect of God, which is a different use. |
| S | S3 | **Remove** | The English has lowercase “ananda”, used as a common noun and glossed at once by its parallel «нічим, крім радості». There is corpus precedent for the lowercase common noun (1978-12-09 seminar «як же ананда, радість?»). The glossary's «Ананда» is the name of divine Bliss, and the named state «Ніранандою» in the same sentence is correctly capitalised. |
| S | S4 | **Remove** | The English has lowercase “the truth”, and the passage sets ordinary truth against untruth («з неправдою… що правдиве»). Everywhere else in this talk “the truth” means the truth about oneself (rendered «правда», ¶14, 19, 63). The uppercase rule is reserved for the absolute Truth, and reading it into this sentence would be the translator's interpretation. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 72 | І саме це знання, яке є інтуїтивним, можна сказати, [яке] приходить через Махамайю. | І це саме те знання, яке є інтуїтивним, можна сказати, [яке] приходить через Махамайю. |
| 2 | 73 | Але в тому звіті він написав, що: «У нас є майно Сахаджа Йоґи… | Але в тому звіті він написав: «У нас є майно Сахаджа Йоґи… |

## Summary

- Language (L): 6 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: 2

The translation is of high quality and faithful to the spoken original. It
renders Shri Mataji's teaching on Mahamaya Swarupa with devotion and keeps the
roughness of the spoken source intact, using translator's brackets exactly as
`glossary/AGENTS.md` prescribes. Deity-pronoun capitalisation is correct and
consistent: Shri Mataji is uppercase throughout, and the speaker's own it/She
distinction for Mahamaya is kept on purpose. Sacred terms, glossary
equivalents, Sahaja-word declensions and all punctuation characters follow the
project's rules.

The two applied fixes are both grammatical:
- One restores the main clause of a cleft sentence, which also makes it closer to the English.
- One removes a colon after the conjunction «що» before direct speech, following earlier reviews.

The Critic removed every capitalisation suggestion as a false positive: the
English is lowercase, the word is used as a common noun, and the corpus has
precedent for the lowercase form.
