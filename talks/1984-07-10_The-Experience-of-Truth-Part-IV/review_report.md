# Language Review – 1984-07-10 The Experience of Truth (Part IV), 2026-05-30

## Process

2+1 agent language review of `transcript_uk.txt` against `transcript_en.txt`,
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.
Reviewer L (Language) and Reviewer S (SY Domain) ran in parallel; the Critic
filtered both tables; approved corrections were applied to `transcript_uk.txt`.

Character-level checks confirmed the document is already clean on: quotation
marks (only `«»`, no `„"`/`""`/straight quotes), apostrophes (only `’` U+2019),
dashes (only en-dash ` – ` U+2013, no em-dash/hyphen-as-dash), and Latin/Cyrillic
mixing (only the intentional English publication name `«Bedfordshire Journal»`).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 47 | Single-char ellipsis `…` (U+2026) instead of three dots `...` per orthography rule | `Запитання: … Відповідь:` | `Запитання: ...` |
| L2 | 48 | Single-char ellipsis `…` (U+2026) instead of three dots `...` | `Запитання: … Що таке чорне серце?` | `Запитання: ...` |
| L3 | 36 | Direct speech in `«»` after colon must start with a capital letter | `діти: «вам не можна тут бігати…»` | `«Вам не можна тут бігати…»` |
| L4 | 37 | Direct speech in `«»` after colon must start with a capital letter | `на них: «що ти собі дозволяєш…»` | `«Що ти собі дозволяєш…»` |
| L5 | 47 | Direct speech in `«»` must start with a capital letter | `але «ви прийдіть до мене, і я дам вам гроші»` | `«Ви прийдіть до мене…»` |
| L6 | 47 | Direct speech in `«»` must start with a capital letter | `кажуть: «ви прийдіть до мене, ви віддайте…»` | `«Ви прийдіть до мене…»` |
| L7 | 11 | Predicate before coordinated subjects — `виникали` (pl.) vs nearest singular `сварка` | `виникали велика сварка, і бійка` | (considered: `виникала`) |
| L8 | 47 | Calque `слідувати за` (following a guru); `іти за` more idiomatic | `слідували за якимись… святими` | (considered: `йшли за`) |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 34 | Shri Mataji pronoun must be uppercase (rule: ALWAYS uppercase); inconsistent with `Я`/`Мене` capitalized in same sentences | `і вона вийшла й зцілила мене` | `і Вона вийшла…` |
| S2 | 34 | Shri Mataji pronoun must be uppercase; inconsistent with quoted `Мене`/`Я` immediately following | `а вона сказала: ти прийди до Мене` | `а Вона сказала…` |
| S3 | 37 | 2nd-person pronoun addressing Shri Mataji should be uppercase, per document's own convention (cf. para 41 `чи знаєте Ви`) | `Вона запитала Мене: вам не здається…` | `…: Вам не здається…` |
| S4 | 47 | Transliteration: Sanskrit `g` → `ґ`; rest of document uses `Йоґа`/`йоґи`, this one used `г` | `після йоги ви отримуєте` | `після йоґи` |
| S5 | 23 | `Prophets` capitalized in source rendered `Пророками`; generic prophets (people) normally lowercase | `стануть Пророками… робити Пророками інших` | (considered: `пророками`) |
| S6 | 39 | Inconsistent `Боже царство` vs `Його Царство` | `це все Боже царство` / `в Його Царство` | (considered: align) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Mandated rule: ellipsis is `...` (three dots). Single-char `…` used only in the two `Запитання:` markers; normalize for consistency. |
| L | L2 | **Keep** | Same as L1. |
| L | L3 | **Keep** | Ukrainian: a complete sentence of direct speech in `«»` starts with a capital. Translator capitalizes all other quoted speech (paras 11, 14, 15) — this is a genuine miss. |
| L | L4 | **Keep** | Same rationale as L3. |
| L | L5 | **Keep** | Same rationale as L3. |
| L | L6 | **Keep** | Same rationale as L3. |
| L | L7 | **Remove** | A predicate preceding several coordinated subjects may take plural; `виникали` is defensible. Not a clear-cut error. |
| L | L8 | **Remove** | `слідувати за` is accepted in modern Ukrainian; switching to `іти за` is a style preference, not an error. Consistent throughout the paragraph. |
| S | S1 | **Keep** | Explicit rule "Shri Mataji: ALWAYS uppercase". Narrator is Shri Mataji herself (cf. parenthetical `(Я маю білий автомобіль)`); leaving `вона` lowercase is internally inconsistent with `Я`/`Мене` in the same sentences. |
| S | S2 | **Keep** | Same as S1; `Мене`/`Я` in the very next clause are uppercase. |
| S | S3 | **Keep** | The document already capitalizes 2nd-person address to Mother (para 41 `чи знаєте Ви`); lowercase `вам` here is inconsistent. |
| S | S4 | **Keep** | Project transliteration convention (Sanskrit `g` → `ґ`) and the document's own `Йоґа`/`йоґи` everywhere else. `йоги` (г) is the lone deviation. |
| S | S5 | **Remove** | `Пророк`/`Prophets` is not in the mandated capitalization list; the capitalization mirrors the source's reverent usage and is not clearly wrong. Changing it is a judgment call → leave original. |
| S | S6 | **Remove** | Source itself varies ("God's realm" vs "His Kingdom"); neither form violates an explicit rule. Trivial — leave original. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 47 | `…` (U+2026) → three-dot ellipsis | `Запитання: ... Відповідь:` |
| 2 | 48 | `…` (U+2026) → three-dot ellipsis | `Запитання: ... Що таке чорне серце?` |
| 3 | 36 | Quoted sentence lowercase start | `«Вам не можна тут бігати, ви мені заважаєте»` |
| 4 | 37 | Quoted sentence lowercase start | `«Що ти собі дозволяєш, так поводячись…»` |
| 5 | 47 | Quoted sentence lowercase start | `«Ви прийдіть до мене, і я дам вам гроші»` |
| 6 | 47 | Quoted sentence lowercase start | `«Ви прийдіть до мене, ви віддайте свої гроші мені…»` |
| 7 | 34 | Shri Mataji pronoun lowercase | `і Вона вийшла й зцілила мене` |
| 8 | 34 | Shri Mataji pronoun lowercase | `а Вона сказала: ти прийди до Мене` |
| 9 | 37 | Pronoun addressing Shri Mataji lowercase | `Вона запитала Мене: Вам не здається…` |
| 10 | 47 | Transliteration `йоги` → `йоґи` (Sanskrit g → ґ) | `після йоґи ви отримуєте свій добробут` |

