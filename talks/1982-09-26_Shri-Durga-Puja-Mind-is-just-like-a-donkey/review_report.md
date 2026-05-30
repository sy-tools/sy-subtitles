# Language Review – 1982-09-26_Shri-Durga-Puja-Mind-is-just-like-a-donkey

**Talk:** Shri Durga Puja: Mind is just like a donkey — Vienna (Austria), 26 September 1982
**Source:** English → **Target:** Ukrainian
**Review date:** 2026-05-30
**Process:** 2+1 (Reviewer L + Reviewer S + Critic)

## Process

Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel over the full
paragraphed `transcript_uk.txt`. The Critic then filtered both tables, removing
false positives and trivial style preferences, and applied the survivors.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 21 | Transliteration: Sanskrit *g* must be `ґ` (rule: Йоґа) | «небезпечні для Сахаджа **Йоги**» | Сахаджа **Йоґи** |
| L2 | 32 | Transliteration: Sanskrit *g* must be `ґ` | «Для Сахаджа **Йоги** вам треба» | Для Сахаджа **Йоґи** |
| L3 | 63 | Grammar: wrong accusative of masc. name Кабір | «можете взяти **Кабіру**» | взяти **Кабіра** |
| L4 | 55 | Punctuation: closing `»` with no opening `«` | «…що це лише первородний гріх створив проблему**»**, –» | …що **«**це лише первородний гріх створив проблему», – |
| L5 | 83 | Extra space (double space) | «нехай він підійде й …␣␣Усе гаразд» | …підійде й … Усе гаразд |
| L6 | many | Ellipsis: glossary prescribes `...`, text uses single-char `…` | 66 occurrences of `…` | (considered) |
| L7 | 45, 79, 80, 133, 145, 154… | Four-dot `….` (ellipsis + period) | stage-direction trailing dots | (considered) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 16 | Divine Incarnations should be uppercase | «нам слід отримати **інкарнації** на цій землі» | отримати **Інкарнації** |
| S2 | 33 | Capital `Я` reserved for Shri Mataji; here the practitioner speaks to his own mind | «тепер **Я** маю піднестися, і **Я** маю отримати… тоді **Я** не можу піднестися» | …тепер **я** маю… і **я** маю… тоді **я** не можу… |
| S3 | 25 | Plural Incarnations mid-sentence → lowercase pronoun | «не треба приводити жодного з **Них**» | жодного з **них** |
| S4 | 26 | Plural Incarnations mid-sentence → lowercase pronoun | «І у вас є всі **Вони**: Мойсей» | всі **вони**: Мойсей |
| S5 | 7, 8, 21, 32, 33, 75, 76, 139, 156 | Ceremony term **Пуджа** must be capitalized (glossary + corpus convention); talk was internally inconsistent (title/protocol uppercase, prose lowercase) | пуджею / пуджу / пуджі / пуджа (17 occurrences) | **Пуджею / Пуджу / Пуджі / Пуджа** |
| S6 | 27 | «немає ніякої **істини**» — capitalize Істина? | "There's nothing truth in it" | (considered) |
| S7 | 191 | Latin letters in Cyrillic text: `(Priyaa)` | «якщо ти поставиш «Прія» (Priyaa)» | (considered) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Sanskrit *g* → `ґ` is a firm transliteration rule; every other "Йоґа/Йоґи" in the file already uses `ґ`. Genuine inconsistency. |
| L | L2 | **Keep** | Same rule; only 2 stray `Йоги` (г) in the whole file — both fixed. |
| L | L3 | **Keep** | Glossary form is *Кабір* (masc. 2nd decl.); accusative animate = *Кабіра*. «Кабіру» is not a valid accusative for «взяти». |
| L | L4 | **Keep** | A closing guillemet without an opening one is malformed punctuation. Added the opening `«` to balance the reported clause (cleaner than deleting `»`). |
| L | L5 | **Keep** | Double space is a genuine typographic error, not a style choice. |
| L | L6 | **Remove** | Corpus is split (353 single-char `…` vs 439 `...`); this talk uses `…` consistently throughout. Not an error — established style; mass-replacing 66 chars would be over-reach. |
| L | L7 | **Remove** | The `….` sequences sit only in editorial stage directions and mirror the English source notes; not part of the translated speech. |
| S | S1 | **Keep** | These are the Divine Incarnations sent to earth — Інкарнація is on the capitalized-spiritual-term list. |
| S | S2 | **Keep** | The quote is what the *practitioner* tells his own mind ("now **I** have to ascend"); the regular-person `я` must be lowercase. (Sentence-initial `Я` elsewhere correctly stays capitalized.) |
| S | S3 | **Keep** | "any one of **Them**" = plural Incarnations mid-sentence → lowercase per rule. The two following `Вони` are sentence-initial and correctly remain capitalized. |
| S | S4 | **Keep** | "all of **Them**" = plural Incarnations mid-sentence → lowercase. |
| S | S5 | **Keep** | Glossary lists Пуджа as an uppercase ceremony term; corpus precedent is overwhelmingly uppercase (223 vs 54). Fixing brings the talk in line with its own title and protocol heading. |
| S | S6 | **Remove** | Here "truth" means validity ("there's no truth in it"), not the absolute spiritual Істина. Lowercase is correct. |
| S | S7 | **Remove** | The Latin `Priyaa` is an intentional contrastive gloss of the Sanskrit spelling Shri Mataji is explaining; not an accidental Latin/Cyrillic mix. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 21 | Сахаджа Йоги (г) | Сахаджа **Йоґи** |
| 2 | 32 | Для Сахаджа Йоги (г) | Для Сахаджа **Йоґи** |
| 3 | 63 | взяти Кабіру | взяти **Кабіра** |
| 4 | 55 | …створив проблему», – (orphan `»`) | …що **«**це лише первородний гріх створив проблему», – |
| 5 | 83 | подвійний пробіл після `…` | одинарний пробіл |
| 6 | 16 | отримати інкарнації | отримати **Інкарнації** |
| 7 | 33 | Я / Я / Я (мова практикуючого до власного розуму) | **я / я / я** |
| 8 | 25 | приводити жодного з Них | жодного з **них** |
| 9 | 26 | І у вас є всі Вони: Мойсей | всі **вони**: Мойсей |
| 10 | 7, 8, 21, 32, 33, 75, 76, 139, 156 | пуджею/пуджу/пуджі/пуджа (17×) | **Пуджею/Пуджу/Пуджі/Пуджа** |

## Summary

- **Language (L):** 7 issues considered, **5 approved** by Critic
- **SY Domain (S):** 7 issues considered, **5 approved** by Critic
- **Total corrections applied:** 10 distinct fixes
  - of which **Пуджа** capitalization touches **17** occurrences, and the
    donkey-quote `Я→я` touches **3** occurrences.

### Notes
- The puja-protocol section (mantras, 21 names of Shri Vishnu, Ganesha Atharva
  Sheersha, etc.) was left untouched — Sanskrit transliterations are not subject
  to Ukrainian grammar correction.
- Terminology was otherwise consistent with `terms_lookup.yaml` /
  `terms_context.yaml` (Дхарма, Дух, Стопи, Богині, Нірвікальпа, ракшаси,
  Вірата, Кріта Юга, бхути, Свадхістхана, Антар Йоґа — all correct).
- Deity-pronoun capitalization for Shri Mataji (Я/Мене/Мої Стопи) and for
  singular Incarnations (Він/Його — Sai Nath, Virat Ganesha) was already correct.
