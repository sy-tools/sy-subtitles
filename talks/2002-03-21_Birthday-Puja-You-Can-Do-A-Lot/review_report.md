# Language Review – 2002-03-21_Birthday-Puja-You-Can-Do-A-Lot, 2026-06-20

## Process

2+1 agent review (Reviewer L – Language, Reviewer S – SY Domain, Critic – filter)
over the full paragraphed `transcript_uk.txt` against `transcript_en.txt`,
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

This is a second pass. The corrections from the prior review (2026-05-31) — em-dash → en-dash
(51×), `…` → `...`, and the lowercase yogi-`я` in §90 — are confirmed in place by the
automated pre-checks below; this pass re-validates the whole text and reports any remaining issues.

Automated character-level pre-checks (all clean):
- No em-dash (U+2014); en-dash ` – ` (U+2013) used consistently (31 lines). ✓
- No straight quotes, German `„ "`, or English `" "` — only Ukrainian «» present. ✓
- No straight apostrophes — only `’` (U+2019). ✓
- No precomposed ellipsis `…`; three-dot `...` used in §7. ✓
- No Latin/Cyrillic homoglyph mixing, no double spaces, no space before punctuation. ✓

Deity-pronoun capitalization verified throughout:
- Shri Mataji (Я/Мене/Мені/Мою/Сама) — uppercase everywhere (≈30 instances). ✓
- Individual Incarnations singular (Він/Його/Який for Shri Rama, Vishnu, Muhammad-sahib, God, Christ) — uppercase. ✓
- Babur (regular person) — lowercase pronouns (він/його), except sentence-initial. ✓
- The reflecting yogi in §90 ("Що я зробив…") — lowercase я. ✓

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 45 | Subject–verb number disagreement | «…і кожен з них, коли вони отримували Реалізацію, **викривалися**…» — subject «кожен» is singular, predicate verb is plural | викривалися → **викривався** |
| L2 | 7 | Possible Russianism (calque) | «потім приходить відторгнення й **протиріччя**» | протиріччя → суперечність (?) |
| L3 | 29 | Comma between subject and predicate | «…що це Бабрі Масджид**,** є місцем, де народився Шрі Рама» | remove comma after «Масджид» (?) |
| L4 | 41 | Number mismatch: singular collective + plural predicate | «якби наш **кабінет міністрів був реалізованими душами**» | члени кабінету… були (?) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 6 | Capitalization of "Principle" | «Але Я зрозуміла її **Принцип**… Любов не має **Принципу**» | lowercase принцип (?) |
| S2 | 20, 24, 41, 44, 84 | "Realised souls" rendered lowercase | «реалізовані душі / реалізованими душами» vs source "Realised souls" | Реалізовані Душі (?) |
| S3 | 65 | Connotation of "gripping" | «найбільш … **захопливою** річчю» (money/corruption) — захоплива leans positive | затягуюча / поглинаюча (?) |
| S4 | title (l.2) | Capitalization of "Дня" | «Пуджа **Дня** народження» | дня народження (?) |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine grammatical error. The main-clause subject «кожен з них» is singular masculine and requires «викривався»; the plural «викривалися» is wrong attraction to the intervening clause «коли вони отримували». Minimal fix preserves meaning. |
| L | L2 | Remove | «протиріччя» is dictionary-attested (СУМ) and is the established corpus choice (also used in `2001-07-29_Shri-Krishna-Puja`); «суперечність» appears nowhere in the corpus. Changing it would break corpus consistency. Style preference, not an error. |
| L | L3 | Remove | The comma faithfully mirrors Shri Mataji's spoken self-restart ("…that it is Babri Masjid, is the place where…"). The translation preserves such disfluencies consistently elsewhere (e.g. §71 «щось – Але не ви»). Not corrected. |
| L | L4 | Remove | Mirrors the source's notional agreement ("if our cabinet were realised souls"); «був» correctly agrees with the singular collective «кабінет», and the plural predicate noun is a faithful, defensible rendering. Rewriting to «члени кабінету» exceeds review scope. |
| S | S1 | Remove | The source capitalizes "Principle" (key concept). The translation mirrors source capitalization deliberately, exactly as it mirrors Love/любов casing in §6. Consistent and intentional — false positive. |
| S | S2 | Remove | `glossary/terms_lookup.yaml` explicitly permits the lowercase form «реалізована душа». The text uses lowercase consistently in every occurrence; «Реалізацію/Самореалізацію» is also consistently uppercase. No internal inconsistency to fix — false positive. |
| S | S3 | Remove | "gripping" is ambiguous in the source; «захоплива» (engrossing/that grips) is a defensible dictionary rendering. A nuance/translation-quality judgment, outside the orthography/terminology scope. Not an error. |
| S | S4 | Remove | Corpus convention treats «День народження» as a capitalized occasion name (cf. «Пуджа на День народження», «Пуджа з нагоди Дня народження» in other talks). Consistent with established practice. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 45 | «кожен з них… викривалися» — singular subject «кожен» with plural verb | викривалися → **викривався** |

## Summary

- Language (L): 4 issues found, 1 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: **1**

The translation is of high quality: orthography, punctuation, quotation/dash/apostrophe
conventions, deity-pronoun capitalization, and glossary terminology are all sound and
internally consistent (prior-pass orthographic fixes confirmed in place). The single
applied correction fixes a subject–verb number-agreement error in §45.
