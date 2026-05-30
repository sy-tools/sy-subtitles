# Language Review – 1983-01-14 Shri Saraswati Puja: The basis of all creativity is love

## Process

2+1 agent review of `transcript_uk.txt` (full paragraphed Ukrainian text):
Reviewer L (Language) + Reviewer S (SY Domain) run in parallel, then a Critic
filters both tables, removing false positives and trivial style preferences and
keeping only genuine, justified corrections.

Character-level sweeps confirmed clean: no Latin/Cyrillic mixing, no straight
apostrophes (all `’` U+2019), quotation marks balanced (37 «, 37 ») and all
`«»` yalynky — no `„"`/`""`. Em-dashes ` – ` with spaces throughout.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 47 | Possible extra comma before dash | «…одна чи дві адреси, – це не добра ідея.» | «…одна чи дві адреси – це не добра ідея.» |
| L2 | 49 | Case agreement of proper name after «річкою» | «Вода стає річкою Ґанґа.» | «…річкою Ґанґою.» (instrumental) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 34 | Transliteration/term consistency: «Йоги» with г, but Sanskrit *g* = ґ; every other instance is «Йоґа/Йоґи» | «тіло Сахаджа **Йоги**, які ми прекрасні» | «тіло Сахаджа **Йоґи**, які ми прекрасні» |
| S2 | 42 | Shri Mataji's first-person pronoun must be uppercase (poem is Her own wish); inconsistent with «Я хочу бути» earlier in the same quote | «Але **я** хочу бути порошинкою» | «Але **Я** хочу бути порошинкою» |
| S3 | 43 | Shri Mataji's first-person pronoun must be uppercase; surrounded by capital «Я написала / Я маю» | «вірш Я написала, **мені**, мабуть, було близько семи років» | «…**Мені**, мабуть, було близько семи років» |
| S4 | 28 | Possible spiritual-term capitalization (Істина) | «усе може вибухнути від **істини**» | «…від **Істини**»? |
| S5 | 29 | Capitalization style of «Реалізована Душа» | «оскільки ви **Реалізовані душі**» | fully cap or fully lc per glossary? |
| S6 | 21 / 22 | «Природа» capitalized in §21 but lowercase «природа» in §22 | «форма **Природи**» … «нечисте в **природі**» | unify? |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | Combined «кома й тире» is admissible and mirrors Shri Mataji's spoken pause in the EN source («…one or two addresses, is not a good idea»). Stylistic, not an error. |
| L | L2 | Remove | Naming construction «стає річкою Ґанґа» (proper name kept in base/nominative form as a label) is acceptable; not a clear grammatical error. Style preference. |
| S | S1 | **Keep** | Genuine error. `glossary/CLAUDE.md`: Sanskrit *g* → ґ. Disambiguation context for *Sahaja Yoga* explicitly states «НЕ "Йоґі"» and mandates ґ throughout. Every other occurrence in this transcript uses «Йоґа/Йоґу/Йоґи/Йоґом/Йоґами/Йозі» (ґ); only this one slipped to г. Clear internal inconsistency + rule violation. |
| S | S2 | **Keep** | Genuine error. Deity-pronoun rule: Shri Mataji's first-person is ALWAYS uppercase. The poem is Shri Mataji quoting Her own childhood wish; the opening «Я хочу бути» is already uppercase, so the later «я хочу» is an inconsistency. |
| S | S3 | **Keep** | Genuine error. Same rule. «мені» here = Shri Mataji («I must have been about seven»), and it sits among four capitalized «Я» in the same and adjacent sentences. |
| S | S4 | Remove | Borderline. EN keeps «truth» lowercase; the phrase reads as the forceful effect of truth rather than a titled standalone reference to the absolute *Істина*. No internal inconsistency (no other capitalized «Істина» in the text). Conservative: leave as the translator set it. |
| S | S5 | Remove | Not an error. `terms_lookup.yaml` registers both «Реалізована Душа» and «реалізована душа»; the partial form «Реалізовані душі» (capital on the spiritual-state word, lowercase «душі») is standard, widely-used practice and is not internally inconsistent here. |
| S | S6 | Remove | Not an error. The capitalization mirrors the EN source distinction precisely — §21 «purest form of **Nature**» (divine creative principle, capitalized) vs §22 «impure in **nature**» (general, lowercase). Intentional and faithful. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 34 | «Сахаджа Йоги» (г) — transliteration/consistency | «Сахаджа Йоґи» (ґ) |
| 2 | 42 | «Але я хочу бути порошинкою» — Mataji pronoun lowercase | «Але Я хочу бути порошинкою» |
| 3 | 43 | «…мені, мабуть, було близько семи років» — Mataji pronoun lowercase | «…Мені, мабуть, було близько семи років» |

## Summary

- Language (L): 2 issues found, 0 approved by Critic
- SY Domain (S): 6 issues found, 3 approved by Critic
- Total corrections applied: 3

All three approved corrections concern hard rules from `glossary/CLAUDE.md`
(Sanskrit *g* = ґ; Shri Mataji's first-person pronoun always uppercase) and were
internal inconsistencies — every error had a correctly-rendered counterpart
elsewhere in the same transcript. The translation is otherwise of high quality:
terminology matches the glossary, deity pronouns are consistently capitalized,
quotation marks and dashes follow Ukrainian orthography, and no
spelling/Latin-character issues were found.
