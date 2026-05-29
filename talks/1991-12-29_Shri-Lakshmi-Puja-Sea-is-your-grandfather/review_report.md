# Language Review – 1991-12-29 Shri Lakshmi Puja: Sea is your grandfather

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text, 48 blocks) against
`transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and
`glossary/terms_context.yaml`, using 2 parallel reviewers + 1 critic filter.

Mechanical orthography checks (run on the file): no double spaces, no spaces before
punctuation, no Latin/Cyrillic mixing, no straight `"` or German `„"` quotes, no
straight apostrophes, no `…` ellipsis character. Character inventory confirmed: 30×
en-dash `–` (U+2013), 13× `«` / 13× `»` (balanced), 12× apostrophe `’` (U+2019),
8× hyphen-minus — all legitimate compounds (`По-перше`, `по-друге`, `два-три`,
`три-чотири`, `давним-давно`, `будь-яких`, `будь-чому`). Punctuation mechanics are clean.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | Pronoun agreement (sg fem `її` vs pl `грошей`) | «…не даєте трохи грошей… то коли ж ви **її** дасте?» | `її` → `їх` |
| L2 | 7 | Possible calque «Тим не менш» (rus. *тем не менее*) | «**Тим не менш**, тепер Я чула…» | `Тим не менш` → `Однак` |

No spelling, case-form, verb-conjugation, gender-agreement, comma, dash, quote,
apostrophe, or spacing errors were found beyond the two borderline items above.
Deity-pronoun capitalization for Shri Mataji (Я/Мені/Мій/Моя/Мене/Зі Мною) is
correct throughout; generic-`я`/`ти` in self-talk (¶45) and quoted listeners (¶41)
correctly stay lowercase except at sentence start.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 6,7,8,10,12,13,14,15,16,17,18,19,20,32,33,42,43,46 | Transliteration: «Сахаджа Йог-» uses `г`, breaking the Sanskrit `g → ґ` rule and the glossary form **Сахаджа Йоґа**; also internally inconsistent with the practitioner term `сахаджа йоґ` (`ґ`) used in this same file | «практики **Сахаджа Йоги**», «поширити **Сахаджа Йогу**», «**Сахаджа Йога** повинна зростати» (33 occurrences) | `Сахаджа Йог-` → `Сахаджа Йоґ-` (Йога/Йоги/Йогу → Йоґа/Йоґи/Йоґу) |
| S2 | 27 | `намаскар` lowercase vs glossary `Намаскар` | «сказати **намаскар** морю» | (candidate) → `Намаскар` |
| S3 | 39,48 | `Море`/`Морю` capitalized vs lowercase `море` elsewhere | «і **Море** тепер може стати парою», «завдяки **Морю**» | (candidate) → `море` |
| S4 | header vs 6 | Place-name inconsistency `Чалмала` (header) vs `Чалмаал` (body) | «Чалмала, Алібаґ» / «До цього села Чалмаал» | (candidate) → unify |

Verified correct (no change): `Самореалізація`/`Реалізація` capitalized per glossary;
`реалізована душа` lowercase; `Лакшмі`, `Махалакшмі`, `Махакалі`, `Махасарасваті`,
`Сахасрара`, `Ґуру`/`Махаґуру`, `Ґанапатіпуле`, `Ґайквад`, `Гімалаї` (h→г),
`маріяди`, `тапасья`, `бандхан`, `вібрації` all per glossary; language name
`англійська`/`українська` lowercase; `Пуджа`/`Пуджі` capitalized; `Бог`/`Богові`
(God) capitalized; the sea-deity `Богові моря`/`Його` capitalized as an individual
deity (consistent across ¶26–27); three Goddesses `Богині` capitalized; locative
`в Сахаджа Йозі` correct (ґ→з / г→з both yield з) and left untouched.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Remove** | `її` reads naturally as the implied contribution/donation; understandable, mirrors the loose source («…give it»). Not a clear-cut grammatical error — changing it is over-editing. |
| L | L2 | **Remove** | «Тим не менш» is widely used and understood; treating it as an error is a style preference, which the Critic excludes. No grammatical fault. |
| S | S1 | **Keep** | Genuine, high-confidence terminology/transliteration error. Glossary mandates **Сахаджа Йоґа** (`ґ`); transliteration rule is Sanskrit `g → ґ`; corpus norm is overwhelming (274 `ґ` vs 71 `г`, 30 files vs 6); and the file already uses `сахаджа йоґ` (`ґ`) for the practitioner, so `Сахаджа Йог` (`г`) is internally inconsistent. |
| S | S2 | **Remove** | Here `намаскар` denotes the act of greeting the sea ("say namaskar"), lowercase in the EN source; capitalizing it mid-sentence would be inappropriate. The glossary capital applies to the standalone term. |
| S | S3 | **Remove** | The EN source deliberately capitalizes "Sea" in exactly these two spots (personified Mahaguru/grandfather); the translation faithfully mirrors that emphasis. Not an error. |
| S | S4 | **Remove** | The EN source itself is inconsistent (`Chalmala` header / `Chalmaal` body); the translation faithfully mirrors a proper-noun transliteration. Out of scope to "correct" the source. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 6,7,8,10,12,13,14,15,16,17,18,19,20,32,33,42,43,46 | `Сахаджа Йог-` (`г`) — wrong transliteration, off-glossary, internally inconsistent | `Сахаджа Йог-` → `Сахаджа Йоґ-` (33 occurrences: Йога×4, Йоги×16, Йогу×13) |

## Summary

- Language (L): 2 candidate issues found, 0 approved by Critic
- SY Domain (S): 4 candidate issues found, 1 approved by Critic
- Total corrections applied: **33 occurrences** (1 systematic fix — `Сахаджа Йог-` → `Сахаджа Йоґ-`)

The translation is of high quality: punctuation mechanics are clean, deity-pronoun
capitalization is correct throughout, and glossary terminology is otherwise faithful.
The single substantive correction standardizes the practice name to the canonical
glossary spelling **Сахаджа Йоґа**, bringing it in line with the Sanskrit `g → ґ`
transliteration rule, the wider corpus, and the already-correct practitioner term
`сахаджа йоґ` used in the same file.
