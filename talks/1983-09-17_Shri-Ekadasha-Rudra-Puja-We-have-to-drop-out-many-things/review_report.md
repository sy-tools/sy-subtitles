# Language Review – 1983-09-17 Shri Ekadasha Rudra Puja: We have to drop out many things, 2026-05-30

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml`,
and `terms_context.yaml`.

Automated character-level checks were run first to anchor the language review:

- **Quotation marks:** 63 `«` / 63 `»`, balanced. No German `„"`, English `""`,
  or straight `"` quotes anywhere.
- **Dashes:** 45 en-dashes ` – ` (U+2013). Zero em-dashes (U+2014). Correct.
- **Apostrophes:** 13 occurrences, all `’` (U+2019). No straight `'`, modifier
  `ʼ`, or left `‘` apostrophes.
- **Ellipsis:** 2 occurrences of single-char `…` (U+2026) — non-conformant with
  the house rule `...` (three dots). See L1, L2.
- **г / ґ:** all `Сахаджа Йоґа` forms (`Йоґа/Йоґу/Йоґи/Йоґою`) correctly use `ґ`;
  genitive `Йоґи` is consistent across para 15/25/42/51. No г/ґ slips.
- **Spacing:** no double spaces, no space-before-punctuation, no missing space
  after `,;:`. No Latin/Cyrillic letter mixing inside words.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 44 | Single-char ellipsis `…` (U+2026) instead of house-style three dots `...` | `…І це настає, коли Шіва гнівається` | `...І це настає, коли Шіва гнівається` |
| L2 | 76 | Single-char ellipsis `…` instead of `...` | `«Саба ко дуа…»` | `«Саба ко дуа...»` |
| L3 | 6 | Comma + dash sequence `, –` suspected redundant | `сьогодні, згідно з індійським календарем, – день` | (none) |
| L4 | 18 | Verb form `постять` suspected | `дуже багато людей постять цього дня` | (none) |
| L5 | 21 | Awkward construction `ви робите те, що самі дієте, наче дияволи` | `У той час ви робите те, що самі дієте, наче дияволи.` | (none) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 76 | Term `арті` deviates from glossary `Aarti → Аарті` (ceremony name, capitalized) | `встанемо й візьмемо арті` | `встанемо й візьмемо Аарті` |
| S2 | 78 | `ця Сила` capitalized — suspected over-capitalization vs lowercase `сила` elsewhere | `ця Сила створює «О»` | (none) |
| S3 | 23 | `екадашею` lowercase vs `Екадаша` capitalized elsewhere | `коли ми називаємо це екадашею, яка приносить перетворення` | (none) |
| S4 | 83 | `суперего`/`сакшат` lowercase inside mantra vs glossary `Сакшат` | `«Ом сакшат суперего мардіні»?` | (none) |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | `glossary/CLAUDE.md` mandates `...` (three dots) as the ellipsis form; the single Unicode char `…` is non-conformant. |
| L | L2 | Keep | Same house-style rule; convert `…` → `...`. |
| L | L3 | Remove | Correct punctuation: the dash marks the omitted copula (`сьогодні … – день`) and the comma closes the inserted parenthetical `згідно з індійським календарем`. Not an error. |
| L | L4 | Remove | `постять` is a valid 3rd-pers-pl form of `постити` (to fast). Original correct. |
| L | L5 | Remove | Mirrors the deliberately awkward EN source (“what you do is to act like the devils yourself”); no grammatical fault. Style preference, not an error. |
| S | S1 | Keep | Direct glossary match: `terms_lookup.yaml` lists `Aarti → Аарті`. Ceremony name → capitalized, matching `Пуджа`/`Хаван` treatment. |
| S | S2 | Remove | Mirrors EN capitalization distinction (`this Power` vs `this force`). Faithful to source; defensible. |
| S | S3 | Remove | Mirrors EN lowercase `ekadasha` here (the day/concept, not the deity-power). Source-faithful; `Екадаша` is correctly capitalized where EN capitalizes it. |
| S | S4 | Remove | Inside a tentative/uncertain mantra rendering marked `«...»?`; lowercasing within the flowing transliteration is acceptable and intentional. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 44 | `…` (U+2026) → house-style `...` | `...І це настає, коли Шіва гнівається` |
| 2 | 76 | `…` (U+2026) → `...` | `«Саба ко дуа...»` |
| 3 | 76 | `арті` → glossary form `Аарті` | `встанемо й візьмемо Аарті` |

## Summary

- Language (L): 5 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 3

**Overall:** The translation is of very high quality. Deity-pronoun
capitalization is correct throughout — Shri Mataji always uppercase
(`Я/Мене/Моєю/Сама/Своє`), singular Incarnations uppercase (Shiva, Buddha,
Mahavira, Kalki: `Він/Його/Той/Хто`), plural Incarnations correctly lowercased
(`обидва вони`, `вони не говорили`), and regular people lowercased (husband
`він`, Paul `він`). Spiritual terms (`Дух`, `Самість`, `Стопи`, `Несвідоме`,
`Безформне`, `Пуджа`) are correctly capitalized, while the personal unconscious
(`своє несвідоме`, para 84) is correctly lowercased. Glossary terminology
(`Войд`, `Вішуддхі`, `Вірата`, `Екадаша Рудра`, `Самореалізація`, `Атма`,
`гхі`, `Вішну ґрантхі`, `ґани`, `СНІД`) is accurate and consistent. Language
names (`англійська`) are lowercased. Punctuation (quotes, dashes, apostrophes,
spacing) is clean apart from the two ellipsis chars now corrected.
