# Language Review – 1991-04-06 Bhavasagara Puja: Meditation will protect you, 2026-07-15

## Process

2+1 agent language review of `transcript_uk.txt` (Brisbane, Australia, 6 April 1991)
against the English original, `glossary/CLAUDE.md`, `terms_lookup.yaml`, and
`terms_context.yaml`. Reviewers L (Language) and S (SY Domain) ran in parallel; the
Critic filtered their findings before application.

This pass supersedes the review of 2026-05-29, whose single approved fix
(mid-sentence `– Дуже важливо` → `– дуже важливо`, para 38) is already present in the
text and was re-verified.

Paragraph numbers below refer to line numbers of `transcript_uk.txt` (each paragraph
is one line; lines 1–5 are the header).

Mechanical pre-checks (scripted): no Latin/Cyrillic letter mixing; no double spaces;
no German/English quotes (only `«»`); apostrophes uniformly `’` (U+2019); dashes are
en-dash ` – ` (U+2013) with spaces, hyphens only in legitimate compounds
(`рано-вранці`, `п’ять-десять`, `такий-то`, `Подивлюся-но`, `1970-й` …); no space
before punctuation; ellipsis (`Немає...`) is three dots with no preceding space.
All clean.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 13 | Comma before the closing dash of an inserted clause where no comma is syntactically required | `…помедитувати – це колективна частина, – або обговорюють…` | `…– це колективна частина – або обговорюють…` |
| L2 | 16 | `бракувати` governs the genitive; the adverb `якісно` cannot serve as its complement | `але якісно нам бракуватиме` | `але якості нам бракуватиме` |
| L3 | 17 | Tense disagreement in the conditional construction | `якщо ви залишите їх…, то вони ростуть і стають великими` | `то вони ростимуть і ставатимуть великими` |
| L4 | 20 | Mood disagreement: a `якби`-clause requires the conditional in the main clause | `Я можу зрозуміти, якби люди в Лондоні були ліниві` | `Я могла б зрозуміти, якби люди в Лондоні були ліниві` |
| L5 | 23 | Redundant construction `такий же самий` | `Повертаєтесь додому такими ж самими` | `такими самими` |
| L6 | 25 | `досягти` governs the genitive, not the accusative | `ми лише щось досягли` | `ми лише чогось досягли` |
| L7 | 30 | Calqued government `увага піде до` | `ваша увага піде до таких речей` | `ваша увага піде на такі речі` |
| L8 | 32 | Extra comma before a single (non-repeated) `або` joining homogeneous parts | `спробувати стати лідером, або вчинити якесь самоствердження` | `стати лідером або вчинити якесь самоствердження` |
| L9 | 38 | Questionable government `свідок самому собі` | `наче ви свідок самому собі` | `наче ви самі собі свідок` |
| L10 | 44 | Lexical calque `у всіх відношеннях` (Russian «во всех отношениях»); Ukrainian `відношення` is a mathematical/logical term only | `на оточення, у всіх відношеннях, і на особистість` | `на оточення, в усіх аспектах, і на особистість` |
| L11 | 47 | Extra comma after the conjunction `тобто` (it is not a parenthetical word) | `Тобто, Я б не сказала «увібрати»` | `Тобто Я б не сказала «увібрати»` |

Spontaneous-speech anacolutha (e.g. para 23 `Так само тих, хто медитує…`, para 27 the
garbled year arithmetic, para 47 `але ви – Я попрошу вас…`) faithfully mirror the
English source and were not flagged as errors.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 9 | `тапасчар’я` is absent from the glossary; glossary has `tapasya → тапасья` | `У Сахаджа Йозі немає тапасчар’ї [аскетизм]` | (proposed) `немає тапасьї` |
| S2 | 14 | `тапа` lowercase while EN reads capitalized `Tapa` | `у чому полягає тапа в цьому випадку – аскеза?` | (proposed) `Тапа` |
| S3 | 41 | Possible glossary mismatch: `cool breeze → прохолодний вітерець` | `Матінко, всередину зайшло щось прохолодне` | (proposed) `зайшов прохолодний вітерець` |

