# Language Review – Sahasrara Puja: Our Awareness has to become Paramchaitanya, 1999-05-09

Reviewed file: `transcript_uk.txt` (EN reference: `transcript_en.txt`).
"Paragraph" = line number in `transcript_uk.txt`.

Mechanical checks were clean: no ASCII apostrophes (all `’`), no Latin letters mixed into Cyrillic words, no straight or German quotation marks (`«»` used throughout, nested quotes included), no `—`/` - ` dashes (all ` – `), no space before punctuation, no double spaces, ellipses written as `...` with no space before them. `Парамчайтанья` is spelled the same way everywhere, with no `Парама-` variants.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 18 | No comma between two adjacent conjunctions (`тому що` + `якщо`), and no `то` follows | «Це тонше усвідомлення, тому що якщо ви когось боїтеся, ви не захочете йти до нього додому» | «тому що, якщо ви когось боїтеся, ви не захочете…» |
| 2 | 27 | Colon placed after the subordinating conjunction `що`, which is not allowed. The comma between `що` and `доки` is also missing (no `то` follows) | «ви відчуваєте, що: доки я не дам того самого стану іншим людям, це не буде гаразд» | «ви відчуваєте, що, доки я не дам того самого стану іншим людям, це не буде гаразд» |
| 3 | 33 | Extra comma after the adverb `Тепер`, which is not a parenthetical word. The rest of the text writes «Тепер ми…», «Тепер ви…», «Тепер у вас…» without one | «Тепер, це грандіозна річ – дуже грандіозна.» | «Тепер це грандіозна річ – дуже грандіозна.» |
| 4 | 33 | No comma between adjacent conjunctions (`Тому що` + `якщо`), and no `то` follows | «Тому що якщо вам треба трансформувати цей божевільний світ… уявіть це завдання» | «Тому що, якщо вам треба трансформувати…» |
| 5 | 16 | Aspect mismatch between coordinated verbs: present `атакують` next to future perfective `втечуть` | «тоді атакують або втечуть» | «тоді нападуть або втечуть» |
| 6 | 40 | Euphony: `з` stands between consonants | «випадок з одним хлопчиком» | «випадок із одним хлопчиком» |
| 7 | 49 | Verb agreement after the quantity word `стільки` | «стільки квітів стають плодами» | «стільки квітів стає плодами» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 43 | A pronoun for Paramchaitanya is capitalized mid-sentence as `Їй`, a form the pronoun rules reserve for Shri Mataji. It clashes with lowercase `її` for the same referent later in the same sentence, and with lowercase `її`/`вона` for Paramchaitanya in ¶24, ¶38 and ¶44 | «якщо ви знаєте, як довірити це Їй, якщо ви розумієте, як ви єдині з тією Парамчайтаньєю, що ви – її невід’ємна частина» | «як довірити це їй» |
| 2 | 9 / 20 | Kundalini pronoun is lowercase in ¶9 («вона просвітлює») and uppercase in ¶20 («Саме Вона… Вона пронизує… Вона з’єднує») | ¶9 «Кундаліні піднімається, вона просвітлює»; ¶20 «Саме Вона проходить через усі ці центри» | Make them the same everywhere |
| 3 | 43 | Glossary gives `Матінко` as the form of address | «Мати, щось не так із моєю донькою» | «Матінко, щось не так із моєю донькою» |

Terminology confirmed correct against `terms_lookup.yaml` / `terms_context.yaml`: Парамчайтанья (and its case forms), «Брахмачайтанья», Кундаліні, Сахасрара, вібрації, блокування (catching), віддача на милість (surrender), Самореалізація / Реалізація, реалізована душа, сахаджа йоґ / сахаджа йоґи (lowercase), Сахаджа Йоґа (locative «у Сахаджа Йозі»), Всепроникна Сила, Пуджа, Аарті, Махамантри, Ґанеша Стуті, Сахасрара Свамині, Боло… кі! / Джай!, «Нехай Бог благословить усіх вас». Every first-person pronoun for Shri Mataji is uppercase (Я/Мені/Мій), and every past-tense verb for Her is feminine (казала, сказала, заблукала, бачила). First-person pronouns for yogis and letter-writers are lowercase (я, мені, моєю). Language names inside sentences are lowercase («мовою санскрит», «санскрит, сторінка 11»). Реальність / Знання / Істина are capitalized where the English capitalizes them.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | Standard rule: a comma goes between two adjacent conjunctions (`що` + `якщо`) unless the second part `то/так` follows. Here none does |
| L | 2 | Keep | A colon after the conjunction `що` is a real punctuation error. The comma before the inner `доки` clause is required by the same rule as L1 |
| L | 3 | Keep | `Тепер` is an adverb, not a parenthetical word, so the comma is wrong. The fix also matches the text's own usage in every other «Тепер…» sentence |
| L | 4 | Keep | Same rule as L1 |
| L | 5 | Remove | False positive: `атакувати` has both aspects, so `атакують` can be read as perfective future and pairs correctly with `втечуть` |
| L | 6 | Remove | Euphony (`з`/`із`) is a recommendation, not a spelling error. Trivial |
| L | 7 | Remove | Plural agreement after `стільки` is accepted in modern Ukrainian. Style preference |
| S | 1 | Keep | Uppercase `Їй` mid-sentence reads as Shri Mataji ("entrust it to Her") and changes the meaning. It also contradicts lowercase `її` for the same referent in the same sentence and Paramchaitanya's lowercase pronouns throughout the talk |
| S | 2 | Remove | The translation follows the English source, which writes "she" in ¶9 and "She" in ¶20. The pronoun rules do not cover Kundalini, and the corpus uses both forms (lowercase in the majority). This is the translator's choice, not an error |
| S | 3 | Remove | `Мати` is the correct Ukrainian vocative. The glossary context limits `Матінко` to prayer, and this is a quoted letter. The corpus uses «Мати,» often (149 occurrences) |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 18 | «тому що якщо ви когось боїтеся» | «тому що, якщо ви когось боїтеся» |
| 2 | 27 | «ви відчуваєте, що: доки я не дам» | «ви відчуваєте, що, доки я не дам» |
| 3 | 33 | «Тепер, це грандіозна річ» | «Тепер це грандіозна річ» |
| 4 | 33 | «Тому що якщо вам треба трансформувати» | «Тому що, якщо вам треба трансформувати» |
| 5 | 43 | «як довірити це Їй» | «як довірити це їй» |

## Summary

- Language (L): 7 issues found, 4 approved by Critic
- SY Domain (S): 3 issues found, 1 approved by Critic
- Total corrections applied: 5
