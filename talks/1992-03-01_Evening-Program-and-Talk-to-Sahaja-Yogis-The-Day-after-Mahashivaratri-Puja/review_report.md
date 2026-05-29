# Language Review – 1992-03-01 Evening Program and Talk to Sahaja Yogis (The Day after Mahashivaratri Puja), 2026-05-29

## Process

Reviewed `transcript_uk.txt` (107 content lines) against the English original (`transcript_en.txt`),
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`
using 2 parallel reviewers (L = Language, S = SY Domain) + 1 Critic filter.

Character-level checks were run across the file and against the rest of the corpus to confirm
which orthographic conventions are canonical.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (13×) | Single-character ellipsis `…` (U+2026) used throughout; `glossary/CLAUDE.md` mandates three dots `...`. Corpus confirms: 21/24 UK transcripts use `...`, only 3 use `…`. | `дрібничку…`, `шлюбом…`, `лідерів…` | Replace every `…` → `...` |
| L2 | all (62×) | Em-dash `—` (U+2014) used for all interjection dashes; `glossary/CLAUDE.md` mandates en-dash ` – ` (U+2013) with spaces. Corpus confirms: 32/37 UK transcripts use U+2013, only 5 use U+2014. | `Перший момент:` / `Потім друге — про...` / `ви — Шакті` | Replace every ` — ` → ` – ` |
| L3 | 22 | Euphony: `не так вже й` after consonant-final `так` | `питання жінки, не так вже й чоловіка` | `не так уже й` |
| L4 | 19 | Awkward concessive construction `які б речі у вас не були` | `які б речі у вас не були` | `хоч би які речі у вас були` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 56 | Mid-sentence uppercase `Я` refers to the **parent** modeling a tooth-brushing game for the child, **not** Shri Mataji. Uppercase `Я` is reserved for Shri Mataji; regular people are lowercase. (Cf. §45/§65 where the practitioner's own `я/мої/мені` are correctly lowercase.) | `Ти почистиш свої зуби, Я почищу свої зуби.` | `...я почищу свої зуби.` |
| S2 | 9, 11, 51, 63, 77 | Reverential capitalization of common nouns after Shri Mataji's possessive (`Мої Слова`, `Моє Ім’я`, `Своє Волосся`, `Моїй Програмі/Присутності`, `Мою Голову`) | `використовувати Мої Слова` | (considered) lowercase the nouns |
| S3 | 64, 65, 86 | Pronoun for `Дух` written lowercase (`він/його/ним`) | `Дух... він зробив нас такими милими` | (considered) uppercase pronoun |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Backed by explicit rule in `glossary/CLAUDE.md` ("Ellipsis: `...` three dots") **and** corpus majority (21/24). Genuine orthography deviation. |
| L | L2 | **Keep** | Backed by explicit rule in `glossary/CLAUDE.md` ("En-dash: ` – ` (U+2013) with spaces") **and** corpus majority (32/37). Genuine orthography deviation. |
| L | L3 | Remove | `так вже` is a normatively acceptable, widely used variant; the вже/уже alternation is a soft euphony preference, not an error. |
| L | L4 | Remove | Sentence is grammatical and comprehensible; the `які б … не` concessive is debated but accepted in usage. Rewording is a style preference, not a correction. |
| S | S1 | **Keep** | The pronoun unambiguously denotes the parent in a worked example addressed to parents (`ви берете їх`, `Саме ви можете навчити`), not Shri Mataji. Mid-sentence (not sentence-initial), so the sentence-start exception does not apply. Clear violation of the deity-pronoun rule. |
| S | S2 | Remove | Applied **consistently** throughout and mirrors the source's deliberate reverential capitalization (`My Words/Name/Hair/Program/Presence/Head`). `glossary/CLAUDE.md` neither lists nor forbids these; lowercasing is a style preference, not a clear error. Leave as-is for source fidelity. |
| S | S3 | Remove | Refers to the individual/own spirit; the noun `Дух` is correctly uppercase, and the deity-pronoun rule mandates uppercase pronouns only for Shri Mataji and named Incarnations. Lowercase pronoun matches EN lowercase "she/it" and is used consistently. Not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (13×) | `…` (U+2026) → three dots | `…` → `...` |
| 2 | all (62×) | `—` (U+2014) → en-dash with spaces | ` — ` → ` – ` |
| 3 | 56 | Uppercase `Я` for the parent (not Shri Mataji) | `Я почищу` → `я почищу` |

## Summary

- Language (L): 4 issues found, 2 approved by Critic
- SY Domain (S): 3 issues found, 1 approved by Critic
- Total corrections applied: 3 distinct fixes (76 textual replacements)

### Notes

- Quotation marks (all `«»`), apostrophes (all `’` U+2019), and absence of mixed Latin/Cyrillic were
  verified clean — no findings. `IBM` (§33) is an intentional brand name.
- Deity-pronoun capitalization is otherwise excellent and nuanced: Shri Mataji `Я/Мені/Мій/Моя/Вона/Сама`
  uppercase; the husband's `він` (§74) and the practitioner's `я/мої/мені` (§45, §65) correctly lowercase;
  `Ти` for Shri Mataji in others' speech (§31, §32, §35) uppercase, while `ти` for John (§92) lowercase.
- Glossary terminology is consistent and correct: `Сахаджа Йоґа`/locative `Йозі`, `сахаджа йоґ(и/ів/инь/ам/ами)`,
  `Муладхара`, `Сахасрара`, `Вішва Нірмала Дхарма`, `Пуджа`, `Дух`, `Дхарма`, `Шакті`, `Лакшмі`, `Шрі Крішна`,
  `бандхан`, `бадха`, `бхути`, `вібрації`. Language name `англійська` correctly lowercase.
