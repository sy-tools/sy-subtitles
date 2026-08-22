# Language Review – 2004-07-04_Guru-Puja-Follow-My-Message-of-Love, 2026-08-12

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019), quotes «», no Latin/Cyrillic mixing, no double or
misplaced spaces; hyphens only in «по-людськи» (correct) and «сахадж-події»
(see S1).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | «ніщо інше, як» in an affirmative statement — the norm is «не що інше, як» («ніщо інше» requires a negated predicate: «ніщо інше не…») | «Це **ніщо інше, як** просто відчуття всередині» | «Це **не що інше, як** просто відчуття всередині» |
| L2 | 19 | Missing comma closing the subordinate clause «яка є» before the dash (norm: кома й тире together) | «але ця любов, **яка є –** її неможливо описати словами» | «але ця любов, **яка є, –** її неможливо описати словами» |
| L3 | 22 | Verb government: «намагатися» takes only an infinitive, never a direct object («нічого») | «не потрібно **нічого намагатися**» (EN: “don’t have to try anything”) | «не потрібно **нічого пробувати**» |
| L4 | 23 | Word form: «вираз» means a set phrase or facial expression; the act/possibility of expressing is «вираження» | «Воно не може виразитися, тому що воно **поза виразом**» (EN: “it is without expression”) | «тому що воно **поза вираженням**» |
| L5 | 11 | (related to L4) «виразами» for “human expressions” | «воно поза всіма вашими людськими **виразами**» | (consider «вираженнями» / «проявами») |
| L6 | 10 | Possibly missing dash before the nominal predicate | «І ось чому сьогодні ваше святкування Ґуру» | «І ось чому сьогодні **–** ваше святкування Ґуру» |
| L7 | 26 | Substantivized adverb as predicate: «це найбільше» | «відчути її всередині себе – **це найбільше**» (EN: “is the biggest thing”) | (consider «це найважливіше» / «це найбільша річ») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 16 | Hyphenated «сахадж-події» — mixed style: the only hyphenated «сахадж-» compound in the whole corpus; the glossary examples («сахаджа культура», «сахаджа спосіб») and this very transcript («Сахадж любов» ¶18, «Сахадж шлях» ¶22) write the indeclinable modifier without a hyphen, as do all other talks («сахадж стиль», «сахадж способом», «сахадж мовою») | «завдяки **сахадж-події**» | «завдяки **сахадж події**» |
| S2 | 3, 6 | Place-name «Кабелла Ліґуре» — the corpus is split across four variants (10× «Кабелла-Лігуре», 8× «Кабелла Лігуре», 5× «Кабелла-Ліґуре», 5× «Кабелла Ліґуре») | «Кампус, Кабелла Ліґуре (Італія)» | (needs a corpus-wide decision) |

Checked and found correct (no findings): Shri Mataji pronouns uppercase in
all instances (Я/Мене/Мені/Мною/Моєму — ¶7, 8, 19, 26, 27); «Ґуру»
capitalization mirrors the source exactly — uppercase for the Guru/one's Guru
(¶7, 10, 18, 20, 25), lowercase «ґуру» where EN has lowercase “guru”
(¶14 “who is your guru”, ¶24 “they are called now as our guru”); «Пуджа Ґуру»
matches the glossary variant, declensions correct («на Пуджі Ґуру», «Пуджу
Ґуру»); «сахаджа йоґів» lowercase with «ґ», correct plural genitive per
glossary; «Дух» («вашого Духа» ¶10, for EN “your Self”) and «Божественного»
(¶10) uppercase per glossary; «Сахадж» case follows the source (uppercase
“Sahaj love/way/being Sahaj”, lowercase “sahaj happening”); language names
lowercase («англійська», «українська», line 4); sentence-initial «Йому» (¶15)
refers to a regular person but is correctly capitalized as sentence start;
closing blessing «Нехай Бог благословить вас!» matches the EN “May God bless
you!” (no “all” in source, so the fixed «усіх вас» formula does not apply).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Codified norm, not a preference: in affirmative constructions only «не що інше, як» is correct. The corpus overwhelmingly agrees (49× «не що інше, як» in 29 talks vs 8× «ніщо інше, як»). Clear-cut error. |
| L | L2 | **Keep** | Mandatory punctuation: a subordinate clause must be closed with a comma; when a dash follows, both marks are written («, –»). Genuine error, and the fix preserves the source's broken-speech dash (“this love which is – cannot be described”). |
| L | L3 | **Keep** | Genuine government violation: «намагатися» cannot take the object «нічого». «Пробувати» accepts an object, stays minimal, and matches the EN “try anything”. |
| L | L4 | **Keep** | Genuine lexical error, not taste: per dictionary, «вираз» is a facial expression or set phrase; the abstract act of expressing is «вираження». The corrected sentence keeps the source's deliberate echo («виразитися… поза вираженням»). |
| L | L5 | **Remove** | False positive by analogy with L4: here the source has the countable plural “all your human expressions”, and plural «вирази» (verbal expressions, means of expression) fits that meaning. Replacement would be stylistic. |
| L | L6 | **Remove** | Not an error: «сьогодні» is an adverbial, and the dash between subject and predicate is required only for noun/infinitive pairs; here it would be a purely intonational (optional) dash. |
| L | L7 | **Remove** | Faithful to the source's colloquial “is the biggest thing”; substantivized «найбільше» is understandable spoken register, and «найважливіше» would shift the nuance. Style preference, not an error. |
| S | S1 | **Keep** | Mixed styles within one transcript is an explicit review criterion, and every reference point — the glossary examples, this transcript's own «Сахадж любов»/«Сахадж шлях», and every other talk in the corpus — writes the modifier unhyphenated. The lone hyphenated form is an outlier. |
| S | S2 | **Remove** | Precedent: the 2026-07-11 review of 2004-05-09_Sahasrara-Puja ruled on exactly this — no canonical form exists, the glossary is silent, the corpus is split four ways, and the form is consistent within this talk (lines 3 and 6). A per-talk change would be arbitrary; needs a corpus-wide decision. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | Це ніщо інше, як просто відчуття всередині | Це не що інше, як просто відчуття всередині |
| 2 | 16 | завдяки сахадж-події | завдяки сахадж події |
| 3 | 19 | але ця любов, яка є – її неможливо описати словами | але ця любов, яка є, – її неможливо описати словами |
| 4 | 22 | не потрібно нічого намагатися | не потрібно нічого пробувати |
| 5 | 23 | тому що воно поза виразом | тому що воно поза вираженням |

## Summary

- Language (L): 7 issues found, 4 approved by Critic
- SY Domain (S): 2 issues found, 1 approved by Critic
- Total corrections applied: 5

The translation is of high quality and reads with devotion and fidelity to
the spoken source. Deity-pronoun capitalization, sacred terms, and SY
terminology are fully consistent with the glossary; all punctuation
characters follow Ukrainian orthography. The five applied fixes are one
idiom normalization («не що інше, як»), one mandatory comma before a dash,
one verb-government fix, one lexical word-form fix («вираження»), and one
consistency fix removing the corpus's only hyphenated «сахадж-» compound.
All discretionary style items were filtered out by the Critic, including one
resolved by precedent from the 2004-05-09 Sahasrara Puja review.
