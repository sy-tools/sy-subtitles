# Language Review – 1990-08-31_Shri-Hanumana-Puja-Electromagnetic-Force, 2026-07-17

## Process

2+1 agent review of `transcript_uk.txt` (full paragraphed Ukrainian text):
Reviewer L (Language) + Reviewer S (SY Domain) run in parallel, Critic filters.

**Second pass.** The first pass (2026-05-30, see git history of this file) already
applied 16 fixes (deity-pronoun capitalization, «Сахаджа Йоґа» ґ-transliteration,
«Пуджа» capitalization, «будучи»). Its Critic precedents were respected and not
re-litigated: the `…` (U+2026) ellipsis style, «ось у чім річ», «спішність» and
the source-mirroring «Чандра-Ма» were all previously adjudicated as acceptable.
Paragraph numbers below are line numbers in `transcript_uk.txt` (same scheme as
the first-pass report).

Automated scans (mixed Latin/Cyrillic characters, non-«» quotes, wrong apostrophe,
double spaces, space before ellipsis): clean.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 3 (header) | Transliteration of German *Schwetzingen*: «т» dropped, «і» after «ц» instead of «и» (правопис §129 for geographic names; attested UK form «Шветцинген») | «Палац **Швецінген**, **Швецінген** (Німеччина)» | Палац Шветцинген, Шветцинген (Німеччина) |
| L2 | 9 | Subject inversion vs source: EN «There He had to be **told**» (Hanumana is told), but «Йому довелося сказати» = «He had to say» | «Тоді **Йому довелося сказати**: «Ні, ні, ні, ні…» | Тоді довелося сказати Йому: |
| L3 | 23 | Non-standard concessive «хай де» + present; standard is «хай би де» + past form (cf. «хай би що Він попросив» elsewhere in text) | «Тож **хай де ви бачите** дію електромагнітних сил» | хай би де ви бачили |
| L4 | 25 | Calqued government «розрізняти між X та Y» (EN *discriminate between*); «розрізняти» takes a direct object | «щоб **розрізняти між Істиною та неправдою**» | розрізняти Істину та неправду |
| L5 | 36 | Parenthetical «припустімо» needs commas on both sides | «бо **припустімо,** він каже» | бо, припустімо, він каже |
| L6 | 39 | Comma before «як» where the comparative phrase is the nominal part of the predicate («стати як Ханумана») | «якщо Німеччина може **стати, як Ханумана**, то» | може стати як Ханумана |
| L7 | 51 | Misplaced negation in contrast: «не означає X, а Y» instead of «означає не X, а Y» | «Це **не означає фізичної близькості, а** свого роду спорідненість» | Це означає не фізичну близькість, а… |
| L8 | 53 | Extra comma after «теж» (calque of EN «And today also, I was surprised»); «теж» is not parenthetical | «І сьогодні **теж,** Я здивувалася» | І сьогодні теж Я здивувалася |
| L9 | 55 | «би» in concessive «хай би що» requires the past form of the verb | «**Хай би що проходить** через Мій розум» | Хай би що проходило |
| L10 | 58 | Government of «забрати»: standard «забрати В когось», not «від» | «забрав електромагнітну силу **від цих людей**» | в цих людей |
| L11 | 59 | Parenthetical «припустімо» needs commas on both sides | «і **припустімо,** від холоду інколи» | і, припустімо, від холоду |
| L12 | 67 | Duplicated «це» breaks the cleft construction (EN «that it is Shri Hanumana who has done it») | «ніхто навіть не знає, **що це Шрі Ханумана це зробив**» | що це зробив Шрі Ханумана |
| L13 | 70 | «би» in concessive «хай би що» requires the past form of the verb | «Тож **хай би що Він носить**, це доволі багато» | хай би що Він носив |
| L14 | 71 | Register: «покохати» is primarily romantic; devotional context suggests «полюбити» | «тоді ви справді **покохаєте** Його» | полюбите |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 16 | Glossary lists «Nirakar → Ніракар» (capitalized) | «Він може входити в **ніракар**» | Ніракар |
| S2 | 26 | Glossary: «Nirvichara → Нірвічара» (capitalized); corpus majority also capitalizes (7:3) | «дає нам, скажімо, **нірвічара** самадхі» | Нірвічара самадхі |
| S3 | 26 | Glossary: «Nirvikalpa → Нірвікальпа» (capitalized); corpus majority capitalizes (5:2) | «і **нірвікальпа** самадхі» | Нірвікальпа самадхі |
| S4 | 31 | Transliteration convention: Sanskrit i/ī → «і» (Шіва, сіддхі, Кундаліні); word itself is inconsistent — same ī rendered «и» (джи-) and «і» (-ні) | «Піди й принеси **сандживані**» | санджівані |
| S5 | 76 | Glossary form «Chandrama → Чандрама» (no hyphen) | «Він мав **Чандра-Ма**» | Чандраму |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine transliteration error of the place name: German *Schwetzingen* contains «тц»; attested Ukrainian form is «Шветцинген» («и» after «ц» before a consonant in geographic names). Header is part of the translated text. |
| L | L2 | **Keep** | Meaning-inverting grammar error: the source says Hanumana *was told* «No, no…» (He had swallowed the sun); the translation makes Him the speaker. «Тоді довелося сказати Йому» restores the recipient reading with minimal change. |
| L | L3 | **Keep** | «хай де + present» is not a standard concessive; the text itself consistently uses «хай би що + past» (paras 31, 50). Aligning to «хай би де ви бачили» is a genuine grammar fix, not style. |
| L | L4 | **Keep** | «розрізняти між…» is a calque; the verb governs a direct object («розрізняти Істину та неправду»). Clear normative error. |
| L | L5 | **Remove** | False positive: «припустімо» here is an imperative verb introducing the supposition clause (EN «because supposing he says…»), not a parenthetical; a single comma after it is a defensible punctuation. |
| L | L6 | **Keep** | Standard rule: no comma when the «як»-phrase forms the nominal part of the compound predicate («може стати як Ханумана» — without the phrase the predicate is incomplete). |
| L | L7 | **Remove** | Elliptical spoken construction «не означає X, а [означає] Y» is parseable and common in colloquial register; the transcript deliberately preserves Shri Mataji's spoken syntax. Not a genuine error. |
| L | L8 | **Keep** | «теж» is not a parenthetical word in Ukrainian; the comma is a direct calque of the English source punctuation. Genuine extra comma. |
| L | L9 | **Keep** | The particle «би» grammatically requires the past form: «хай би що проходило». Present tense with «би» is ungrammatical. |
| L | L10 | **Remove** | «забрати від когось» is an attested variant (СУМ); «в когось» is merely preferable. Not a clear error — leave the translator's choice. |
| L | L11 | **Remove** | Same as L5: verb reading of «припустімо» (EN «supposing with the cold you develop those rashes») makes the current punctuation defensible. |
| L | L12 | **Keep** | The doubled «це» is a genuine syntactic slip; «що це зробив Шрі Ханумана» preserves the cleft meaning («that it is Shri Hanumana who has done it»). |
| L | L13 | **Keep** | Same rule as L9: «хай би що Він носив». |
| L | L14 | **Remove** | Style preference, not an error: «покохати» legitimately renders «fall in love with» and carries the intended warmth; no rule violated. |
| S | S1 | **Remove** | False positive: the source uses the indefinite generic «a nirakar», immediately glossed by the lowercase apposition «безформний стан»; here it is a common-noun state, not the divine aspect. Corpus also has lowercase «ніракар» precedent. |
| S | S2 | **Keep** | Glossary is the contract: «Нірвічара» capitalized; corpus majority agrees. The adjacent «самадхі» stays lowercase per glossary. |
| S | S3 | **Keep** | Same as S2: «Нірвікальпа самадхі». |
| S | S4 | **Keep** | Project transliteration convention renders Sanskrit i/ī as «і» (Шіва, сіддхі, Кундаліні — deliberately overriding the «дев'ятка» for sacred terms); «сандживані» is also internally inconsistent (и/і for the same vowel). No corpus precedent conflicts (word occurs only in this talk). |
| S | S5 | **Remove** | Already adjudicated in the 2026-05-30 pass: «Чандра-Ма» faithfully mirrors the EN transcript's hyphenation («Chandra-Ma») and is an acceptable rendering. Precedent stands. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 3 | «Палац Швецінген, Швецінген (Німеччина)» | Палац Шветцинген, Шветцинген (Німеччина) |
| 2 | 9 | «Тоді Йому довелося сказати:» | Тоді довелося сказати Йому: |
| 3 | 23 | «Тож хай де ви бачите дію» | Тож хай би де ви бачили дію |
| 4 | 25 | «розрізняти між Істиною та неправдою» | розрізняти Істину та неправду |
| 5 | 26 | «нірвічара самадхі» | Нірвічара самадхі |
| 6 | 26 | «нірвікальпа самадхі» | Нірвікальпа самадхі |
| 7 | 31 | «сандживані» | санджівані |
| 8 | 39 | «може стати, як Ханумана» | може стати як Ханумана |
| 9 | 53 | «І сьогодні теж, Я здивувалася» | І сьогодні теж Я здивувалася |
| 10 | 55 | «Хай би що проходить» | Хай би що проходило |
| 11 | 67 | «що це Шрі Ханумана це зробив» | що це зробив Шрі Ханумана |
| 12 | 70 | «хай би що Він носить» | хай би що Він носив |

## Summary

- Language (L): 14 issues found, 9 approved by Critic
- SY Domain (S): 5 issues found, 3 approved by Critic
- Total corrections applied: 12 (13 word-level edits; the header place name occurs twice in paragraph 3)
