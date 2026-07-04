# Language Review – 1989-12-17_Devi-Puja-Nothing-to-discuss-in-Sahaja-Yoga, 2026-07-04

## Process

2+1 agent review (Reviewer L – Language, Reviewer S – SY Domain, Critic – Filter)
run on `transcript_uk.txt` (46 paragraphs) against `transcript_en.txt`, the
glossary, and the project house-style conventions.

House-style baselines used (from `glossary/CLAUDE.md` and corpus statistics):
- Dash: en-dash ` – ` (U+2013) with spaces — used in **86 of 91** corpus talks.
- Ellipsis: `...` (three ASCII dots) — used in **56 of 91** corpus talks.
- `Сахаджа Йоґа` declines with **ґ** preserved (genitive `Йоґи`, accusative
  `Йоґу`); the ґ→з alternation applies **only** in the dative/locative (`Йозі`).
  Corpus: genitive `Сахаджа Йоґи` (ґ) in **66** files vs `Сахаджа Йоги` (г) in 12.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10,11,12,13,14,16,17,19,20,22,24,25,27,28,30,35,37,39 | Em-dash `—` (U+2014) used for interjections instead of house-style en-dash ` – ` (U+2013). 35 occurrences, all already space-padded | `Отже, найперше — спостерігати` | `Отже, найперше – спостерігати` (replace `—` → `–`) |
| L2 | 22 (×2), 37 (×1) | Single-char ellipsis `…` (U+2026) instead of house-style `...`; para 22 is internally inconsistent (mixes `…` and `...`) | `вона зелена, але… є ще...` | `вона зелена, але... є ще...` (replace `…` → `...`) |
| L3 | 27 | Brand name `Marlboro` in Latin script inside Cyrillic text | `сигарета Marlboro` | *(no change – legitimate proper brand name)* |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 21 (×2), 27 (×2), 31, 32 | Genitive of `Сахаджа Йоґа` written with **г** (`Сахаджа Йоги`); base consonant is **ґ**, preserved in the genitive (ґ→з only in locative `Йозі`). Inconsistent with same file's `Сахаджа Йоґу`/`Сахаджа Йоґа` and corpus | `проблеми Сахаджа Йоги` | `проблеми Сахаджа Йоґи` |
| S2 | 23 | `ґностики` ("gnostics") – standard dictionary form is `гностики` (г) | `Ви ґностики, ви знаючі люди` | *(no change – `ґностик` is the established corpus spelling; 2 files use it, 0 use `гностик`)* |
| S3 | 37 | `Дхармічне` – adjective from Дхарма capitalized | `але це щось Дхармічне` | *(no change – deliberate marking of the sacred principle; not a clear error)* |
| S4 | 15 | `Я` capitalized mid-sentence for Mother Earth (`Я чиню якийсь тиск`) | `Я це терплю, Я чиню` | *(no change – Bhoomi Devi / Mother Earth is a deity; uppercase is defensible)* |

**Deity-pronoun audit (no errors found):** All Shri Mataji first-person pronouns
(`Я`, `Мені`, `Мене`, `Моїми`, `Матаджі`) are correctly uppercase; all general /
hypothetical-speaker pronouns (`мені` p17, `я` p18, `мені` p28) are correctly
lowercase. Nationalities/languages (`англійська`, `англійці`, `індієць`,
`індійці`, `швейцарці` …) correctly lowercase. `сахаджа йоґи` (common noun,
plural) correctly lowercase; `Сахаджа Йоґа` (the practice) correctly uppercase.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Documented house style (`glossary/CLAUDE.md`) + corpus consistency (86/91). All 35 em-dashes are space-padded, so a bare-char replacement preserves spacing safely. |
| L | L2 | **Keep** | Documented house style (`...`); the paragraph is internally inconsistent, mixing `…` and `...`. |
| L | L3 | Remove | `Marlboro` is a genuine brand name; Latin script is correct and matches the EN source. |
| S | S1 | **Keep** | Genuine orthographic/terminology error. `Йоґа` keeps ґ in the genitive; ґ→з alternation is locative-only. Confirmed by the file's own `Йоґу` and corpus majority (66 vs 12). |
| S | S2 | Remove | Not an error in this corpus: `ґностик` is the established SY spelling (2 files use ґ, none use г). Changing it would break corpus consistency. |
| S | S3 | Remove | Style choice, not an error — capitalizing an adjective derived from a sacred principle is defensible; changing it is a preference, not a correction. |
| S | S4 | Remove | Mother Earth (Bhoomi Devi) is a deity; uppercase `Я` in her quoted speech is defensible and consistent with deity-pronoun rules. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10,11,12,13,14,16,17,19,20,22,24,25,27,28,30,35,37,39 | Em-dash `—` → en-dash `–` (house style), 35 occurrences | space-padded `–` |
| 2 | 22 (×2), 37 (×1) | Ellipsis `…` → `...` (house style), 3 occurrences | `...` |
| 3 | 21 (×2), 27 (×2), 31, 32 | Genitive `Сахаджа Йоги` (г) → `Сахаджа Йоґи` (ґ), 6 occurrences | `Сахаджа Йоґи` |

## Summary

- Language (L): 3 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: **3 fixes** covering **44 character/token replacements**
  (35 em-dashes → en-dashes, 3 ellipses → `...`, 6 `Йоги` → `Йоґи`)

The translation is of high quality: accurate, idiomatic, and faithful to the
English source. Deity-pronoun capitalization, nationality/language lowercasing,
glossary terminology (Пуджа, Кундаліні, чакри, Парамчайтанья, Набхі, обумовленість,
сходження, Дух), and quotation-mark style (`«»`) were all already correct. The
only issues were house-style normalization of dash and ellipsis characters and
one recurring declension-spelling inconsistency (`Йоги` → `Йоґи`).
