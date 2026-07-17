# Language Review – 1987-04-19_Easter-Puja-Materialism, 2026-07-17

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel
reviewers + 1 critic filter, against `transcript_en.txt`, `glossary/CLAUDE.md`,
`glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

Paragraph numbers below refer to the content line numbers in `transcript_uk.txt`.

A prior review round (2026-05-30, see git history of this file) normalized
quote-period placement, ellipsis characters (`…` → `...`), apostrophe glyphs
(`'` → `’`), and `Інкарнації` capitalization. An automated character-level scan
this round confirms all of those fixes are intact: no Latin/Cyrillic mixing,
`«»` balanced (21/21), apostrophe U+2019 word-internal only, en-dash ` – ` with
spaces throughout, ellipses as `...` with no space before, no double spaces,
periods after closing `»`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 14 | Commas at conjunction juncture before a subordinate clause resumed by `то` (pravopys: no comma between conjunctions when `то` follows) | `але, коли ви теж захочете будь-коли це продати, тобто, якщо вам треба це продати, то ви йдете на ринок` | `але коли … тобто якщо …, то ви йдете на ринок` |
| L2 | 18 | `не культурно` written separately — adverb in -о with no contrast should merge with `не` | `так не годиться, це не культурно, це не вишуканість` | (consider) `це некультурно` |
| L3 | 17 | Rhetorical question `Що таке X, як не Y` ends with a period instead of `?` | `Що таке антикультура, як не інша форма матеріалізму, яка є потворністю.` | `…яка є потворністю?` |
| L4 | 34 | Relative clause not closed with a comma before the dash | `як ті божевільні люди, яких Я бачила вчора – вони приїхали на відпочинок` | `…яких Я бачила вчора, – вони приїхали…` |
| L5 | 42 | `залежати на чомусь` — non-normative calque (Polish *zależeć na*); EN reads "why should you care for" | `То чому ж вам мало б залежати на чомусь, що нічого не варте?` | `То чому ж ви мали б дбати про щось, що нічого не варте?` (echoes `ви не дбаєте ні про що інше` in the same paragraph, as EN repeats *care*) |
| L6 | 43 | Calqued `бачити це так багато довкола себе` (EN "see it so much around you") | `ви можете бачити це так багато довкола себе` | (consider) `ви можете бачити це повсюди довкола себе` |
| L7 | 50 | Direct speech after a colon inside `«»` starts lowercase | `намагалися сказати це всім нам: «з’єднайтеся з Богом».` | `…всім нам: «З’єднайтеся з Богом».` |
| L8 | 54 | Rhetorical question `Що таке X, як не Y` ends with a period (same as L3) | `Що таке мантра, як не думка, наповнена вібраціями.` | `…наповнена вібраціями?` |
| L9 | 24 | `будь-де інде` — redundant compound (`інде` already means "elsewhere") | `бо будь-де інде вони можуть щось розбити` | (consider) `бо деінде вони можуть щось розбити` |
| L10 | 68 | `так дуже добре` — `так дуже` + adverb is ungrammatical in Ukrainian (calque of EN "so very fine") | `і все так дуже добре` | `і все так добре` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 58 | `Сахаджа Йоги` with `г` — violates transliteration convention (Sanskrit g → ґ) and internal consistency: the text elsewhere has `Сахаджа Йоґу` (52) and locative `в Сахаджа Йозі` (30, 47, 57, 59) | `Або ж вони влаштують із Сахаджа Йоги пікнік.` | `із Сахаджа Йоґи` |
| S2 | 7 | `воскресіння християнства` lowercase while EN capitalizes "Resurrection of Christianity" and `Воскресіння` is uppercase elsewhere | `здійснити воскресіння християнства… від Воскресіння Христа` | (consider) capitalize for parity with EN |
| S3 | 39 | `садху` lowercase while EN has "a Sadhu"; glossary capitalizes similar roles (Садхака, Авадхут) | `хтось, садху, що сидить сам-один у лісі` | (consider) `Садху` |

