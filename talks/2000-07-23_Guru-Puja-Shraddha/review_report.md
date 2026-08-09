# Language Review – 2000-07-23_Guru-Puja-Shraddha, 2026-07-27

## Process

2+1 agent review of `transcript_uk.txt` (34 paragraphs) per
`templates/language_review_template.md`: Reviewer L (Orthography + Grammar +
Punctuation) and Reviewer S (SY Domain: Capitalization + Terminology +
Consistency) ran in parallel; the Critic filtered both tables; approved
corrections were applied to `transcript_uk.txt`.

**This is a second review pass.** A prior pass on this talk applied 11
corrections; all 11 were verified to still be in place before this review began
(`– це дати вам знання`, `власний Дух`, `себе самих і день`, `Ти ж летиш`,
`Матінко, Ти дуже запізнюєшся`, `дати вам зрозуміти`, `занепокоєна, і Я говорю`,
`«Боже мій»`, `Сатья Югу`, `не говорити про це?`, `ви як ґуру зрозумієте`).
This pass therefore reviewed the corrected text afresh rather than re-litigating
those findings, and paragraph references use the same line numbering as before.

Where a finding was borderline, it was checked empirically against the existing
90-talk `talks/*/transcript_uk.txt` corpus rather than decided on intuition.
That evidence is cited in the Critic table.

### Mechanical pre-checks (all clean, no findings)

| Check | Result |
|---|---|
| Latin/Cyrillic mixing | only `N.I.H.` (intentional acronym, glossed inline) |
| Dash character | 90 × en-dash U+2013; 0 × em-dash U+2014; 0 × ` - ` |
| Quotation marks | 32 `«` / 32 `»`, balanced; no `„“`, no `""` |
| Apostrophe | 16 × U+2019; 0 straight `'` |
| Spacing | no double spaces; no space before punctuation |
| Ellipsis | 5 × `...` (three ASCII dots, no preceding space); 0 × U+2026 |
| Structure | 34 paragraphs = EN; header format matches corpus |
| `пів-` forms | `на півдорозі` ×2 — correct |

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | ¶22 | Number agreement: `багато хто` is a singular pronoun, but the predicate is plural `отримали` | «Тепер **багато хто з вас**, Я б сказала, більшість із вас, **отримали** свою Реалізацію.» | `багато хто з вас` → `багато з вас` |
| L2 | ¶38 | Ungrammatical predicative: genitive `нічого складного` cannot be predicated of nominative `це` — the frame needs an (elliptical) existential | «Ви можете це зробити. **Для вас це нічого складного.**» | «Для вас **у цьому** нічого складного.» |
| L3 | ¶17 | Case form: copula `є` takes an instrumental predicate; the same paragraph already writes `яка є природним світлом Духа` | «така відданість, **яка є шраддга** – вона вища за бхакті» | `шраддга` → `шраддгою` |
| L4 | ¶26 | Extra comma before single `або` joining homogeneous predicates | «Ми стоїмо на місці**,** або трохи це робимо.» | remove comma |
| L5 | ¶22 | Latin script inside Cyrillic text | «в Америці, в **N.I.H.** – це Інститут здоров’я» | transliterate or spell out |
| L6 | ¶16 | Calqued quantifier phrase ("into so many other things") | «жінки занурюються **в так багато** інших речей» | «у безліч інших речей» |
| L7 | ¶28 | Clumsy quantifier chain | «Ви врятовані **від так багатьох** речей.» | «від багатьох речей» |
| L8 | ¶14 | Comma + dash before a contrasting main clause instead of a conjunction | «не живуть ні майбутнім, ні думками про минуле**, –** вони в теперішньому» | «…про минуле, **а** вони в теперішньому» |

