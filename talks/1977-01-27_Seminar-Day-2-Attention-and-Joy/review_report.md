# Language Review – 1977-01-27_Seminar-Day-2-Attention-and-Joy, 2026-05-29

## Process

2+1 review of `transcript_uk.txt` (Ukrainian) against `transcript_en.txt` (English),
using `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`.
Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic filtered
their findings; approved corrections were applied to `transcript_uk.txt`.

Paragraph numbers correspond to line numbers in `transcript_uk.txt`.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 8 | Case form — preposition «поза» governs the **instrumental** case; here the accusative «тіло» is used | «її можна відхилити будь-куди, поза тіло» | «поза тілом» (cf. the same talk, §37: «поза часом», «поза простором») |
| L2 | 6, 26, 33, 34, 39, 41, 42, 44, 46 | Orthography/consistency — single-character ellipsis «…» (U+2026) used instead of the three-dot «...» mandated by `glossary/CLAUDE.md` | «…надто розхитується», «і тварини…», «будь-що…», «…що стосується», «викопати… спершу», «увагу…» etc. (10 occurrences) | replace «…» → «...» |
| L3 | 20 | Punctuation — repeated conjunction «чи … чи» | «через фізичну ваду чи фізичну недугу чи щось таке» | possible comma before the 2nd «чи» |
| L4 | 35 | Grammar/style — dubious passive participle of «покінчити» | «ваше старе життя … має бути покінчене» | e.g. «має бути завершене» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 9, 13, 14, 16, 19, 20, 22, 24, 27, 36, 37, 40 | Deity-pronoun capitalization — Shri Mataji's **first-person** pronoun «я» / possessive «моя» left lowercase. Rule (`glossary/CLAUDE.md`): Shri Mataji ALWAYS uppercase (Я/Мені/Мій/Моя…). The text already uppercases the object forms «Мені/Мене» everywhere and «Я» once (§19 «така особа, як Я»), so the lowercase subject forms are an internal inconsistency. | §9 «якщо моя рука … я можу»; §13/14/20 «я б сказала»; §14/40 «я бачила»; §16 «я справді не знаю», «я лише боюся», «якщо я скажу»; §19 «як я вам описала»; §22 «як я вам казала»; §24 «І я сказала їй»; §27 «як оцінила вас я»; §36 «я фіксую», «я опустила»; §37 «коли я говорю» | capitalize → «Я» / «Моя» |
| S2 | 31 | Terminology (possible) — «sympathetic bondage» rendered «симпатичне поневолення» | «звички, що дають вам симпатичне поневолення» | (consider «симпатична залежність» — sympathetic nervous system) |

> Verified correct (no change): all deity references for individual Incarnations / God
> are already correctly uppercase — Krishna «грав на Своїй флейті», «Він навіть не
> говорив» (§42); «Він виконує роботу», «у повній єдності з Ним» (§45); «до Нього»,
> «до Божественного» (§40); «на вашій Атмі, на вашому Дусі, на Богові» (§45). Spiritual
> terms correctly capitalized: Реалізація (consistent), Калі Юга (§18), Кундаліні (§14),
> Істина (§36), Атма/Дух (§45), Сахаджа/сахаджа (per-EN discretion). Glossary terms
> correct: Вішуддхі/Аґія чакра, пітха, гопії (lc), Гокул, Крішна, мурлі, тапасьї,
> Сахаджа Йозі (locative). Language name «маратхі» correctly lowercase (§27).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| S | S1 | **Keep** | Documented, unconditional deity-pronoun rule. Internal inconsistency (object «Мені/Мене» and §19 «Я» already uppercased). Corpus strongly confirms convention: «Я б сказала» 58 vs 9, «Я бачила» 101 vs 6, «Я вам» 48 vs 12. Only the **narrator's** first person is capitalized — pronouns inside quoted speech (yogis, the child, the woman, the listener's self-talk in §§15, 23, 24, 26, 35, 38, 40) stay lowercase. |
| L | L1 | **Keep** | «поза» + instrumental is standard literary Ukrainian; the talk itself uses «поза часом / поза простором» (§37). Clear grammatical error, not style. |
| L | L2 | **Keep** | `glossary/CLAUDE.md` explicitly prescribes «...» (three dots); corpus dominance 302 vs 32 (26 files vs 3). A genuine consistency fix, applied uniformly. |
| L | L3 | **Remove** | «щось таке» is a loose catch-all tail of an "or…or something" series; the comma is optional and native usage commonly omits it. Not a clear-cut error — avoid overreach. |
| L | L4 | **Remove** | Meaning is clear and faithful to the EN ("is to be finished"); the alternative is a stylistic rewrite, not a rule violation. |
| S | S2 | **Remove** | The source phrase "sympathetic bondage" is itself ambiguous; «симпатичне» is defensible. Not a glossary term — outside the scope of precise, rule-backed corrections. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | «моя рука … я можу» (Shri Mataji 1st person) | «Моя рука … Я можу» |
| 2 | 13 | «коли ви реалізовані, я б сказала» | «… Я б сказала» |
| 3 | 14 | «Наприклад, я б сказала» | «… Я б сказала» |
| 4 | 14 | «після отримання Реалізації я бачила» | «… Я бачила» |
| 5 | 16 | «і я справді не знаю» | «і Я справді не знаю» |
| 6 | 16 | «І я лише боюся … якщо я скажу» | «І Я лише боюся … якщо Я скажу» |
| 7 | 19 | «І, як я вам описала» | «… як Я вам описала» |
| 8 | 20 | «Але я б сказала, що вони теж» | «Але Я б сказала…» |
| 9 | 22 | «Як я вам казала, коли магніт» | «Як Я вам казала…» |
| 10 | 24 | «Уявіть собі! І я сказала їй» | «… І Я сказала їй» |
| 11 | 27 | «як оцінила вас я.» | «як оцінила вас Я.» |
| 12 | 36 | «Ось так я фіксую вашу увагу» | «… Я фіксую…» |
| 13 | 36 | «ви стали витонченішими, я опустила вас туди» | «… Я опустила вас туди» |
| 14 | 37 | «коли я говорю» | «коли Я говорю» |
| 15 | 40 | «коли стають еволюціонованими, я бачила» | «… Я бачила» |
| 16 | 8 | «поза тіло» | «поза тілом» |
| 17 | 6, 26, 33, 34, 39, 41, 42, 44, 46 | «…» (single-char ellipsis, ×10) | «...» (three dots) |

## Summary

- Language (L): **4** issues found, **2** approved by Critic (L1 «поза тілом»; L2 ellipsis ×10)
- SY Domain (S): **2** issues found, **1** approved by Critic (S1 deity-pronoun capitalization)
- Total corrections applied: **17 edits** — 15 deity-pronoun capitalizations (17 pronoun
  instances «я»/«моя» → «Я»/«Моя» across 12 paragraphs), 1 case fix («поза тілом»),
  and 10 ellipsis normalizations («…» → «...»).
