# Language Review – 1994-03-14_Mahashivaratri-Puja-Surrender, 2026-05-23

## Process

2+1 agent language review of `transcript_uk.txt` (Reviewers L + S run in parallel,
Critic filters). Source `transcript_en.txt` used for reference. Capitalization and
terminology checked against `glossary/CLAUDE.md`, `terms_lookup.yaml`,
`terms_context.yaml`.

Note on structure: the Hindi portion is rendered three times in the source (and
mirrored in UK): paragraphs 43–66 (clean) and 67–185 (line-wrapped) are the same
translation; 186–299 is a second, more literal translation. Variations that
faithfully mirror differing source spellings (e.g. Shivji/Shivaji,
Stith/Stitha/Sthita Pragnya, Bhole/bhole, Shiv padh/Shiva Padh) were treated as
source-faithful, not errors.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 18 | Gender agreement | «де, я б сказав, ви стаєте саньясі» – Shri Mataji is feminine (cf. para 10 «Я б сказала») | сказав → сказала |
| L2 | 23 | Ellipsis glyph | «я, я, я…» uses `…` (U+2026); project convention is three dots | … → ... |
| L3 | 38 | Ellipsis glyph | «віддаючись на милість… яка» uses `…` (U+2026) | … → ... |
| L4 | 283 | Direct-speech capitalization | «ви будете вражені: «звідки в мене…» – quoted full sentence after colon must start uppercase (every other such quote in the text does) | звідки → Звідки |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 18 | Deity pronoun | «я б сказав» – first-person pronoun of Shri Mataji must be uppercase | я → Я |
| S2 | 256 | Deity pronoun | «Кому б Він її не віддав, Вона – Сакшат Деві» – «її» refers to the Devi (deity); cf. parallel para 55 «Її можна було віддати» | її → Її |
| S3 | 55 | Terminology (glossary) | «Вона – «сакшат» [воістину] Деві» – glossary lists «Сакшат» capitalized | сакшат → Сакшат |
| S4 | 43, 60, 61 | Consistency | «Шівджі» used vs «Шіваджі» elsewhere for the same deity | normalize to Шіваджі |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine gender error; Shri Mataji is feminine everywhere else (Я бачила, Я сказала, Я б сказала). |
| L | L2 | Keep | 17 other talks use `...`; this is the only file with `…`. Glossary specifies `...` (three dots). |
| L | L3 | Keep | Same convention deviation as L2. |
| L | L4 | Keep | Ukrainian punctuation requires a capital for quoted direct speech after a colon; all other such quotes in this transcript are capitalized (paras 13, 21, 22, 23, 284). |
| S | S1 | Keep | Merge with L1 → single fix «Я б сказала» (uppercase + feminine). |
| S | S2 | Keep | Deity-pronoun rule; restores consistency with parallel para 55 (Її). |
| S | S3 | Remove | False positive. The text consistently lowercases glossed Sanskrit citations of the form «term» [gloss]: нірічча, ахам, самскари, самарпан, ніріччіта, шаранаґат, etc. «сакшат» [воістину] follows this convention. The glossary capital «Сакшат» applies to epithet use without a gloss, as in para 256 «Сакшат Деві» (already capitalized). |
| S | S4 | Remove | Faithfully mirrors source variation (Shivji vs Shivaji); both are valid transliterations of the honorific (शिवजी). Block 186–299 already uses Шіваджі consistently; cross-document name normalization is beyond the scope of an error-fix review. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 18 | Shri Mataji pronoun + gender (L1+S1) | «я б сказав» → «Я б сказала» |
| 2 | 23 | Ellipsis glyph | «…» → «...» |
| 3 | 38 | Ellipsis glyph | «…» → «...» |
| 4 | 256 | Devi pronoun capitalization | «її» → «Її» |
| 5 | 283 | Direct-speech capitalization | «звідки» → «Звідки» |

## Summary

- Language (L): 4 issues found, 4 approved by Critic
- SY Domain (S): 4 issues found, 2 approved by Critic (S1 merged into correction 1; S3, S4 removed as false positives)
- Total corrections applied: 5
