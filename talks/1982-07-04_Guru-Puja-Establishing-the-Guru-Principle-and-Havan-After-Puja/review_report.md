# Language Review – 1982-07-04 Guru Puja (Establishing the Guru Principle and Havan After Puja)

## Process

2+1 agent language review of `transcript_uk.txt` against `transcript_en.txt`,
`glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.

- **Reviewer L** – Orthography + Grammar + Punctuation
- **Reviewer S** – SY Domain (Capitalization + Terminology + Consistency)
- **Critic** – Filters false positives and style preferences, keeps genuine errors.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 93–100 | Mis-capitalised sacred syllable "оМ" (lowercase о + uppercase М) | "1. **оМ** Шрі Кешавая намаха" (×6) | "Ом" |
| L2 | 50 | Prefix `анти-` written with a hyphen | "усілякі **анти-ґуру** трюки спрацьовують" | "антиґуру" (prefix written together) |
| L3 | 51 / 87 | Non-standard feminine form "привілея" (standard: m. "привілей") | "це ваша **привілея**", "цю велику **привілею**" | "привілей" / "привілей" |
| L4 | 27 | Active present participle (-юч-) discouraged in normative Ukr. | "використовували **жахаючі** методи" | "жахливі" / "лякаючі" |
| L5 | 62 | Active present participle (-юч-) | "Вона надзвичайно **всепрощаюча**" | "всепрощенна" / "що все прощає" |
| L6 | 23 | Active present participle (-юч-) | "отримати **вируючі** потоки вашої любові" | "буремні" / relative clause |
| L7 | 26 | Calque "вбита на смерть" for "killed to death" | "має бути **вбита на смерть**" | "має бути страчена" |
| L8 | 79 | Garbled filler "і це те, і те те" for "this is that and that is that" | "хтось купив сарі, **і це те, і те те**" | "і це таке, і те таке" |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 18 | Deity-pronoun cap.: the yogi (regular person) refers to himself → must be lowercase | Йоґ: "Вибач **Мене**, Мати" | "Вибач **мене**" |
| S2 | 27 | Deity-pronoun cap.: Shri Mataji's "I" must be uppercase | "жахаючі методи, **я** б сказала" | "**Я** б сказала" |
| S3 | 37 | Deity-pronoun cap.: Shri Mataji's "I" must be uppercase | "цілковито роздягається, **я** б сказала" | "**Я** б сказала" |
| S4 | 52 | Cap. consistency: Shri Mataji's emphatic "Сама" (cf. para 48 "Я Сама", 59 "Самій") | "Я тепер **сама** стану бхутом" | "**Сама**" |
| S5 | 87, 90, 105, 110, 112, 114(×2), 115, 116(×2), 121, 123, 125 | "Стопи" (Lotus Feet of the Mother) must be uppercase per glossary rule | "мив **стоп** Шрі Матаджі", "Мої **стопи**" (×12) | "**Стоп**" / "Мої **Стопи**" |
| S6 | 32, 39 | "істина" – possible absolute-Truth capitalisation | "темрява – це **істина**", "це не **істина**" | "Істина" (?) |
| S7 | 60 | "нірмала відьї" vs glossary "Нірмала Відья" | "Мої власні методи **нірмала відьї**" | "Нірмала Відьї" (?) |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | "оМ" (lowercase о + uppercase М) is objectively wrong; sacred syllable is "Ом". Confirmed at byte level. |
| L | L2 | **Keep** | Per Ukr. orthography the prefix `анти-` joins directly (антивірус, антитіло); "ґуру" is a common noun, so no hyphen → "антиґуру". |
| L | L3 | **Remove** | "привілея" (f.) is an attested dictionary variant and is used consistently (nom. + acc.); not a clear error. Changing it would force gender re-agreement with no real gain. |
| L | L4–L6 | **Remove** | -юч- active participles are a style/normative concern, lexicalised and widely accepted; "fixing" them requires rewriting, not error correction. |
| L | L7 | **Remove** | "вбита на смерть" faithfully mirrors the redundant English "killed to death"; intentional fidelity to ShM's phrasing. |
| L | L8 | **Remove** | The English source ("this is that and that is that") is itself garbled filler; the rendering is a faithful, if awkward, mirror. |
| S | S1 | **Keep** | The yogi asks to be excused (refers to himself, a regular person) → lowercase "мене". |
| S | S2 | **Keep** | "I should say" is Shri Mataji speaking → "Я" must be uppercase. |
| S | S3 | **Keep** | Same as S2 — Shri Mataji's "I". |
| S | S4 | **Keep** | Document's own convention capitalises ShM emphatic/reflexive pronouns (para 48 "Сама", 59 "Самій", "Собою", "Собі"); para 52 "сама" is the lone inconsistency. |
| S | S5 | **Keep** | Explicit project rule: "Стопи – uppercase (Lotus Feet of Deity/Mother)". All instances are Shri Mataji's Feet washed/rubbed during the puja. |
| S | S6 | **Remove** | Here "truth" is a predicate noun in ordinary discourse ("darkness is the truth"), not the divine absolute Truth as a standalone term; English source is lowercase. |
| S | S7 | **Remove** | English source uses lowercase "nirmala vidya" descriptively ("My own methods of…"); keeping lowercase matches the source register. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 18 | "Вибач **Мене**, Мати" (yogi → self, regular person) | "Вибач **мене**, Мати" |
| 2 | 27 | "жахаючі методи, **я** б сказала" (ShM's "I") | "**Я** б сказала" |
| 3 | 37 | "роздягається, **я** б сказала" (ShM's "I") | "**Я** б сказала" |
| 4 | 52 | "Я тепер **сама** стану бхутом" (ShM emphatic) | "Я тепер **Сама** стану бхутом" |
| 5 | 50 | "усілякі **анти-ґуру** трюки" | "усілякі **антиґуру** трюки" |
| 6 | 93–100 | "**оМ** Шрі …" (×6) | "**Ом** Шрі …" |
| 7 | 87 | "мив **стоп** Шрі Матаджі" | "мив **Стоп** Шрі Матаджі" |
| 8 | 90, 105, 110, 112, 114(×2), 115, 116(×2), 121, 123, 125 | "Мої **стопи**" (×12) | "Мої **Стопи**" |

## Summary

- Language (L): 8 issues found, 2 approved by Critic
- SY Domain (S): 7 issues found, 5 approved by Critic
- Total corrections applied: **24 token-level edits** across 8 distinct correction types
  (1× para 18, 1× para 27, 1× para 37, 1× para 52, 1× para 50, 6× "Ом", 13× "Стопи").
