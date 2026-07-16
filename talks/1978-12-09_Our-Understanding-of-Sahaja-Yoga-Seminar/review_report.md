# Language Review – Our Understanding of Sahaja Yoga (Seminar), 9 December 1978

**Round 2 – 2026-07-16.** A previous 2+1 review round (see git history of this file)
fixed the systematic `Йога→Йоґа` terminology, «Моя дитина» (¶67), «стані/станом
свідка» (¶85, ¶104), «огризається на свою матір» (¶11) and «якою суворою» (¶71).
This round re-reviewed the full transcript, completed one fix the previous round
missed (¶93) and, with corpus/convention evidence, reversed two of its Critic
verdicts (see notes under the Critic table).

## Process

2+1 agent review of `transcript_uk.txt` against `transcript_en.txt`, the glossary
(`terms_lookup.yaml`, `terms_context.yaml`), and the capitalization/orthography rules
in `glossary/CLAUDE.md`. Two reviewers (L – Language, S – SY Domain) ran independently;
the Critic filtered both tables, removing false positives and trivial style preferences.

Corpus statistics were used to settle convention questions:
- **Ellipsis:** `glossary/CLAUDE.md` explicitly mandates three dots «...»; corpus-wide, 56 transcripts use «...» vs 13 with the single-char «…».
- **«Свій» for Shri Mataji:** the corpus consistently capitalizes the reflexive possessive referring to Shri Mataji («Своїх колін», «Свої руки», «Своїх онучок», «Своєму одязі» — 1975-03-29, 1979-12-30, 1982-09-26, 1983-09-17, 1986-07-13 …).
- **«стан свідка»:** glossary + corpus are lowercase; ¶93 was the last capitalized outlier.
- **«авід’я»:** corpus precedent uses exactly this spelling (1982-09-26 Durga Puja) → not changed.

