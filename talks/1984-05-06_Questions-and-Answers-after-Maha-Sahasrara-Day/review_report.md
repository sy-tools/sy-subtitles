# Language Review – 1984-05-06_Questions-and-Answers-after-Maha-Sahasrara-Day, 6 May 1984

## Process

2+1 agent language review (Reviewer L + Reviewer S + Critic) on `transcript_uk.txt`,
cross-checked against `transcript_en.txt`, `glossary/CLAUDE.md`,
`glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

All candidate findings were validated **against the actual glossary entries** before
being applied. Several plausible-looking "errors" turned out to match the glossary
verbatim and were rejected as false positives by the Critic (see below).

---

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 56 | Nested quote uses straight/English double quotes `"…"` instead of Ukrainian «» (glossary: nested quotes are also «», NEVER `"` or `„"`) | `«Забери своє "мадамське перлове намисто"»` | `«Забери своє «мадамське перлове намисто»»` |
| L2 | 21 | Single-character ellipsis `…` (U+2026) instead of three dots `...` (glossary orthography: ellipsis = `...`) | `…їхній розум не…».` | `…їхній розум не...».` |
| L3 | 58 | Single-character ellipsis `…` | `…ми б тепер узяли Твою мантру, і Ти…` | `…і Ти...` |
| L4 | 60 | Single-character ellipsis `…` | `Шрі Матаджі, можливо, я б, бо…` | `…я б, бо...` |
| L5 | 47 | `Центральний Комітет` – second word capitalized for an ad-hoc body (UA norm: only first word, `Центральний комітет`) | `повідомити Центральний Комітет` | `Центральний комітет` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Finding | Context | Verdict against glossary |
|---|-----------|---------|---------|--------------------------|
| S1 | 7, 25, 29, 44 (genitive, 9 occurrences) | Genitive of `Сахаджа Йоґа` should preserve **ґ** → `Сахаджа Йоґи`; only the locative becomes `Йозі` (`terms_context`: «Місцевий відмінок: в Сахаджа Йозі … НЕ "Йоґі"»). Accusative `Йоґу` already uses ґ, so the genitive must match. | `Сахаджа Йоги` (г, U+0433) | **Normalize → `Сахаджа Йоґи` (ґ, U+0491)** |
| S2 | 24, 25, 31, 35 | `бхут / бхути / бхутів …` — suspected transliteration of *bhoot* | — | **CORRECT** — `terms_lookup` l.62 `bhoots: бхути`. False positive. |
| S3 | 32 | `бхакті` — suspected transliteration of *bhakti* | `красу бхакті` | **CORRECT** — `terms_lookup` l.370 `bhakti: бхакті`. False positive. |
| S4 | 52 | `Праг'я` — suspected `г`→`ґ` (Sanskrit *g*) | `про Праг'я локу` | **CORRECT** — `terms_lookup` l.72 `Рітамбхара Праг'я`. False positive. |
| S5 | 48, 49 | `Реалізовані Душі` / `Реалізованою Душею` — capitalization of "soul" | — | **CORRECT** — `terms_lookup` l.30 explicitly lists `Реалізована Душа` (capitalised) as a valid form; consistent with `Реалізований` used in §27, §52. False positive. |
| S6 | 38 | `сіддху / сіддхою` — suspected `дх`→`дг` | `«сіддху» [силу]` | **CORRECT** — `terms_lookup` l.152 `siddhis: сіддхі` (дх), matching aspirate-`dh`→`дх` convention (cf. Вішуддхі). False positive. |
| S7 | 40 | Mohammed pronoun `він` (lowercase) | `Бо він не був пророком…` | **Keep lowercase** — inside the fanatics' reported speech *denying* his incarnation status; EN source also lowercase. False positive. |
| S8 | 36 | Mother Earth pronouns `вона / неї` (lowercase) | `вона вбирає в себе всі проблеми` | **Keep lowercase** — naturalistic element context; EN source lowercase. False positive. |
| S9 | 52 | `Вона просто наче неосвічена…` (refers to Uma Vasudev, a critic, not a deity) | `Про що вона говорить? Вона просто наче…` | **Keep capital** — sentence-initial after `?`; capitalization is grammatically required, not a deity marker. False positive. |

*(Deity-pronoun capitalization for Shri Mataji — Я/Мене/Мені/Мій/Моя/Мною/Вона/Її/Ти/Ви —
and for individual Incarnations — Він/Його — was checked throughout and is correct.
Spiritual-term capitalization — Дух, Інкарнація, Пуджа, Стопи, Реалізація, Махамайя,
Деві, Шакті — is correct. Language names — англійська, маратхі, німецькою, італійською —
are correctly lowercase.)*

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Clear violation: glossary forbids straight/English quotes at any nesting level. |
| L | L2 | **Keep** | Glossary mandates `...` (three dots) for ellipsis. |
| L | L3 | **Keep** | Same as L2. |
| L | L4 | **Keep** | Same as L2. |
| L | L5 | **Remove** | Borderline style; `Central Committee` is a named body — both-caps defensible, not a clear error. |
| S | S1 | **Keep** | Glossary requires `ґ` in `Сахаджа Йоґа`; genitive `Йоґи` keeps ґ (only locative → `Йозі`). |
| S | S2 | **Remove** | False positive — original matches `terms_lookup` (`бхути`). |
| S | S3 | **Remove** | False positive — original matches `terms_lookup` (`бхакті`). |
| S | S4 | **Remove** | False positive — original matches `terms_lookup` (`Праг'я`). |
| S | S5 | **Remove** | False positive — `Реалізована Душа` is a glossary-sanctioned capitalised form. |
| S | S6 | **Remove** | False positive — `сіддх-` (дх) matches the glossary and `dh`→`дх` rule. |
| S | S7 | **Remove** | False positive — reported denial speech; EN lowercase. |
| S | S8 | **Remove** | False positive — element context; EN lowercase. |
| S | S9 | **Remove** | False positive — sentence-initial capitalization. |

### Approved Corrections (applied to `transcript_uk.txt`)

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 56 | Straight/English double quotes for nested quote | `«мадамське перлове намисто»` (Ukrainian «») |
| 2 | 21 | Ellipsis `…` (U+2026) | `...` |
| 3 | 58 | Ellipsis `…` (U+2026) | `...` |
| 4 | 60 | Ellipsis `…` (U+2026) | `...` |
| 5 | 7, 25, 29, 44 (9 occurrences) | Genitive `Сахаджа Йоги` (г) | `Сахаджа Йоґи` (ґ preserved, per glossary) |

---

## Summary

- **Language (L):** 5 issues found, **4 approved** by Critic (1 removed as trivial style).
- **SY Domain (S):** 9 items checked, **1 approved** by Critic (8 rejected as false
  positives — confirmed against `terms_lookup.yaml` / `terms_context.yaml`).
- **Total correction categories applied:** 5
  (3 ellipsis fixes, 1 nested-quote fix, 1 genitive `ґ`-normalization).

The translation is of high quality: deity-pronoun and spiritual-term capitalization,
Sahaja-Yoga terminology, transliteration (бхут, бхакті, Праг'я, сіддх-, Кундаліні,
Махамайя, тапасья, ліла, лока, прадеша, мандала), quotation marks, and em-dashes were
overwhelmingly correct. The applied fixes are limited to punctuation normalization
(ellipsis, nested quotes) and one declension-transliteration consistency point.
