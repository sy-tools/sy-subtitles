# Language Review – 1977-01-01_The-Spirit, 2026-10-24

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
no hyphen-as-dash or em-dash, quotes «» only (8 opening / 8 closing, balanced),
no `„"` or `""`, no Latin/Cyrillic mixing, no double spaces or spaces before
punctuation, no stray invisible characters, no apostrophes needed in this text.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 44 | Missing comma at the junction of two subordinating conjunctions «що» + «якщо» when the conditional clause has no correlative «то» (the main clause resumes with «він ніколи не зможе», no «то») | «сахаджа йоґ має усвідомити, **що якщо** він намагається бути, скажімо, дружнім… він ніколи не зможе отримати радість» | «має усвідомити, **що, якщо** він намагається…» |
| L2 | 15 | Nominative after «називати» — the norm prefers the instrumental (cf. «називають скарбом» ¶6, «називаєте це шпоном» ¶42 in the same text) | «третя якість, яку ми **називаємо Ананда**» | «яку ми називаємо **Анандою**» |
| L3 | 25 | Comma before single «і» joining two clauses that may both depend on the same «[що]» | «у тому сенсі, [що] ви починаєте бачити все більше**,** і дедалі ширший спектр радості потрапляє вам до рук» | remove comma |
| L4 | 44 | Homogeneous members with different verb government share one object: «дружнім до», but «зацікавленим **у**/кимось», not «зацікавленим до» | «бути, скажімо, дружнім, чи зацікавленим, чи залученим **до людини**» | restructure, e.g. «дружнім із людиною…, чи зацікавленим нею, чи залученим до неї» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 43 | Inconsistent capitalization of Realisation in one passage: ¶40 has «Реалізацію», and Самореалізація is capitalized in ¶34 and ¶46. Here the same concept, three paragraphs later, is lowercase | «Але тепер, після **реалізації**, ви починаєте відчувати радість Творіння» | «після **Реалізації**» |
| S2 | 17 | «майї» lowercase, while `terms_lookup.yaml` lists «Maya → Майя» (capitalized) | «від Сат до неістини, до **майї**, до ілюзії» | «до **Майї**» |

Checked and found correct (no findings):
- **Shri Mataji's pronouns** are uppercase everywhere: Я (¶9, 12, 13, 40, 47), Моїй/Моєї (¶12), Мене (¶36, 37). That includes the hypothetical «Я виконую всю роботу… в Моїй руці є світло» (¶12), which is still Shri Mataji speaking of Herself.
- **Pronouns for God** are uppercase: Він/Його/Нього/Своє/Свою (¶7, 11, 14, 15, 17, 27), plus the relative «Богом, Який» (¶12), which matches corpus practice (6×, never lowercase). Christ's «Він» (¶20) and «відчули Його» (¶39, EN “Him”) are uppercase too.
- **Glossary terms match:** Дух/Духа, Сат-Чід-Ананда, Сат/асат, Істина (absolute, ¶8, 11, 16, 17), with lowercase «істина» for the relative human truth (¶8, correct). Also Пуруша (instrumental «Пурушею»), Чітта, Ананда/Анандою, Принцип Брахми, Тамо Ґуна (genitive «Тамо Ґуни»), Махакалі, Махалакшмі, Махасарасваті, Мати Земля, сахаджа йоґ (lowercase), Самореалізація, Самість.
- **«Творіння» follows the source's case:** capitalized for “The Creation” / “Creation” (¶12, 18, 40, 43, 44), lowercase for “His creation” / “the creation” (¶15, 17, 18, 20). «Океан» (¶47) is capitalized per the source.
- **Language name** is lowercase («в санскриті», ¶14; «англійська», header).
- **Euphony:** у/в and і/й alternation checked throughout, no violations. The «кома + тире» junctions (¶9, 18, 42, 45, 46) and the parenthetical dashes in ¶14 and ¶18 are acceptable.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | This is a hard punctuation rule, not style. When «що» and «якщо» meet and no «то» follows, a comma goes between them. The main clause «він ніколи не зможе…» has no «то», so the comma is required. |
| L | L2 | Remove | «називати» + nominative is an accepted way to introduce a term or name, especially a transliterated technical term at its first definition («яку ми називаємо Ананда. Ананда – це…»). The instrumental is preferred, but the nominative is not an error. |
| L | L3 | Remove | Both readings work. The comma lets «і дедалі ширший спектр радості потрапляє вам до рук» be read as an independent coordinate clause, a consequence of «радості починають змінювати свій прояв», not a second «що» clause. The punctuation is consistent with that reading. |
| L | L4 | Remove | The mixed government mirrors the spoken source (“friendly or interested or involved in a person”). «до людини» fits the nearest member, «залученим до», and also «дружнім до». Fixing it means rewriting the clause, which goes beyond a minimal correction for an oral-register transcript. |
| S | S1 | **Keep** | Here «Realisation» means the same event in ¶40 and ¶43 (the source's own casing just wavers), and Самореалізація is capitalized everywhere in this text. The glossary allows the capital form, and the corpus overwhelmingly writes «після Реалізації» (38× vs 10×). A previous review kept the same kind of fix (`реалізацію → Реалізацію` for consistency). |
| S | S2 | Remove | False positive. The glossary's capitalized «Майя» is the cosmic principle used as a proper name. Here the source has lowercase “maya” as a common noun, glossed in apposition by «до ілюзії». Lowercase «майя/майї/майю» for illusion is standard corpus practice (23× lowercase), and the matching «асат» is lowercase too. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 44 | має усвідомити, що якщо він намагається | має усвідомити, що, якщо він намагається |
| 2 | 43 | Але тепер, після реалізації, ви починаєте | Але тепер, після Реалізації, ви починаєте |

## Summary

- Language (L): 4 issues found, 1 approved by Critic
- SY Domain (S): 2 issues found, 1 approved by Critic
- Total corrections applied: 2
