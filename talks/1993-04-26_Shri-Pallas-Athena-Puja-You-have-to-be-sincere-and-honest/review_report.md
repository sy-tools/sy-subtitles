# Language Review – 1993-04-26 Shri Pallas Athena Puja: You have to be sincere and honest

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter, per `templates/language_review_template.md`.

Reviewers L (Language) and S (SY Domain) ran in parallel against `transcript_uk.txt`,
the English original `transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml` and
`terms_context.yaml`. The Critic then filtered both tables, removing false positives and
non-errors, and the approved corrections were applied to `transcript_uk.txt`.

**This is review round 2.** A previous round applied 34 corrections (16× lowercase
`я` → `Я` for Shri Mataji, 15× final period moved outside closing `»`, Latin `«atha»` →
`«атха»`, `щасливі….` → `щасливі...`, `одної ночі` → `однієї ночі`) — all verified as
present in the current text. This round reviews the already-corrected transcript.

Paragraph numbers follow the previous round's convention (body paragraph = its line in
the file): ¶7 = «Це дуже великий день для Мене…», ¶8 = «Тепер ви маєте зрозуміти…», etc.

Mechanical typography checks (automated): no Latin/Cyrillic mixing, apostrophe `’`
(U+2019) throughout, quotes `«»` only, en-dash ` – ` with spaces, no `—`/`""`/`„"`,
no double spaces, no space before punctuation, ellipsis `...` without preceding space.
All clean.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | Verb government: «керувати» requires the instrumental case (керувати *чим*), but shares an accusative object with «контролювати» | «зацікавлений у тому, щоб керувати й контролювати ці дві області» | «зацікавлений у тому, щоб керувати цими двома областями й контролювати їх» |
| L2 | 19 | Verb government distorts the meaning: «повідомити її» = "notify her", but the original ("if it is informed") means "if it is reported (about her)" | «Таку людину, знаєте, якщо її повідомити, ми можемо вивести з Сахаджа Йоґи.» | «Таку людину, знаєте, якщо про неї повідомити, ми можемо вивести з Сахаджа Йоґи.» |
| L3 | 21 | Extra comma before the closing dash of a dash-delimited parenthetical; the frame clause needs no comma there, and the marks are asymmetric (`– … , –`) | «але раптом Я приїхала туди, і – не знаю, – вони раптом упізнали Мене» | «але раптом Я приїхала туди, і – не знаю – вони раптом упізнали Мене» |
| L4 | 29 | Wrong word: English "nail" here is a fingernail («ніготь»), not a metal spike («цвях») — the metaphor «якщо він зламається, то вже не росте» only works for something that grows | «Бо як цвях: якщо він зламається, то вже не росте.» | «Бо як ніготь: якщо він зламається, то вже не росте.» |
| L5 | 23 | Calque «Це дуже правдиво щодо…» ("that's very true about…"); more idiomatic would be «слушно»/«справедливо» | «І це дуже правдиво щодо будь-якої демократичної країни» | (proposed) «І це дуже слушно щодо будь-якої демократичної країни» |
| L6 | 31 | Doubled preposition «на … на» reads awkwardly | «сісти на медитацію на десять хвилин» | (proposed) «сісти помедитувати на десять хвилин» |
| L7 | 21 | Non-idiomatic collocation «розв’язати багато речей» (natural: «вирішити багато питань») | «завдяки якому зможете розв’язати багато речей» | (proposed) «завдяки якому зможете залагодити багато речей» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 22, 30, 38 | Inconsistency «Сахадж Йоґа» vs «Сахаджа Йоґа» within one text | «так [???] швидко розуміють Сахадж Йоґу», «не за знання Сахадж Йоґи», «щодо Сахадж Йоґи» | (proposed) unify to «Сахаджа Йоґа» everywhere |
| S2 | 21, 23 | Address to Shri Mataji rendered as «Мати»; glossary lists the vocative «Матінко» | «Усі місця зайняті, Мати…», «Мати, а як же ми?», «Мати, більше не треба науки» | (proposed) «Матінко» |
| S3 | 15 | Capitalization «Православна Церква» / «Грецька Церква» — the 2019 orthography capitalizes only the first word of institutional church names | «ваша Православна Церква», «зробила Грецька Церква» | (proposed) lowercase «церква» |

Verified correct (no findings): deity-pronoun capitalization for Shri Mataji
(Я/Мене/Мені/Мій/Своєму/Моєю) and for Athena / Adi Shakti / the Goddess (Вона/Її/Своїй);
the husband's «зі мною» correctly lowercase and his «Ти» to Shri Mataji correctly
uppercase (¶7); genitive «статую Ґанеші» (not «Ґанеша»); locative «в Сахаджа Йозі»
(not «Йоґі»); plural «сахаджа йоґи» lowercase (not «йоґі»); glossary terms Кундаліні,
Аді Шакті, Набхі чакра, Маніпура, Аґія, «Деві Махатм’ям», Нірвічара, бандхан,
блокування (catching), «стан усвідомлення без думок» (thoughtless awareness),
живити (nourish), атака, Сатья Юга, бхутівський; spiritual-term capitalization Дух,
Істина, Пуджа, Реалізація, Царство Боже; language names lowercase (англійська,
санскритською); transliteration conventions (ґ, дх, тх) throughout.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine government error: «керувати» cannot take an accusative object; the shared-object construction is ungrammatical. |
| L | L2 | **Keep** | Genuine error that inverts the meaning: as written, the clause says "if we notify her", contradicting the original "if it is reported". Minimal fix «про неї» restores the sense. |
| L | L3 | **Keep** | Genuine punctuation error: the parenthetical «не знаю» is set off by dashes; nothing in the frame sentence requires a comma before the closing dash. |
| L | L4 | **Keep** | Genuine lexical error: the growth metaphor identifies "nail" as «ніготь»; «цвях» makes the sentence meaningless (a metal nail never grows). |
| L | L5 | **Remove** | Style preference. «правдиво» is understandable and faithful to the spoken register; not a real error. |
| L | L6 | **Remove** | Style preference. «сісти на медитацію» is common SY usage; the doubled «на» is awkward but not incorrect. |
| L | L7 | **Remove** | Style preference. Literal but grammatical; the transcript deliberately stays close to the spoken original. |
| S | S1 | **Remove** | False positive: the English original itself alternates ("accept Sahaja Yoga … understand Sahaj Yoga" in the same sentence), and `terms_context.yaml` explicitly allows both forms «за оригіналом». The variation is faithful, not inconsistent. |
| S | S2 | **Remove** | False positive: the glossary reserves «Матінко» for prayer address; in dialogue «Мати» is an allowed rendering of "Mother", and the vocative of «мати» coincides with the nominative. |
| S | S3 | **Remove** | Not an error here (same ruling as round 1): the corpus consistently capitalizes named churches; lowercasing would break corpus consistency. Reverential/institutional convention. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 8 | «щоб керувати й контролювати ці дві області» | «щоб керувати цими двома областями й контролювати їх» |
| 2 | 19 | «якщо її повідомити» | «якщо про неї повідомити» |
| 3 | 21 | «і – не знаю, – вони раптом упізнали Мене» | «і – не знаю – вони раптом упізнали Мене» |
| 4 | 29 | «Бо як цвях: якщо він зламається, то вже не росте.» | «Бо як ніготь: якщо він зламається, то вже не росте.» |

## Summary

- Language (L): 7 issues found, 4 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: **4**
- Cumulative across rounds 1–2: 38 corrections
