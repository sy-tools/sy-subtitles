# Language Review – 1997-07-20_Guru-Puja-A-Guru-Should-Be-Humble-And-Wise, 2026-07-17

## Process

2+1 agent language review of `transcript_uk.txt` against the English original
(`transcript_en.txt`), the SY glossary (`glossary/CLAUDE.md`,
`terms_lookup.yaml`, `terms_context.yaml`) and the project orthography rules.

Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic
filtered both tables and resolved verdicts; approved corrections were applied.

Paragraph numbers below refer to line numbers in `transcript_uk.txt`.

> **Prior passes.**
> - 2026-05-30: 4 corrections applied (direct-speech capitalization ¶14, stray
>   `»` ¶19, `…` → `...` ¶24/¶37).
> - 2026-06-20: 1 correction applied (Russianism `слідувати` →
>   `дотримуватися` ¶13). That pass's Critic also **rejected on the record**:
>   `?` → `.` in ¶10 (rhetorical-question intonation preserved from EN);
>   capitalizing `адхарма` ¶9; capitalizing `вона` for Парамчайтанья ¶13 and
>   `божественне світло` ¶32–33; uppercasing pronouns of Sita and the brother
>   in the Shri Rama anecdote ¶27 (focus-based convention: only the venerated
>   Deity of the anecdote takes uppercase). Where the current reviewers re-raised
> these items, the Critic upheld the documented precedents instead of churning
> the text; they are **not** re-counted as new corrections.

### Automated typography pass (clean)

- No Latin characters mixed into Cyrillic words.
- No straight `"`/`'`, no German `„"`; quotation marks `«»` at all levels,
  balanced, including nested quotes (¶18, ¶19).
- All dashes are spaced en-dash ` – ` (U+2013); no em-dash, no hyphen-as-dash.
- Apostrophe is `’` (U+2019) throughout; ellipsis is literal `...` (no U+2026);
  no double spaces, no space before punctuation.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶10 | Declarative main clause + indirect question ends with `?` | «Тож нам слід подивитися, як розвинути ці сили всередині нас**?**» | (considered) `?` → `.` |
