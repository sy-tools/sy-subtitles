# Language Review – 2001-12-25_Christmas-Puja, 2026-06-20

> Second review pass. The first pass (2026-05-29, preserved at the bottom of this
> file) applied 43 corrections, mainly Shri Mataji's `я→Я` / `мені→Мені`.
> Those are confirmed present in the current text. This pass re-checked the whole
> transcript and found 5 further corrections the first pass missed.

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian translation) against
`transcript_en.txt` using 2 parallel reviewers (L – Language, S – SY Domain)
plus 1 Critic filter, per `templates/language_review_template.md`.

Paragraph references use file line numbers (content paragraphs are lines 6–19).

Mechanical pre-check (script-verified) was **clean**:
- Quotation marks: all `«»`, balanced per line, nested quotes also `«»` (e.g. L12 `«…«Тікайте!» …»`)
- Apostrophe: single character `’` (U+2019) throughout (30×)
- Dashes: en-dash ` – ` only (no em-dash, no hyphen-minus used as dash)
- No straight quotes, no German `„“`, no double spaces, no `..`, no space-before-punctuation
- No mixed Latin/Cyrillic tokens

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | L6 | Predicate after relative pronoun «хто» should be singular (normative agreement); also internally inconsistent with «Ті, хто береться … мають бути» (L10) | «І ті, хто **йдуть** за Ним, мають бути зовсім іншими людьми.» | «І ті, хто **йде** за Ним, мають бути…» |
| L2 | L12 | «зазнати» connotes undergoing/suffering; for the inner light of Truth «відчули/пережили» reads more naturally | «Ви всі його **зазнали**.» (EN: "You all have experienced.") | (candidate) «Ви всі його **відчули**.» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | L15 (×4) | Genitive of «Сахаджа Йоґа» written with plain **г**; Sanskrit *g* must be **ґ** (glossary rule), and ґ is kept before -и. Inconsistent with every other form in the text (Йоґа/Йоґу/Йозі). Missed by the first pass, which listed «Йоги» as verified-correct. | «роботу Сахаджа **Йоги**», «поширення Сахаджа **Йоги**» (×2), «заковика Сахаджа **Йоги**» | «Сахаджа **Йоґи**» |
| S2 | L6/L7/L12/L15 | «на цю Землю» / «приходу на цю Землю» — EN uses lowercase "earth" (= this world, not the planet name) | «прийшла на цю **Землю**», «приходу на цю **Землю**» | (considered) «землю» |
| S3 | L11 | «Самою Реалізацією» — intensifier pronoun «сам» capitalized | «але й **Самою** Реалізацією!» (EN: "Realisation himself") | (considered) «самою» |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| S | S1 | **Keep** | Genuine transliteration error against an explicit glossary rule (Sanskrit *g* → ґ; «Сахаджа Йоґа» declines as Йоґи). 4 occurrences, all clearly genitive, all inconsistent with the rest of the document. |
| L | L1 | **Keep** | Normative subject–predicate agreement after «хто» is singular; the document itself uses the singular in the parallel «Ті, хто береться навчати… мають бути». Fixing restores both norm and internal consistency. |
| L | L2 | **Remove** | «зазнати + род. відмінок» is attested with positive abstractions (зазнати радості/щастя) and «зазнали його» is grammatically valid. A stylistic preference, not an error. |
| S | S2 | **Remove** | Capitalized «Земля» (Earth as God's creation) is applied consistently across all instances; EN casing does not govern Ukrainian reverential capitalization. Rewriting 4 instances would impose a style choice, not correct an error. |
| S | S3 | **Remove** | The translation consistently capitalizes the reverential «сам-» (cf. «Я бачила це **Сама**», L10, for Shri Mataji). Capital «Самою» for "Realisation himself" is the same intentional convention, applied to Christ. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | L6 | «ті, хто **йдуть** за Ним» | «ті, хто **йде** за Ним» |
| 2 | L15 | «роботу Сахаджа **Йоги**» | «роботу Сахаджа **Йоґи**» |
| 3 | L15 | «поширення Сахаджа **Йоги**» (1st) | «поширення Сахаджа **Йоґи**» |
| 4 | L15 | «поширення Сахаджа **Йоги**» (2nd) | «поширення Сахаджа **Йоґи**» |
| 5 | L15 | «заковика Сахаджа **Йоги**» | «заковика Сахаджа **Йоґи**» |

## Summary

- Language (L): 2 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found (1 covering 4 occurrences), 1 approved by Critic
- Total corrections applied this pass: **5** (1 grammar + 4 transliteration occurrences)

### Notes on overall quality

The translation is of high quality and required minimal correction. Deity-pronoun
capitalization (Я/Мені/Мій for Shri Mataji; Він/Його/Йому for Christ, Socrates,
Guru Nanak; Богиня/Вона/Неї for the Goddess), spiritual-term capitalization
(Істина, Дух, Дхарма, Пуджа, Реалізація, Інкарнація), and language-name
lowercasing (англійська, українська, іврит) are all correct and consistent.
Glossary terms (Кундаліні, Аґія, Сахасрара, вібрації, прохолодний вітерець,
мар’яди, Дівалі, Парамчайтанья, Омкара, Шрі Ґанеша) are rendered per
`terms_lookup.yaml`. The fixed closing blessing «Нехай Бог благословить вас»
correctly matches the EN "May God bless you" (no "all" in the source).

---

# Language Review – 2001-12-25_Christmas-Puja, 2026-05-29 (first pass)

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel
reviewers (L – Language, S – SY Domain) + 1 Critic filter, per
`templates/language_review_template.md`.

Mechanical scans (orthography baseline) were run first and came back clean:
- No Latin characters mixed into Cyrillic.
- No straight apostrophes `'` (U+0027) — all apostrophes are `’` (U+2019).
- No German `„“` / English `""` quotes — quotation is `«»` at all levels
  (incl. correctly nested `«…«Тікайте!»…»`).
- Em-dash is `–` with surrounding spaces (65×); no hyphen-minus used as a dash.
- Ellipsis `...` with no space before; no stray Unicode `…`.
- No double spaces; no space before `,`/`.`.

So the findings concentrate in **grammar/lexis (L)** and **deity-pronoun
capitalization (S)**.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 15 | Russianism / colloquial borrowing | «…ось у чому **загвоздка** Сахаджа Йоги» | **заковика** (literary Ukrainian for *snag*; keeps the EN snag/hurdle distinction vs. «перешкода» in the next sentence) |
| L2 | 6 | Possible missing comma | «…іслам говорить, не знаю **про що**.» | (candidate) «не знаю, про що» |
| L3 | 12 | Possible missing comma | «Дехто затримався, не знаю **як**…» | (candidate) «не знаю, як» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 6, 9, 10, 11, 12, 13, 15, 17, 19 | Shri Mataji's first-person pronoun **я** lowercased mid-sentence (33 instances) | «Бо **я** була в Америці», «Також **я** розповідала», «**я** не можу зрозуміти», «Якось **я** летіла», «всі листи, які **я** отримую», «**я** теж жінка», «тоді **я** за вас» … | **Я** (CLAUDE.md: Shri Mataji ALWAYS uppercase) |
| S2 | 13 (×3), 15 (×4) | Shri Mataji's **мені** lowercased (7 instances) | «нещодавно **мені** хтось сказав», «назвала **мені** ім’я», «Ніхто не пише **мені**», «розповідати **мені**» | **Мені** |
| S3 | 13 | Shri Mataji's **мною** lowercased | «зі **мною** був один сахаджа йоґ» | зі **Мною** |
| S4 | 7 | Inconsistent capitalization of *spirituality* (not a glossary sacred term; lowercase «духовності» 1 clause earlier) | «привести їх на належний шлях **Духовності**» | **духовності** |
| S5 | 15 | Inside-quote first person of a regular person (complaining yogi) | «Я маю бути одружений, **а я** й досі не одружився» | (no change — correctly lowercase) |

**Terminology — verified correct, no change:** Кундаліні, Сахасрара, Аґія/Аґію,
Реалізація, Дхарма, Пуджа/Пуджі, Інкарнацій, Дух/Духом, Істина/Істини,
Сахаджа Йоґа/Йоґу/Йоги/Йозі, сахаджа йоґи/йоґів/йоґами (lowercase common noun),
Парамчайтаньї, Омкарою, Шрі Ґанешею, Дівалі, прохолодний вітерець, Богиня/Вона/Неї
(Goddess, uppercase). Language/religion names correctly lowercase (англійська,
християнство, іслам, індуїзм). Christ's pronouns (Він/Його/Йому/Ним/Своє) and
Nanak's/Socrates's «Його» correctly uppercase; the lady, the priest, Shalivahana,
the war, the water, the lotus and Sahaja Yoga itself correctly take lowercase
third-person pronouns.
> Note (2026-06-20): the «Йоги» genitive form listed above as verified-correct
> was in fact mis-spelled with plain «г»; corrected to «Йоґи» in the second pass.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | «загвоздка» is a Russian borrowing flagged as non-literary; «заковика» is the standard Ukrainian word and preserves the *snag* (загвоздка) vs *hurdle* (перешкода) contrast of the original. |
| L | L2 | **Remove** | False positive. The reduced clause is a single connective phrase «про що»; per Український правопис a one-word/one-connective subordinate clause takes no comma. Original correct. |
| L | L3 | **Remove** | False positive. Same rule — one-word subordinate clause «як»; no comma required. Original correct. (Confirms the longer «не знаю, з якого боку», «не знаю, що в них не так» correctly DO take commas.) |
| S | S1 | **Keep** | Explicit project rule (CLAUDE.md / glossary): Shri Mataji's first person is ALWAYS uppercase. The transcript already used «Я» in 24 places, so the 33 lowercase «я» are inconsistencies, not an alternate convention. |
| S | S2 | **Keep** | Same rule (Мені). |
| S | S3 | **Keep** | Same rule (Мною). |
| S | S4 | **Keep** | «духовність» is not in the sacred-term list (Дхарма, Інкарнація, Пуджа, Дух, Істина, Стопи); the two occurrences in one paragraph must match — lowercase is correct. |
| S | S5 | **Keep (no-op)** | Conflict-check vs S1: this «я» is a regular person speaking inside a quote, mid-sentence → must stay lowercase. Excluded from the S1 batch. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 6, 9, 10, 11, 12, 13, 15, 17, 19 | Shri Mataji «я» (33×) | «Я» |
| 2 | 13 (×3), 15 (×4) | Shri Mataji «мені» (7×) | «Мені» |
| 3 | 13 | «зі мною» | «зі Мною» |
| 4 | 7 | «шлях Духовності» | «шлях духовності» |
| 5 | 15 | «загвоздка» | «заковика» |

## Summary

- Language (L): 3 issues found, 1 approved by Critic (2 removed as false positives).
- SY Domain (S): 42 corrections approved (33× «я» + 7× «мені» + 1× «мною» + 1× capitalization); 1 inside-quote «я» reviewed and correctly left unchanged.
- Total corrections applied: **43**
  (33× «я»→«Я», 7× «мені»→«Мені», 1× «мною»→«Мною», 1× «Духовності»→«духовності», 1× «загвоздка»→«заковика»).
- One inside-quote lowercase «я» (complaining yogi, para 15) was correctly left unchanged.
