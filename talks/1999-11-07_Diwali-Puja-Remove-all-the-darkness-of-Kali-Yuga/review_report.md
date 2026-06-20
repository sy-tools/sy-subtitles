# Language Review – 1999-11-07_Diwali-Puja-Remove-all-the-darkness-of-Kali-Yuga, 2026-06-20

## Process

2 parallel reviewers (L = Language, S = SY Domain) + 1 Critic filter, run on
`transcript_uk.txt` (full paragraphed Ukrainian text), with the English original
`transcript_en.txt` for reference and `glossary/` for terminology/capitalization rules.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 39 | Negative pronoun after a preposition must be split by the particle «ні» | «де ми не прив’язані **до нічого**, що може нас принизити» | «де ми не прив’язані **ні до чого**, що може нас принизити» |
| L2 | 63, 100, 118, 119, 122 | Ellipsis uses the single character «…» (U+2026) rather than the three-dot «...» mentioned in `glossary/CLAUDE.md` | «Я не працювала, як**…**», «це спостерігає**…** це спостерігає», «**…**Мета, яка є вашою», «Їх цікавите не**…**», «використовувати щось**…** [??]» | «...» (three dots) |

**Punctuation sweep (no issues found):** quotation marks are «» at all levels
(no `"`, `""`, `„"`); apostrophe is consistently `’` (U+2019); dashes are en-dash
` – ` with spaces (no `—`); no double spaces; no spaces before `,.;!?`; no
mixed Latin/Cyrillic letters. Language names lowercase (англійська, гінді, санскрит).

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 56, 86, 89, 108, 130 | Genitive of «Сахаджа Йоґа» written with **г** («Йоги»), inconsistent with the glossary canonical «Йоґа» (ґ) and with every other inflected form in this same text (Йоґу, Йоґою, Йозі ← ґ→з) | «прийдуть до Сахаджа **Йоги**», «не прийшли до Сахаджа **Йоги**», «приходять до Сахаджа **Йоги**», «речі з Сахаджа **Йоги**» (×2) | «Сахаджа **Йоґи**» |
| S2 | 124 (Version 2) | «Sahaja Yoga» as the name of the practice must always be capitalized (glossary: «Завжди з великої літери»); here lowercase, while the very same paragraph capitalizes «Сахаджа Йоґу» / «Сахаджа Йозі» | «не прийшли до **сахадж йоґи**», «приходять до **сахадж йоґи** на короткий час» | «**Сахадж Йоґи**» (capitalized; short form kept per EN «Sahaj Yog») |

**Capitalization / terminology sweep (no issues found):**
- Shri Mataji pronouns always uppercase: Я/Мене/Мені/Мій/Моя/Своєму/Своїм (lines 10, 26, 27, 28, 29, 53, 62–66, 76, 86, 94, 102, 108, 111, 114, 115). The generic ego-speaker «я» at line 75 is correctly lowercase.
- Deity pronouns for Athena / Primordial Mother / Lakshmi uppercase: Вона/Себе/Свою/Неї/Та, Хто (lines 11–15, 25, 69, 72, 73, 82, 95–96).
- «Калі Юга» (era) pronouns correctly lowercase (line 31); «Калі» (demon in the Nala story, lines 47–49) correctly takes lowercase pronouns я/мене/ти.
- Glossary terms correct and consistent: Дівалі, Калі Юга, Сатья Юга, Набхі / Набхі чакра, Кундаліні, Махакалі, Махасарасваті, Махалакшмі, Лакшмі, Афіна, Аді Шакті, Ґанеша (ґ; declension Ґанешу/Ґанеші), сваямбху, Пурани, Маніпур двіпа, Самореалізація/Реалізація, Дух, Істина, Пуджа, бхрама/бхранті, ґуру (ґ).
- Spiritual terms capitalized per rule: Дух (50, 74), Істина/Істини (39, 41, 46, 50, 57, 71, 106), Пуджа (24, 102), Самореалізація/Реалізація. Generic «боги й богині», «християнство», «Біблія/Коран» handled correctly.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine grammar error. Ukrainian negative pronouns governed by a preposition must be split: «ні до чого», not «до нічого». Real, unambiguous. |
| L | L2 | **Remove** | `…` (U+2026) is a typographically valid Ukrainian ellipsis; the `...` in the style note illustrates *spacing* («no space before»), which is already satisfied. Changing 5 instances is churn with no correctness benefit — a style preference, not an error. |
| S | S1 | **Keep** | Real consistency/transliteration error. Canonical lemma is «Йоґа» (ґ, per glossary + «Sanskrit g → ґ» convention); the genitive «Йоги» (г) clashes with Йоґу/Йоґою/Йозі used everywhere else in the text. Normalizing to «Йоґи» makes the whole paradigm consistent. |
| S | S2 | **Keep** | Real capitalization error against a firm SY rule. The proper name of the practice is always capitalized in Ukrainian regardless of EN casing (cf. language names always lowercase). Reinforced by internal inconsistency within the same paragraph. |

No conflicts between L and S. No false positives among the kept items.

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 39 | «не прив’язані до нічого» | «не прив’язані ні до чого» |
| 2 | 56 | «до Сахаджа Йоги» (г) | «до Сахаджа Йоґи» (ґ) |
| 3 | 86 | «до Сахаджа Йоги» (г) | «до Сахаджа Йоґи» (ґ) |
| 4 | 89 | «до Сахаджа Йоги» (г) | «до Сахаджа Йоґи» (ґ) |
| 5 | 108 | «речі з Сахаджа Йоги» (г) | «речі з Сахаджа Йоґи» (ґ) |
| 6 | 130 | «речі з Сахаджа Йоги» (г) | «речі з Сахаджа Йоґи» (ґ) |
| 7 | 124 | «не прийшли до сахадж йоґи» | «не прийшли до Сахадж Йоґи» |
| 8 | 124 | «приходять до сахадж йоґи» | «приходять до Сахадж Йоґи» |

## Summary

- Language (L): 2 issues found, 1 approved by Critic
- SY Domain (S): 2 issue-types found (7 occurrences), both approved by Critic
- Total corrections applied: 8 (1 grammar + 7 terminology/capitalization across 6 paragraphs)
