# Language Review – 1998-09-27_7th-Day-of-Navaratri-You-all-should-depend-on-Paramchaitanya, 2026-05-30

## Process

2+1 agent language review of `transcript_uk.txt` (Ukrainian) against `transcript_en.txt`,
the glossary (`glossary/CLAUDE.md`, `terms_lookup.yaml`, `terms_context.yaml`) and corpus
convention. Reviewer L (orthography/grammar/punctuation) and Reviewer S (SY domain /
capitalization / terminology) ran in parallel; the Critic filtered both tables.

Automated pre-checks (clean): quotation marks — 64 balanced `«»`, no German/English quotes;
apostrophes — all `’` (U+2019); no mixed Latin/Cyrillic; no double spaces; no missing/extra
spaces around punctuation; deity-pronoun casing verified character-by-character (every
lowercase `я/вона/він/його/її/вони` refers to a regular person, natural force, or
abstraction — never to Shri Mataji or a Deity).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (88×) | Em-dash `—` (U+2014) used for interjections instead of project-mandated en-dash ` – ` (U+2013) | e.g. §7 «нас дуже мало — тих», §18 «реагую на це — кінець!» | ` — ` → ` – ` |
| L2 | §46 | Single-char ellipsis `…` (U+2026) instead of three dots `...` | «чиста мудрість… для них важка» | `…` → `...` |
| L3 | §69 | Wrong case — accusative `оману` as predicate of `Це`; nominative required | «Це оману, можете її так назвати» | «Це омана, можете її так назвати» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | §55 | Inconsistent casing of the divine term «Божественна Сила» (= Paramchaitanya); lowercase here, capitalized in §40 «Божественної Сили» and §54 «Божественну Силу» | «створена Божественним – Божественною силою» | `силою` → `Силою` |
| S2 | §58 | «Мою матір» / «Своєї матері» lowercase, while «Моя Мати» capitalized in the same paragraph (all = Ganesha's Divine Mother / Parvati) | «Хто величніший за Мою матір?» … «обійшов навколо Своєї матері» | (proposed) cap → `Матір` / `Матері` |
| S3 | §56–57 | «усі ці Божества» (cap, §56) vs «всі ці божества» (lc, §57) — same referent | §57 «всі ці божества й усі є Її дітьми» | (proposed) standardize casing |
| S4 | §43, §64 | «це чисте знання» / «справжнє знання» lowercase vs «Чисте Знання» / «Справжнє Знання» elsewhere | §43 «це чисте знання», §64 «справжнє знання» | (proposed) capitalize |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Explicit glossary rule (`En-dash: – (U+2013) with spaces`); corpus uses en-dash in 54/57 talks (5076 en- vs 489 em-dashes). Clear, systematic deviation. |
| L | L2 | Keep | Glossary rule (`Ellipsis: ... three dots`); corpus three-dot form in 38 files vs single-char in 8. |
| L | L3 | Keep | Genuine grammatical case error — `Це` + predicate requires nominative `омана`. |
| S | S1 | Keep | Internal consistency of a core divine term (Божественна Сила = Paramchaitanya) capitalized in 2 of 3 occurrences; §55 is the lone outlier. |
| S | S2 | Remove | Source deliberately varies («my mother» / «My Mother» / «his mother») inside a mythological narrative; translator faithfully mirrored the source. Not a clear error — over-correction risk. |
| S | S3 | Remove | Directly tracks EN source casing («Deities» / «deities»); generic plural, not a specific named Deity. Following source is defensible. |
| S | S4 | Remove | Translation consistently tracks EN casing of Knowledge terms — capitalized where EN writes «Pure/True/Real Knowledge», lowercase where EN is lowercase (incl. §43, §64). Faithful methodology, not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (88×) | Em-dash interjection ` — ` | ` – ` (en-dash) |
| 2 | §46 | Ellipsis `…` | `...` |
| 3 | §69 | «Це оману...» | «Це омана...» |
| 4 | §55 | «Божественною силою» | «Божественною Силою» |

## Summary

- Language (L): 3 issues found, 3 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 4 distinct fixes → 91 textual replacements (88 dashes + 1 ellipsis + 1 grammar + 1 capitalization)
