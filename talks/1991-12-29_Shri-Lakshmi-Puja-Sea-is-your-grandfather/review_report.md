# Language Review – 1991-12-29 Shri Lakshmi Puja: Sea is your grandfather

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text, blocks ¶6–¶48 by file
line) against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, using 2 parallel reviewers + 1 critic filter.

This is a second review pass; the first pass's systematic fix (`Сахаджа Йог-` →
`Сахаджа Йоґ-`, 33 occurrences) is already in place and verified correct throughout.
The first-pass critic's precedents on borderline items were taken into account.

Mechanical orthography checks (run on the file): no double spaces, no spaces before
punctuation, no Latin/Cyrillic mixing, no straight `"` / `„"` quotes, no straight
apostrophes (`’` U+2019 throughout), no `…` character (only three-dot `...`, no space
before), en-dash ` – ` (U+2013) with spaces, `«»` balanced. One typographic deviation
found: spaced slash `садху / шахраям` (¶10, see L2).

Corpus checks used for verification: `Шріпхала` is the established transliteration
(1982-08-22 Shri Ganesha Puja); vocative `Мати` in quoted speech is widespread across
the corpus alongside `Матінко`; `Тим не менше/менш` occurs in the corpus and was
already ruled a style preference by the previous critic.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | Pronoun agreement: sg. fem. `її` has no feminine antecedent; refers to pl. `гроші` | «Якщо ви не даєте трохи грошей на роботу Бога, то коли ж ви **її** дасте?» | `її` → `їх` |
| L2 | 10 | Spaced slash; Ukrainian typography joins single-word alternatives without spaces | «самозваним **садху / шахраям**» | `садху / шахраям` → `садху/шахраям` |
| L3 | 7 | Possible calque «Тим не менш» (rus. *тем не менее*) | «**Тим не менш**, тепер Я чула…» | (candidate) → `Однак` |
| L4 | 25 | Comma between homogeneous subordinate clauses joined by single `і` (кома не ставиться) | «сподіваюся, що ви були ним задоволені**, і** що вам сподобалися всі програми» | delete comma before `і що` |
| L5 | 26 | Comma between homogeneous predicates sharing subject `ми`, joined by single `і` | «бо ми тут поруч із морем**, і** повинні зрозуміти почуття моря» | delete comma before `і повинні` |
| L6 | 26 | Lexical calque «дало народження» (word-for-word *gave birth*), not idiomatic Ukrainian | «бо воно **дало народження** Лакшмі» | `дало народження Лакшмі` → `породило Лакшмі` |
| L7 | 27 | Missing comma after `і` before detachable adverbial-participle phrase (дієприслівниковий зворот) | «сказати намаскар морю, і **виходячи з нього,** ви також» | `і виходячи з нього,` → `і, виходячи з нього,` |
| L8 | 28 | `Насамперед` is not a parenthetical word; it takes no comma | «**Насамперед,** цей Махаґуру – той, хто створює для нас сіль» | delete comma after `Насамперед` |
| L9 | 37 | Faulty government (керування): `стосунки` requires `з + оруд.`, not `до + род.`; only `повага` governs `до` | «Я маю особливі **стосунки й повагу до цього моря**» | → `стосунки з цим морем і повагу до нього` |
| L10 | 21 | Agreement `молодь` (sg. collective) … `їх` (pl.) | «лише молодь Мумбаї виконала колосальну роботу, і Я вітаю **їх**» | (candidate) → `її` |
| L11 | 41 | Comma instead of colon before quoted inner speech | «і ви не розумітимете чому**,** «Я роблю все. Я роблю це»» | (candidate) `чому,` → `чому:` |
| L12 | 24 | Colon before adversative clause | «спосіб справляти враження на інших**: але** не в нашій Сахаджа Йозі» | (candidate) `:` → ` – ` |

