# Language Review – 1975-03-29 Public Program: Science/Trigunatmika

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text) against the English
original (`transcript_en.txt`), the glossary (`terms_lookup.yaml`,
`terms_context.yaml`) and the orthography/capitalization rules in
`glossary/CLAUDE.md`, using 2 parallel reviewers + 1 critic filter.

Paragraph numbers below refer to the line numbers in `transcript_uk.txt`.

Automated character-level checks (run across the whole file) confirmed the text is
already clean on several axes, so these did **not** generate findings:

- Quotation marks: only `«»` used (no `" "`, no `„ " "`). ✓
- Apostrophe: only `’` (U+2019) used (12×), no straight `'`. ✓
- Dashes: only en-dash `–` (U+2013, 60×) with surrounding spaces; no em-dash `—`,
  no hyphen-as-dash. ✓
- No double spaces; no space before `, . ; : ? !`. ✓
- Language names lowercase (`англійська`, `українська`, header line 4). ✓

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶20 | Euphony `в`/`у`: `у` is mandatory before a word beginning with `в` (Правопис §11), regardless of the preceding word | `…написано і **в ваших** книгах із науки.` | `…написано і **у ваших** книгах із науки.` |
| L2 | ¶32, ¶34 (×3) | Transliteration inconsistency: genitive of `Сахаджа Йоґа` written with `г` (`Йоги`) while every other form in the text uses Sanskrit `ґ` (`Йоґа`, `Йоґу`) | `проти Сахаджа **Йоги**`, `до нашої Сахаджа **Йоги**`, `гріх проти Сахаджа **Йоги**`, `проти Сахаджа **Йоги**` | `Сахаджа **Йоґи**` |
| L3 | ¶9, ¶19 | Numeral–noun agreement: a mixed number (`три з половиною`) prescriptively governs genitive singular (`витка`), but text uses nominative plural `витки`; also internally inconsistent with `3½ витка` (¶9) | `три з половиною **витки**` | `три з половиною **витка**` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ¶32, ¶34 (×3) | Glossary mandates `Сахаджа Йоґа` with Sanskrit `ґ`; genitive `Йоги` breaks the term spelling | (same loci as L2) | `Сахаджа Йоґи` |
| S2 | ¶30 | Interrogative pronoun `Хто` capitalized mid-sentence (`не знають, Хто є Мати`) — not in the deity-pronoun list | `вони не знають, **Хто** є Мати` | `…**хто** є Мати` |
| S3 | ¶29 | `усі дхарми` lowercase while `Дхарма` is uppercase everywhere else in the text | Gita quote gloss: `облиш усі **дхарми** й віддайся Мені` | `…усі **Дхарми**…` |
| S4 | ¶59 | Case inconsistency: `Шакті` (uppercase) then `шакті` (lowercase) in adjacent sentences | `…і є **Шакті**… Ваша власна **шакті** стає марною…` | unify casing |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L1 | ¶20 | **Keep** | Правопис §11 makes `у` obligatory before initial `в`; `в ваших` produces a `в-в` cluster. Genuine orthographic error. |
| L2 / S1 | ¶32, ¶34 | **Keep** (merged) | Same issue from both reviewers. `Сахаджа Йоґа` is a fixed glossary term spelled with `ґ`; the genitive must preserve it (`Йоґи`). The 4 `Йоги` spellings are the only `г`-forms in the document — a clear, isolated inconsistency. High confidence. |
| L3 | ¶9, ¶19 | **Remove** | `три з половиною витки` is widely accepted in modern usage; forcing genitive singular risks hypercorrection. The variance is stylistic, not a clear error. Not changed. |
| S2 | ¶30 | **Remove** | False positive. The document deliberately uses reverential capitalization of relative/interrogative pronouns referring to a deity — cf. `Ісус Христос, **Який** народився` (¶25). `Хто` referring to the Mother is consistent with that style, not an error. |
| S3 | ¶29 | **Remove** | `Sarva dharmanam paritajya` = "give up **all dharmas**" — plural-generic (all duties/paths to be abandoned), semantically distinct from the singular spiritual principle `Дхарма`. Lowercase is the standard rendering of this verse. Not an error. |
| S4 | ¶59 | **Remove** | Mirrors the source's own distinction (`the Shakti which is your own` → cosmic `Шакті`; `your own shakti` → personal `шакті`). Defensible authorial choice, not an inconsistency to flatten. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶20 | `в ваших` (euphony) | `у ваших` |
| 2 | ¶32 | `Сахаджа Йоги` (transliteration) | `Сахаджа Йоґи` |
| 3 | ¶34 | `Сахаджа Йоги` (×3, transliteration) | `Сахаджа Йоґи` |

## Summary

- Language (L): 3 issues found, 2 approved by Critic (L1 + L2; L2 merged with S1)
- SY Domain (S): 4 issues found, 1 approved by Critic (S1, merged with L2)
- **Total corrections applied: 5 substitutions** across 4 paragraphs
  (1× `у ваших` in ¶20; 4× `Сахаджа Йоґи` in ¶32 and ¶34)