#### S-domain items checked and confirmed CORRECT (no change)
- Deity pronouns for Shri Mataji (`Я/Мені/Мій/Моя/Мене/Сама`) consistently uppercase (18 sentences checked). ✓
- Christ's pronouns (`Він/Його/Себе/Своїм`) uppercase as a singular Incarnation (lines 8, 28–29, 68). ✓
- Regular people's pronouns lowercase: the mother in the story (`я замкну вас`, line 24), the Pope (`його`, line 41; `Він не прийме Мене!` is sentence-initial), the meditator (`я з’єднаний`, line 58). ✓
- `Дух/Духа` (Spirit) consistently uppercase; genitive `Духа` (personified) correct. ✓
- `Кундаліні … Вона` (line 30) — reverential uppercase matching EN "She"; `Реалізацію` uppercase per glossary. ✓
- `Чайтанья` declined consistently (`Чайтаньєю/Чайтаньї/Чайтанью`); pronoun `її` lowercase = EN "it". ✓
- `Воскресіння` (of Christ) uppercase throughout; `Інкарнації` (line 50) uppercase per glossary. ✓
- `стопи` (line 54) lowercase — the practitioner's own feet, NOT the Lotus Feet of the Deity. ✓
- `Аґії` (line 68) — correct plural of `Аґія`; `У Сахасрарі` (line 61); `бхутами` (line 59). ✓
- `сахаджа йоґ` lowercase common noun; genitive `сахаджа йоґа` (lines 59–60, 68). ✓
- Language names lowercase (`англійська`, line 4); `Великодня Пуджа` per glossary; `до Рима` correct genitive. ✓

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Standing pravopys rule on conjunction juncture: the subordinate clause cannot be dropped (`…але то ви йдете…` is broken), so no comma after `але` or `тобто`. Genuine punctuation error. |
| L | L2 | **Remove** | False positive: in the parallel negation series `так не годиться, це не культурно, це не вишуканість` the negation itself is stressed (as in `це не вишуканість`, necessarily separate); separate spelling is admissible. |
| L | L3 | **Keep** | `Що таке X, як не Y` is formally an interrogative rhetorical construction; Ukrainian norm requires `?`. The period is an error, not an intonation choice. |
| L | L4 | **Keep** | A subordinate clause must be closed with a comma regardless of a following dash (кома й тире). |
| L | L5 | **Keep** | `залежати на` is a non-normative calque; `дбати про` renders EN "care for" exactly and reproduces the source's repetition of *care* within the paragraph. Genuine grammar error. |
| L | L6 | **Remove** | Mirrors the source's spoken syntax ("see it so much around you"); `бачити багато` is grammatically possible and the meaning is clear. Style preference, not an error. |
| L | L7 | **Keep** | After a colon, a full quoted sentence of direct speech starts with a capital. EN embeds the quote via "that", but the translation chose the colon construction, which mandates uppercase. |
| L | L8 | **Keep** | Same rule as L3; both occurrences must be fixed for consistency. |
| L | L9 | **Remove** | Unusual but intelligible; violates no orthography or grammar rule. Replacing with `деінде` is taste. |
| L | L10 | **Keep** | `так дуже` + adverb does not combine grammatically in Ukrainian; `і все так добре` keeps the "so" emphasis without the calque. |
| S | S1 | **Keep** | Transliteration convention (g → ґ) plus internal inconsistency of a proper name within one text. Unambiguous error. |
| S | S2 | **Remove** | Deliberate semantic distinction inside one sentence: the sacred event `Воскресіння Христа` (proper) vs. the metaphorical, yet-to-be-done `воскресіння християнства`. Not an error. |
| S | S3 | **Remove** | "Sadhu" has no glossary entry; in Ukrainian it is a common noun (wandering ascetic), lowercase is correct. EN capitalization is an English-usage artifact. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 14 | Extra commas at conjunction juncture | `але, коли … тобто, якщо` → `але коли … тобто якщо` |
| 2 | 17 | Rhetorical question with period | `яка є потворністю.` → `яка є потворністю?` |
| 3 | 34 | Unclosed relative clause before dash | `яких Я бачила вчора – вони` → `яких Я бачила вчора, – вони` |
| 4 | 42 | Calque `залежати на чомусь` | `То чому ж вам мало б залежати на чомусь, що нічого не варте?` → `То чому ж ви мали б дбати про щось, що нічого не варте?` |
| 5 | 50 | Lowercase start of direct speech after colon | `«з’єднайтеся з Богом»` → `«З’єднайтеся з Богом»` |
| 6 | 54 | Rhetorical question with period | `наповнена вібраціями.` → `наповнена вібраціями?` |
| 7 | 58 | `Йоги` with `г` in proper name | `із Сахаджа Йоги` → `із Сахаджа Йоґи` |
| 8 | 68 | Calque `так дуже добре` | `і все так дуже добре` → `і все так добре` |

## Summary

- Language (L): 10 issues found, 7 approved by Critic
- SY Domain (S): 3 issues found, 1 approved by Critic
- Total corrections applied: **8**

The translation is devoted and precise: deity-pronoun capitalization, glossary
terminology, transliteration, quotation style (`«»`), dash and apostrophe
conventions are all consistent, and the earlier review round's normalizations
have held. This round's genuine issues were four punctuation slips (conjunction-
juncture commas, two rhetorical questions ending in periods, an unclosed relative
clause), one lowercase start of direct speech, two calques from the English
(`залежати на`, `так дуже добре`), and a single `г`/`ґ` inconsistency in
`Сахаджа Йоґа`. Deliberately preserved: the spoken-style anacolutha mirroring
Shri Mataji's original phrasing, and the meaningful lowercase in
`воскресіння християнства` as contrasted with `Воскресіння Христа`.
