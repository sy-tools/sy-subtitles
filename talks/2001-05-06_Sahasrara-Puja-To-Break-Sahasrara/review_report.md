# Language Review – 2001-05-06_Sahasrara-Puja-To-Break-Sahasrara, 6 May 2001

## Process

2+1 agent review (Reviewer L = Language + Reviewer S = SY Domain + Critic) of
`transcript_uk.txt` against `transcript_en.txt`, `glossary/CLAUDE.md`,
`glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.

**Prior passes** (verified still present in the current text, not re-listed below):
ellipsis normalization (`…` → `...`) in ¶¶32, 35, 38, 39, 63, 86; comma removal
after «Тож» in ¶82; three number-agreement fixes («Уся тисяча … просвітлюється»
¶38, «єдиними» ¶50, «ця тисяча рук … просить» ¶78).

Character-level checks for this pass came back clean:
- All apostrophes are `’` (U+2019); no ASCII `'`.
- All quotation marks are `«»` at every level; no straight/German quotes.
- No Latin characters mixed into the Cyrillic text.
- No double spaces, no spaces before punctuation; ellipses are `...` (no space before).
- Dash is consistently `–` (U+2013) with surrounding spaces; hyphens correct
  (дуже-дуже, великі-великі, Лао-Цзи, Кабелла-Лігуре — the corpus-dominant spelling).
- All Shri Mataji pronouns capitalized (Я/Мене/Мені/Мій/Моя/Моїм/Моє, Ти/Тобі in
  address); lowercase first-person forms belong to non-Divine speakers
  (¶14–15 Nala/Kali, ¶29 the maidservant, ¶83 a hypothetical yogi).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 94 | Non-normative «якщо» + conditional «б» (calque of «если бы»); clashes with future main clause «це спрацює» | «І **якщо ви могли б** знайти когось, хто п’є, **якщо ви могли б** допомогти тій людині…» | «І **якщо ви зможете** знайти когось, хто п’є, **якщо ви зможете** допомогти тій людині…» |
| L2 | 66 | Lexical contamination: «оспівувати» (already = "praise in song") takes the praised object itself; the idiom with «хвалу» is «співати хвалу» | «було багато святих, які **оспівували хвалу** Реалізації» | «було багато святих, які **співали хвалу** Реалізації» |
| L3 | 59 | «означати» governs the accusative; bare nominative «дх’яна» without citation quotes is ungrammatical | «Дзен означає **дх’яна**.» | «Дзен означає **дх’яну**.» |
| L4 | 32 | Misleading pronoun reference: «її» precedes its intended antecedent (Пуджа, next sentence), while the nearest feminine referent is the maidservant («не слухайте **її**», ¶30) — «провести її» misreads as "escort her". EN: "to do that" | «вони залучили сімох брахманів, щоб **провести її**» | «вони залучили сімох брахманів, щоб **зробити це**» |
| L5 | 47 | (Considered) number mismatch «енергії … Вивільняючи **її**» | «можете задіяти свої власні енергії. Як? Вивільняючи її…» | No change — see Critic |
| L6 | 14 | (Considered) omitted subject before second (verbal) predicate | «бо ти дуже підступна людина і завдав мені такої шкоди» | No change — see Critic |
| L7 | 77 | (Considered) plural verb with «скільки з вас» | «скільки з вас справді роблять цю роботу» | No change — see Critic |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 49 | (Considered) indeclinable «Атма Сакшаткар» — term absent from glossary | «Без **Атма Сакшаткар** ваше життя марне» | No change — see Critic |
| S2 | 15 | (Considered) transliteration of "sanyasis" | «вони не будуть **саньясі**, що блукають довкола» | No change — see Critic |
| S3 | 54, 64 | (Considered, re-check of prior pass) capitalized «Він / Своїй» for the saint Г’янешвара | «написав про це у **Своїй** книзі»; «**Він** говорив про це» | No change — see Critic |

