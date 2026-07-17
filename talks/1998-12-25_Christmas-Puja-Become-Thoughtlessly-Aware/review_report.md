# Language Review – 1998-12-25_Christmas-Puja-Become-Thoughtlessly-Aware, 2026-07-17

## Process

Review `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter.

- **Reviewer L** – Language (Orthography + Grammar + Punctuation)
- **Reviewer S** – SY Domain (Capitalization + Terminology + Consistency)
- **Critic** – Filters false positives and trivial findings, resolves overlaps, has final say.

Paragraph numbers below refer to source line numbers in `transcript_uk.txt`.

> **Note:** Third review pass. Two prior reviews (2026-05-30, 2026-06-20) are on record.
> Their adjudications were honoured (see Critic verdicts on L26, L27, S2, S3). Re-verification
> of the previously applied fixes found **one regression**: the transcript-wide spaced
> en-dash ` – ` (attested in the 2026-06-20 report notes and used by every other transcript
> in the corpus) had been flipped to em-dash ` — ` (100×) — restored by this pass (L1).
> All other prior fixes (Сахаджа Йоґа ґ ×13, ellipsis `...`, «якого», «імена», «це те, що»,
> Чайтанья case) verified intact.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all | Em-dash ` — ` (100×) instead of the project-standard spaced en-dash ` – ` (`glossary/CLAUDE.md`; 100 % of the corpus; regression vs the 2026-06-20 reviewed state). | «Він **—** Той, Хто дав нам взірець…» | ` — ` → ` – ` globally |
| L2 | all | Sentence-final period placed **inside** the closing quote (25×), against Ukrainian orthography (крапка після лапок) and corpus convention; the file itself already had 4 correct `».` — a mixed style within one transcript. `?»`/`!»` correctly stay inside. | «…не розуміють духовності**.»** | `.»` → `».` (23 remaining after L6) |
| L3 | 9 | Calqued idiom «за найменшим приводом» (рос. «по малейшему поводу»). | «**За найменшим приводом** вони вбивають людей.» | «**З найменшого приводу** вони вбивають людей.» |
| L4 | 9 | «оскаржувати» вживається щодо рішень/вироків, не осіб — хибна сполучуваність для EN "he is not challenged". | «то **його** ніхто не **оскаржує** – ніколи» | «то **йому** ніхто не **заперечує** – ніколи» |
| L5 | 12 | Redundant resumptive «їх» duplicating fronted «тих, хто…». | «тих, хто говоритиме… Він не впізнає **їх**» | drop «їх» |
| L6 | 20 | Direct-speech attribution garbled: «— сказала Я. — «Згодна.»» pins the American yogis' words («Ті, хто не медитує, не є сахаджа йоґами») on Shri Mataji, contradicting «Я запитала: «Чому?»» just before. EN: “…are not Sahaja Yogis.” I said. “I agree.” | «…не є сахаджа йоґами.» — сказала Я. — «Згодна.»» | «…не є сахаджа йоґами». Я сказала: «Згодна».» |
| L7 | 28 | Extra comma between fronted adverbial and clause (EN-comma calque). | «Без Реалізації**,** як ви можете говорити про тонші речі?» | «Без Реалізації як ви можете…» |
| L8 | 34 | Extra comma between fronted adverbial and clause. | «Через вашу увагу**,** вона працює зі Мною» | «Через вашу увагу вона працює…» |
| L9 | 37 | Number agreement: plural «Ви єдині» + singular «самим собою». | «Ви єдині із **самим** собою.» | (consider «самими») |
| L10 | 39 | Generic institutional reference capitalised after EN "the Medical College". | «а в **М**едичному коледжі ніхто не викладав» | «в **м**едичному коледжі» |
| L11 | 18 | «незалежність» уppercase in a generic running-text reference (India's independence); правопис reserves the capital for official names/holidays. | «після здобуття **Н**езалежності» | «після здобуття **н**езалежності» |
| L12 | 44 | Дієприслівниковий зворот not closed off on the left: comma required after «що». | «у тому, що навіть приїхавши до Махараштри, Я мушу» | «у тому, що**,** навіть приїхавши до Махараштри, Я мушу» |
| L13 | 45 | Aspect clash: «вміти» + perfective infinitive. | «Якщо ви **вмієте вивчити** маратхі» | «Якщо ви **зможете вивчити** маратхі» |
| L14 | 45 | Pronoun «У ньому» with no masculine antecedent (the noun «переклад» is only implied). | «…зробила це мовою маратхі. **У ньому** вона використала імена маратхі» | (consider «У цьому перекладі») |
| L15 | 46 | Збіг сполучників «що коли» without correlative «то» → comma mandatory. | «написала в ній, що коли Христос пішов на весілля, Він перетворив» | «що**,** коли Христос пішов на весілля, Він…» |
| L16 | 46 | Question mark after an **indirect** question (правопис: не ставиться). | «Я не знаю, чи ви коли-небудь чули поетичний твір з описом дитинства Христа**?**» | «…дитинства Христа**.**» |
| L17 | 49 | Non-normative collocation «вчитися від когось» (норма: «вчитися в/у когось»). | «Вони не вчилися б нічого **від** британців.» | «…нічого **в** британців.» |
| L18 | 49 | «самоповажний» — non-existent word (calque of "self-esteemed"). | «люди з Мевару дуже **самоповажні**» | «люди з Мевару **мають велику самоповагу**» |
| L19 | 51 | «чиюсь» misrenders EN "below one's dignity" (= власну, not «чиюсь»). | «нижчим за **чиюсь** гідність і статус» | «нижчим за **власну** гідність і статус» |
| L20 | 52 | Ungrammatical intensifier + noun «дуже правда». | «І Я бачила, що це **дуже правда**.» | «…що це **щира правда**.» |
| L21 | 52 | Question mark after an indirect question. | «Я дивувалася, що ж ці люди зрозуміють**?**» | «…що ж ці люди зрозуміють**.**» |
| L22 | 53 | «потуральний» — non-existent word; «місцем потурань» — verbal noun stranded without object. EN: "a place of indulgence… they were all indulgent and carefree". | «був **місцем потурань** – їж, пий і веселися – вони всі **були потуральними** й безтурботними» | «був **місцем утіх** – їж, пий і веселися – вони всі **потурали собі й були** безтурботними» |
| L23 | 53 | Comma between fronted object group and subject misparses; the anacoluthon pause takes a dash. | «Усі їхні стосунки, дискусії**,** Я просто не могла зрозуміти.» | «…стосунки, дискусії **–** Я просто не могла зрозуміти.» |
| L24 | 54 | Милозвучність: «із» перед «з-» (правопис). | «кепкування **з з**овиці» | «кепкування **із з**овиці» |
| L25 | 56 | Passive participle with an agent takes one «н» («благословена»); «благословенна» is the adjective. | «земля, була **благословенна** різними аспектами Деві» | «була **благословена** різними аспектами Деві» |
| L26 | 8 | Parenthetical «певна» reads clipped; corpus standard «Я певна». | «яка, **певна**, не дуже зрозуміла» | (consider «Я певна») |
| L27 | 45 | Numeric range with hyphen. | «щонайменше **8-9** із цих чотирнадцяти мов» | «**8–9**» |
| L28 | 59 | «вузькоглядність» — dictionary form uncertain (пор. «обмеженість», «вузьколобість»). | «своєрідна **вузькоглядність**» | (consider «обмеженість») |
| L29 | 60 | Extra comma after fronted «замість + Р.в.» phrase. | «замість Ґанапатіпуле**,** Тобі варто провести» | «замість Ґанапатіпуле Тобі варто…» |
| L30 | 60 | «жити **в** землі» = to lie buried; the meaning is "lived in this land". | «Святі… **жили в цій землі**.» | «жили **на** цій землі.» |
| L31 | 61 | Wrong government: «нести щось **в когось**» (норма: «нести щось **комусь**»). | «щоб ви несли пробудження **в кожного**» | «несли пробудження **кожному**» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 40, 42, 43, 49, 50 | Demonym «**маг**араштрійці» (5×) contradicts «**Мах**араштра/Махараштрі» (х, 60+×) in the same file; all other corpus talks (1979-12-30, 1983-03-30, 1989-08-08) use «махараштрійці». | «Бо **магараштрійці** говорять лише так» | «**махараштрійці** / махараштрійця» (5×) |
| S2 | 29 | Glossary lists «Akasha → **Акаша**», here lowercase «акаша / акаші». | «ми називаємо її **акаша**», «стану **акаші**» | (consider «Акаша») |
| S3 | 21 | «груповщина» — Russian-pattern suffix -овщина (пор. словникове «групівщина»). | «одна з них — це **груповщина**» | (consider «групівщина») |
| S4 | 31 | Glossary lists «Namaskar → **Намаскар**», here lowercase in a greeting. | «Гаразд, **намаскар**» | (consider «Намаскар») |
| S5 | 8 | EN "reincarnation of Shri Ganesha" rendered «втіленням», while the glossary term is «Інкарнація». | «Він є **втіленням** Шрі Ґанеші» | (consider «Інкарнацією») |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Not a preference: `glossary/CLAUDE.md` mandates spaced ` – `; every other transcript in the corpus complies; and the 2026-06-20 report attests this very file used ` – ` — the em-dashes are a later regression. Restoring the adjudicated state. |
| L | L2 | **Keep** | Ukrainian orthography is unambiguous (full stop follows the closing «»; only `?`/`!` stay inside), the corpus convention is overwhelmingly `».`, and the file mixed both styles (25 inside vs 4 outside) — exactly the "mixed styles within one transcript" defect the template targets. |
| L | L3 | **Keep** | Real idiom calque; «з найменшого приводу» is the Ukrainian form. |
| L | L4 | **Keep** | Genuine collocation error: «оскаржувати» takes decisions/verdicts, not persons. «йому ніхто не заперечує» keeps the meaning of "he is not challenged". |
| L | L5 | **Remove** | The resumptive pronoun mirrors the EN anacoluthon ("those who will talk…, He will not recognize them") — faithful rendering of spoken syntax, not a translation-side error. |
| L | L6 | **Keep** | Real misattribution, not style: the quote belongs to the yogis criticising the Americans; Shri Mataji answers «Згодна». Current punctuation says the opposite of the EN source. |
| L | L7, L8 | **Keep** | Extra commas after fronted adverbials are EN-comma calques, non-normative in Ukrainian; the file's own parallel «Своєю увагою Я опрацьовую…» (para 34) is comma-free. |
| L | L9 | **Remove** | Distributive singular («кожен — єдиний із самим собою») is defensible in the spoken register; not an unambiguous error. |
| L | L10, L11 | **Keep** | Ukrainian does not inherit English capitalisation of generic references; «медичний коледж» and «здобуття незалежності» are common nouns here (capital reserved for official names/holidays). |
| L | L12, L15 | **Keep** | Both commas are mandated by the правопис (дієприслівниковий зворот must be bracketed; збіг сполучників «що, коли» without «то» takes the comma) — cf. the correctly-punctuated «що якщо…, то» in para 11. |
| L | L13 | **Keep** | «вміти» + perfective infinitive is an aspect error; «зможете вивчити» matches EN "if you can learn". |
| L | L14 | **Remove** | Antecedent («переклад») is recoverable from the immediately preceding «вона переклала… зробила це мовою маратхі»; spoken-style ellipsis, not a genuine ambiguity. |
| L | L16, L21 | **Keep** | Правопис: no question mark after indirect questions («чи ви коли-небудь чули…», «що ж ці люди зрозуміють»). Direct-form questions after a dash (para 15) correctly keep «?» and were not touched. |
| L | L17 | **Keep** | Normative collocation is «вчитися в/у когось». |
| L | L18, L22 | **Keep** | «самоповажний» and «потуральний» are non-existent words (calques of "self-esteemed" / "indulgent") — vocabulary errors, not taste. Replacements are minimal and faithful. |
| L | L19 | **Keep** | Meaning error: "below one's dignity" is «нижче власної гідності»; «чиюсь» points at someone else's dignity. |
| L | L20 | **Keep** | «дуже правда» (adverb of degree + noun) is ungrammatical; «щира правда» is the idiomatic equivalent of "very true". |
| L | L23 | **Keep** | The comma between the fronted objects and «Я» invites a misparse; the dash is the normative device for this anacoluthon. |
| L | L24 | **Keep** | Правопис prescribes «із» before an initial «з-»; «з зовиці» is a genuine euphony violation, not a preference. |
| L | L25 | **Keep** | With the instrumental agent («різними аспектами Деві») this is a passive participle → one «н». The «нн» form asserts a quality and is orthographically wrong here. |
| L | L26 | **Remove** | Adjudicated and removed in BOTH prior reviews (2026-05-30, 2026-06-20) as spoken-register parenthetical — concur; stability of adjudications matters. |
| L | L27 | **Remove** | Adjudicated and removed in the 2026-06-20 review as trivial typography — concur. |
| L | L28 | **Remove** | Plausible productive coinage (пор. «далекоглядність»); understandable in the spoken register; dictionary status too uncertain to call it an error. |
| L | L29 | **Keep** | Comma after a fronted «замість + Р.в.» phrase is non-normative. |
| L | L30 | **Keep** | Real collocation/meaning error: «жити в землі» means to lie in the ground; saints lived **on** this land. |
| L | L31 | **Keep** | Government error: «нести щось комусь», not «в когось». |
| S | S1 | **Keep** | Internal inconsistency (г-demonym vs х-toponym in one file) plus a unanimous corpus precedent («махараштрійці» in all three other talks that use the word). Prior reviews quoted the word only in a lowercase-check context and never adjudicated г/х. |
| S | S2 | **Remove** | Adjudicated and removed in the 2026-06-20 review: lowercase «акаша» parallels the sibling elements (теджас/джала/прітхві/агні) and mirrors EN casing; only the compound «Акаша Таттва» is capitalised — concur. |
| S | S3 | **Remove** | Adjudicated and removed in BOTH prior reviews; also embedded in the released `final/uk.srt` — concur. |
| S | S4 | **Remove** | The glossary entry is a citation form; as a mid-sentence greeting-interjection lowercase is natural, and the corpus precedent (1991-12-29 talk) is lowercase too. |
| S | S5 | **Remove** | «втілення» is a correct Ukrainian rendering of "reincarnation" in this appositive use; the term «Інкарнація» is properly used where EN has "incarnations" (para 47). Translation choice, not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all | ` — ` (em-dash, 100×) | ` – ` (spaced en-dash) — restores project standard |
| 2 | all | `.»` sentence-final period inside quotes (25×) | `».` (2 of the 25 resolved inside fix #6) |
| 3 | 9 | «За найменшим приводом вони вбивають людей.» | «З найменшого приводу вони вбивають людей.» |
| 4 | 9 | «то його ніхто не оскаржує – ніколи» | «то йому ніхто не заперечує – ніколи» |
| 5 | 18 | «після здобуття Незалежності» | «після здобуття незалежності» |
| 6 | 20 | «…не є сахаджа йоґами.» — сказала Я. — «Згодна.»» | «…не є сахаджа йоґами». Я сказала: «Згодна».» |
| 7 | 28 | «Без Реалізації, як ви можете говорити» | «Без Реалізації як ви можете говорити» |
| 8 | 34 | «Через вашу увагу, вона працює зі Мною» | «Через вашу увагу вона працює зі Мною» |
| 9 | 39 | «а в Медичному коледжі ніхто не викладав» | «а в медичному коледжі ніхто не викладав» |
| 10 | 40, 42, 43, 49, 50 | «магараштрійці/магараштрійця» (5×) | «махараштрійці/махараштрійця» |
| 11 | 44 | «у тому, що навіть приїхавши до Махараштри, Я мушу» | «у тому, що, навіть приїхавши до Махараштри, Я мушу» |
| 12 | 45 | «Якщо ви вмієте вивчити маратхі» | «Якщо ви зможете вивчити маратхі» |
| 13 | 46 | «в ній, що коли Христос пішов на весілля, Він» | «в ній, що, коли Христос пішов на весілля, Він» |
| 14 | 46 | «…з описом дитинства Христа?» | «…з описом дитинства Христа.» |
| 15 | 49 | «Вони не вчилися б нічого від британців.» | «Вони не вчилися б нічого в британців.» |
| 16 | 49 | «люди з Мевару дуже самоповажні.» | «люди з Мевару мають велику самоповагу.» |
| 17 | 51 | «нижчим за чиюсь гідність і статус» | «нижчим за власну гідність і статус» |
| 18 | 52 | «І Я бачила, що це дуже правда.» | «І Я бачила, що це щира правда.» |
| 19 | 52 | «Я дивувалася, що ж ці люди зрозуміють?» | «Я дивувалася, що ж ці люди зрозуміють.» |
| 20 | 53 | «місцем потурань – їж, пий і веселися – вони всі були потуральними й безтурботними» | «місцем утіх – їж, пий і веселися – вони всі потурали собі й були безтурботними» |
| 21 | 53 | «Усі їхні стосунки, дискусії, Я просто не могла зрозуміти.» | «Усі їхні стосунки, дискусії – Я просто не могла зрозуміти.» |
| 22 | 54 | «кепкування з зовиці» | «кепкування із зовиці» |
| 23 | 56 | «була благословенна різними аспектами Деві» | «була благословена різними аспектами Деві» |
| 24 | 60 | «Святі… жили в цій землі.» | «Святі… жили на цій землі.» |
| 25 | 60 | «замість Ґанапатіпуле, Тобі варто» | «замість Ґанапатіпуле Тобі варто» |
| 26 | 61 | «несли пробудження в кожного» | «несли пробудження кожному» |

## Summary

- Language (L): 31 issues found, 25 approved by Critic
- SY Domain (S): 5 issues found, 1 approved by Critic
- **Total corrections applied: 26** (152 instance-level replacements: 99 dashes + 23 quote-periods + 5 demonyms + 25 single fixes)

### Notes

- **Regression alert:** the em-dash flip (fix #1) and nothing else regressed since the
  2026-06-20 review; all six 2026-05-30 fixes and the «— це те, що» fix were re-verified
  intact (including «три-чотири імена», para 51).
- Mechanical checks clean: no double spaces, no space-before-punctuation, no Latin/Cyrillic
  mixing (only the acronyms `IAS`, `У.П.` per source), all quotes «» (48 pairs), apostrophe ’
  throughout, ASCII ellipsis `...` (4×, no space before), `?»` (9×) and `!»` (3×) correctly
  keep the mark inside the quotes.
- **Deity-pronoun capitalization verified correct throughout** (unchanged): Shri Mataji
  (Я/Мені/Мій/Моя/Своєю/Ти/Тебе/Тобі/Свою) uppercase; Christ singular (Він/Його/Йому/Той/Хто/
  Себе/Своїм) uppercase; Incarnations plural mid-sentence correctly lowercase (вони/їхні/свої —
  paras 18, 47, 53); Gandhi's «його» correctly lowercase despite EN "His" (para 14); «стіп»
  correctly lowercase for false gurus' feet (para 59); lowercase «я» in regular people's quoted
  speech (para 27) correct.
- Glossary/terminology verified: Сахаджа Йоґа (в Сахаджа Йозі — правильне чергування ґ→з),
  сахаджа йоґи lowercase, Шрі Ґанеша with correct 1st-declension forms (Ґанеші/Ґанешею),
  Аґія/Аґії, Кундаліні, Дхарма, Пуджа, Дух, Реалізація, реалізована душа (lowercase),
  Інкарнацій, Останній Суд, танматра (lowercase per glossary), Акаша Таттва, Парам Таттва,
  Чайтанья, бхакті, Ґанапатіпуле, Махалакшмі/Махасарасваті/Махакалі/Аді Шакті. Language
  names all lowercase (англійська, гінді, маратхі, санскрит, панджабі, тамільська, єврейська).
- The nominative citation pattern «називаємо її акаша» / «називаємо… танматра» (paras 28–29)
  was left as adjudicated by the 2026-06-20 review (intentional treatment of cited Sanskrit
  terms vs the naturalised «називаєте ефіром»).
- Note for maintainers: `final/uk.srt` still contains the pre-review wording; the
  `sync-subtitles.yml` PR workflow (`tools.sync_transcript_to_srt`) is the intended path to
  propagate these transcript edits.