Passing checks (no findings): spelling — no defects; concessive particle correct
(`За що б ви не взялися`, `Де б ви не були`, `Що б ви не бажали`); no comma
between adjacent `що` + `коли`/`якщо` (`що коли Я ходжу по них, Я…`); commas
correctly present with repeated `і` (`своїми щоденними мирськими справами, і
своєю іншою роботою, і всім іншим`) and correctly absent with single `і`
between homogeneous clauses; gerund clauses correctly bracketed (`Вони думають,
що, виконуючи всі ці ритуали, вони близькі до Бога`); gender/number agreement
sound in every predicative adjective (`лагідною й м’якою`, `безстрашним`,
`глибокими`, `мужніми`, `вища особистість`); `?...` in ¶30 is valid Ukrainian
combined punctuation.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | ¶7 | `Пуджа` is listed as an always-uppercase spiritual term in `glossary/CLAUDE.md`; capitalized 4× elsewhere in this transcript (¶2, ¶17, ¶34, ¶36) | «Безліч акробатики, молитов, **пудж** – усе це триває.» | `пудж` → `Пудж` |
| S2 | ¶15 | Pronoun for the Divine lowercase, while ¶14 writes `Воно піклується про ваш комфорт` | «Ви – особлива відповідальність Божественного. І **воно** знає…» | `воно` → `Воно` |
| S3 | ¶20 | Pronouns referring to `Дух` (an uppercase spiritual term) left lowercase | «а що ж із вашим Духом? Чи **йому** це подобається? Чи **він** насолоджується?» | `Йому` / `Він` |
| S4 | ¶33, ¶34, ¶37, ¶38 | Short form `сахадж йоґи/йоґів` alongside `сахаджа йоґи/йоґів` in ¶19, ¶21, ¶24, ¶26, ¶28–30 | «Ви створюєте **сахадж** йоґів» | normalize to `сахаджа` |

Passing checks (no findings): `Принцип Ґуру`, `Сахаджа Йоґа` incl. locative
`в Сахаджа Йозі` ×3 (never `Йоґі`), `Кундаліні`, `бхакті`, `шраддга`,
`вібрації`, `бандхан`, `его`, `сходження`, `Сатья Юга`, `Матір Землю`
(`Мати Земля`), `стан усвідомлення без думок`, `віддача на милість`,
`прохолодний вітерець`, `Лао-Цзи`, `Шрі Раму`, `Дух`/`Духа`/`Духом`,
`колективна свідомість` — all per `terms_lookup.yaml` / `terms_context.yaml`.
`сахаджа йоґиню` (¶22) correctly uses the feminine form — the tested yogi is
"the girl" in the EN. Shri Mataji's pronouns uppercase in all 108 instances
(`Я` 83, `Мені` 9, `Мене` 5, `Ти` 5, `Мною` 2, `Мій` 2, `Моє` 1, `Себе` 1); a
full sweep confirmed every lowercase third-person pronoun refers to a regular
person, an object, or an abstract noun. `Реалізовані Душі` (¶12) /
`реалізовані душі` (¶16, ¶27) track the EN case. Language name lowercase in the
header (`англійська`). `Нехай Бог благословить усіх вас!` matches the fixed
blessing formula exactly.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine agreement error. Corpus is decisive: `багато хто` takes a singular verb in 18 of 19 occurrences (`багато хто з вас, мабуть, помітив`, `багато хто з них казав`, `багато хто з вас мав`, `багато хто зцілився`), while `багато з вас` takes the plural — including the verbatim precedent `багато з вас отримали Реалізацію`. Fixing the subject rather than the verb also keeps the `більшість із вас` apposition working. |
| L | L2 | **Keep** | Genuine grammar defect. A genitive `нічого + adj.` predicate needs an existential (`немає`), explicit or elliptical; the corpus only has `немає нічого страшного в тому, щоб…` or the standalone interjection `нічого страшного`, never `це нічого + genitive`. Minimal repair `це` → `у цьому` keeps the idiomatic ellipsis and the EN sense. |
| L | L3 | **Keep** | Genuine case error and an internal inconsistency: the same paragraph writes `яка є природним світлом Духа` and ¶18 writes `що є реалізованою душею`. Corpus overwhelmingly pairs the copula `є` with the instrumental (`реалізованою`, `силою`, `джерелом`, `істиною`, `любов’ю`, `нічим`, `справжнім`). |
| L | L4 | Remove | False positive. The comma is not joining plain homogeneous predicates — `або трохи це робимо` is a spoken self-correction ("or little bit we do it"), and a comma before a corrective `або` is legitimate. Removing it would erase Shri Mataji's hesitation. |
| L | L5 | Remove | False positive, and consistent with the prior pass. The mixed-script check targets accidental homoglyphs inside Cyrillic words; `N.I.H.` is a foreign institutional acronym spelled exactly so in the EN, glossed immediately in Ukrainian (`це Інститут здоров’я`), and the corpus keeps Latin acronyms as-is (`BBC`, `IBM`, `SOS`). |
| L | L6 | Remove | Style preference, not an error. `так багато інших речей` is a grammatical quantified phrase, and `так багато` is corpus-wide house style reflecting Shri Mataji's spoken register. |
| L | L7 | Remove | Style preference. `від так багатьох речей` is correctly declined; same reasoning as L6. |
| L | L8 | Remove | Style preference. The `, –` pause marker is used deliberately and consistently throughout this transcript (¶16, ¶29, ¶30) to render spoken emphasis; changing one instance would create the inconsistency it claims to fix. |
| S | S1 | Remove | False positive. The glossary lemma carries the uppercase of the ceremony *name* (`Ґуру Пуджа`, `Мою Пуджу`). Used as a generic plural in a critical list of empty rituals ("Lots of acrobats, prayers, pujas"), the corpus lowercases it — `протокол пудж`, `в інших пуджах`, `пуджа мурті`. This talk correctly keeps `Пуджа` uppercase wherever it names the ceremony (¶2, ¶17, ¶34, ¶36). Original is correct. |
| S | S2 | Remove | False positive, caught by corpus check. `Воно` is never capitalized as a Divine pronoun in this corpus: `і Воно`/`І Воно` occurs **0 times** in 90 talks, and mid-sentence `воно` is always lowercase — including for the Spirit (`воно є блаженством, воно є істиною`). The `Воно` in ¶14 is capitalized only because it opens a sentence; the ¶15 instance sits mid-sentence after `І`. No inconsistency exists. |
| S | S3 | Remove | No rule supports it. The documented pronoun rules cover Shri Mataji, individual Incarnations, and regular people — not pronouns standing for the impersonal `Дух`; the referent here is the listener's own Spirit; the corpus lowercases such pronouns; and the transcript is internally consistent (`йому` … `він`). |
| S | S4 | Remove | False positive. `terms_context.yaml` states `сахаджа`/`сахадж` are interchangeable, register «на розсуд перекладача / **за оригіналом**». The EN switches to "Sahaj Yogis" in exactly ¶33/¶34/¶37/¶38 and uses "sahaja yogi" elsewhere — the translation mirrors the original faithfully. |

