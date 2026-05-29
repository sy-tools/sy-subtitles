# Language Review – 1982-07-11 From Heart to Sahasrara

## Process

2+1 agent language review of `transcript_uk.txt` against `transcript_en.txt`,
`glossary/CLAUDE.md`, `terms_lookup.yaml`, and `terms_context.yaml`.
Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic
filtered both tables and resolved the final set of corrections.

Note: the source `transcript_en.txt` contains a duplicated block (paragraphs
39–48 are repeated as 52–61). The Ukrainian faithfully mirrors this, so the
duplication is **out of scope** for a language review (it is a source/structural
artifact, not a translation error) and was left untouched. Corrections that fall
inside the duplicated block were applied to both copies.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Euphony і→й (vowel + і + vowel) | «збожеволіла **і** опинилася» | «збожеволіла **й** опинилася» |
| L2 | 20 | Suspected accusative where nominative subject is needed | «Але **людину**, яка не є сахаджа йоґом, заходить до церкви…» | «Але **людина**…» |
| L3 | 101 | Mismatched bracket pair `[ … )` | «[гінді: що ж робити. Куди йти й плакати**.)**» | «…Куди йти й плакати**.]**» |
| L4 | 44 | Active present participle (non-normative) | «такі собі **блукаючі** очі» | «**блудливі** очі» / «очі, що блукають» |
| L5 | 7 | Doubled closing guillemet `»»` flagged as typo | «…«Я дав тобі знання»**»**» | (nested «» — verify) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 12 | Spiritual term «Дхарма» lowercased | «всередині нас є **дхарма**. Ми маємо десять **дхарм**» | «є **Дхарма**. …десять **Дхарм**» |
| S2 | 30 | Spiritual term «Дхарма» lowercased | «ваша **дхарма**, ваші десять заповідей» | «ваша **Дхарма**…» |
| S3 | 16 | «Інкарнація» lowercased (Divine Incarnation) | «Він був **інкарнацією** Первинної Істоти» | «Він був **Інкарнацією**…» |
| S4 | 18 | «Інкарнація» lowercased (Divine Incarnation) | «Він був **інкарнацією**, і Він зайшов» | «Він був **Інкарнацією**…» |
| S5 | 26 | Language name capitalized in annotation | «[**Гінді**: Мати каже комусь…]» | «[**гінді**: …]» (lowercase, matches paras 28/98/101) |
| S6 | 41 / 54 | «Реалізація» inconsistently lowercased | «отримав свою **реалізацію**» | «отримав свою **Реалізацію**» |
| S7 | 77 | «Реалізація» inconsistently lowercased | «після того як він отримав **реалізацію**» | «…отримав **Реалізацію**» |
| S8 | 99 | Transliteration: Sanskrit g → ґ | «це **йога** бхумі» | «це **йоґа** бхумі» (cf. «Сахаджа Йоґа») |
| S9 | 86 | «Брахмарандхра» lowercased | «область…, яка зветься **брахмарандхра**» | «**Брахмарандхра**»? |
| S10 | 18/67/87 | «реалізована душа» lowercased | «**реалізована** душа», «**реалізовані** душі» | «**Реалізована Душа**»? |
| S11 | 87 | «Колективна Істота» capitalized vs lowercase elsewhere | «Крішна – це **Колективна Істота**» vs «колективної істоти» (70–71) | unify? |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine euphony rule (і→й between vowels); translator applies «й» elsewhere ("Куди йти й плакати"). |
| L | L2 | **Remove** | False positive. The text already reads «людина» (nominative) — original is correct. |
| L | L3 | **Keep** | Real punctuation error: opening `[` must close with `]`, not `)`. Source mismatch should not be mirrored. |
| L | L4 | **Remove** | Style preference. Active participle is colloquial but understood; replacing it shifts nuance ("блудливі" = lecherous). Not a clear error. |
| L | L5 | **Remove** | False positive. `»»` is correct per the nested-quote rule («…«…»»). |
| S | S1 | **Keep** | `glossary/CLAUDE.md`: «Дхарма» is an always-uppercase spiritual term; explicitly listed in review scope. |
| S | S2 | **Keep** | Same rule as S1; consistency with S1. |
| S | S3 | **Keep** | «Інкарнація» listed as always-uppercase spiritual term; refers to Guru Nanak as Divine Incarnation. |
| S | S4 | **Keep** | Same rule as S3; refers to Buddha as Divine Incarnation. |
| S | S5 | **Keep** | Language names are lowercase in Ukrainian; all other Hindi annotations use lowercase «гінді» (incl. bracket-initial in para 98). |
| S | S6 | **Keep** | Consistency: «Реалізація» is capitalized in 8 places; harmonize the spiritual event to the dominant/primary glossary form. |
| S | S7 | **Keep** | Same consistency rationale as S6. |
| S | S8 | **Keep** | Transliteration convention (Sanskrit g → ґ); «Йоґа» is spelled with ґ everywhere else in this talk. |
| S | S9 | **Remove** | Used descriptively ("…which is called…"); matches source lowercase. Glossary headword capitalization does not force running-text capitals here. |
| S | S10 | **Remove** | Glossary explicitly permits lowercase «реалізована душа»; usage is internally consistent. |
| S | S11 | **Remove** | Intentional: «Колективна Істота» is an epithet of Krishna (capital in source) vs. the generic «колективна істота» a person becomes. Consistent with EN. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | «і» between two vowels | «збожеволіла **й** опинилася» |
| 2 | 12 | «Дхарма» lowercased (×2) | «є **Дхарма**. …десять **Дхарм**» |
| 3 | 30 | «Дхарма» lowercased | «ваша **Дхарма**» |
| 4 | 16 | «Інкарнація» lowercased | «Він був **Інкарнацією** Первинної Істоти» |
| 5 | 18 | «Інкарнація» lowercased | «Він був **Інкарнацією**, і Він зайшов» |
| 6 | 26 | Language name capitalized | «[**гінді**: Мати каже…]» |
| 7 | 41 & 54 | «Реалізація» lowercased | «отримав свою **Реалізацію**» (both copies) |
| 8 | 77 | «Реалізація» lowercased | «отримав **Реалізацію**» |
| 9 | 99 | g→ґ transliteration | «це **йоґа** бхумі» |
| 10 | 101 | Mismatched bracket | «Куди йти й плакати**.]**» |

## Summary

- Language (L): 5 issues raised, 2 approved by Critic (paras 9, 101)
- SY Domain (S): 11 issues raised, 8 approved by Critic
- Total corrections applied: 10 (covering 11 text locations, incl. the duplicated block at paras 41/54)
