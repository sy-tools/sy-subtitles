# Language Review – The-Revival-of-Indian-Spirituality, 14 December 1998

## Process

2+1 agent review of `transcript_uk.txt` (full paragraphed Ukrainian text):
Reviewer L (Language) and Reviewer S (SY Domain) run in parallel; the Critic
filters both tables and keeps only genuine errors. Approved corrections were
applied to `transcript_uk.txt`. Paragraph numbers refer to line numbers in
`transcript_uk.txt`.

This is a follow-up pass. Previous passes (1) normalised dashes
(em-dash → en-dash, 103×) and capitalised `Вайю`, and (2) moved the sentence
period outside the closing guillemet in 11 declarative direct-speech quotes
(`А: «П».`). Both were re-verified as conformant in this pass. This pass
focused on residual ellipsis/spacing anomalies, grammar of paired
conjunctions and idioms, and lowercase/uppercase of religious common nouns.

**Override note:** the previous pass's Critic kept three multi-dot artifacts
(`]....чи` ¶46, `Боже…..]` ¶52, and five-dot runs) as "source-fidelity"
renderings. This pass's Critic overrides that verdict: `glossary/CLAUDE.md`
fixes the ellipsis as exactly `...` (three ASCII dots), and the transcript's
own majority convention already normalises EN dot-noise (`[нерозбірливо]... Я
відчуваю` ¶42, `за дуже... інших обставин` ¶25 from EN `….`). Dot count is
typographic noise, not speech content, so normalisation loses nothing.
Character-level scan performed: ellipsis variants (U+2026 vs `...`),
apostrophes (U+2019), «» quotes, Latin/Cyrillic mixing, double spaces,
spacing around punctuation.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Standalone two-dot run after unclear-speech bracket | `Хто вони?].. Але вони, індійці` | `Хто вони?]... Але` |
| L2 | 21 | Five-dot ellipsis | `настільки [нерозбірливо]..... Так, ми` | `[нерозбірливо]... Так` |
| L3 | 30 | Contaminated paired construction «не так…, а…» (norm: «не так…, як…») | `це не так мозок, мушу сказати, а ваша обумовленість і ваше его` | `…мушу сказати, як ваша обумовленість і ваше его` |
| L4 | 38 | Suspected missing period after closing quote | `або «ой, я...» Бачите, там є` | add period after `»`? |
| L5 | 45 | Wrong idiom form for “one to one”: «один на одного» = “at/onto each other”, not tête-à-tête | `лише одна, один на одного` | `лише одна, один на один` |
| L6 | 46 | Four-dot ellipsis glued to next word | `[нерозбірливо: Отже]....чи можемо ми пережити це?` | `[нерозбірливо: Отже]... чи можемо` |
| L7 | 50 | Double period instead of ellipsis | `Тепер переконайтеся самі. Руки вгору..` | `Руки вгору...` |
| L8 | 52 | U+2026 ellipsis char + two periods (rule: three ASCII dots) | `Дякую Тобі, Боже…..]` | `Дякую Тобі, Боже...]` |
| L9 | 54 | Missing space before parenthesis | `Журналістика!..(сміх у залі)` | `Журналістика!.. (сміх у залі)` |
| L10 | 10 | Suspected extra comma | `вони просто відмовляться, навіть слухати про це` | remove comma? |
| L11 | 36 | Suspected extra comma | `Бо їм треба думати, про майбутнє, розумієте` | remove comma after «думати»? |
| L12 | 19 | Number shift singular → plural | `стаєте … дуже спокійною людиною. Задоволеними, ви отримуєте…` | agree number? |
| L13 | 18, 54 | Suspected non-standard `?..` / `!..` | `га?..`, `Журналістика!..` | normalize to `...`? |
| L14 | 13 | Suspected space before ellipsis | `(…воно не потрібне) ...може починати` | remove space? |

