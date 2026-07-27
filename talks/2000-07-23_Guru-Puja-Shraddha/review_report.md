# Language Review – 2000-07-23_Guru-Puja-Shraddha, 2026-07-27

## Process

2+1 agent review of `transcript_uk.txt` (34 paragraphs) per
`templates/language_review_template.md`: Reviewer L (Orthography + Grammar +
Punctuation) and Reviewer S (SY Domain: Capitalization + Terminology +
Consistency) ran in parallel; the Critic filtered both tables; approved
corrections were applied to `transcript_uk.txt`.

Every candidate was checked against `glossary/CLAUDE.md`,
`glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`, and — for
consistency questions — against the existing UK corpus (`talks/*/transcript_uk.txt`),
so verdicts rest on documented house usage rather than taste.

### Mechanical pre-checks (all clean, no findings)

| Check | Result |
|---|---|
| Latin/Cyrillic mixing | only `N.I.H.` (intentional acronym) |
| Dash character | 90 × en-dash U+2013, 0 × em-dash, 0 × ` - ` |
| Quotation marks | 32 `«` / 32 `»`, balanced; no `„“`, `""` |
| Apostrophe | 16 × U+2019; 0 straight `'` |
| Spacing | no double spaces, no space before punctuation |
| Ellipsis | `...` without preceding space |
| Structure | 34 paragraphs = EN; header format matches corpus |
| Spelling sweep | all 108 corpus-hapax words verified as valid Ukrainian |

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶6 | Predicate mismatch in `Єдине, що… – це` construction: finite verb after `це` | «Єдине, що робить Ґуру, – це **дає** вам знання» | «– це **дати** вам знання» |
| L2 | ¶7 | Extra comma before single `і` joining homogeneous predicates (subject `Вони` not repeated) | «живуть у повному невігластві щодо себе самих**,** і день за днем виконують» | «…себе самих і день за днем виконують» |
| L3 | ¶18 | Mixed government: `вас треба підбадьорювати` (acc.) + `дати зрозуміти` with no dative addressee | «вас треба підбадьорювати й дати зрозуміти, що ви можете…» | «…й дати **вам** зрозуміти» |
| L4 | ¶19 | Missing comma in compound sentence (`Я` explicit in both clauses) | «тоді Я трохи занепокоєна і Я говорю про це з лідером» | «…занепокоєна**,** і Я говорю…» |
| L5 | ¶30 | Interrogative `чому б… не` closed with a period | «чому б вам, люди, не зробити те саме й не говорити про це**.**» | «…про це**?**» |
| L6 | ¶31 | Garden-path word order: `зрозумієте як` parses as a conjunction | «ви зрозумієте **як ґуру**, що вам треба робити» | «ви **як ґуру** зрозумієте, що вам треба робити» |
| L7 | ¶30 | Long interrogative `Чому не говорити про це відкрито…` closed with a period | «Чому не говорити про це відкрито, кажучи людям, що… ми будемо за це відповідальні.» | «…відповідальні?» |
| L8 | ¶22 | Latin script inside Cyrillic text | «в N.I.H. – це Інститут здоров’я» | «Н.І.З.» / spell out |
| L9 | ¶14 | `зайняти` + time span (calque of «занять время») | «це **зайняло** близько півгодини» | «це **тривало** близько півгодини» |
| L10 | ¶25 | Colloquial enumeration filler | «витрачала стільки часу з косметологом, **те, се**» | «те й інше» / «тощо» |
| L11 | ¶16 | Calqued quantifier phrase | «жінки занурюються **в так багато** інших речей» | «у безліч інших речей» |
| L12 | ¶26 | Colloquial lexeme for a mudslide | «а потім **грязь** – грязь сходила вниз, наче річка» | «болото» / «грязьовий потік» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ¶6 | `Дух` as divine essence written lowercase (only such instance in the file) | «про ваш власний **дух**» | «про ваш власний **Дух**» |
| S2 | ¶14 | Address register to Shri Mataji switches to `Ви` (yogis speaking) | «– **Ви ж летите** до Америки!» | «– **Ти ж летиш** до Америки!» |
| S3 | ¶14 | Same switch, one sentence later, against `Ти` in the same paragraph | «Матінко, **Ви дуже запізнюєтеся**» | «Матінко, **Ти дуже запізнюєшся**» |
| S4 | ¶26 | Fixed interjection capitalized as a possessive of Shri Mataji | «**Боже Мій**», – сказала Я | «**Боже мій**», – сказала Я |
| S5 | ¶29 | Transliteration departs from glossary term `Сатья Юга` | «велику Сатья **Юґу**» | «велику Сатья **Югу**» |
| S6 | ¶7 | `пудж` (gen. pl.) lowercase vs. rule «Пуджа – uppercase» | «Безліч акробатики, молитов, **пудж**» | «Пудж» |
| S7 | ¶20 | Pronouns referring to the Spirit lowercase | «Чи **йому** це подобається? Чи **він** насолоджується?» | «Йому» / «Він» |
| S8 | ¶33–38 | Short form `сахадж йоґів` alongside `сахаджа йоґів` in ¶21/24/26/30 | «Ви створюєте **сахадж** йоґів» | «сахаджа йоґів» |
| S9 | ¶15 | Pronoun for `Божественне` lowercase mid-sentence | «І **воно** знає, що для вас добре» | «Воно» |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Corpus uses an infinitive or noun after `– це` in this frame (`– це увійти`, `– це пробудження`, `– це любити`, `– це зняти взуття`); 19 of 20 corpus instances, this was the sole finite-verb outlier. |
| L | L2 | **Keep** | Ukrainian rule: no comma before a single `і` between homogeneous predicates. Subject `Вони` appears once; the EN repetition of "they" does not license a Ukrainian comma. |
| L | L3 | **Keep** | Real government error — `дати зрозуміти` requires a dative addressee; `вас` cannot serve both verbs. One-word fix, meaning preserved. |
| L | L4 | **Keep** | Mirror image of L2: subject `Я` is explicit in both clauses → складносурядне речення → comma before `і` required. Applying both keeps the transcript internally coherent. |
| L | L5 | **Keep** | `чому б… не` is interrogative; the translation already punctuates the parallel «Але чому не врятувати весь світ?» (¶28) with `?`. Ukrainian punctuation governs, not the source's period. |
| L | L6 | **Keep** | Genuine ambiguity, not preference: readers parse `зрозумієте як` as "understand how" and must backtrack. Moving the appositive `як ґуру` before the verb resolves it without changing wording. |
| L | L7 | **Remove** | Unlike L5, this sentence drifts into a statement (`…і Я думаю, що ми будемо за це відповідальні`); a `?` after `відповідальні` would misread. Spoken anacoluthon — period is defensible. |
| L | L8 | **Remove** | False positive. The corpus consistently keeps Latin acronyms as-is (`BBC`, `IBM`, `IAS`, `ICS`, `SOS`, `M.A.D.`), and the text glosses it inline («це Інститут здоров’я»). |
| L | L9 | **Remove** | Borderline purism, not an error. `зайняти` + time is widespread in contemporary standard usage and unambiguous here; not worth touching. |
| L | L10 | **Remove** | False positive. `те, се` is established house idiom — 35 occurrences across the corpus. |
| L | L11 | **Remove** | False positive. `так багато` is corpus-wide house style (376 occurrences) reflecting Shri Mataji's spoken register. |
| L | L12 | **Remove** | `грязь` is dictionary Ukrainian (СУМ: розмокла земля, багно) and matches the plain spoken register of the original. Style preference. |
| S | S1 | **Keep** | Rule in `glossary/CLAUDE.md` (`Дух` uppercase) plus corpus: `ваш Дух` ×20, `свій Дух` ×21, `власний Дух` ×2 — this was the only lowercase instance in the whole corpus. It also clashed with `Духа`/`Духом` in ¶17, ¶20, ¶33 of this very talk. |
| S | S2 | **Keep** | This is the only talk in the corpus that mixes `Ти` and `Ви` when yogis address Shri Mataji (2:2 inside the file). Corpus dominance and devotional norm favour `Ти` (48:12 overall; 7:4 for «Матінко, …»); other talks each keep one register throughout. |
| S | S3 | **Keep** | Same finding as S2; both instances must move together, otherwise ¶14 would still contain both registers three sentences apart. |
| S | S4 | **Keep** | `Боже мій` is a fixed interjection, not a possessive referring to Shri Mataji, so the ALWAYS-uppercase pronoun rule does not apply. Corpus: 10 × `Боже мій` (including Shri Mataji's own speech) vs. 2 × `Боже Мій`. |
| S | S5 | **Keep** | `terms_lookup.yaml` gives `Сатья Юга` with `г`; corpus has 61 `г`-forms vs. 5 `ґ`-forms, and `Юґу` occurred nowhere else. Glossary is the authority over the general Sanskrit-`g` rule for this listed term. |
| S | S6 | **Remove** | False positive. The uppercase rule covers the ceremony name; here it is a generic plural in a critical list of empty rituals ("Lots of acrobats, prayers, pujas"). Corpus precedents the lowercase generic (`пуджа` 10, `пуджі` 18, `пудж` 4). This talk correctly keeps `Пуджа` uppercase as a ceremony in ¶17, ¶34, ¶36. |
| S | S7 | **Remove** | No rule supports it: the capitalization rules cover Shri Mataji, individual Incarnations, and regular people — not pronouns standing for the impersonal `Дух`. No corpus precedent either way. |
| S | S8 | **Remove** | `terms_context.yaml` states `сахаджа`/`сахадж` are interchangeable, register «за оригіналом». The EN switches to "Sahaj Yogis" in exactly ¶33/34/37/38; the translation mirrors it faithfully. Another corpus talk mixes both too. |
| S | S9 | **Remove** | False positive. Corpus writes the pronoun for `Божественне` lowercase mid-sentence (`, воно дає` ×4, `, воно знає`, `, воно робить`, `і воно дає`…). Original was correct. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶6 | «Єдине, що робить Ґуру, – це **дає** вам знання» | «– це **дати** вам знання» |
| 2 | ¶6 | «про ваш власний **дух**» | «про ваш власний **Дух**» |
| 3 | ¶7 | «щодо себе самих**,** і день за днем виконують» | «щодо себе самих і день за днем виконують» |
| 4 | ¶14 | «– **Ви ж летите** до Америки!» | «– **Ти ж летиш** до Америки!» |
| 5 | ¶14 | «Матінко, **Ви дуже запізнюєтеся**» | «Матінко, **Ти дуже запізнюєшся**» |
| 6 | ¶18 | «підбадьорювати й дати зрозуміти» | «підбадьорювати й дати **вам** зрозуміти» |
| 7 | ¶19 | «занепокоєна і Я говорю» | «занепокоєна**,** і Я говорю» |
| 8 | ¶26 | «**Боже Мій**», – сказала Я | «**Боже мій**», – сказала Я |
| 9 | ¶29 | «велику Сатья **Юґу**» | «велику Сатья **Югу**» |
| 10 | ¶30 | «не говорити про це**.**» | «не говорити про це**?**» |
| 11 | ¶31 | «ви зрозумієте **як ґуру**, що вам треба робити» | «ви **як ґуру** зрозумієте, що вам треба робити» |

### Post-application verification

- All 11 corrections present exactly once; no regressions (`Юґу`, `Боже Мій`,
  `власний дух`, `Матінко, Ви` → 0 occurrences).
- 34 paragraphs preserved (= EN); quotes balanced 32/32; no em-dash, straight
  quotes, or straight apostrophes introduced.

## Summary

- Language (L): 12 issues found, 6 approved by Critic
- SY Domain (S): 9 issues found, 5 approved by Critic
- Total corrections applied: 11

**Overall quality:** high. The mechanical layer (dashes, quotes, apostrophes,
spacing, ellipses) was flawless, spelling had no defects, and glossary
terminology was accurate throughout (`Принцип Ґуру`, `шраддга`, `бхакті`,
`віддача на милість`, `стан усвідомлення без думок`, `бандхан`, `Мати Земля`,
`в Сахаджа Йозі`, `сахаджа йоґів`, `Нехай Бог благословить усіх вас`). Shri
Mataji's pronouns are consistently uppercase; `Реалізовані Душі` / `реалізовані
душі` and `Пуджа` / `пудж` track the English case correctly. The real findings
clustered in two areas: comma placement around `і` (one extra, one missing —
opposite sides of the same rule), and two consistency outliers against the
corpus (`дух` lowercase, the `Ти`/`Ви` register split when yogis address Shri
Mataji).
