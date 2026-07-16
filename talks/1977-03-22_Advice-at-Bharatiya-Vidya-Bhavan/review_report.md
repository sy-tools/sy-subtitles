# Language Review – 1977-03-22 Advice at Bharatiya Vidya Bhavan

## Process

2+1 review (Reviewer L = Language, Reviewer S = SY Domain, Critic = filter) of the
full `transcript_uk.txt` (paragraphs 1–91) against `transcript_en.txt`, using
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.

This is the **second review pass**. The first pass (see git history of this file)
found and applied seven localized fixes — `сердечний → серцевий` (p38),
`мою фотографію → Мою фотографію` (p48, 52), `атма/атми → Атма/Атми` (p61 ×2),
`[незрозуміло] → [Незрозуміло]` (p78), stray stress mark `зміни́теся → змінитеся`
(p81) — and **deferred** the systemic lowercase-`я` question (its S3) pending
corpus-level evidence. This pass re-reviewed the whole text, gathered that
evidence, and resolved the deferred finding.

**Corpus evidence for the deferred item:** across all 92 talks, uppercase
mid-sentence `Я` for Shri Mataji is the clear norm (pattern `, Я `: dozens of
talks with 5–38 uppercase hits each); this talk was one of only two files with
*zero* uppercase mid-sentence `Я`, while its own oblique forms (`Мені/Мене/Мною/
Мій/Моя/Свої`) are uppercase throughout, and it even contains one correct
mid-sentence `Я` («для такої особи, як Я», p37). `glossary/CLAUDE.md` mandates
`Я` uppercase ALWAYS for Shri Mataji. The prior Critic's two concerns are now
answered: (a) corpus practice **is** uppercase; (b) this pass classified all
120 standalone lowercase `я` occurrences one by one, excluding quoted speech of
other people.