Deity-pronoun capitalization for Shri Mataji (Я/Мене/Мені/Моє/Моя/Мою/зі Мною/Ти)
is correct throughout, including quoted devotees' `Ти вилікуй` (¶40); generic `я`
in the self-talk affirmation (¶45) correctly stays lowercase mid-sentence.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 23 | Transliteration: `Шріфала` breaks the aspirate `ph → пх` convention (cf. `дх`: бандхан, Вішуддхі; `тх`: Хатха) and the corpus form `Шріпхала` (1982-08-22 talk) | «цей плід кокоса називається **Шріфала**, бо він – Сахасрара» | `Шріфала` → `Шріпхала` |
| S2 | 48 | Ceremony name lowercase; glossary rule capitalizes `Пуджа` (ceremony name), and this file already renders lowercase EN "puja" as `Пуджу/Пуджі` (¶17) | «ми проведемо Лакшмі **пуджан**» | `пуджан` → `Пуджан` |
| S3 | 9, 16, 40, 44 | Vocative address "Mother," rendered `Мати` while glossary lists `Матінко (звертання)` | «ми повинні приїхати сюди, **Мати**», «**Мати**, будь ласка, вилікуй…» (6 instances) | (candidate) → `Матінко` |
| S4 | 27 | `намаскар` lowercase vs glossary headword `Намаскар` | «сказати **намаскар** морю» (2 instances) | (candidate) → `Намаскар` |
| S5 | header vs 6 | Place-name inconsistency `Чалмала` (header) vs `Чалмаал` (body) | «Чалмала, Алібаґ» / «До цього села Чалмаал» | (candidate) → unify |
| S6 | 39, 48 | `Море`/`Морю` capitalized vs lowercase `море` elsewhere | «і **Море** тепер може стати парою», «завдяки **Морю**» | (candidate) → `море` |

