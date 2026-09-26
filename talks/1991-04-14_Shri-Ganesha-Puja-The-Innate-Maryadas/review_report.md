# Language Review – 1991-04-14_Shri-Ganesha-Puja-The-Innate-Maryadas, 2026-09-25

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6; the closing blessing is line 12).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019), quotes «» balanced (33/33) at every level, no
Latin/Cyrillic mixing, no double or misplaced spaces, no `…` or spaced
ellipsis; `tools.text_normalize --check` reports no violations. The only
hyphens are in «по-справжньому», «будь-яка/будь-що», «напівп’яні», «рука об
руку» contexts and the approximate range «п’ятнадцяти-шістнадцяти» — all
correct.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 6 | Missing comma between two adjacent subordinating conjunctions «що» + «оскільки»: the inner clause can be removed without breaking the sentence and no «то» follows, so the comma is mandatory | «Я подумала, **що оскільки** це земля Ґанеші, нам слід провести Пуджу Ґанеші» | «Я подумала, **що, оскільки** це земля Ґанеші, нам слід провести Пуджу Ґанеші» |
| L2 | 8 | Extra comma before a single «або» joining homogeneous infinitives («тримати… читати… або промовляти», all governed by «можете») | «можете тримати книгу й читати **її, або** для початку промовляти мантру Ґанеші» | «можете тримати книгу й читати **її або** для початку промовляти мантру Ґанеші» |
| L3 | 8 | Extra comma before the closing dash of an inserted construction; the sentence structure («ця дурна ідея … походить від его») demands no comma at that point | «ця дурна ідея: «А що тут поганого?» – робити **будь-що, –** походить від его» | «ця дурна ідея: «А що тут поганого?» – робити **будь-що –** походить від его» |
| L4 | 7, 8 | у/в euphony: consonant + «в» clusters «так вбираєшся», «тож врятуватися», vowel + «у» in «Ходімо увійдемо» | «Чому ти **так вбираєшся**?», «тож **врятуватися** вони не могли», «**Ходімо увійдемо** в них» | (consider «так убираєшся», «тож урятуватися», «Ходімо ввійдемо») |

Checked and found correct (no findings): verb forms and agreement throughout
(«було створено», «не залишилося», «убитих», «пішли й напали», «вбили себе»);
case government («заволодіти нею», «царицею… не можна жертвувати», «над своїм
Шрі Ґанешею», «на Матір Землю»); sentence-initial «І коли…», «Тож коли…»
correctly take no comma after the coordinating conjunction; repeated «чи…, чи»
in «філософів, чи письменників, чи інтелектуалів» correctly comma-separated;
«, –» in «яка є, –»-type positions is used only where a clause genuinely
closes; nested direct speech «…» – narration – «…» in ¶11 is closed correctly;
«напівп’яні» written solid; approximate numeral range hyphenated.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 11 | «Принцип Ґанеші» capitalized (2×) whereas the rest of the corpus writes “Ganesh Principle” lowercase «принцип Ґанеші» (11× across 4 Ganesha Puja talks); glossary has no entry for “Ganesh Principle” | «досягти великих висот у **Принципі Ґанеші**», «виразити свій **Принцип Ґанеші**» | (needs a corpus-wide decision; see Critic) |