Verified without findings: Shri Mataji pronouns always uppercase (`Я`, `Мене`, `Мені`,
`Мого`; addressed `Твоєю`/`Твоїй` in para 26); `Мати`, `Матінко`, `Її`, `Богиню`,
`Богом`, `Божественного` uppercase; the tiger's `його` (para 42) correctly lowercase;
personified `пан Его` uppercase vs generic `его` lowercase — correct. `Пуджа`
consistently capitalized in all case forms (`Пуджу`, `Пуджі`, `Пудж`); `Сахаджа Йоґа`
with correct locative `в Сахаджа Йозі`; `сахаджа йоґ/йоґи/йоґів/йоґом` lowercase with
correct declension. Glossary terms correct: `Бхавасаґара`, `Кундаліні`, `Сахасрара`,
`чакри`, `вібрації`, `бандхан`, `бадхи`, `обумовленість` (conditioning), `блокування`
(catches), `атака` (attack), `віддача на милість` (surrender), `аскеза` (penance),
`стан усвідомлення без думок` / `стан без думок`, `ашрам` (lowercase), `Ґанґа`,
`Ґанеша`, `Аді Шанкарачар’я`. `реалізація/Реалізація` register mirrors the English
source at every occurrence (paras 25, 28, 42). Language names lowercase
(`англійська`, `українська`).

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Remove | The «кома й тире» pattern closing a full inserted clause is an accepted punctuation convention; not an unambiguous error. |
| L | L2 | **Keep** | Genuine government error: `бракувати` requires the genitive (`якості`); the adverb `якісно` is ungrammatical as its complement. |
| L | L3 | Remove | The present tense mirrors the original (“then they grow, and they become big”) and is acceptable in spoken conditional constructions. |
| L | L4 | **Keep** | Genuine mood-agreement error: `якби` requires the conditional (`могла б зрозуміти`) in the main clause. |
| L | L5 | Remove | Colloquial pleonasm matching the spoken register of the talk; a style preference, not an error. |
| L | L6 | **Keep** | Genuine case-government error: `досягти чогось`, not `щось`. |
| L | L7 | Remove | Colloquial government; meaning preserved; the replacement is a style preference. |
| L | L8 | **Keep** | Clear punctuation rule: no comma before a single `або` joining homogeneous parts. |
| L | L9 | Remove | Construction is close to the idiom `сам собі…` and fully comprehensible; the replacement is a matter of taste. |
| L | L10 | **Keep** | Well-documented lexical calque (Антоненко-Давидович and modern style guides); a genuine lexical error, not a preference. |
| L | L11 | **Keep** | `тобто` is a conjunction, not a parenthetical word; the comma after it is a punctuation error. |
| S | S1 | Remove | False positive: the original says “tapascharya”, not “tapasya”; the transliteration `тапасчар’я` is accurate and consistent with the `Шанкарачар’я` pattern. |
| S | S2 | Remove | False positive: the glossary keeps the related terms (`тапасья`, `аскеза`) lowercase; the lowercase is consistent — the EN capital is a quirk of the source transcript. |
| S | S3 | Remove | False positive: the original says “some cooler has come inside”, not “cool breeze”; `щось прохолодне` is the accurate rendering. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 16 | `але якісно нам бракуватиме` | `але якості нам бракуватиме` |
| 2 | 20 | `Я можу зрозуміти, якби люди в Лондоні були ліниві` | `Я могла б зрозуміти, якби люди в Лондоні були ліниві` |
| 3 | 25 | `ми лише щось досягли` | `ми лише чогось досягли` |
| 4 | 32 | `спробувати стати лідером, або вчинити якесь самоствердження` | `спробувати стати лідером або вчинити якесь самоствердження` |
| 5 | 44 | `на оточення, у всіх відношеннях, і на особистість` | `на оточення, в усіх аспектах, і на особистість` |
| 6 | 47 | `Тобто, Я б не сказала «увібрати»` | `Тобто Я б не сказала «увібрати»` |

## Summary

- Language (L): 11 issues found, 6 approved by Critic
- SY Domain (S): 3 issues found, 0 approved by Critic
- Total corrections applied: **6**

The translation is of high quality: SY terminology, deity-pronoun capitalization, and
orthography are accurate and internally consistent, and the register of sacred terms
mirrors the English source throughout. The six applied fixes are grammar-level
(verb government ×2, mood agreement ×1) and punctuation/lexical (extra commas ×2,
one lexical calque); no terminology corrections were needed.
