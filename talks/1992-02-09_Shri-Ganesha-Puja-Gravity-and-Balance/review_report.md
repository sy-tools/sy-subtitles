# Language Review – 1992-02-09_Shri-Ganesha-Puja-Gravity-and-Balance, 2026-11-23

## Process

2+1 agent review (Reviewer L + Reviewer S + Critic) of `transcript_uk.txt`
against `transcript_en.txt`, `glossary/AGENTS.md`, `glossary/terms_lookup.yaml`,
`glossary/terms_context.yaml` and `glossary/chakra_map.yaml`, per
`templates/language_review_template.md`.

First pass — no prior review exists for this talk.

Paragraph numbers are `transcript_uk.txt` line numbers (header lines 1–4,
body starts at line 6).

Mechanical pre-checks: clean — no Latin/Cyrillic mixing, no Latin characters
at all, apostrophe `’` (U+2019) throughout, quotation marks `«»` only
(nested quotes none), en-dash ` – ` (U+2013) with spaces throughout and no
hyphen-as-dash or em-dash, no double spaces, no space before punctuation, no
missing space after punctuation, no `…` or double periods, no NBSP/zero-width
characters. Header line 4 matches the corpus standard
(«Мова промови: англійська | Транскрипт (українська)», 113 talks).

## Results

### L. Language (Orthography + Grammar + Punctuation)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 34 | Lexical error: «тиснення» is the verbal noun of «тиснути» in the sense of embossing/stamping (СУМ: «тиснення… відтиснений на чому-небудь малюнок»); the act of shaking hands is «рукостискання» | «То як почалося **таке тиснення рук**?» (EN: “So how this kind of shaking hands has started?”) | «То як почалося **таке рукостискання**?» |
| L2 | 31 | Government: predicative «достатньо» takes the genitive («цього/того достатньо»), not a nominative subject. The corpus uses the genitive elsewhere («цього достатньо, щоб», «погляду достатньо, щоб», «вияву достатньо, щоб») | «І **саме те**, що він стоїть там, уже достатньо, щоб налякати інших» | «І **саме того**, що він стоїть там, уже достатньо, щоб налякати інших» |
| L3 | 60 | Agreement: noun subject with adverb-form predicate | «Надмірна прив’язаність до родини – теж **неправильно**.» | «– **це** теж неправильно» |
| L4 | 35 | Euphony: «й» before a word starting with «в» | «в рівновазі **й в** унісон» | «в рівновазі **і в** унісон» |
| L5 | 32 | Euphony у/в: after a consonant-final word, before a consonant cluster | «та людина ось-ось **впаде**» | «ось-ось **упаде**» |
| L6 | 15 | Agreement with a quantitative word: plural «мають» vs singular «померло» two sentences earlier | «Так багато людських істот **мають** померти» | «Так багато людських істот **має** померти» |
| L7 | 19 | Possible ambiguity: «чомусь» can be read as the adverb “for some reason” instead of the dative of «щось» | «Любов не означає, що ви **чомусь** потураєте» | «що ви **чому-небудь** потураєте» |
| L8 | 42 | Lexical: «копнути» can be read colloquially as “to kick” | «**Копніть** будь-кого, і ви здивуєтеся» (EN: “You scratch anyone”) | (consider «Копніть глибше будь-кого») |

### S. SY Domain (Capitalization + Terminology + Consistency)

| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 36 | Capitalization/consistency: the glossary gives `Ganas → ґани` (lowercase). The same paragraph writes «ґани» twice in lowercase («де є ґани?», «Якщо ґани почнуть битися»), and so do ¶37 and ¶45 and the rest of the corpus (16× lowercase vs 1× capitalized, which is this line) | «**Усі Ґани** тут.» | «**Усі ґани** тут.» |
| S2 | 12 | Spelling of the name: «Маха Ґанеша» (separate) vs «Махаґанеша» (solid), which three other talks use | «де, як Я кажу, перебуває **Маха Ґанеша**» | «Махаґанеша»? |

