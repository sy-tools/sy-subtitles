# Language Review – 1992-05-10_Sahasrara-Puja-The-Will-of-God, 2026-06-13

## Process

2+1 agent language review of `transcript_uk.txt` (64-paragraph Ukrainian text) against the
English original, `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and `glossary/terms_context.yaml`.
Reviewers L and S ran in parallel; the Critic filtered both tables; approved corrections were
applied to `transcript_uk.txt`.

The translation was already of high quality. Byte-level checks confirmed: quotation marks
exclusively `«»` (40 open / 40 close, balanced), apostrophes exclusively `’` (U+2019, 33×),
no Latin characters mixed into Cyrillic (ДНК is Cyrillic), no double spaces, no spaces before
punctuation, no doubled punctuation. The findings below are the only genuine issues.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | all (84×) | Wrong dash glyph: em-dash `—` (U+2014) used for interjections; project rule and corpus mandate en-dash `–` (U+2013) with spaces | `…все це — дурниця…`, `…обіцяне — усе те…` etc. | Replace ` — ` with ` – ` (U+2013) throughout |
| L2 | 34 | Extra sentence-final period after a quotation that ends in `!` (Ukr. rule: no period added after `«…!»`) | `…Не роби того!».` | `…Не роби того!»` |
| L3 | 41 | Same: extra period after `«…!»` | `…«Христос так сказав!».` | `…«Христос так сказав!»` |
| L4 | 63 | Word order / register: `досягли багато` reads slightly unidiomatically | `…за такий короткий час ми досягли багато…` | (proposed) `…багато досягли…` |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 38 | `інкарнаціям` lowercase. Glossary lists `Інкарнація` as an uppercase spiritual term; corpus is 66 uppercase vs 2 lowercase forms | `…усім релігіям слід поклонятися, усім інкарнаціям, усім пророкам…` | `…усім Інкарнаціям…` |
| S2 | 21 | `Колективна Свідомість` capitalized. Not in the glossary's capitalized-terms list; corpus overwhelmingly lowercase (`колективна свідомість` 9× vs this file's lone uppercase) | `…і як Колективна Свідомість ви також маєте знати…` | `…як колективна свідомість…` |
| S3 | 7 | `Сам Бог` — capital `Сам` for "God Itself" | `…Сам Бог був міфом…` | (proposed) `сам Бог` |
| S4 | 46 | `воля Аді Шакті` lowercase while `Воля Бога` is uppercase two clauses later — possible inconsistency | `Це воля Аді Шакті. … Це Воля Бога.` | (proposed) `Воля Аді Шакті` |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | `glossary/CLAUDE.md` mandates en-dash `–` (U+2013) with spaces; corpus confirms (7 480 en-dashes in 83 files vs em-dashes in only 8). This file's 84 em-dashes are the outlier. Genuine, systematic. |
| L | L2 | **Keep** | Ukrainian orthography: when a quotation closing with `!`/`?`/`…` ends the host sentence, no extra period follows `»`. Also matches the doc's own practice elsewhere (e.g. §35 `…те!» Я поважаю…`, §51 `…дбай сам!» —…`). |
| L | L3 | **Keep** | Same rule and same internal-consistency argument as L2. |
| L | L4 | **Remove** | `досягли багато` is colloquially acceptable and faithfully renders "we have achieved a lot"; a word-order tweak is a style preference, not an error. |
| S | S1 | **Keep** | `Інкарнація` is a designated uppercase spiritual term (glossary) and the corpus is near-unanimous (66:2). The plural-lowercase rule governs *pronouns* (вони/їм/їх), not the noun. |
| S | S2 | **Keep** | Term is absent from the glossary's capitalized list and the corpus norm is lowercase (9:1). Removing the capitals restores consistency with the rest of the corpus. |
| S | S3 | **Remove** | Reverential capitalization of the intensifier `Сам` before `Бог` is a defensible optional choice, not a clear error; changing it is not warranted. |
| S | S4 | **Remove** | The Ukrainian faithfully mirrors the English source, which itself writes "will of Adi Shakti" (lowercase) but "Will of God" (uppercase). Preserving the source's deliberate distinction is correct. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | all (84×) | em-dash `—` (U+2014) | en-dash ` – ` (U+2013, spaced) |
| 2 | 21 | `як Колективна Свідомість` | `як колективна свідомість` |
| 3 | 34 | `…Не роби того!».` | `…Не роби того!»` |
| 4 | 38 | `усім інкарнаціям` | `усім Інкарнаціям` |
| 5 | 41 | `…«Христос так сказав!».` | `…«Христос так сказав!»` |

## Summary

- Language (L): 4 issues found, 3 approved by Critic (L1 = 84 replacements under one rule)
- SY Domain (S): 4 issues found, 2 approved by Critic
- Total corrections applied: 5 (one systematic dash fix across 84 occurrences + 4 targeted edits)
