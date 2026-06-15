# Language Review – 2000-07-02_Adi-Shakti-Puja-Women-Emotional-Intelligence, 2 July 2000

## Process

2+1 agent language review (Reviewer L + Reviewer S + Critic) on `transcript_uk.txt`
(28 lines / 22 paragraphs), checked against `transcript_en.txt` and the
`glossary/` rules.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (¶6–27) | Em-dash `—` (U+2014) used as the interjection separator throughout (52×). Glossary orthography mandates en-dash `–` (U+2013) with spaces; corpus confirms (7636 en-dash across 85 files vs 707 em-dash across 9). | `…у цьому світі — спочатку творити…` | `…у цьому світі – спочатку творити…` (replace all ` — ` → ` – `) |
| L2 | 12, 15, 21, 22, 23 | Single-character ellipsis `…` (U+2026) used (5×). Glossary mandates three dots `...`. | `…можуть статися… дуже-дуже погані речі.` | `…можуть статися... дуже-дуже погані речі.` (replace all `…` → `...`) |
| L3 | 10 | `в багатьох відношеннях` – calque of «во многих отношениях»; literary Ukrainian prefers «багато в чому». | `Америка – провідна країна в багатьох відношеннях.` | `…багато в чому` |
| L4 | 9 | `виглядає, мов` – `виглядати` in the sense "to look like" sometimes flagged as a russism (preferred «має вигляд»). | `він виглядає, мов усі інші дрібні тваринки` | `має вигляд` |
| L5 | 13 | `мужчини` – colloquialism / russism; literary form is «чоловіки». | `їхні чоловіки, мужчини, чоловіки в сім’ї` | `чоловіки` |
| L6 | 22 | `користатися` – non-standard variant of «користуватися». | `користатися ними` | `користуватися ними` |
| L7 | 27 | `слідуємо` – `слідувати` debated as a calque for "to follow". | `Чи ми справді слідуємо?` | `дотримуємося` |
| L8 | 6 | Latin `X` / `Y` placeholders mixed into Cyrillic text. | `народжується в релігії X … релігію Y` | `Ікс / Ігрек` (or keep) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 25 | `Сахаджа Йоги` uses Cyrillic `г` (U+0433) instead of `ґ` (U+0491) – 3×. Violates transliteration rule (Sanskrit *g* → ґ) and glossary entry «Сахаджа Йоґа» (genitive «Йоґи», explicitly NOT «Йоґі»). All other 18 «йоґ» forms in the text correctly use ґ. | `суперечить культурі Сахаджа Йоги` · `роботі Сахаджа Йоги` · `Уся сім’я Сахаджа Йоги` | `Сахаджа Йоґи` (×3) |
| S2 | 12 | Check: `принцип Лакшмі` lowercase «принцип». | `тоді принцип Лакшмі не шанують` | Verified correct – EN "Lakshmi principle" (lowercase); not the named «Принцип Ґуру». |
| S3 | 27 | Check: `чакрами` lowercase though EN capitalises "Chakras". | `речі, пов’язані з різними, різними чакрами` | Verified correct – glossary: `chakra → чакра` (lowercase common noun). |
| S4 | 6 | Check: `Землю` capitalised (2×). | `прийшло сюди, на цю Землю` | Verified correct & consistent – Mother Earth sense; matches EN "this Earth". |
| S5 | all | Check: deity-pronoun capitalisation. | Adi Shakti `Їй`; Christ `Він/Його/Йому/Своє`; Shri Mataji `Я/Мене/Мені/Моя/Моїй/Своїх`; regular people lowercase. | Verified correct throughout – no errors. |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine orthography-compliance issue. Glossary explicitly mandates en-dash `–` (U+2013); the task brief and corpus (85/94 files) confirm. This talk is the outlier. |
| L | L2 | **Keep** | Glossary explicitly mandates three-dot `...`; majority corpus convention (54 vs 15 files). |
| L | L3 | Remove | «у багатьох відношеннях» is dictionary-attested and widely used; a style preference, not a clear error. Conservative scope. |
| L | L4 | Remove | «виглядати» = "to look like" is accepted in modern normative Ukrainian. Style preference. |
| L | L5 | Remove | «мужчина» is a dictionary-attested colloquialism; used deliberately to render EN "husbands, the men, males" as three distinct words. Not an error. |
| L | L6 | Remove | «користатися» is an attested variant of «користуватися». Not an error. |
| L | L7 | Remove | «слідувати» (follow a path/teaching) is acceptable here; changing it is a preference, not a correction. |
| L | L8 | Remove | `X` / `Y` are intentional placeholder variables mirroring the source ("an X religion / the Y religion"). Keeping Latin is the faithful choice. |
| S | S1 | **Keep** | Real transliteration error. Sanskrit *g* must be `ґ`; glossary fixes «Сахаджа Йоґа / Йоґи». Internally inconsistent (the other 18 forms use ґ). |
| S | S2 | Remove | False positive – original lowercase is correct. |
| S | S3 | Remove | False positive – glossary prescribes lowercase «чакра». |
| S | S4 | Remove | False positive – capitalisation correct and consistent. |
| S | S5 | Remove | False positive – all deity pronouns already correct. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶6–27 (52×) | Em-dash `—` (U+2014) as separator | ` – ` en-dash (U+2013) with spaces |
| 2 | ¶12, 15, 21, 22, 23 (5×) | Single-char ellipsis `…` (U+2026) | `...` (three dots) |
| 3 | ¶25 (3×) | `Сахаджа Йоги` (Cyrillic г) | `Сахаджа Йоґи` (ґ) |

## Summary

- Language (L): 8 issues raised, **2 approved** by Critic (L1 dashes, L2 ellipsis).
- SY Domain (S): 1 genuine issue raised (+4 verified-correct checks), **1 approved** (S1 ґ-transliteration).
- Total corrections applied: **3 distinct fixes** affecting **60 textual occurrences**
  (52 dashes + 5 ellipses + 3 «Йоґи»).
- Verified clean: apostrophes (48× U+2019), guillemets (12× «»), all deity-pronoun
  capitalisation, language/nationality names lowercase, and spiritual-term
  capitalisation (Пуджа, Аді Шакті, Кундаліні, Реалізація, Істина, Лакшмі, Ґруха Лакшмі, Дух).