Conflicts between L and S: none.

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | ¶17 | `яка є шраддга` — copula `є` requires an instrumental predicate | «така відданість, яка є **шраддгою** – вона вища за бхакті» |
| 2 | ¶22 | `багато хто` (singular) + `отримали` (plural) | «Тепер **багато з вас**, Я б сказала, більшість із вас, отримали свою Реалізацію.» |
| 3 | ¶38 | genitive predicate without an existential | «Для вас **у цьому** нічого складного.» |

### Post-application verification

- All 3 corrections present exactly once; no regressions (`яка є шраддга –`,
  `багато хто з вас`, `це нічого складного` → 0 occurrences). The remaining
  `шраддга –` match in ¶18 is the unrelated and correct
  `І ця шраддга – це такий різновид любові…`.
- 34 paragraphs preserved (= EN); quotes balanced 32/32; no em-dash, straight
  quotes, or straight apostrophes introduced; all 11 prior-pass corrections
  still intact.

## Summary

- Language (L): 8 issues found, 3 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: **3**

**Overall quality: high**, as expected on a second pass. The mechanical layer is
flawless — quotation marks, apostrophes, dashes, ellipses, and spacing all
conform with no exceptions — and spelling had no defects. Terminology and
capitalization required no changes at all: all four SY-domain findings dissolved
under corpus checking, three of them because the transcript was following an
established house convention more precisely than the reviewer's reading of the
glossary lemma (generic `пудж` lowercase, `воно` never capitalized for the
Divine, `сахадж` tracking the original's own switch). Notably, these same three
verdicts were reached independently in the prior pass, which strengthens them as
settled convention rather than one-off judgement calls. The three genuine
defects this pass caught were all grammatical and all missed previously: two
case/agreement errors (`багато хто … отримали`, `яка є шраддга`) and one
malformed predicative construction (`це нічого складного`).
