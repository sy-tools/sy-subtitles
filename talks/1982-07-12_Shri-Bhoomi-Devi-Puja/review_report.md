# Language Review – 1982-07-12_Shri-Bhoomi-Devi-Puja, 2026-11-21

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces in all 9
places, apostrophe `’` (U+2019) in all 3 places, the single ellipsis is `...`
with no space before it, no Latin/Cyrillic mixing, no double or misplaced
spaces, no hyphens and no quotation marks anywhere in the text.
`python -m tools.text_normalize --check` reports 0 violations.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 10 | Verb government: «здобути» takes the accusative for a definite, countable object; the genitive «якого» is a contamination from «досягти чого» («досягнення, якого ми досягли») | «Залишиться лише досягнення – досягнення, **якого** ми здобули своєю наполегливістю і своїм терпінням» (EN: “the achievement that we have accomplished”) | «досягнення, **яке** ми здобули своєю наполегливістю і своїм терпінням» |
| L2 | 7, 10, 11 | Euphony alternations у/в and і/й after a vowel | «триматиме її **у** Себе» (¶7), «наполегливістю **і** своїм» (¶10), «а ми **у** гніві граємо» (¶11), «дивиться вгору **і** сміється» (¶11) | (consider «в Себе», «й своїм», «в гніві», «й сміється») |
| L3 | 10 | Lexis in a stage direction: «поглядати» is iterative (“to look from time to time”), while the source describes one quick look | «(Шрі Матаджі швидко **поглядає** вгору)» (EN: “looks quickly upwards”) | (consider «швидко позирає вгору») |

Checked and found correct (no findings): comma with the repeated conjunction
(«врівноваженість, і розуміння, і співчуття», ¶9); comma + dash closing a
subordinate clause («як до неї дістатися, – такий був вітер», ¶12);
parentheticals set off («звісно», «без сумніву», «скажімо», «бо, Я думаю,»);
genitive after negation («не зрозуміли краси», «Материнського терпіння вони
мати не можуть», «не майте ашраддги»); predicate agreement with a mixed
subject («всі вони й ви… маєте», ¶10); instrumental «Пуджею»; declined
«в пальтах»; «у Своє» / «у владі» (mandatory «у» before «в», «св»);
«зі шраддгою», «із ними»; «надворі» written as one word.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 12 | Capitalization goes beyond the source, which has lowercase “the one who curses” | «Але **Та, Хто** проклинає, може й забрати прокляття назад» | (consider «та, хто») |
| S2 | 12 | Capitalization goes beyond the source, which has lowercase “my foot” in an everyday example | «Я ставлю на це Свою **Стопу**. Вона підказує, Моя **Стопа** підказує Мені… краще не ставити сюди **Стопу**» | (consider lowercase «стопу / стопа») |
| S3 | 8 | Term consistency: “ignorance” is rendered «невідання», while the corpus mostly uses «невігластво» (42× in 22 talks vs 3× «невідання» in 2 talks) | «через **невідання** людей» | (consider «невігластво») |

Checked and found correct (no findings): Shri Mataji's pronouns are uppercase
in every instance, including reflexive and possessive forms (Я / Мені / Мене /
Моя / Мої / Своє / Себе / Свою — ¶7–13), also where the source has lowercase
“me / my” (¶10, ¶12, ¶13); «її» for the little girl (¶7) and for the Puja (¶11,
¶13) is correctly lowercase; Bhoomi Devi as an individual Deity takes
uppercase «Вона / Її» (¶8), as does Vishnumaya — «Вона / Свій» (¶12) — per the
singular-Deity rule, although the source prints “she / her” there; the forces
of nature are plural and correctly lowercase («вони», «їхнє», «із ними», «їм»,
¶8–11); «Пуджа» is uppercase in all 9 occurrences, including where the source
has lowercase “puja”; «Бхумі Деві» and «Вішнумайя» match the glossary; the
title «Пуджа Шрі Бхумі Деві» follows the corpus pattern («Пуджа Шрі
Вішнумайї», «Пуджа Шрі Ґанеші»); «шраддгою» follows the glossary form
«шраддга», and «ашраддги» is derived from it consistently; «Богині», «Бог»,
«Божого» are uppercase; «Рустому» matches the corpus spelling «Рустом»;
«сатанинські» matches the corpus spelling; the language names in line 4 are
lowercase («англійська», «українська»); the closing blessing «Нехай Бог
благословить вас.» matches the source “May God bless you.” — there is no “all”
and no exclamation mark in the source, so the fixed «усіх вас» formula does
not apply.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine government error, not a preference. The genitive object with «здобути» is limited to partitive/abstract uses («здобути слави, волі»); a definite antecedent in a relative clause requires the accusative. The corpus agrees: every other relative clause with «здобути» uses the accusative («річ, яку ви здобули»), and this was the only genitive one. The fix is one word and keeps the translator's choice of verb, which avoids the tautology «досягнення, якого ми досягли». |
| L | L2 | **Remove** | Precedent across earlier reviews: у/в and і/й alternation after a vowel is a euphony recommendation, not a spelling error. The mandatory cases (before «в», «св») are already right in this text. |
| L | L3 | **Remove** | Style nuance, not an error: «поглядає вгору» is a natural present-tense stage direction and conveys the glance; nothing in the meaning is lost. |
| S | S1 | **Remove** | False positive: the one who curses is the Goddess, named in the preceding sentence («під прокляттям Богині»), so the singular-Deity rule applies. Corpus precedent is consistent: «Та, Хто» 19× in 13 talks, including «Вішнумайя – Та, Хто огортає» (1984 Raksha Bandhan). |
| S | S2 | **Remove** | False positive: the Foot is Shri Mataji's own, and `glossary/CLAUDE.md` puts «Стопи» of the Mother in uppercase regardless of the source's casing. Corpus precedent for the singular exists («одна Моя Стопа», 1997 Adi Shakti Puja; «цю ліву Стопу», 1982 Easter Puja). |
| S | S3 | **Remove** | Not an error and not a glossary term. «Невідання» is a correct word, already used in the corpus in the same sense («з невинності чи невідання»). Here the source contrasts ignorance with acting “knowingly” («свідомо»), so plain not-knowing fits better than «невігластво», which carries a note of reproach. |

No conflicts between L and S suggestions.

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | досягнення, якого ми здобули своєю наполегливістю і своїм терпінням | досягнення, яке ми здобули своєю наполегливістю і своїм терпінням |

## Summary

- Language (L): 3 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 1

The translation is of high quality: it follows the spoken source closely,
keeps Shri Mataji's repetitions and asides, and reads naturally in Ukrainian.
Deity-pronoun capitalization, sacred terms and glossary terminology are fully
consistent, and all punctuation characters follow Ukrainian orthography. The
single applied fix is a verb-government correction in ¶10 («досягнення, яке ми
здобули»). The other five candidates were filtered out by the Critic as
euphony or style preferences, or as capitalization that is correct under the
Deity rules.