Verified correct, **not** flagged: periods outside closing guillemets in all 11
declarative quotes fixed by the previous pass; `?`/`!` kept inside quotes for
interrogatives; apostrophes consistently `’` (U+2019); dashes consistently
` – ` (U+2013); quotes consistently «»; no Latin/Cyrillic mixing (only the
intentional Roman numeral `XII`); no double spaces; no missing spaces after
commas; `напівмертвими` (напів- solid); hyphenated reduplications
(`дуже-дуже`, `маленьких-маленьких`, `Ні-ні`, `так-от`, `як-от`) correct.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 45 | Followers of a religious tradition capitalized — inconsistent with lowercase «суфії» (¶9) and glossary practice (шиваїт/вішнаїт lowercase); Правопис lowercases followers of religious movements | `групу людей, яких називали Натхпантхи` | `яких називали натхпантхи` |
| S2 | 45 | Generic common noun for prophets capitalized (cf. lowercase «пророки» ¶9, «суфії» ¶9) | `Було так багато Набі.` | `Було так багато набі.` |
| S3 | 34/36 | Pronoun for Kundalini lowercase in ¶34 (`щойно вона підіймається`) vs uppercase in ¶36 (`Із Кундаліні те, що Вона робить`) | inconsistency | harmonize to «Вона»? |
| S4 | 21, 42 etc. | Direct speech sometimes in «» (`«Матінко, щоб слухати Тебе»`), sometimes bare after colon (`Я сказала: що таке?`) | mixed styles | unify quoting? |

Terminology / capitalisation spot-checks (all correct, no change needed):
- Shri Mataji pronouns consistently uppercase (`Я/Мене/Мені/Мій/Моя/Моє/Сама`,
  `Ти/Тебе/Тобою/Твоє/Твоя`); interlocutors' `Ви/Ваші` to Her uppercase;
  seeker-voice `я` mid-sentence lowercase (`Як я можу це отримати?` ¶49);
  regular people (`він` — journalist, driver, father) lowercase mid-sentence.
- Singular Incarnation pronoun uppercase: `коли Він це сказав`, `Він ясно це
  сказав` (Мохаммед сахіб, ¶11); `Вона` for Мати Земля (¶11) matches EN "She".
- Glossary terms correct: `Кундаліні`, `Сахаджа Йоґа` / loc. `в Сахаджа Йозі`
  (ґ→з, NOT «Йоґі»), `сахаджа йоґи/йоґів` lowercase, `Аґію чакру`,
  `Сушумну Наді`, `прохолодний вітерець`, `вібрації/вібрована вода`,
  `блокується/блокує` (catching), `реалізована душа`,
  `Самореалізація/Реалізація`, `масову Реалізацію`, `обумовленість`, `его`,
  `колективність`, `Г’янадева/Г’янешвара/«Г’янешварі»`, `Ґуру Нанак`, `Кабір`,
  `Шіва` (і), `Ґанґа`, `Пурани`, `Мати Земля`, `Святого Духа`, `Царстві
  Божому`, `бхут бадха` (matches `бхути`/`бадхи` family), `Агні` (г, per
  glossary), element principles `Теджасва`, `Вайю`, `Джал`, `Агні Таттва`,
  `Джал Таттва` internally consistent.
- Language names lowercase: `англійська`, `гінді`, `санскрит`; ethnonyms
  lowercase (`британці`, `росіяни`, `індуси`, `мусульмани`, `греки`);
  `Захід/на Заході` uppercase as cultural region — correct.
