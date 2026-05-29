# Language Review – 2001-12-25_Christmas-Puja, 2026-05-29

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
