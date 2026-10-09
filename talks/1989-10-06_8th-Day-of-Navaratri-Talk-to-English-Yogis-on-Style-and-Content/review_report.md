# Language Review – 1989-10-06_8th-Day-of-Navaratri-Talk-to-English-Yogis-on-Style-and-Content, 2026-10-09

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Automated pre-checks (all clean): no Latin letters inside Cyrillic words, no
`„"`/`""` quotes, no `—`/` - ` dashes, no straight apostrophes, no double
spaces or spaces before punctuation, no `…`/` ...`, no Russian letters;
`python -m tools.text_normalize --check` passes.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 14 | Extra comma before a single «і» joining the last of three homogeneous quoted items | «О, це георгіанський!», «Це такий-то й такий-то», і «Це нео-те й нео-се!» | «О, це георгіанський!», «Це такий-то й такий-то» і «Це нео-те й нео-се!» |
| L2 | 26 | Direct speech interrupted by author's words: quotes closed and reopened around the author's words; Ukrainian norm keeps one pair of «» around the whole utterance with the author's words set off by ` – ` (the corpus already uses this form, e.g. «…, – сказала Я, – …») | «Мені це набридло», – Мій зять сказав, – «це занадто – сюди видиратися». | «Мені це набридло, – сказав Мій зять, – це занадто – сюди видиратися». |
| L3 | 63 | Misspelling: the verb is «полірувати» (corpus elsewhere: «полірують»); «полируєте» is a Russian-influenced form | Ви полируєте свою латунь | Ви поліруєте свою латунь |
| L4 | 69 | Ordinal in a monarch's name is capitalised (Єлизавета Перша); the comma-appositive «, перша,» also invites the misreading «перша мала» | королева Єлизавета, перша, мала якусь дивну пляму | королева Єлизавета Перша мала якусь дивну пляму |
| L5 | 43 | «пішли за покупками» — prescriptive guides prefer «по покупки» / «на закупи» | одного разу ми пішли за покупками | одного разу ми пішли по покупки |
| L6 | 34 | Coined word quoted inconsistently: «ладами» in quotes, then «Леді та лади?» without | ніби стали леді та «ладами». Я сказала: «Га? Леді та лади? | (make consistent) |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 37 | «Всесвіту» capitalised; corpus uses both «Всесвіт» and «всесвіт» — flagged for consistency only | ви живете на серці всього Всесвіту! | всього всесвіту |

Checked and found correct (no entry needed): Shri Mataji pronouns uppercase
throughout (Я/Мене/Мені/Мій/Моя/Мої/Мого/Моєї/Себе/Свої/Самої, «Ти» in ¶26,
«Її» in ¶30); Kali «Вона» (¶6) and Shiva «Він» (¶66) uppercase; regular
people's pronouns lowercase in all quoted speech (¶26–27, 38, 56, 59, 62, 71,
77); «Деві Пуджі», «Пуджу», «Пуджі» per glossary; «Дух/Духом/Духа», «Істина»,
«Реалізацію», «Інкарнація»-class terms uppercase; «Сахаджа Йоґа/Йоґи/Йоґу/Йозі»
and «сахаджа йоґ/йоґи/йоґів/йоґами/йоґом/йоґах» per `terms_context.yaml`;
«бхути/бхутами» per glossary; «Матінко» vocative and «Мати» per glossary;
language names lowercase («англійська», «англійською», «італійську»,
«гінді», «оксфордська/кембриджська англійська»; «Санскритом» is sentence-initial);
«Санґаті санґа дошена» follows the Sanskrit-g → ґ convention; «ашрамі» lowercase;
closing «Нехай Бог благословить вас.» matches the EN «May God Bless You.»
(no «all»); transliterations «Ґреґуар», «Сі Пі», «Баба Мама», «сахіб» match the
corpus majority.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine punctuation rule: no comma before a single «і» between homogeneous members; the EN comma-inside-quotes is an English convention that should not carry over. |
| L | L2 | Keep | Genuine punctuation rule for interrupted direct speech; the reopened-quotes form is also the minority pattern in the corpus (3 vs 6+), so the fix improves consistency. Verb-first «сказав Мій зять» is the standard order for author's words. |
| L | L3 | Keep | Clear spelling error; «полірувати» is the only dictionary form and the corpus already uses «полірують». |
| L | L4 | Keep | Orthography rule for monarch names; the appositive commas were a literal carry-over of the EN «, the first one,» and read as «перша мала» in subtitles. |
| L | L5 | Remove | «за покупками» is attested in the corpus five times (vs one «по покупки») and is widely used in contemporary Ukrainian; treating it as an error would be a style preference, not a correction. |
| L | L6 | Remove | Trivial: the first mention introduces the coined word in quotes, the echo in Shri Mataji's question does not need them. Not an error. |
| S | S1 | Remove | No glossary or CLAUDE.md rule governs «Всесвіт»; both spellings are established in the corpus and in Ukrainian usage. Style preference. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 14 | «Це такий-то й такий-то», і «Це нео-те й нео-се!» | «Це такий-то й такий-то» і «Це нео-те й нео-се!» |
| 2 | 26 | «Мені це набридло», – Мій зять сказав, – «це занадто – сюди видиратися». | «Мені це набридло, – сказав Мій зять, – це занадто – сюди видиратися». |
| 3 | 63 | Ви полируєте свою латунь | Ви поліруєте свою латунь |
| 4 | 69 | королева Єлизавета, перша, мала | королева Єлизавета Перша мала |

All four corrections have been applied to `transcript_uk.txt`;
`python -m tools.text_normalize --check` passes on the corrected file.

## Summary

- Language (L): 6 issues found, 4 approved by Critic
- SY Domain (S): 1 issue found, 0 approved by Critic
- Total corrections applied: 4
