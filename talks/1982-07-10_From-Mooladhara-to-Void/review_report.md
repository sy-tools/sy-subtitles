# Language Review – 1982-07-10_From-Mooladhara-to-Void, 10 July 1982

## Process

2 parallel reviewers (L – Language, S – SY Domain) + 1 Critic filter, run on
`transcript_uk.txt` (99 paragraphs, full Q&A + Realization process). English
original `transcript_en.txt` used for reference; glossary `terms_lookup.yaml`,
`terms_context.yaml`, and `glossary/CLAUDE.md` used for terminology and
capitalization rules.

The translation is of very high quality. Character-level scans confirmed:

- Quotation marks: `«»` used at all levels (65 pairs), no German `„"` or straight `""`.
- Em-/en-dash: en-dash ` – ` (U+2013) used throughout (121×), always spaced; no `—`.
- Apostrophe: `’` (U+2019) used throughout (65×); no straight/modifier variants.
- No Latin/Cyrillic mixing inside words, no double spaces, no space-before-punctuation,
  no `-тся` endings, no doubled-letter typos.
- Deity/first-person pronouns: all 171 capitalized Shri-Mataji forms correct; all 18
  lowercase first-person forms belong to other speakers (seekers, President, beggar,
  child, ego-of-man) — correctly lowercase. All 40 capitalized 2nd-person forms are
  either sentence-initial or seeker→Shri Mataji (respectful) — correct.
- Divine pronouns (God/Christ/the Divine): Він/Його/Йому/Своїми/Воно correctly capitalized.
- Full text coverage vs EN (paragraphs 1–99, including the closing Realization process).

Only a handful of genuine issues remained, all character-level transliteration /
punctuation consistency.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 64 | Precomposed ellipsis `…` instead of three dots `...` (glossary convention; file uses `...` at ¶40) | `А він був при останньому… в Індії` | `при останньому...` |
| L2 | 83 | Mixed `г`/`ґ` in same sentence: `Сахаджа Йоги` (г) vs `самої Йоґи` (ґ) | `щодо Сахаджа Йоги, тобто самої Йоґи` | `щодо Сахаджа Йоґи, тобто самої Йоґи` |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 22, 47, 49, 83 | `Сахаджа Йоги` spelled with `г`; Sanskrit *g* must be `ґ` (glossary: Сахаджа Йоґа). Genitive of Йоґа = Йоґи (ґ) | `Стосовно Сахаджа Йоги…` / `За допомогою Сахаджа Йоги…` / `за допомогою Сахаджа Йоги…` / `щодо Сахаджа Йоги…` | `Сахаджа Йоґи` (4×) |
| S2 | 72 | Aspirate *dh* transliterated as `дг` instead of `дх` (rule: dh→дх; cf. glossary `бандхан`) | `…ек хі дор бандгаху»` | `…ек хі дор бандхаху»` |
| S3 | 28, 67, 68, 69 | Concept "yoga / union" capitalization varies: `йоґа` (¶28, ¶67, ¶69 «благословення йоґи») vs `Йоґа` (¶68) | `йоґа, союз із Богом` … `спонтанна Йоґа` | (considered — see Critic) |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Glossary mandates `...` (three dots); file already uses `...` at ¶40, so `…` is a genuine internal inconsistency. |
| L | L2 | **Keep** | Same as S1 — the ¶83 sentence holds both spellings side by side, making the `г` form indefensible. Merged with S1. |
| S | S1 | **Keep** | Clear transliteration-rule violation (Sanskrit g → ґ) and inconsistency with the dominant `Йоґа/Йоґу/Йоґою/Йоґи` spelling (ґ) used everywhere else in the file. |
| S | S2 | **Keep** | Aspirate *dh* → `дх` is a fixed rule; glossary spells the same root `бандхан` with `дх`. Low visibility (obscure Kabir couplet) but unambiguous. |
| S | S3 | **Remove** | False positive / translator discretion. The EN source itself alternates ("Which yoga…" lowercase vs "Yoga as being the spontaneous Yoga" capital). Generic "yoga = union" may be lower- or upper-case; not a clear error. Proper names (Сахаджа Йоґа, Крія Йоґа) are consistently capitalized. |
| — | — | **Remove** | `Тих, хто шукає, – цілі маси` (¶8): acceptable genitive-of-quantity rhetorical construction, matches loose EN; not an error. |
| — | — | **Remove** | `час Суду` vs `воскресіння` (¶45): capitalizing the Last Judgment (Суд) is defensible; not an error. |
| — | — | **Remove** | Title `до Войду` (¶2): correct per glossary (Void → Войд); false positive. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 22 | `Сахаджа Йоги` (г) | `Сахаджа Йоґи` (ґ) |
| 2 | 47 | `Сахаджа Йоги` (г) | `Сахаджа Йоґи` (ґ) |
| 3 | 49 | `Сахаджа Йоги` (г) | `Сахаджа Йоґи` (ґ) |
| 4 | 83 | `Сахаджа Йоги` (г) | `Сахаджа Йоґи` (ґ) |
| 5 | 72 | `бандгаху` (дг) | `бандхаху` (дх) |
| 6 | 64 | `останньому…` (precomposed ellipsis) | `останньому...` (three dots) |

## Summary

- Language (L): 2 issues found, 1 approved by Critic (L2 merged into S1).
- SY Domain (S): 3 issues found, 2 approved by Critic.
- Total corrections applied: **6** (4× `Сахаджа Йоґи` spelling, 1× `бандхаху`
  transliteration, 1× ellipsis normalization).
