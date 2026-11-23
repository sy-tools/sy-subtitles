# Language Review – Shri-Shakti-Mahakali-Puja-I-believe-in-Shri-Mataji, 1991-12-09

Reviewed: `transcript_uk.txt` (Пуджа Махакалі, Кешава Шілпа, Бенгалуру), against
`transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`,
`glossary/terms_context.yaml`. Paragraph numbers below are line numbers in
`transcript_uk.txt`.

### Automated character-level checks (all clean)

- No Latin characters mixed into Cyrillic words
- Apostrophe is always `’` (U+2019): з’явилося, в’язниці, черв’як, Шанкарачар’я, Сур’я, з’їсть, любов’ю, зв’язків
- Dash is always ` – ` (U+2013, spaced); no em-dash `—`, no unspaced dashes
- Quotation marks are `«»` throughout; no `„"`, `""` or `“”`
- Ellipsis is `...`, no space before; no double spaces, no space before punctuation, no trailing spaces

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 25 | Repeated adverb written with a comma. Adverbs formed by repeating a word take a hyphen (Правопис 2019, cf. *ледве-ледве*, *ось-ось*, *тихо-тихо*) | «Потроху, потроху, у міру того як викривають Ватикан…» | «Потроху-потроху, у міру того як…» |
| L2 | 54 | Comma before a single «і» joining homogeneous predicates of the same subject («маємо виходити … і маємо знати») | «Ми маємо виходити назовні на повну силу, і маємо знати, маємо прощати.» | «…на повну силу і маємо знати, маємо прощати.» |
| L3 | 72 | Comma before a single «і» joining two homogeneous attributive clauses («які … склали» / «які … можете співати») | «…тисячу імен, які дуже легко склали разом люди з Нойди, і які ви можете співати.» | «…люди з Нойди і які ви можете співати.» |
| L4 | 7 | Comma followed by a dash | «…там був цей Раджніш, – а тут досі цей Махішасура.» | «…Раджніш – а тут…» |
| L5 | 12 | Plural verb with «більшість» | «Більшість із них подалися в західні країни…» | «Більшість із них подалася…» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 10, 11 | `terms_lookup.yaml` lists *Sadhaka → Садхака* (capitalized); the text uses lowercase | «…в мізки садхаків…», «…садхаки, звісно, стають одержимими…» | «Садхаків», «Садхаки» |
| S2 | 57, 65, 69 | «шакті» in lowercase, while the glossary has «Шакті» and paragraphs 61, 70 and 72 use the capital | «…шакті у вас під рукою», «Бо шакті – у вас», «…вірою, шакті й любов’ю» | «Шакті» |
| S3 | 16 | «Особою» capitalized for Vishnu, although only pronouns and fixed spiritual terms are listed for capitalization | «…гратися з такою Особою, як Вішну.» | «особою» |

**Verified correct (no finding):**
- **Shri Mataji's pronouns.** All are uppercase: Мене, Мені, Мого, Моїй, Мої, Сама, Їй, Вона. All of Her first-person verbs and adjectives are feminine: їздила, дізналася, розповіла, казала, згодна, сказала, виконала, впевнена, хотіла, не давала, приїхала, відвертою, могла, зробила, думала, щаслива.
- **Incarnations.** Krishna/Vishnu: «коли Він став… Мохіні», «Він дуже небезпечне Божество». Shiva: «з Ним». Plural in mid-sentence is lowercase: «всі вони вам допомагають». The Goddess/Shakti: «Ось Їй ми… поклонятимемося».
- **Regular people are lowercase.** This covers the apostle Thomas («він мусив сховати») and the people misbehaving with Vishnu («вони такі дурні»).
- **Glossary terms** all match: Пуджа, Калі Юга/Юзі, ракшас(и), ґуру, Реалізація, Кундаліні, сходження, Інкарнація, Істина, Шастри, Аді Шанкарачар’я, шраддга, бхакті, бандхан, колективність, Парамчайтанья, Сур’я, Дух/Духи, Божество/Божеств, Атхарва Шірша, Стопи, Махакалі, сахаджа йоґ (with correct case endings: йоґами, йоґам, йоґів, йоґи).
- **Language name** is lowercase: «(гінді)».
- **Translator's square-bracket additions** stay as they are: [таких], [що заманеться], [за принципом]. So do the additions carried over from the EN transcript: [Джорджа], [апостола], [розкрито], [сонце], [місяць].

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine orthography error. Adverbs formed by repetition are hyphenated. This is the only such occurrence in the corpus, so there is no competing convention. |
| L | L2 | Keep | Genuine punctuation error. «маємо виходити» and «маємо знати, маємо прощати» are homogeneous predicates of one subject «ми», joined by a single non-repeated «і», so no comma is allowed. |
| L | L3 | Keep | Genuine punctuation error. Both «які» clauses modify «тисячу імен» and are joined by a single «і», so no comma is allowed between them. |
| L | L4 | Remove | Defensible. The comma closes the inserted clause «там був цей Раджніш» inside a broken spoken sentence. The comma and dash together mirror the source's change of course; this is a style matter, not an error. |
| L | L5 | Remove | False positive. With «більшість» + genitive plural of persons («із них»), a plural predicate is permitted in Ukrainian. Not an error. |
| S | S1 | Remove | False positive. Here «садхаки» is a common noun for the followers of false gurus, used generically. Generic role nouns are lowercase, just as with «сахаджа йоґ». The capital in the glossary is the headword form, and the rest of the corpus also writes «садхаків/садхаки» in lowercase. |
| S | S2 | Remove | False positive. The verified EN transcript makes this distinction itself: «shakti» (lowercase, the power within the yogis) in paragraphs 57, 65 and 69 versus «Shakti» (the Goddess worshipped) in 61, 70 and 72. The corpus also has lowercase «шакті» for the power (16 uses). The translation follows the source's distinction exactly, so changing it would erase meaning. |
| S | S3 | Remove | Style preference. Capitalizing «Особа» for a Deity is an accepted reverential usage in Ukrainian religious texts and does not contradict any rule in `glossary/AGENTS.md`. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 25 | «Потроху, потроху, у міру…» | «Потроху-потроху, у міру…» |
| 2 | 54 | «…на повну силу, і маємо знати…» | «…на повну силу і маємо знати…» |
| 3 | 72 | «…люди з Нойди, і які ви можете співати.» | «…люди з Нойди і які ви можете співати.» |

## Summary

- Language (L): 5 issues found, 3 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 3

The translation is careful and faithful to the source. Deity and Shri Mataji pronoun capitalization, Her feminine verb agreement, glossary terminology and Ukrainian typography (`«»`, ` – `, `’`, `...`) are all correct and consistent throughout. The three corrections are minor punctuation and orthography fixes. All three have been applied to `transcript_uk.txt`.
