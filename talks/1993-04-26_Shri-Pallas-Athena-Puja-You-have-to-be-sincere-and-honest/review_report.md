# Language Review – 1993-04-26 Shri Pallas Athena Puja: You have to be sincere and honest

## Process

Review `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter.

Reviewers L (Language) and S (SY Domain) ran in parallel against `transcript_uk.txt`,
the English original `transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml` and
`terms_context.yaml`. The Critic then filtered both tables, removing false positives and
non-errors, and the approved corrections were applied to `transcript_uk.txt`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7, 12 (×2), 14, 18, 21 (×5), 23, 35 (×3), 39 | Final period placed **inside** the closing `»` of declarative direct speech | `…це за люди.» Але`, `…пуп усього всесвіту.» Я`, `…Гаразд.»`, `…У нього его.»` etc. | Move period **outside**: `…це за люди». Але` (15 instances) |
| L2 | 11 | Latin script mixed with Cyrillic — Sanskrit word left in Latin | `санскритською мовою «atha» означає «первинний»` | Transliterate per project convention (aspirate `th`→`тх`): `«атха»` |
| L3 | 24 | Incorrect ellipsis — U+2026 ellipsis char `…` followed by an extra period (four dots) | `і вони дуже щасливі….` | Three ASCII dots: `і вони дуже щасливі...` |
| L4 | 31 | Colloquial numeral variant; standard literary form differs and the same word appears as `однієї` two sentences later | `Припустімо, одної ночі ви не змогли` … `Якщо ви не зробили цього однієї ночі` | `одної ночі` → `однієї ночі` (consistency + standard form) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 11, 14, 15, 16 (×2), 17, 22, 24, 33, 36 (×2), 37, 38 (×3), 39 | Shri Mataji's first-person pronoun written lowercase `я` — per `glossary/CLAUDE.md` it must **ALWAYS** be uppercase `Я` | `цього, я маю на увазі`, `те, що я кажу`, `Як-от в Америці – я бачу`, `Днями я сказала`, `бо те, що я про це знаю` etc. | `я` → `Я` (16 instances) |
| S2 | 15 | Capitalization of `Церква` in named churches `Православна Церква` / `Грецька Церква` | `ваша Православна Церква`, `найгірше зробила Грецька Церква` | (proposed) lowercase `церква` |
| S3 | 12 | Capitalized epithet `Дитини Бога` for the divine child; English original lowercase ("child of God") | `маленький храм для Дитини Бога. Це був Шрі Ґанеша` | (proposed) lowercase `дитини` |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine orthographic norm: in declarative direct speech the final period goes **after** the closing `»`. Confirmed by corpus house style (1429 `».` vs 221 `.»`). All 15 quotes are sentence-final and followed by a capitalized new sentence — safe. |
| L | L2 | **Keep** | Project transliterates all Sanskrit to Cyrillic (ґ, дх, …) and these become on-screen subtitles; a lone Latin token is inconsistent. `атха` preserves the etymological point ("primordial" → Primordial Mother). |
| L | L3 | **Keep** | Project orthography defines ellipsis as `...` (three dots). The `…` glyph plus a trailing period is a clear error. |
| L | L4 | **Keep** | `однієї` is the standard modern literary genitive of `одна` (`одної` is colloquial) and matches the form used two sentences later in the same paragraph — both correctness and consistency. |
| S | S1 | **Keep** | Core deity-pronoun rule: Shri Mataji's `Я/Мені/Мій/Моя/Вона` are always uppercase. All 16 instances are Shri Mataji's own narration (none inside another speaker's quote — verified), so all must be `Я`. |
| S | S2 | **Remove** | Not an error here. The corpus consistently capitalizes named churches (`Православна Церква`, `Грецька Церква`, `Католицькою Церквою`); lowercasing would break corpus consistency. Treated as a reverential/institutional convention. |
| S | S3 | **Remove** | `Дитина Бога` is a reverent reference to the divine child Shri Ganesha; capitalization of the epithet is defensible and not a clear error. |
| — | — | — | **False positive (not flagged):** para 7 lowercase `мною` in `Що вони зі мною роблять?` is correct — it is the husband speaking about himself (a regular person), not Shri Mataji. `Ти кажеш` in the same quote (husband addressing Shri Mataji) is correctly uppercase. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 11, 14, 15, 16, 17, 22, 24, 33, 36, 37, 38, 39 | lowercase `я` for Shri Mataji | `Я` (16 instances) |
| 2 | 7, 12, 14, 18, 21, 23, 35, 39 | period inside closing `»` | period moved outside `».` (15 instances) |
| 3 | 11 | Latin `«atha»` | `«атха»` |
| 4 | 24 | `щасливі….` (bad ellipsis) | `щасливі...` |
| 5 | 31 | `одної ночі` | `однієї ночі` |

## Summary

- Language (L): 18 issues found (15 period-placement + 1 Latin + 1 ellipsis + 1 numeral), 18 approved by Critic
- SY Domain (S): 19 issues found (16 pronoun `я→Я` + 2 церква + 1 Дитина Бога), 16 approved by Critic
- Total corrections applied: **34**
