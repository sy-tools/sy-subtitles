# Language Review – The Importance of Dedication and Devotion, 6 серпня 1982

## Process

2+1 agent review (Reviewer L — Language; Reviewer S — SY Domain; Critic — filter)
of `transcript_uk.txt` against `transcript_en.txt`, `glossary/CLAUDE.md`,
`glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

The translation (173 paragraphs: the talk + an extended Q&A / personal-counsel
session) is of high quality. Orthography, punctuation mechanics, and terminology
are clean. The one systematic defect is the capitalization of **Shri Mataji's
first-person pronouns**, which the glossary and template require to be **ALWAYS
uppercase** (`Я / Мені / Мій / Моя / Себе …`) but which the draft applied
inconsistently — object/possessive forms (`Мене / Мені / Мною / Мій / Моїх`)
were mostly capitalized, while the subject `я` and several reflexives were left
lowercase. All such cases were corrected, **carefully preserving the lowercase
first person of every other speaker** (the wife and husband in the lamp story,
Djamel, Linda, Kathy, Don, Kerry, the male questioners, the Sahaja Yogini, and
the yogi self-affirmation / self-examination quotes such as «Я отримав
Реалізацію…», «Чи я досконалий?», «Що я тепер роблю?»).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Item | Context | Verdict |
|---|-----------|------|---------|---------|
| L1 | all | Em-dash character | body uses `—` (U+2014) ×236, consistently | Keep (standard Ukrainian тире; internally consistent) |
| L2 | all | Ellipsis character | uses `…` (U+2026) ×99, consistently | Keep (valid typography; consistent) |
| L3 | 65→66, 98 | Guillemet count 146 `«` / 145 `»` | P65→P66 = one quote spanning a paragraph break; P98 mirrors EN source run-on quote | Keep (not an error) |
| L4 | all | Spelling / scripts / spacing | no misspellings; no mixed Latin+Cyrillic (only the English title «The Advent» and `[НЕРОЗБІРЛИВО]`-type markers); apostrophes all `’` (U+2019); quotes all `«»`; 0 double spaces; 0 space-before-punctuation | Clean — no change |

No genuine orthographic, grammatical, or punctuation errors were found.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph(s) | Error | Example (before → after) | Verdict |
|---|--------------|-------|--------------------------|---------|
| S1 | 7,11,13,14,16,20,25–28,30,31,34,35,37,38,42,43,45,46,48,50,51,53,54,55,58,60,62,66,70,72–74,76,78–80,85,87,90–93,97–102,104,107,111,130,161,166,170,172,17 | Shri Mataji's first-person **subject** `я` lowercase | «Нещодавно **я** говорила» → «Нещодавно **Я** говорила»; «коли **я** щось кажу» → «коли **Я** щось кажу» | Keep |
| S2 | 16,42,53,79,172 | Shri Mataji's first-person **object/reflexive** lowercase | «навіщо **мені** брехати» → «навіщо **Мені** брехати»; «**себе** контролюю» → «**Себе** контролюю» | Keep |
| S3 | 45 | Hanuman (deity, singular) addressed with lowercase 2nd person | «які **твої** сили, **ти**… **ти** проковтнув… Це **ти** зробив у **своєму** дитинстві» → «**Твої**… **Ти**… **Ти**… Це **Ти**… у **Своєму**» (matches narration's Він/Свої/Йому) | Keep |
| S4 | 48,166,167 | `пуджі` lowercase (Puja = ceremony name) | «у питаннях **пуджі**» → «у питаннях **Пуджі**»; «для **пуджі**» → «для **Пуджі**» | Keep |
| S5 | 11 | `інкарнації` lowercase | «Саме в цій **інкарнації**» | Remove (EN lowercase «in this incarnation»; temporal sense — ambiguous) |

Terminology otherwise correct and consistent: `Сахаджа Йоґа/Йозі/Йоґу` vs
practitioner `сахаджа йоґ/йоґи`; `Реалізація/Самореалізація` (event) capitalized,
`реалізована душа` lowercase; `Дух`, `Кундаліні`, `Вішуддхі`, `Хамса`, `Аґії`,
`Шанті`, `Праве Серце`, `Шрі Рама`, `Бог`, `Царство Боже`, deity pronouns
`Вона/Її`, `Йому`, `Тебе/Твій` (to the Divine) — all correct. Language names
lowercase (`англійська`, `іспанська`, `італійською`, `гінді`). ✓

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| S | S1 | Keep | Explicit rule (glossary `CLAUDE.md` + template): "Shri Mataji: ALWAYS uppercase". Draft was internally inconsistent. |
| S | S2 | Keep | Same rule; reflexive/object forms of Shri Mataji follow the established capitalized pattern (e.g. «віру в Себе», «зі Собою»). |
| S | S3 | Keep | Hanuman is an Incarnation; surrounding narration already capitalizes Він/Свої/Йому, so the 2nd-person address must match. |
| S | S4 | Keep | Glossary: «Пуджа – uppercase (ceremony name)»; removes the `пуджі`/`Сахасрара Пуджі` inconsistency. |
| S | S5 | Remove | EN keeps «incarnation» lowercase here; reads as "in this lifetime/age", not naming the Divine Incarnation as an entity. |
| L | L1 | Remove | Em-dash `—` is standard Ukrainian тире and is used consistently; normalizing 236 dashes is a style preference, not an error. |
| L | L2 | Remove | `…` (U+2026) is valid and consistent. |
| L | L3 | Remove | The open/close mismatch is a single cross-paragraph quote (65→66) plus a source-faithful run-on (98) — not a defect. |

### Approved Corrections (applied)

All corrections are deity-pronoun / sacred-term capitalization. Representative
samples (full set applied across the listed paragraphs):

| # | Paragraph | Before | After |
|---|-----------|--------|-------|
| 1 | 7 | Нещодавно **я** говорила вам | Нещодавно **Я** говорила вам |
| 2 | 16 | коли **я** щось кажу, **я** цього певна | коли **Я** щось кажу, **Я** цього певна |
| 3 | 16 | «Навіщо **мені** брехати?» | «Навіщо **Мені** брехати?» |
| 4 | 42 | але **я** цілковито **себе** контролюю | але **Я** цілковито **Себе** контролюю |
| 5 | 45 | які **твої** сили, **ти**… **ти** проковтнув | які **Твої** сили, **Ти**… **Ти** проковтнув |
| 6 | 48 | у питаннях **пуджі** **я** бачила | у питаннях **Пуджі** **Я** бачила |
| 7 | 53 | Якщо **мені** треба вас виправити, **я** виходжу | Якщо **Мені** треба вас виправити, **Я** виходжу |
| 8 | 70 | якщо **я** щось бачу… тепер **я** знаю | якщо **Я** щось бачу… тепер **Я** знаю |
| 9 | 76 | **я** спатиму тут… до якої ванної кімнати **я** піду | **Я** спатиму тут… до якої ванної кімнати **Я** піду |
| 10 | 161 | бо Сахаджа Йоґа… **я** не можу говорити всіма мовами | бо Сахаджа Йоґа… **Я** не можу говорити всіма мовами |
| 11 | 172 | Перепрошую, **мені** треба йти | Перепрошую, **Мені** треба йти |

**Not changed (correctly lowercase — other speakers):** «Чи **я** досконалий? Чи
**я** гаразд?» (yogi self-exam, P65–66), «Що **я** тепер роблю?» / «Чи **я**
свідок?» (yogi, P68), «**я** запитала свого чоловіка» (wife, P14), «**я** б не
віддав» (husband, P14), «**я** прожив із нею два роки» (yogi, P97), «щоб **я**
жила з нею», «переважно **я** говорила», «**я** намагалася», «що **я** готую»
(Linda, P87–89), «Куди б Ти мене не послала, Матінко, **я** поїду» (Don, P161),
«бо **я** мала ті самі проблеми» (Sahaja Yogini, P162).

## Summary

- **Language (L):** 0 genuine errors; 3 candidate items (dash, ellipsis, quote
  balance) all reviewed and rejected by the Critic as non-errors.
- **SY Domain (S):** 5 issue groups found; 4 approved (S1–S4), 1 rejected (S5).
- **Total corrections applied:** all approved deity-pronoun and sacred-term
  capitalizations across paragraphs 7–172 (Shri Mataji's `я/мені/себе` →
  `Я/Мені/Себе`; Hanuman's address `ти/твої/своєму` → `Ти/Твої/Своєму`;
  `пуджі` → `Пуджі`), with every other speaker's first person left untouched.
