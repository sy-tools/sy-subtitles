# Language Review – 1993-10-10_Shri-Virata-and-Viratangana-Puja-I-have-to-have-16000-children, 2026-08-28

## Process

Review of `transcript_uk.txt` (full paragraphed Ukrainian text) using 2 parallel reviewers + 1 critic filter, per `templates/language_review_template.md`. Paragraph numbers refer to line numbers of `transcript_uk.txt`.

Checked against: `transcript_en.txt` (source), `glossary/CLAUDE.md` (transliteration, deity-pronoun and capitalization rules), `glossary/terms_lookup.yaml`, `glossary/terms_context.yaml`.

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 14 | Person disagreement: 2nd person singular + 2nd person plural in one sentence | «У якому напрямку не подивишся – знайдете такий занепад.» | «У якому напрямку не подивитеся – знайдете такий занепад.» |
| L2 | 12 | Unusual government «виходите над це» (EN "when you go above this") | «Тож коли ви виходите над це, ви починаєте думати про єдиний світ» | «Тож коли ви підіймаєтеся над цим…» |
| L3 | 14 | Possible case break in the series governed by «таких» | «…таких, що можуть бути немов тварини, або, можливо, якогось абсолютно ідіотського типу, або, можливо, просто дурні.» | «…або, можливо, просто дурних.» |
| L4 | 22 | Questionable comma before «і Хамса» | «Покращується не лише Вірата, а й Вішуддхі, і Хамса.» | «…а й Вішуддхі і Хамса.» |
| L5 | 17 | Euphony (у/в alternation) | «занепаду, в який впала кожна ментальна проєкція» | «занепаду, у який упала…» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 9 | Term inconsistency: «Екадеші» vs «Екадаша Рудри» in the very next sentence; glossary canon is «Екадаша Рудра» (Ekadasha Rudra) | «І він є частиною Екадеші. Вішуддхі – це центр Екадаша Рудри.» | «І він є частиною Екадаші.» |
| S2 | 27 | Capitalization inconsistency of the same quoted term: «Ананья Бхакті», ««Ананья» означає…», but then lowercase «ананья»; EN capitalizes all three occurrences | «На слові «ананья» Він вибудував усе» | «На слові «Ананья» Він вибудував усе» |
| S3 | 7, 9, 20 | Declension variance Вірат/Вірата: «Пуджу Вірата», «поклонятися Вірату», «частиною Вірата» (from «Вірат») vs «Пуджа Шрі Вірати», «у силу Вірати» (from «Вірата») | e.g. «Ви стаєте невід’ємною частиною Вірата.» | unify all forms to «Вірата» (gen. «Вірати», dat. «Віраті») |
| S4 | 26, 27 | «Ґ’яна» not in glossary; nearest entries are «Gnyaha / Jnana → Ґньяга / Джняна» and «Gyaneshwara → Г’янешвара» (with Г) | «ви повинні отримати свою «Ґ’яну»» | (candidate) «Г’яна» |
| S5 | 19 | Lowercase «я» where Shri Mataji says "So I said…" — possible violation of the Shri Mataji pronoun rule | «Тож я сказала: «Це мій Сухаґ…»» | (candidate) «Тож Я сказала…» |

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | L1 | Keep | Genuine agreement error: the subordinate clause is 2nd sg («подивишся»), the main clause 2nd pl («знайдете») in one short sentence; the whole talk addresses the audience as «ви». Minimal fix «подивитеся». |
| L | L2 | Remove | «Вийти/виходити над + знах.» is an attested directional construction (пор. «сонце вийшло над обрій»); mirrors the spoken source "when you go above this". Replacement is a style preference, not an error fix. |
| L | L3 | Remove | Nominative «дурні» is grammatical under the elliptical parse «(можуть бути)… просто дурні», parallel to «можуть бути немов тварини»; spoken-register syntax of the original preserved. |
| L | L4 | Remove | The comma renders the afterthought intonation of EN "but Vishuddhi improves and Hamsa"; acceptable in transcribed speech, not a clear punctuation error. |
| L | L5 | Remove | у/в alternation is a euphony recommendation, not an orthographic error; «в який» after vowel-final «занепаду,» is permissible. |
| S | S1 | Keep | Real inconsistency two sentences apart; glossary canon «Екадаша Рудра» fixes the stem as «Екадаша», gen. «Екадаші». EN spelling "Ekadesha" is itself non-canonical and not a reason to keep «Екадеші». |
| S | S2 | Keep | Same quoted term capitalized two ways within one paragraph; EN capitalizes "Ananya" in all three places. Consistency fix to «Ананья». |
| S | S3 | Remove | Not an error: the translation consistently mirrors the source's own alternation — «Вірат» where EN says "Virat" (§7 "puja of Virat", §20 "part and parcel of Virat") and «Вірата» where EN says "Virata" (title, §12 "Virata's power"). Both forms are sanctioned by the glossary entry "Virata"; unifying would depart from the source. |
| S | S4 | Remove | No glossary entry for standalone "Gyana/Ghyana"; «Ґ’яна» follows the transliteration convention Sanskrit g → ґ (Ґанеша, Ґуру) and is used consistently in all four occurrences (§26–27). |
| S | S5 | Remove | False positive: in the joke (§19) the "I" is the Indian lady whose interview Shri Mataji retells («Тож я сказала: «Це мій Сухаґ… символ мого чоловіка»»), not Shri Mataji herself; lowercase «я» is correct. Genuine Shri Mataji pronouns in the paragraph («Я розповідала жарт») are correctly uppercase. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 9 | «І він є частиною Екадеші.» — inconsistent with «Екадаша Рудри» and glossary «Екадаша Рудра» | «І він є частиною Екадаші.» |
| 2 | 14 | «У якому напрямку не подивишся – знайдете такий занепад.» — person disagreement | «У якому напрямку не подивитеся – знайдете такий занепад.» |
| 3 | 27 | «На слові «ананья» Він вибудував усе» — lowercase, inconsistent with «Ананья Бхакті» / ««Ананья» означає» | «На слові «Ананья» Він вибудував усе» |

All three corrections have been applied to `transcript_uk.txt`.

## Summary

- Language (L): 5 issues found, 1 approved by Critic
- SY Domain (S): 5 issues found, 2 approved by Critic
- Total corrections applied: 3

Overall the translation is of high quality: deity-pronoun capitalization (Я/Мені/Він/Вона/Її/Собі for Shri Mataji, Shri Krishna, Virat and Viratangana) is applied correctly throughout, including the tricky lowercase cases (the brain «він», the quoted Indian lady «я», plural «вони» for the Incarnations in §24); glossary terms (Вішуддхі, Хамса чакра, Кундаліні, Нірананда, бхакті, бхути, карма/акарма, сахаджа йоґи, Пуджа, Стопи) match `terms_lookup.yaml`; quotation marks are «» at all levels including nested; dashes and ellipses follow the project rules.
