# Language Review – Shri Fatima Puja: The principle of the Left Nabhi, 1988-08-14

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text, 92 lines) against
`transcript_en.txt`, using 2 parallel reviewers + 1 critic filter, per
`templates/language_review_template.md`. Paragraph numbers below are **line numbers**
in `transcript_uk.txt`.

References: `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`,
`glossary/terms_context.yaml`, `glossary/chakra_map.yaml`; precedents from earlier
review reports in `talks/*/review_report.md`.

Mechanical checks run on the whole file (all clean except where noted):
- Latin letters inside Cyrillic words – none (the only Latin is the English word
  `Labours` inside the quoted Marathi aside, line 53 – as spoken).
- Quotation marks – only `«»` used, including nested quotes; no `„"`, `""`.
- Dashes – only ` – ` (U+2013) with spaces; no em-dash, no spaced hyphen.
- Apostrophe – only `’` (U+2019).
- Ellipsis – only `...`; no `…`, no doubled punctuation, no double spaces, no
  missing space after punctuation.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 22 | Superfluous comma: two predicates of the same subject joined by a single «і» | «Основну шакті, яку вони мають, вони втрачають**,** і потрапляють у труднощі.» | «…вони втрачають і потрапляють у труднощі.» |
| L2 | 50 | Pronoun–antecedent number mismatch: collective singular «молодь» taken up by plural «їм» | «ми створили кіноцентр для **молоді**, щоб давати **їм** хороші фільми» | «для **молодих людей**, щоб давати їм» (also the literal EN *young people*) |
| L3 | 50 | Calque «мати відношення до» (рос. *иметь отношение*); normative Ukrainian is «мати стосунок до» | «що Я маю до цього **якесь відношення**» | «що Я маю до цього **якийсь стосунок**» |
| L4 | 83 | Parenthetical «бачите» after the conjunction «але» not separated by a comma (the text itself writes «бо, бачите,» in line 46) | «що вона також і бреше, **але бачите,** усе приємні речі» | «**але, бачите,** усе приємні речі» |
| L5 | 87 | Parenthetical «зрештою» (= *after all*) not set off by commas (the text itself writes «ми обоє, зрештою, маємо» in line 28) | «**бо зрештою** така була система в тій сім’ї» | «**бо, зрештою,** така була система» |
| L6 | 88 | «давайте» + 1st-person plural future instead of the synthetic imperative | «а сьогодні **давайте проведемо** Пуджу» | «а сьогодні **проведімо** Пуджу» |
| L7 | 42 | «надто» with a comparative («вище») | «Вони **надто вище** цих речей» | «Вони **значно вище** цих речей» |
| L8 | 25 | Comma before a single «і» joining homogeneous infinitives | «ображати її чи бути з нею недобрим**,** і підвищувати голос» | remove comma |
| L9 | 49 | Space before ellipsis | «Як її звати?] **...** та, що грала роль матері?» | «Як її звати?]... та» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 11 | Plural Incarnations (Ali and Fatima) mid-sentence must be lowercase; relative pronoun capitalized | «у нас є Алі та Його дружина Фатіма, **Які** інкарнували на принципі лівої Набхі» | «…Фатіма, **які** інкарнували…» |
| S2 | 11 | Same rule: plural «They» (Ali and Fatima) mid-sentence capitalized; the text itself uses lowercase for plural Incarnations in line 13 («вони ніколи не помирають») | «бо Вона була вродливою жінкою, і **Вони** народилися в країні» | «…, і **вони** народилися в країні» |
| S3 | 22 | Glossary has «Шакті» (uppercase); here lowercase | «Основну **шакті**, яку вони мають» | «Основну **Шакті**» |
| S4 | 62 | Glossary term is «ґріхастха» (*grihastha*); text has «ґрахастхі» | «вони мають бути **ґрахастхі** (ग्रहस्थी)» | «ґріхастха» |
| S5 | 13 / 15 | Inconsistent casing of «Реалізована Душа» | «людьми, які є **Реалізованими Душами**» (13) vs «він був **реалізованою душею**» (15) | unify |
| S6 | 86 | Common noun capitalized mid-sentence | «що це **Жіноче** свято!» | «жіноче свято» |
| S7 | 55 | Title capitalized mid-sentence | «слава належить **Королеві** Джхансі» | «королеві Джхансі» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine punctuation error: one subject («вони»), two homogeneous predicates, a single non-repeated «і» – no comma. The comma after «мають» closes the relative clause; the second one is extra. |
| L | L2 | **Keep** | Genuine agreement error: «молодь» is grammatically singular, so «їм» has no valid antecedent. «молодих людей» is the minimal fix, keeps «їм», and is the literal rendering of EN *young people* – no content change. |
| L | L3 | **Keep** | «мати відношення до чогось» is a recognized Russianism; «мати стосунок до чогось» is the normative collocation. Meaning unchanged. |
| L | L4 | **Keep** | Parenthetical «бачите» must be set off on both sides, including after «але»; the transcript itself follows this rule elsewhere («бо, бачите,» line 46). Clear inconsistency/error. |
| L | L5 | **Keep** | «зрештою» here is the parenthetical *after all* (EN «because after all that was the system»), not the adverb *in the end*; it takes commas, as the text itself does in lines 22 and 28. |
| L | L6 | **Remove** | «давайте» + perfective 1st-person plural is normative spoken Ukrainian (СУМ lists «давайте» as a particle of invitation to joint action). Earlier reviews in this repo removed the same finding as a style preference; only «давайте» + synthetic imperfective future was corrected, which does not occur here. |
| L | L7 | **Remove** | Mirrors Shri Mataji's own rough phrasing «They are **too above** these things»; smoothing it would repair the spoken original (AGENTS.md, "Fidelity to the Spoken Original"). The sentence remains intelligible. |
| L | L8 | **Remove** | The comma separates two pairs of alternatives («ображати чи бути недобрим» / «підвищувати голос чи говорити»); pairwise grouping makes it defensible. Not a clear error. |
| L | L9 | **Remove** | False positive: the ellipsis here does not close a word – it stands after a bracketed aside and opens the resumed fragment (EN «….. the one who used to act…»). A space before it is correct in this position. |
| S | S1 | **Keep** | Explicit rule (AGENTS.md): Incarnations plural mid-sentence are lowercase. Matches the precedent already applied in earlier review reports and the text's own lowercase plural in line 13. |
| S | S2 | **Keep** | Same rule and justification as S1; capitalized «Вони» here also conflicts with «вони» for the same kind of referent two paragraphs later. |
| S | S3 | **Remove** | False positive: here it is the *basic shakti* (power) of ordinary women, lowercase in the EN; the glossary headword is a name form, not a rule that every generic use is capitalized. Where Fatima *is* Shakti (line 13) the text correctly has «Шакті». |
| S | S4 | **Remove** | False positive: Shri Mataji said *grahasthis* (Devanagari ग्रहस्थी, *grahasthī* – feminine "settled householder"), a different form from the glossary's masculine *grihastha*. «ґрахастхі» is a faithful transliteration of what was spoken, with ґ per convention. |
| S | S5 | **Remove** | The glossary explicitly allows both «Реалізована Душа» and «реалізована душа»; each occurrence follows the casing of the EN transcript («Realised souls» / «realised soul»). Not an error. |
| S | S6 | **Remove** | The EN transcript capitalizes *Woman's party*, marking it as the name of the occasion (today's Gruhalakshmi Puja). Rendering it as a name is a defensible choice, not a clear error. |
| S | S7 | **Remove** | «Королева Джхансі» renders *Jhansi ki Rani*, which functions as the heroine's popular name (sobriquet), not a generic title; the capital is defensible. Not a clear error. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 11 | «Фатіма, **Які** інкарнували» – plural Incarnations mid-sentence capitalized | «Фатіма, **які** інкарнували» |
| 2 | 11 | «і **Вони** народилися в країні» – plural Incarnations mid-sentence capitalized | «і **вони** народилися в країні» |
| 3 | 22 | «вони втрачають**,** і потрапляють у труднощі» – superfluous comma | «вони втрачають і потрапляють у труднощі» |
| 4 | 50 | «кіноцентр для **молоді**, щоб давати їм» – number mismatch | «кіноцентр для **молодих людей**, щоб давати їм» |
| 5 | 50 | «Я маю до цього **якесь відношення**» – calque | «Я маю до цього **якийсь стосунок**» |
| 6 | 83 | «**але бачите,** усе приємні речі» – parenthetical not set off | «**але, бачите,** усе приємні речі» |
| 7 | 87 | «**бо зрештою** така була система» – parenthetical not set off | «**бо, зрештою,** така була система» |

