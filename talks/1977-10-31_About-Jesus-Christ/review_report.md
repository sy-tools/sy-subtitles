# Language Review – 1977-10-31_About-Jesus-Christ, 2026-11-07

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`,
and `glossary/terms_context.yaml`, per `templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — en-dash ` – ` (U+2013) with spaces throughout,
apostrophe `’` (U+2019), quotes «» at every level, no Latin/Cyrillic mixing,
no double spaces, no spaces before punctuation, ellipsis `...` without a
leading space. `python -m tools.text_normalize --check` reports no violations
before and after the correction pass.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 19 | Mixed verb government (zeugma): «віддати належне» takes the dative (кому), so it cannot share the prepositional object «до самих себе» that belongs to «виявити повагу» | «Ви повинні **віддати належне** й виявити певну повагу до самих себе» (EN: “You must give some due and some respect to yourself”) | «Ви повинні **віддати собі належне** й виявити певну повагу до самих себе» |
| L2 | 19 | Direct speech interrupted by author's words: quotes closed and reopened around «кажете ви». Ukrainian norm keeps one pair of «» around the whole utterance, the author's words set off by ` – `; since the two parts are separate sentences, a period closes the author's words | «**Гарно провели час», – кажете ви, – «Це гарна річ**». | «**Гарно провели час, – кажете ви. – Це гарна річ**». |
| L3 | 20 | Wrong lexeme: bare «Ідіть» (without «сюди») means “go (away)”, the opposite of the source's inviting “Come, come, come, come, all of you” | «вони кличуть: «**Ідіть, ідіть, ідіть, ідіть**, усі ви»» | «вони кличуть: «**Підходьте, підходьте, підходьте, підходьте**, усі ви»» |
| L4 | 26 | Orthography: the adverb «небагато» (= мало) is written as one word; the separate «не багато» is only for an explicit opposition («не багато, а мало») | «ми **не багато** публікували» (EN: “we haven't done much publication”) | «ми **небагато** публікували» |
| L5 | 27 | Euphony у/в: between vowels the preposition is «в» (Правопис §23) | «**бо у нас** небагато часу» | «**бо в нас** небагато часу» |
| L6 | 6 | Euphony з/із: before a sibilant the Правопис recommends «із» | «починається **з середини** промови» | «починається **із середини** промови» |
| L7 | 21 | «Давайте» + 1st-person plural future where the synthetic imperative is the more literary form | «**Давайте почнемо** новий метод»; «**Давайте тепер покладемо** в основу» | «**Почнімо** новий метод»; «**Покладімо тепер** в основу» |
| L8 | 10 | Possibly missing comma before the comparative «як», which is extended by a relative clause | «вони поводитимуться **як ті раби**, яких ви бачили на якійсь картині» | «вони поводитимуться**, як ті раби**, яких ви бачили…» |
| L9 | 6 | Collocation: it is the sound, not its quality, that is “distorted” | «якість звуку на початку промови надзвичайно **спотворена**» | (consider «звук на початку промови надзвичайно спотворений») |
| L10 | 24 | «проведу» without an explicit object (час) | «з третьої години й до ночі Я **проведу там із ним**» (EN: “I will spend with him there”) | (consider «Я **буду там із ним**») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 3 | Venue name «Кекстон Хол»: the corpus is split (2× «Кекстон Хол» incl. this talk, 1× «Кекстон Холл», 2× «Кекстон-Холі» in dialogue) | «**Кекстон Хол**, Лондон (Англія)» | (needs a corpus-wide decision) |
| S2 | 21 | «ріші й муні» lowercase while the glossary headword is «Ріші / Муні» | «Усі **ріші й муні** в Індії знають це» | (consider «Ріші й Муні») |
| S3 | 10 | Abbreviation «ТБ» in Ukrainian most often reads as “television”; the gloss in brackets is the English transcriber's | «вони зробили Його хворим на **ТБ [туберкульоз]**» (EN: “a TB patient [Tuberculosis]”) | (consider «хворим на туберкульоз») |

Checked and found correct (no findings): Shri Mataji pronouns uppercase in
every instance (Я/Мій/Мене/зі Мною/Моя/Мною/Сама — ¶6, 7, 17, 18, 24, 26, 27,
28; a scan for lowercase «я/мені/мене/мій/моя/мною/сама» mid-sentence returned
nothing). Christ/God pronouns uppercase throughout (Він/Його/Йому/Нього/Своїм/
Яким — ¶7, 9, 10, 11, 12, 14, 19, 21, 25), while the lowercase «його» cases
correctly refer to non-deities: the seat (¶14), a yogi's Kundalini (¶18),
Bogdan and Gavin (¶24), the paper (¶26). Krishna: «у Своїй Ґіті» uppercase,
«Ґіта» with ґ per glossary. Glossary terms exact: Кундаліні, Сахасрара/
Сахасрарі, Аґію, Шіви, Ґанеша, Дух/Духа, Істина, его/суперего (lowercase per
glossary although EN capitalizes), стан усвідомлення без думок, Нірвікальпою,
ашрам, Сахаджа Йоґи (correct genitive), вібрації, протокол, Матері Землі,
Царство Боже (34× in corpus, consistent), Самість/Самістю (corpus form).
Realisation case follows the source: lowercase «реалізація» (¶7, 17, 19) vs
«Самореалізації» (¶27). «ґуру» lowercase for the false gurus mirrors the
source's lowercase “guru” (precedent: 2004-07-04 review). Religion names
lowercase («мусульмани, індуси, християни»); language names lowercase
(«англійська», «українська», line 4). «Воскресіння/Воскресінням» uppercase
for Christ's Resurrection as the named event; «Силу/Сила» uppercase where EN
has “Power”, lowercase «сила» where EN has “force” (¶21) — mirrors the source.
Proper names follow the corpus: «Ґевіна» (Ґевін 51× in corpus), «Фінчлі»,
«Крістіан», «Рубенс»; «лімбічної області» is the corpus's standard rendering
of “limbic area” (10× «область» vs 1× «ділянка»).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine government violation, not taste: «віддати належне до самих себе» is ungrammatical; the dative «собі» is the only way the verb can take its required object. Minimal insertion, meaning unchanged, matches the EN “give some due … to yourself”. |
| L | L2 | **Keep** | Codified punctuation norm for interrupted direct speech, and an explicit precedent: the same closed-and-reopened-quotes pattern was corrected in an earlier review («Мені це набридло», – Мій зять сказав, – «…» → «Мені це набридло, – сказав Мій зять, – …»). The corpus already uses the single-pair form. |
| L | L3 | **Keep** | Not style — a meaning inversion. «Ідіть» without «сюди» is “go”, and the source is an invitation to approach and feel the vibrations (“Come, come, come, come, all of you”). The corpus renders the same kind of call as «Підходьте, сідайте сюди!». |
| L | L4 | **Keep** | Orthographic rule, not preference: «небагато» as a quantity adverb (= мало) is one word; the only separate spelling is the contrastive «не багато, а …», which is not this sentence. |
| L | L5 | **Keep** | Mandatory у/в alternation between vowels (Правопис §23). Precedent: the «в ваших → у ваших» correction was kept in an earlier review as a mandatory alternation. Corpus: «бо в нас» 3× vs «бо у нас» 1× (this talk). |
| L | L6 | **Remove** | Precedent: «з Самості → із Самості» was removed in an earlier review as a recommendation rather than a rule. «з середини» after a vowel is acceptable; trivial. |
| L | L7 | **Remove** | «Давайте» + perfective 1st-person plural is normative spoken Ukrainian. Earlier reviews only corrected «давайте» + synthetic imperfective future («давайте матимемо»), which does not occur here. Style preference. |
| L | L8 | **Remove** | Not an error: the comparative phrase is tightly bound to the predicate (the manner of behaving), where the norm allows no comma. Ambiguous at best; trivial. |
| L | L9 | **Remove** | Faithful rendering of the transcriber's own wording (“the sound quality … is extremely distorted”) in an editorial bracket; a rewording would be stylistic. |
| L | L10 | **Remove** | Elliptical but grammatical: the time span «з третьої години й до ночі» serves as the object of «проведу», exactly as in the EN (“three o'clock onwards till the night, I will spend with him there”). Preserves spoken register. |
| S | S1 | **Remove** | Precedent (Кабелла Ліґуре, 2004-05-09 and 2004-07-04 reviews): corpus split four ways, glossary silent, form consistent within this talk. A per-talk change would be arbitrary; needs a corpus-wide decision. |
| S | S2 | **Remove** | False positive: the glossary headword is a lemma form, not a capitalization rule; as common plural nouns (“all the rishis and munis”) lowercase is normal Ukrainian and the corpus majority (7× «ріші» vs 2× «Ріші»). |
| S | S3 | **Remove** | Faithful to the source, which itself writes “TB patient [Tuberculosis]”; «ТБ» is an accepted medical abbreviation in Ukrainian (ТБ легень) and the bracketed gloss disambiguates it exactly as in the EN. Style preference. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 19 | Ви повинні віддати належне й виявити певну повагу до самих себе. | Ви повинні віддати собі належне й виявити певну повагу до самих себе. |
| 2 | 19 | «Гарно провели час», – кажете ви, – «Це гарна річ». | «Гарно провели час, – кажете ви. – Це гарна річ». |
| 3 | 20 | «Ідіть, ідіть, ідіть, ідіть, усі ви» | «Підходьте, підходьте, підходьте, підходьте, усі ви» |
| 4 | 26 | ми не багато публікували | ми небагато публікували |
| 5 | 27 | бо у нас небагато часу | бо в нас небагато часу |

## Summary

- Language (L): 10 issues found, 5 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: 5

The translation is of high quality and renders a difficult, fragmentary
recording with fidelity and devotion. Deity-pronoun capitalization, sacred
terms, and SY terminology are fully consistent with the glossary and the
corpus; all punctuation characters follow Ukrainian orthography. The five
applied fixes are one verb-government fix («віддати собі належне»), one
direct-speech punctuation normalization, one lexical fix restoring the
source's meaning («Підходьте» for “Come”), one spelling fix («небагато»),
and one mandatory у/в alternation. All discretionary style items and the
corpus-wide naming question («Кекстон Хол») were filtered out by the Critic,
three of them by direct precedent from earlier reviews.
