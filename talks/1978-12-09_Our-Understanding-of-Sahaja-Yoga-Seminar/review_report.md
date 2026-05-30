# Language Review – Our Understanding of Sahaja Yoga (Seminar), 9 December 1978

## Process

2+1 agent review of `transcript_uk.txt` against `transcript_en.txt`, the glossary
(`terms_lookup.yaml`, `terms_context.yaml`), and the capitalization/orthography rules
in `glossary/CLAUDE.md`. Two reviewers (L – Language, S – SY Domain) ran independently;
the Critic filtered both tables, removing false positives and trivial style preferences.

Corpus statistics were used to settle two pervasive terminology questions:
- **`Йоґа` (ґ) vs `Йога` (г):** corpus uses `Сахаджа Йоґ-` (ґ) **561×** vs `Сахаджа Йог-` (г) **78×** → ґ is canonical (also mandated by the transliteration table: Sanskrit *g* → ґ).
- **`стан свідка`:** corpus + glossary render it **lowercase**; the capitalized `Стан Свідка` occurred only in this talk.

---

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 11 | Verb government | «Він **огризається до** своєї матері» — *огризатися* governs «на + знах.» | «огризається **на свою матір**» |
| L2 | 71 | Case agreement | «плакатиме там через те, **якою сувора** є мачуха» — interrogative instr. + nom. adjective | «**якою суворою** є мачуха» |
| L3 | 7, 25, 60 | Ellipsis glyph | single-char «…» used; `glossary/CLAUDE.md` specifies three dots «...» | «...» |
| L4 | 20 | Missing comma | «своїми сахаджа йоґами **і** Я люблю їх» — two clauses, repeated subject «Я» | add comma before «і» |
| L5 | 30 | Missing comma | «Я запитаю ?? **а** потім це» — comma before contrastive «а» | add comma before «а» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 2, 27, 35, 43, 56, 72, 73, 79, 81, 85 | Terminology / transliteration | «Сахаджа **Йога/Йоги/Йогу**» and «внутрішня **йога**» use г; glossary + corpus require ґ | «Сахаджа **Йоґа/Йоґи/Йоґу**», «**йоґа**» |
| S2 | 67 | Deity-pronoun capitalization | «думати: „О, **моя** дитина…“» — Shri Mataji's possessive (rule: Моя ALWAYS uppercase); same sentence already has «Моя їжа» | «**Моя** дитина» |
| S3 | 85, 104 | Term capitalization | «**Стані/Станом Свідка**» — glossary term `стан свідка` is lowercase | «**стані/станом свідка**» |
| S4 | 57 | Capitalization consistency | «через того **Лікаря**» cap vs «лікар» lowercase elsewhere | lowercase «лікаря» |
| S5 | 27, 72 | Term capitalization | «усе **майя**», «**ананда**, радість», «усе **авід'я**» lowercase vs glossary cap headwords | capitalize |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | *огризатися* requires «на + знах.»; «до» is non-standard government. |
| L | L2 | **Keep** | Genuine agreement error: predicate adjective must be instrumental («якою суворою»). |
| L | L3 | **Remove** | False positive in practice — the corpus uses the single-char «…» 292× (vs 437× «...»). Both are accepted; this transcript is internally consistent. Not an error. |
| L | L4 | **Remove** | Borderline punctuation. With the subject repeated the comma is defensible but optional in a short coordinated pair; changing it is an over-correction, not a clear error. |
| L | L5 | **Remove** | Line is a garbled inaudible-marker fragment («??»); punctuation around an unknown token cannot be reliably judged. |
| S | S1 | **Keep** | Decisive: glossary mandates `Сахаджа Йоґа`/`Йоґа`; corpus is 561 ґ vs 78 г; same talk already wrote «Сахадж Йоґу» (¶48) and «сахаджа йоґ» (practitioner) with ґ throughout — the г forms were the inconsistency. |
| S | S2 | **Keep** | Clear application of the deity-pronoun rule; «Моя їжа» is capitalized in the very same sentence. |
| S | S3 | **Keep** | Glossary lists `стан свідка` lowercase; not in the CLAUDE.md spiritual-cap list; corpus confirms lowercase. |
| S | S4 | **Remove** | The EN deliberately shifts «doctor» → «Doctor» to mark the Spirit metaphor; the UK mirrors this. It is a one-off emphasis, not a glossary term — leave as authored. |
| S | S5 | **Remove** | Here the words are common-noun glosses, not invocations: «усе майя, лише ілюзія», «ананда, радість», «усе авід'я». Lowercase is correct in this context. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 2, 27, 35, 43, 56, 72, 73, 79, 81, 85 | `Сахаджа Йога/Йоги/Йогу`, `внутрішня йога` (г) | `Сахаджа Йоґа/Йоґи/Йоґу`, `йоґа` (ґ) |
| 2 | 67 | `моя дитина` (Shri Mataji's possessive) | `Моя дитина` |
| 3 | 85 | `у Стані Свідка` | `у стані свідка` |
| 4 | 104 | `абсолютно Станом Свідка` | `абсолютно станом свідка` |
| 5 | 11 | `огризається до своєї матері` | `огризається на свою матір` |
| 6 | 71 | `якою сувора є мачуха` | `якою суворою є мачуха` |

(Correction 1 covers 13 substitutions across the listed paragraphs.)

## Summary

- **Language (L):** 5 issues found, 2 approved by Critic.
- **SY Domain (S):** 5 issues found, 3 approved by Critic.
- **Total corrections applied:** 18 substitutions (13 for the Йоґа/йоґа terminology fix + 5 individual fixes).

The translation is of high quality. Deity-pronoun capitalization for Shri Mataji
(Я/Мені/Ти/Тобі) and the divine (Він/Його/Бог/Дух) was applied correctly and
consistently throughout — every mid-sentence pronoun was verified against the
addressee. The only systematic issue was the `Йога` (г) spelling of *Sahaja Yoga*,
which contradicted both the glossary and the established corpus convention.
