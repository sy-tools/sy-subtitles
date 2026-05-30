# Language Review – 1987-10-16_Shri-Mahakali-Puja-The-Culture-Of-The-Spirit, 2026-05-30

## Process

Review `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter.
Source: `transcript_en.txt`. Rules: `CLAUDE.md`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`.

The text is mechanically very clean. Automated sweeps confirmed:
- Quotation marks: only `«»` (no `„"`, `""`, or straight quotes).
- Apostrophe: only `’` (U+2019), 12 occurrences.
- Dashes: en-dash `–` (U+2013), always surrounded by spaces; no em-dash (U+2014).
- No double spaces, no space-before-punctuation, ellipses `...` correct (no space before).
- All Sanskrit-origin sacred names use ґ (Ґанеша, Ґуру, Ґатха, Ґрантх, Ґанапатіпуле, ґани, ґурудварах, Ґанеші).
- Latin-script tokens are intentional: English wordplay (Germany/Germ/germ/Germinate, §8) and the Marathi original quote (Nirgunachya bheti alo sagunashi, §26).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | §19 | Possible gender-agreement (neuter vs. fem. head noun) | «розсудливість, знання розсудливості, **вбудоване** у вас» | «вбудована» (agree with «розсудливість») |

No spelling errors, no mixed-script slips, no punctuation/quote/dash/spacing issues were found.

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | §8 | Transliteration: «Йоги» spelled with г instead of ґ (glossary: «Сахаджа Йоґа»; rest of text uses ґ) | «Проростання Сахаджа **Йоги**…» and «…людей для Сахаджа **Йоги**.» | «Сахаджа **Йоґи**» (×2) |
| S2 | §26 | Spiritual-term capitalization inconsistency: «чайтаньї» lowercase while «Чайтанью»/«Чайтаньї» are uppercase in the same passage; glossary capitalizes Чайтанья | «Ти той, хто є у формі тієї **чайтаньї**» | «тієї **Чайтаньї**» |
| S3 | §26 / §28 | Saint-name spelling varies: «Намадева» (§26, §28) vs «Намдевом» (§28) | «…працювала з цим **Намдевом**…» | «Намадевом» (unify) |

Deity-pronoun capitalization checked throughout and correct: Shri Mataji always uppercase (Я/Мені/Мою/Мене/Собі and Ти/Тебе when a yogi addresses Mother, §11); Guru Nanak singular uppercase (Він/Собою, §27); Mother Earth uppercase (Вона, §11); regular people / the yogi quoting himself lowercase (я, §11, §31). Language names lowercase (англійська §4, пенджабі/маратхі/пенджабською §27, санскритською §35). Spiritual terms correct: Дух/Духа, Пуджа, Реалізацію, Кундаліні, его, карма/акарма, бандхан, ашрам, Дівалі, Махакалі.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Remove** | Not a clear error. Neuter «вбудоване» agrees with the immediately preceding appositive «знання розсудливості»; this is acceptable Ukrainian and mirrors the loose source structure («the discretion, the knowledge of discretion, is built…»). A style preference, not a genuine error. |
| S | S1 | **Keep** | Genuine transliteration error. Glossary mandates ґ for Sanskrit g («Сахаджа Йоґа»); the same root is spelled with ґ everywhere else in this transcript (йоґ, йоґа, йоґи, йоґів, йоґами, Йоґи §33). Two occurrences in §8. |
| S | S2 | **Keep** | Genuine consistency error for a sacred term. Чайтанья (Divine vibrations) is capitalized in the glossary and is already uppercase twice in the same passage; the lone lowercase instance should match. |
| S | S3 | **Remove** | The English source itself alternates «Namadeva» / «Namdev»; both are accepted transliterations of the same saint, and the variant faithfully mirrors the source. Not an error worth forcing. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | §8 | «Сахаджа Йоги» (г) ×2 | «Сахаджа Йоґи» (ґ) |
| 2 | §26 | «тієї чайтаньї» (lowercase) | «тієї Чайтаньї» (uppercase) |

## Summary

- Language (L): 1 issue found, 0 approved by Critic
- SY Domain (S): 3 issues found, 2 approved by Critic
- Total corrections applied: 3 edits (2 distinct corrections; correction 1 applied to 2 occurrences)
