# Language Review – 1981-05-24 Subconscious, Supraconscious and Our Correct Ideals

## Process

2+1 agent review (Reviewer L – Language, Reviewer S – SY Domain, Critic – Filter)
performed on `transcript_uk.txt`, cross-referenced against `transcript_en.txt`,
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

Mechanical checks confirmed: no mixed Latin/Cyrillic characters; apostrophes all
curly `’` (U+2019, 35×); quotation marks all `«»` (no `„"`/`""`); no double spaces;
no space before commas/periods; no stray spaces before ellipses. Quotation marks
were **unbalanced** before review (104 `«` vs 105 `»`).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Unmatched closing guillemet `»` (104 `«` vs 105 `»`) | …Божественне робить це з вами**».** | …робить це з вами. |
| L2 | 94 | Wrong adverbial participle of «бути» (perfective past «having been» instead of simultaneous «being») | Тож він, **бувши** лікарем, зустрів там | …він, **будучи** лікарем, зустрів там |
| L3 | 112 | Erroneous period before the dash, followed by a lowercase word | «Це неправильно, те неправильно»**. –** і все скінчено! | «Це неправильно, те неправильно» **–** і все скінчено! |
| L4 | 103, 130, 132, 155, 223 | Genitive «Йоги» written with plain «г» instead of «ґ» (Sanskrit g → ґ); breaks consistency with «Йоґа/Йоґу» (7 occurrences) | після Сахаджа **Йоги**; із Сахаджа **Йоги**; знання Сахаджа **Йоги** | Сахаджа **Йоґи** |
| L5 | 135 | «Подивитеся» (future) vs «Подивіться» (imperative) | **Подивитеся** в дзеркало – і ви можете побачити | — (valid future form; no change) |
| L6 | 182 | «сенсацію» (= sensational news) for physical «sensation» | відчуваєте прохолоднішу **сенсацію** | — (understandable; lexical pref.) |
| L7 | 155 | «грудок» (masc.) – standard noun is «грудка» (fem.) | великий **грудок** масла | — (consistent lexical choice; uncertain) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 103, 130, 132, 155, 223 | Glossary: `Sahaja Yoga → Сахаджа Йоґа` (ґ). Genitive must keep ґ → «Йоґи» (alternation ґ→з only in dat./loc. «Йозі») | Сахаджа **Йоги** | Сахаджа **Йоґи** |
| S2 | 134 | Glossary: `ліва сторона` is lowercase; rest of text uses lowercase (¶54, 82) | нісенітницю **Лівої Сторони** | нісенітницю **лівої сторони** |
| S3 | 182 | Same as S2 — «Left Side» lowercase per glossary | означає **Ліву Сторону** | означає **ліву сторону** |
| S4 | 151 | Inconsistent capitalization of Realisation; every other instance in text is capital «Реалізація» (¶73, 104, 146, 154, 174) | отримали **реалізацію** | отримали **Реалізацію** |
| S5 | 178 | Within-sentence inconsistency of 2nd-person address to Shri Mataji (both refer to Her) | коли **Ви** говорите про тепло, **ви** говорите про любов | коли **Ви** … **Ви** говорите про любов |
| S6 | 68 | `Maya → Майя` listed capital in glossary | таємниця **майї** … Я творю **майю** | — (illusion-act, not the deity; lowercase defensible) |
| S7 | 134 | «санкочу» (lowercase) vs «Санкоч» (capital) for same term | трохи **санкочу** … «**Санкоч**» – ось | — (quoted-term emphasis; trivial) |
| S8 | 78, 124, 163, 195, 204, 206 | Broader 2nd-person address to Shri Mataji is mixed (Вашою/Ви capital vs вам/вас/ви lowercase) | — | — (glossary lists only Я/Мій/Вона/Її; 2nd-person not mandated; out of scope) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine unbalanced quotation mark (count 104 vs 105); orphan `»` has no opening match and is not needed for sense. |
| L | L2 | **Keep** | «бувши» = perfective «having been»; the man *was* a doctor at the time (simultaneous state) → «будучи» is correct. |
| L | L3 | **Keep** | A period implies sentence end, but a dash + lowercase «і» follows — clearly inconsistent. Removing the period preserves the dash-interjection style used throughout. |
| L | L4 / S1 | **Keep** | Transliteration rule (Sanskrit g → ґ) + glossary. Genitive of «Йоґа» is «Йоґи» (no consonant alternation before -и; alternation ґ→з is dat./loc. «Йозі» only). Fixes 7 internal inconsistencies. |
| L | L5 | **Remove** | «ви подивитеся» is a valid future-tense form; not an error, only a style nuance. |
| L | L6 | **Remove** | «сенсація» for physical sensation is awkward but understandable; replacing it is a lexical preference, not a clear error. |
| L | L7 | **Remove** | «грудок» (masc.) is non-standard, but used consistently 3× as a deliberate lexical choice; correcting risks introducing error. Uncertain — leave. |
| S | S2 | **Keep** | Glossary mandates lowercase «ліва сторона»; matches the same term lowercased elsewhere in this text. |
| S | S3 | **Keep** | Same rule as S2. |
| S | S4 | **Keep** | Consistency: the term is capitalised everywhere else in the transcript; glossary permits capital «Реалізація». |
| S | S5 | **Keep** | Same pronoun, same referent (Shri Mataji), two cases in one sentence — an oversight. Aligned to the capital form the translator chose first (and to «Вашою» in ¶124). |
| S | S6 | **Remove** | Here «maya» is the illusion Shri Mataji *creates*, not the deity Mahamaya; lowercase is defensible and not clearly wrong. |
| S | S7 | **Remove** | Trivial; the capital «Санкоч» is a quoted/defined term — stylistic emphasis, not an error. |
| S | S8 | **Remove** | The glossary's deity-pronoun rule enumerates 1st/3rd-person forms only; 2nd-person reverence capitalisation is not mandated. Each sentence (except ¶178) is internally consistent; a global sweep would be an unsanctioned stylistic change. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | Unmatched `»` | …Божественне робить це з вами. |
| 2 | 94 | бувши → будучи | …він, будучи лікарем, зустрів там |
| 3 | 112 | «…». – і → «…» – і | «Це неправильно, те неправильно» – і все скінчено! |
| 4 | 103 (×2) | Сахаджа Йоги → Сахаджа Йоґи | після/основу для Сахаджа Йоґи |
| 5 | 130 (×2) | Сахаджа Йоги → Сахаджа Йоґи | вийде/людей із Сахаджа Йоґи |
| 6 | 132 | Сахаджа Йоги → Сахаджа Йоґи | виведу цю особу із Сахаджа Йоґи |
| 7 | 155 | Сахаджа Йоги → Сахаджа Йоґи | не дотягує до Сахаджа Йоґи |
| 8 | 223 | Сахаджа Йоги → Сахаджа Йоґи | знання Сахаджа Йоґи |
| 9 | 134 | Лівої Сторони → лівої сторони | нісенітницю лівої сторони |
| 10 | 182 | Ліву Сторону → ліву сторону | означає ліву сторону |
| 11 | 151 | реалізацію → Реалізацію | отримали Реалізацію |
| 12 | 178 | ви → Ви (2nd-person to Shri Mataji) | коли Ви говорите про тепло, Ви говорите про любов |

## Summary

- Language (L): 7 issues found, 4 approved by Critic (L4 = 7 textual occurrences).
- SY Domain (S): 8 issues found, 4 approved by Critic (S1 overlaps L4).
- Total corrections applied: **12 edits** across 9 paragraphs (¶9, 94, 103, 112, 130, 132, 134, 151, 155, 178, 182, 223), covering 13 textual changes (the «Йоґи» fix touched 7 spots).
- Quotation marks rebalanced: 104 `«` / 104 `»`.
