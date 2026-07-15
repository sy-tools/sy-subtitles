# Language Review – 1992-03-01 Evening Program and Talk to Sahaja Yogis (The Day after Mahashivaratri Puja), 2026-07-15

## Process

Reviewed `transcript_uk.txt` (107 content lines) against the English original (`transcript_en.txt`),
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`
using 2 parallel reviewers (L = Language, S = SY Domain) + 1 Critic filter.

A prior review round (2026-05-29, preserved in git history) already normalized the ellipsis
(`…` → `...`, 13×), the dash (`—` → ` – `, 62×), and fixed the parent's mid-sentence `Я` → `я` (§56).
Its Critic rulings (euphony `вже/уже` = acceptable variant; reverential capitalization
`Мої Слова/Ім’я/Волосся/Голову/Програмі/Присутності` = deliberate, mirrors source; lowercase
pronouns for `Дух` = correct) were respected and not re-litigated. Character-level checks
(quotes, apostrophes, double spaces, mixed Latin/Cyrillic, dash/ellipsis characters) were re-run
and are clean. Debatable conventions were verified against the full talk corpus.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 6 | Comma directly before an opening parenthesis — not permitted in Ukrainian punctuation; header line 3 has the same phrase correctly without it | `Ньюкасл, (Австралія), 1 березня 1992` | `Ньюкасл (Австралія), 1 березня 1992` |
| L2 | 23 | Commas around `головно` — it is a plain adverb (= «переважно»), not a parenthetical (вставне слово) | `виникає, головно, коли жінки не знають` | `виникає головно, коли жінки не знають` |
| L3 | 41 | Dangling adverbial participle: the agent of `організувавши` is not the subject `воно` (дієприслівниковий зворот requires same subject) | `може здаватися, що, організувавши це, воно збільшилося` | `може здаватися, що завдяки організації воно збільшилося` |
| L4 | 45 | Comma after the conjunction `тобто` — `тобто` is not a parenthetical; only the comma before it is correct | `людини, тобто, коли ви їдете в Індію` | `людини, тобто коли ви їдете в Індію` |
| L5 | 53 | Question mark after an indirect question — the main clause `Я не знаю` is declarative, so the sentence takes a period (EN «?» is a transcription quirk) | `Але Я не знаю, чому в Австралії ви так любите сонце, коли його так багато?` | `...коли його так багато.` |
| L6 | 72 | Mood mismatch in the concessive: `хоч би` requires the conditional (б-form), as in the parallel `хоч би що це було` | `хоч би що це було, хоч би що вам підходить` | `хоч би що вам підходило` |
| L7 | 100 | Missing space after ellipsis before the editorial insert; the same line has `тепер... [Гінді:` correctly spaced | `повертатися до...[Гінді: Котра година?]` | `повертатися до... [Гінді: Котра година?]` |
| L8 | 27 | Direct rhetorical question ends with a period | `Тож як ви можете мати таку думку, що коли Я кажу «голова», то він домінує над серцем.` | (considered) `?` |
| L9 | 25 | Relative pronoun agreement with two coordinated nouns | `терпіння й співчуття, яке у вас є` | (considered) `які у вас є` |
| L10 | 50 | Possibly missing comma between coordinate modifiers | `у всіх блискуче гарне волосся` | (considered) `блискуче, гарне волосся` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 13, 17, 18, 27, 38, 73(×2), 75, 76, 78, 80, 81, 83(×2) | Genitive of `Сахаджа Йоґа` written with plain `г` (`Йоги`), while every other case form in this transcript keeps `ґ` (`Йоґа/Йоґу/Йоґою`; loc. `Йозі` per glossary). Morphologically the ґ→з alternation applies only to dative/locative; genitive keeps the stem `Йоґ-`. Corpus confirms: 284× `Сахаджа Йоґи` vs 34× `Сахаджа Йоги` across all UK transcripts. | `подорож Сахаджа Йоги`, `ріст Сахаджа Йоги`, `для Сахаджа Йоги`... (14×) | `Сахаджа Йоги` → `Сахаджа Йоґи` (14×) |
| S2 | 104 | Vocative `Мати` in the yogini's address instead of `Матінко` | `Мати, прийми її, будь ласка` | (considered) `Матінко` |
| S3 | 48 | `Медхастітха` (Medhastitha) — term absent from glossary; transliteration audit | `Медхастітха – вони сідають на жир` | (verified, no change) |
| S4 | 31 | Meaning drift vs garbled source: `їхній прихід до чийогось дому стає для Мене проблемою` — context (§32: `Бо якщо Я йду до чийогось дому...`) shows the "problem" is Shri Mataji's going to houses, not "their" coming | `Але тепер їхній прихід до чийогось дому...` | (considered) rephrase |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Hard punctuation rule (no comma before an opening parenthesis) plus internal inconsistency with line 3 of the same file. Genuine error. |
| L | L2 | **Keep** | `головно` is an adverb per СУМ, not on any вставні-слова list; commas around it are a genuine punctuation error, not a style call. The comma before `коли` (subordinate clause) is retained. |
| L | L3 | **Keep** | Clear violation of the same-subject rule for дієприслівниковий зворот («воно» did not do the organizing). The fix preserves the EN meaning ("by organizing it, it has increased") with minimal rewording. |
| L | L4 | **Keep** | `тобто` is a conjunction; a comma after it is normatively wrong. Same class of error as L2. |
| L | L5 | **Keep** | Ukrainian punctuation puts a period after an indirect question regardless of source punctuation — same precedence of UK norms over EN quirks as the prior round's ellipsis/dash fixes. |
| L | L6 | **Keep** | Genuine grammar error: the indicative `підходить` breaks the required conditional after `хоч би`, and the sentence itself contains the correct parallel (`хоч би що це було`). |
| L | L7 | **Keep** | Genuine typographic slip, proven by the correctly spaced twin (`тепер... [Гінді:`) in the very same line. |
| L | L8 | Remove | The period mirrors the EN source exactly and matches the falling rhetorical intonation of the delivery; the following `Як таке може бути?` carries the interrogation. Unlike L5, no Ukrainian norm is violated by a rhetorical question rendered declaratively per source. |
| L | L9 | Remove | Agreement with the nearest of two neuter singular nouns (`співчуття, яке`) is grammatically acceptable; plural `які` is a preference, not a correction. |
| L | L10 | Remove | The adverbial reading `блискуче гарне` («strikingly beautiful») is defensible and matches the casual spoken register of "all shining nice hair"; not clearly an error. |
| S | S1 | **Keep** | Backed by canonical spelling `Сахаджа Йоґа` (terms_lookup), morphology (no ґ→г alternation exists; only dat./loc. → `Йозі`), intra-file consistency (`Йоґу/Йоґою` everywhere else), and 284-to-34 corpus majority. All 14 hits verified to be the genitive of the practice (capital `Й`), not the plural `сахаджа йоґи`. |
| S | S2 | Remove | terms_context reserves `Матінко` for prayer address («Звертання "Матінко" в молитві»); this is dialogue, where `Мати` is used consistently in this transcript (§21, §30, §32, §35, §66, §85) and across the corpus. Not an error. |
| S | S3 | Remove (no change needed) | Transliteration `Медхастітха` faithfully follows the EN "Medhastitha" and the conventions table (`dh` → дх, short `i` → і). Verified correct; nothing to fix. |
| S | S4 | Remove | Out of scope for the L/S review (meaning, not orthography/terminology), and the UK faithfully renders the garbled EN source ("But they go into somebody's house..."). Changing it would be retranslation, not correction. Noted for a future translation-accuracy pass. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 6 | Comma before parenthesis | `Ньюкасл, (Австралія)` → `Ньюкасл (Австралія)` |
| 2 | 23 | Commas around adverb `головно` | `виникає, головно, коли` → `виникає головно, коли` |
| 3 | 41 | Dangling participle | `що, організувавши це, воно збільшилося` → `що завдяки організації воно збільшилося` |
| 4 | 45 | Comma after `тобто` | `тобто, коли ви їдете` → `тобто коли ви їдете` |
| 5 | 53 | `?` after indirect question | `коли його так багато?` → `коли його так багато.` |
| 6 | 72 | Indicative after `хоч би` | `хоч би що вам підходить` → `хоч би що вам підходило` |
| 7 | 100 | Missing space after ellipsis | `до...[Гінді` → `до... [Гінді` |
| 8 | 13, 17, 18, 27, 38, 73(×2), 75, 76, 78, 80, 81, 83(×2) | Genitive `Сахаджа Йоги` | `Сахаджа Йоги` → `Сахаджа Йоґи` (14×) |

## Summary

- Language (L): 10 issues found, 7 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 8 distinct fixes (21 textual replacements)

### Notes

- Post-fix verification: `Йоґа` case forms now fully consistent (`Йоґа` 9, `Йоґу` 12, `Йоґи` 14,
  `Йоґою` 1, loc. `Йозі` 10); no `…`/`—`/straight quotes/double spaces/mixed-alphabet strings remain.
- Deity-pronoun capitalization is correct and nuanced throughout: Shri Mataji
  (`Я/Мені/Мій/Своє/Вона/Сама/Ти` in others' speech) uppercase; Shri Krishna `Він` (§52) uppercase;
  the husband's `я` (§74), the parent's `я` (§56), the practitioner's `я` (§65), and `ти` for
  John (§92) correctly lowercase.
- Glossary terminology verified: `сахаджа йоґ/йоґи/йоґів/йоґам/йоґами/йоґинь`, `Муладхара`,
  `Сахасрара`, `Вішва Нірмала Дхарма`, `Пуджа`, `Дхарма`, `Дух`, `Шакті`, `Лакшмі`, `Шрі Крішна`,
  `Ґанапатіпуле`, `бандхан`, `бадха`, `бхути`, `вібрації`, `его`, `заблокувалися` (catching →
  блокування). Language/religion names (`англійською`, `християнство`, `іслам`, `буддизм`)
  correctly lowercase; `Захід` (Western world) correctly uppercase.
- §31 meaning-drift observation (S4) left unchanged — flagged for a future translation-accuracy
  pass, as the UK mirrors the garbled EN source.