- `стопи` (people's physical feet, ¶48/¶54) correctly lowercase — not the
  deity `Стопи`; `ґуру` lowercase generic vs `Ґуру Нанак` name — correct.
- `Мохаммед сахіб` spelling matches glossary `Мохаммед`; consistent 3×.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Standalone `..` outside the bracket is not a valid ellipsis; in-file convention is `...` |
| L | L2 | **Keep** | `.....` is not valid; glossary fixes ellipsis as `...`; matches ¶42 in-file pattern |
| L | L3 | **Keep** | Genuine grammar error: with «так» present the paired conjunction «як» is required («не так X, як Y»); fix preserves EN meaning “not so much the brain as your conditioning” |
| L | L4 | Remove | False positive: scheme `А: «П...»` — after a quote ending in `...` no period follows the closing guillemet; previous pass verified this exact spot as correct |
| L | L5 | **Keep** | Real meaning distortion: EN “one to one” = «один на один»; «один на одного» reads as “onto each other” |
| L | L6 | **Keep** | `....` invalid and glued to next word; normalized to in-file pattern `[нерозбірливо]... ` (cf. ¶42). Overrides prior pass's source-fidelity verdict per glossary rule |
| L | L7 | **Keep** | Double period is explicitly listed as an error in the review checklist |
| L | L8 | **Keep** | Glossary mandates three ASCII dots; U+2026 + `..` violates it. Overrides prior pass's source-fidelity verdict |
| L | L9 | **Keep** | Missing space before parenthesis is a genuine spacing error (the `!..` itself is kept, see L13) |
| L | L10 | Remove | Parcellation mirrors EN spoken pause (“they will just refuse it, to listen to it”); intentional transcript style |
| L | L11 | Remove | Comma mirrors EN halting speech (“they have to think, futuristic you see”); not an error in a verbatim transcript |
| L | L12 | Remove | Mirrors broken EN syntax (“you become a it can call a very tranquil person. Satisfied, you get…”); transcript preserves spoken register |
| L | L13 | Remove | False positive: `?..` and `!..` are the standard Ukrainian combinations of question/exclamation mark with ellipsis |
| L | L14 | Remove | False positive: leading ellipsis marking resumed speech attaches to the following word; the space after `)` is correct |
| S | S1 | **Keep** | Правопис lowercases followers of religious movements; also fixes in-text inconsistency with «суфії» |
| S | S2 | **Keep** | «набі» is a common noun (“prophet”); same orthography rule and same in-text consistency argument |
| S | S3 | Remove | Mirrors EN's own «it»/«She» distinction; no project rule mandates uppercase pronouns for Kundalini |
| S | S4 | Remove | Quoted vs unquoted direct speech follows the EN transcript utterance by utterance; normalising would be a style intervention, not an error fix |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | `Хто вони?].. Але` | `Хто вони?]... Але` |
| 2 | 21 | `[нерозбірливо].....` | `[нерозбірливо]...` |
| 3 | 30 | `не так мозок, мушу сказати, а ваша обумовленість` | `не так мозок, мушу сказати, як ваша обумовленість` |
| 4 | 45 | `лише одна, один на одного` | `лише одна, один на один` |
| 5 | 46 | `[нерозбірливо: Отже]....чи` | `[нерозбірливо: Отже]... чи` |
| 6 | 50 | `Руки вгору..` | `Руки вгору...` |
| 7 | 52 | `Дякую Тобі, Боже…..]` (U+2026 + `..`) | `Дякую Тобі, Боже...]` |
| 8 | 54 | `Журналістика!..(сміх у залі)` | `Журналістика!.. (сміх у залі)` |
| 9 | 45 | `яких називали Натхпантхи` | `яких називали натхпантхи` |
| 10 | 45 | `Було так багато Набі.` | `Було так багато набі.` |

## Summary

- Language (L): 14 issues found, 8 approved by Critic
- SY Domain (S): 4 issues found, 2 approved by Critic
- Total corrections applied: 10

The translation is of high quality. Deity-pronoun capitalisation, `ґ`
transliteration, glossary terminology, `’` apostrophes, ` – ` dashes and «»
quotes are applied consistently; the earlier passes' dash and guillemet-period
fixes hold. This pass corrected two genuine grammar/idiom slips («не так…, а»
→ «не так…, як»; «один на одного» → «один на один»), lowercased two religious
common nouns (натхпантхи, набі) for consistency with «суфії» and Правопис, and
normalised the last five ellipsis/spacing anomalies to the project's `...`
convention.
