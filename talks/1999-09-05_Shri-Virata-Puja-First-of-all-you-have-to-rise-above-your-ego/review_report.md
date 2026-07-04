# Language Review – 1999-09-05_Shri-Virata-Puja-First-of-all-you-have-to-rise-above-your-ego, 5 September 1999

## Process

2+1 agent language review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, the glossary (`terms_lookup.yaml`, `terms_context.yaml`),
and the capitalization/orthography rules in `glossary/CLAUDE.md`.

Character-level checks (run before manual review) came back clean:

- Quotation marks: all `«»` (no `"`, `„`, `"`, `"` anywhere).
- Apostrophes: all U+2019 `’` (55×), no straight `'`.
- Dashes: en-dash ` – ` (U+2013) with spaces throughout; no em-dashes, no ASCII hyphen used as a dash.
- No Latin characters mixed into Cyrillic words.
- No double spaces, no spaces before punctuation, no stray double periods.
- Deity-pronoun capitalization consistent: all singular references to Shri Krishna / Virata
  are uppercase (Він/Його/Йому/Своєї); Shri Mataji always uppercase (Я/Мені/Мій/Свій);
  the beggar, the child, the ego, and the praying devotee are correctly lowercase.
- Language names lowercase (англійська, українська); religions lowercase (іслам, християнська,
  індуїстська); nationalities lowercase (американці, індійці, росіяни).
- Spiritual terms correctly capitalized: Інкарнація, Пуджа, Дхарма, Істина, Лотосові Стопи,
  Реалізація/Самореалізація, Божественна Розсудливість.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 25, 33, 36, 37 | Sanskrit 'g' rendered with `г` instead of `ґ` (transliteration rule: Sanskrit g → ґ) | «Сахаджа **Йог**у», «Сахаджа **Йог**и» (6 occurrences) | «Сахаджа **Йоґ**у» / «Сахаджа **Йоґ**и» |
| L2 | 7, 19 | Transliteration of «Krishi» as «Крші» (drops the short i) | «походить від слова «**Крші**»», «Тому Його ім’я було **Крші**-Крішт» | (raised for review) |
| L3 | 8 | Numeral agreement: «існує три поради» (singular predicate with numeral 3) | «існує три поради стосовно того, як досягти» | «існують три поради» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 13, 16, 17 | «бхакті» capitalized as «Бхакті» inconsistently; glossary form is lowercase «бхакті», and the same word is lowercase in 6 other places in this text | «Ананья **Бхакті**» (3×) vs «Ананья **бхакті**» (2×), «зосереджену бхакті», «про бхакті», «є бхакті», «стільки бхакті» | «Ананья **бхакті**» (lowercase, per glossary + majority usage) |
| S2 | 48, 53, 56 | «царство/Царство Вірати» capitalized inconsistently | «в **Ц**арство Вірати» (p48) vs «у **ц**арство Вірати» (p53, p56) | (raised for review) |
| S3 | 54 | «Сили Вірати» capitalized mid-sentence while «сила Вірати» is lowercase elsewhere | «громадянами **С**или Вірати» (p54) vs «сила Вірати» (p45, p48) | (raised for review) |
| S4 | 26 | «для самореалізованої душі» lowercase vs «Реалізованою Душею» capitalized (p9) | «для сахаджа йоґа... для самореалізованої душі» | (raised for review) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine orthography error. Glossary transliteration convention is explicit (Sanskrit g → ґ), the glossary entry is «Сахаджа Йоґа», and the very same document already spells the term with ґ (Джняна Йоґою p19, сахаджа йоґа p26, сахаджа йоґи p36). The 6 `г` spellings are both a rule violation and an internal inconsistency. |
| L | L2 | **Remove** | «Крші» is a one-off Sanskrit etymology word not in the glossary, and it is used consistently within the text (Крші p7, Крші-Крішт p19). Not a clear error; changing it risks introducing a second variant. |
| L | L3 | **Remove** | With numerals 2–4 an existential singular predicate («існує три поради») is acceptable Ukrainian usage; a style preference, not an error. |
| S | S1 | **Keep** | The glossary lists `bhakti → бхакті` (lowercase) as the house form, and Reviewer S is mandated to enforce glossary-term consistency. The word is lowercase in 6 of 9 occurrences already; standardizing the 3 uppercase outliers to lowercase «бхакті» removes an internal inconsistency and aligns with the glossary. «Ананья» (the distinctive qualifier) stays capitalized. |
| S | S2 | **Remove** | No glossary form exists for «kingdom/царство»; the Ukrainian faithfully mirrors the English source, which itself varies (Kingdom p48 vs kingdom p53/p56). Both capitalizations are defensible; not a clear error. |
| S | S3 | **Remove** | «сила Вірати» is lowercase mid-sentence and correctly capitalized only at sentence starts (p44, p46). The single mid-sentence «Сили Вірати» (p54) mirrors the English capital «Power». No glossary mandate; faithful to source. |
| S | S4 | **Remove** | Glossary allows both «Реалізована Душа» and «реалізована душа». The lowercase «самореалізована душа» mirrors the English lowercase «Self-Realised soul» (p26) and parallels the adjacent lowercase «сахаджа йоґ». Faithful to source; not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 25, 33, 36, 37 | «Сахаджа Йогу/Йоги» (Sanskrit g → г) | «Сахаджа Йоґу/Йоґи» (6 occurrences) |
| 2 | 13, 16, 17 | «Ананья Бхакті» (uppercase, off-glossary) | «Ананья бхакті» (3 occurrences) |

## Summary

- Language (L): 3 issues found, 1 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 2 distinct fixes across 9 occurrences (6 × Йоґ, 3 × бхакті)
