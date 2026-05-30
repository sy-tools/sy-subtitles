# Language Review – Mahamaya Shakti Seminar (Morning), 1985-04-20

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text, 64 body paragraphs)
against `transcript_en.txt`, using 2 parallel reviewers (L = Language,
S = SY Domain) + 1 Critic filter, per `templates/language_review_template.md`.

Character conventions were cross-checked against `glossary/CLAUDE.md` **and** the
de-facto corpus standard (sampled 12 sibling `transcript_uk.txt` files): en-dash
`–` (U+2013) is used in 11/12 files with zero em-dash; curly apostrophe `’`
(U+2019) is the documented rule.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (183×) | Wrong dash character | em-dash `—` (U+2014) used throughout for interjections | en-dash `–` (U+2013) per `glossary/CLAUDE.md` & corpus standard |
| L2 | all (35×) | Wrong apostrophe character | straight `'` (U+0027): `розіп'ятий`, `ім'я`, `прав'язаності`… | curly `’` (U+2019) per `glossary/CLAUDE.md` |
| L3 | 9 (2×) | Subject–verb agreement | «І чудеса **твориться** через Його Силу»; «Усі ці чудеса **твориться**…» | «чудеса **творяться**» (plural subject → plural verb) |
| L4 | 35 | Verb-tense parallelism | «Вона жебракуватиме, позичатиме, **краде**, зробить щось» (present amid futures) | «…**крастиме**…» (EN: "beg, borrow, steal, do") |
| L5 | 33 | Malformed ellipsis | «Божество Махамайї надзвичайно**….**» (`…` + extra period) | «надзвичайно**…**» |
| L6 | 43 | Malformed ellipsis | «Ось бачите, відносно**…..**»» (`…` + 2 extra dots) | «відносно**…**»» |
| L7 | 43 | Non-normative active participle | «страждав на… **знесилюючий**… артрит» (дієприкметник акт. стану на -уч-) | «**виснажливий**» (EN: "deadening arthritis") |
| L8 | 35 | Preposition with `сповнений` | «інтенсивність буде **сповнена з** набагато більшою інтенсивністю» | (proposed: drop `з`) |
| L9 | 19, 20, 39, 40, 49 (7×) | `що:` + direct-speech colon | «прийняти, **що:** «Так, це правда»» — `що` + colon before quote | (proposed: remove colon) |
| L10 | 18 | Stage-direction casing | «[**сміх**.]» (lone lowercase vs dominant «[Сміх]») | (proposed: «[Сміх]») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 13, 14, 16, 20 (6×) | Term capitalization — **Пуджа** | lowercase `десять пудж`, `на пуджі`, `стільки пудж`, `пуджу за пуджею`, `у пуджах` vs uppercase used 18× elsewhere | Capitalize → `Пудж`, `Пуджі`, `Пудж`, `Пуджу за Пуджею`, `Пуджах` per glossary ("Пуджа – uppercase") |
| S2 | 20 | Term capitalization — **Інкарнація** | «У всіх інших **інкарнаціях** ніхто не кидав виклику Богу» (Divine Incarnations) | «**Інкарнаціях**» per `glossary/CLAUDE.md` |
| S3 | 9, 18, 24, 31, 32, 35, 68 | Consistency — **Сила/сила Махамайї** | 3× uppercase `Сила`, 7× lowercase `сила` | (proposed: normalize) |
| S4 | 55, 61, 68 | Consistency — **Всесвіт/всесвіт** | `цей Всесвіт` (55) vs `цей всесвіт` (61); plural `всесвіти` (68) | (proposed: normalize singular) |
| S5 | 26 | Capitalization — **Стопи** | lowercase `стопи` (3×) vs `Стопи` (para 38) | (proposed: capitalize) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Hard rule in `glossary/CLAUDE.md` (en-dash `–`) + corpus standard (11/12 files). Genuine systematic error. |
| L | L2 | **Keep** | `glossary/CLAUDE.md` explicitly mandates `’` (U+2019). All 35 are word-internal apostrophes — safe, genuine. |
| L | L3 | **Keep** | Clear grammatical agreement error; plural «чудеса» requires «творяться». |
| L | L4 | **Keep** | Tense break within a future-tense series; matches EN aspect. |
| L | L5 | **Keep** | Ellipsis char `…` already encodes 3 dots; trailing period is typographic noise. |
| L | L6 | **Keep** | Same as L5 — `…` + 2 ASCII dots = 5-dot artifact. |
| L | L7 | **Keep** | Active present participles (-уч-/-юч-) are non-normative in standard Ukrainian; «виснажливий» is the idiomatic equivalent of "deadening". |
| L | L8 | **Remove** | Translation-phrasing, not a clear orthographic/grammatical error; `з` + instrumental as manner is defensible, and editing risks shifting meaning. |
| L | L9 | **Remove** | Consistent stylistic pattern (7×) mirroring EN "that, '…'"; meaning is unambiguous. Style preference, not an error. |
| L | L10 | **Remove** | Editorial stage direction; casing mirrors the EN source ("[laughter.]") and does not affect Shri Mataji's words. |
| S | S1 | **Keep** | Explicit glossary rule (Пуджа uppercase) + document already uses uppercase 18× — the 6 lowercase break internal consistency. |
| S | S2 | **Keep** | Explicit glossary rule (Інкарнація uppercase); refers to the Divine Incarnations (Rama, Krishna, Christ…). |
| S | S3 | **Remove** | «сила» is a common noun; EN itself alternates "Power"/"power". Ambiguous, not a clear error — capitalization tracks emphasis. |
| S | S4 | **Remove** | Both `Всесвіт` and `всесвіт` are acceptable in Ukrainian; plural `всесвіти` (mirror metaphor) is correctly lowercase. Minor, no clear rule violated. |
| S | S5 | **Remove** | Principled distinction holds: para 26 is the literal, mundane feet-washing custom ("we wash our feet"), para 38 is the devotional "Lotus Feet" where vibrations are felt. EN lowercases para 26. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| L1 | all (183×) | em-dash `—` | en-dash `–` |
| L2 | all (35×) | straight apostrophe `'` | curly `’` (U+2019) |
| L3 | 9 (2×) | «чудеса твориться» | «чудеса творяться» |
| L4 | 35 | «…позичатиме, краде, зробить…» | «…позичатиме, крастиме, зробить…» |
| L5 | 33 | «надзвичайно….» | «надзвичайно…» |
| L6 | 43 | «відносно…..»» | «відносно…»» |
| L7 | 43 | «знесилюючий артрит» | «виснажливий артрит» |
| S1 | 13, 14, 16, 20 (6×) | lowercase `пудж/пуджі/пуджу/пуджею/пуджах` | `Пудж/Пуджі/Пуджу/Пуджею/Пуджах` |
| S2 | 20 | «інших інкарнаціях» | «інших Інкарнаціях» |

## Summary

- Language (L): **10** issues found, **7** approved by Critic
- SY Domain (S): **5** issues found, **2** approved by Critic
- Total corrections applied: **9** (2 systematic — 183 dashes + 35 apostrophes; 7 targeted)

**Notes**

- No mixed Latin/Cyrillic tokens; the only Latin strings are intentional
  (the `Life Eternal` trust name, `Ph.D`/`M.A.D` wordplay).
- Locative `Сахаджа Йозі` (ґ→з) used correctly throughout — no erroneous `Йоґі`.
- Deity-pronoun capitalization for Shri Mataji (Я/Мені/Мій/Вона…) and singular
  Incarnations (Він/Його — Krishna, Christ, Ganesha, Shiva), plus lowercase for
  ordinary speakers (the airline man, Rustom, the wife), is consistent and correct.
- `Махамайя` declensions, `Реалізація`, `Дух`, `Стопи` (para 38), `Войд`,
  `Чайтанья`, glossary deity/term spellings all verified consistent.