No terminology errors found. All glossary terms render correctly and consistently:
Кундаліні, Сахасрара (прорвати/прорив — matches the talk title), Реалізація /
Самореалізація, реалізована душа (lowercase), Пуджа, Аді Шакті, Аді Шанкарачар’я,
стотри, Шастри, бхаджан, Калі Юга, Нала Пурана, Махатм’я, прохолодний вітерець,
стан без думок / стан усвідомлення без думок, Всепронизуюча Сила, Дзен, Дао,
Лао-Цзи, Г’янешвара, День Сахасрари, Сахаджа Йоґа / сахаджа йоґами (lowercase),
віддатися на милість Божественному. Genitive «до Сахаджа Йоґи» and «центр/енергія
Ґанеші» correct per `terms_context.yaml`. Religion-followers, castes and
nationalities correctly lowercased (індуси, християни, мусульмани, суфії,
брахмани, цигани, турки, англійцями, німцями, італійцями); language names
lowercase (англійська, українська). Deity titles capitalized (Богиня, Мати,
Матінко, Божественна Любов, Всемогутній Бог, Істина); Kundalini pronouns
capitalized (Вона); ordinary-referent pronouns lowercase (quantum energy «вона»,
the maidservant «вона/її»). Hindi interjection «ки (що)» in ¶92 deliberately
preserved, mirroring EN "ki (that)".

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | «Якщо» with the conditional particle «б» is non-normative Ukrainian (requires «якби» + conditional throughout, or «якщо» + indicative). Since the main clause is future indicative («це спрацює») and ¶96 already renders the same EN pattern as «Якщо ви **зможете** знайти…, це зміниться», the indicative fix is minimal, normative, and internally consistent. |
| L | L2 | **Keep** | СУМ: «оспівувати» = прославляти в піснях — its object is the thing praised («оспівувати Реалізацію»); «хвалу» belongs to the idiom «співати хвалу». The blend «оспівували хвалу» is a genuine contamination; «співали хвалу Реалізації» exactly matches EN "sang the praise of Realisation". |
| L | L3 | **Keep** | Direct object of «означає» must be accusative: «дх’яну». Corpus already declines the word («робити дх’яну», «сядуть на дх’яну» — 1979-12-30), confirming it is not treated as an indeclinable citation form. |
| L | L4 | **Keep** | Genuine reference error, not just style: the antecedent («Пуджа») appears only in the following sentence, while the preceding context supplies a competing human referent with the identical pronoun («не слухайте її»). «Щоб зробити це» restores EN "to do that" and removes the "escort her" misreading. |
| L | L5 | **Remove** | The EN source itself shifts number ("your own energies. How? By releasing **it**…"); the transcript convention preserves the speaker's anacoluthon, and the singular reads naturally as generic "energy". Not an error. |
| L | L6 | **Remove** | Heterogeneous predicates sharing one subject («ти — людина і завдав») are acceptable in the spoken register and mirror EN "you are a very mischievous man, and you have done such a harm". No change. |
| L | L7 | **Remove** | With the quantifier «скільки з вас» referring to persons, semantic (plural) agreement is admissible alongside formal singular; both occur in edited prose. Style preference, not an error. |
| S | S1 | **Remove** | «Атма Сакшаткар» is a quoted Sanskrit scripture term kept invariant exactly as in EN; transliteration follows the conventions (no g/dh issues). «Атма» matches glossary `Atma → Атма`. Correct as is. |
| S | S2 | **Remove** | «саньясі» is the corpus-dominant spelling (9× across talks) and follows the short-i → і convention. Correct. |
| S | S3 | **Remove** | Re-confirmed prior-pass verdict: the EN source capitalizes the saint's pronoun ("in His book", ¶54 & ¶64) and the reverent capitalization is applied consistently, while plural saints in ¶66 are correctly lowercase («вони»). Correct. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 32 | «щоб провести її» (pronoun before antecedent; misreads as the maidservant) | «щоб зробити це» |
| 2 | 59 | «Дзен означає дх’яна» (nominative after «означає») | «Дзен означає дх’яну» |
| 3 | 66 | «оспівували хвалу Реалізації» (collocation contamination) | «співали хвалу Реалізації» |
| 4 | 94 | «якщо ви могли б знайти … якщо ви могли б допомогти» (non-normative «якщо + б») | «якщо ви зможете знайти … якщо ви зможете допомогти» |

## Summary

- Language (L): 7 issues found, 4 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied this pass: 4
- (Prior passes, already in text: ellipsis normalization in 6 paragraphs,
  1 comma removal, 3 number-agreement fixes)
