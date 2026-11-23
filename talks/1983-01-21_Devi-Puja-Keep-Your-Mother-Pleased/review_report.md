# Language Review – Devi-Puja-Keep-Your-Mother-Pleased, 1983-01-21

## Process

Reviewed `transcript_uk.txt` (67 lines: header + 61 text paragraphs) against
`transcript_en.txt` using the 2+1 process from `templates/language_review_template.md`:
Reviewer L (language) and Reviewer S (SY domain) in parallel, then the Critic filter.
Paragraph numbers below are the line numbers in `transcript_uk.txt`.

Automated pre-checks (all clean):
- No Latin characters or mixed Latin/Cyrillic words
- No `„“”"` quotes – only `«»`, balanced on every line
- No em-dashes `—`; every en-dash ` – ` has spaces on both sides; no ` - ` hyphen-dashes
- Apostrophes are all `’` (U+2019)
- No double spaces, no space before punctuation, no `..` or `…`
- All lowercase я/мене/мені/ти/вона/її/він/його… forms refer to ordinary people or
  things (yogis, the joke's characters, the yogini, Warren), never to Shri Mataji

Glossary consistency checked: Сахаджа Йоґа (locative «Йозі»), сахаджа йоґ/йоґи,
Кундаліні, Набхі чакра, Муладхара чакра, Свадхістхана, Пуджа/Пуджу/Пуджею, Аарті,
бхути, бадхи, блокує (catching), вібраційне усвідомлення, віддача на милість
(surrender), его/суперего, Мати Земля, Аді Шанкарачар’я, Аді Шакті, Лакшмі /
Махалакшмі Таттва, мокша, Брахман, ракшаси, Даїні, сприятливість, Матінко
(address), «Шрі Матаджі:» / «Йоґ:» / «Йоґиня:» dialogue labels. Language names
lowercase (англійська, санскрит).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 51 | Unneeded commas between homogeneous members joined by single, non-repeated conjunctions «і» and «чи» | «Тільки люди з Вайтарни, і з Бхатси, чи з Чхапура.» | «Тільки люди з Вайтарни і з Бхатси чи з Чхапура.» |
| 2 | 12 | Comma before «і» joining the homogeneous predicates «має бути … і повинно» | «Серце має бути чистим, абсолютно відданим на милість, і повинно намагатися…» | «…абсолютно відданим на милість і повинно намагатися…» |
| 3 | 25 | Euphony: «у/в» after a consonant-final word | «щоб встановити Царство Боже» | «щоб установити Царство Боже» |
| 4 | 37 | Parenthetical clause without «як» reads awkwardly | «бо, Я сказала, це не ментальне» | «бо, як Я сказала, це не ментальне» |
| 5 | 42 | Plural verb with «більшість» | «більшість із вас мають їхати до Делі» | «більшість із вас має їхати до Делі» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 25 | «Серцеву» capitalized; the rest of the corpus mostly writes «серцева чакра» in lowercase | «Тож про цю Серцеву чакру треба подбати насамперед.» | «серцеву чакру» |
| 2 | 60 | Dialogue label: glossary lists «ШМ» as the abbreviation for Shri Mataji in dialogues | «Шрі Матаджі: Бхутами.» | «ШМ: Бхутами.» |
| 3 | 34 | «vibrated sugar» rendered descriptively instead of with a participle | «цукру з вібраціями» | «завіброваного цукру» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | A genuine punctuation error. «і» and «чи» each occur only once, so neither counts as a repeated conjunction, and homogeneous members «з Вайтарни і з Бхатси чи з Чхапура» take no commas. The EN has none either («from Vaitarna and from Bhatsa or from Chhapur»). |
| L | 2 | Remove | «абсолютно відданим на милість» can be read as a set-off clarifying member, and the comma then closes it. This is a matter of punctuation preference, not an error. |
| L | 3 | Remove | «встановити» after a consonant is widely accepted in modern usage. The euphony rule is advisory, not orthographic, so this is trivial style. |
| L | 4 | Remove | A parenthetical clause without «як» («Я сказала») is grammatical, and the sentence is understandable. Adding «як» would be a style preference. |
| L | 5 | Remove | Ukrainian grammar allows a plural predicate with «більшість» + a plural genitive of persons when it stresses that each of them acts. The current form is correct. |
| S | 1 | Remove | `chakra_map.yaml` gives the chakra name as «Серце (Анахата)», capitalized, and the EN has «Heart Chakra». Within this text it also matches «Набхі й вашого Серця» (para 37). The capital is defensible, not an error. |
| S | 2 | Remove | False positive. «ШМ» is the abbreviation for subtitles (`terms_context.yaml`: «В субтитрах діалогів…»). The transcript corpus uses «Шрі Матаджі:» as the label (1335 occurrences). |
| S | 3 | Remove | «з вібраціями» is the corpus's most common rendering (8 occurrences) and is correct. Replacing it would be a style choice. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 51 | «Тільки люди з Вайтарни, і з Бхатси, чи з Чхапура.» – extra commas before single «і» / «чи» | «Тільки люди з Вайтарни і з Бхатси чи з Чхапура.» |

## Summary

- Language (L): 5 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 1

The translation is of high quality. Pronoun capitalization for Shri Mataji and the
Deity (Вона/Їй/Котра/Хто/Своїм/Собі in the Devi names section) is consistent.
Glossary terms match `terms_lookup.yaml` / `terms_context.yaml` and the existing corpus.
Translator's additions in square brackets (paras 10, 11, 25) follow the
«Fidelity to the Spoken Original» rule. Spoken roughness (broken-off sentences,
repetitions, the «Brahma» reference, «By bhoots») has been kept faithfully, as
required.
