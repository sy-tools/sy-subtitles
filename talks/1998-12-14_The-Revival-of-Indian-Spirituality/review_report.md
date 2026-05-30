# Language Review – The-Revival-of-Indian-Spirituality, 14 December 1998

## Process

2+1 agent language review of `transcript_uk.txt` (Ukrainian translation of the
English public program in New Delhi). Reviewer L (Language) and Reviewer S
(SY Domain) ran in parallel; the Critic filtered both tables for genuine errors.

Overall the translation is of high quality: no spelling errors, no Latin/Cyrillic
mixing, no double spaces, no spacing errors around punctuation, balanced `«»`
quotation marks (19/19), and consistent U+2019 apostrophes (32). Deity / Shri Mataji
pronoun capitalization is correct throughout (Я/Мене/Мені/Мій/Моя/Сама/Тебе/Тобою/
Твоє/Твою, and capital «Ви» when interlocutors address Her). Glossary terminology is
accurate and consistent (Кундаліні, Самореалізація/Реалізація, Сахаджа Йоґа/Йозі,
сахаджа йоґи/йоґів, вібрації/вібрована, прохолодний вітерець, Аґія чакра, Сушумна Наді,
блокування, Мати Земля, Пурани, Шіва, Г’янешвара/Г’янадева, масова Реалізація). Language
names are correctly lowercase (англійська, санскрит, гінді), as are ethnonyms (британці,
росіяни, індуси, мусульмани, греки, ізраїльтяни, палестинці).

Only two genuine issues were approved.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7–59 (all) | Wrong dash character: em-dash `—` (U+2014) used for clause/interjection dashes; project standard is en-dash `–` (U+2013) with spaces | `Індія — дуже глибока країна`; `Більшість наших чиновників — не що інше, як британці` (103 occurrences, all spaced both sides) | Replace `—` → `–` (`Індія – дуже глибока країна`) |
| L2 | 9, 21, 46, 50, 52, 54, 18 | Non-standard multi-dot sequences (`..`, `....`, `.....`, `?..`, `!..`) instead of `...` | `Хто вони?].. Але`; `[нерозбірливо]..... Так`; `Руки вгору..`; `Журналістика!..` | (proposed) normalize all to `...` |
| L3 | 52 | U+2026 `…` character used instead of ASCII `...` | `Дякую Тобі, Боже…..]` | (proposed) `...` |
| L4 | 13 | Space before resuming ellipsis after parenthetical aside | `воно не потрібне) ...може` | (proposed) remove space / restructure |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 14 | Inconsistent capitalization of the Sanskrit element name Вайю — capitalized in para 13 and earlier in para 14, lowercased once | `Ні-ні, Вайю – це повітря … Тонше – це вайю` | `Тонше – це Вайю` |
| S2 | 34 vs 36 | Kundalini pronoun lowercase `вона` (34) vs uppercase `Вона` (36) | `щойно вона підіймається, ця Кундаліні` vs `що Вона робить, – Вона йде сюди` | (proposed) capitalize `Вона` in 34 |
| S3 | 11 | Capitalization of `Божественною` (divine power) | `всепроникною Божественною силою любові` | (proposed) lowercase |
| S4 | 11 | Mother-Earth pronoun `Вона` capitalized | `Звідки Вона бере силу?` | (proposed) lowercase |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine conformance issue. `glossary/CLAUDE.md` explicitly mandates en-dash `–` (U+2013) with spaces; the reviewer checklist checks dash style; the corpus is overwhelmingly U+2013 (≈3623 vs 427). All 103 dashes are spaced clause-level dashes, so a uniform character swap is safe (hyphenated compounds use a separate hyphen char and are untouched). |
| L | L2 | Remove | The multi-dot runs faithfully mirror the English source (`Who are they?]..`, `[UNCLEAR work up]…..Yes`, `Hands up..`, `Journalism!..`) and mark hesitant / trailing-off / unclear-audio speech. Altering them would diverge from a faithful transcript; not a Ukrainian-orthography error. |
| L | L3 | Remove | Inside an editorial `[нерозбірливо: …]` unclear-marker that reproduces the source `Thank you God…..`; single isolated occurrence, not worth diverging from source. |
| L | L4 | Remove | Valid leading (resumptive) ellipsis after a parenthetical aside `(…не потрібне) ...може`; the space follows the closing parenthesis, which is correct. |
| S | S1 | **Keep** | Real intra-text inconsistency: the element is capitalized as a named principle everywhere in this passage (Вайю ×2, Джал ×3, Агні ×2, Теджасва, Агні Таттва, Джал Таттва); the lone lowercase `вайю` is the outlier. Reviewer S mandate covers terminology consistency and mixed styles within one transcript. |
| S | S2 | Remove | Follows the source: para 34 `it rises … this kundalini She nourishes` — `вона підіймається` maps to lowercase "it rises", `Вона`/`She` is used for the active nourishing verb. The translation tracks the source's own (mixed) usage; not an error. |
| S | S3 | Remove | "Divine power" capitalization is optional/acceptable for a reverent reference; not a defined error. Leave as the translator chose. |
| S | S4 | Remove | Mother Earth is the Goddess Bhoomi Devi; the source capitalizes `She`, and the deity-pronoun convention supports `Вона`. Correct as-is. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 7–59 (all) | Em-dash `—` (U+2014) instead of project-standard en-dash `–` (U+2013) | Replace all 103 `—` → `–` |
| 2 | 14 | Inconsistent lowercase element name `вайю` | `Тонше – це вайю` → `Тонше – це Вайю` |

## Summary

- Language (L): 4 issues raised, 1 approved by Critic
- SY Domain (S): 4 issues raised, 1 approved by Critic
- Total corrections applied: 2 (103 dash characters normalized + 1 capitalization)
