# Language Review – 1983-01-14 Shri Saraswati Puja: The basis of all creativity is love

## Process

2+1 agent review of `transcript_uk.txt` (full paragraphed Ukrainian text):
Reviewer L (Language) + Reviewer S (SY Domain) run in parallel, then a Critic
filters both tables, removing false positives and trivial style preferences and
keeping only genuine, justified corrections.

**Round 2 (2026-07-16).** A previous round had already reviewed this transcript
and applied 3 corrections (Сахаджа Йоґи with ґ; two uppercase Shri Mataji
pronouns — see git history of this file). Round 2 re-ran the full 2+1 process on
the post-round-1 text; prior Critic rulings were respected as precedent where
the same items resurfaced.

Character-level sweeps confirmed clean: no Latin/Cyrillic mixing, no straight
apostrophes (all `’` U+2019), all quotation marks `«»` yalynky — no `„"`/`""`,
en-dashes ` – ` with spaces throughout, no double spaces, no spaces before
punctuation, no ellipsis issues.

Paragraph references below are line numbers in `transcript_uk.txt`
(body text starts at line 6).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 42 | Зайва кома перед одиничним «або» між однорідними присудками зі спільним підметом | «Може сісти на голову короля, або може впасти до ніг когось.» | «Може сісти на голову короля або може впасти до ніг когось.» |
| L2 | 33 | Хибний сполучник: «як-от» уживається лише при переліку/поясненні; тут порівняння (EN «Like in Gregoire’s book also») | «Як-от і в книзі Ґреґуара, Я зробила так…» | «Як і в книзі Ґреґуара, Я зробила так…» |
| L3 | 49 | Узгодження прикладки після «річкою» | «Вода стає річкою Ґанґа.» | «…річкою Ґанґою.» (instrumental) |
| L4 | 31 | Калька «зникатимуть від вас» (EN «disappearing from you») | «…сили, які ви отримали, поступово зникатимуть від вас.» | «…поступово вас покидатимуть.» |
| L5 | 33 | Мала літера після двокрапки на початку цитати | «Тож якщо ви кажете: «так, дехто з нас отримав»» | «…кажете: «Так, дехто з нас отримав»» |
| L6 | 40 | Незграбна конструкція «робить вас наче в шкаралупі горіха» | «…це его, знаєте, робить вас наче в шкаралупі горіха…» | «…закриває вас, наче в шкаралупу горіха…» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 54 | Транслітерація назви мови: придиховий *th* → «тх» (конвенція глосарія: Hatha → Хатха, Atharva → Атхарва); словникова форма — «маратхі» | «[Англійський переклад з **мараті**]» | «[Англійський переклад з **маратхі**]» |
| S2 | 28 | Possible spiritual-term capitalization (Істина) | «усе може вибухнути від **істини**» | «…від **Істини**»? |
| S3 | 17 | Відмінювання обох частин назви чакри (за корпусом: «в Аґії чакрі», «в Муладхарі чакрі») | «якщо **Сур’я чакру** на рівні Аґії посідає Господь Ісус Христос» | «якщо **Сур’ю чакру**…»? |
| S4 | 49 | Форма назви річки: стандартна українська — «Ґанґ» (чол.), глосарій — «Шрі Ґанґа» | «Вода стає річкою Ґанґа.» | Підтверджує форму «Ґанґа» за глосарієм; питання лише у відмінюванні (див. L3) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine punctuation error: single «або» joining homogeneous predicates with a shared subject («вона», the dust particle) takes no comma in Ukrainian. |
| L | L2 | **Keep** | Genuine misuse: «як-от» introduces enumerations/examples only (SUM); the EN «Like in Gregoire’s book also» is a comparison — «Як і». Connector fixed, meaning preserved. |
| L | L3 | Remove | Precedent from round 1 (same item, verdict Remove): non-agreement of foreign river names with the generic noun is sanctioned by Ukrainian usage handbooks («на річці Хуанхе»); the nominative label reading of «стає річкою Ґанґа» is acceptable. Style preference, not an error. |
| L | L4 | Remove | Style preference, not an error: «зникатимуть від вас» is understandable spoken-register phrasing mirroring the EN; rewording is editorial. |
| L | L5 | Remove | False positive: the lowercase quoted fragment mirrors EN «‘yes, some of us have got’» (lowercase citation, not full direct speech); the nearby «Кажіть: «Так…»» is uppercase because EN capitalizes there. Case follows the source in both places — consistent. |
| L | L6 | Remove | Trivial: the EN itself is loose («makes you like a nutshell»); the translation mirrors the original’s spoken looseness. |
| S | S1 | **Keep** | Genuine error: both the glossary aspirate convention (*th* → тх, cf. «Хатха Йога» in `terms_lookup.yaml`) and the Ukrainian orthographic dictionary give «маратхі». Also a language name — stays lowercase, which it already is. |
| S | S2 | Remove | Same ruling as round 1: EN keeps «truth» lowercase in a generic verb phrase («blasted with truth»), not a titled reference to absolute Істина; no internal inconsistency. Follow the source. |
| S | S3 | Remove | False positive: no glossary rule fixes declension for the occasional compound «Сур’я чакра»; «Сур’ю чакру» would read as the accusative of the deity Сур’я and confuse. The corpus examples («в Аґії чакрі») cover established chakra names. Original stands. |
| S | S4 | Merge into L3 | Not a separate correction — confirms the glossary form «Ґанґа» (per «Shri Ganga → Шрі Ґанґа») over standard-Ukrainian «Ґанґ», and defers the declension question to L3 (Remove). |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 33 | «Як-от і в книзі Ґреґуара, Я зробила так…» — хибний сполучник | «Як і в книзі Ґреґуара, Я зробила так…» |
| 2 | 42 | «Може сісти на голову короля, або може впасти…» — зайва кома перед одиничним «або» | «Може сісти на голову короля або може впасти…» |
| 3 | 54 | «[Англійський переклад з мараті]» — транслітерація (*th* → тх) | «[Англійський переклад з маратхі]» |

## Summary

- Language (L): 6 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic (1 merged into L3)
- Total corrections applied: 3

Verified as correct (no findings): deity-pronoun capitalization for Shri Mataji
(Я/Мені/Мене/Мій/Мої — uppercase throughout, 40+ occurrences), Saraswati
(Вона/Її/Своїй), Surya (Сам/Він/Своє per EN «His»); lowercase «свій» for the
astronomical Сонце follows EN «its». Glossary terms consistent: Сур’я
(Сур’ї/Сур’ю/Сур’єю), Аґія/Аґії, права/ліва сторона, Вішуддхі, Махат-Аханкара,
Екадаша/Екадашу, бхути/бхутів, Мати Земля, Аді Ґуру, Деві, Нарака, субуддхі,
сахаджа йоґ/йоґи/йоґів/йоґам/йоґом (lowercase), Сахаджа Йоґа with correct
locative «в Сахаджа Йозі», Дух/Духа, Пуджа/Пуджі/Пуджу, Реалізація/Реалізовані
душі, «Нехай Бог благословить усіх вас» (exact fixed formula). Language names
lowercase (англійська, маратхі). Place names consistent: Дхуле/Дхулія/Насік.
Lowercase «ґуру» for false gurus correctly contrasts with «Аді Ґуру». The psalm
quote «Обмий мене, і я стану біліший від снігу» matches the Ohienko rendering.

Combined with round 1 (3 corrections), the transcript has now had 6 corrections
total across both review rounds; the translation is otherwise of high quality.
