# Language Review – 1998-12-25_Christmas-Puja-Become-Thoughtlessly-Aware, 2026-05-30

## Process

Review `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter.

- **Reviewer L** – Language (Orthography + Grammar + Punctuation)
- **Reviewer S** – SY Domain (Capitalization + Terminology + Consistency)
- **Critic** – Filters false positives and trivial findings, resolves overlaps, has final say.

Paragraph numbers below refer to source line numbers in `transcript_uk.txt`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7,13,19,20,26,27,31,37,42,52,54,57,58 | Mixed Cyrillic г/ґ: practice name written «Сахаджа Йог…» (г), while the practitioners «сахаджа йоґи» and locative «Йозі» use ґ — inconsistent within one text | «взірець Сахаджа **Йог**и», «через Сахаджа **Йог**у», «Сахаджа **Йог**ою», «Сахаджа **Йог**а» | «Сахаджа **Йоґ**и / Йоґу / Йоґою / Йоґа» (ґ in all 13) |
| L2 | 43,53,57,58 | Single-character ellipsis «…» (U+2026) instead of project-standard three dots | «після прочитання**…**», «безтурботними**…**», «до Сахаджа Йоґи**…**», «а їх досі багато**…**» | «...» (three dots) |
| L3 | 27 | Relative pronoun wrong case: animate masc. object of «маємо» requires accusative (=genitive form) | «інший дуже поганий ворог, **який** ми маємо» | «ворог, **якого** ми маємо» |
| L4 | 51 | Numeral + noun form: after 2–4 the noun takes nominative plural, not gen. sing. | «називали три-чотири **імені** державних службовців» | «три-чотири **імена**» |
| L5 | 45 | Extraneous comma after the connective «ось чому» | «і ось чому**,** багато разів виникає плутанина» | «і ось чому багато разів виникає плутанина» |
| L6 | 8 | Parenthetical «певна» («[я] певна» = I'm sure) reads clipped | «яка, певна, не дуже зрозуміла західним людям» | (consider «яка, певно,») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 7,13,19,20,26,27,31,37,42,52,54,57,58 | Glossary transliteration: «Sahaja Yoga → Сахаджа **Йоґа**» (Sanskrit g → ґ). Text spells the title with г throughout | «Сахаджа **Йог**а / Йоги / Йогу / Йогою» | «Сахаджа **Йоґ**а / Йоґи / Йоґу / Йоґою» |
| S2 | 58 | Terminology consistency: same word capitalised two ways in one paragraph | «вашій **ч**айтаньї» … «вашій **Ч**айтаньї» | unify → «**Ч**айтаньї» (sacred divine power, cf. glossary «Парамчайтанья») |
| S3 | 52 | Possible over-capitalised pronoun for a non-deity (IAS officer) | «**Й**ого ціна зростає на шлюбному ринку» | (investigate – regular person) |
| S4 | 21 | «груповщина» – possible calque for «groupism» | «одна з них — це груповщина» | (consider native synonym) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L1 / S1 | Sahaja Yoga г→ґ | **Keep** (merge) | Same issue from both reviewers. Glossary is explicit: «Сахаджа Йоґа», transliteration rule «Sanskrit g → ґ». Internal proof: locative «Йозі» (ґ→з) and lowercase «йоґи» already use ґ. Genuine, systematic. 13 instances. |
| L2 | Ellipsis «…»→«...» | **Keep** | `glossary/CLAUDE.md` documents ellipsis as `...` (three dots). Project uses Unicode quotes/apostrophe but ASCII ellipsis by spec; subtitle convention favours `...`. 4 instances. |
| L3 | який→якого | **Keep** | Real grammar error: accusative required for the animate direct object. |
| L4 | імені→імена | **Keep** | Real grammar error: «ім'я» after 2–4 → nom. pl. «імена». |
| L5 | comma after «ось чому» | **Keep** | Genuine (minor) punctuation error; «ось чому» + clause needs no comma. |
| L6 | «певна» phrasing | **Remove** | Trivial style preference; «[я] певна» works as a parenthetical and matches the spoken register. Not an error. |
| S2 | chaitanya case | **Keep** | Real intra-text inconsistency; unify. Capitalised (divine power) per glossary's treatment of Chaitanya-derived terms. |
| S3 | «Його ціна» | **Remove** | **False positive.** Sentence-initial after «…то все.» — capital is correct sentence start, not a deity-pronoun error. |
| S4 | «груповщина» | **Remove** | Understood, negatively-connoted equivalent of «groupism»; replacing it is a style choice, not a correction. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 7,13,19,20,26,27,31,37,42,52,54,57,58 | «Сахаджа Йог…» (г) | «Сахаджа Йоґ…» (ґ) — 13 instances |
| 2 | 43,53,57,58 | «…» (U+2026) | «...» (three dots) — 4 instances |
| 3 | 27 | «ворог, який ми маємо» | «ворог, якого ми маємо» |
| 4 | 51 | «три-чотири імені» | «три-чотири імена» |
| 5 | 45 | «і ось чому, багато разів» | «і ось чому багато разів» |
| 6 | 58 | «вашій чайтаньї» | «вашій Чайтаньї» |

## Summary

- Language (L): 6 issues found, 5 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic (S1 merged with L1)
- **Total corrections applied: 6 distinct fixes / 21 textual substitutions**

### Notes
- Deity-pronoun capitalization is consistent and correct throughout: Shri Mataji (Я/Мене/Моя/Своєю), Christ singular (Він/Його/Йому/Себе), and Incarnations plural mid-sentence correctly lowercased (вони/їхні/свої — paras 18, 47, 53).
- Quotation marks are «» at all levels with no stray German/straight quotes; em-dash ` – `, apostrophe ’ used correctly.
- Spiritual terms correctly capitalised: Дхарма, Інкарнація, Пуджа, Дух, Реалізація, Кундаліні, Останній Суд. Language names correctly lowercase (англійська, гінді, маратхі, санскрит, панджабі, тамільська, єврейська).
