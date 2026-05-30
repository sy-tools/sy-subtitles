# Language Review – 1982-08-01 Adi Shakti Puja (Mother, make me such that I suck more of the Divine), Cheltenham

## Process

2+1 agent review of `transcript_uk.txt` (434 paragraphs): Reviewer L (Language) and
Reviewer S (SY Domain) ran in parallel; the Critic filtered both tables and approved
the final corrections, which were applied to `transcript_uk.txt`.

The transcript is largely a puja recording: long stretches are Sanskrit/Hindi mantra
transliterations and a recited Devi Mahatmyam passage. Mantras were left untouched
except for one clear internal transliteration inconsistency (ґ/г).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 338, 347, 378 | Unbalanced quotation marks – three recited Devi-Mahatmyam segments opened with `«` are never closed (EN source closes all three) | §338 `…Ти – свадха…`; §347 `…вмістилище найчистіших…`; §378 `…Твоя ніжна рука. Амінь.` | Add closing `»` to each |
| L2 | 238 | Possible redundant `.` after `!»` | `…Ти маєш бути задоволений!».` | Keep `.` (separates the quoted exclamation from the following stage direction; mirrors EN `!". (Laughter)`) |
| L3 | 310 | Missing comma before subordinate `коли` | `Це насправді коли Ти у статуї` / `можна робити лише коли Ти у статуї` | Considered; left as-is |
| L4 | 73, 81, 83 | Number+verb agreement: `двадцять одне ім’я … промовляються`, `двадцять один аспект промовляються`, `двадцять один канал пробудилися` (plural verb) | numerals ending in «один» | Left as-is – plural licensed by demonstrative «ці/усі ці» |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 18 | Shri Mataji's pronoun «я» lowercase | `…а також, я б сказала, до семінарів` (EN: "I would say") | `Я б сказала` |
| S2 | 19 | Shri Mataji's pronoun «я» lowercase | `І я помічаю, що ці люди…` (EN: "what I find") | `І Я помічаю` |
| S3 | 89 | Shri Mataji's pronoun «я» lowercase | `…чи казала я це раніше, чи ні` (EN: "if I've said this before") | `чи казала Я це раніше` |
| S4 | 92 | Shri Mataji's pronoun «я» lowercase | `…ці двадцять одне ім’я, я думаю, вам слід промовити` (EN: "I think") | `Я думаю` |
| S5 | 117 | Shri Mataji's pronoun «я» lowercase | `Той – я не знаю, чи роблять тут васту` (EN: "I don't know") | `Той – Я не знаю` |
| S6 | 234 | Shri Mataji's pronoun «я» lowercase | `…в англійській, я думаю, Бога називають «Thou»` (EN: "I think") | `Я думаю` |
| S7 | 131 | ґ/г transliteration inconsistency in a Ganesha mantra: `ніргаме` (г) next to `санґраме` (ґ); both render Sanskrit *g* | `…правеше ніргаме тата санґраме…` | `нірґаме` (Sanskrit *g* → ґ, per glossary) |
| S8 | 291 | Suspected `сахаджа йоги` (г) | `…навіть сахаджа йоги…` | FALSE POSITIVE – text already reads `йоґи` (ґ); 20/20 occurrences use ґ |
| S9 | 156, 243 | Suspected lowercase `я`/`моє` for the speaker | `усе, що я маю, моє знання… ми поклоняємося Тобі, о Мати`; `Усі ці ріки я приношу до Твоїх Стіп` | FALSE POSITIVE – these are the *worshipper's* prayer voice (addressed to «Тобі/Тебе» = the Mother), not Shri Mataji's self-reference; lowercase correct |
| S10 | passim | `Пуджа`/`пуджа` capitalization mixed | named/specific ceremony (`Пуджа Ґанеші`, `Пуджа Аді Шакті`, «the Puja») uppercase vs generic concept (`робили пуджу`, `цінність пуджі`, `головна пуджа`) lowercase | Keep – internally consistent system; mass-capitalizing generic usage exceeds scope |
| S11 | 73, 75, 76 | `Сушумна наді` – glossary lists `Сушумна Наді` (cap) | `у Сушумна наді` (also «Іда, Пінґала й Сушумна наді») | Keep – `наді` used as a generic noun across all three nadis; internally consistent |
| S12 | 297 | `Пранаямі` (cap) vs `пранаями` lowercase at §95, §99 | `до п’яти форм Пранаямі` | Keep – defensible as a named ritual segment; not a glossary deity/term |
| S13 | 17 vs 18 | `Сахаджа Йозі` vs `Сахадж Йозі` | locative of Sahaja/Sahaj Yoga | Keep – forms interchangeable per glossary; mirrors EN ("Sahaja Yoga" / "Sahaj Yoga") |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine error: three recitation segments (§332→§338, §345→§347, §370→§378) open with `«` but never close; the EN source closes all three. Adding `»` to each balances the marks (now 38/38). |
| L | L2 | Remove | Not an error: `.` separates the quoted exclamation from the trailing parenthetical, mirroring the EN source. |
| L | L3 | Remove | Borderline in disfluent spoken transcript; not systematically present, so a single fix would be inconsistent. |
| L | L4 | Remove | Plural agreement is licensed by the demonstrative «ці»/«усі ці»; acceptable usage, not a clear error. |
| S | S1–S6 | **Keep** | Hard rule (glossary/CLAUDE.md): Shri Mataji's first-person pronoun is ALWAYS uppercase. All six are her own self-reference. |
| S | S7 | **Keep** | Clear transliteration inconsistency within one mantra line; ґ matches the glossary rule and the adjacent `санґраме`. |
| S | S8 | Remove | False positive (visual ґ/г confusion); text is already correct. |
| S | S9 | Remove | False positive; first person here is the devotee in the prayer, addressed to the Mother — correctly lowercase. |
| S | S10–S13 | Remove | Style/consistency choices that are already internally coherent and/or faithful to the source; changing them exceeds "genuine errors only". |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 18 | `я б сказала` (Shri Mataji) | `Я б сказала` |
| 2 | 19 | `І я помічаю` (Shri Mataji) | `І Я помічаю` |
| 3 | 89 | `чи казала я це раніше` (Shri Mataji) | `чи казала Я це раніше` |
| 4 | 92 | `я думаю` (Shri Mataji) | `Я думаю` |
| 5 | 117 | `Той – я не знаю` (Shri Mataji) | `Той – Я не знаю` |
| 6 | 234 | `я думаю` (Shri Mataji) | `Я думаю` |
| 7 | 131 | `ніргаме` (ґ/г) | `нірґаме` |
| 8 | 338 | missing closing `»` | `…Ти – свадха…»` |
| 9 | 347 | missing closing `»` | `…найчистіших…»` |
| 10 | 378 | missing closing `»` | `…Амінь.»` |

## Summary

- Language (L): 4 issues raised, 1 approved by Critic (covering 3 missing closing quotes).
- SY Domain (S): 13 issues raised (incl. 2 false positives flagged for documentation), 7 approved by Critic.
- **Total corrections applied: 10** (6 deity-pronoun capitalizations, 1 mantra ґ/г transliteration, 3 quotation-mark closings).

### Notes
- The translation is of high quality. Deity-pronoun capitalization for Shri Mataji
  (Я/Мені/Мій/Свої/Вона/Її), the Goddess (Ти/Тебе/Твоїх) throughout the Devi Mahatmyam,
  and «Стопи» (Lotus Feet) is consistent and correct; the six fixes were the only lapses.
- Transliteration (ґ for Sanskrit *g*, дх for *dh*, і for short *i*), language names
  (lowercase `англійська`), and glossary terms (Кундаліні, Сушумна, Аґія чакра, Войд,
  Бхаїрава, бандхан, Аарті, бінді, бхути, ракшаси, Дурґа, Чандіка, Пракріті, etc.) all
  conform to `glossary/`.
- Quotation marks now balance at 38 `«` / 38 `»`; all quoting uses Ukrainian «».
