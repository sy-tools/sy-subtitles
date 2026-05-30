# Language Review – 1993-07-04_Guru-Puja-Gurus-who-belong-to-the-collective, 4 July 1993

## Process

2+1 agent language review (Reviewer L + Reviewer S + Critic) on `transcript_uk.txt`,
with the English original (`transcript_en.txt`) as reference and `glossary/` as the
canonical terminology/orthography source.

Mechanical character checks were run across the whole file:
- Quotation marks: all `«»`, no straight/German quotes ✓
- Apostrophes: all `’` (U+2019), no straight `'` ✓
- Dashes: all en-dash `–` (U+2013) with spaces, no em-dash `—`, no hyphen-as-dash ✓
- No Latin/Cyrillic mixing in body text ✓
- No double spaces, no space before punctuation ✓
- Ellipsis: **inconsistent** — 3× single-char `…` (lines 10, 34) vs `...` (line 60) ✗

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | Single-char ellipsis `…` instead of three-dot `...` (glossary rule) | `…про навчання…` | `...про навчання...` → `навчання...` |
| L2 | 34 | Single-char ellipsis `…` (×2) instead of `...` | `«Але…» «Але…»` | `«Але...» «Але...»` |
| L3 | 49 | Ungrammatical `є` + infinitive construction | `Бо чому є заздрити?` | `Бо чому заздрити?` |
| L4 | 49 | Euphony: `і інший` (vowel clash) | `ви – діамант, і інший – діамант` | (`й інший`) — considered |
| L5 | 9 | `навчають музики` verb government | `ґуру, які навчають музики` | (no change — genitive valid) |
| L6 | 20 | `сідати на медитацію` colloquial | `сідати на медитацію` | (no change — acceptable) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 21 | `Бхавасаґара` lowercased; glossary capitalizes it | `для бхавасаґари` | `для Бхавасаґари` |
| S2 | 21 | Divine `Інкарнація` lowercased | `Аді Ґуру та їхні інкарнації` | `їхні Інкарнації` |
| S3 | 25 | Directional adjective capitalized | `Ліва Вішуддхі` | `ліва Вішуддхі` |
| S4 | 43 | `Пуджа` (ceremony) lowercased — inconsistent with l.2/6/7 | `роблять Мою пуджу` | `роблять Мою Пуджу` |
| S5 | 47 | `істини` — possible absolute Truth | `ви не бачите істини` | (`Істини`) — considered |
| S6 | 68 | `реалізовані душі` lowercase vs `Реалізовані Душі` elsewhere | `ви – реалізовані душі` | (`Реалізовані Душі`) — considered |
| S7 | 35 / 65 | `Та, Хто` (l.35) vs `та, хто` (l.65) — pronoun-capital inconsistency | `Та, Хто має всі сили` / `Я та, хто поглинає` | (consistency) — considered |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Glossary mandates `...` (three dots); file is self-inconsistent (l.60 uses `...`). |
| L | L2 | **Keep** | Same rule; standardize both `…` to `...`. |
| L | L3 | **Keep** | `чому є заздрити` is not valid Ukrainian; `є`+infinitive is broken. Minimal fix removes `є` → grammatical and keeps the rhetorical sense ("what is there to be jealous?"). |
| L | L4 | **Remove** | `і` after consonant (`діамант`) before vowel is permitted; `і інший` is not an error, only mild euphonic preference. |
| L | L5 | **Remove** | False positive — `навчати` + genitive (`навчати музики`) is correct. |
| L | L6 | **Remove** | Colloquial but acceptable; not an error. |
| S | S1 | **Keep** | Glossary UK column is `Бхавасаґара` (capital) — a named cosmological concept; align text to glossary. |
| S | S2 | **Keep** | "their incarnations" = the Divine Incarnations of the Adi Guru principle (Janaka, Moses, Socrates…); rule: `Інкарнація` uppercase. |
| S | S3 | **Keep** | `ліва/права` are descriptive directions, lowercase (cf. glossary `лівосторонній`, `права сторона`); only the chakra name `Вішуддхі` stays capital. |
| S | S4 | **Keep** | Rule + glossary capitalize `Пуджа`; text capitalizes it everywhere else (`Пуджа Ґуру`, `Пуджу Ґуру`). l.43 is the lone outlier. |
| S | S5 | **Remove** | "you don't see the truth [of the situation]" reads as ordinary truth/reality, not the absolute `Істина` concept; lowercase defensible. Avoid over-capitalization. |
| S | S6 | **Remove** | English source is lowercase here ("realised souls"); glossary explicitly permits `реалізована душа`. Translation faithfully tracks the source; consistency-only, not an error. |
| S | S7 | **Remove** | Contextually different: l.35 `Та, Хто` is a titular epithet of Аді Шакті (reverential), l.65 `та, хто` is a plain predicate relative clause. Both acceptable. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | Ellipsis `…` → `...` | `навчання...` |
| 2 | 34 | Ellipsis `…` ×2 → `...` | `«Але...» «Але...»` |
| 3 | 49 | Broken `є`+infinitive | `Бо чому заздрити?` |
| 4 | 21 | `Бхавасаґара` capitalization | `для Бхавасаґари` |
| 5 | 21 | Divine `Інкарнація` capitalization | `їхні Інкарнації` |
| 6 | 25 | Directional adjective lowercase | `ліва Вішуддхі` |
| 7 | 43 | `Пуджа` capitalization | `роблять Мою Пуджу` |

## Summary

- Language (L): 6 issues raised, 3 approved by Critic
- SY Domain (S): 7 issues raised, 4 approved by Critic
- Total corrections applied: 7

### Notes
- Deity-pronoun capitalization was verified throughout and is **correct**, including the
  tricky Buddha passage (l.18): `ображав Його` (Buddha, uppercase) vs the abuser's
  `він/йому` (lowercase), with sentence-initial capitals handled properly.
- Shri Mataji pronouns (`Я/Мені/Мого/Моя/Себе/Своїй`) consistently uppercase.
- Plural incarnations mid-sentence (l.60 `вони/них` for Gyaneshwara/Blake/Sai Nath)
  correctly lowercase.
- Spiritual-term capitalization (`Дхарма`, `Реалізація/Самореалізація`, `Реалізовані Душі`,
  `Дух`-adjacent `Божественна любов`, `Океан Любові`) and language names (`англійська`)
  are consistent with glossary rules.
</content>
</invoke>