| L2 | ¶22 | Contaminated construction «оскільки…, що» (mixes «оскільки…, то» with «так…, що») | «Але оскільки з чорними так погано поводилися, **що** вони реагують» | «…так погано поводилися, **то** вони реагують» |
| L3 | ¶23 | Missing dash at the omitted predicate in an elliptical sentence | «Усі проблеми сьогоднішнього світу, якщо придивитися, через людську прив’язаність…» | «…якщо придивитися, **–** через людську прив’язаність…» |
| L4 | ¶28 | Invalid government: «непокоїтися, щоб» + infinitive cannot express eagerness (EN "very anxious to eat") | «багатьох, хто дуже **непокоїться, щоб** з’їсти їжу, щойно її подадуть» | «багатьох, хто дуже **переймається тим, щоб** з’їсти їжу…» |
| L5 | ¶32 | Gender agreement broken between frame and quote: «є людина… Тоді вона почне казати» → quote in masculine | «Тоді вона почне казати: «А як же це? Я **хотів** цього…»» | «Я **хотіла** цього» |
| L6 | ¶32 | Pronoun «він» with no matching antecedent (preceding subjects «людина/вона», «інша») | «Або ж і в центрі **він** теж може подумати» | (considered) «людина в центрі» |
| L7 | ¶34 | Unjustified comma between the verb phrase and its manner adverbial («у такий… спосіб, що» is a correlative unit) | «зв’язувати людей разом**,** у такий лагідний спосіб, що люди стають ближчими» | «зв’язувати людей разом у такий лагідний спосіб, що…» |
| L8 | ¶36 | Anacoluthon: bare infinitive «а сказати» does not attach to «не повинно відчуватися, що…» | «…що їх скривдить, а **сказати** це так, щоб…» | «…а **слід сказати** це так, щоб…» |
| L9 | ¶39 | Invalid government: «стежити за тим, що» + declarative clause (valid only with relative «що» = «за подіями») | «Але слід завжди **стежити за тим, що**, оскільки ви тепер маєте стати Ґуру…» | «Але слід завжди **пам’ятати про те, що**, оскільки…» |
| L10 | ¶39 | Lexical misuse: «зір» = physical eyesight; EN "widened vision" (outlook) = «бачення» (2 occurrences) | «Тож таким має бути ваш розширений **зір**.» / «А треба мати дуже розширений **зір**.» | «ваше розширене **бачення**» / «дуже розширене **бачення**» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ¶12 | Pronoun in a quote addressed to Shri Mataji lowercase — uppercase per deity-pronoun rule? | «Дехто думає: «Якщо **ви** смиренні, Матінко, то люди скористаються **вами**»» | (considered) «Ви… Вами» |
| S2 | ¶27 | Pronoun of Sita (Incarnation, wife of Shri Rama) lowercase, while Shri Rama's are uppercase | «Тоді **вона** їсть і каже: «Дівере…»» | (considered) «Вона» |
| S3 | ¶27 | Pronouns of the brother (Lakshmana) lowercase | «тож **йому** це не подобається… і **він** гнівається» | (considered) «Йому… Він» |
| S4 | ¶18, ¶39 | Reflexive possessive «свій» referring to Shri Mataji lowercase | «Ти отримаєш тисячі й тисячі **своїх** учнів»; «Я маю **свої** сімейні обов’язки» | (considered) «Своїх», «Свої» |
| S5 | ¶37 | EN "Tredas?" is likely a mis-transcription of Ravidas (the cobbler saint) | «Погляньте на **Тредаса** – він був просто шевцем.» | (considered) «Равідаса» |
| S6 | ¶32–33 | "divine light" lowercase — capitalize as a sacred term? | «бачить усе в **божественному світлі**» | (considered) «Божественне Світло» |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | **Precedent upheld** (2026-06-20 pass, L2): the EN source poses this as a rhetorical question ("…we should see?"); the `?` preserves Shri Mataji's questioning intonation. A previously adjudicated judgment call is not re-applied absent clear error. |
| L | L2 | **Keep** | «оскільки…, що» is ungrammatical contamination of two constructions; the minimal fix «то» restores the causal correlative without touching the sentence's rhythm. |
| L | L3 | **Keep** | The predicate is omitted («виникають»); Ukrainian norm requires a dash at the ellipsis point. The parenthetical «якщо придивитися» keeps its commas: «…, якщо придивитися, – через…». |
| L | L4 | **Keep** | «непокоїться, щоб з’їсти» is not valid Ukrainian government for "anxious to eat" («непокоїтися, щоб…» = "worry lest"); «переймається тим, щоб» keeps the anxious nuance grammatically. |
| L | L5 | **Keep** | Direct agreement break inside one sentence frame: «людина… вона почне казати: «Я хотів»». Feminine «хотіла» agrees with the established frame noun and pronoun. |
| L | L6 | Remove | Mirrors the EN's own generic "he"; the three examples (right-sided, left-sided, centre) each stand alone and «він» reads as the generic person. Rewording is stylistic. |
| L | L7 | **Keep** | The comma splits «зв’язувати… у такий спосіб, що» — a correlative unit. Not a valid уточнення: «у такий лагідний спосіб» does not clarify «разом» (category mismatch). Syntactic error, not style. |
| L | L8 | **Keep** | Real anacoluthon in Ukrainian: a bare infinitive cannot be coordinated with «не повинно відчуватися, що…»; inserting «слід» is the minimal repair, faithful to EN "but say it in such a manner". |
| L | L9 | **Keep** | «стежити за тим, що + declarative clause» is invalid government; «пам’ятати про те, що» matches EN "one should always see that" with minimal intervention. |
| L | L10 | **Keep** | «зір» denotes physical eyesight; «розширений зір» misrenders EN "widened vision" (breadth of outlook). «Бачення» is the correct lexeme; both occurrences fixed, with gender adjustment («ваше розширене»). |
| S | S1 | Remove | **False positive.** The "you" in the quote is generic — the yogi speaking about themselves while addressing Mother vocatively ("if one is humble, people take advantage of you"). Confirmed by Shri Mataji's reply, which addresses the yogis: «Ніхто не зможе скористатися вами, бо ви… під захистом… Парамчайтаньї». Uppercasing would invert the meaning. |
| S | S2 | Remove | **Precedent upheld** (2026-06-20 pass, S3): the anecdote applies a consistent focus-based convention — only the venerated Deity of the story (Shri Rama) takes uppercase pronouns; uppercasing only Sita would break that internal consistency, and the brother cannot be uppercased (see S3). |
| S | S3 | Remove | The brother is unnamed («брат») and deliberately portrayed as an ordinary imperfect seeker («ще на півдорозі в Сахаджа Йозі… гнівається»); the humour depends on his human register, and Shri Rama's own quoted speech addresses him as «ти». Lowercase is intentional and consistent. |
| S | S4 | Remove | The capitalization rule enumerates Я/Мені/Мій/Моя/Вона/Її/Їй (second-person Ти applied by extension); the reflexive «свій» is not covered, and the text is internally consistent (lowercase in both ¶18 and ¶39). Not an error. |
| S | S5 | Remove | **Source fidelity.** The EN transcript itself reads "Tredas?" (transcriber-marked uncertainty). The translation must follow the published source; emending to «Равідас» is speculation outside the reviewer's mandate. |
| S | S6 | Remove | **Precedent upheld** (2026-06-20 pass, S2): "divine light" is not in the mandated capitalization list (Дхарма, Інкарнація, Пуджа, Дух, Істина, Стопи); EN is lowercase; all five occurrences are consistently lowercase. Style preference, not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶22 | «так погано поводилися, **що** вони реагують» | «так погано поводилися, **то** вони реагують» |
| 2 | ¶23 | «якщо придивитися, через людську прив’язаність» | «якщо придивитися, **–** через людську прив’язаність» |
| 3 | ¶28 | «хто дуже **непокоїться, щоб** з’їсти їжу» | «хто дуже **переймається тим, щоб** з’їсти їжу» |
| 4 | ¶32 | «Я **хотів** цього» (frame: «людина… вона почне казати») | «Я **хотіла** цього» |
| 5 | ¶34 | «зв’язувати людей разом**,** у такий лагідний спосіб» | «зв’язувати людей разом у такий лагідний спосіб» |
| 6 | ¶36 | «що їх скривдить, а **сказати** це так» | «що їх скривдить, а **слід сказати** це так» |
| 7 | ¶39 | «слід завжди **стежити за тим**, що» | «слід завжди **пам’ятати про те**, що» |
| 8 | ¶39 | «ваш розширений **зір**» / «дуже розширений **зір**» (2 місця) | «ваше розширене **бачення**» / «дуже розширене **бачення**» |

