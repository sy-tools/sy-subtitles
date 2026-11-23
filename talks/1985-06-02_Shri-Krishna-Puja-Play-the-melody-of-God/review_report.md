# Language Review – 1985-06-02_Shri-Krishna-Puja-Play-the-melody-of-God, 2 June 1985

Shri Krishna Puja, Englewood Ashram, New Jersey (USA) – «Play the melody of God».

Reviewed file: `transcript_uk.txt` (against `transcript_en.txt`).
Paragraph numbers below are the line numbers in `transcript_uk.txt`.

## Process

2+1 review per `templates/language_review_template.md`:
Reviewer L (orthography, grammar, punctuation) and Reviewer S (SY domain:
capitalization, terminology, consistency) ran over the full text; the Critic
filtered both tables, and only approved corrections were applied.

Mechanical checks (all clean): no Latin letters or mixed-script words; no
straight or German/English quotation marks; every line has balanced `«»`
(nested quotes also `«»`); no hyphen or em-dash used as a dash (only ` – `);
apostrophe is always `’`; no Unicode `…`, no space before `...`; no double
spaces, no space before punctuation, no missing space after punctuation;
`python -m tools.text_normalize --check` reports 0 violations.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 42 | Quoted question starts with a lowercase letter. The two questions after it in the same quote are capitalized. | Уся розсудливість: «що Йому слід робити? Що правильно? Що неправильно?» | «Що Йому слід робити? Що правильно? Що неправильно?» |
| L2 | 44 | Case agreement: accusative `нашу` with nominative `Сушумна`. In the same text `«Йоґа Нідра»` is declined (`у «Йоґа Нідру»`, `у своїй «Йоґа Нідрі»`), and the corpus has `Сушумну Наді`. | Вона та, Хто захищає нашу Сушумна Наді. | нашу Сушумну Наді |
| L3 | 31 | `покінчити` is normally used with `з` + instrumental, so the passive participle looks ungrammatical. | так що для вас, людей, зло має бути покінчене | зі злом має бути покінчено |
| L4 | 32 | Comma placement in `замість того, щоб` differs from the rest of the text (`замість того щоб`). | Насамперед спробуйте рятувати замість того, щоб убивати. | замість того щоб убивати |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 51 | Radha's feet are not capitalized. Rule: `Стопи` is uppercase for the Feet of a Deity/Mother. Radha is a Deity in this talk (Viratangana, Mahalakshmi, every pronoun capitalized), and the corpus capitalizes deity feet (`Стоп Шрі Крішни`, `Стоп Христа`, `Стопи Богині`). | і Тобі треба дати пил зі Своїх стоп | зі Своїх Стоп |
| S2 | 51 | Same as S1 | Тож він узяв пил зі стоп Радхи і відніс його | пил зі Стоп Радхи |
| S3 | 52 | Same as S1 | Він узяв пил зі стоп Радхи – | пил зі Стоп Радхи |
| S4 | 52 | Same as S1 | розумієте, стопи Радхи були запорошені | Стопи Радхи |
| S5 | 52 | Same as S1 | і все це жовте було на Її стопах | на Її Стопах |
| S6 | 52 | Same as S1 | грається Своїми стопами на лотосі Його серця | Своїми Стопами |
| S7 | 52 | Same as S1 | пилок лотоса торкався Її стоп і робив їх жовтими | Її Стоп |
| S8 | 52 | Same as S1 (Radha speaking of Herself) | коли Я в Його серці, Мої стопи в Його серці | Мої Стопи |
| S9 | 51 | Possible silent repair. EN has `he said` for Radha's reply, and the UK has `Вона сказала`. | «...що чиниш гріх?» Вона сказала: «Ти не знаєш цього Шрі Крішну... | (keep as spoken: `він сказав`) |

