# Language Review – 1986-07-13 Shri Kartikeya Puja: Woman Is A Woman, 2026-06-29

## Process

2+1 agent review of `transcript_uk.txt` (full paragraphed Ukrainian text):
Reviewer L (Language) + Reviewer S (SY Domain) run in parallel, then a Critic
filters both tables and only genuine, well-justified errors are applied.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 16 | Non-normative active participle `прощаюча` | «терпляча, любляча, прощаюча» (forbearing, loving, forgiving) | `усепрощальна` / rephrase |
| L2 | 24 | Extra comma before `за те` | «винуватити й західних чоловіків, за те, як вони…» | remove comma → «…чоловіків за те, як…» |
| L3 | 14 | Slightly awkward government `повірити ціні` | «ціні будинку ніхто не може повірити» | «у ціну будинку ніхто не може повірити» |
| L4 | 21 | Idiom number `втратили голову` (sing.) for «lost their heads» | «жінки втратили голову» | «втратили голови» / «розгубилися» |
| L5 | 6 | Comma before final `і те` in mixed enumeration | «врятувати вас, допомогти вам, і те, як це здійснюється» | review comma |

*Checked and found clean:* quotation marks (all `«»`, incl. nested `«klin»`,
`«ґхар-ґхусна»`), em-dash ` – ` with spaces, apostrophes `’` (U+2019),
hyphenated compounds (`те-се`, `по-справжньому`, `навіки-віків`, `будь-який`),
number formatting (`5 000`, `50 000`, `180 футів`), no Latin/Cyrillic mixing
(Latin only inside intentional editor notes), feminine verb agreement for
Shri Mataji throughout.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 19, 27, 29, 30 | Transliteration: genitive `Сахаджа Йоги` uses г, breaking glossary `Йоґа` (Sanskrit g → ґ). 13 occurrences; nom./acc. correctly use `Йоґа/Йоґу` | «вийти із Сахаджа Йоги», «школа Сахаджа Йоги»… | `Сахаджа Йоґи` (×13) |
| S2 | 24, 27, 29 | Inconsistent `Мати-Земля` hyphenation vs glossary `Мати Земля`; nominative already unhyphenated, oblique cases hyphenated | «навколо Матері-Землі», «на Матір-Землю» | `Матері Землі` (×4), `Матір Землю` (×2) |
| S3 | 15 | Shri Mataji reflexive possessive lowercase `свій` (must be uppercase) | «Я отримала свій пісок безкоштовно» | `Свій` |
| S4 | 41 | Glossary term `Maya → Майя` lowercased | «не введи нас у майю» | `Майю` |
| S5 | 37 | `Прана` capitalized; glossary lists `прана` lowercase | «пов’язано з Праною… Він дає вам Прану» | (consider `прана`) |
| S6 | 24 | `Боги` (plural deities) capitalized mid-sentence | «там перебувають Боги» | (consider `боги`) |

*Checked and found clean:* Shri Mataji pronouns (Я/Мені/Мій/Моя/Своїх/Самій),
singular Incarnation pronouns (Картікейя, Ґанеша, Нішкаланка → Він/Його/Свою),
generic-people pronouns lowercase (the Sahaja Yogini, husband, workers),
`сахаджа йоґ/йоґиня/йоґи` lowercase as common nouns (plural labels already use
ґ), spiritual-term caps (Пуджа, Дхарма, Інкарнація, Стопи, Реалізована Душа,
Реалізація), language names lowercase (англійська, гінді, санскрит), deity/place
transliteration (Картікейї, Ґанеші, Шіви, Екадаша Рудри, Вішуддхі, Пінґалі),
nationalities lowercase (індійці, британці, арії, нацистка).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Remove** | `прощаюча` is a parallel predicate adjective to the lexicalised `любляча`; in this spoken devotional list it is understood. Rephrasing risks introducing a more awkward construction. Style, not a clear error. |
| L | L2 | **Remove** | The comma reflects a deliberate spoken pause; the transcript consistently preserves such oral-rhythm commas (`тобто,`, `Інакше,`, `Усе ж,`). Not a grammatical error worth changing in isolation. |
| L | L3 | **Remove** | `повірити чомусь` (dative) is valid Ukrainian government; acceptable in spoken register. Style preference. |
| L | L4 | **Remove** | `втратити голову` is a fixed idiom that works here; matching English plurality is not required. Style preference. |
| L | L5 | **Remove** | Pause comma in a spoken enumeration; not clearly wrong. |
| S | S1 | **Keep** | Real glossary/transliteration error and an internal inconsistency (Йоґа/Йоґу vs Йоги within the same paragraph). Genitive of `Йоґа` retains ґ → `Йоґи`. High confidence. |
| S | S2 | **Keep** | Real internal inconsistency; glossary form is `Мати Земля` (no hyphen). Standardised oblique cases to the unhyphenated, glossary-compliant form (declined as two words). |
| S | S3 | **Keep** | Shri Mataji's possessives are uppercase everywhere else in the text (Свого, Своїх, Своєму, Своїм); this lone lowercase `свій` is an inconsistency. |
| S | S4 | **Keep** | `Maya` is explicitly capitalised in `terms_lookup.yaml` (Maya → Майя), a named cosmic principle (cf. Mahamaya). Applied for glossary consistency. |
| S | S5 | **Remove** | The English source capitalises `Prana` throughout this passage as the principle Kartikeya bestows; reverent usage. The glossary's lowercase `прана` is tied to the specific phrase «між праною й маною». Keep original capitalisation. |
| S | S6 | **Remove** | `Боги` renders the deities of a Sanskrit subhashita reverently (English «the Gods»); defensible. Not a clear error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 19, 27, 29, 30 | `Сахаджа Йоги` (genitive with г) ×13 | `Сахаджа Йоґи` |
| 2 | 24, 27 | `Матері-Землі` ×4 | `Матері Землі` |
| 3 | 29 | `Матір-Землю` ×2 | `Матір Землю` |
| 4 | 15 | `свій пісок` (Shri Mataji) | `Свій пісок` |
| 5 | 41 | `майю` (Lord's Prayer) | `Майю` |

## Summary

- Language (L): 5 issues found, 0 approved by Critic
- SY Domain (S): 6 issues found, 4 approved by Critic
- Total corrections applied: 21 textual replacements across 4 distinct issues
  (Йоґа transliteration ×13, Мати Земля hyphenation ×6, Свій ×1, Майю ×1)
