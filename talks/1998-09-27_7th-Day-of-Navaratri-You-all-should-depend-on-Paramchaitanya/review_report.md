# Language Review – 1998-09-27_7th-Day-of-Navaratri-You-all-should-depend-on-Paramchaitanya, 2026-06-20

## Process

2+1 agent language review of `transcript_uk.txt` (Ukrainian) against `transcript_en.txt`,
the glossary (`glossary/CLAUDE.md`, `terms_lookup.yaml`, `terms_context.yaml`) and corpus
convention. Reviewer L (orthography/grammar/punctuation) and Reviewer S (SY domain /
capitalization / terminology) ran in parallel; the Critic filtered both tables.

**Re-review note.** A prior pass (2026-05-30) already applied 4 corrections, now verified
present in the text: em-dash `—` → en-dash ` – ` (88×), single-char ellipsis `…` → `...`,
§69 «Це оману» → «Це омана», §55 «Божественною силою» → «Божественною Силою». This pass
re-checks the whole text independently and adds any remaining genuine errors.

Automated pre-checks (all clean): em-dash `—` 0 / en-dash ` – ` 88; single-char ellipsis
`…` 0; quotation marks 64 balanced `«»`, no German/English quotes; apostrophes 52 × `’`
(U+2019), 0 ASCII; no mixed Latin/Cyrillic; deity-pronoun casing verified
character-by-character (every lowercase `я/вона/він/його/її/вони` refers to a regular
person, natural force, or abstraction — never to Shri Mataji or a Deity).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | §12 | Word-choice for passive «is proved»; reflexive «доводиться» reads ambiguously («one has to») | «...доводиться, що ми не маємо знання» | «...це доводить, що ми не маємо знання» |
| L2 | §51 | Tautological/clunky verb pair | «...гальма не гальмують...» | «...гальма не працюють...» |
| L3 | §69 | Loose case in parenthetical «as they are» | «...через людських істот, такими, якими вони є...» | «...таких, якими вони є...» |

*No spelling, Latin/Cyrillic-mixing, apostrophe, em-dash, ellipsis, or quotation-mark
issues found. Punctuation (`«»`, ` – `, `...`, `’`) is consistent throughout.*

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | §58 | Divine Mother written lowercase «матір»/«матері» while «Моя Мати» is uppercase in the same paragraph and all other 5 Divine-Mother refs are uppercase (§57 «Матері» ×2, §58 «Мати»/«Матері Землі», §69 «Матері») | «Хто величніший за Мою матір?» … «навколо Своєї матері» | «Мою Матір» … «Своєї Матері» |
| S2 | §56 / §57 | «усі ці Божества» (cap, §56) vs «всі ці божества» (lc, §57) | §57 «всі ці божества й усі є Її дітьми» | (proposed) standardize casing |
| S3 | §43, §64 | «чисте знання» / «справжнє знання» lowercase vs «Чисте Знання» / «Справжнє Знання» elsewhere | §43 «це чисте знання», §64 «справжнє знання» | (proposed) capitalize |

*Glossary terms verified correct: Кундаліні, Парамчайтанья (+ reverent «Вона/Її/Себе»),
Сахаджа Йоґа / в Сахаджа Йозі, сахаджа йоґ / йоґи / йоґів, Шрі Ґанеша → Ґанеші (род.) /
Ґанешу (знах.) / Ґанеша (наз.), Хануман, Шіва → Шіви, Майя, бхути, блокування (catching),
Наваратрі, Реалізація, Шакті, Богиня, шлоки, паріпаква, бхранті. Language names
«англійська/українська» lowercase ✓. Spiritual terms Пуджа, Дух/Божественне, Істина,
Останній Суд capitalized ✓.*

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | «доводиться» is understandable as reflexive passive; rephrase is stylistic, not an orthographic/grammatical error. Faithful to the source's own loose construction. |
| L | L2 | Remove | Mirrors the source's deliberate repetition («the brakes weren't braking»). Understandable; style preference. |
| L | L3 | Remove | «такими, якими вони є» is a set parenthetical ("as they are") faithful to source; not a clear-cut error worth a mechanical edit. |
| S | S1 | **Keep** | Genuine error. The Divine Mother (the Goddess worshipped in §57–58 = Adi Shakti / Shri Mataji) is **always uppercase** per `glossary/CLAUDE.md` — independent of source casing. 5 of 7 references are already uppercase; §58's two are the sole outliers, breaking an explicit rule. Same logic the prior review used to capitalize «Божественною Силою» (§55, S1-Keep). Ganesha's possessives «Мою»/«Своєї» are already uppercased (deity convention) — the noun must match. The regular human mothers in §40–41 correctly stay lowercase. |
| S | S2 | Remove | EN distinguishes «Deities» (§56, the great Deities as part of Paramchaitanya) from «deities» (§57, subordinate "Her children"); a generic **plural** noun may be lowercase (rule: Incarnations plural mid-sentence → lowercase). Both forms defensible; not a clear error. |
| S | S3 | Remove | Translation consistently tracks EN casing of Knowledge terms — capitalized where EN writes «Pure/True/Real Knowledge», lowercase where EN is lowercase (incl. §43, §64). Faithful methodology; no project rule forces these terms always-uppercase. |

*Note on revisiting §58 (was removed by the 2026-05-30 Critic as "source mirrors deliberate
variation"). On re-examination the source casing is an artifact, not intent: the same
speaker's quoted words appear as both "my mother" and "My Mother". The Divine-Mother
convention overrides source casing — exactly as the prior review itself enforced for
«Божественна Сила» (§55). With 5 of 7 references already uppercase and §57–58 explicitly
about worshipping the Mother, the two lowercase forms are an isolated rule violation, so
S1 is approved this pass.*

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | §58 | Divine Mother noun lowercase (accusative) | «за Мою матір?» → «за Мою Матір?» |
| 2 | §58 | Divine Mother noun lowercase (genitive) | «навколо Своєї матері» → «навколо Своєї Матері» |

## Summary

- Language (L): 3 issues found, 0 approved by Critic
- SY Domain (S): 3 issues found, 1 approved by Critic (= 2 text edits)
- Total corrections applied this pass: 1 correction (Divine Mother capitalization, §58, 2 instances)
- Prior pass (2026-05-30): 4 corrections, 91 textual replacements (already in text)
