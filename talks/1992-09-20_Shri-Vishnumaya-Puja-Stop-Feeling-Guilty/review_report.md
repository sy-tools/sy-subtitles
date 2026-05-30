# Language Review – 1992-09-20 Shri Vishnumaya Puja: Stop Feeling Guilty, 2026-05-30

## Process

2 parallel reviewers (L – Language, S – SY Domain) + 1 Critic filter, run on
`transcript_uk.txt` (full paragraphed Ukrainian text) against `transcript_en.txt`,
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 45 | Case form – `називати` governs the instrumental | «…який ми називаємо **Кріта Юга**, де між Калі Югою і Сатья Югою…» | **Кріта Югою** (cf. para 31 «яку ми називаємо Хамса **чакрою**») |
| L2 | 35 | Suspected nominative instead of genitive after «проблема» | «…може розвинутися проблема **Вірата**.» | (Re-check: text already reads «проблема **Вірати**») |
| L3 | 38 | Unclosed outer quotation mark – direct speech never closes | «Я віддав стільки землі на «бхумдан», я віддав стільки землі на «бхумдан»**.** Так він намагався…» (opens 3 «, closes only 2 ») | Close the outer guillemet: «…на «бхумдан»**»**. |
| L4 | 17 | Proper-name orthography – Russianised form of the historical king | «**Александр** Македонський», «царя **Александра**», «цей **Александр**»… (×6) | **Олександр** / **Олександра** (Ukrainian normative form «Олександр Македонський») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 10 | Capitalization inconsistency – side descriptor uppercased only here | «**Ліва** Вішуддхі» / «в **Ліву** Вішуддхі» / «з **Лівою** Вішуддхі» (×6) — vs lowercase «ліва Вішуддхі» in paras 19, 24, 26, 31, 33, 36, 40, 41, 45 | lowercase **ліва/ліву/лівою Вішуддхі** (matches dominant form + glossary «лівосторонній», «права сторона») |
| S2 | 11 | Capitalization inconsistency – generic «сила» uppercased only here | «приходить через **Силу** Вішнумайї» — vs «через **силу** Вішнумайї» (para 39), «Свою **силу**» (para 24) | lowercase **силу** |
| S3 | 13 | Transliteration deviates from glossary | «із **Дварки**», «[до **Дварки**]», «У **Дварці**» | **Двараки / Двараці** (glossary: Dwarika → **Дварака**) |
| S4 | 29 | Capitalization – common-noun term uppercased | «На Кауаї є **Сваямбху** Шіви» (EN: "a Swayambu of Shiva") | lowercase **сваямбху** (glossary: swayambhu → сваямбху) |
| S5 | 36 | Deity-pronoun rule – Shri Mataji first-person must be uppercase | «…а **я** продовжую ним користуватися…» (EN: "I go on using it") | **Я** продовжую (rule: Shri Mataji ALWAYS uppercase; cf. «Так само, як **Я** б сказала» para 44) |
| S6 | 7 | Capitalization inconsistency within paragraph | «де починається **принцип** Махалакшмі» — vs «**Принцип** Махалакшмі» ×2 earlier in same para | (consider) Принцип Махалакшмі |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | `називати` + instrumental is the standard government; the same construction is already rendered with the instrumental in para 31 («Хамса чакрою»). Genuine grammar fix. |
| L | L2 | **Remove** | False positive. The transcript already reads «проблема **Вірати**» (correct genitive); nothing to change. |
| L | L3 | **Keep** | Objective punctuation error – the outer direct-speech quotation is never closed (3 opening « vs 2 closing »). Closing it balances the nested guillemets. |
| L | L4 | **Keep** | «Олександр Македонський» is the Ukrainian normative/encyclopedic form; «Александр» is a Russianism. Quality Ukrainian translation should avoid it. Applied to all 6 occurrences. |
| S | S1 | **Keep** | Clear internal inconsistency: para 10 is the sole place using uppercase «Ліва Вішуддхі»; every other paragraph (and the glossary side-descriptors «лівосторонній», «права сторона») uses lowercase. Harmonised down. |
| S | S2 | **Keep** | «сила» is a common noun, not a deity name (unlike «Шакті»). Uppercased only in para 11; lowercase everywhere else. Harmonised. |
| S | S3 | **Keep** | Glossary is canonical: Dwarika → Дварака. The bare-stem «Дварка» drops the second «а». Terminology fix across all 3 forms. |
| S | S4 | **Keep** | EN uses indefinite "a Swayambu" (category noun, self-emerged manifestation), and the glossary lists it lowercase. Capital only here. |
| S | S5 | **Keep** | The pronoun is Shri Mataji's own first person; the project rule is absolute ("Shri Mataji: ALWAYS uppercase"), and every other self-reference in the text is «Я». Removing the outlier restores consistency. |
| S | S6 | **Remove** | Style/source-mirroring, not an error. EN deliberately varies "Mahalakshmi Principle" (name) vs "the Mahalakshmi principle starts" (process); the lowercase «принцип» faithfully mirrors that nuance. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 45 | Case form after `називати` | Кріта Юга → **Кріта Югою** |
| 2 | 38 | Unclosed outer quotation mark | …на «бхумдан». → …на «бхумдан»**»**. |
| 3 | 17 | Russianised proper name (×6) | Александр/Александра → **Олександр/Олександра** |
| 4 | 10 | Side-descriptor capitalization (×6) | Ліва/Ліву/Лівою Вішуддхі → **ліва/ліву/лівою Вішуддхі** |
| 5 | 11 | Generic «сила» capitalization | через Силу Вішнумайї → через **силу** Вішнумайї |
| 6 | 13 | Transliteration vs glossary (×3) | Дварки/Дварці → **Двараки/Двараці** |
| 7 | 29 | Common-noun capitalization | Сваямбху Шіви → **сваямбху** Шіви |
| 8 | 36 | Shri Mataji pronoun must be uppercase | а я продовжую → а **Я** продовжую |

## Summary

- Language (L): 4 issues found, 3 approved by Critic (1 false positive)
- SY Domain (S): 6 issues found, 5 approved by Critic (1 style preference removed)
- Total corrections applied: **8** (covering 21 individual occurrences across the text)
