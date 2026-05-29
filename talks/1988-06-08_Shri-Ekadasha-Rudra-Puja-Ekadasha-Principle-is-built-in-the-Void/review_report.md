# Language Review – 1988-06-08 Shri Ekadasha Rudra Puja, 2026-05-29

## Process

2+1 agent review (Reviewer L + Reviewer S → Critic filter) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml`, and
`terms_context.yaml`. Corpus conventions in other `talks/*/transcript_uk.txt`
were cross-checked to confirm canonical usage.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7,8,10,11,13,16,22,24,30,33,38,39,40 (all) | Em-dash `—` (U+2014) used for all 47 interjection dashes; project standard is en-dash `–` (U+2013) with spaces (`glossary/CLAUDE.md`; corpus uses en-dash almost universally) | `кожен пророк — що прийде` | `кожен пророк – що прийде` (×47) |
| L2 | 28 | Nested quote uses English curly double quotes `“ ”` instead of Ukrainian guillemets `«»` (rule: all nesting levels use `«»`) | `зі своєю “дружиною”` | `зі своєю «дружиною»` |
| L3 | 10 | Number agreement: `багато` usually takes a singular predicate | `багато наркотиків вийдуть з обігу` | `…вийде з обігу` (proposed) |
| L4 | 26 | Active present participle `розуміючими` (-юч-) is non-normative in literary Ukrainian | `пильнішими, свідомішими, більш розуміючими` | rephrase (proposed) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 12,19,20,22,23,24,26,28,30,32,33,35,38,39 | Shri Mataji's first-person pronouns in lowercase; rule: **ALWAYS uppercase** (Я/Мені/Мене/Мною/Мій/Моя). ~30 instances. Confirmed convention across reviewed corpus. | `і я справді вдячна`; `розповів мені`; `переді мною`; `в моїй присутності`; `проти мене` | `і Я справді вдячна`; `розповів Мені`; `переді Мною`; `в Моїй присутності`; `проти Мене` |
| S2 | 15 | `Mother Earth` hyphenated; glossary form is `Мати Земля` (no hyphen) and corpus uses the spaced form (22× vs 4× hyphen, all 4 in this talk) | `Матір-Землю`, `Мати-Земля`, `Матері-Землі` | `Матір Землю`, `Мати Земля`, `Матері Землі` |
| S3 | 42 | (Verify) `«Матінко, я віддаю себе на Твою милість»` — first-person `я` here is the **worshipper** speaking, not Shri Mataji → correctly lowercase; `Твою` (addressing Mother) correctly uppercase | `я віддаю себе на Твою милість` | **No change** (confirm only) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Documented orthography rule (`–` U+2013 with spaces); corpus is overwhelmingly en-dash. Genuine systematic deviation. |
| L | L2 | **Keep** | Explicit rule: nested quotes also `«»`, never `„"`/`""`. Clear violation. |
| L | L3 | **Remove** | `багато` + plural predicate is acceptable in modern usage; not a clear-cut error. Over-correction risk. |
| L | L4 | **Remove** | `розуміючими` is comprehensible; replacing requires rephrasing — a style preference, not a hard error. Avoid over-editing. |
| S | S1 | **Keep** | Explicit, documented SY capitalization convention (`glossary/CLAUDE.md` + template) and confirmed across the reviewed corpus. Excludes para 42 (worshipper). |
| S | S2 | **Keep** | Glossary canonical form + corpus consistency. |
| S | S3 | **Keep (no change)** | Correctly handled in original; flagged so it is **not** mistakenly "fixed". |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (47×) | Em-dash `—` → en-dash | `—` → ` – ` |
| 2 | 28 | English nested quotes | `“дружиною”` → `«дружиною»` |
| 3 | 15 | Mother Earth hyphen (×4) | `Матір-Землю`→`Матір Землю` (×2); `Мати-Земля`→`Мати Земля`; `Матері-Землі`→`Матері Землі` |
| 4 | 12 | SM pronoun | `і я справді вдячна` → `і Я справді вдячна` |
| 5 | 19 | SM pronouns | `якому я дала` → `якому Я дала`; `розповів мені` → `розповів Мені`; `Тож я сказала` → `Тож Я сказала` |
| 6 | 20 | SM pronoun | `в моїй присутності` → `в Моїй присутності` |
| 7 | 22 | SM pronouns | `переді мною, і я не знаю` → `переді Мною, і Я не знаю`; `Якщо я спробую` → `Якщо Я спробую` |
| 8 | 23 | SM pronoun | `як мені врятувати` → `як Мені врятувати` |
| 9 | 24 | SM pronoun | `перевага – я б сказала` → `перевага – Я б сказала` |
| 10 | 26 | SM pronoun | `Як я сказала` → `Як Я сказала` |
| 11 | 28 | SM pronouns (×12) | `коли я`→`коли Я`; `мені про це`→`Мені про це`; `що я – джерело`→`що Я – джерело`; `мені можуть`→`Мені можуть`; `доповідати мені?`→`доповідати Мені?`; `але я точно`→`але Я точно`; `у Рахурі я чекала`→`у Рахурі Я чекала`; `сказали мені`→`сказали Мені`; `Тепер я розповім`→`Тепер Я розповім`; `Коли я почала`→`Коли Я почала`; `що я кажу`→`що Я кажу`; `доповіли мені`→`доповіли Мені` |
| 12 | 30 | SM pronouns | `І я сказала`→`І Я сказала`; `Для мене вона`→`Для Мене вона` |
| 13 | 32 | SM pronoun | `знаєте, я пішла` → `знаєте, Я пішла` |
| 14 | 33 | SM pronoun | `зробити з мене` → `зробити з Мене` |
| 15 | 35 | SM pronoun | `проти мене чи проти вас` → `проти Мене чи проти вас` |
| 16 | 38 | SM pronoun | `як я вам казала` → `як Я вам казала` |
| 17 | 39 | SM pronoun | `Як я сьогодні казала` → `Як Я сьогодні казала` |

## Summary

- Language (L): 4 issues found, 2 approved by Critic (L1 em-dash, L2 nested quotes).
- SY Domain (S): 2 correction issues + 1 verification found; 2 approved (S1 SM pronouns, S2 Mother Earth); S3 confirmed correct (no change).
- Total corrections applied:
  - 47 em-dash → en-dash
  - 1 nested-quote fix (`«дружиною»`)
  - 4 "Mother Earth" de-hyphenations
  - 30 Shri Mataji first-person pronoun capitalizations (18× `Я`, 7× `Мені`, 3× `Мене`, 1× `Мною`, 1× `Моїй`)
- **Grand total: 82 corrections applied.**

Verified post-edit: 0 em-dashes remain; only lowercase `я` left is the worshipper's
quote in para 42 (correct); no lowercase SM oblique pronouns remain; apostrophes are
U+2019 throughout; no Latin/Cyrillic mixing; guillemets balanced (24/24).
