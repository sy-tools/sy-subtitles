# Language Review – 1982-08-22 Shri Ganesha Puja: Innocence & Joy

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/CLAUDE.md`, and `glossary/terms_lookup.yaml` /
`terms_context.yaml`. Borderline conventions were calibrated against the existing
62-talk corpus before deciding (see Critic notes).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 14 | Wrong passive participle form | «вас може бути **благословенно** матеріально» – «благословенно» is the adverb of «благословенний»; the impersonal passive (parallel to «винагороджено» in the same sentence) is «благословлено» | благословлено |
| L2 | 94 | Malformed/doubled ellipsis | «правильної речі**…….**» = `…` + `…` + `.` (7 dots) | речі… |
| L3 | (whole text) | Single-char `…` vs glossary `...` | `…` (U+2026) used for ellipsis throughout instead of three dots | *(considered)* |
| L4 | 10, 50 | Missing terminal period | «…перекладати італійською» / «Гадаю, що так» | *(considered)* |
| L5 | 78 | Semicolon in timestamp | «(2:08**;**14)» (should be `:`) | *(considered)* |

Orthography otherwise clean: all quotation marks are `«»` (no `" " „`),
all dashes are en-dash ` – ` (U+2013, 96×; zero em-dashes), apostrophes all `’`
(U+2019), no double spaces, no space-before-punctuation, no mixed Latin/Cyrillic.
Lowercase `я` on line 38 is a generic hypothetical speaker (`«я можу»`) — correctly lowercase.

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 58 | Deity pronoun lowercase | «як-от Равана, – цілу Ланку **він** спалив» — «he» = Hanumana (Incarnation), must be uppercase | Він |
| S2 | 84 | «Стопи» lowercase | «омити Мої **стопи** чи руки?» — Lotus Feet of Shri Mataji; uppercase per glossary | Мої Стопи |
| S3 | 84 | «Стопи» lowercase | «(Йоґи: Ваші **стопи**.)» — same | Ваші Стопи |
| S4 | 11,13,15,16,22,23,27,28,29,73,78,93 | «Пуджа» generic lowercase | «на пуджу», «роблячи пуджу», «суть пуджі», «система пуджі», «після пуджі», «робиш пуджу» etc. — ceremony name, uppercase per glossary | Пуджу / Пуджі / Пуджа (17 instances) |
| S5 | 84 | Term capitalization inconsistency | «Так, **Панчамрута**.» — lowercase elsewhere (¶15, ¶30); not a glossary-capitalized term; mid-utterance | панчамрута |
| S6 | 30 | «Руки» over-capitalized | «а лише Своїми **Руками**» — only Стопи is glossary-mandated uppercase; hands are lowercase in ¶84, ¶85, ¶94 (and corpus-wide) | Своїми руками |
| S7 | 88 | «Кумкум» mid-sentence | «Цей Кумкум дуже червоний» | *(considered)* |
| S8 | 62, 66 | «Дурва»/«дурва» mixed | grass name capitalized inconsistently | *(considered)* |
| S9 | 33 | «Серце» capitalized | «праве Серце», «правому Серцю» | *(considered)* |
| S10 | 59 | «Той, Хто» capital Х | «Стхіта – Той, Хто має бути осілим» | *(considered)* |

Deity-pronoun capitalization was otherwise correct throughout: Shri Mataji
(Я/Мене/Мої/Моя/Своїми/Вона) consistently uppercase; Ganesha, Hanumana, God,
Gauri (Він/Його/Йому/Вона/Її/Свої) uppercase; regular people (він/йому/її — the
yogis, the child, the bereaved widow, the maid, Vincent, Matthew) lowercase;
language names (англійська, французька, італійська, латина, санскрит) lowercase.
Glossary terms verified: Ґанеша/Ґанеші/Ґанешу declension, Свадхістхана, Кундаліні,
Сахасрара, Аґія, бхути, Хануман(а), Шакті, Дух, гхі, стотра, Маха Ґанеша,
«Нехай Бог благословить усіх вас» (fixed phrase) — all correct.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine grammar error; «благословлено» is the correct impersonal passive, paralleling «винагороджено». |
| L | L2 | **Keep** | Genuine punctuation typo (doubled ellipsis = 7 dots). Collapsed to a single ellipsis matching the talk's prevailing `…`. |
| L | L3 | Remove | `…` (U+2026) appears 250× across the 62-talk corpus, including reviewed talks, alongside `...` (425×). Both are tolerated house practice — not a genuine error. Mass-normalizing one talk would impose a non-enforced preference. |
| L | L4 | Remove | Conversational fragments mirroring the EN source; trailing-period omission in stage-direction-style dialogue is not a substantive error. |
| L | L5 | Remove | Source transcription artifact inside a `(h:mm:ss)` time marker (identical in EN), not running prose. |
| S | S1 | **Keep** | Clear deity-pronoun rule: Hanumana (singular Incarnation) → uppercase «Він». |
| S | S2 | **Keep** | «Стопи» glossary-mandated uppercase; every other instance in the talk uses «Стопи». |
| S | S3 | **Keep** | Same as S2. |
| S | S4 | **Keep** | Explicitly within the Reviewer-S mandate (Пуджа listed); glossary rule «Пуджа – uppercase»; corpus norm 237 uppercase vs ~52 lowercase; resolves internal inconsistency (¶8/13/16/33/62 already uppercase). Compound `ґхата-пуджа` (¶17) left lowercase as a lexicalized transliteration. |
| S | S5 | **Keep** | Internal consistency; term not glossary-capitalized; lowercase in 2 of its 3 uses. |
| S | S6 | **Keep** | Glossary mandates uppercase only for «Стопи», not «Руки»; hands are lowercase in all other uses in the talk and across the corpus (sole uppercase-hands instance corpus-wide). |
| S | S7 | Remove | Corpus split 7 «Кумкум» / 6 «кумкум» — tolerated either way; not in glossary. |
| S | S8 | Remove | Mirrors EN («durva»/«Durva»); borderline proper noun (sacred grass name); capitalized when named, lowercase when descriptive — defensible. |
| S | S9 | Remove | «Серце» denotes the Heart centre/chakra-region (subtle-system term), reasonably capitalized like other centres; consistent within the paragraph. |
| S | S10 | Remove | «Той, Хто» is a reverential capitalization for the Deity; not against any explicit rule. Left as-is. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 14 | благословенно (wrong participle) | благословлено |
| 2 | 94 | …….  (doubled ellipsis) | … |
| 3 | 58 | цілу Ланку він спалив | цілу Ланку **Він** спалив |
| 4 | 84 | омити Мої стопи | омити Мої **Стопи** |
| 5 | 84 | (Йоґи: Ваші стопи.) | (Йоґи: Ваші **Стопи**.) |
| 6 | 30 | Своїми Руками | Своїми **руками** |
| 7 | 84 | Так, Панчамрута. | Так, **панчамрута**. |
| 8 | 11 | прийти на пуджу | прийти на **Пуджу** |
| 9 | 11 | почнете пуджу | почнете **Пуджу** |
| 10 | 13 | роблячи пуджу | роблячи **Пуджу** |
| 11 | 15 | суть пуджі | суть **Пуджі** |
| 12 | 16 | для пуджі | для **Пуджі** |
| 13 | 22 | підтримувати пуджу | підтримувати **Пуджу** |
| 14 | 23 | порушувати пуджу | порушувати **Пуджу** |
| 15 | 23 | ось така пуджа | ось така **Пуджа** |
| 16 | 27 | Після пуджі | Після **Пуджі** |
| 17 | 27 | цінність пуджі | цінність **Пуджі** |
| 18 | 28 | система пуджі | система **Пуджі** |
| 19 | 29 | приходити на пуджу | приходити на **Пуджу** |
| 20 | 29 | на одній пуджі | на одній **Пуджі** |
| 21 | 29 | «На пуджі тепер | «На **Пуджі** тепер |
| 22 | 73 | після пуджі | після **Пуджі** |
| 23 | 78 | робиш пуджу | робиш **Пуджу** |
| 24 | 93 | прийшов на пуджу | прийшов на **Пуджу** |

## Summary

- Language (L): 5 issues raised, **2 approved** by Critic (L1 grammar, L2 punctuation).
- SY Domain (S): 10 issues raised, **6 approved** by Critic (S1 deity pronoun, S2–S3 Стопи,
  S4 Пуджа capitalization, S5 панчамрута, S6 руки).
- Total corrections applied: **24** edits across 18 paragraphs
  (17 of which are the single Пуджа-capitalization finding, S4).
- No structural changes: paragraph count unchanged (95); orthography (quotes, dashes,
  apostrophes, spacing) was already clean and required no changes.
