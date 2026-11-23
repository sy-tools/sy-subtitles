# Language Review – 1985-03-10_Devi-Puja-How-To-Ascend-Into-Nirvikalpa, 2026-11-23

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6). The UK file mirrors the EN file line for line (79
lines each; the EN file simply lacks a trailing newline after line 79).

Mechanical pre-checks: clean. En-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019), quotes «» at all levels, ellipsis `...` (¶40), no
Latin/Cyrillic mixing, no double/misplaced/trailing spaces;
`python -m tools.text_normalize --check` passes.

Dictionary pass: every word was checked against the vendored hunspell
dictionary (`site/dict/uk_UA.*` + `words_uk.txt`). The only unknown words are
proper names and transliterated terms (Савікальпа, Брахмапурі, Шабарі, Рамові,
ардханґі, утхістха, мар’яди, Нірмалі, антисили), plus «діверю» (see L3).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 31 | Adverbial-participle phrase after the conjunction «але» is not set off on its left side. The phrase must be enclosed in commas on both sides; only «а» sometimes fuses with the phrase. | «а Я нічого з цього не отримую, **але прив’язуючись** до Мене, ви дещо отримуєте» | «**але, прив’язуючись** до Мене, ви дещо отримуєте» |
| L2 | 33 | Wrong dative of «дівер» (husband’s brother). It is a hard-stem noun (дівер, -а; dictionary paradigm діверові/діверу, дівером, дівере). The «-еві» ending belongs only to soft and sibilant stems (лікареві, сторожеві). | «каже Своєму **дівереві**» | «каже Своєму **діверові**» |
| L3 | 33 | Wrong vocative of «дівер». The soft-group ending «-ю» does not fit a hard stem; the vocative is «дівере». The dictionary rejects «діверю». | «о Мій **діверю**» | «о Мій **дівере**» |
| L4 | 71 | Missing comma where two subordinating conjunctions meet («що» + «коли»). No correlative «то/так» follows, and the «коли»-clause can be removed without rebuilding the sentence. | «ви всі в такому стані, **що коли** Я щось кажу, це діє на вас» | «**що, коли** Я щось кажу, це діє на вас» |
| L5 | 71 | Lexical/tense error. The adverb «щойно» means «тільки що, недавно» (past) or works as the conjunction «як тільки». With a present-tense verb it reads as an unfinished «as soon as you sit…» clause. EN: “Just now it is at that state you are sitting” = right now. Its correct use with the past tense two sentences earlier («Щойно це сталося з вами») stays. | «**Щойно** ви сидите саме в такому стані, без сумніву.» | «**Зараз** ви сидите саме в такому стані, без сумніву.» |
| L6 | 31, 44, 53, 54, 63 | Possible comma after a coordinating conjunction before a removable subordinate clause («і, якщо…», «і, щойно…», «і, коли…», «але, коли…») | ¶31 «і якщо ви занурюєтеся в ріку Ґанґу, бідна ріка…»; ¶44 «і щойно ви усвідомите це розумом, ви маєте…»; ¶53 «і коли вони вивільняються, вони поглинають…»; ¶54 «але коли він вивільниться, він подіє»; ¶63 «і якщо ви захочете, ми зможемо…» | «і, якщо…», «і, щойно…», «і, коли…», «але, коли…» |
| L7 | 22 | Comma between «а» and the parenthetical «можливо» | «нічого поганого немає ні з Сахаджа Йоґою, ні з вами, **а, можливо,** ви підійшли не до того місця» | «**а можливо,** ви підійшли…» |
| L8 | 24 | Positive-degree adjective with a comparative «більше, ніж» | «Ви дуже щасливі, Я б сказала, у певному сенсі, **більше, ніж** будь-які інші шукачі досі» | «**щасливіші, ніж** будь-які інші шукачі» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 33 | The glossary entry is «Шрі Рама», but the Shabari story alternates «Шрі Рам / Шрі Рамові / Шрі Раме / мого Рама» with «Шрі Рама / Рамі» | «Що мені дати **Шрі Рамові**?», «Коли прийшов **Шрі Рам**», «**Шрі Раме**, я не змогла…» | Unify to «Шрі Рама» (Рамі, Рамо) |
| S2 | 59 | «сахадж» in lowercase where EN capitalises “Sahaj” | «Це не сахадж!» (EN: “This is not Sahaj!”) | «Це не Сахадж!» |
| S3 | 71 | «Реалізовані» capitalised where the corpus mostly writes lowercase «реалізовані» | «з людьми, які не були **Реалізовані** чи щойно **Реалізовані**» | «реалізовані» |

Checked and found correct (no findings):