## Verified as correct (no change)

- Shri Mataji's pronouns are uppercase throughout, including when other people address
  or mention Her in quoted speech («прийшли до Вас по притулок», «Бачиш, Вона не
  розуміє», «Простеж, щоб Вона пішла», «ми віддамо за Неї життя»). Lowercase first-person
  forms occur only in other people's words.
- Singular Incarnations are uppercase: Mohammed («Свого зятя»), Ali («Він був
  Інкарнацією Брахмадеви»), Fatima, Mary, Sai Nath of Shirdi («Його святості»),
  Shri Ganapati («Він ніколи не стане на бік чоловіків»), Mother Earth («Хіба Вона
  скаржиться?»). Saints such as Haji Malang and Nizamuddin are lowercase.
- Glossary terms match: Ґруха Лакшмі, Ґруха Лакшмі Таттва, ліва Набхі, Махалакшмі,
  Вішнумайя, Шакті, Брахмадева, Г’янешвара, Саї Натх із Ширді, дхарматіт, Аннапурна,
  Ґанапаті, ґани, бхут/бхути, тапасья, Мати Земля, Сахаджа Йоґа / в Сахаджа Йозі,
  сахаджа йоґ / йоґиня / йоґи / йоґині / йоґів, Пуджа, Дух; «блокується центральне
  Серце» for *centre heart catches*.
- Language names are lowercase («мовою гінді», «на санскриті», «мовою санскрит»).
- Translator's additions in square brackets («[Вона] мусила», «[відомими]», «[жінки]
  цнотливі», «[з нею] поводиться») are minimal and correctly placed. Bracketed
  additions already in the EN («[там]», «[що]», «[щоб]», «[у чому]», «[Тоді]», «[це]»,
  «[фігурою]», «[велика]») are kept in brackets.
- The closing blessing «Нехай Бог благословить вас.» correctly omits «усіх», because the
  EN here is *May God Bless You* (no *all*).

## Summary

- Language (L): 9 issues found, 5 approved by Critic
- SY Domain (S): 7 issues found, 2 approved by Critic
- Total corrections applied: 7
