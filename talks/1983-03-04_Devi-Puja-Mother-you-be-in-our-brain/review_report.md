# Language Review – 1983-03-04 Devi Puja: Mother you be in our brain, Adelaide

## Process

2+1 review of `transcript_uk.txt` (full paragraphed Ukrainian text) against
`transcript_en.txt`, `glossary/CLAUDE.md`, `terms_lookup.yaml`, and
`terms_context.yaml`. Reviewer L (Language) and Reviewer S (SY Domain) run in
parallel; the Critic filters their findings and resolves conflicts.

Pre-checks across the file: quotation marks balanced `«» 117/117`, all dashes are
en-dash ` – ` (no `—`, no ` - `), no German/English quotes, no straight quotes,
no double spaces, no Latin/Cyrillic mixing. Deity reflexives (`Сама` ¶15,
`Собі` ¶23, `Своєю`/`Свою` ¶41) consistently capitalised — except ¶55.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 35 | Gender disagreement | `ви ставите вогонь перед Моєю фотографією – вона завібрована` — feminine `вона` does not agree with masculine `вогонь`; parallel clause `Ви ставите світло – воно завіброване` confirms the subject is the object placed, not the photograph | `вогонь … – він завібрований` |
| L2 | 26, 30, 31, 32, 55 (×4), 59, 62, 64 | Non-canonical ellipsis glyph | Single-character `…` (U+2026) used in 11 places; glossary orthography rule prescribes `...` (three dots), followed by the majority of the corpus | Normalise all `…` → `...` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 55 | Deity pronoun lower-cased | Mother quoting Herself: `«Я думаю, я принесла…»` — the second `я` (Shri Mataji) must be uppercase ("Я" ALWAYS uppercase for Shri Mataji) | `«Я думаю, Я принесла...»` |
| S2 | 55 | Deity reflexives lower-cased | `Я принесла свої чаппали (сандалі) із собою` — both refer to Shri Mataji; the document capitalises deity reflexives everywhere else (`Сама`, `Собі`, `Своєю`, `Свою`) | `Свої чаппали … із Собою` |
| S3 | 55 | Term formatting inconsistency | `Махат Аханкарі` written with a space; glossary canonical form is hyphenated `Махат-Аханкара` and the corpus uses `Махат-Аханкара`/`Махат-Аханкарою` | `Махат-Аханкарі` |
| S4 | 9, 15 | (candidate) `Агні Девата` vs glossary `Агні Девта` | Glossary `terms_lookup.yaml` lists `Агні Девта` | (see Critic) |
| S5 | 12 | (candidate) `істина` lower-cased | `це істина, а істина – це любов`; glossary lists `Істина` uppercase for absolute Truth | (see Critic) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine grammatical agreement error; the parallel `світло … воно завіброване` proves the placed object is the subject. |
| L | L2 | **Keep** | The glossary explicitly prescribes `...` (three dots); 45/69 corpus transcripts already comply. Adherence to a written orthography rule, not a style preference. |
| S | S1 | **Keep** | Direct application of the "Shri Mataji: ALWAYS uppercase (Я)" rule; the surrounding `Я думаю`/`Я маю`/`Я сказала` are already uppercase, so this is also an internal inconsistency. |
| S | S2 | **Keep** | Internal-consistency fix: the same document capitalises every other deity reflexive (`Сама` ¶15, `Собі` ¶23, `Своєю`/`Свою` ¶41). Leaving `свої`/`собою` lower-case for Shri Mataji is the lone exception. |
| S | S3 | **Keep** | Aligns to the glossary canonical hyphenation and the corpus convention; low-risk consistency fix. |
| S | S4 | **Remove** | False positive. The corpus uses `Девата` (de-facto standard, 9 occurrences); the glossary spelling `Девта` appears in **no** translated transcript. `Девата` also matches the English source ("Agni Devata") and is internally consistent. Changing it would reduce source fidelity and break corpus consistency. |
| S | S5 | **Remove** | False positive. Here `truth` is used in the discernment sense (truth vs. untruth), consistent with the lower-case `істиною`/`істину` in ¶10 and ¶12. It is not the named divine principle "the Truth", so uppercase is not warranted; lower-case is consistent and contextually correct. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 35 | `вогонь … – вона завібрована` (gender) | `вогонь … – він завібрований` |
| 2 | 26, 30, 31, 32, 55 (×4), 59, 62, 64 | `…` (U+2026) ellipsis | `...` (11 occurrences) |
| 3 | 55 | `«Я думаю, я принесла…»` (deity pronoun) | `«Я думаю, Я принесла...»` |
| 4 | 55 | `свої чаппали … із собою` (deity reflexives) | `Свої чаппали … із Собою` |
| 5 | 55 | `Махат Аханкарі` (term formatting) | `Махат-Аханкарі` |

## Summary

- Language (L): 2 issues found (1 grammar, 1 orthography covering 11 instances), 2 approved by Critic
- SY Domain (S): 5 issues found, 3 approved by Critic (S4, S5 removed as false positives)
- Total corrections applied: 16 individual changes across 5 finding categories
  (1 gender, 11 ellipsis, 1 deity pronoun, 2 deity reflexives, 1 term hyphenation)
