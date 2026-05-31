# Language Review – How to get the connection with the Divine power, 3 June 1990

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml`, and
`terms_context.yaml`.

A whole-corpus scan was used to establish the canonical punctuation
convention: across 76 UK transcripts the en-dash `–` (U+2013) is used 6515
times in 73 files, vs the em-dash `—` (U+2014) only 959 times in 9 files. This
file was an outlier, using the em-dash 304 times and the en-dash only once —
contradicting both the corpus norm and the explicit `glossary/CLAUDE.md` rule
(`En-dash: – (U+2013) with spaces`).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (304×) | Em-dash `—` (U+2014) used instead of mandated en-dash `–` (U+2013) | `…цими обумовленостями, — ми є Дух…` | replace all `—` → `–` (spacing already correct) |
| L2 | 44, 68, 82, 97, 99, 103, 108, 111, 134 (18×) | Single-char ellipsis `…` (U+2026) instead of three-dot `...` per glossary | `Власне, Я мала… була…` | replace all `…` → `...` |
| L3 | 68 | Office title capitalized mid-sentence | `…спершу Міністр охорони здоров’я говорив зі Мною…` | `Міністр` → `міністр` |
| L4 | 25 | `одягнути` vs prescriptive `надіти` (вбрання) | `…одягнути якесь кумедне вбрання…` | (proposed) `надіти` |
| L5 | 67 | Doubled consonant in transliterated place name | `…у Коммершіал.` | (proposed) `Комершіал` |

*No spelling errors, mixed Latin/Cyrillic word-internal characters, missing/extra
spaces, or quotation-mark deviations were found. Quotes are uniformly `«»`;
apostrophe is uniformly `’` (U+2019). The lone `–` already in the file (para 54)
was already correct and left untouched.*

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 31 (3×) | Pronoun for an Individual Incarnation (Prophet Mohammed Saheb) lowercase | `…навіщо він говорив про воскресіння? Навіщо він говорив… Навіщо він казав…` | `він` → `Він` |
| S2 | 80 (3×) | Pronoun for an Individual Incarnation (Guru Nanak) lowercase | `…і він сказав… Потім він розділив… він поділив…` | `він` → `Він` |
| S3 | 118 | `істина` lowercase though it denotes the absolute Truth (uppercase everywhere else: paras 6, 30, 89, 102) | `…ось у чому істина.` | `істина` → `Істина` |
| S4 | 33 | Glossary term capitalized; `terms_lookup` gives `яма та ньяма` (lowercase) | `…перша частина — це Яма Ньяма…` | `Яма Ньяма` → `яма ньяма` |
| S5 | 34 (3×) | `Самадхі` capitalized; glossary gives `samadhi → самадхі` (lowercase), qualifier stays capitalized | `Нірвічара Самадхі`, `Нірвікальпа Самадхі` | → `Нірвічара самадхі`, `Нірвікальпа самадхі` |
| S6 | 7 | Stage-direction casing inconsistent (only non-uppercase one of ~20) | `[Шрі Матаджі сміється]` | `[ШРІ МАТАДЖІ СМІЄТЬСЯ]` |
| S7 | 102, 117 | Short form `Сахадж` for the org name vs dominant `Сахаджа` | `…суперечить Сахадж Йозі…`, `…ось що таке Сахадж Йоґа…` | (proposed) `Сахаджа` |
| S8 | 110 | Predicate pronoun for Christ lowercase | `…Я кажу вам, що Він ним був…` | (proposed) `Ним` |

*Deity-pronoun capitalization is otherwise consistent and correct: Shri Mataji
(Я/Мене/Мій/Моя/Свій/Себе), God (Він/Його/Йому/Ним), Christ (Він/Його), Kundalini
as Mother (Вона/Її/Їй/Себе), Mother Earth (Вона/Себе) are all uppercase; regular
people (questioners, the captain, gurus, Sai Baba [portrayed as Maheshasura],
Freud) are lowercase; reverential `Ви/Ваш` addressed to Shri Mataji by questioners
is correctly uppercased. Language names (англійська, гінді) and religion adherents
(християни, юдеї, мусульмани, індуси) are correctly lowercase. `Хатха Йоґу`
(para 33) follows the ґ transliteration rule and the dominant `Йоґа` form, so it
was kept (the glossary's `Хатха Йога` entry is internally inconsistent).*

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Glossary mandates `–` (U+2013); corpus norm 73/76 files. Genuine systematic deviation. |
| L | L2 | **Keep** | Glossary mandates three-dot `...`; corpus plurality (48/76) uses it. Consistent normalization. |
| L | L3 | **Keep** | Ukrainian orthography: posts/titles lowercase in running text. Mid-sentence → `міністр`. |
| L | L4 | **Remove** | `одягнути` is widely accepted standard usage; prescriptive `надіти` is a style preference, not an error. |
| L | L5 | **Remove** | Ukrainian orthography retains source-language doubling in proper names; `Коммершіал` is defensible. |
| S | S1 | **Keep** | Rule: Individual Incarnations singular → uppercase (Moses is a listed example). Mohammed is a Primordial Master; Christ's pronouns are already uppercased — consistency requires it. |
| S | S2 | **Keep** | Same rule; Guru Nanak is a Primordial Master / Adi Guru Incarnation. |
| S | S3 | **Keep** | Glossary: Істина (absolute Truth) uppercase; matches the other 5 occurrences in this transcript. |
| S | S4 | **Keep** | `terms_lookup.yaml` gives `яма та ньяма` lowercase. |
| S | S5 | **Keep** | `terms_lookup.yaml` gives `самадхі` lowercase; qualifier `Нірвічара/Нірвікальпа` stays uppercase. |
| S | S6 | **Keep** | Clear in-document style inconsistency (1 outlier vs ~20 all-caps directions). |
| S | S7 | **Remove** | `terms_context.yaml` explicitly states `сахаджа`/`сахадж` are interchangeable, at translator's discretion — not an error. |
| S | S8 | **Remove** | `ним` is a predicate pro-form standing for «Син Божий», not a direct personal reference; capitalizing it (`Він Ним був`) reads as «He was Him» and risks confusion. Original acceptable. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (304×) | em-dash `—` | `–` (en-dash, U+2013) |
| 2 | 18× | ellipsis `…` | `...` (three dots) |
| 3 | 68 | `Міністр охорони здоров’я` | `міністр охорони здоров’я` |
| 4 | 31 (3×) | `він` (Mohammed Saheb) | `Він` |
| 5 | 80 (3×) | `він` (Guru Nanak) | `Він` |
| 6 | 118 | `ось у чому істина` | `ось у чому Істина` |
| 7 | 33 | `Яма Ньяма` | `яма ньяма` |
| 8 | 34 (3×) | `Нірвічара/Нірвікальпа Самадхі` | `Нірвічара/Нірвікальпа самадхі` |
| 9 | 7 | `[Шрі Матаджі сміється]` | `[ШРІ МАТАДЖІ СМІЄТЬСЯ]` |

## Summary

- Language (L): 5 issues found, 3 approved by Critic
- SY Domain (S): 8 issues found, 6 approved by Critic
- Total corrections applied: 9 distinct fixes covering 335 textual edits
  (304 em-dashes, 18 ellipses, and 13 targeted word/casing corrections)