- **Shri Mataji’s pronouns** are uppercase throughout (Я/Мені/Мене/Мною/Мій/Моя/Себе/Собою/Сама; «Мою Пуджу», «Її тішить», «Вона любить»). Every lowercase «я/мені/мене» sits inside the quoted words of disciples, Shabari or a spouse.
- **Incarnations in the Shabari story**: Rama (Він/Його/Йому/Свою/Тебе/Ти), Sita (Вона/Мені/Мого/Твоя/Свою) and Lakshmana (Він/Мені) are capitalised. Lakshmana matches the corpus («Лакшмана був хворий і Йому треба було…»).
- **Ordinary people stay lowercase**: Shabari (вона; «Чи не дасте ви Мені», «Краще попроси її»), Warren, false gurus («якогось ґуру», «того типа»), «ракшас», and «боги й богині» (EN lowercase).
- **Glossary terms**:
  - spiritual states: Нірвічара самадхі, Нірвікальпа (Савікальпа capitalised in parallel), стан усвідомлення без думок, у стані свідка, сходження
  - discipline and limits: тапасья, аскеза, мар’яди
  - Sahaja Yoga and its people: Сахаджа Йоґа / в Сахаджа Йозі, сахаджа йоґ(и/ів/ом/а), сахадж
  - capitalised terms: Дхарма, Пуджа, Інкарнація, Реалізація, Дух/Духа/Дусі/Духом, Стопа (¶44), Кундаліні
  - other terms: лівосторонні, одержимі, вібрації, сприятливим, ріка Ґанґа, ардханґі
  - closing formula: «Нехай Бог благословить усіх вас.»
- **Dialogue labels**: «Йоґ:» and «Шрі Матаджі:» follow the corpus norm.
- **Square brackets**: every EN bracket (`[from]`, `[which]`, `[you]`, `[for]`, `[them]`, `[should]`, `[it’s]`, `[it]`, `[of]`, `[you should say]`, `[how]`, `[is]`, `[percent]`) is translated and kept in brackets. Translator additions are minimal and correct: [із тими] ¶13, [Її] ¶32, [таке] ¶68, [дійсністю] ¶71.
- **Spoken roughness is preserved, not repaired**: ¶28 «Інша сторона може бути, що…», ¶52 «Інше може бути, коли…», ¶56 the broken sentence «Тож доходячи до тієї межі…», and ¶62 «який оточує, власне, як аури, над серцем».

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Real punctuation error. An adverbial-participle phrase after «але» must be set off on both sides; only the closing comma was there. |
| L | L2 | Keep | Real morphological error. The vendored dictionary’s affix rules for «дівер» give only «діверові/діверу» in the dative; «-еві» is reserved for soft and sibilant stems. |
| L | L3 | Keep | Real morphological error, same paradigm. The vocative is «дівере»; the dictionary rejects «діверю». |
| L | L4 | Keep | Two subordinating conjunctions meet, no «то» follows, and the clause is removable, so the comma is required. Earlier reviews in this corpus kept the same «що, коли» fix. |
| L | L5 | Keep | «Щойно» with the present tense is a genuine lexical error, not a style choice. It mis-signals the tense (or reads as an unfinished «як тільки» clause), and the EN meaning is “right now”. The sentence two lines earlier uses «щойно» correctly with the past tense and is untouched. |
| L | L6 | Remove | After the coordinating «і/але» this comma is optional in established practice. The transcript is consistent across all five places, and an earlier Critic in this corpus rejected the same change («але якщо» → «але, якщо»). This is a style preference, not an error. |
| L | L7 | Remove | «можливо» can be dropped without rebuilding the clause, so a comma after «а» is permitted. Both «а, можливо,» and «а можливо,» are acceptable. |
| L | L8 | Remove | «щасливі … більше, ніж» is grammatical: «більше» works as an adverb of degree. It mirrors the spoken “very fortunate … than”, and AGENTS.md forbids smoothing spoken roughness. |
| S | S1 | Remove | False positive. The EN itself alternates “Shri Ram” (Hindi) and “Shri Rama” (Sanskrit), and the translation follows each spoken form: Рам → Рамові, Рама, Раме; Рама → Рамі. Each form is declined correctly. Unifying them would silently repair the spoken original. |
| S | S2 | Remove | The glossary leaves the case of «сахадж/Сахадж» to the translator. Lowercase «не сахадж(а)» is the corpus norm (40 vs 5). |
| S | S3 | Remove | The glossary allows both «Реалізована/реалізована душа», and here the EN capitalises “Realised”. This is not an error. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 31 | «але прив’язуючись до Мене, ви дещо отримуєте» | «але, прив’язуючись до Мене, ви дещо отримуєте» |
| 2 | 33 | «каже Своєму дівереві» | «каже Своєму діверові» |
| 3 | 33 | «о Мій діверю» | «о Мій дівере» |
| 4 | 71 | «в такому стані, що коли Я щось кажу, це діє на вас» | «в такому стані, що, коли Я щось кажу, це діє на вас» |
| 5 | 71 | «Щойно ви сидите саме в такому стані, без сумніву.» | «Зараз ви сидите саме в такому стані, без сумніву.» |

## Summary

- Language (L): 8 issues found, 5 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 5 (all in `transcript_uk.txt`; post-edit
  `tools.text_normalize --check` clean, line count unchanged at 79)
