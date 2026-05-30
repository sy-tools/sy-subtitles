# Language Review – 1989-08-08_Shri-Ganesha-Puja-How-Far-To-Go-With-Children, 2026-05-30

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, the glossary (`terms_lookup.yaml`,
`terms_context.yaml`), and the orthography/capitalization rules in
`glossary/CLAUDE.md`.

Character-level audit confirmed before review:
- Apostrophes: 32 × U+2019 `’`, 0 straight — correct.
- Quotation marks: 36 × `«` / 36 × `»`, balanced; no `"`, `"`, `„` — correct.
- No Latin/Cyrillic mixing.
- **Dashes: 103 × U+2014 `—`, 0 × U+2013 `–`** — deviates from the rule.
- **Ellipsis: 4 × U+2026 `…`, 0 × `...`** — deviates from the rule.

Corpus reference (61 talks): en-dash U+2013 dominates 5305 vs 592 em-dash;
three-dot `...` dominates 418 vs 231 single-char `…`. The documented standard
(`glossary/CLAUDE.md`) and the corpus convention agree: U+2013 ` – ` and `...`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (103×) | Em-dash U+2014 `—` used instead of en-dash U+2013 `–` (orthography rule: `En-dash: « – » (U+2013)`) | `Він — вічна дитина` (+102 more, all space-padded) | replace `—` → `–` (U+2013) globally |
| L2 | 39, 49, 70, 76 | Single-char ellipsis U+2026 `…` instead of three dots (rule: `Ellipsis: ...`) | `своїми речами…`, `Вона… її обличчя`, `сказали, що…`, `музиці й…` | `...` |
| L3 | 31 (×2) | Nominative grammar error — `Матір` is the **accusative** form of `мати`; nominative subject must be `Мати` | `Матір Земля вібрується`, `Така Матір Земля впливатиме` | `Мати Земля` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 43 | Deity-pronoun capitalization — speaker is Shri Mataji (EN: "that also **I**'ve recently learned"); `Я` must be uppercase | `про це я теж нещодавно дізналася` | `про це Я теж нещодавно дізналася` |
| S2 | 61 | Term capitalization — glossary lists `Ganas = ґани` (lowercase); also inconsistent with lowercase `ракшаси`/`пішачі` in the same passage | `Ґани здивовані` | `ґани здивовані` |
| S3 | 91 | Consistency — `принцип Ґанеші` is lowercase in 8 places (incl. the deliberate contrast in §85 `Принцип Ґуру` … `принципом Ґанеші`); this lone capital is the outlier | `не що інше, як Принцип Шрі Ґанеші` | `принцип Шрі Ґанеші` |
| S4 | 6 | Capitalization — `Пуджа` is uppercase per glossary and elsewhere in this talk (§107, §110); generic `пуджею` is the outlier | `Перед кожною пуджею` | `Перед кожною Пуджею` |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Explicit orthography rule (U+2013) + decisive corpus norm (5305:592). Systematic, all 103 are space-padded interjection dashes — safe glyph swap. |
| L | L2 | **Keep** | Documented rule is three-dot `...`; corpus majority agrees (418:231). Low severity but a genuine, consistent normalization. |
| L | L3 | **Keep** | Real grammar error. The translator correctly uses accusative `Матір Землю` in §30/§101, so `Матір Земля` in subject position (§31) is the accusative form misused as nominative. Glossary citation form is `Мати Земля`. |
| S | S1 | **Keep** | Unambiguous deity-pronoun error — Shri Mataji is the first-person speaker. High confidence. |
| S | S2 | **Keep** | Glossary mandates lowercase `ґани`; also restores internal consistency with the adjacent `ракшаси`/`пішачі`. |
| S | S3 | **Keep** | Genuine internal inconsistency (8:1). §85 proves the lowercase `принцип Ґанеші` is deliberate (it is distinguished from the glossary term `Принцип Ґуру` in one sentence). Lowercasing the single outlier is the minimal fix. |
| S | S4 | **Keep** | Glossary rule "Пуджа – uppercase (ceremony name)" is unconditional; 2 of 3 occurrences in this talk are already uppercase. |
| — | FP1 | **Remove** | `Матір Землю` (§30, §101) — correct accusative after `завібрувати`/`живити`; not an error. |
| — | FP2 | **Remove** | `принцип Ґанеші` lowercase (8×) — deliberate, consistent; only the §91 outlier corrected, the other 8 left untouched. |
| — | FP3 | **Remove** | `вище Я` / `нижче я` (§48) — faithful to EN "higher Self" / "baser self"; intentional contrast, not an error. |
| — | FP4 | **Remove** | `самбхала` (§80) vs `Самбхала` (§81) — mirrors the source's own casing (EN "sambhala" / "Sambhala"); faithful. |
| — | FP5 | **Remove** | `батьківськість` / `материнськість` (§78), `безтурботне` for "serene" (§49), `неспокійна` for "troublesome" (§21) — acceptable lexical choices, style preferences, not errors. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (103×) | em-dash `—` → en-dash | replace U+2014 `—` with U+2013 `–` |
| 2 | 39, 49, 70, 76 | single-char ellipsis `…` | `...` |
| 3 | 31 (×2) | `Матір Земля` (acc. form as nom.) | `Мати Земля` |
| 4 | 43 | `я` (Shri Mataji) | `Я` |
| 5 | 61 | `Ґани` | `ґани` |
| 6 | 91 | `Принцип Шрі Ґанеші` | `принцип Шрі Ґанеші` |
| 7 | 6 | `пуджею` | `Пуджею` |

## Summary

- Language (L): 3 issues found (L1 spanning 103 dashes, L2 four ellipses, L3 two
  `Мати Земля`), 3 approved by Critic.
- SY Domain (S): 4 issues found, 4 approved by Critic.
- False positives screened out by Critic: 5 categories (accusative `Матір Землю`,
  the 8 deliberate lowercase `принцип Ґанеші`, `вище Я`/`нижче я`, `самбхала`
  casing, lexical-choice items).
- Total distinct corrections applied: 7 rules → 113 textual replacements
  (103 dashes + 4 ellipses + 2 `Мати Земля` + 1 each for §6, §43, §61, §91).
