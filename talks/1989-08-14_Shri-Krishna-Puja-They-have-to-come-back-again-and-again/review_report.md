# Language Review – Shri Krishna Puja: They have to come back again and again, 1989-08-14

## Process

2+1 review of `transcript_uk.txt` (78 lines; "Paragraph" below = line number in the file),
checked against `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`
and `glossary/terms_context.yaml`.

Mechanical checks run over the whole file came back clean: no Latin letters mixed into
Cyrillic, no `"„“”` quotes, no ASCII apostrophes, no `—` or hyphen used as a dash, no
missing or extra spaces around punctuation, `«»` balanced on every line, ellipsis `...`
correct. All of Shri Mataji's first-person pronouns outside quotations are uppercase.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Case government: *дотримуватися* takes the genitive, but the fronted noun is accusative | Тож **систему**, яка була найкращою, – мати моногамію, – Він її дотримувався. | Тож **системи**, яка була найкращою, … |
| L2 | 9 | Agreement: the copula agrees with the nominative subject *Рамарадж* (masc.), not with the instrumental predicate *королівством* | найідеальнішим королівством **було** Рамарадж | найідеальнішим королівством **був** Рамарадж |
| L3 | 74 | Gender agreement: *решта* is feminine; dative is *усій/всій решті* | вона потрібна **всьому** решті світу | вона потрібна **всій** решті світу |
| L4 | 74 | Parenthetical *хай там як* is only half set off; after *але* (unlike *а*), a parenthetical that can be dropped takes a comma on both sides | Але хай там як, Я зараз їду | Але**,** хай там як, Я зараз їду |
| L5 | 27 | Short colloquial 1st-person plural form | ми **морим** голодом своїх дітей, **морим** голодом свої родини | ми **моримо** … **моримо** … |
| L6 | 57 | *відчувати себе* treated as a calque of the Russian; the text uses *почуватися* elsewhere | він одразу **відчуває себе** вам зобов’язаним | він одразу **почувається** вам зобов’язаним |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 7 | *Incarnation* is lowercase here only. The glossary gives *Інкарнація*, and the other 12 occurrences in the text are uppercase | Тож у першій **інкарнації**, можна сказати так, Він намагався … | у першій **Інкарнації** |
| S2 | 20 | Shri Krishna's first-person pronoun is lowercase in His direct speech. In para 25 the same story has «Чому ти кланяєшся **Мені**?», and the corpus has «дати **Мені** квіти», «**Мені** шкода» | «Це, це всі ці хлопчики намазали **мені** на рот» | намазали **Мені** на рот |
| S3 | 22 | Same as S2 | «Дивись-но, ці люди намазали **мені** на рот. … а тепер ти ловиш саме **мене**!» | **Мені** на рот … саме **Мене**! |
| S4 | 51 | The person objecting «Як це може бути?» is arguably the questioner, not Shri Krishna, so the pronoun should be lowercase | **Він** сказав: «Як це може бути?» | **він** сказав |
| S5 | 24 | The EN transcript has "there **She** saw" (capital), but the translation has lowercase *вона* | і там **вона** побачила весь цей [всесвіт] | **Вона** |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Real case error. *Дотримуватися* governs the genitive (*дотримуватися системи*), so the accusative *систему* is ungrammatical even in a fronted, speech-like construction. The structure of the spoken sentence is kept and only the case changes. |
| L | L2 | Keep | *Рамарадж* is a declinable, consonant-final noun, so it is masculine. In the *X-ом був Y* construction the verb agrees with the nominative subject (cf. *Причиною була несправність*). |
| L | L3 | Keep | Clear agreement error: *решта* is feminine (*уся решта світу*, dative *усій решті*). |
| L | L4 | Keep | Real punctuation error. The parenthetical can be dropped (*Але Я зараз їду*), so after *але* it takes commas on both sides. The text already does this at para 41 («Але, оскільки …»). The *а* exception (para 16 «А як ви знаєте») does not apply to *але*. |
| L | L5 | Remove | *Морим* is a legitimate colloquial/poetic variant in Ukrainian grammar, not an error. Changing it is a style preference. |
| L | L6 | Remove | СУМ lists *відчувати себе* in the sense "to be in some state", so this is a purist preference, not an error. |
| S | S1 | Keep | Glossary rule (*Інкарнація* is uppercase for a Divine Incarnation) plus internal consistency: it is the only lowercase occurrence in the talk. |
| S | S2 | Keep | Capitalization is a Ukrainian orthographic convention, not content, so this is not a "repair". A singular Incarnation's pronouns are uppercase, and the same story already capitalizes His *Мені* (para 25). The corpus also capitalizes Shri Krishna's first person in direct speech. |
| S | S3 | Keep | Same justification as S2. |
| S | S4 | Remove | The referent is ambiguous. The EN transcript capitalizes "He", and choosing the questioner would put the translator's reading into the text. Keep as spoken/transcribed. |
| S | S5 | Remove | The referent is Yashoda (His mother), a human figure. The EN itself is inconsistent ("She saw … she saw, and she just bowed"). Lowercase *вона* throughout the passage is correct under the rules (capitals only for Shri Mataji and Incarnations) and is consistent. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 7 | у першій інкарнації | у першій Інкарнації |
| 2 | 9 | Тож систему, яка була найкращою, … Він її дотримувався | Тож системи, яка була найкращою, … Він її дотримувався |
| 3 | 9 | найідеальнішим королівством було Рамарадж | найідеальнішим королівством був Рамарадж |
| 4 | 20 | намазали мені на рот | намазали Мені на рот |
| 5 | 22 | намазали мені на рот … ти ловиш саме мене! | намазали Мені на рот … ти ловиш саме Мене! |
| 6 | 74 | Але хай там як, Я зараз їду | Але, хай там як, Я зараз їду |
| 7 | 74 | вона потрібна всьому решті світу | вона потрібна всій решті світу |

## Notes (checked, no change needed)

- Square-bracket additions are kept as they are: *[всесвіт]* (already in EN), *[ваші дії]*, *[батьки]*, *[разом]*, *[такого права]*, *[Вішнумайя]*, *[ваші справи]*. Each one bridges a reference shift or a missing word, as `glossary/AGENTS.md` requires.
- Roughness carried over from the spoken original (broken-off sentences, repetitions, *пундалікакш*, *де яку силу Він має?*, *Бо він той, хто, якщо він крикливий тип, …*) is left as it is.
- Plural deity pronouns mid-sentence are lowercase, as required: *вони мовчали* (Vitthala and Rukmini, para 38), *те, що вони зробили* (Christ, Mohammed, para 61).
- Terminology matches the glossary: Вішуддхі, Йоґешвара, Вішнумайя, Махамайя, Вірата, Ліла, мадхур’я, Радха, Вітхала, Рукміні, Ханумана, ракшаси, бхути, Ріші, лівосторонній, блокування (catching), Дух, Дхарма, Реалізація, Пуджа, Стопи, сахаджа йоґ(и), Сахаджа Йоґа / Йозі, «Нехай Бог благословить усіх вас».
- The language name *англійська* is lowercase.

## Summary

- Language (L): 6 issues found, 4 approved by Critic
- SY Domain (S): 5 issues found, 3 approved by Critic
- Total corrections applied: 8 text edits (7 approved corrections; correction 5 covers two pronouns in para 22)