Checked and found correct (no findings):
- **Shri Mataji's pronouns** are uppercase in every instance: Я, Мені, Мене, Мій/Моя/Моєму/Моїй, зі Мною. Her emphatic and reflexive forms «Я Сама» (¶46) and «у Свою гравітацію» (¶52) follow the corpus majority (23× «Я Сама», 4× «у Свою»).
- **¶63 «побачитися з Нею наодинці»**: the EN has lowercase “her” in a quoted yogi's words. Uppercase is correct, because the rule is ALWAYS uppercase for Shri Mataji.
- **Lowercase first person in other speakers' voices**: the Catholic lady (¶23 «я католичка, і я не можу»), the sari lady (¶47 «я люблю», ¶49 «Ви мене бачили?», ¶50 «Мати помічає мене») and the yogi in ¶63 («дати мені»).
- **Pronouns for Shri Ganesha, Christ and Shri Krishna** are uppercase: Він/Його (¶12, 18, 25, 27, 33, 44, 45).
- **The person “in his gravity”** (¶31–32) is a regular person, and his pronouns are correctly lowercase.
- **Terminology** matches the glossary:
  - Шрі Ґанеша, with the genitive Ґанеші (never «Ґанеша»; ¶22, 25, 31, 33, 35–38, 45, 58) per `terms_context.yaml`
  - Парамчайтанья / -ю / -ї / -єю, the corpus forms
  - Муладхара, Аґія, бхути, бандхан(и), сходження
  - Мати Земля, declined: Матері Землі, Матір’ю Землею
  - Ґанапатіпуле, сприятливість (auspiciousness)
  - Всепроникна Сила, the corpus majority
  - сахаджа йоґ(и) in lowercase, and Сахаджа Йоґа / Йозі / Йоґою
  - «Ґанеша Пуджа» in the header and ¶64, matching EN “Ganesha Puja”
- **Spiritual terms** are capitalized: Дух/Духа (¶27), Дхарма (¶27), Пуджа (¶64). The adjective «дхармічна» is correctly lowercase.
- **Language names** are lowercase: «англійська» (line 4, ¶39), «гінді» (¶28, the corpus spelling, 115×). The bracketed «[англійською]» is also correct.
- **The C.P. quote in ¶34** uses correct Ukrainian punctuation for author's words inside direct speech («…джунглів, – він намагався Мене втішити, – і там…»). «Сі Пі» matches the corpus.
- **Translator's square-bracket additions** come either from the EN transcript ([лише], [то], [що], [цим], [до], [у], [звичайним оком], [трансцендентальній медитації]) or are minimal bridges ([жінки] ¶27, [шалька] ¶28, [сталося так, що] ¶21, [таке може бути] ¶36). Per «Fidelity to the Spoken Original» these are not errors.

### Critic Filter

| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | **Keep** | This is a wrong word, not a style choice. Per СУМ, «тиснення» is the noun of «тиснути» in its embossing sense (and the embossed pattern), so «тиснення рук» does not name a handshake. «Рукостискання» is the standard noun, and the same paragraph already uses «тиснути руки» for the verb. It is the only occurrence in the corpus. The fix is minimal and keeps the spoken meaning (“this kind of shaking hands”). |
| L | L2 | **Keep** | This is a government rule, not a preference. Predicative «достатньо» governs the genitive («того, що…, достатньо»), and the corpus consistently uses the genitive in this exact construction. The change is one word and touches no content. |
| L | L3 | **Remove** | Not an error here. The dash stands for an elided «це» («прив’язаність – [це] теж неправильно»), which is a normal elliptical construction in speech-mirroring text. The EN is equally colloquial (“is also wrong”). |
| L | L4 | **Remove** | Euphony variants are recommendations, not spelling errors. This follows the corpus precedent of leaving і/й and у/в variants as they are. |
| L | L5 | **Remove** | Same reasoning as L4. «ось-ось впаде» is an accepted euphony variant. |
| L | L6 | **Remove** | Not an error. With quantitative words, a plural predicate is permitted when the subject is animate and the action of each member is in focus («багато людей мають…»). The difference from «померло» earlier is a legitimate choice, not a mistake. |
| L | L7 | **Remove** | «чомусь» is the correct dative of «щось», and the government of «потурати» makes the reading clear. Replacing it would be a style preference. |
| L | L8 | **Remove** | This is a translation choice, not a language error. «Копнути» is understood figuratively (“dig into, probe”), which matches “scratch [the surface of] anyone”. Rewording it would be stylistic. |
| S | S1 | **Keep** | The glossary entry `Ganas → ґани` is explicit. The transcript is inconsistent with itself: lowercase twice in the same paragraph and in ¶37 and ¶45, capitalized only here. The capital in the EN (“All Ganas are here”) is a transcriber's inconsistency inside one paragraph, not a deliberate distinction, and unlike «Ґуру» the glossary defines no capitalized variant for it. |
| S | S2 | **Remove** | False positive. `glossary/chakra_map.yaml` and `chakra_system.yaml` give «Шрі Маха Ґанеша» (separate), consistent with the lookup's «Маха Ґанапаті». The corpus is split, but the form used here is the glossary's. |

### Approved Corrections

| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 31 | І саме те, що він стоїть там, уже достатньо, щоб налякати інших | І саме того, що він стоїть там, уже достатньо, щоб налякати інших |
| 2 | 34 | То як почалося таке тиснення рук? | То як почалося таке рукостискання? |
| 3 | 36 | Усі Ґани тут. | Усі ґани тут. |

## Summary

- Language (L): 8 issues found, 2 approved by Critic
- SY Domain (S): 2 issues found, 1 approved by Critic
- Total corrections applied: 3
