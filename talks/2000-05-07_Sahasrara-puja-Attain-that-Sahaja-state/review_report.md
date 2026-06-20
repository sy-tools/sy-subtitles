# Language Review – 2000-05-07_Sahasrara-puja-Attain-that-Sahaja-state, 2026-06-20

## Process

2 parallel reviewers (L – Language, S – SY Domain) + 1 Critic filter, run on the
full paragraphed `transcript_uk.txt` against `transcript_en.txt`, the glossary
(`terms_lookup.yaml`, `terms_context.yaml`) and `glossary/CLAUDE.md`, per
`templates/language_review_template.md`.

This is a follow-up pass; an earlier review (2026-05-30) already applied
character-level fixes (em→en dashes, `Сахаджа Йоґа` transliteration, a ¶8 quote
restructure). Those are re-verified below and confirmed in place.

**Programmatic character audit (current file):**
em-dash `—` (U+2014): **0** · en-dash `–` (U+2013): **41** · `«` 69 / `»` 69
(balanced, no `„"`/`“”`/`""`) · apostrophes `’` (U+2019): 22, no straight `'` ·
ellipsis `...`: 1 (no space before, no `…` char) · double spaces: 0 · space
before `,`/`.`: 0 · Latin/Cyrillic-mixed tokens: none.

The translation is of very high quality: Shri Mataji's deity pronouns are
consistently uppercase (Я/Мені/Мій/Моя/Мене and others' «Вона»/«Ти»/«Мамо»),
SY terminology matches the glossary, and orthography/punctuation is clean. The
findings below are mostly borderline; one is a hard grammatical error.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 44 | Wrong genitive form. «хіть» is a 3rd-declension feminine noun with і→о alternation in open syllables (gen. «хоті»; instr. keeps і: «хіттю») — cf. ніч→ночі→ніччю, сіль→солі→сіллю. | «без жодної **хіті** чи жадібності» | «без жодної **хоті** чи жадібності» |
| L2 | 31 | Attributive active present participle in -юч- (calque, dispreferred in standard Ukrainian). | «Він наче **переважаюча** своєю любов'ю людина» | «…людина, що **переважає** своєю любов'ю» |
| L3 | 11 | Question mark closing an indirect clause («про те, як…»). | «…про те, як вони можуть отримати Самореалізацію**?**» | «…Самореалізацію**.**» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 18 | Over-capitalization of the second word; the orthographic norm capitalizes only the first word of the event name. | «Це **Страшний Суд**.» | «Це **Страшний суд**.» |
| S2 | 13 | Puja-capitalization consistency vs. named pujas (Сахасрара Пуджа, Пуджу Дурґи). | «**пуджа** мурті (статуї)» | «**Пуджа** мурті (статуї)» |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine grammatical error. «хіть» → gen. «хоті» is dictionary-normative (і↔о alternation, mirrored by instr. «хіттю» retaining і). Apply. |
| L | L2 | Remove | The -юч- participle is dispreferred stylistically but grammatically valid and clear; rephrasing alters the "over-powering" sense and the spoken register. Style preference, not an error. |
| L | L3 | Remove | Faithfully mirrors the source's own free-indirect rhetorical question ("…as to: how they can get Self-realisation?"). Defensible in a spoken transcript. |
| S | S1 | Remove | «Страшний Суд» mirrors the source («Last Judgment») and is an accepted religious-capitalization variant; it is also consistent with the translation's reverential capitalization of sacred concepts (Океан Вічності, Царство Боже, Абсолютне Знання). Lowercasing only «Суд» would be internally inconsistent. |
| S | S2 | Remove | Here "puja" is a generic common noun used dismissively ("It's not some sort of statue puja"), matching the source's lowercase. The glossary's uppercase rule targets named ceremonies, which are already correctly capitalized in the text. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 44 | «без жодної хіті чи жадібності» (wrong genitive of «хіть») | «без жодної хоті чи жадібності» |

## Summary

- Language (L): 3 issues found, 1 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: **1**

### Notes (verified correct — no change)

- Character audit clean (see above): dashes en-dash `–`, quotes `«»`, apostrophes `’`.
- Deity-pronoun capitalization for Shri Mataji is consistent throughout, including
  others addressing Her: ¶12 «хто **Вона**!», ¶13 «**Мати**, дозволь…», ¶46 «**Мамо**, як **Ти** могла…».
- Spiritual terms correctly capitalized: Дух/Духа/Духом/Дусі, Істина/Істину/Істини,
  Самореалізація/Реалізація, Інкарнації, Пуджа (named ceremonies), Абсолютне Знання, Реальність.
- Glossary terms match: Сахасрара, Кундаліні, Сахаджа Йоґа (`ґ`)/Йозі (ґ→з locative),
  сахаджа йоґи/йоґів/йоґам (lowercase practitioner, `ґ`), Дурґа, Аді Шакті, Калі Юга,
  Тур'я, Кабір, прохолодний вітерець, его, ґуру.
- Language names lowercase (англійська, санскритом); sentence-initial «Санскритом» (¶28) correct.
- Kabir's first-person quote (¶49) kept lowercase — saint-poet, not in the deity/Incarnation list.
- Closing blessing matches the fixed phrase: «Нехай Бог благословить усіх вас.»