## Summary

- Language (L): 10 issues found, 8 approved by Critic
- SY Domain (S): 6 issues found, 0 approved by Critic
- Total corrections applied this pass: **8** (9 text edits — correction #8 covers
  two occurrences). Prior passes: 2026-05-30 — 4; 2026-06-20 — 1.

### Notes (verified correct — no change needed)

The translation is of high quality. The following were checked and confirmed correct:

- **Deity-pronoun capitalization** consistent throughout: Shri Mataji always
  uppercase (`Я/Мені/Мене/Мною/Моєю`, address `Ти/Матінко`, `Матері` ¶40);
  Incarnations in focus uppercase (`Христос – Він` ¶25; Shri Rama `Він/Його/Йому`
  and quoted `Я` ¶27); the generic aspirant guru lowercase (`він` ¶32–33); false
  gurus lowercase (`ґуру` ¶20, ¶36) vs the true `Ґуру` uppercase — a deliberate,
  consistently applied distinction; regular people lowercase (incl. quoted speech
  of the person in ¶12/¶16: sentence-initial `Я`, mid-quote `я/мені`).
- **Glossary terminology / transliteration**: `Парамчайтанья` (fem. agreement
  correct), `Дхарма` vs lowercase `адхарма` (negation), `абсолютна Істина`,
  `Реалізація/Самореалізація`, `Шастри`, `«калатіт»`, `«ґунатіт»`, `ґуни`,
  `лівостороння`/`права сторона`, `его/суперего`, `обумовленості`, `ашрам`,
  `вібрації`, `Тукарам`, `Кабір`, `Намадева`, `Шрі Рама`, `Будда`, `санскрит`
  (lowercase). ґ/дх/і transliteration per Mantra Book conventions (`Ґуру`,
  `ґуджаратці`, `Ґуру Падва`).
- **Sahaja Yoga inflections**: `Сахаджа Йоґа/Йоґи/Йоґу/Йоґою`, locative/dative
  `Сахаджа Йозі` (ґ→з) correct throughout; plural `сахаджа йоґи/йоґів/йоґам`
  (hard stem, never «йоґі»).
- **Lowercase** language/ethnicity/ideology names: `англійська`, `українська`,
  `християнин`, `єврей`, `росіяни`, `ґуджаратці`, `суфії`, `комунізму`;
  `Захід/Схід` (regions) uppercase; `Бог/Боже/Богом`, `Всемогутній Бог` uppercase.
- **Punctuation**: `«»` at all levels incl. nesting (¶18, ¶19); spaced en-dash;
  apostrophe `’`; `...` ellipses (¶24, ¶37); number formatting (`50 000`, `4000`,
  `300 доларів`); vocative forms (`Матінко`, `Пане`, `Дівере`) correct.
