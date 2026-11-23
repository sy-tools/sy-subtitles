# Language Review – Maha-Sahasrara-Puja-The-Start-of-a-New-Era, 1984-05-05

## Process

Reviewed `transcript_uk.txt` (46 paragraphs, numbered by non-empty line, header lines 1–4 included)
against `transcript_en.txt`, using 2 parallel reviewers + 1 critic filter, per
`templates/language_review_template.md`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`,
`glossary/terms_context.yaml` and `glossary/chakra_map.yaml`.

Automated pre-checks (all clean): no Latin letters inside Cyrillic words (the only Latin is the French
*Mais* from the original, ¶38); no `"`, `„`, `“`, `'` or em-dash (—); all apostrophes are `’` (U+2019);
all dashes are ` – ` (U+2013); no doubled spaces or spaces before punctuation; ellipsis `...` correct (¶22).
The header line (¶4) matches the corpus convention (113 talks).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 15 | Non-reflexive pronoun used for the subject: with subject «ви» the object must be the reflexive «собою» | «бо маєте Божество особисто з вами» | «бо маєте Божество особисто з собою» |
| L2 | 24 | The subordinate clause «куди б я не пішов» after the wish particle «хай» is closed by a comma but not opened by one. Without it, «хай куди б … не» reads as a blend of «хай би куди я пішов» and «куди б я не пішов» | «про цей дар: хай куди б я не пішов, я ставав би джерелом невинності» | «про цей дар: хай, куди б я не пішов, я ставав би джерелом невинності» |
| L3 | 24 | No sentence-final period after the closing quote; the paragraph ends with no terminal mark | «…відчували, що я невинний»» | «…відчували, що я невинний».» |
| L4 | 29 | Sentence lacks its final period | «Ні, я не можу сказати «ціль», Шрі Матаджі» | «… «ціль», Шрі Матаджі.» |
| L5 | 30 | The parenthetical «бачите» after «але» is not set off by commas; it can be removed without rebuilding the sentence, so a comma is required on both sides | «Але бачите, в англійській немає такого слова!» | «Але, бачите, в англійській немає такого слова!» |
| L6 | 38 | Quoted remark has no sentence-final period after the closing quote | «Ґреґуар (перекладаючи): «Mais, це весело»» | «… «Mais, це весело».» |
| L7 | 8 | Comma directly after the preposition «до» | «підводячи це до, ось цього боку, Аґії» | «підводячи це до – ось цього боку, Аґії» |
| L8 | 21 | Possible Russianism «ущербний» | «може потьмяніти або бути ущербним» | «недосконалим» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 24 | Glossary term: *thoughtless* → «стан без думок»; also «ставати» used as a copula with a bare prepositional phrase («стає без думок») | «перше, що має статися, – вона стає без думок, думки немає» | «перше, що має статися, – вона входить у стан без думок, думки немає» |
| S2 | 9 | «йоґа» lowercase, while the glossary gives *Yoga* → «Йоґа» | «ми бачимо, що саме тут відбувається йоґа» | «Йоґа» |
| S3 | 22 | Declension of the compound chakra name; the context example in `terms_context.yaml` declines both parts («Муладхарі чакрі») | «у Муладхара чакрі» | «у Муладхарі чакрі» |
| S4 | 31–32 | Inconsistent capitalization of the same concept | «Божественне Бажання» (¶31) vs «у вашому Божественному бажанні» (¶32) | unify |

Checked and found correct (no finding):
- **Shri Mataji's pronouns** are uppercase throughout: Я/Мене/Мені/Мою/Свою/Своїй/[Її]/Вона/Особу. This includes the third-person «Вона – Махамайя» (¶15) and «Вона – Бхакті Ґам’я» (¶16).
- **God's pronouns** are uppercase: Він/Його (¶12). So are the pronouns for Shri Krishna (Він/Себе/Ти, ¶18) and Shri Ganesha (Його/Нього/Йому/Тебе, ¶22–25).
- **Other terms:**
  - Spiritual terms: Інкарнацій, Реалізація, Пуджа, Божество/Божества, Трійця, Син Божий, Аді Шакті, Джаґадамба, Атма, Махамайя Шакті.
  - SY vocabulary: «сахаджа йоґ/йоґів/йоґом/йоґа» (correct case forms), Сахаджа Йоґи, Аватари, гопії/гопій, бхактів, кшема, ашрами, тапах (аскезу).
  - Glossary phrases: «віддатися на милість» (*surrender*), «атакує» (*attack*), and «Нехай Бог благословить усіх вас» (fixed phrase).
