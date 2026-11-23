# Language Review – 1998-07-12_Guru-Puja-Humility-Complete-Obedience, 12 July 1998

Guru Puja, «Ви маєте навчитися послуху», Cabella Ligure (Italy).
Reviewed file: `transcript_uk.txt` (76 lines, paragraph-aligned 1:1 with `transcript_en.txt`).

## Process

2+1 review per `templates/language_review_template.md`: Reviewer L (language) and
Reviewer S (SY domain) on the full text, then the Critic filter over both tables.

Mechanical sweeps run over the whole file (all clean):
- No Latin letters except the deliberately quoted English word «preceptor» (¶14); no mixed-script words.
- No straight `"` / `'`, no `„“”`, no em-dash `—`, no hyphen used as a dash; every dash is ` – ` (U+2013) with spaces.
- Apostrophe is U+2019 throughout (no U+02BC, no `'`).
- No double spaces, no space before punctuation, no missing space after punctuation; the single ellipsis (¶31) is `...` with no space before it.
- `«»` balanced on every line except ¶43–44, where one quotation runs across the paragraph break exactly as in the English (`…with the human beings.` / `None of them have reached a perfect state.”`). Nested quotes use `«»` (¶71 «…пісню «Сидячи в серці всесвіту», тож…»).
- у/в alternation: no violations found.
- Deity pronouns: every lowercase я/мені/мене/мій/моя in the text belongs to another speaker (the disciple, the Himalayan guru, the Sahaja Yogini, Sahaja Yogis). Every reference to Shri Mataji is capitalised, including where the English has lowercase (¶16 «попросили Її, чи не могла б Вона…»; ¶25 «віддали життя за Вас»).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 28 | Particle «як-от» is hyphenated. Here it introduces an example (EN «Like some people come to Sahaja Yoga, I have seen it…»), which is its proper use | «Як от деякі люди приходять у Сахаджа Йоґу, Я бачила це» | «Як-от деякі люди приходять у Сахаджа Йоґу…» |
| L2 | 31 | Missing comma between adjoining conjunctions «бо» + «якщо». The conditional clause has no correlative «то», and it can be removed without restructuring («бо як інші слухатимуться вас?») | «…не можете стати ґуру, бо якщо ви не вмієте слухатися, як інші слухатимуться вас?» | «…бо, якщо ви не вмієте слухатися, як інші слухатимуться вас?» |
| L3 | 20 | Missing comma between adjoining conjunctions «і» + «якщо» in mid-sentence. The conditional clauses have no correlative «то/тоді» («…скеровувати їх, і мене це не обходить» stands on its own) | «Тому що ми маємо скеровувати їх, і якщо в них Аґія сильно заблокована, якщо їхня увага не в порядку, мене це не обходить» | «…скеровувати їх, і, якщо в них Аґія сильно заблокована, якщо їхня увага не в порядку, мене це не обходить» |
| L4 | 18 | Euphony: «жив в» puts в next to в | «його ґуру жив в Амарнатху» | «жив у Амарнатху» |
| L5 | 28, 56, 59, 67 | «не важливо» could be written as one word | «Це не важливо», «– не важливо» | «неважливо» |
| L6 | 13 | «лише тоді, якщо»: the usual correlative pair is «тоді, коли» | «Але це можливо лише тоді, якщо ви постійно вдосконалюєте себе» | «лише тоді, коли…» |
| L7 | 18 | «Так от» could be hyphenated, by analogy with «як-от» | «Так от, його ґуру жив в Амарнатху» | «Так-от, …» |
| L8 | 74 | «добре написаним» has no noun to agree with (object omitted) | «надіслати якомога швидше, добре написаним, англійською мовою» | «добре написане» |
| L9 | 68 | Two «мати» verbs in a row: «мають мати» | «вони мають мати правильні уявлення про все» | «повинні мати…» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 37–38 | Inconsistent capitalisation of the three gunas: «Саттва ґуна», «Раджо ґуна», but «Тамо Ґуна» | «Одна називається Саттва ґуна»; «Правостороння – це Раджо ґуна, а лівостороння – це та, що є Тамо Ґуною» | Unify the gunas |
| S2 | 73 | «Сахадж Йозі» differs from «Сахаджа Йоґа» used everywhere else in the text | «який ви мали в Сахадж Йозі» | «в Сахаджа Йозі» |
| S3 | 68 | «шакті» lowercase, though the glossary has «Шакті» | «Бо вони завжди кажуть: «Ми шакті»…»; «робота як шакті» | «Шакті» |
| S4 | 20 | The same form of address is capitalised once and lowercase once: «Ви Мати» vs «Ви – мати» | «тому що Ви Мати»; «Ви – мати, робіть, що хочете» | Unify |
| S5 | 36 / 70 | Divine Power pronoun lowercase in ¶36 but capitalised in ¶70 | «покладете це на цю Божественну Силу й віритимете в неї» vs «Вона організовує, а понад усе Вона любить вас» | Unify |
| S6 | 19 | Shri Mataji's feet: «до ніг» rather than «Стопи» | «цей ґуру впав Мені до ніг» | «впав до Моїх Стіп» |