Overall the translation is careful, faithful and well-punctuated: Ukrainian
«»-quotes (including nested), apostrophe `’`, the locative «в Сахаджа Йозі»,
glossary transliterations (Аґія, Ґанеша, Вішуддхі, Пінґала Наді, Брахмарандхра…)
are all correct. The dash style is internally consistent (em-dash with spaces;
the lone `–` is a correct numeric range «5–6»), matching several other corpus
files, so it was not touched (first-pass precedent).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 9 | Number agreement broken inside one clause: `хто отримав` (sg.) … `не знають` (pl.) | «є деякі, хто отримав реалізацію за останні п’ять років і не знають ні слова» | `і не знає ні слова` |
| L2 | 12 | Unbalanced bracket: paragraph ends with `]` but has no opening `[` (all other Hindi/Marathi notes are bracketed on both sides) | «Усі ви досягайте глибини … мовою гінді ]» | `[Усі ви досягайте…` |
| L3 | 18 | Direct rhetorical question ends with a period; the parallel question right before it has `?` («Яку користь я можу з цього мати?») | «Чому людський мозок такий легковажний.» | `…легковажний?` |
| L4 | 21 | Question-like sentence with a period | «Чому Бог дав нам его й суперего. Це дуже велике питання.» | `…суперего?` |
| L5 | 41 | Two sentences run together: no terminal period after the closing quote before «Я сказала» | «…каам наве. [ Це не для дурних людей]» Я сказала» | `…людей]». Я сказала` |
| L6 | 54, 69, 88 | Non-normative euphonic variant `зі собою/зі Собою` («зі» is used before с/з/ш/щ + consonant clusters — «зі своїх», «зі Мною» are correct; before «собою» the norm is «із/з собою») | «була зі собою», «єдина зі Собою», «себе зі собою» | `із собою` / `із Собою` |
| L7 | 60 | Missing comma between `що` and nested `коли`-clause (no correlate «то»); the text itself punctuates this correctly in p43 («що, коли вони приходять…») | «Кундаліні знає, що коли я перед вами, вона піднімається» | `що, коли Я перед вами` |
| L8 | 61 | Stray comma after the conjunction `Тож` (the EN stutter "So that, that is why" was not preserved as a word repetition, so the comma has no function) | «Тож, ось чому це відоме як «самадхі»» | `Тож ось чому` |
| L9 | 61 | Number agreement breaks mid-sentence: `ви непритомні` (pl.) → `ви стаєте непритомним` (sg.) | «Якщо ви непритомні в тому сенсі… ви стаєте непритомним, тобто що?» | `непритомними` |
| L10 | 85 | Singular predicate noun with generic plural `ви` (same paragraph uses plural: «Будьте нормальними, природними людьми»; p84 «не будьте скнарами») | «але й не будьте геть марнотратником» | `марнотратниками` |
| L11 | 26 | EN "small cell" (electrical cell, paired with "mains") rendered as biological `клітині` | «випробовую його на одній малій клітині» | (flag — translation accuracy) |
| L12 | 60 | Directional `на свої руки` where locative may be intended | «ви отримуєте відповіді на свої руки» | (flag) |
| L13 | 17, 68 | Typographic ellipsis `…` (U+2026) vs rule's `...` | «ага…», «мати… [нерозбірливо]…» | (flag — first-pass precedent) |
| L14 | many | Em-dash `—` style vs `–` used by most of the corpus | throughout | (flag — internally consistent) |
| L15 | 7, 18, 21, 41 | Inconsistent space after `[` / before `]` | «[ Це світло…» | (flag — first-pass precedent) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ~40 paragraphs | Systemic: Shri Mataji's nominative `я` lowercase (120 standalone occurrences; 114 are Her own speech) while Her oblique forms are uppercase — violates the ALWAYS-uppercase rule and corpus practice; resolves first-pass deferred finding | «то я це зроблю», «я — жива істота», «Тож я знаю все»… | `Я` (114×; excluded: Janardhan Maharaj p31, Naagnath/Maharaj p33, the foreign lady p40, Gagangarh Maharaj p41, the devotee's prayer p53, and the generic-onlooker voice p18) |
| S2 | 18, 33, 36, 38, 80 | Shri Mataji's oblique pronouns lowercase, inconsistent with the file's own dominant uppercase usage | «тож не кажи мені», «Ви зрозуміли мою думку?», «кажуть мені навіть», «учора мені розповіли», «поставила мені запитання», «Хтось украв мої речі» | `Мені` (4×), `Мою`, `Мої` |
| S3 | 41 | Maharaj addresses Shri Mataji with lowercase `ти`; his other addresses in the same passage are uppercase («а як же Ти», «Ти — Мати») | «Він сказав: «Звідки ти знаєш?»» | `Ти` |
| S4 | 71 | Shri Krishna (Incarnation, singular) referred to with lowercase `він`; same bracket already has uppercase «Він говорив про Сахаджа Йоґу в Гокулі» | «Чому він розбив матку?» | `Він` |
| S5 | 53 | Mother Earth (Бхумі Деві) pronouns lowercase, inconsistent with uppercase «Вона» for Her in p49 and in the same sentence («а Вона ваша бабуся») | «торкніться її чолом», «я торкаюся тебе своїми ногами» | `Її`, `Тебе` |
| S6 | 50 | Stage direction: reflexive possessive referring to Shri Mataji lowercase (cf. «Свої вібрації» p13, «Свою дитину» p29, «Своє дихання» p69) | «[Мати видуває повітря зі своїх вуст]» | `зі Своїх вуст` |
| S7 | 42 | Text title lowercase; `terms_lookup.yaml`: Chaitanya Lahari → Чайтанья Лахарі; the parallel title in the same list is capitalized («Хіранья Санхіту») | «чайтанья лахарі та все те, що говорить про Кабіра» | `Чайтанья Лахарі` |
| S8 | 26, 45, 53 | `двіджа`, `акашу`, `акаш` lowercase vs uppercase glossary headwords | «це двіджа», «використовувати акашу», «на «акаш» (ефір)» | (flag — first-pass precedent) |
| S9 | 35, 37 | `Йоґа Шастра` / `йоґашастра` / `Йоґашастру` / `Йоґа шастри` mixed | one passage | (flag — mirrors EN) |
| S10 | 35, 62 | `саатвік/таамасік` vs `тамасік` spelling variation | «Він тамасік» | (flag — mirrors EN "taamasik"/"tamasic") |
| S11 | 76 | Lakshmana mid-sentence `він` lowercase | «він бачив лише Її Стопи» | (flag — status as Incarnation unclear) |
| S12 | 36 | `Ґоа` with Sanskrit-`ґ` for a Portuguese-Indian place name | «він у Ґоа» | (flag — first-pass precedent) |
| S13 | 62 | `дев, девата` vs glossary `Дева` | «Дев і всі ці істоти сидять з того боку, дев, девата» | (flag — mirrors source pronunciation) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine agreement error inside one clause; the correct pattern «ті, хто провалюється, потрапляють» elsewhere (p62) is a different construction. |
| L | L2 | **Keep** | Objectively unbalanced bracket (unlike cosmetic spacing); every other translated-note passage is fully bracketed. Distinct from first-pass L5. |
| L | L3 | **Keep** | Clearly a direct rhetorical question in a chain of questions with `?`; Ukrainian requires `?` regardless of the EN transcriber's sloppy period. |
| L | L4 | Remove | Defensible as an announced topic, not a question: «Тепер тема дуже глибока. Чому Бог дав нам его й суперего. Це дуже велике питання.» reads as the title of the theme. |
| L | L5 | **Keep** | Missing sentence-final punctuation between two sentences is a real error, separate from bracket-spacing cosmetics. |
| L | L6 | **Keep** | Real orthographic norm (правопис, euphony of з/із/зі); «зі мною/зі своїх» stay — those are the normative uses. 3 instances. |
| L | L7 | **Keep** | Internal inconsistency: p43 punctuates the same construction correctly («що, коли»). |
| L | L8 | **Keep** | The comma serves no function once the EN word-repetition was dropped; ungrammatical after «Тож». |
| L | L9 | **Keep** | Agreement breaks within a single sentence («ви непритомні … ви стаєте непритомним»). |
| L | L10 | **Keep** | Same-paragraph plural predicates make the singular a clear slip. |
| L | L11 | Remove | Translation-accuracy question with an ambiguous garbled source — outside this review's language/terminology scope. |
| L | L12 | Remove | Directional reading («відповіді приходять на руки») is defensible; not a clear error. |
| L | L13 | Remove | First-pass precedent: `…` is a valid typographic ellipsis; trivial. |
| L | L14 | Remove | Internally 100% consistent; several corpus files are em-dash files; first pass explicitly blessed it. Mass conversion would be style churn, not correction. |
| L | L15 | Remove | First-pass precedent: trivial cosmetics mirroring EN. |
| S | S1 | **Keep** | The first pass deferred this pending corpus evidence; evidence now shows uppercase is both the written rule and the corpus norm, and the file itself is internally mixed (uppercase obliques + one uppercase `Я`). All 120 occurrences classified individually; 6 excluded as other speakers' quoted speech / impersonated generic voice. |
| S | S2 | **Keep** | Same rule as first-pass S1 (already applied for «Мою фотографію»); these are the remaining stragglers, each verified as Shri Mataji's own speech. «мені» of the devotee (p53), seekers (p58, 66, 86), the Civil Surgeon (p70) and «скажи мені» of the people (p80) correctly stay lowercase. |
| S | S3 | **Keep** | Same speaker uses uppercase «Ти» to Shri Mataji three times in the same episode; clear inconsistency. |
| S | S4 | **Keep** | Rule-mandated (individual Incarnation, singular) + same-bracket inconsistency. |
| S | S5 | **Keep** | Same-sentence inconsistency («…тебе… — а Вона ваша бабуся»); Mother Earth consistently gets uppercase deity pronouns in this file. The devotee's own «пробач мені… я торкаюся» correctly stays lowercase. |
| S | S6 | **Keep** | The file's own convention capitalizes deity reflexives; only occurrence in a stage direction. |
| S | S7 | **Keep** | Glossary-listed title + the neighbouring title in the same list is capitalized. |
| S | S8 | Remove | First-pass precedent: generic concept/element in running text, internally consistent with lowercase «прітхві». |
| S | S9 | Remove | Mirrors the EN source's own case/spelling variation ("Yoga shastra"/"yogashastra"/"Yogashastra"). |
| S | S10 | Remove | Mirrors EN variation ("taamasik" vs "tamasic") — transcription of pronunciation. |
| S | S11 | Remove | Lakshmana is not clearly covered by the Incarnation rule (brother of Shri Rama); lowercase is defensible; Sita correctly uppercase. |
| S | S12 | Remove | First-pass precedent: house transliteration style, no glossary entry. |
| S | S13 | Remove | Mirrors source pronunciation ("Dev… dev, devtaas"). |