Checked and found consistent (no finding): Krishna/Rama/God singular pronouns
uppercase throughout (Він/Його/Йому/Нього/Себе/Своїм); the rakshasa, Narada,
the king, the saint, Arjuna and Hitler lowercase; Shri Mataji always uppercase
(Я/Мені/Мене); Radha uppercase (Вона/Її/Неї/Свою/Мої); the wives lowercase.
Glossary terms match `terms_lookup.yaml`: Інкарнація, Ліла, реалізована душа,
Реалізація, Вішуддхі чакра, блокування (catch), віддача на милість (surrender),
«бхут»/«бхути», ракшаса, ґуру, сахаджа йоґ / сахаджа йоґи / у Сахаджа Йозі,
Йоґа Нідра, Віратангана, Махалакшмі, Махакалі, Махасарасваті, Шакті,
Брахмадева, пуньї, Ранчордас, Арджуна, Рамаяна, Ґіта, Дух, Пуджа, его,
сходження, Кундаліні, Холі. Language and nationality names are lowercase
(англійська, американці, росіяни, євреї). The wives' feet (`ваших/своїх/наших
стоп`) correctly stay lowercase.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | A quoted sentence after a colon starts with a capital letter. The lowercase is carried over from the EN transcript, and it is inconsistent with the next two questions in the same quote. This is an orthography error, not a content change. |
| L | L2 | Keep | This is a real case-agreement error (`нашу` + nominative). The fix matches how this text declines `Йоґа Нідра` and how the corpus writes `Сушумну Наді`. |
| L | L3 | Remove | `покінчити` also has a transitive colloquial meaning (`покінчити що` – закінчити, СУМ), so `зло має бути покінчене` is grammatical. It also mirrors the spoken `evil is to be finished`. This is a style preference. |
| L | L4 | Remove | Ukrainian punctuation allows either placement of the comma in the compound conjunction `замість того(,) щоб`, depending on emphasis. This is not an error. |
| S | S1–S8 | Keep | The glossary capitalization rule (`Стопи` for the Feet of a Deity) applies directly. Radha is treated as a Deity throughout the text, and the corpus capitalizes deity feet even in narrative passages (`Він бачив лише Її Стопи`). The story's point, Her Feet resting on the lotus of His heart, confirms the sacred sense. The wives' feet correctly stay lowercase. |
| S | S9 | Remove | This is a gendered pronoun slip in spoken Indian English, not a name, number, noun or claim. Ukrainian verbs carry gender, so `він сказав` would make Narada the speaker of Radha's words and mislead the reader. The Ukrainian must stay correct and natural, so the translator's rendering stands. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 42 | «що Йому слід робити? | «Що Йому слід робити? |
| 2 | 44 | нашу Сушумна Наді | нашу Сушумну Наді |
| 3 | 51 | пил зі Своїх стоп | пил зі Своїх Стоп |
| 4 | 51 | узяв пил зі стоп Радхи і відніс | узяв пил зі Стоп Радхи і відніс |
| 5 | 52 | Він узяв пил зі стоп Радхи | Він узяв пил зі Стоп Радхи |
| 6 | 52 | стопи Радхи були запорошені | Стопи Радхи були запорошені |
| 7 | 52 | на Її стопах | на Її Стопах |
| 8 | 52 | грається Своїми стопами | грається Своїми Стопами |
| 9 | 52 | торкався Її стоп | торкався Її Стоп |
| 10 | 52 | Мої стопи в Його серці | Мої Стопи в Його серці |

## Summary

- Language (L): 4 issues found, 2 approved by Critic
- SY Domain (S): 9 issues found, 8 approved by Critic
- Total corrections applied: 10 (all applied to `transcript_uk.txt`; `tools.text_normalize --check` clean afterwards)

Overall the translation is of high quality. The punctuation and quotation style
are consistent, deity-pronoun capitalization is precise throughout a long
narrative with many speakers, and glossary terms match. Translator additions in
square brackets (`[бо]`, `[означає]`) and the roughness of the spoken original
are left as they are.
