# Language Review – 2004-05-09_Sahasrara-Puja-Continue-To-Live-A-Life-of-Reality, 2026-07-11

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

**Second pass.** A prior review (2026-05-02) exists in git history; its Critic
verdicts are treated as precedent where the same finding recurs, to avoid
churn on discretionary style calls.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) throughout, apostrophe
`’` (U+2019), quotes «», no Latin/Cyrillic mixing, no double spaces, single
hyphen only in «врешті-решт» (correct).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 13 | Connective «хто» after a noun antecedent (norm: «який» after nouns; «хто» only after той/ті/всі) | «так багато людей, **у кого** Сахасрари відкриті» (contrast the correct para 21: «так багато **тих, у кого** Сахасрара відкрита») | «так багато людей, **у яких** Сахасрари відкриті» |
| L2 | 17 | Relative clause «яка скаже…» separated from its antecedent «Сахасрара» by the predicate — misplaced-clause syntax | «нехай ваша власна Сахасрара **буде відкрита, яка скаже вам**, що таке Істина» | «нехай **буде відкрита ваша власна Сахасрара, яка скаже вам**, що таке Істина» |
| L3 | 20 | Conjunction «й» before a word starting with «я» (euphony rule: «й» is not used before й, я, ю, є, ї) | «яка почала працювати **й яка** дасть вам» | «яка почала працювати **і яка** дасть вам» |
| L4 | 18 | Comma after fronted adverbial «У цих прекрасних обставинах» (English-style pause comma) | «У цих прекрасних обставинах**,** що могла б сказати ваша Мати?» | remove comma |
| L5 | 13 | «Із» before a single consonant at sentence start (norm prefers «з») | «**Із** відкритою Сахасрарою ваше розуміння…» | «З відкритою Сахасрарою…» |
| L6 | 24 | «у» after a vowel before a single consonant (norm prefers «в») | «Зростайте **у** Сахадж» | «Зростайте в Сахадж» |
| L7 | 20 | Calque «навчитись, як + інфінітив» | «ви повинні **навчитись, як** використовувати цю силу» | «навчитися використовувати» |
| L8 | 8 | Awkward repetition «всі… як і всі» | «Ви **всі** були загубленими, як і **всі**.» | «…як і всі інші.» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 3, 6 | Place-name form «Кабелла Лігуре» differs from the repo-majority «Кабелла-Лігуре» | «Кампус, Кабелла Лігуре (Італія)» | (consider Кабелла-Лігуре) |
| S2 | 18 | «життям реальності» lowercase vs the title's «життям Реальності» | «продовжуйте жити життям **реальності**, розуміння» | (consider Реальності) |

Checked and found correct (no findings): Shri Mataji pronouns uppercase in all
instances (Я/Мені/Мене/Моя/Моє/Моїм/Мої/Собі); «ваша Мати» and vocative
«Матінко» capitalized per glossary; «Сахасрара» (incl. plural «Сахасрари»),
«Пуджа», «Реалізація», «Істина», «Божественного», «Сахадж» capitalized per
glossary; «сахаджа йоґи» lowercase with «ґ», correct genitive «йоґів»; language
names lowercase («англійська», «українська»); closing blessing «Нехай Бог
благословить вас» matches the EN «May God bless you» (no «all» in source, so
the fixed «усіх вас» formula does not apply).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine norm violation: after the noun «людей» the connective must be «у яких». The same talk uses the correct pattern in para 21 («тих, у кого»), so the fix also restores internal consistency. Not flagged in the 2026-05-02 review — no precedent conflict. |
| L | L2 | **Keep** | Genuine syntax error, not a style preference: «буде відкрита, яка скаже» leaves the relative pronoun stranded after the predicate. Reordering keeps every word and the spoken rhythm while making the clause grammatical. |
| L | L3 | **Keep** | Codified euphony rule, not a preference: «й» is never used before words starting with «я». Clear-cut fix «й яка» → «і яка». |
| L | L4 | **Remove** | The 2026-05-02 Critic already ruled on exactly this comma: Remove (optional intonational emphasis, mirrors the EN pause; смислове виділення of a fronted adverbial is permitted). Precedent honored — reversing a discretionary call every review cycle is churn, not correction. |
| L | L5 | **Remove** | The з/із rule is worded as a tendency («переважно»), and «із» at a sentence start before a consonant is an accepted variant. Not a clear error — avoid over-correction. |
| L | L6 | **Remove** | Direct conflict with the prior review's *approved* correction #1 (2026-05-02), which deliberately set «Зростайте **у** Сахадж» to preserve the anaphoric parallelism with «зростайте у своє буття» (where «у» is mandatory before the cluster «св»). Orthography permits «у» for rhythm; the established choice stands. |
| L | L7 | **Remove** | «навчитись, як використовувати» is understandable spoken-register phrasing mirroring the source «learn how to use»; smoother wording is a style preference, not an error. |
| L | L8 | **Remove** | Faithful to the source's own repetition («You were all lost, as everybody is»); adding «інші» inserts a word absent from the original for purely stylistic gain. |
| S | S1 | **Remove** | No canonical form exists: the glossary is silent and the corpus itself is split (7× «Кабелла-Лігуре», 4× «Кабелла Лігуре», 5× with «Ліґуре»). Within this talk the form is consistent (paras 3 and 6). A per-talk change would be arbitrary — needs a corpus-wide decision, not a spot fix. |
| S | S2 | **Remove** | The translation mirrors the source capitalization exactly: the title has «Reality» (uppercase), the body sentence has «a life of reality» (lowercase). Faithful to source — not an error. Same conclusion as the 2026-05-02 review. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 13 | людей, у кого Сахасрари відкриті | людей, у яких Сахасрари відкриті |
| 2 | 17 | нехай ваша власна Сахасрара буде відкрита, яка скаже вам | нехай буде відкрита ваша власна Сахасрара, яка скаже вам |
| 3 | 20 | працювати й яка дасть | працювати і яка дасть |

## Summary

- Language (L): 8 issues found, 3 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 3

The translation is of high quality. Deity-pronoun capitalization, sacred terms,
and SY terminology are fully consistent with the glossary; punctuation
characters follow Ukrainian orthography. The three applied fixes are grammar
corrections (connective choice after a noun antecedent, a misplaced relative
clause, and the «й» → «і» euphony rule before «я-»). All discretionary style
items were filtered out, including two where the 2026-05-02 review's verdicts
served as precedent.