Checked by S and found correct, with no finding: Г’янешвара (glossary), Аґія, Кундаліні, Самореалізація/Реалізація (capitalised, glossary), Дух (¶39, 45, 46, 52 – all uppercase), Істина/Реальність (¶53, capitalised as in EN), сахаджа йоґ/йоґиня/йоґам (glossary), Сахаджа Йоґа/Йозі, Пуджа Ґуру (glossary variant, used consistently in title and ¶7), ґунатіт (glossary), Аді Шакті, Шрі Матаджі, Мати Земля + «Вона» (Bhoomi Devi, EN «She»), вібраційне усвідомлення, сходження, колективність, віддача на милість (glossary for «surrender»), самоаналіз (used consistently for «introspection»), ашрам (lowercase), language and nationality names lowercase (англійська, гінді, маратхі, англійці, італійці, росіяни, українці, індійці). Translator's square-bracket additions ([Якщо], [що], [із цим], [своє], [таким], [те], [зі], [люди], [один із них]) all mirror the English transcript or bridge a shifting reference, as `glossary/AGENTS.md` describes.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Orthographic norm: «як-от» is hyphenated. It is used correctly here to introduce an example, not a comparison. The corpus overwhelmingly uses «як-от» (~265 hyphenated vs ~13 unhyphenated), and earlier reviews fixed the same slip (e.g. «Як от хтось приїхав з Америки» → «Як-от…»). |
| L | L2 | **Keep** | Codified punctuation rule: adjoining conjunctions take a comma when no correlative «то/так» follows. Corpus reviews enforce it consistently («що, якщо…», «що, коли…»). The same text follows the rule where «тоді/то» is present (¶14 «що якщо… – тоді», ¶25 «а коли…, то», ¶69 «що щойно…, тоді»), so this is an isolated slip. |
| L | L3 | **Keep** | Same rule, applied to a coordinating + subordinating junction in mid-sentence. The conditional clauses can be removed without restructuring and are not followed by «то». Sentence-initial «А якщо…» / «А коли…» (¶34, ¶36) are rightly left without a comma. |
| L | L4 | Remove | At a consonant–vowel junction both «в» and «у» are acceptable. This is a euphony preference, not an error. |
| L | L5 | Remove | «не важливо» written separately as a negated predicate is acceptable, and it is used consistently in all four places. Style preference. |
| L | L6 | Remove | «тоді, якщо» is an accepted conditional correlative. It is not an error. |
| L | L7 | Remove | The norm for «так от / так-от» is disputed (an earlier corpus review reached the same conclusion), and the unhyphenated form is common in the corpus (~113 vs ~67). Not an obvious error. |
| L | L8 | Remove | The object is omitted in the spoken original too («I have to request you to send, as soon as possible, written well…»). Keeping that roughness is faithful to the speech, and the phrase is understandable. Per `glossary/AGENTS.md` this must not be repaired. |
| L | L9 | Remove | «мають мати» is grammatical. Avoiding it is a style choice. |
| S | S1 | Remove | The text follows `terms_lookup.yaml` exactly: «Sattva Guna → Саттва ґуна», «Rajo Guna → Раджо ґуна», «Tamo Guna → Тамо Ґуна». Any inconsistency is in the glossary, not a translation error. Any change belongs in the glossary. |
| S | S2 | Remove | Shri Mataji says «Sahaj Yog» here, not «Sahaja Yoga». The corpus convention keeps this spoken variant as «Сахадж Йоґа» (e.g. 1978-12-09, 1980-07-27, 1984-01-15), and «Сахадж Йозі» is its regular locative. |
| S | S3 | Remove | Here «shaktis» is a lowercase plural common noun (the women calling themselves powers), as in the EN. It is not the name of the Primordial Power that the glossary entry covers. |
| S | S4 | Remove | The translation follows the source exactly: EN «because you are a Mother» vs «You are a mother, do what you like». Changing it would put the translator's reading into the guru's words. |
| S | S5 | Remove | This also follows the source: EN «believe in it» (¶36) vs «It organises, above all It loves you» (¶70). It is not an inconsistency the translator introduced. |
| S | S6 | Remove | «впав до ніг» is the natural idiom for prostration. The «Стопи» rule covers how the word is capitalised when it is used. It does not require the word in every idiom. Style preference. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 28 | «Як от деякі люди приходять у Сахаджа Йоґу» – unhyphenated particle | «Як-от деякі люди приходять у Сахаджа Йоґу» |
| 2 | 31 | «бо якщо ви не вмієте слухатися, як інші слухатимуться вас?» – missing comma between adjoining conjunctions | «бо, якщо ви не вмієте слухатися, як інші слухатимуться вас?» |
| 3 | 20 | «скеровувати їх, і якщо в них Аґія сильно заблокована» – missing comma between adjoining conjunctions | «скеровувати їх, і, якщо в них Аґія сильно заблокована» |

## Summary

- Language (L): 9 issues found, 3 approved by Critic
- SY Domain (S): 6 issues found, 0 approved by Critic
- Total corrections applied: 3

Overall the translation is clean and careful. Terminology follows the glossary throughout. Shri Mataji's pronouns are capitalised everywhere, including where the English has lowercase. Punctuation, quotation marks, dashes and apostrophes are consistent. The translator kept the spoken roughness (¶22 «повернувся і: «Він…», ¶33, ¶42, ¶48, ¶71, ¶73) rather than repairing it, as `glossary/AGENTS.md` requires. The three approved fixes are all orthographic or punctuation slips. None of them changes the meaning.
