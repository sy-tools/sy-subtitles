# Language Review – 1987-04-19_Easter-Puja-Materialism, 2026-05-30

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel
reviewers + 1 critic filter, against `transcript_en.txt`, `glossary/CLAUDE.md`,
`glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

Paragraph numbers below refer to the content line numbers in `transcript_uk.txt`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 18 | Period placed before closing guillemet | `…це не вишуканість.»` | `…це не вишуканість».` |
| L2 | 37 | Period placed before closing guillemet | `…Я дуже щасливий.»` | `…Я дуже щасливий».` |
| L3 | 47 | Period placed before closing guillemet | `…є трохи чорного.»` | `…є трохи чорного».` |
| L4 | 14 | Single-char ellipsis `…` (U+2026) instead of three dots | `купуєте щось… усе без проб…` | `купуєте щось... усе без проб...` |
| L5 | 21 | Single-char ellipsis `…` (U+2026) instead of three dots | `заощаджуйте… заради чого?` | `заощаджуйте... заради чого?` |
| L6 | all | Apostrophe glyph: straight `'` (U+0027) instead of glossary `’` (U+2019) | `з'їли`, `прив'язаності`, `з'єднані` … (10×) | replace all `'` → `’` |
| L7 | 16 | Comma placement `зберегти навіть, якщо` | `хочуть зберегти навіть, якщо є якась пластикова річ` | (consider) `зберегти, навіть якщо` |
| L8 | 33 | Comma after `Але` before inserted `навіть тепер` | `Але, навіть тепер, якщо ваша увага…` | (consider) `Але навіть тепер, якщо…` |
| L9 | 23 | Comma after `ще й` | `А тоді ще й, коли вони виявляють…` | (consider) drop comma |
| L10 | 17 | Comma before single `або` | `із двох боків, або двох облич` | (consider) `із двох боків або двох облич` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 50 | `Інкарнація` is a spiritual term requiring uppercase (Divine Incarnations who came to earth) | `великі святі, пророки, інкарнації, які приходили на цю землю` | `…пророки, Інкарнації, які приходили…` |
| S2 | 7 | `воскресіння християнства` lowercase while `Воскресіння Христа` uppercase | `здійснити воскресіння християнства` | (consider) capitalize for parity with EN |

#### S-domain items checked and confirmed CORRECT (no change)
- Deity pronouns for Shri Mataji (`Я/Мені/Мій/Моя/Мене/Сама`) consistently uppercase. ✓
- Christ's pronouns (`Він/Його/Себе/Своїм`) uppercase as a singular Incarnation. ✓
- Pope's pronouns lowercase except sentence-initial (`Він не прийме Мене!` is sentence start; `його` lowercase). ✓
- `Дух` (Spirit) consistently uppercase. ✓
- `Чайтанья` consistently uppercase; pronoun `її` lowercase ("it") — correct. ✓
- `Кундаліні … Вона` — reverential uppercase for the Goddess aspect, matching EN "She". ✓
- `Воскресіння` (of Christ) uppercase throughout. ✓
- `стопи` (para 54) lowercase — these are the practitioner's own feet, NOT the Lotus Feet of the Deity. ✓
- `Аґії` (para 68) — chakra name, correct transliteration & capitalization. ✓
- `Сахаджа Йозі / Йоґу` — correct locative (ґ→з) and accusative per glossary. ✓
- `сахаджа йоґ / сахаджа йоґа` (practitioner) lowercase as a common noun. ✓
- Language names `англійська`, `українська` (line 4) lowercase. ✓
- Glossary terms (`Реалізація`, `Сахасрара`, `бхути`, `вібрації`) consistent. ✓
- `Великодня Пуджа` (title) uppercase per glossary. ✓

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Ukrainian rule: the period is placed *after* the closing `»`; `?`/`!`/`…` go inside. Genuine error; also inconsistent with para 50 (`…з Богом».`). |
| L | L2 | **Keep** | Same rule as L1. |
| L | L3 | **Keep** | Same rule as L1. |
| L | L4 | **Keep** | `glossary/CLAUDE.md` mandates ellipsis as `...`; corpus survey confirms 46/71 files use `...` vs 13 using `…`. Normalize. |
| L | L5 | **Keep** | Same as L4. |
| L | L6 | **Keep** | Corpus survey: 49/71 UK transcripts already use `’` (U+2019) — the glossary/majority convention; this file was in the non-conforming minority. Safe global swap (all 10 are word-internal apostrophes; quotes use `«»`). |
| L | L7 | **Remove** | Mirrors the deliberately garbled source ("they want to even preserve, if…"); `навіть` can attach to the verb, making the comma before `якщо` defensible. Not a clear error. |
| L | L8 | **Remove** | Setting off the inserted `навіть тепер` with commas is stylistically acceptable. Not an error. |
| L | L9 | **Remove** | Defensible interjection punctuation; not a clear error. |
| L | L10 | **Remove** | The comma marks an appositive clarification ("two sides, or [rather] two faces"), mirroring the EN pause. Defensible. |
| S | S1 | **Keep** | `Інкарнація` is in the explicit spiritual-term capitalization list; here it denotes the Divine Incarnations (Christ, Krishna, etc.) who came to earth. |
| S | S2 | **Remove** | Defensible theological distinction: the sacred *Воскресіння Христа* (uppercase) vs. the metaphorical *воскресіння християнства* (lowercase). Not a clear error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 18 | Period before closing `»` | `вишуканість.»` → `вишуканість».` |
| 2 | 37 | Period before closing `»` | `щасливий.»` → `щасливий».` |
| 3 | 47 | Period before closing `»` | `чорного.»` → `чорного».` |
| 4 | 14 | `…` → `...` (two instances) | `щось… усе без проб…` → `щось... усе без проб...` |
| 5 | 21 | `…` → `...` | `заощаджуйте…` → `заощаджуйте...` |
| 6 | all | Apostrophe glyph → glossary `’` | `'` → `’` (10 instances) |
| 7 | 50 | Capitalize Divine Incarnation | `інкарнації` → `Інкарнації` |

## Summary

- Language (L): 10 issues found, 6 approved by Critic (3 quote-period + 3 ellipsis-char + 10 apostrophe-glyph instances).
- SY Domain (S): 2 issues found, 1 approved by Critic.
- Total individual corrections applied: **17** — 3 period-placement, 3 ellipsis-character,
  10 apostrophe-glyph normalizations, 1 spiritual-term capitalization.

The translation is of high quality: terminology, transliteration, deity-pronoun
capitalization, quotation-mark style (`«»`), em-dash usage (` – `), and language-name
lowercasing are all consistent with the glossary. The genuine issues were a recurring
punctuation slip (period inside the closing guillemet), the single `…` glyph instead of
`...`, straight `'` apostrophes instead of `’`, and one spiritual-term capitalization —
all brought into line with the canonical glossary and the majority corpus convention
(verified by a 71-file survey).
