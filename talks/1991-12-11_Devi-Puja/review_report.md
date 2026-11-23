# Language Review – 1991-12-11 Devi Puja (Hyderabad)

## Process

Reviewed `transcript_uk.txt` (full paragraphed Ukrainian text) against the English
original (`transcript_en.txt`), the glossary (`terms_lookup.yaml`,
`terms_context.yaml`) and the orthography, capitalization and fidelity rules in
`glossary/AGENTS.md`, using 2 parallel reviewers + 1 critic filter.

Paragraph numbers below are the line numbers in `transcript_uk.txt`.

Automated character-level checks across the whole file came back clean, so they
produced no findings:

- No Latin letters inside Cyrillic words. The only Latin token is `RESTS`, which
  comes from the English transcript's `[SOUNDS LIKE "RESTS"]` note (¶26). ✓
- Quotation marks: only `«»`, no `" "`, `„ "` or `‘ ’` quotes. ✓
- Apostrophe: only `’` (U+2019), no straight `'`. ✓
- Dashes: only the spaced en-dash ` – `, no em-dash `—`, no hyphen used as a dash. ✓
- No double spaces, no space before `, . ; : ? ! »`, no missing space after
  punctuation, no doubled punctuation, no trailing whitespace. ✓
- Euphony `в/у`: `у` correctly used before `в`/`св` (`у вас`, `у своїй`,
  `у своєму`, `у світ`). ✓
- `Йоґа` spelled with `ґ` in every form (`Йоґа`, `Йоґу`, `Йоґою`, `Йоґи`, `Йозі`). ✓
- Language names lowercase (`англійська` in header line 4; `ГІНДІ` appears only in
  an all-caps editorial bracket). ✓
- `python -m tools.text_normalize --check` reports 0 violations. ✓

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶19 | Case agreement: the examples after `як-от` must take the case of the word they illustrate (`в інших місцях`, locative). Here they are nominative, which also clashes with the adverb `будь-де` that ends the same list | `а також в інших місцях, як-от **Вішакхапатнам** чи **Віджаявада**, чи будь-де:` | `а також в інших місцях, як-от **у Вішакхапатнамі** чи **Віджаяваді**, чи будь-де:` |
| L2 | ¶26 | `не` + adverb `важливо` usually written together (`неважливо` = `несуттєво`) | `Тож коли програма і коли не програма – **не важливо**.` | `– **неважливо**.` |
| L3 | ¶14 | Comma between two clauses where the second explains the first; a dash or colon would be clearer | `ви будете здивовані**,** здебільшого ви виявите: «…»` | `ви будете здивовані **–** здебільшого ви виявите: «…»` |
| L4 | ¶10, ¶14, ¶26 | Euphony: `із` is preferred before `ц` | `вийти **з цього**`, `бо я **з цього** місця`, `впоралися **з цією** зміною` | `із цього`, `із цією` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| – | – | No errors found | – | – |

S checked the following and found everything correct:

- **Shri Mataji pronouns** are uppercase throughout: `Я`, `Мені`, `Я бачила`,
  `Я щойно дала`, `Я Сама` (¶22, matching the corpus majority of 31 vs 10).
  Addressing Her as `Ви` is uppercase (`Матінко, Ви приїдьте…`,
  `Матінко, Ви мусите…`, ¶14).
- **First person in quoted yogis' speech** is correctly lowercase (`«Коли я
  засмучуюся?»`, `«Бо я належу…»`, `«Якщо я вже вирішив…»`, `«Цей пан Его робить
  мене…»`). It is capitalized only at the start of a sentence.
- **God** is uppercase (`Він їх не знає, і Він не хоче…`, ¶12). Brahma, Vishnu and
  Mahesha are plural (`Вони…`, ¶9) and capitalized only where they start a sentence.
- **Glossary terms:** `Сахаджа Йоґа`, `сахаджа йоґ/йоґів/йоґами`, `Кундаліні`,
  `Реалізація`, `реалізована душа`, `Дхарма` (¶19, ¶20), `Пуджа` (¶26), `его`,
  `колективність`, `увага`, `лівосторонній`/`правосторонній`, `ґуру`, `Деві Пуджа`,
  `Брахма`, `Вішну`, `Махеша` all match `terms_lookup.yaml`.
- **Sahaj:** `Сахадж` (¶15) and `до Сахаджа` (¶18) are capitalized the same way
  both times, which `terms_context.yaml` allows.
- **Transliterations** follow corpus usage: `санньяса`/`санньясі`, `касая` (with
  the English gloss translated in parentheses), `ап’яс` (as in the English
  `apyas`), `бхутівський`, `Джанака` (the English says only "Janaka", not
  "Raja Janaka"), `Тіпу Султан`, `Хайдарабад` (genitive `Хайдарабада`),
  `Вішакхапатнам`, `Віджаявада`.
- **Closing blessing:** `Нехай Бог благословить вас.` correctly has no `усіх`,
  because the English is "May God bless you." and not "…you all".
- **Fidelity:** spoken roughness is kept on purpose: shifts of person (¶8 `Доки
  вас… ми ніколи…`, ¶17 `Щойно ми… тоді ви…`), sentence fragments (¶9, ¶27) and
  the quote that runs across ¶10–¶11. The translator's bracket `їх [рідних]` (¶13)
  correctly bridges "them" back to "family". No silent repairs were found.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | A real case-agreement error. Items listed after `як-от` stand in the same syntactic role as the word they illustrate (`в інших місцях`), so they need the locative. The list ends with the locative adverb `будь-де`, which leaves the two nominatives grammatically stranded. The fix changes only grammar: the spoken place names stay the same. |
| L | L2 | Remove | Writing `не` separately is justified here because the next sentence states the contrast outright: `– не важливо. Важливо те, як…`. Both spellings are acceptable, so this is not an error. |
| L | L3 | Remove | A comma is acceptable in an asyndetic compound sentence, and it follows the spoken English ("you'll be surprised, mostly you'll find"). Adding a dash right before the colon would also crowd the punctuation. This is a style preference. |
| L | L4 | Remove | Choosing `з` or `із` before `ц` after a vowel is a euphony tendency, not a mandatory rule like `у` before `в`. `з цього`/`з цією` is standard usage, so this is not an error. |
| S | – | – | No S findings to filter. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶19 | `як-от Вішакхапатнам чи Віджаявада, чи будь-де` – nominative does not agree with `в інших місцях` (locative) | `як-от у Вішакхапатнамі чи Віджаяваді, чи будь-де` |

## Summary

- Language (L): 4 issues found, 1 approved by Critic
- SY Domain (S): 0 issues found, 0 approved by Critic
- Total corrections applied: 1 (¶19). After the edit, `transcript_uk.txt` passes
  `tools.text_normalize --check` with 0 violations.