### Approved Corrections (applied this pass)

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | «і не знають ні слова» | «і не знає ні слова» |
| 2 | 12 | missing opening `[` | «[Усі ви досягайте…» |
| 3 | 18 | «легковажний.» | «легковажний?» |
| 4 | 41 | «людей]» Я сказала» | «людей]». Я сказала» |
| 5 | 54, 69, 88 | «зі собою» / «зі Собою» (3×) | «із собою» / «із Собою» |
| 6 | 60 | «що коли я перед вами» | «що, коли Я перед вами» |
| 7 | 61 | «Тож, ось чому» | «Тож ось чому» |
| 8 | 61 | «ви стаєте непритомним» | «ви стаєте непритомними» |
| 9 | 85 | «марнотратником» | «марнотратниками» |
| 10 | ~40 paragraphs | Shri Mataji's «я» lowercase (114×) | «Я» |
| 11 | 18, 33, 36, 38 | «мені» (Shri Mataji, 4×) | «Мені» |
| 12 | 18 | «мою думку» | «Мою думку» |
| 13 | 80 | «мої речі» | «Мої речі» |
| 14 | 41 | «Звідки ти знаєш?» (to Shri Mataji) | «Звідки Ти знаєш?» |
| 15 | 71 | «Чому він розбив матку?» (Shri Krishna) | «Чому Він розбив матку?» |
| 16 | 53 | «її чолом», «торкаюся тебе» (Mother Earth) | «Її чолом», «торкаюся Тебе» |
| 17 | 50 | «зі своїх вуст» (stage direction, Shri Mataji) | «зі Своїх вуст» |
| 18 | 42 | «чайтанья лахарі» | «Чайтанья Лахарі» |

## Summary

- Language (L): 15 issues found, 9 approved by Critic (11 individual edits)
- SY Domain (S): 13 issues found, 7 approved by Critic (126 individual edits)
- Total corrections applied this pass: **137** (across 18 approved findings)
- First pass (previously applied): 7 corrections; its deferred S3 is resolved here as S1
- Verified after application: the only remaining standalone lowercase «я» are the
  6 deliberately excluded other-speaker instances; brackets balance 60/60;
  normative «зі Мною / зі своїх» forms untouched