Checked and found correct (no findings): Shri Mataji pronouns uppercase in
every instance (Я/Мені/Моєю/Моїй — ¶6, 7, 8, 9, 10, 11), including «Вам»/«Ви»
when the Indian devotee addresses Her (¶10); all lowercase «я/мені/мене/моїй»
belong to regular people in quoted speech (the sultan, Queen Padmini, the
drowning man, the beer-drinking devotee) — correct; Shri Ganesha pronouns
uppercase throughout (Він/Його/Нього/Своєї — ¶7, 11), lowercase «він/його»
only for John Fisher, the sultan, the king, the boy and the crying child —
correct; «Шрі Ґанеша» declined per glossary (Ґанеші gen., Ґанешу acc.,
Ґанешею instr.); «Муладхара чакра» with both parts declined («Муладхари
чакри», «Муладхарі чакрі») per glossary; «Аґія/Аґії» with ґ; «бхути»,
«одержимість/одержимі», «обумовленості» (for “conditionings”), «мар’яди»
(glossary variant, used consistently in title and body — no «маріяди» mixing),
«Кундаліні», «Сахаджа Йоґа/Йоґу/Йоґи», «сахаджа йоґи/йоґів/йоґам» lowercase
with correct plural forms; «Пуджа» uppercase in all six occurrences including
«п’ята Пуджа» where EN has lowercase “puja”; «Мати Земля» / «на Матір Землю»
matches the corpus (42× / 27×); «Атхарва Шіршу» matches the corpus (7×) and
the glossary «Ґанеша Атхарва Шірша»; «Гелловін» is the Правопис-2019 form;
«(Убік)» for “(Aside)” is the standard Ukrainian stage direction (first
occurrence in the corpus); «Ашрам Канберри» as a proper place name;
«англійська»/«українська» lowercase (line 4); «Бог», «Христа», «Землі»
capitalized, «святі», «християни», «дхармічні» lowercase — all correct;
closing blessing «Нехай Бог благословить усіх вас.» is the glossary's fixed
formula with the period mirroring the source.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Codified punctuation rule (comma between two subordinating conjunctions when the inner clause is removable and no «то/так» follows). The inner clause «оскільки це земля Ґанеші» can be lifted out leaving «Я подумала, що нам слід провести…» intact, so the comma is mandatory. Genuine error, minimal fix. |
| L | L2 | **Keep** | Codified rule: no comma before a single «або» joining homogeneous members. The three infinitives all depend on one «можете»; the comma is a carry-over from the English punctuation, not Ukrainian syntax. |
| L | L3 | **Keep** | A comma before the closing dash is written only when the sentence structure requires a comma at that point; here nothing does (subject «ідея» → predicate «походить»). Dropping it is a one-character fix that keeps the source's fragmentary rhythm intact. |
| L | L4 | **Remove** | у/в alternation is a euphony recommendation, not an orthographic error: «вбиратися/убиратися», «врятуватися/урятуватися», «увійти/ввійти» are all normative doublets, and the corpus uses both freely. Style preference. |
| S | S1 | **Remove** | The glossary is silent on “Ganesh Principle”; its closest entry, “Guru Principle → Принцип Ґуру”, is uppercase, and the corpus follows that (35× «Принцип Ґуру» vs 3× lowercase). The source capitalizes “Ganesh Principle” both times, and the form is consistent within this talk. Lowercasing here would align with four other talks but contradict the glossary's own convention for the parallel term — that is a corpus-wide decision (same reasoning as the 2004-07-04 review's S2 verdict), not a per-talk correction. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 6 | Я подумала, що оскільки це земля Ґанеші, нам слід | Я подумала, що, оскільки це земля Ґанеші, нам слід |
| 2 | 8 | читати її, або для початку промовляти мантру Ґанеші | читати її або для початку промовляти мантру Ґанеші |
| 3 | 8 | – робити будь-що, – походить від его | – робити будь-що – походить від его |

## Summary

- Language (L): 4 issues found, 3 approved by Critic
- SY Domain (S): 1 issue found, 0 approved by Critic
- Total corrections applied: 3

The translation is of high quality: it follows the spoken source closely,
including its broken and repeated phrasing, while reading naturally in
Ukrainian. Deity-pronoun capitalization is flawless across a text with many
quoted regular speakers, every SY term matches the glossary, and all
typographic characters follow Ukrainian orthography. The three applied fixes
are all comma placements: one mandatory comma between adjacent subordinating
conjunctions, one comma removed before a single «або», and one comma removed
before a closing dash. The Critic filtered out the у/в euphony suggestions as
style and deferred the «Принцип Ґанеші» capitalization split to a corpus-wide
decision, since the glossary's parallel «Принцип Ґуру» supports the form used
here.