## Summary

- Language (L): 8 issues found, 6 approved by Critic
- SY Domain (S): 6 issues found, 4 approved by Critic
- Total corrections applied: **10**

### Notes
- The translation is of high quality: deity-pronoun capitalization for Shri Mataji
  (`Я/Мені/Мій/Моя/Мене/Мною`) and for individual Incarnations (`Він/Його/Нього`
  for Christ, Rama, Krishna) is consistent; plural Incarnations mid-sentence are
  correctly lowercase (`вони кажуть те саме`).
- Spiritual terms are correctly capitalized: `Істина`, `Дух`, `Інкарнації`,
  `Святий Дух`, `Войд`, `Кундаліні`, `Сахаджа Йоґа`.
- Glossary terminology is accurate: `ґріхастха`, `Сат Ґуру`, `Сат-Чід-Ананда`,
  `Калі Юга`/`Кріта Юга`, `Раджа Джанака`, `Лао-Цзи`, `Нанак`, `Мати Земля`,
  `реалізована душа`, `одержимий`, `Мохаммед Сахіб`.
- The translator correctly normalized the source's inconsistent `Krita/Kritta/Krutha
  yuga` to a single `Кріта Юга`.
- The generic first-person examples (`я підходжу й бачу ці квіти`, para 25;
  `я бачу індійця`, para 32; `я ненавиджу себе`, para 42) are intentionally kept
  lowercase — they describe the unrealized, reactive mind, not Shri Mataji's
  self-reference; the translator correctly contrasts these with genuine
  self-reference rendered uppercase (`Я сиджу тут… і думаю про когось`, para 33).
</content>
</invoke>
