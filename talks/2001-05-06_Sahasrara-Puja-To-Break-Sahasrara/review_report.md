# Language Review – 2001-05-06_Sahasrara-Puja-To-Break-Sahasrara, 6 May 2001

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`
and `glossary/terms_context.yaml`.

Automated character-level checks were run first and came back clean:
- No ASCII apostrophes (`'`) — all apostrophes are `’` (U+2019).
- No straight/German quotes — all quotation marks are `«»` at every level.
- No Latin characters mixed into the Cyrillic text.
- No double spaces, no spaces before punctuation.
- Em-dash is consistently the en-dash `–` (U+2013) with surrounding spaces; no U+2014.
- All Shri Mataji first-person pronouns capitalized (`Я/Мені/Мій/Моя/Моїм…`).
  The only lowercase first-person forms (¶14–15 Nala/Kali speaking, ¶83 a
  hypothetical yogi) correctly belong to non-Divine speakers.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 32, 35, 38, 39, 63, 86 | Ellipsis uses single glyph `…` (U+2026) instead of project-standard three dots `...` | «Я – те… Я – се…»; сьомий…; ви…; її… / які… / це…; зробив…; їхніми… | Replace `…` → `...` (glossary `CLAUDE.md` orthography rule; corpus majority 38 vs 9 files) |
| L2 | 82 | Unwarranted comma after the conjunction «Тож» (no parenthetical follows) | «Тож, Я була здивована, що в Туреччині…» | «Тож Я була здивована, що…» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 54, 64 | (Considered) Capitalized pronouns «Він / Своїй» for the saint Г'янешвара | «написав про це у Своїй книзі»; «Він говорив про це» | No change — see Critic |

No terminology errors found. All glossary terms render correctly and
consistently: Кундаліні, Сахасрара, Реалізація/Самореалізація, Пуджа, Аді Шакті,
Аді Шанкарачар'я, Г'янешвара, Шастри, бхаджан, стотри, Калі Юга, прохолодний
вітерець, стан без думок / стан усвідомлення без думок, Лао-Цзи, Сахаджа Йоґа.
Religion-followers and nationalities correctly lowercased (індуси, християни,
мусульмани, англійцями, німцями, італійцями); language name lowercase
(англійська). Deity titles capitalized (Богиня, Матері, Божественна Любов,
Всепронизуюча Сила, Всемогутній Бог); Kundalini pronouns capitalized (Вона/Її).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine orthography deviation. `glossary/CLAUDE.md` prescribes ellipsis as `...` (three dots); 38 of 47 corpus transcripts with ellipses use `...`. Normalizing improves consistency and conforms to the documented standard. |
| L | L2 | **Keep** | `Тож` is a coordinating conjunction and is not set off by a comma here (no parenthetical follows). Every other `Тож` in the text has no comma; the one remaining `Тож,` in ¶39 is correct because it precedes the parenthetical `можливо`. The English source's comma belonged to the dropped word "now" ("So now, I was surprised"). |
| S | S1 | **Remove** | False positive. The English source itself capitalizes Jnaneshwara's pronoun («in His book», ¶54 & ¶64), and Sahaja Yoga convention treats this great realized saint with reverent capitalization. The translation applies it consistently (singular reverent forms capitalized; the plural saints in ¶66 correctly lowercased «вони» per the plural-mid-sentence rule). Defensible — keep as is. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 32, 35, 38, 39, 63, 86 | `…` (U+2026) ellipsis glyph | `...` (three dots) |
| 2 | 82 | Extra comma after «Тож» | Remove comma → «Тож Я була здивована…» |

## Summary

- Language (L): 2 issues found, 2 approved by Critic
- SY Domain (S): 1 issue considered, 0 approved by Critic
- Total corrections applied: 2 (ellipsis normalization across 6 paragraphs; one comma removed)
