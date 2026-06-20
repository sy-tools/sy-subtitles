# Language Review – 2002-10-27 Navaratri Puja: Develop Wisdom Through Meditation, Bhakti & Shraddha

Review date: 2026-06-20.

Paragraph numbers below refer to the body paragraphs of `transcript_uk.txt`
(P1 = first content paragraph "Сьогодні ми будемо поклонятися Богині…", … P24 = final paragraph).

## Process

`transcript_uk.txt` reviewed by 2 parallel reviewers (L – Language, S – SY Domain)
plus a Critic filter, per `templates/language_review_template.md`, cross-checked
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`.

Note: an earlier review pass on this talk already corrected the Shri Mataji
self-reference markers (`я б сказала` / `я думаю` / `я вважаю` → uppercase `Я`,
15 instances). Those are confirmed correct in the current text; this pass found
no remaining capitalization errors.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | P9 | Lexical/usage — `устаткуватися` (lit. "to be fitted out with equipment/machinery") is a poor match for EN "settle down". Word is correctly spelled and correctly formed, but semantically wrong. | «людям потрібен час, щоб **устаткуватися**» … «щойно ви **устаткувалися**» (EN: "people take time to settle down … once you are settled down") | (translator pass) `освоїтися` / `усталитися` / `влаштуватися` |
| L2 | P1 | Number agreement — «багато» + plural finite verb; normative Ukrainian prefers singular. | «у вас **можуть розвинутися** так багато хвороб» | (consider) «**може розвинутися** так багато хвороб» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | P19 | (Suspected) transliteration `Йоги` → `Йоґи` (Sanskrit *g* = ґ). | «вони прийдуть до Сахаджа Йо[?]и» | — |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Remove** | Out of scope for a 2+1 *language* review. Per the template, Reviewer L covers spelling errors and incorrect word *forms*; `устаткуватися` is correctly spelled and correctly inflected, so it is a lexical/translation-accuracy issue, not a language-mechanics defect — and not capitalization/terminology/consistency either. Consistent with the prior review's documented decision. **Flagged for a translation-accuracy pass / translator attention.** |
| L | L2 | **Remove** | Acceptable in this register. The text is a verbatim mirror of spoken English; «багато» + plural agreement is common in spoken Ukrainian and parallels the surrounding plural «можуть… подолати». Altering it is a stylistic preference, not a clear error. |
| S | S1 | **Remove** | **False positive.** On direct byte-level re-verification the word already reads «Сахаджа Йо**ґ**и» (ґ = U+0491), consistent with every other occurrence in the transcript and with `terms_lookup.yaml`. The glyphs г / ґ are near-identical at a glance; the suspected error does not exist. No change. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| — | — | None. All candidate findings were removed by the Critic (out-of-scope, acceptable register, or false positive). | — |

## Summary

- Language (L): 2 issues found, 0 approved by Critic
- SY Domain (S): 1 issue found, 0 approved by Critic (false positive)
- Total corrections applied this pass: **0**

The translation is already in good shape; the in-scope capitalization issues were
fixed in a prior pass and verified correct here.

## Notes / flagged for translator's attention (not applied)

- **P9** — `устаткуватися` / `устаткувалися` is the wrong verb for "settle down".
  Recommend `освоїтися` / `усталитися` in a translation-accuracy pass. Left
  unchanged here because it is outside the orthography/grammar/punctuation and
  capitalization/terminology/consistency scope of a 2+1 language review.

## Verified correct (no change needed)

- **Shri Mataji self-references** uniformly uppercase: every «Я б сказала / Я
  думаю / Я вважаю / Я бачила / Мене / Мені / Мою» is correct.
- **Goddess / Mother pronouns** uppercase: Вона/Її/Їй/Нею/Свою/Своїх/Сама,
  «Та, Хто», Богиня, Мати, Деві, Шакті, Матір'ю, Матінко (vocative).
- **Individual Incarnation pronouns** uppercase: Христа/Він/Його/Нього,
  «Тим, Хто», «Яка»; Ganesha/Ganapati singular «Самого».
- **`Сила` vs `сила`** correctly split: capital for the Divine Power (Уся Сила,
  Божественна Сила, Сила Богині, Цієї Сили, Цю Силу — mirroring EN "the Whole
  Power / Power of the Goddess / This Power / That Power"), lowercase for
  ordinary power (сила бхакті, силу над ґанами, керівна сила).
- **Spiritual terms** capitalized: Дух/Духа/Духом, Істина, Реалізація,
  Божественне, Пуджа.
- **Generic / listener `я`** correctly lowercase inside quoted self-checks
  («Чи я мудрий?», «чому я це роблю?», «я можу робити це», «я дуже мудрий»,
  «як це я отримав цю проблему?»).
- **Transliteration** consistent (ґ for Sanskrit *g*, дг for *dh*):
  ґани/Ґанапаті/Ґанеша/ґуру, шраддга, Сахаджа Йоґа/Йоґи/Йоґу/Йоґою, locative
  «в Сахаджа Йозі» (ґ→з alternation), Деві Махатм'ям, Сакшат, Кундаліні,
  Аді Шакті, ракшасів, Мохаммед Сахіб.
- **Glossary terms** match `terms_lookup.yaml`: бхакті, шраддга, его,
  віддача на милість, реалізована душа, сахаджа йоґ(и) (lowercase, hard stem -и),
  Наваратрі Пуджа, Деві.
- **Language names** lowercase (англійська, українська); `іслам` lowercase.
- **Punctuation/orthography**: «» quotation marks at all levels, spaced en-dash
  « – », apostrophe ', three-dot ellipsis; no mixed Latin/Cyrillic characters.