- **Language names** are lowercase: англійській, санскриті.
- **Corpus consistency:** «Праг’я лока», «Бхакті Ґам’я», «тапах», «прадеша», «Ґевіне» and «Ґреґуар» match the spellings used across the rest of the corpus.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | Genuine grammar error. When the object is the same person as the subject, Ukrainian requires the reflexive «собою» («ви маєте … з собою»). Meaning unchanged. |
| L | 2 | Keep | Genuine punctuation error. An embedded subordinate clause after an opening particle must be bounded on both sides. The comma restores the wish reading of «хай» (EN *"that, wherever I go I become…"*) and removes the contaminated concessive. |
| L | 3 | Keep | Missing terminal punctuation. Ukrainian puts the period after the closing «» when the quote ends the sentence. The EN transcript's omission is a transcription gap, not something spoken. The sentence is left otherwise as She broke it off. |
| L | 4 | Keep | Missing terminal period (same reasoning as L3). |
| L | 5 | Keep | «бачите» is a discourse parenthetical here (EN *"But see, there's no word…"*), so the comma after «Але» is required. The corpus itself uses «Але, бачите,» 3:1. |
| L | 6 | Keep | Missing terminal period after the quoted line (same reasoning as L3). |
| L | 7 | Remove | False positive. «ось цього боку» is an insertion between the preposition and its noun, which is valid Ukrainian (cf. «до, скажімо, Києва»). It also faithfully mirrors the spoken break *"up to the, this side, Agnya"*. |
| L | 8 | Remove | False positive. «ущербний» is a standard Ukrainian word (СУМ: *неповноцінний, з вадами*); a stylistic preference only. |
| S | 1 | Keep | The glossary maps *thoughtless* → «стан без думок», and «стає без думок» is not normative: «ставати» needs a nominal or adjectival complement. «входить у стан без думок» keeps "becomes" and matches the glossary. |
| S | 2 | Remove | False positive. Here *yoga* means the union itself ("the yoga takes place"), not the name of the practice. The lowercase common noun is correct. |
| S | 3 | Remove | Not an error. The lookup form «Муладхара чакра» treats the first element as an indeclinable apposition (like «Аґія чакрі»), and both patterns occur in the corpus. A style choice. |
| S | 4 | Remove | Follows the source exactly (EN: *"the Divine Desire I'm telling you about"* vs *"your Divine desire"*). The first is the named concept, the second a descriptive use. No silent repair. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 15 | «маєте Божество особисто з вами» | «маєте Божество особисто з собою» |
| 2 | 24 | «хай куди б я не пішов, я ставав би» | «хай, куди б я не пішов, я ставав би» |
| 3 | 24 | «…що я невинний»» (no final period) | «…що я невинний».» |
| 4 | 24 | «вона стає без думок» | «вона входить у стан без думок» |
| 5 | 29 | «…сказати «ціль», Шрі Матаджі» (no final period) | «…сказати «ціль», Шрі Матаджі.» |
| 6 | 30 | «Але бачите, в англійській» | «Але, бачите, в англійській» |
| 7 | 38 | «Mais, це весело» (no final period) | «Mais, це весело».» |

## Summary

- Language (L): 8 issues found, 6 approved by Critic
- SY Domain (S): 4 issues found, 1 approved by Critic
- Total corrections applied: 7

Overall the translation is of high quality. It is faithful to the spoken original: repetitions, broken-off
sentences and the transcript's bracketed additions ([що], [якщо], [це те, що], [Її]) are preserved.
Deity-pronoun capitalization and glossary terminology are consistent throughout. All approved corrections
are local punctuation and grammar fixes plus one glossary alignment; none changes the content of what was said.
