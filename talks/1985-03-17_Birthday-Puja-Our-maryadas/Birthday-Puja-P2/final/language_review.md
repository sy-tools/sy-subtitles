# Language Review – 1985-03-17_Birthday-Puja-Our-maryadas / Birthday-Puja-P2, 2026-09-05

2+1 review per `templates/language_review_template.md`, run on the 224 blocks of
`final/uk.srt` (extracted with `tools.extract_review`). Reviewers L and S ran in
parallel against the Ukrainian text, `glossary/`, and the 239-block English
source `source/en.srt`.

Scope note: this video's Ukrainian exists only as subtitles — its speech is not
in `transcript_uk.txt` — so the review target is the SRT, not the transcript.

## L. Language (Orthography + Grammar + Punctuation)

Mechanical scan clean across the whole file: no Latin characters in Cyrillic, no
`„"` or `""` quotes, apostrophes all `’` (U+2019), all 29 dashes `–` (U+2013),
the two hyphens genuine (`будь-хто`, `одне-два`), no double spaces, no space
before punctuation, all ellipses `...`.

| # | Block | Error | Context | Fix |
|---|-------|-------|---------|-----|
| 1 | 131 | Missing comma before subordinate `щоб` (clause continues in [132]) | `Вирівняйте, покладіть` | `Вирівняйте, покладіть,` |
| 2 | 127 | Missing sentence-final period ([128] opens a new sentence) | `…класти квіти` | `…класти квіти.` |
| 3 | 179 | Missing sentence-final period ([180] opens a new sentence) | `…гадаю, так краще` | `…гадаю, так краще.` |
| 4 | 66 | Extra comma — `тепер` is not parenthetical in Ukrainian; calque of EN «Now, …» | `Тепер, що робимо –` | `Тепер що робимо –` |
| 5 | 93 | Trailing comma, but [94] opens a new sentence with a capital | `…старші дівчата,` | `…старші дівчата.` |
| 6 | 57 | Euphony у/в: `усе` after a vowel-final word should be `все` | `що щороку усе скорочується` | `що щороку все скорочується` |

## S. SY Domain (Capitalization + Terminology + Consistency)

Verified clean: all deity pronouns (Shri Mataji's `Я/Мої`, Christ's and Ganesha's
`Він/Нього`, lowercase for regular people), all 7 occurrences of `Стопи`
uppercase, the mantra in [2] (`Ом Твамева Сакшат` / `Дев’яй` / `намо намаха`),
and every glossary term — `Ґанеша/Ґанеші`, `Вішуддхі`, `Муладхара`, `Пуджа`,
`Реалізація`, `Аарті`, `Радхи`, `гірлянд-`, `сарі`, `свастику`, `Воррен`,
`Метью`.

| # | Block | Error | Context | Fix |
|---|-------|-------|---------|-----|
| 1 | 71 | Capitalization: `день народження` is lowercase mid-sentence throughout this talk and the corpus; block [152] of this same file already writes it lowercase | `це День народження` | `це день народження` |

## Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | `щоб` requires a preceding comma; the file already carries mid-sentence punctuation at block ends ([51], [62] semicolons). |
| L | 2 | Keep | Real orthographic gap. The EN source lacks the period too, but the Ukrainian must be correct on its own terms. |
| L | 3 | Keep | Same shape as #2. |
| L | 4 | Keep | Verified by count: 1 `Тепер,` against 28 `Тепер` without a comma in this same file. |
| L | 5 | Keep | Verified: [94] opens `Ви двоє…` with a capital, so [93] ends a sentence. |
| L | 6 | Keep | Independently found by the Critic on a separate pass. |
| S | 1 | Keep | Verified: corpus has 32 lowercase vs 5 uppercase, and all 5 uppercase are talk-title lines or sentence-initial — zero mid-sentence. This talk's own transcript writes «це день народження». |
| Critic | — | Remove | `[129] «І інші»` → `«Й інші»` — false positive. Corpus overwhelmingly starts sentences with `І` before a vowel (143 `І ось`, 91 `І я`, 61 `І якщо`) against 5 sentence-initial `Й` in the whole corpus. |
| Critic | — | Remove | `виглядає` [164] as a calque — 38 uses in the corpus, established. |
| Critic | — | Remove | `мідні речі` [221] for "brass" — corpus prefers `мідні` (3) over `латунь` (1). |

## Approved Corrections

| # | Block | Error | Fix |
|---|-------|-------|-----|
| 1 | 57 | Euphony у/в | `щороку усе` → `щороку все` |
| 2 | 66 | Extra comma (EN calque) | `Тепер, що робимо` → `Тепер що робимо` |
| 3 | 71 | Capitalization | `День народження` → `день народження` |
| 4 | 93 | Trailing comma before a new sentence | `дівчата,` → `дівчата.` |
| 5 | 127 | Missing sentence-final period | `квіти` → `квіти.` |
| 6 | 131 | Missing comma before `щоб` | `покладіть` → `покладіть,` |
| 7 | 179 | Missing sentence-final period | `краще` → `краще.` |

All seven applied by block number with the current text asserted first, so no
correction could land on the wrong line. Text only — zero timing lines changed.

Re-validation after applying: all checks PASS, avg CPS 9.7, no block over 20,
CPL ≤ 84, no overlaps.

## Summary

- Language (L): 6 issues found, 6 approved by Critic
- SY Domain (S): 1 issue found, 1 approved by Critic
- Critic's own pass: 3 candidates raised, 3 removed as false positives
- Total corrections applied: 7
