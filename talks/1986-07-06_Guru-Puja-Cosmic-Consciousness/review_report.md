# Language Review – Guru Puja: Cosmic Consciousness, 1986-07-06

## Process

Reviewed `transcript_uk.txt` (82 lines, Gmunden, Austria) against `transcript_en.txt`
using 2 reviewers (L + S) and 1 critic filter, per `templates/language_review_template.md`.
Paragraph numbers below are line numbers in `transcript_uk.txt` (they match `transcript_en.txt`).

Automated pre-checks (all clean): no Latin/Cyrillic mixed words, no straight apostrophes
or `""`/`„"` quotes, no ` - ` / em-dash, balanced `«»` on every line, no double spaces
or spaces before punctuation, no `…` character or ` ...`. A Hunspell pass with the
project dictionary (`site/dict/uk_UA` + `words_uk.txt`) flagged only proper names,
Sanskrit terms and valid rare words (Гмунден, джати, досюди, кашаю, благоговійного,
Дакшіна, Рупам, Мюлузі, материнськості, ґурівства), so there are no spelling errors.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 26 | Missing comma where the conjunctions що + коли meet (no correlative «то» follows, and the «коли» clause can be removed) | «Що коли сьогодні ви їм щось скажете, вони, можливо, вислухають нас» | «Що, коли сьогодні ви їм щось скажете, вони…» |
| 2 | 36 | Missing comma where що + якщо meet (same rule) | «а тому, що якщо Сахаджа Йоґа утвердиться, вони втратять» | «а тому, що, якщо Сахаджа Йоґа утвердиться, вони втратять» |
| 3 | 45 | Missing comma where the coordinating і meets the subordinating коли (no «то»; the clause can be removed: «і той каже») | «Ніби ви відрізали собі носа, і коли лікар питає вас» | «…носа, і, коли лікар питає вас…» |
| 4 | 45 | Missing comma where що + коли meet | «А найкраще в цьому те, що коли ви це робите, ви стаєте радісними» | «…те, що, коли ви це робите, ви стаєте радісними» |
| 5 | 25 | Comma between «насамперед» and «щоб», where the adverb qualifies the purpose clause itself | «Насамперед, щоб дати вам Реалізацію.» | «Насамперед щоб дати вам Реалізацію.» |
| 6 | 54 | Case after «як-от» does not match the generalizing word (gen. «до інших країн») | «Вони їдуть до інших країн, як-от Південна Африка» | «…як-от до Південної Африки» |
| 7 | 35 | Missing comma between attributes (EN «horrible, fake guru») | «ще один жахливий фальшивий ґуру» | «ще один жахливий, фальшивий ґуру» |
| 8 | 55 | «будь-чого» under negation (calque of «not … anything») | «Ви не в лещатах будь-чого.» | «Ви ні в чиїх лещатах.» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| 1 | 63 | Glossary term casing: `terms_lookup.yaml` has Chitta → **Чітта**. All 14 other occurrences in the corpus use the capital | «я не розум, не інтелект, не его і не чітта» | «…не его і не Чітта» |
| 2 | 47 | Fidelity: EN «To open **your** heart the guru has to be generous». The reflexive «своє» makes it the guru's own heart, which settles an open reading in a way She did not. The line answers «Mother, open my heart» | «Щоб відкрити своє серце, ґуру має бути щедрим.» | «Щоб відкрити ваше серце, ґуру має бути щедрим.» |
| 3 | 27 | Inconsistent casing of Realization within one paragraph | «Інакше, без реалізації, яка користь?» (beside «Реалізацію» ×3) | «без Реалізації» |
| 4 | 35, 20 | Kundalini pronoun is lowercase («вона», «її») but uppercase in ¶44 («Вона – ваша власна Мати») | «Ваша Кундаліні має силу, вона має всі сили» | «Вона має всі сили» |
| 5 | 22 | «Стопи» is uppercase for Lotus Feet | «ця велика Брахма Шакті – біля ваших лотосових стіп» | «лотосових Стіп» |
| 6 | 63–69 | First-person «я» in the Nirvana Shatakam reading is lowercase mid-sentence («я – вічне блаженство») | «я – вічне блаженство й усвідомлення» | «Я – вічне блаженство…» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | Keep | Standard Ukrainian rule: at the junction of two conjunctions a comma is placed when the second clause is removable and no «то/так» follows. «Що вони, можливо, вислухають нас» stays grammatical, so the comma is required. |
| L | 2 | Keep | Same rule. «а тому, що вони втратять усі свої заробітки» stays grammatical without the «якщо» clause and no «то» follows. |
| L | 3 | Keep | Same rule, applied to і + коли inside a compound sentence (textbook case «…, і, коли стемніло, ми повернулися»). The existing dash after the quoted question still closes the clause, so nothing else changes. |
| L | 4 | Keep | Same rule. «те, що ви стаєте радісними» stays grammatical without the «коли» clause. |
| L | 5 | Remove | Verbless fragment that follows the spoken rhythm. The comma marks the pause, and whether «насамперед» belongs to the adverbs that absorb the comma before «щоб» is debatable. Not a clear error. |
| L | 6 | Remove | Nominative after «як-от» for an illustrative example is widespread and is used the same way throughout the corpus («як-от лейкемія», «як-от килими», «як-от плівки»). The meaning is clear, so this is a style preference. |
| L | 7 | Remove | The attributes are not coordinate («жахливий» evaluates, «фальшивий» classifies), so no comma is needed. The English comma does not carry over. |
| L | 8 | Remove | «не … будь-чого» is acceptable modern usage and the meaning is intact. Style preference, not an error. |
| S | 1 | Keep | The glossary form is «Чітта», and the corpus uses it uniformly (14/14). The lowercase form is an inconsistency. |
| S | 2 | Keep | Not a repair of the original but a return to it. «ваше» renders the spoken «your» and leaves Her sentence as open as She said it, while «своє» puts the translator's reading into Her mouth (`glossary/AGENTS.md`, Fidelity). |
| S | 3 | Remove | Mirrors the source exactly: EN has «Realisation … without realisation … Realisation». The glossary allows both cases, so the translator kept the distinction the source makes. |
| S | 4 | Remove | Mirrors the source: EN uses «it» in ¶20/¶35 and «She is your own Mother» in ¶44. The capital follows the personification in the original. |
| S | 5 | Remove | «at your lotus feet» means the Sahaja yogis' feet, not the Deity's or the Mother's. The «Стопи» rule covers only the Lotus Feet of the Deity/Mother. |
| S | 6 | Remove | The «I» of the verse is the realized Self. Shri Mataji says right after: «That's what you are». This is not a Deity pronoun (Shri Mataji or an Incarnation). Lowercase mid-sentence is correct, and sentence-initial «Я – Шіва!» is already capitalized. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 26 | «Що коли сьогодні ви їм щось скажете» | «Що, коли сьогодні ви їм щось скажете» |
| 2 | 36 | «а тому, що якщо Сахаджа Йоґа утвердиться» | «а тому, що, якщо Сахаджа Йоґа утвердиться» |
| 3 | 45 | «відрізали собі носа, і коли лікар питає вас» | «відрізали собі носа, і, коли лікар питає вас» |
| 4 | 45 | «те, що коли ви це робите, ви стаєте радісними» | «те, що, коли ви це робите, ви стаєте радісними» |
| 5 | 63 | «не его і не чітта» | «не его і не Чітта» |
| 6 | 47 | «Щоб відкрити своє серце, ґуру має бути щедрим.» | «Щоб відкрити ваше серце, ґуру має бути щедрим.» |

## Summary

- Language (L): 8 issues found, 4 approved by Critic
- SY Domain (S): 6 issues found, 2 approved by Critic
- Total corrections applied: 6

Overall the translation is of high quality. Deity pronouns are consistent (Shri Mataji
always uppercase with feminine agreement; Adi Guru, Christ and Mother uppercase; the
guruvi, gurus and other people lowercase). Glossary terms are correct (Ґуру Таттва,
Брахма Таттва, Сат Ґуру, Аді Ґуру, Махамайя, ґурувї, Тад Нішкала, Сат-Чід-Ананда,
Пуджа, Дхарма, Мати Земля, блокування). The forms «Сахаджа Йозі» and «сахаджа йоґи/йоґів»
are correct throughout. Translator additions are properly bracketed (¶25, ¶36, ¶37, ¶51),
and the rough spots of the spoken original are preserved rather than repaired.
