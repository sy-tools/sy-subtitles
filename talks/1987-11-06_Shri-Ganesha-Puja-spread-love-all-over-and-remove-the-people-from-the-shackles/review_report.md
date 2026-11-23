# Language Review – 1987-11-06_Shri-Ganesha-Puja-spread-love-all-over-and-remove-the-people-from-the-shackles, 1987-11-06

## Process

The 2+1 review from `templates/language_review_template.md` was run on `transcript_uk.txt`,
with `transcript_en.txt` as the reference:

- **Reviewer L** – orthography, grammar, punctuation
- **Reviewer S** – SY domain: capitalization, terminology, consistency
- **Critic** – filtered both tables and kept only genuine errors

"Paragraph" numbers are the line numbers in `transcript_uk.txt`.

### Automated checks (all clean)

- No Latin characters mixed into Cyrillic words, and no Latin words at all
- No straight `"` / `'`, German `„“` or English `“”` quotes: only `«»`, balanced on every line
- Apostrophe is always `’` (U+2019)
- No hyphen used as a dash: all dashes are ` – ` (U+2013) with spaces; no em-dash `—`
- Ellipsis is `...` with no space before it; no double periods
- No space before punctuation, no missing space after it, no double spaces

### Consistency checks against the corpus (all clean)

| Item | This talk | Corpus |
|------|-----------|--------|
| Header line 4 | `Мова промови: англійська \| Транскрипт (українська)` | the same in 113 talks |
| Gregoire | Ґреґуар | 17 talks (1 talk uses Грегуар) |
| Gavin | Ґевін | 15 talks (none use Гевін) |
| Gandhi | Ґанді | 6 talks (none use Ганді) |
| Rustom | Рустом | 9 talks |
| Freud | Фройд | 10 talks (2 use Фрейд) |
| sanyasi | саньясі | 6 talks (4 use санньясі) |
| Lakshmi Tattwa | Лакшмі Таттва | matches the glossary pattern (Ґанеша Таттва, Брахма Таттва) |

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 37 | Extra comma before a single conjunction «і» joining homogeneous members (infinitives after «мусите») | «змагатися в доброті одне до одного, і змагатися в тому, щоб бути смиреннішими» | «змагатися в доброті одне до одного і змагатися в тому, щоб бути смиреннішими» |
| L2 | 22 | Concessive «куди б ви не пішли» may be a calque; purists prefer «хоч би куди» | «і тепер, куди б ви не пішли, те, що ви знаходите» | «і тепер, хоч би куди ви пішли, …» |
| L3 | 26 | Comma before the comparative «як» | «вони ставляться до будинку, як до храму» | «вони ставляться до будинку як до храму» |
| L4 | 18 | «по телевізору» may be a Russianism | «Вони бачать по телевізору якусь іграшку» | «Вони бачать на телебаченні якусь іграшку» |
| L5 | 23 | «як буде» is an awkward rendering of "whatever may be the case" | «у віці вісімнадцяти чи шістнадцяти років, як буде» | «…, як коли» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 31 | Reflexive pronoun for Shri Mataji is lowercase. Everywhere else in this transcript it is capitalized (дбаю про Себе, відчинити Свою комору, купити Собі сарі, для Себе Я досить скупа, скупа щодо Себе) | «за дуже помірною ціною, яку Я могла собі дозволити» | «яку Я могла Собі дозволити» |
| S2 | 40 | "Gandhi" spelled with ґ; the common Ukrainian spelling is «Ганді» | «чи те, що зробив Махатма Ґанді» | «Махатма Ганді» |

Also verified, with no issue found:

- **Shri Mataji's pronouns** are uppercase throughout: Я / Мене / Мені / Мій / Моя / Моє / Мої / Мною, Вона in the servants' quote (36), Ви / Свій in the yogis' quote (30), and Тобі in Her husband's quote (36).
- **Lowercase pronouns** were checked one by one. They belong to other people: the wife (17), Gavin (34), the husband's «у своїй шафі» (36), and generic "we" / "you" / "people".
- **Glossary terms** are used correctly:
  - Сахаджа Йоґа, with locative «Сахаджа Йозі»
  - сахаджа йоґ / йоґів / йоґами
  - Реалізація / Самореалізація, capitalized consistently
  - реалізована душа, вібрації, колективність, Пуджа / Ґуру Пуджу / Ґуру Пудж
  - Ґанеша Пуджа, and «Нехай Бог благословить усіх вас»
- **Language names** are lowercase: англійська, англійську мову.
- **Translator's square-bracket additions** follow the Fidelity rule: [це] (22), [ті,] (24, 25), [такі люди] (25), [доводилося] (26), [до Іспанії] (31).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | A genuine punctuation error. In Ukrainian, no comma goes before a single «і» between homogeneous members. The first member's subordinate clause («щоб більше любити одне одного») already closed with its own comma, so nothing justifies this one. Removing it changes nothing in the spoken content. |
| L | L2 | Remove | «куди б ви не пішли» is a widespread, accepted concessive construction and appears in 7 other talks in this corpus. Changing it is a style preference, not an error. |
| L | L3 | Remove | Here the «як» phrase is a real comparison (treat the house *as if it were* a temple), not «в ролі». Setting it off with a comma is acceptable, so this is not an error. |
| L | L4 | Remove | «по телевізору» is common, accepted Ukrainian usage. It is a style preference. |
| L | L5 | Remove | «як буде» is colloquial but readable and grammatical. It mirrors the spoken hedge, so rephrasing it is style, not correction. |
| S | S1 | **Keep** | A genuine inconsistency in deity-pronoun capitalization. Shri Mataji's pronouns are always uppercase, and this transcript capitalizes Her reflexive pronouns everywhere else (5 occurrences). This is the single lowercase exception. |
| S | S2 | Remove | False positive. Ґ for Sanskrit/Hindi "g" is the project's transliteration convention (`glossary/AGENTS.md`), and «Ґанді» is the spelling used in all 6 corpus talks that mention him. |

No conflicts between L and S. The two approved corrections touch different paragraphs.

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 37 | «змагатися в доброті одне до одного, і змагатися» – extra comma before a single «і» | «змагатися в доброті одне до одного і змагатися» |
| 2 | 31 | «яку Я могла собі дозволити» – Shri Mataji's reflexive pronoun is lowercase | «яку Я могла Собі дозволити» |

## Summary

- Language (L): 5 issues found, 1 approved by Critic
- SY Domain (S): 2 issues found, 1 approved by Critic
- Total corrections applied: 2

Overall, the translation is of high quality. Typography (quotes, dashes, apostrophes, ellipses) is clean throughout, and SY terminology and deity-pronoun capitalization are consistent. The translator's square-bracket additions follow the Fidelity rule, and no content was silently repaired.
