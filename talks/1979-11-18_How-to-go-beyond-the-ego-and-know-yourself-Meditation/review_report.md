# Language Review – 1979-11-18_How-to-go-beyond-the-ego-and-know-yourself-Meditation, 2026-10-30

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6; talk ¶6–31, guided meditation ¶32–67).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019) in all 11 apostrophised words, quotes «» only (no `„“`,
`""` or `'`), ellipsis `...` (no `…`), no Latin/Cyrillic mixing, no double or
misplaced spaces around punctuation. Only Devanagari glosses (चमत्कार, साधना,
स्वार्थ) are non-Cyrillic, mirroring the source. Every body line ends with
terminal punctuation except ¶38 (see L1).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 38 | Missing sentence-final period after the closing quote — the only body line without terminal punctuation; the parallel mantra sentence in ¶41 correctly ends «...намо намаха». | «...Шрі Матаджі Нірмала Деві намо **намаха»** | «...Шрі Матаджі Нірмала Деві намо **намаха».** |
| L2 | 49 | A stand-alone parenthetical sentence starts with a lowercase letter; the two identical stage notes in this transcript (¶40, ¶42) start with a capital, as do all other «(Йоґи ...)» notes in the corpus | «**(йоґи** тричі повторюють: Шрі Калькі Сакшат...» | «**(Йоґи** тричі повторюють: Шрі Калькі Сакшат...» |
| L3 | 13 | Case agreement: the parenthetical name clarifies the genitive pronoun «нього», so it must also be genitive (compare ¶10, where «він (пан Венуґопалан)» correctly agrees in the nominative) | «Так от, щодо нього **(Венуґопалан)**: це людина...» | «Так от, щодо нього **(Венуґопалана)**: це людина...» |
| L4 | 11 | Semicolon before the contrastive «а не + інфінітив»: what follows is not an independent clause but a short contrasted element of the same predicate, so a comma is required (EN semicolon carried over) | «І саме це треба **робити; а не** боротися з его.» | «І саме це треба **робити, а не** боротися з его.» |
| L5 | 18 | Same pattern as L4: semicolon before «а просто [знаючи]» | «без жодного страху перед будь-ким**; а просто** [знаючи], що вони – ваші брати...» | «...перед будь-ким**, а просто** [знаючи]...» |
| L6 | 8 | «що стосується» is a calque of RU «что касается»; style guides prefer «щодо» / «що ж до» | «Бо **що стосується Мене**, Мені більше нічого робити.» | «Бо **щодо Мене**, Мені більше нічого робити.» |
| L7 | 25 | Euphony: before a word starting with «с» the preposition «із» is preferred | «ви боїтеся зустрітися **з собою** віч-на-віч» | «...зустрітися **із собою** віч-на-віч» |
| L8 | 13 | «до ще іншого ґуру» sounds awkward; «ще одного» is more natural | «йдуть до іншого ґуру, йдуть **до ще іншого** ґуру» | «...йдуть **до ще одного** ґуру» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 41 | Inconsistent casing within one gloss: «Махат» uppercase but «аханкара» lowercase, while the glossary has «Аханкар» uppercase and the mantra in the same line writes «Махат-Аханкара» | «– Махат означає «великий», **аханкара** означає «его», –» | «...**Аханкара** означає «его»...» |
| S2 | 57 | Dialogue label: glossary lists «ШМ (скорочення в діалогах)» for Shri Mataji | «**Шрі Матаджі:** Центральне Серце? Гаразд...» | «**ШМ:** Центральне Серце?...» |

Checked and found correct (no findings):
- **Shri Mataji pronouns** are uppercase in every instance (Я/Мене/Мені — ¶7–30, 64),
  including «Я Сама» (¶12, which is also the corpus majority: 19× in 15 talks against 6× «Я сама»),
  and the respectful «Ви/Вам» when people address Mother (¶28).
  Lowercase «я/мій/моя» occurs only inside quoted speech of ordinary people
  (¶11, ¶12, ¶27) and in the lexical gloss «ваше «я»» (¶23, EN lowercase 'self'), which is correct.
- **«Ґуру» casing follows the source**: lowercase «ґуру» for the fake gurus (¶13 «ґуру» in quotes, ¶14),
  uppercase for one's own Guru (¶33, ¶35). The pronouns «Його/Йому» for the Guru enthroned in the heart (¶33)
  are uppercase, correctly treating that Guru as divine. «Його приходу» (¶30) refers to Christ, so uppercase is correct.
- **Spiritual terms**: «Істина» (¶6, ¶13), «Божественним» (¶9, ¶36), «Реалізації» (¶34),
  «Дух» for “the Self” (¶30), «Стіп свого Ґуру» (¶35, uppercase per the Стопи rule),
  «Ґуру Пуджі/Пуджу» (¶21, ¶28 — glossary variant, consistent internally),
  «реалізовані душі» lowercase following the lowercase EN source (glossary allows both).
- **Glossary terms**: Сахаджа Йоґа (correct locative «в Сахаджа Йозі», ¶10), сахаджа йоґи/йоґів/йоґом/йоґа
  (lowercase, «ґ», hard-stem plural), «віддача на милість» (surrender, ¶11), его/суперего, Кундаліні, вібрації,
  чакри, «чаматкар» (sg. of чаматкари, ¶14), Вірати (¶22), Ґанеші (genitive, ¶37), Нірвічари, Махат-Аханкара/-и
  (¶41, ¶51), Сакшат, «намо намаха», Калькі, Сахасрара Свамині, Мокша Прадайіні, Махакалі, Джаґадамба,
  Центральне Серце, Вішуддхі — all match `terms_lookup.yaml`/`terms_context.yaml`.
- **Fixed blessing** «Нехай Бог благословить усіх вас.» (¶31) matches the glossary formula exactly.
- **Language names** lowercase («англійська», line 4; «санскритом», ¶23).
- **Corpus consistency**: «Останній Суд» (¶21) matches corpus usage (5× vs 1× «Страшний суд»),
  and «Венуґопалан» / «Долліс Хілл» match their other occurrences.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | A sentence ending in a closing quote still needs a period after «»». It is the only body line without terminal punctuation, and the parallel ¶41 has the period. Genuine omission. |
| L | L2 | **Keep** | ¶49 is a stand-alone sentence inside parentheses, so it must open with a capital (orthography, not style). The EN lowercase is a transcription artefact. The two identical notes in ¶40/¶42 and every other «(Йоґи ...)» note in the corpus are capitalised, so this was also an in-file inconsistency. |
| L | L3 | **Keep** | Grammatical agreement: an appositive clarifying a pronoun takes the pronoun's case. The same transcript does this correctly in ¶10 (nominative «він (пан Венуґопалан)»). With the nominative, the gloss reads as detached from «нього». Clear error with a one-letter fix. |
| L | L4 | **Keep** | A semicolon separates independent clauses or long homogeneous members that contain internal commas. «а не боротися з его» is neither: it is a short contrasted element of «треба робити». Ukrainian punctuation requires a comma before contrastive «а не». The semicolon is an unadapted carry-over of the EN punctuation. |
| L | L5 | Remove | Unlike L4, the semicolon here closes a long chain of comma-separated homogeneous members («з повною любов’ю, з відкритістю, без жодного занепокоєння..., без жодного страху...»). The following part carries its own subordinate clauses. A semicolon between such widespread members is permitted, so this is not an error. |
| L | L6 | Remove | Style preference. «що стосується» is in normative use (the corpus has it in other talks too) and is not an orthographic or grammatical error. |
| L | L7 | Remove | The з/із/зі alternation is a euphony recommendation, not a hard rule. «з собою» after a vowel-final word («зустрітися») is acceptable. Trivial. |
| L | L8 | Remove | «ще інший» ("yet another") is a valid Ukrainian collocation, and the repetition mirrors the source's “another guru, another guru”. Style only. |
| S | S1 | Remove | The casing mirrors the source exactly (“Mahat means..., ahamkara means...”). Here «аханкара» is a lexical gloss of a Sanskrit word element, not the name of the principle, so lowercase is defensible. The glossary's «Аханкар» entry covers the principle/term, not a word-by-word etymology. Not an error. |
| S | S2 | Remove | False positive. Per `terms_context.yaml`, «ШМ» is the abbreviation used **in subtitles** of dialogues. Transcripts across the corpus use the full label «Шрі Матаджі:» (636 lines in 30 talks, 0 «ШМ:»), and this file is consistent with that. |

No conflicts between L and S: their findings touch different paragraphs and
different aspects.

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 38 | «...Нірмала Деві намо намаха» (no sentence-final period) | «...Нірмала Деві намо намаха». |
| 2 | 49 | «(йоґи тричі повторюють: ...» | «(Йоґи тричі повторюють: ...» |
| 3 | 13 | «щодо нього (Венуґопалан):» | «щодо нього (Венуґопалана):» |
| 4 | 11 | «І саме це треба робити; а не боротися з его.» | «І саме це треба робити, а не боротися з его.» |

## Summary

- Language (L): 8 issues found, 4 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 4

Overall the translation is of high quality. Deity-pronoun capitalisation,
glossary terminology and spiritual-term casing are correct throughout, and
dash/quote/apostrophe typography is fully consistent. The four applied fixes
are small punctuation, capitalisation and case-agreement repairs. None of them
changes the meaning or adds or removes words. The word content stays the same,
and the only punctuation added at a sentence boundary (¶38) falls at the end of
an existing paragraph.
