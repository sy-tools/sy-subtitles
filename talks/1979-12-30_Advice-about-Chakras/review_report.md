# Language Review – Advice about Chakras, 30 December 1979

## Process

2+1 agent review of `transcript_uk.txt` (Reviewer L + Reviewer S, then Critic filter).
Mechanical baseline was clean before review: 0 straight apostrophes (32 × `’`),
0 em-dashes (125 × `–`), 0 hyphen-as-dash, 0 double spaces, 0 spaces before
punctuation, balanced guillemets (100 × `«` / 100 × `»`), no stray Latin inside
Cyrillic words (all Latin is intentional Marathi/Hindi/Sanskrit/English glosses).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 25 | Calque «на + мові» | «**На мові мараті** теж можна дещо сказати» | «**Мовою мараті** теж можна дещо сказати» |
| L2 | 31 | Calque «на + мові» | «**На мові мараті**, бачте, у нас є гарні назви» | «**Мовою мараті**, бачте…» |
| L3 | 39 | Verb government (керування) — «заздрити» governs the dative | «бо ви не дуже **до них заздрите**» | «бо ви не дуже **їм заздрите**» |
| L4 | 50 | Missing comma before subordinate purpose clause «(просто) щоб…» | «Ви вдягнете червоні штани **просто щоб** пасувати до блакитної» | «червоні штани**,** просто щоб пасувати…» |
| L5 | 58 | Malformed bracket — stray unmatched `(` in stage marker (mirrors a source typo) | `[(Мати говорить на мараті.]` | `[Мати говорить на мараті.]` |
| L6 | all (12×) | Ellipsis glyph `…` vs house style `...` (three dots) | «справді…», «не роби, не роби…» | (proposed) `...` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 29,30,31,32,33,34,38,39,40 (18×) | Spiritual term **Дхарма** must be uppercase (glossary `dharma → Дхарма`; CLAUDE.md). Noun forms only. | «У **дхармі**…», «**дхарма** – це ваша власна зосередженість», «світло **дхарми**» | «У **Дхармі**…», «**Дхарма** – це…», «світло **Дхарми**» |
| S2 | 16,17,18,19,23,24,25,26,31,33,34,35,36,37,39,41,59,63,69,73,76,83 (39×) | Shri Mataji's first-person pronoun **я** must ALWAYS be uppercase | «як **я** сказала», «**я** говорю англійською», «оце **я** можу вам сказати» | «як **Я** сказала», «**Я** говорю англійською», «оце **Я** можу…» |
| S3 | 63 | Shri Mataji pronoun **мені** → uppercase | «як же **мені** описати вам цю дружбу» | «як же **Мені** описати…» |
| S4 | 41 | Shri Mataji possessive **моїх** (Her own initials) → uppercase | «Ви не бачите **моїх** ініціалів на мармурі» | «…**Моїх** ініціалів…» |
| S5 | 34 | Spiritual term **Інкарнація** → uppercase (divine Incarnations) | «окрім людей, які є **інкарнаціями**» | «…які є **Інкарнаціями**» |
| S6 | 26 | Consistency: **Реалізація** capitalised everywhere else (same ¶ has «без Реалізації»; ¶74 «після Реалізації») | «Після **реалізації** – бо ви знайшли…» | «Після **Реалізації**…» |
| S7 | 14 | (considered) `нірвічара` / `самадхі` lowercase | «стан усвідомлення без думок – нірвічара» | — |
| S8 | 72,82 | (considered) `майя` lowercase (illusion sense) | «Я створюю майю», «завжди присутня майя» | — |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | «на (українській/мараті) мові» is a recognised Russian calque; normative form is instrumental «мовою». Text already uses «мовою мараті» (¶55, ¶59) — fixing improves consistency too. |
| L | L2 | **Keep** | Same calque as L1. |
| L | L3 | **Keep** | «заздрити» requires the dative («заздрити комусь»); «заздрити до когось» is non-normative government. |
| L | L4 | **Keep** | Adverbial purpose clause must be set off by a comma. |
| L | L5 | **Keep** | Objectively malformed (unmatched `(`); all other identical stage markers are `[Мати говорить на мараті.]`. Safe, unambiguous cleanup. |
| L | L6 | **Remove** | Not a translation error: the EN source uses the identical `…` glyph 12× (0 three-dot), so the form is consistent and mirrors the source; `…` is typographically valid. Changing only the UK side would diverge from source without benefit. |
| S | S1 | **Keep** | Authoritative: `terms_lookup.yaml` (`dharma → Дхарма`) + CLAUDE.md spiritual-term list. Adjective/people forms (`дхармічні`, `дхармічна`, `дхарміки`) correctly stay lowercase. |
| S | S2 | **Keep** | Authoritative rule (CLAUDE.md / template): Shri Mataji = ALWAYS uppercase. Translation already capitalises it in ¶32/61/71/72 — lowercase ones are oversights. All 27 lowercase `я` left untouched are inside quotes of OTHER speakers (verified). |
| S | S3 | **Keep** | Same rule as S2 (`Мені`). |
| S | S4 | **Keep** | Refers to Shri Mataji's own initials; possessive `Мій/Моя/…` always uppercase for Her. |
| S | S5 | **Keep** | Spiritual term explicitly listed for capitalization (Інкарнація). Plural-pronoun rule (вони/вони) is unaffected and was already correct in ¶34. |
| S | S6 | **Keep** | Consistency fix; «Реалізація» as the event is capitalised in the same ¶ and in ¶74. |
| S | S7 | **Remove** | `самадхі` is glossary-lowercase; capitalising only `нірвічара` would create an inconsistent pair. Both states left lowercase (consistent). |
| S | S8 | **Remove** | Here `майя` = "an illusion" (common-noun sense), distinct from the title `Махамайя` (kept uppercase in ¶81–82). Lowercase is defensible. |

### Approved Corrections

| # | Paragraph(s) | Error | Fix |
|---|--------------|-------|-----|
| 1 | 29,30,31,32,33,34,38,39,40 | `дхарма` (noun) lowercase | → `Дхарма` (18 instances) |
| 2 | 16,17,18,19,23,24,25,26,31,33,34,35,36,37,39,41,59,63,69,73,76,83 | Shri Mataji `я` lowercase | → `Я` (39 instances) |
| 3 | 63 | Shri Mataji `мені` | → `Мені` (1) |
| 4 | 41 | Shri Mataji `моїх` (Her initials) | → `Моїх` (1) |
| 5 | 34 | `інкарнаціями` | → `Інкарнаціями` (1) |
| 6 | 26 | `Після реалізації` | → `Після Реалізації` (1) |
| 7 | 25,31 | `На мові мараті` | → `Мовою мараті` (2) |
| 8 | 39 | `не дуже до них заздрите` | → `не дуже їм заздрите` (1) |
| 9 | 50 | missing comma | → `червоні штани, просто щоб пасувати` (1) |
| 10 | 58 | stray `(` | → `[Мати говорить на мараті.]` (1) |

## Summary

- Language (L): 6 issues raised, 5 approved by Critic (L6 ellipsis removed — mirrors source).
- SY Domain (S): 8 issues raised, 6 approved by Critic (S7 нірвічара, S8 майя removed).
- **Total corrections applied: 66** (18 `Дхарма` + 41 Shri-Mataji pronouns + `Інкарнаціями` + `Реалізації` + 2 `мовою мараті` + `заздрите їм` + comma + bracket).
- Dominant findings are two glossary-mandated capitalization rules; the underlying
  translation is accurate and mechanically clean. No false-positive corrections applied.
