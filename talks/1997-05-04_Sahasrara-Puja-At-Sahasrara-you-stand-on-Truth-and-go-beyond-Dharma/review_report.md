# Language Review – 1997-05-04_Sahasrara-Puja-At-Sahasrara-you-stand-on-Truth-and-go-beyond-Dharma, 2026-07-17

## Process

2+1 agent language review of `transcript_uk.txt` per `templates/language_review_template.md`:
Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic filtered both tables.
Reference materials: `transcript_en.txt` (original), `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
`glossary/terms_context.yaml`, and corpus conventions cross-checked against other `talks/*/transcript_uk.txt`.

This is the **second review round**. The first round (2026-05-31, see git history of this file) applied
18 corrections (Shri Mataji pronoun capitalization, ellipsis normalization, `сахаджа йоги → йоґи`,
`Ваша → ваша Мати`, footnote `прій → прі’я`); all of those are confirmed still in place. Two round-1
verdicts are superseded below with justification (L1, part of correction 4).

Paragraph numbers (¶) refer to line numbers of `transcript_uk.txt` (title block ¶1–4, body ¶6–38,
translated-terms appendix ¶39–49).

Automated pre-checks — all clean: mixed Latin/Cyrillic characters, forbidden quote glyphs (`„“”"`),
double spaces, missing/extra spaces around punctuation, hyphen-as-dash or em-dash U+2014, straight
apostrophes, single-char ellipsis `…` (U+2026), unbalanced «». One automated finding (apostrophe after
a vowel) is reported as L4.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶29 | Intra-sentence gender mismatch: feminine framing «вона скаже» with masculine «я зробив» inside the same quoted speech; EN «he will say» | «Але зрештою вона скаже: «…адже я зробив щось досконале»» | «Але зрештою він скаже: …» |
| L2 | ¶38 | Missing case marker for indeclinable language name — bare «Гінді це сказано краще» is ungrammatical | «Гінді це сказано краще: «Апне ме самає хує…»» | «Мовою гінді це сказано краще: …» |
| L3 | ¶28 | Colon after conjunction «що» before direct speech is non-standard punctuation | «Це дуже важливо усвідомити, що: «Мене немає…» | «Це дуже важливо усвідомити: «Мене немає…» |
| L4 | ¶28, ¶45–47 | Apostrophe after a vowel is impossible in Ukrainian orthography (the apostrophe marks a hard *consonant* before я/ю/є/ї); corpus standard is «Прія» (10×) | «прі’ям вадет» (4×), «прі’я» (2×) | «пріям вадет», «прія» |
| L5 | ¶20 | Comma between non-homogeneous adjectives (qualitative «чиста» + relational «колективна» qualify the noun as a unit) | «а чиста, колективна свідомість і її любов» | «а чиста колективна свідомість і її любов» |
| L6 | ¶16 | «не правда» possibly should be one word «неправда» | «Так-от, насправді це не правда.» | «…це неправда.» |
| L7 | ¶34 | Tautology «подарувати … подарунок» | «Я хочу подарувати якийсь подарунок певним людям» | «зробити якийсь подарунок» |
| L8 | ¶25 | Inconsistent case of stage directions «(сміх)» vs «(Сміх)» | «Я сказала: «Що?» (сміх) … То чим тут пишатися?» (Сміх)» | unify lowercase |
| L9 | ¶10 | Euphony: «йти» after a consonant, «іти» preferred | «наш обов’язок – йти» | «наш обов’язок – іти» |
| L10 | ¶28 | Awkward word order | «ну є ти сахаджа йоґом, є ти сахаджа йоґом, то й що?» | «ну ти є сахаджа йоґом…» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ¶2 | Title subtitle omitted; corpus convention mirrors the full EN «X: subtitle» form (cf. «Пуджа Ґуру: Закони Господа», «Шрі Дурґа Пуджа: Розум – це наче віслюк», «Пуджа Аді Шакті: Мати, зроби мене таким…») | «Сахасрара Пуджа» vs EN «Sahasrara Puja: At Sahasrara you stand on Truth and go beyond Dharma» | «Сахасрара Пуджа: На Сахасрарі ви стоїте на Істині й виходите за межі Дхарми» |
| S2 | ¶29 | «Sahaja Yoga» lowercase; `terms_context.yaml`: always capitalized; the 6 other in-text instances are «в Сахаджа Йозі» | «якщо ви достатньо зрілі в сахаджа йозі» | «зрілі в Сахаджа Йозі» |
| S3 | ¶28, ¶45–46 | «сат’ям» vs glossary «Сатья Юга» (same Sanskrit *satya*) — suggest «сатьям» | «сат’ям вадет…» (4×) | «сатьям вадет»? |
| S4 | ¶23 | «сахаджа йоґа» lowercase | «започаткували інший різновид сахаджа йоґи» | «Сахаджа Йоґи»? |
| S5 | ¶23 | «лінгамів Шіви» / «Шіва-лінгама» vs glossary «Shiva Linga → Лінгам Шіви» | «один із цих лінгамів Шіви…», «прийшов гнів Шіва-лінгама» | «Лінгамів Шіви» / «Лінгама Шіви»? |
| S6 | ¶24 | Uppercase «Мені» inside the quote «Це Мені подобається…» — if the quote mimics a generic ego-person’s speech, lowercase is required | «Це Мені подобається, те Мені подобається. Мені подобається бути такою» | «Це мені подобається…»? |
| S7 | ¶24 | «сахаджа культура» lowercase vs EN «Sahaj Culture» | «ось що таке сахаджа культура» | «Сахаджа культура»? |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Supersedes the round-1 «Remove» verdict, which judged the framing pronoun alone («вона» could agree with an implied «людина»). There is no explicit feminine antecedent (chain: «людям … вони скажуть … вона скаже»), and either way the sentence is internally broken: feminine «вона скаже» + masculine «я зробив» in the same reported speech. EN «he will say» fixes the reading → «він скаже». |
| L | L2 | Keep | Bare «Гінді це сказано краще» lacks any case marker; the indeclinable language name requires «Мовою гінді» (lowercase language name mid-sentence preserved). |
| L | L3 | Keep | «, що:» before direct speech is a genuine punctuation error; dropping «, що» yields the standard direct-speech colon, matching «Хтось запитав Мене: «…»» elsewhere in the text. |
| L | L4 | Keep | Rule-backed: an apostrophe never follows a vowel in Ukrainian; corpus uses «Прія» (10×). All 6 occurrences fixed, including appendix ¶45–47, so body and appendix stay consistent (round 1 had aligned the appendix to «прі’я» for internal consistency without assessing the orthography itself — superseded). |
| L | L5 | Keep | Qualitative + relational adjectives are non-homogeneous — no comma per Ukrainian punctuation rules; the EN comma («the pure, collective consciousness») is a speech-pause artifact. |
| L | L6 | Remove | False positive: separate «не правда» is valid where the negation is emphasized — «насправді це не правда» renders EN «this is not the truth, actually». |
| L | L7 | Remove | Trivial style: mirrors EN «give some present»; oral register, not an error. |
| L | L8 | Remove | Stage directions mirror the EN source exactly («(laughter)» / «(Laughter)»); source fidelity, not an error. |
| L | L9 | Remove | і/й euphonic alternation is a recommendation, not an orthographic error; oral register. |
| L | L10 | Remove | Colloquial inversion faithfully renders EN «once you are a sahaja yogi, you are a sahaja yogi, so what?»; style, not grammar. |
| S | S1 | Keep | Genuine omission: half the talk title is missing. Corpus convention (all checked talks with «X: subtitle» EN titles translate the full title) confirms. Wording reuses the talk’s own renderings: «ви стоїте на Істині» (¶13), «виходимо за межі Дхарми» (¶10). |
| S | S2 | Keep | Real inconsistency: refers to the actual practice (always uppercase per `terms_context.yaml`); the 6 other in-text instances are capitalized. Locative «Йозі» (ґ→з) already correct. |
| S | S3 | Remove | Not clearly an error: the corpus uses the identical apostrophe transliteration in verbatim Sanskrit quotes — «Ом сат’ям, Ом тат-Савітру-варен’ям…» (Gayatri Mantra, 1982-08-01 talk). Glossary «Сатья Юга» governs the assimilated epoch name, not shloka transliteration; changing would create cross-corpus inconsistency. |
| S | S4 | Remove | False positive: lowercase is deliberate — EN pointedly writes «another kind of sahaja yoga» (a deviant imitation, not the organization). Uppercasing would distort the meaning. Round 1 reached the same conclusion. |
| S | S5 | Remove | «one of these lingas» is a generic plural (lowercase natural); «Шіва-лінгама» mirrors EN «Shiva-linga». No genuine glossary conflict. |
| S | S6 | Remove | Ambiguous speaker: the adjacent sentences («Що Мені подобається? Мені важко вирішити…») are Shri Mataji’s own voice, and the feminine «такою» supports that reading; uppercase is defensible. No change on an interpretive guess. |
| S | S7 | Remove | Per `terms_context.yaml`, the register of «сахаджа/Сахаджа» as an adjective is at the translator’s discretion. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶2 | «Сахасрара Пуджа» (subtitle omitted) | «Сахасрара Пуджа: На Сахасрарі ви стоїте на Істині й виходите за межі Дхарми» |
| 2 | ¶20 | «а чиста, колективна свідомість і її любов» | «а чиста колективна свідомість і її любов» |
| 3 | ¶28 | «Це дуже важливо усвідомити, що: «Мене немає…» | «Це дуже важливо усвідомити: «Мене немає…» |
| 4 | ¶28, ¶45–47 | «прі’ям» (4×), «прі’я» (2×) | «пріям», «прія» |
| 5 | ¶29 | «Але зрештою вона скаже: «…я зробив…»» | «Але зрештою він скаже: …» |
| 6 | ¶29 | «зрілі в сахаджа йозі» | «зрілі в Сахаджа Йозі» |
| 7 | ¶38 | «Гінді це сказано краще:» | «Мовою гінді це сказано краще:» |

## Summary

- Language (L): 10 issues found, 5 approved by Critic
- SY Domain (S): 7 issues found, 2 approved by Critic
- Total corrections applied: 7 (12 text edits counting repeated occurrences)

### Notes

- Deity-pronoun capitalization was re-verified across the whole text and is consistent and correct:
  Я/Мені/Мою/Себе/Собі/«у Неї» for Shri Mataji; Він/Його/Свою/«у Мене» for Christ; Він/Свій for Shiva;
  Ти/Тобою addressed to God or Shri Mataji — with correctly *lowercase* pronouns for regular people
  inside quotes («я мушу зустрітися з Тобою», «а як же я?», «мені це подобається» in generic speech).
- Glossary terms verified consistent: Кундаліні, Сахасрара, Войд, Набхі чакра, Свадхістхана (locative
  «у Свадхістхані»), Дхарма uppercase throughout with lowercase derivatives (адхармі, дхарматіт,
  дхармічний — per glossary), Істина, Дух, Пуджа (instrumental «Пуджею» — correct mixed-group form),
  Реалізація, шраддга (genitive «шраддги»), пітха, его, блокування, Аді Шакті, Шрі Ґанеша (genitive
  «Ґанеші» — correct per `terms_context.yaml`), Ґанапатіпуле, Мати Земля, Кабір, Крішна,
  сахаджа йоґ/йоґи lowercase with correct plural/oblique forms, «в Сахаджа Йозі» declension.
- Language names («англійська», «гінді») correctly lowercase; «Ґуру» correctly uppercase for the divine
  Guru (¶24) and lowercase for false gurus (¶30).
- Quotation marks «» at all levels (incl. nested «прія (प्रिय)»»), apostrophe U+2019, en-dash ` – `,
  and ellipsis `...` verified clean.
