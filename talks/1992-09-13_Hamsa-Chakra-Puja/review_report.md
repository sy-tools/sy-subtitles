# Language Review – 1992-09-13_Hamsa-Chakra-Puja, 2026-11-23

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

This is the first review of this talk; no earlier review exists.

Paragraph numbers are `transcript_uk.txt` line numbers. Lines 1–4 are the header
and the body runs from line 6 to line 59.

Mechanical pre-checks found no problems:
- dashes are ` – ` (U+2013) with spaces throughout (40 of them), with no hyphen-dashes or em-dashes;
- every `«»` pair is balanced on every line, and there are no `„"` or `""` quotes;
- ellipses are `...` with no space before;
- no stray apostrophes, double spaces, spaces before punctuation, or missing spaces after punctuation;
- no Latin characters inside Cyrillic words. The only Latin is the proper names «Tabac», «Poison» and KLM, which are correct as brand names.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 29 | Comma between two infinitives that share one verb and are joined by a single «чи». Homogeneous parts joined by a single non-repeated «і/або/чи» take no comma. The English has no comma here either («write to Me or do anything»). | «або можете написати Мені**,** чи зробити будь-що» | «або можете написати Мені чи зробити будь-що» |
| L2 | 29 | Comma before a single «або» between the predicates «запитайте» and «можете написати», which share the subject «ви» | «Запитайте лідера**,** або можете написати Мені» | «Запитайте лідера або можете написати Мені» |
| L3 | 12 | Present active participles «фліртуючими», «блукаючими», which purist style guides discourage | «що ми називаємо **фліртуючими чи блукаючими** очима» | (consider «кокетливими чи блукливими») |
| L4 | 55 | «слідувати чомусь» in the sense of "to follow", a possible calque | «Таким фальшивим речам ми **слідуємо**» | (consider «дотримуємося» / «йдемо за») |
| L5 | 41 | Comma before a comparison of manner («як Біблію») | «Ми читаємо його**,** як Біблію!» | «Ми читаємо його як Біблію!» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 48 | Lowercase pronoun addressing Shri Mataji. The KLM manager «підійшов і сказав Мені», so the "you" in «He just can't help you» is Shri Mataji. The rule is that Shri Mataji's pronouns are always uppercase, and the rest of this transcript already capitalizes every address to Her: ¶35 «Як **Ви** дивитеся на ці речі?» and ¶53 «у **Вас** розклад», «Як **Ви** з цим впораєтеся?» | «Він просто не може **вам** допомогти» | «Він просто не може **Вам** допомогти» |

Checked and found correct (no findings):
- **Shri Mataji's pronouns** are uppercase throughout: Я/Мені/Мене/Мій/Моя/Моєї/Мої. Her first-person verbs are consistently feminine (бачила, розповідала, сказала, знала, пішла й сіла, зробила). Quoted third-party references to Her are capitalized: ¶29 «Мати… Вона знає»; ¶39 «О, Вона говорить…».
- **Regular people's pronouns** in quoted speech are lowercase: ¶28 «я лідер», ¶29 «мені робити», ¶40 «я можу почути», ¶46 «по мене», ¶50 «Чому я маю йти?». ¶40 «Мені так пощастило» starts the quotation, so its capital is correct.
- **Shri Ganesha** takes the uppercase «Він» (¶24). His accusative is «Шрі Ґанешу» (¶25).
- **Glossary terms match `terms_lookup.yaml`:**
  - Хамса чакра (declined, and «Хамса» as a feminine noun: «Хамси», «ваша Хамса налагоджена»), Вішуддхі, Вірата («з Віратою»), Аґія, Муладхара;
  - бхути, ґуґґул, бандхан, Вівек («не має Вівека»), Майя, Нірвана, Кріта Юга («в цій Кріта Юзі», as elsewhere in the corpus);
  - Брахмачайтанья, атіндрія, пітха («до пітх»), карма-пхали, джанма. All of these are consistent with other talks.
  - Сходження, обумовленості (not «умовності»), его, сприятливість.
  - «Нехай Бог благословить усіх вас» (¶59) is the fixed form.
