# Language Review – 1983-10-14_After-Self-Realization-You-Must-Master-It, 2026-06-13

## Process

2+1 agent review of `transcript_uk.txt` (full paragraphed Ukrainian text) against
`transcript_en.txt`, using `glossary/CLAUDE.md`, `glossary/terms_lookup.yaml`, and
`glossary/terms_context.yaml`. Reviewer L (Language) and Reviewer S (SY Domain) ran in
parallel; the Critic filtered both tables; approved corrections were applied.

The translation is of consistently high quality. Orthography (apostrophe `’`,
guillemets `«»`, spaced en-dash ` – `), deity-pronoun capitalization, the ґ/г
distinction, and Sahaja Yoga terminology are clean and uniform throughout. Verified
mechanically: no Latin/Cyrillic mixing, no ASCII or German quotes, no em-dashes
(U+2014), no double spaces, no space-before-punctuation, no ASCII apostrophes,
prefixes (`напівзруйнований`) correct. All 20 adverbial-participle (дієприслівник)
phrases bar one are properly comma-delimited.

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 35 | Verb conjugation: `губляють` is a non-standard form of `губити` (to lose). 3rd-person plural present of a II-conjugation verb is `гублять`. Occurs twice. | «...вони виявляють, що **губляють** свої паспорти, **губляють** те й се...» | «...що **гублять** свої паспорти, **гублять** те й се...» |
| L2 | 13 | Missing comma before a дієприслівниковий зворот. `дивлячись угору` carries a dependent word (`угору`), so it is a phrase, not a lone adverbialized дієприслівник, and must be set off by a comma. | «...можуть піднятися **лише дивлячись угору**.» | «...можуть піднятися**, лише дивлячись угору**.» |
| L3 | 12 | Spelling? `«сімпатія»` / `«сімп»` / `«патія»` — standard Ukrainian is `симпатія`. | «Я називаю це «сімпатія»: «сімп» означає ділити, а «патія» означає патос.» | (consider) `симпатія`? |
| L4 | 24 | Calque concern: `виглядаєш` in the sense "to appear/look" is sometimes discouraged as a russism. | «Ти **виглядаєш** таким худим.» | `маєш вигляд` / `ти такий худий`? |
| L5 | 32 | Euphony (милозвучність): after `щось` (consonant) before the `вс-` cluster, `у` is preferred. | «робити щось **всупереч** тому» | `усупереч`? |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 63 | Capitalization: glossary lists `ego → его` (lowercase); here `Его` is capitalized. | «це був мій пан **Его**, о, як поживаєте?» | `его`? |
| S2 | 34 / 22 | Possible over-capitalization of relative/demonstrative pronouns in `Тим, Хто` and `Та, Хто`. | «є **Тим, Хто** піклується»; «Вона – **Та, Хто** виправить тебе» | lowercase `хто`? |

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | Genuine grammar error. `губити` → `вони гублять`, never `губляють`. Both occurrences must be fixed. High confidence. |
| L | L2 | **Keep** | A дієприслівниковий зворот with a dependent word is set off by a comma per standard rules; the adverbialized-дієприслівник exception covers only lone forms (мовчки, не поспішаючи), not `дивлячись угору`. Adding the comma is by-the-book correct. |
| L | L3 | **Remove** | False positive. Not a spelling slip — a deliberate transliteration of the English pun ("'symp' means to share and 'pathy' means pathos"). The breakdown into «сімп» + «патія» only works if the whole word is transliterated as «сімпатія». Standard `симпатія` would break the explanation. Translator's choice is correct. |
| L | L4 | **Remove** | Trivial style preference. `виглядати` ("to appear") is widely accepted in modern standard Ukrainian; not an error. |
| L | L5 | **Remove** | Soft euphony preference, not a hard error; в/у alternation after a consonant-final word is optional here. Leaving the original avoids over-correction. |
| S | S1 | **Remove** | False positive. The source personifies the ego as a character — "that was Mr. Ego of mine". `пан Его` mirrors that personification, where `Его` functions as a proper name, so the capital is intentional and correct (not the generic term `его`, which is lowercase elsewhere — see paras 12, 26, 28, 52). |
| S | S2 | **Remove** | False positive. Consistent reverential capitalization of pronouns referring to God / Shri Mataji is applied uniformly across the text (Він, Який, Яка, Та, Хто, Тим). It matches the project's deity-pronoun convention and is internally consistent. No change. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 35 | `губляють` (×2) — wrong verb form | `гублять` (×2) |
| 2 | 13 | Missing comma before дієприслівниковий зворот | `піднятися, лише дивлячись угору` |

## Summary

- Language (L): 5 issues found, 2 approved by Critic
- SY Domain (S): 2 issues found, 0 approved by Critic
- Total corrections applied: 2
</content>
</invoke>
