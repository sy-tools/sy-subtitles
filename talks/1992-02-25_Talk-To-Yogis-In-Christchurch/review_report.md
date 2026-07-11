# Language Review – 1992-02-25_Talk-To-Yogis-In-Christchurch, 2026-07-11

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter.

- **Reviewer L** – Language (Orthography + Grammar + Punctuation)
- **Reviewer S** – SY Domain (Capitalization + Terminology + Consistency)
- **Critic** – filters both tables, removes false positives, has final say

Paragraph numbers (¶) refer to line numbers in `transcript_uk.txt`.
Corpus precedents were checked against all existing `talks/*/transcript_uk.txt`.

### Note on the previous review round

An earlier review round applied 5 corrections (em-dash → en-dash ×63; «Фотографії» capitalization ¶10;
«Я» → «я» in a yogini's quote ¶15; ти → ви unification ¶27; unmatched « removed ¶64) — all verified
as still in place. This round is a fresh full pass; it overturns one prior verdict (see Critic S1).

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 20, 26, 27, 28, 41, 53, 56, 61, 64, 66 | Sentence-final period inside «» (17×) — Ukrainian norm puts the period after the closing quote; the same file already uses the correct style in 11 other places (mixed style) | «Добре, проходьте.» І він їх привів. | «Добре, проходьте». І він їх привів. (17 instances; `?»`, `!»` and ellipsis «...» untouched) |
| L2 | entire file | Straight apostrophe `'` (U+0027) instead of `’` (U+2019) required by glossary/CLAUDE.md (23×) | ім'я, невід'ємною, з'явилося… | ім’я, невід’ємною, з’явилося… |
| L3 | 15 | Number agreement: «дехто» takes singular, but predicate is plural instrumental | Дехто з них також став затворниками, абсолютними затворниками | Дехто з них також став затворником, абсолютним затворником |
| L4 | 15 | Sentence-initial «Й» — after a full stop (pause) the conjunction is «І» | Й епілепсія – це поширена хвороба | І епілепсія – це поширена хвороба |
| L5 | 46 | Dangling adverbial participle: the subject of «кажучи» is «вони», but the main-clause subject is «Я» | Але не кажучи Мені, як Я зможу вирішити проблему | Але якщо вони не кажуть Мені, як Я зможу вирішити проблему |
| L6 | 54 | Agreement breakdown: «знайшли його (знах. відм.), відомий (наз. відм.)» | і знайшли його, відомий як гностичне знання | і знайшли те, що відоме як гностичне знання |
| L7 | 56 | Garbled rendering of “this and that”: «і тим-то тим» is not a Ukrainian construction | стало ієрархією і священством, і тим-то тим | стало ієрархією і священством, і таким іншим |
| L8 | 56 | «неї» (н-form) is used only after prepositions; without one the form is «її» | Немає досвіду неї. | Немає її досвіду. |
| L9 | 65 | Wrong collocation: «зловживати» governs чим (things: довірою, владою), not кимось; EN “abusing boys” | керували школами і зловживали хлопчиками | керували школами і знущалися з хлопчиків |
| L10 | 80 | Wrong genitive: «візерунок» → род. відм. «візерунка» (СУМ) | не було такого візерунку | не було такого візерунка |
| L11 | 84 | «гончар» is soft-declension (род./знах. «гончаря»; ¶77 correctly has «гончарем») | побачити цього гончара | побачити цього гончаря |
| L12 | 86 | Wrong genitive: «номер» (готельний) → род. відм. «номера»; «номеру» is dative | повернутися до Вашого номеру | повернутися до Вашого номера |
| L13 | 29 | Calque «задати (запитання)»; normative Ukrainian is «ставити/поставити запитання» — ¶7 already uses «поставили запитання» | якщо у вас є якісь запитання, ви можете задати: | якщо у вас є якісь запитання, ви можете їх поставити: |
| L14 | 41, 56, 63 | у/в euphony: «всередину» after a word ending in a consonant (4×) | зайшов всередину; не заходять всередину; не заходить всередину (2×) | зайшов усередину; не заходять усередину; не заходить усередину |
| L15 | 52, 61 | у/в euphony: «у» after a vowel before a consonant (2×) | Павло у Біблії; Зовсім не у Біблії | Павло в Біблії; Зовсім не в Біблії |
| L16 | 14 | б/би euphony: «би» after a vowel (¶76 correctly has «Я б хотіла») | Я би сказала | Я б сказала |
| L17 | 57 | Extra comma before a single «і» joining homogeneous predicates («бігав … і ховався») | Він бігав то туди, то сюди, і ховався. | Він бігав то туди, то сюди і ховався. |
| L18 | 8 | Production-marker style inconsistency: all other markers are uppercase ([НА ГІНДІ], [ЗВУЧИТЬ ЯК:], [НЕРОЗБІРЛИВО]) | як сказав Кабір [на гінді] | як сказав Кабір [НА ГІНДІ] |
| L19 | 61 | Non-standard particle compound «цей-от» | Цей-от Павло не дозволив би | Оцей Павло не дозволив би |
| L20 | 28 | «слабим» — colloquial variant of «слабким» (2×) | людям, слабим здоров’ям … слабим у своєму Принципі Ґуру | людям, слабким здоров’ям … слабким у своєму Принципі Ґуру |
| L21 | 53 | «Римському» — adjective from a place name is lowercase; «Римський уряд» is not an official proper name | він був офіцером у Римському уряді | він був офіцером у римському уряді |
| L22 | 21 | Latin abbreviation «PhD» in Cyrillic text | завершив свій PhD | завершив свою докторську (PhD) |
| L23 | 53 | «скватер» — suspected misspelling of «сквотер» | він наче скватер | він наче сквотер |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 8 | «істину» lowercase — glossary: Істина uppercase when it means absolute Truth; here the seekers’ “eyes to see the truth” | мають очі, щоб бачити істину | мають очі, щоб бачити Істину |
| S2 | 17 | «центральне серце» — chakra name; corpus precedent capitalizes it (1987-08-09: «Центральне Серце», «до Центрального Серця») | псує Вішуддхі, псує також центральне серце | псує Вішуддхі, псує також Центральне Серце |
| S3 | 55 | First «Веда» is the Sanskrit root (EN lowercase “veda”), parallel to lowercase «бодх» earlier in the same sentence; only the derived name is capitalized | а інше – це Веда, звідки походить слово «Веда» | а інше – це веда, звідки походить слово «Веда» |
| S4 | 65 | «П’ятидесятний» — malformed adjective; the adjective for the Pentecostal movement is «п’ятидесятницький» (2×) | Їхній П’ятидесятний рух; такий самий, як їхній П’ятидесятний | Їхній п’ятидесятницький рух; такий самий, як їхній п’ятидесятницький |
| S5 | 65–66 | «Адвентисти Сьомого Дня», «П’ятидесятники» capitalized — standard Ukrainian writes followers of denominations lowercase | у них є Адвентисти Сьомого Дня, П’ятидесятники | адвентисти сьомого дня, п’ятидесятники |
| S6 | 65 | «Католицькому» — adjective should be lowercase | у вашому, Католицькому – це харизматичний | у вашому, католицькому – це харизматичний |
| S7 | 46 | «Моя Увага» — glossary lookup gives «attention → увага» lowercase | Як, якщо Моя Увага перейде туди | Як, якщо Моя увага перейде туди |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine punctuation error and intra-file mixed style; the corpus (85+ talks) overwhelmingly puts the period outside «». Ellipsis cases (¶26, ¶41) correctly excluded. |
| L | L2 | Keep | glossary/CLAUDE.md explicitly mandates `’` (U+2019). No Latin contractions in the file, so a global replace is safe. |
| L | L3 | Keep | Clear agreement error: «дехто став» (singular) + «затворниками» (plural). |
| L | L4 | Keep | After a sentence-final pause the norm is «І»; «Й» sentence-initially is poetic license at best. |
| L | L5 | Keep | Real dangling participle — «кажучи» must share the subject «Я», but the doers are «вони». Meaning restored per EN “without telling Me”. |
| L | L6 | Keep | «його … відомий» is ungrammatical in any parse; fix is minimal and faithful to EN “found it out it’s known as the Gnostic knowledge”. |
| L | L7 | Keep | «тим-то тим» is not Ukrainian; «і таке інше» is the file’s own idiom for “this and that” (¶45), instrumental «і таким іншим» fits here. |
| L | L8 | Keep | Unambiguous rule: н-forms of the 3rd-person pronoun appear only after prepositions. |
| L | L9 | Keep | «зловживати хлопчиками» is wrong government (calque); «знущалися з хлопчиків» conveys EN “abusing boys” without over-specifying. |
| L | L10 | Keep | Dictionary form: род. відм. «візерунка». |
| L | L11 | Keep | Soft declension confirmed by the file itself («гончарем», ¶77). |
| L | L12 | Keep | «номеру» is dative; genitive after «до» must be «номера». |
| L | L13 | Keep | Normative «ставити запитання»; also fixes internal inconsistency with ¶7. «їх» added so the elliptical clause parses. |
| L | L14 | Keep | Orthography: «у» between consonants. Four clear consonant-cluster cases. |
| L | L15 | Keep | Orthography: «в» after a vowel before a consonant. Two clear cases. |
| L | L16 | Keep | «б» after a vowel; the file already follows this elsewhere («Я б хотіла», ¶76). |
| L | L17 | Keep | Single «і» joining two homogeneous predicates takes no comma; the «то…, то…» series closes before it. |
| L | L18 | Keep | Marker-style consistency within the file (all other markers uppercase). |
| L | L19 | **Remove** | «цей-от» is an acceptable colloquial formation (particle «-от», cf. «як-от») and mirrors the broken spoken EN “This fellow this Paul”. Not a genuine error. |
| L | L20 | **Remove** | «слабий» is a full dictionary synonym of «слабкий» (СУМ) — style preference, not an error. Same verdict as the previous round. |
| L | L21 | Keep | Ukrainian lowercases adjectives from place names outside official proper names; «Римська імперія» is a proper name, «римський уряд» is not. |
| L | L22 | **Remove** | «PhD» is accepted in Ukrainian usage and mirrors EN; rewriting is a style preference. |
| L | L23 | **Remove** | «скватер» is the dictionary form (СУМ); «сквотер» is a newer variant. Original is correct. |
| S | S1 | Keep | **Overturns the previous round’s “follow EN lowercase” verdict.** The glossary rule (Істина uppercase for absolute Truth) is project-internal and overrides EN’s erratic capitalization — the previous round itself capitalized «Фотографії» against lowercase EN on exactly this reasoning. Context is absolute Truth (Kabir’s “the whole world is blind” → now they have eyes to see the truth), matching corpus usage («знайти Істину й прийняти Істину», 1979-09-27). |
| S | S2 | Keep | Chakra name; corpus precedent (1987-08-09 Vishnumaya Puja) capitalizes «Центральне Серце» in subtle-system context, and the parallel «Вішуддхі» in the same sentence is capitalized. |
| S | S3 | Keep | EN distinguishes the root (“veda”) from the name (“Veda”); the sentence itself makes the same distinction with lowercase «бодх» vs «Будда». |
| S | S4 | Keep | «п’ятидесятний» does not exist as a denomination adjective; «п’ятидесятницький рух» is the established term. Root spelling «п’ятидесятн-» kept to match the corpus noun form. |
| S | S5 | **Remove** | Corpus precedent (1979-04-22: «Адвентисти Сьомого Дня, ці інші жахливі П’ятидесятники») capitalizes these movement names, mirroring EN. Lowercasing would break corpus consistency. Same verdict as the previous round. |
| S | S6 | **Remove** | Same rationale as S5: substantivized reference to the Catholic Church, capitalized in EN; changing only this word while keeping S5 capitalization would create in-paragraph inconsistency. |
| S | S7 | **Remove** | EN capitalizes “My Attention” as a divine attribute of Shri Mataji (like «Фотографія», «Стопи»); the glossary lowercase entry covers the generic term, not the divine attribute. Original is correct. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 20, 26, 27, 28, 41, 53, 56, 61, 64, 66 | Period inside closing quote (17×) | «…проходьте.» І він… → «…проходьте». І він… (etc.) |
| 2 | entire file | Straight apostrophe `'` (23×) | `'` → `’` |
| 3 | 15 | став затворниками, абсолютними затворниками | став затворником, абсолютним затворником |
| 4 | 15 | Й епілепсія | І епілепсія |
| 5 | 46 | Але не кажучи Мені, як Я зможу вирішити проблему | Але якщо вони не кажуть Мені, як Я зможу вирішити проблему |
| 6 | 54 | і знайшли його, відомий як гностичне знання | і знайшли те, що відоме як гностичне знання |
| 7 | 56 | і священством, і тим-то тим | і священством, і таким іншим |
| 8 | 56 | Немає досвіду неї. | Немає її досвіду. |
| 9 | 65 | і зловживали хлопчиками | і знущалися з хлопчиків |
| 10 | 80 | такого візерунку | такого візерунка |
| 11 | 84 | цього гончара | цього гончаря |
| 12 | 86 | до Вашого номеру | до Вашого номера |
| 13 | 29 | ви можете задати: | ви можете їх поставити: |
| 14 | 41, 56, 63 | всередину після приголосного (4×) | усередину |
| 15 | 52, 61 | у Біблії після голосного (2×) | в Біблії |
| 16 | 14 | Я би сказала | Я б сказала |
| 17 | 57 | то туди, то сюди, і ховався | то туди, то сюди і ховався |
| 18 | 8 | [на гінді] | [НА ГІНДІ] |
| 19 | 53 | у Римському уряді | у римському уряді |
| 20 | 8 | бачити істину | бачити Істину |
| 21 | 17 | псує також центральне серце | псує також Центральне Серце |
| 22 | 55 | а інше – це Веда | а інше – це веда |
| 23 | 65 | Їхній П’ятидесятний рух; як їхній П’ятидесятний (2×) | Їхній п’ятидесятницький рух; як їхній п’ятидесятницький |

## Summary

- Language (L): 23 issues found, 19 approved by Critic
- SY Domain (S): 7 issues found, 4 approved by Critic
- Total corrections applied: 23 findings → 66 individual edits

All 66 edits were applied programmatically with per-pattern count assertions
(17 quote-periods, 23 apostrophes, 26 targeted text fixes) and verified:
0 remaining periods inside quotes, 0 straight apostrophes, both ellipsis-inside-quote
cases (¶26, ¶41) preserved.
