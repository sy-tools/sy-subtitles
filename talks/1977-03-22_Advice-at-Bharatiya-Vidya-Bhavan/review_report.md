# Language Review – 1977-03-22 Advice at Bharatiya Vidya Bhavan

## Process

2+1 review (Reviewer L = Language, Reviewer S = SY Domain, Critic = filter) of the
full `transcript_uk.txt` (paragraphs 1–91) against `transcript_en.txt`, using
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.

Overall the translation is careful, faithful and well-punctuated: Ukrainian
«»-quotes (including nested quotes), em-dashes, apostrophes `’` and the locative
`Сахаджа Йозі` are all used correctly, and deity capitalization is right in the
overwhelming majority of cases. The findings below are the genuine exceptions.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 38 | Wrong adjective: `сердечний` (= heartfelt/cordial) used for a cardiac patient | «Він сердечний хворий, спитайте.» (EN "He's a heart patient") | `серцевий хворий` (matches «серцевий напад», para 52) |
| L2 | 81 | Stray combining stress mark `и́` — no other word in the file carries one; not used in subtitles | «Ви просто зміни́теся й тікатимете» | `змінитеся` |
| L3 | 78 | Editorial marker `[незрозуміло]` lowercase, inconsistent with `[Незрозуміло]` everywhere else (paras 18, 51, 61, 82, 91) | «реалізованих дітей. [незрозуміло]. Так багато» | `[Незрозуміло]` |
| L4 | 17, 68 | Typographic ellipsis char `…` (U+2026) instead of three dots `...` per orthography rule | «…ага…», «…яким чином?» | (flag — trivial) |
| L5 | 7, 12, 18, 41 | Inconsistent space after `[` / before `]` in stage-direction brackets | «[ Це світло…», «…гінді ]» | (flag — trivial) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 48, 52 | Shri Mataji's possessive `мою фотографію` lowercase; rule mandates uppercase, and «Моя фотографія» is already uppercase in paras 49, 54 | «поставити мою фотографію», «Ви ставите мою фотографію» | `Мою фотографію` |
| S2 | 61 | `атма`/`атми` lowercase; `terms_lookup.yaml` gives `Atma → Атма` (uppercase), and the text itself uses `Атма/Атми/Атмою` in paras 19, 59 | «Ваша атма в несвідомому», «світло атми крізь неї» | `Атма` / `Атми` |
| S3 | many (10, 14, 15, 28, 30, 35, 36, 37, 41, 44, 49, 50, 60 …) | Shri Mataji's nominative pronoun `я` frequently lowercase; `glossary/CLAUDE.md` lists `Я` as always-uppercase. The file is internally mixed (correct `Я` in paras 17, 28, 38, 67) | «то я це зроблю», «я маю виконати цю роботу» | `Я` (see Critic — deferred) |
| S4 | 35 | `Йоґа Шастра` / `йоґашастра` / `Йоґашастру` — mixed capitalization & one/two-word forms | several in one paragraph | (flag — mirrors EN) |
| S5 | 26, 45 | `двіджа`, `акашу`/`акаш` lowercase; lookup lists `Двіджа`, `Акаша` uppercase | «це двіджа», «використовувати акашу» | (flag — used as concept/element) |
| S6 | 36 | `Ґоа` (Sanskrit-`ґ`) for the place name Goa; geographic proper names are not Sanskrit terms | «він у Ґоа» | (flag — house style) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine lexical error; `серцевий` is the cardiac adjective, confirmed by «серцевий напад» (para 52). Applied. |
| L | L2 | **Keep** | A stray stress mark is a real typographic defect in a subtitle source; unique to this one word. Applied. |
| L | L3 | **Keep** | Clear internal inconsistency of an editorial marker; the dominant form is `[Незрозуміло]`. Applied. |
| L | L4 | Remove | Trivial; `…` is a valid typographic ellipsis. |
| L | L5 | Remove | Trivial cosmetic spacing inside stage directions; inconsistent throughout. |
| S | S1 | **Keep** | Real rule violation + internal inconsistency vs. paras 49/54. Localized. Applied. |
| S | S2 | **Keep** | Glossary-confirmed (`Atma → Атма`) and matches the text's own dominant usage. Applied. |
| S | S3 | **Keep as finding (defer application)** | Genuine per the written rule, BUT this professionally-produced file uses lowercase nominative `я` consistently (dozens of instances), which indicates established corpus practice. Unilaterally flipping ~40–60 pronouns in one file would (a) risk diverging from the rest of the corpus and (b) require distinguishing Shri Mataji's `я` from the quoted `я` of seekers, the Civil Surgeon, Gagangarh Maharaj, etc. This needs a corpus-level decision + a dedicated careful pass, not a one-file mass replace. |
| S | S4 | Remove | Mirrors the source's own inconsistency; not a clear error. |
| S | S5 | Remove | Used as a general concept / element in running text, where lowercase is internally consistent (cf. `прітхві`); the uppercase glossary forms are dictionary headwords. |
| S | S6 | Remove | `ґ` for the hard g is established house style in this corpus. |

### Approved Corrections (applied)

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 38 | `Він сердечний хворий` | `Він серцевий хворий` |
| 2 | 48 | `поставити мою фотографію` | `поставити Мою фотографію` |
| 3 | 52 | `Ви ставите мою фотографію` | `Ви ставите Мою фотографію` |
| 4 | 61 | `Ваша атма в несвідомому` | `Ваша Атма в несвідомому` |
| 5 | 61 | `світло атми крізь неї` | `світло Атми крізь неї` |
| 6 | 78 | `[незрозуміло]` | `[Незрозуміло]` |
| 7 | 81 | `зміни́теся` (stray stress mark) | `змінитеся` |

## Summary

- Language (L): 5 issues found, 3 approved by Critic.
- SY Domain (S): 6 issues found, 2 approved by Critic.
- **Total corrections applied: 7** (paras 38, 48, 52, 61×2, 78, 81).
- **Deferred (needs corpus-level decision + dedicated pass):** Shri Mataji's
  nominative `я` → `Я` (S3) — pervasive and entangled with other speakers' quoted
  `я`; flipping it in one file unilaterally is riskier than leaving it for a
  corpus-wide normalization.
