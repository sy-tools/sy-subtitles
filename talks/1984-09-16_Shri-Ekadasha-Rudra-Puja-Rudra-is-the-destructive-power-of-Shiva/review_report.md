# Language Review – 1984-09-16_Shri-Ekadasha-Rudra-Puja-Rudra-is-the-destructive-power-of-Shiva, 2026-11-06

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter,
per `templates/language_review_template.md`. Paragraph numbers below are line numbers in `transcript_uk.txt`.

Mechanical pre-checks (all clean): no Latin letters inside Cyrillic words, no `„“”"` or `'` quotes/apostrophes,
no em-dash `—` or hyphen-as-dash, no space before punctuation or double spaces, no `…` or ` ...` ellipsis
variants, every ` – ` has spaces on both sides; `python -m tools.text_normalize --check` reports 0 violations.

### Review Agents

**Reviewer L – Language (Orthography + Grammar + Punctuation)**
**Reviewer S – SY Domain (Capitalization + Terminology + Consistency)**
**Critic – Filter + Validate**

### Flow

1. Reviewers L and S ran on `transcript_uk.txt`
2. Both produced corrections tables
3. Critic reviewed both tables together, kept only real issues
4. Filtered corrections applied to `transcript_uk.txt`

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 28 | Comma before a single `і` joining homogeneous members | `…в кожен атом, у кожну молекулу, і в кожну людину, у все живе й неживе…` | `…у кожну молекулу і в кожну людину…` |
| L2 | 30 | Comma before a single `або` joining homogeneous predicates (same subject «вони») | `…намагаються знищити себе, або плачуть і ридають, і роблять усілякі речі.` | `…намагаються знищити себе або плачуть і ридають…` |
| L3 | 37 | Editorial remark punctuated inconsistently with paragraph 39 (`(Сміх.)` vs `(Сміх)`) | `…він не заморожує – охолоджує. (Сміх.)` | `(Сміх)` |
| L4 | 24 | `, –` before the opening dash of a parenthetical insertion; norm puts the comma only before the closing dash | `…в порядку, – скажімо, зараз Я говорю, – зараз ви…` | `…в порядку – скажімо, зараз Я говорю, – зараз ви…` |
| L5 | 10 | `Псалмі` / `Псалом` capitalized; орфографічна норма capitalizes book titles (Псалтир), not the genre word | `…описані в 23-му Псалмі… Це 23-й Псалом…` | `…у 23-му псалмі… Це 23-й псалом…` |
| L6 | 10 | Euphony: after a consonant-final word `у-` form preferred | `Він вгамовує ваш гнів…` | `Він угамовує…` |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 37 | `(Сміх.)` is not in `glossary/subtitle_omit.yaml` form (`(сміх)`, exact case-insensitive match); the remark would NOT be stripped by `load_transcript` and would reach the screen as a subtitle. Corpus uses only `(Сміх)` / `(сміх)`; this was the single `(Сміх.)` in all talks | `…охолоджує. (Сміх.)` | `(Сміх)` |
| S2 | all | Deity pronouns: Shiva/Rudra, Christ, Kalki, the Father, the Primordial Mother and Shri Mataji — all uppercase (Він/Його/Ньому/Свій/Вона/Її/Своє/Я/Мені/Мною/Мій); regular people and non-deity antecedents (погляд → «він», центр → «він») lowercase. No violations | — | none |
| S3 | all | Glossary terms verified: Екадаша Рудра, Войд, Аґія чакра, Муладхара, Калькі, Махавішну, Омкара, Бхаїрава, Хануман, Картікейя, Ґанеші (gen.), Садашіва, Аді Шакті, Хіраньяґарбха, Брахмадева, Вірата, футсокінг, одержимі, обумовлені, віддався на милість, вібраційне усвідомлення, стан усвідомлення без думок, прохолодний вітерець, сахаджа йоґ/йоґи/йоґів/йоґам, в Сахаджа Йозі; spiritual terms Пуджа, Дух, Реалізація, Самореалізація, Істина, Інкарнація/Інкарнацій, Стопи uppercase; language names lowercase. No violations | — | none |
| S4 | 47 | Closing blessing: EN has «May God Bless you» (no «all»), so «Нехай Бог благословить вас.» is correct; the fixed phrase «усіх вас» applies only to «bless you all» | `Нехай Бог благословить вас.` | none |
| S5 | 20, 35 | «еволюціоновані душі», «Махеші» (gen. of Махеша) — consistent with existing corpus usage (5 and 3 talks respectively) | — | none |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine punctuation error: no comma before a single `і` between homogeneous members. |
| L | L2 | Keep | Genuine punctuation error: no comma before a single `або` between homogeneous predicates with one subject. |
| L | L3 | Keep (merged with S1) | Same fix as S1; one edit. |
| L | L4 | Remove | `, –` at the opening of a parenthetical where the preceding subordinate clause ends is an accepted variant in practice; style preference, not an error. |
| L | L5 | Remove | In religious texts «Псалом 23» as the title of a specific psalm is commonly capitalized; both forms are defensible. Style preference. |
| L | L6 | Remove | у/в alternation is a euphony recommendation, not a spelling rule; «вгамовує» is the dictionary headword. Trivial. |
| S | S1 | Keep | Consequential: exact-match omit list means `(Сміх.)` would be rendered as a subtitle block. Verified with `strip_omitted_phrases`: before fix the remark survived, after fix it is stripped. Also the only `(Сміх.)` in the corpus. |
| S | S2–S5 | n/a | Verification notes, no change requested. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 28 | `у кожну молекулу, і в кожну людину` | `у кожну молекулу і в кожну людину` |
| 2 | 30 | `намагаються знищити себе, або плачуть і ридають` | `намагаються знищити себе або плачуть і ридають` |
| 3 | 37 | `(Сміх.)` | `(Сміх)` |

All three were applied to `transcript_uk.txt` before this report was written; `python -m tools.text_normalize --check` passes on the corrected file.

## Summary

- Language (L): 6 issues found, 3 approved by Critic (one merged with S1)
- SY Domain (S): 1 issue found, 1 approved by Critic (same edit as L3)
- Total corrections applied: 3