Verified correct (no change): `Сахаджа Йоґа` (ґ) with locative `в Сахаджа Йозі`;
practitioner `сахаджа йоґ / сахаджа йоґи / сахаджа йоґів` lowercase, plural in `-и`;
`Самореалізація`/`Реалізація` capitalized, `реалізована душа` lowercase; `Лакшмі`,
`Махалакшмі`, `Махакалі`, `Махасарасваті`, `Сахасрара`, `Ґуру`/`Махаґуру`,
`Ґанапатіпуле`, `Ґайквад`, `Сіддхівінаяка` (дх), `Аштавінаяк`, `Варуна`, `тапасья`,
`маріяди`, `бандхан`, `вібрації`, `вібрована вода` per glossary; `Гімалаї` (h→г);
language names `англійська`/`українська` lowercase; `Пуджа`/`Пуджі` capitalized (¶17);
`Бог`/`Богові` and the sea-deity pronoun `Його` (¶27) capitalized as individual deity;
three Goddesses `Богині` capitalized; `дух святих` (¶18) correctly lowercase (saints'
spirit, not the divine Spirit); closing blessing exactly `Нехай Бог благословить усіх
вас!` per the canonical fixed phrase.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine agreement error: no feminine noun exists in the sentence or its neighborhood; the only sensible antecedent is `гроші` (EN "when will you give **it**" = the money), which demands `їх`. The "implied donation" reading requires inventing an unexpressed noun — a native reader stumbles here. |
| L | L2 | **Keep** | Typographic norm: slash between single-word alternatives is written without spaces; the checklist explicitly covers extra spaces around punctuation. Low-risk mechanical fix. |
| L | L3 | **Remove** | Style preference, per explicit prior-critic precedent; «Тим не менш» is widespread and understood, and the corpus contains the same form elsewhere. Not a grammatical fault. |
| L | L4 | **Keep** | Textbook rule: однорідні підрядні частини, з'єднані одиничним `і`, комою не розділяються («…що ви були задоволені і що вам сподобалися…»). Clear-cut punctuation error. |
| L | L5 | **Keep** | Same subject `ми` carries both predicates («поруч із морем» / «повинні зрозуміти») — однорідні присудки with single `і` take no comma. Clear-cut. |
| L | L6 | **Keep** | «дати народження комусь» is not attested Ukrainian idiom — a word-for-word calque of "gave birth". `породило` is minimal, idiomatic, faithful (works for the grandfather-sea, unlike mother-specific `народило`). |
| L | L7 | **Keep** | Дієприслівниковий зворот must be set off on both sides; after `і` the comma is required because the phrase is detachable («і ви також повинні сказати намаскар, виходячи з нього»). Clear-cut. |
| L | L8 | **Keep** | Reference handbooks explicitly list `насамперед` among non-parenthetical words that take no comma. The file itself has it correct in ¶20 («насамперед виженіть з голови…») — internal inconsistency confirms the error. |
| L | L9 | **Keep** | Genuine government error: `стосунки до моря` is ungrammatical (`стосунки з кимось/чимось`); in the original only `повагу` legitimately governs `до цього моря`, leaving `стосунки` dangling. The fix is minimal and preserves the EN zeugma's sense. |
| L | L10 | **Remove** | Constructio ad sensum: `молодь … вітаю їх` follows the plural sense (and EN "I congratulate **them**"); normalizing to `її` would read worse in spoken register. Not a clear error. |
| L | L11 | **Remove** | There is no verb of speaking before the quote, so the direct-speech colon rule does not cleanly apply; the comma mirrors the source's rambling spoken punctuation («why, "I am doing everything…"»). Fidelity precedent governs. |
| L | L12 | **Remove** | The colon mirrors the EN source exactly ("impressing others: not in our Sahaja Yoga"); replacing it is punctuation-style normalization of faithful spoken rhythm, not error correction. |
| S | S1 | **Keep** | High-confidence transliteration error: the convention renders Sanskrit aspirates with `х` (`dh → дх`, `th → тх`, hence `ph → пх`), and the corpus already uses `Шріпхала` (1982-08-22, twice). `Шріфала` is both off-convention and off-corpus. |
| S | S2 | **Keep** | Glossary rule capitalizes `Пуджа` as a ceremony name regardless of EN case, and this very file applies that rule in ¶17 (EN lowercase "puja" → `Пуджу/Пуджі`). `Лакшмі пуджан` names the ceremony of this talk (title: «Шрі Лакшмі Пуджа») — lowercase is internally inconsistent. |
| S | S3 | **Remove** | Corpus precedent is decisive: vocative `Мати` in quoted speech is used across dozens of talks («Мати, я зламав собі спину…», «Так, Мати», «Вибач мене, Мати») alongside `Матінко`; terms_context marks `Матінко` for prayer address specifically. `Мати` is a valid vocative — changing 6 instances would be churn, not correction. |
| S | S4 | **Remove** | Prior-critic precedent: here `намаскар` denotes the act of greeting ("say namaskar"), lowercase in the EN source; the glossary capital applies to the standalone term. |
| S | S5 | **Remove** | The EN source itself is inconsistent (`Chalmala` header / `Chalmaal` body); the translation faithfully mirrors the source proper noun. Out of scope to "correct" the source. |
| S | S6 | **Remove** | The EN source deliberately capitalizes "Sea" in exactly these two spots (personified Mahaguru/grandfather); the translation faithfully mirrors that emphasis. Not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | `її` without feminine antecedent (refers to `гроші`) | «то коли ж ви **їх** дасте?» |
| 2 | 10 | Spaced slash | «садху**/**шахраям» |
| 3 | 23 | Transliteration `Шріфала` (aspirate `ph → пх`; corpus form) | «називається **Шріпхала**» |
| 4 | 25 | Comma between homogeneous subordinate clauses with single `і` | «що ви були ним задоволені **і** що вам сподобалися» |
| 5 | 26 | Comma between homogeneous predicates with single `і` | «бо ми тут поруч із морем **і** повинні зрозуміти» |
| 6 | 26 | Calque «дало народження» | «бо воно **породило** Лакшмі» |
| 7 | 27 | Missing comma after `і` before дієприслівниковий зворот | «морю, і**,** виходячи з нього, ви також» |
| 8 | 28 | Comma after non-parenthetical `насамперед` | «**Насамперед цей** Махаґуру» |
| 9 | 37 | Faulty government `стосунки до` | «стосунки **з цим морем** і повагу **до нього**» |
| 10 | 48 | Ceremony name lowercase | «Лакшмі **Пуджан**» |

## Summary

- Language (L): 12 issues found, 8 approved by Critic
- SY Domain (S): 6 issues found, 2 approved by Critic
- Total corrections applied: **10**

The translation is of high quality: deity-pronoun capitalization is flawless, glossary
terminology is otherwise faithful, and quotation/dash/apostrophe mechanics are clean.
The approved corrections are small precision fixes — four comma-rule errors, one
pronoun-agreement slip, one government error, two lexical/typographic touch-ups, and
two terminology alignments (`Шріпхала`, `Лакшмі Пуджан`). Borderline stylistic and
source-mirroring candidates (vocative `Мати`, «Тим не менш», capitalized `Море`,
`Чалмаал`, lowercase `намаскар`) were deliberately left untouched, consistent with
corpus practice and prior critic precedent.