- **Сахаджа Йоґа forms** are «Сахаджа Йоґи», «у Сахаджа Йозі», «допомогти Сахаджа Йозі», «із Сахаджа Йоґою». **Sahaja Yogi forms** are «сахаджа йоґ», «одного сахаджа йоґа», «сахаджа йоґи», «сахаджа йоґів», always lowercase.
- **Spiritual capitalization:**
  - Дух/Духа is consistent across ¶10, ¶26, ¶31 and ¶37; Божество/Божеству; Реалізація is consistently uppercase.
  - Божественна Розсудливість (¶8, ¶36) follows the English "Divine Discretion".
  - «Мудрість/мудрість» follows the English "Wisdom/wisdom" sentence by sentence (¶24, ¶25, ¶37, ¶39, ¶45).
  - «Океан» (¶42) follows the English "Ocean", while the literal «океан» in ¶43 is lowercase, as in the English.
  - Всепроникна Сила matches the corpus majority.
- **Language names** are lowercase: «англійська» (header), «на санскриті» (¶41).
- **Translator additions** in square brackets were left untouched, as the Critic rules require. They are: [Це], [яка розрізняє], [він], [з ними], [до цього], [витримати], [що], [аромат], [й], [усе це], [то більше], [і], [речі], [з собою], [їх], [ваше], [це було], [вона], [ви], [але], [його], [це].

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | **Keep** | This is a clear punctuation error. «написати Мені» and «зробити будь-що» are homogeneous infinitives that both depend on «можете» and are joined by one «чи». No rule allows a comma there, and the English has none. |
| L | 2 | Remove | This one is debatable. «Запитайте лідера» is an imperative, one-member sentence, while «можете написати…» is an indicative modal with its own implied subject. That pair can be read as two clauses of a compound sentence joined by «або», which takes a comma. This is not a clear error. |
| L | 3 | Remove | This is a style preference. «блукаючий» is a dictionary-established form (СУМ: «блукаючі вогні», «блукаючий нерв»), and «фліртуючий» is understandable and not wrong. Replacing them is stylistic polishing, not a correction. |
| L | 4 | Remove | СУМ lists «слідувати» in the sense of «діяти відповідно до чого-небудь» («слідувати прикладу»). It is acceptable usage, not an error. |
| L | 5 | Remove | «як Біблію» can be read either as a set-off simile or as an adverbial of manner. Both punctuations are defensible, so this is not a genuine error. |
| S | 1 | **Keep** | This applies the project rule "Shri Mataji: ALWAYS uppercase". The pronoun is spoken directly to Her, «сказав Мені». It also restores consistency within this transcript, which capitalizes every other address to Her (¶35, ¶53). No conflict with any L finding. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 (L1) | 29 | «або можете написати Мені**,** чи зробити будь-що» has a comma between homogeneous infinitives joined by a single «чи» | «або можете написати Мені чи зробити будь-що» |
| 2 (S1) | 48 | «Він просто не може **вам** допомогти» uses a lowercase pronoun addressing Shri Mataji | «Він просто не може **Вам** допомогти» |

## Summary

- Language (L): 5 issues found, 1 approved by Critic
- SY Domain (S): 1 issue found, 1 approved by Critic
- Total corrections applied: 2

The translation is in very good condition. The orthography is clean, glossary terms
are consistent with the dictionary and the rest of the corpus, and Shri Mataji's
pronouns are correct everywhere except the one address fixed above. The speech's
rough spots are kept as spoken and bridged with minimal bracketed additions, as
`glossary/AGENTS.md` requires. Examples are the broken constructions in ¶7, ¶15,
¶16 and ¶50, and the shift from "they" to "your" in ¶27 («для вашого сходження»).