Paragraph numbers refer to line numbers in `transcript_uk.txt`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 7, 25, 60, 104 | Ellipsis as single character «…» (U+2026); `glossary/CLAUDE.md` specifies three dots «...» | «зі своєю матір’ю…», «кульмінації…»», «до нас… (перерва в записі)…», «проявленим…» | replace all 5 occurrences with «...» |
| L2 | 20 | Missing comma between clauses of a compound sentence with repeated subject «Я» — the only «і Я» junction in the text without one | «пишаюся … сахаджа йоґами і Я люблю їх» | «…сахаджа йоґами, і Я люблю їх» |
| L3 | 58 | Pronoun «її» has no valid antecedent — the sentence has only plural «релігій»/«вони» | «щодо релігій… вони обумовлюють людей, тож люди почали іншу її крайність» | «тож люди почали іншу крайність» |
| L4 | 79 | «кажу одне одному другові» misreads as the reciprocal idiom «одне одному», distorting EN «I say one thing to one friend» | «Тоді, якщо Я кажу одне одному другові, він скаже…» | «Тоді, якщо Я кажу щось одному другові…» |
| L5 | 82 | Active present participle «шокуючий» — non-normative in Ukrainian (норм. «шокувальний») | «є вкрай дивним і шокуючим» | «є вкрай дивним і шокувальним» |
| L6 | 85 | Ungrammatical «це що» (missing correlative «те») | «бо є й інший бік цього – це що ця Ліва Вішуддхі полягає в тому…» | «…– це те, що ця Ліва Вішуддхі полягає в тому…» |
| L7 | 96 | Purpose clause «щоб» combined with future indicative «побояться»; «щоб» requires the past-form subjunctive | «щоб, якщо вони побачать вас чистими й охайними, тоді вони трохи побояться зайти у вас» | «щоб, якщо вони побачать вас чистими й охайними, вони трохи побоялися зайти у вас» |
| L8 | 100 | Direct speech after «сказав:» opens with a lowercase letter | «тож він сказав: «скажіть їм не їздити так швидко.» | «тож він сказав: «Скажіть їм не їздити так швидко.» |
| L9 | 7, 51 | «Кекстон-Холі» — правопис writes the generic word «хол» lowercase in such names (пор. «Карнеґі-хол») | «Ти казала в Кекстон-Холі» | «в Кекстон-холі» |
| L10 | 23 | Euphony: «з» before sibilant «С»; правопис recommends «із» | «пульсація з Самості» | «пульсація із Самості» |
| L11 | 78 | Dangling adverbial participle: «кажучи» does not share its subject with «его» | «люди навіть чинять гріх, бо їхнє его задоволене, кажучи: …» | rephrase («…задовольняється, коли вони кажуть:») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 20 | Reflexive possessive «свій» referring to Shri Mataji written lowercase; corpus convention capitalizes it | «Але Я дуже пишаюся своїми сахаджа йоґами» | «…пишаюся Своїми сахаджа йоґами» |
| S2 | 93 | «Стан Свідка» capitalized — contradicts glossary («witness state – стан свідка»), the same talk (¶85, ¶104 lowercase) and the whole corpus; missed by the previous round | «якщо ви краще розвинете свій Стан Свідка» | «…свій стан свідка» |
| S3 | 27 | «авід’я» — glossary pattern for *vidya* is «Відья» («Нірмала Відья») | «а решта – все авід’я» | «авідья» |
| S4 | 92 | «аджван ка дхуні» differs from glossary entry «ajwain dhuni – аджван дхуні» | «це аджван ка дхуні» | «аджван дхуні» |
| S5 | 72 | «ананда» lowercase; glossary lists «Ananda – Ананда» | «але як же ананда, радість?» | «Ананда» |
| S6 | 58 | «обумовленням/розобумовленням» vs glossary term «обумовленість» | «Одне було обумовленням, інше – розобумовленням» | «обумовленістю/розобумовленістю» |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | The written project convention (`glossary/CLAUDE.md`: ellipsis is «...») overrides corpus drift; file-level majority (56 vs 13 transcripts) also favours «...». *Reverses the Round-1 verdict*, which treated both glyphs as accepted — a convention explicitly stated in the project rules is not optional. |
| L | L2 | **Keep** | Two clauses with the repeated subject «Я» form a compound sentence → comma required; every other «, і Я» junction in this transcript has it. *Reverses the Round-1 verdict* («optional»): the norm plus internal consistency make it a genuine fix, and it rides along with the S1 edit in the same sentence. |
| L | L3 | **Keep** | Genuine reference error: singular feminine «її» cannot refer to plural «релігій». Dropping «її» is the minimal, meaning-preserving fix matching EN «the other side of it». |
| L | L4 | **Keep** | Genuine ambiguity: «одне одному» is a fixed reciprocal expression, so the sentence is misread on first pass. «щось одному другові» preserves the meaning without the collision. |
| L | L5 | **Keep** | Active participles in -уч(ий) are non-normative in standard Ukrainian; «шокувальний» is the registered normative form. |
| L | L6 | **Keep** | «це що» is ungrammatical; inserting «те,» fixes the grammar with zero content change. The remaining awkwardness mirrors the broken English original and is preserved deliberately. |
| L | L7 | **Keep** | «щоб» + future indicative is a real grammar error, not a preference; past-form subjunctive «побоялися» required («тоді» belonged to the broken construction and is dropped). |
| L | L8 | **Keep** | Ukrainian direct speech introduced by «сказав:» starts with a capital letter (the EN lowercase «tell them» merely continues its own sentence). |
| L | L9 | **Remove** | False positive in context: internally consistent here (¶7, ¶51), and the corpus elsewhere uses capitalized variants («Кекстон Холл», «Кекстон Хол»). Changing it would create new cross-corpus inconsistency; transliteration latitude for a proper name. |
| L | L10 | **Remove** | Trivial: euphonic «з/із» before sibilants is a recommendation; the text consistently uses «з с-» («згідно з санскритом»). Style preference, not an error. |
| L | L11 | **Remove** | The dangling participle mirrors the EN source structure («their ego is satisfied by saying»); rewriting would trade transcript fidelity for no gain in meaning. |
| S | S1 | **Keep** | Corpus-wide convention confirmed by grep: «Свої/Своїх/Своїм/Своєму» is capitalized for Shri Mataji across many talks; «Я/Мене» in the same sentence are already uppercase. |
| S | S2 | **Keep** | Glossary is explicit (lowercase), both other occurrences in this talk are lowercase, and ¶93 was the sole capitalized outlier in the entire corpus. Completes the Round-1 fix that covered only ¶85 and ¶104. |
| S | S3 | **Remove** | False positive: corpus precedent uses exactly «авід’я» (1982-09-26 Durga Puja talk); changing it here would break existing corpus consistency. Matches the Round-1 verdict. |
| S | S4 | **Remove** | False positive: the EN source literally says «ajwain **ka** dhuni» (Hindi genitive particle); the translation faithfully transliterates the spoken phrase. The glossary lists only the base term. |
| S | S5 | **Remove** | False positive: EN has lowercase generic «the ananda, the joy» — an appositive common-noun gloss, not the name of a state. Lowercase is contextually correct. Matches the Round-1 verdict. |
| S | S6 | **Remove** | False positive: «обумовлення/розобумовлення» are process nouns («One was conditioning, the other was deconditioning» — actions). The glossary term «обумовленість» names the state; substituting it would shift the meaning. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 7 | «зі своєю матір’ю…» (U+2026) | «зі своєю матір’ю...» |
| 2 | 20 | «пишаюся своїми сахаджа йоґами і Я люблю їх» | «пишаюся Своїми сахаджа йоґами, і Я люблю їх» |
| 3 | 25 | «досягла кульмінації…»» (U+2026) | «досягла кульмінації...»» |
| 4 | 58 | «почали іншу її крайність» | «почали іншу крайність» |
| 5 | 60 | «до нас… (перерва в записі)… тримати» (U+2026 ×2) | «до нас... (перерва в записі)... тримати» |
| 6 | 79 | «якщо Я кажу одне одному другові» | «якщо Я кажу щось одному другові» |
| 7 | 82 | «є вкрай дивним і шокуючим» | «є вкрай дивним і шокувальним» |
| 8 | 85 | «інший бік цього – це що ця Ліва Вішуддхі» | «інший бік цього – це те, що ця Ліва Вішуддхі» |
| 9 | 93 | «розвинете свій Стан Свідка» | «розвинете свій стан свідка» |
| 10 | 96 | «щоб, якщо вони побачать вас чистими й охайними, тоді вони трохи побояться зайти у вас» | «щоб, якщо вони побачать вас чистими й охайними, вони трохи побоялися зайти у вас» |
| 11 | 100 | «тож він сказав: «скажіть їм…» | «тож він сказав: «Скажіть їм…» |
| 12 | 104 | «Якщо Я бачу проявленим…» (U+2026) | «Якщо Я бачу проявленим...» |

## Summary

- **Language (L):** 11 issues found, 8 approved by Critic.
- **SY Domain (S):** 6 issues found, 2 approved by Critic.
- **Total corrections applied:** 12 edits (10 approved findings; L1 spans 4 paragraphs / 5 glyphs, and ¶20 combines L2 + S1 in one sentence).

The translation remains high-quality after Round 1: deity-pronoun capitalization
(Я/Мені/Ти/Тобі for Shri Mataji; Він/Його for God/Spirit; lowercase for regular
people, with sentence-initial capitals inside quotes correctly distinguished) is
applied consistently; glossary terms (Кундаліні, Войд, Свадхістхана, Вішуддхі, Аґія,
бхути, бадхи, Вірата, танматри, сахаджа йоґ/йоґиня, «в Сахаджа Йозі») are correct;
quotation marks «» including nested quotes, em-dashes ` – ` with spaces, and the
apostrophe ’ (U+2019) are used correctly throughout. Many superficially awkward
constructions deliberately mirror the fragmented spoken English original and were
left untouched per transcript-fidelity practice.
