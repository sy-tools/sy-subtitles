# Language Review – 1983-03-04 Devi Puja: Mother you be in our brain, Adelaide

## Process

2+1 review of `transcript_uk.txt` (full paragraphed Ukrainian text) against
`transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml`, and
`terms_context.yaml`. Reviewer L (Language) and Reviewer S (SY Domain) run in
parallel; the Critic filters their findings and resolves conflicts.

This is a **second review round** (2026-07-16). All corrections from the previous
round (gender agreement `він завібрований` ¶35, ellipsis normalisation `…` → `...`,
deity pronoun/reflexives `Я`/`Свої`/`Собою` ¶55, hyphenation `Махат-Аханкарі` ¶55)
were verified as still applied before this round started.

Pre-checks across the file (all clean): no Latin/Cyrillic mixing, no German/English
quotes, no straight quotes/apostrophes, no `…` (U+2026), no double spaces, no space
before punctuation, all dashes are en-dash ` – ` (no `—`, no ` - `), nested quotes
use `«»`.

Paragraph numbers (¶) below are file line numbers, as in the previous round.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 16 | Calqued concessive «б не»; allows the opposite reading ("what God would NOT want") | `Чого б не захотів Бог, вони це роблять, щойно вони просвітлені.` (EN: "Whatever God wants, they do it") | `Хоч би чого захотів Бог, вони це роблять…` — matches the text's own dominant idiom (`хоч би що/ким/чого`, 5 uses: ¶18, 37, 40, 43, 55) |
| L2 | 12 | (candidate) Concessive «б не» | `І якою б не була якість вогню, коли він просвітлений…` | `І хоч би якою була якість вогню…` (see Critic) |
| L3 | 39 | (candidate) Concessive «б не» | `Якою б не була їхня якість, вони сповідують саме її.` | `Хоч би якою була їхня якість…` (see Critic) |
| L4 | 30 | Exclamatory sentence after a colon starts lower-case | `…і раптом виявляєте: о! Злодій стоїть позаду вас!` — `О!` is a standalone exclamation (the next sentence `Злодій…` is already capitalised); EN: "you find: Oh! The thief…" | `…виявляєте: О! Злодій стоїть позаду вас!` |
| L5 | 72 | Unmotivated comma between the conjunction `Але` and the main clause | `Але, Я сказала: «Щойно ви це зробили…` — mechanical carry-over of the English parenthetical commas ("But, I said,"); in the Ukrainian colon construction `Я сказала` is the main clause | `Але Я сказала: «Щойно ви це зробили…` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 6 | Ceremony name lower-cased; glossary rule: «Пуджа – uppercase (ceremony name)» | `«Мати, будь у нашому мозку» – пуджа в Аделаїді (Австралія)…` — the same transcript's title has `Деві Пуджа` uppercase; corpus convention mid-sentence is uppercase (`перед Пуджею`, `цю Пуджу`, `для цієї Пуджі`) | `…– Пуджа в Аделаїді (Австралія)…` |
| S2 | 23 | Adjective «Божественний» (referring to the Divine) lower-cased — the lone exception in the transcript | `Нехай цей мозок керується Твоїм божественним, оцим` — everywhere else uppercase: `Божественної особистості` ¶8, `Божественного провідництва` ¶26, `Божественної Сили` ¶27, `Божественної вимоги` ¶36, `Божественними законами` ¶40 | `…керується Твоїм Божественним, оцим` |
| S3 | 9, 15 | (candidate) `Агні Девата` vs glossary entry `Агні Девта` | `божество, що зветься Агні Девата` | (see Critic) |
| S4 | 10, 12 | (candidate) `істина` lower-cased; glossary: «Істина – uppercase (absolute Truth)» | `що є істиною, а що неправдою`; `бо це істина, а істина – це любов` | (see Critic) |
| S5 | 15 | (candidate) Singular form `з ракшасою` (glossary lists only plural `ракшаси`) | `Вона жила з ракшасою` | (see Critic) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine issue: `чого б не захотів Бог` admits the opposite reading ("that which God would not want, they do"). The normative `хоч би чого` removes the ambiguity and matches the transcript's own dominant usage (5× `хоч би що/ким/чого`). |
| L | L2 | **Remove** | `якою б не була якість вогню` carries no misreading risk; the construction is widespread in edited modern Ukrainian. Changing it would be a style preference, not an error fix. |
| L | L3 | **Remove** | Same as L2: no ambiguity, no genuine error. |
| L | L4 | **Keep** | `О!` forms its own exclamatory sentence (the following sentence is capitalised), so the lower-case letter violates the sentence-initial capital rule; also matches the EN capital "Oh!". |
| L | L5 | **Keep** | The comma after `Але` before the subject of the main clause has no syntactic basis in Ukrainian; it is a mechanical transfer of English parenthetical punctuation. |
| S | S1 | **Keep** | Direct written rule in glossary/CLAUDE.md («Пуджа – uppercase»), internal consistency with the title line (`Деві Пуджа`), and corpus-wide mid-sentence convention. |
| S | S2 | **Keep** | Mixed styles within one transcript — six uppercase adjectival uses vs one lower-case; identical meaning (the Mother's Divine guidance). Exactly the inconsistency the S-check exists to remove. |
| S | S3 | **Remove** | False positive (same verdict as round 1). The EN source here reads "Agni Devata"; the corpus consistently uses `Девата`, and the glossary itself has `Джала Девата`, `Самудра Девата`, `Сур’я Девата`. |
| S | S4 | **Remove** | False positive (same verdict as round 1). Discernment sense (truth vs untruth), lower-case in the EN source, and consistent across all three occurrences — not the named absolute Truth. |
| S | S5 | **Remove** | False positive. Singular `ракшаса` (declined like Sanskrit-derived `асура` in the glossary) is legitimate; the instrumental `з ракшасою` is grammatically correct. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 6 | `…– пуджа в Аделаїді (Австралія)…` | `…– Пуджа в Аделаїді (Австралія)…` |
| 2 | 16 | `Чого б не захотів Бог, вони це роблять…` | `Хоч би чого захотів Бог, вони це роблять…` |
| 3 | 23 | `…керується Твоїм божественним, оцим` | `…керується Твоїм Божественним, оцим` |
| 4 | 30 | `…раптом виявляєте: о! Злодій стоїть позаду вас!` | `…раптом виявляєте: О! Злодій стоїть позаду вас!` |
| 5 | 72 | `Але, Я сказала: «Щойно ви це зробили…` | `Але Я сказала: «Щойно ви це зробили…` |

All 5 approved corrections have been applied to `transcript_uk.txt`.

## Summary

- Language (L): 5 issues found, 3 approved by Critic (L2, L3 removed as style preferences)
- SY Domain (S): 5 issues found, 2 approved by Critic (S3, S4, S5 removed as false positives)
- Total corrections applied: 5

Overall quality notes: the translation is strong and consistent. Deity-pronoun
capitalization (`Я/Мені/Моїм/Собі/Твоїм` for Shri Mataji; `Вона/Її/Сама` for Sitaji;
`Вона/Своєю/Свою` for Mother Earth; lower-case for regular people inside quotes) is
correct throughout; glossary terms are used correctly (`сахаджа йоґ` lower-case,
`Сахаджа Йоґа` / `в Сахаджа Йозі` declension, `Кундаліні`, `бхути`, `сваямбху`,
`Реалізація`, `Дух`, `Стопи`, `прохолодний вітерець`, `вібраційне усвідомлення`,
`віддатися на милість`, `обумовленість`, `блокування`, `его`/`суперего`); language
names are lower-case (`англійська`); quotation marks `«»` (including nested),
en-dash ` – `, apostrophe `’` and ellipsis `...` conform to the orthography rules.
