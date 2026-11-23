# Language Review – Shri-Durga-Mahakali-Puja-France-is-going-down-and-down, 1992-07-25

## Process

2+1 review of `transcript_uk.txt` against `transcript_en.txt`, following
`templates/language_review_template.md`, with `glossary/AGENTS.md`,
`glossary/terms_lookup.yaml` and `glossary/terms_context.yaml`.
Paragraph numbers below are line numbers in `transcript_uk.txt`.

Automated pre-checks, all clean:
- Latin characters mixed into Cyrillic words: none
- Quotation marks other than `«»` (`„“”"`): none
- Hyphen or em-dash `—` used as a dash: none (all ` – `)
- Ellipsis: none in the text
- Double spaces, a space before punctuation, a missing space after punctuation: none
- Apostrophe: `’` (U+2019) used throughout
- Shri Mataji's pronouns (Я/Мене/Мною/Мої/Сама): all uppercase, no lowercase forms found

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 10 | Case agreement. The listed examples after «як-от» stand in the nominative, although the governing «в інші країни» is accusative, and the sentence carries on in the accusative («– навіть у нашу країну») | «Вони пішли в інші країни, як-от Південна Америка, Америка – в усіх цих місцях усі вони католики, – навіть у нашу країну.» | «як-от Південну Америку, Америку» |
| 2 | 10 | Possible calque «мати відношення до» (instead of «мати стосунок до») | «що неймовірно, щоб вони [католики] мали хоч якесь відношення до Бога» | «мали хоч якийсь стосунок до Бога» |
| 3 | 30 | Plural predicate after the quantity word «стільки» (singular neuter is the more usual form) | «що стільки мільйонів зникли через цю хворобу» | «стільки мільйонів зникло» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 50 | A pronoun for a singular Incarnation (Christ) is lowercase. It is inconsistent with «Сама» for Shri Mataji (paragraph 35) and with the corpus convention («Сам Христос», «Він Сам», «Сам Будда») | «Христос боровся з цим сам, стільки святих боролися з цим самотужки» | «Христос боровся з цим Сам» |
| 2 | 41 | The glossary entry gives «Садхака» with a capital letter, but the text has lowercase | «як Калі хотіла захистити лише бхактів, садхаків» | «Садхаків» |
| 3 | 28 | Inconsistent capitalization: «царстві Бога» vs «Царство Боже» | «Ви всі чудово насолоджуєтеся в царстві Бога, [Шрі Матаджі усміхається] ви увійшли в Царство Боже.» | «Царстві Бога» |

Also verified as correct, with no finding: Дурґа/Дурґі, Калі, Махакалі, Кріта Юга,
Вішуддхі, Інкарнація, Пророк, пунья (gen. «пуньї»), бандхан, ракшаси, Муладхара,
лівосторонні/правосторонні, сходження, Божественне, Божества (plural «вони» lowercase),
Її (Kali, Mary), Ти (addressed to Mother in the song), Ґуру Пуджа, ґуру (common noun),
Ґурупада, Істина, Пуджа/Пуджі; Сахаджа Йоґа / Сахаджа Йозі / сахаджа йоґи / сахаджа йоґам;
language names lowercase (англійська, французькою, маратхі); the translator's additions
in square brackets ([католики], [Франції], [фрейдисти], [хворих], [ці люди], [співати]);
the closing blessing «Нехай Бог благословить вас» (EN «May God bless you», without «all»).

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | A genuine grammar error. Homogeneous members after a generalizing word take its case. The same sentence ends in the accusative («навіть у нашу країну»), so the nominative breaks the construction. This corrects grammar only and leaves the content as spoken. |
| L | 2 | Remove | «Мати (не мати) відношення до кого-чого» is attested in the СУМ. Changing it to «стосунок» is a stylistic preference, not an error. |
| L | 3 | Remove | With an animate quantified subject, a plural predicate after «стільки» is an acceptable normative variant. The same pattern recurs consistently («Стільки Божеств складають», «стільки святих боролися»). |
| S | 1 | Keep | «сам» refers to Christ, a singular Incarnation. The pronoun capitalization rule (AGENTS.md) and the corpus convention («Сам Христос», «Він Сам») call for uppercase. The text itself writes «Сама» for Shri Mataji. The saints in the same sentence keep lowercase («самотужки»). |
| S | 2 | Remove | False positive. The glossary gives only the headword. In running text the common noun is lowercase throughout the corpus (4/4 «садхаків»), as is «бхактів» in the same sentence. |
| S | 3 | Remove | Faithful to the original: the English itself distinguishes «realm of God» (lowercase) from «Kingdom of God» (the capitalized Biblical term). |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 10 | «як-от Південна Америка, Америка» – case does not agree with «в інші країни … навіть у нашу країну» | «як-от Південну Америку, Америку» |
| 2 | 50 | «Христос боровся з цим сам» – lowercase pronoun for an Incarnation | «Христос боровся з цим Сам» |

## Summary

- Language (L): 3 issues found, 1 approved by Critic
- SY Domain (S): 3 issues found, 1 approved by Critic
- Total corrections applied: 2
