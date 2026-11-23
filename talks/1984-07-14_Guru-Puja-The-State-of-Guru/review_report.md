# Language Review – 1984-07-14_Guru-Puja-The-State-of-Guru, 14 July 1984

**Talk:** Guru Puja: The State of Guru (Leysin, Switzerland)
**Reviewed file:** `transcript_uk.txt` (paragraph numbers = line numbers in the file)
**Reference:** `transcript_en.txt`

## Process

2+1 review per `templates/language_review_template.md`: Reviewer L (language) and Reviewer S (SY domain) went through the whole text separately. The Critic then filtered both tables against `glossary/AGENTS.md` (including "Fidelity to the Spoken Original"), `terms_lookup.yaml`, `terms_context.yaml` and the conventions of the existing corpus.

Automated pre-checks (all clean):
- No Latin letters mixed into Cyrillic text
- No `„"`, `""` or `“”` quotation marks; all 38 `«` are matched by 38 `»`
- No hyphens or em-dashes used as dashes; every dash is ` – ` (U+2013)
- No ASCII apostrophes; all apostrophes are `’` (U+2019)
- No space before punctuation, no double spaces, no `…` character or broken ellipsis

## Results

### L. Language (Orthography + Grammar + Punctuation)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| L1 | 48 | Wrong mood after the concessive particle «хоч би»: it requires the conditional (past-tense) form, not the present indicative | «І треба зрозуміти, [що] хоч би якими ми **є** сьогодні, ми надзвичайно благословенні…» | «хоч би якими ми **були** сьогодні» |
| L2 | 37 | Extra comma before a single conjunction «і» joining homogeneous members (calque of the English serial comma "greed, and anger") | «сповнений хтивості, жадібності**,** і гніву, ревнощів» | «сповнений хтивості, жадібності і гніву, ревнощів» |
| L3 | 10 | Possible case mismatch: the apposition after locative «в будь-якому Ґуру» is in the genitive | «материнство в будь-якому Ґуру – чи то чоловіка, чи то жінки» | «…– чи то чоловікові, чи то жінці» |
| L4 | 26 | «так звані» is not a parenthetical word in Ukrainian, so the commas around it are not required | «всі ці штучні, так звані, цінності» | «всі ці штучні, так звані цінності» |

### S. SY Domain (Capitalization + Terminology + Consistency)
| # | Paragraph | Error | Context | Fix |
|---|-----------|-------|---------|-----|
| S1 | 19 | Term form differs from glossary `Vivek → Вівек` (capitalised, no final -а) | «Він має «вівеку», тобто Він має розсудливість» | «Він має «Вівек»…» |
| S2 | 44 | Two spellings in one paragraph: «Парабрахма» vs glossary `Parabrahman → Парабрахман` | «Ґуру Сакшат Парабрахма». А Парабрахман – це сила Матері | Unify to «Парабрахман» |
| S3 | 15 | Capitalisation of «реалізацію» differs from «Реалізацію» elsewhere in the text | «Ви отримуєте свою реалізацію, бо Я є тим» | «Реалізацію» |
| S4 | 43 | «чесно» has no counterpart in the English ("if you face yourself") | «якщо ви чесно подивитеся на себе» | «якщо ви подивитеся собі в обличчя» |

Points checked and found correct (no entry needed):
- **Shri Mataji's pronouns:** upper case throughout (Я/Мені/Мене/Мій/Моє/Моїх; «Вас» in «я дуже любив Вас»). Feminine verb forms are correct (сказала, бачила, послала, спробувала, завершила, не шкодувала, повинна).
- **Pronouns for Incarnations and the Goddess:** Shri Ganesha (Він/Своїй/Який), Mohammed Sahib (Він/Своє), Christ (Свої/Свого Отця) and the Goddess (Вона/Її) are upper case. A generic guru stays lower case («що він Ґуру», «він панує»).
- **Glossary terms match:** Пуджа Ґуру, Аді Ґуру, Сат Ґуру, Кундаліні, ліва Вішуддхі, Мати Земля (Матір Землю / Матері Землі), Махамайя, Брахмадева, Вірата, Садашіва, Шакті, Деві, Самореалізація, авадхути, стан усвідомлення без думок, стан без думок, віддача на милість, Інкарнації, Дхарма / дхармічними.
- **Declension of Sahaja Yoga terms:** «в Сахаджа Йозі» (locative), «Сахаджа Йозі» (dative, para 28), «Сахаджа Йоґи» (genitive), «сахаджа йоґами / йоґів / йоґи».
- **Ґуру / ґуру:** follows the English capitalisation (Guru/guru) consistently.
- **Closing blessing:** «Нехай Бог благословить вас.» is correct because the English has no "all".
- **«(сміх)»:** listed in `glossary/subtitle_omit.yaml`, so it is handled by design.
- **Lines 46/47:** the sentence is split mid-way exactly as in the English transcript. The split is kept so the two files stay aligned paragraph for paragraph.

### Critic Filter
| Source | # | Verdict | Reason |
|--------|---|---------|--------|
| L | 1 | **Keep** | A genuine grammar error. The concessive «хоч би який» requires the conditional (past-tense) form of the verb; «хоч би якими ми є» is ungrammatical. The existing corpus uses the correct form throughout («хоч би якими вони були», «хоч би яким було ваше»). The meaning is unchanged. |
| L | 2 | **Keep** | A genuine punctuation error. Ukrainian puts no comma before a single «і» joining homogeneous members; the comma was copied from the English serial comma. The list and its wording stay exactly as spoken; only the punctuation is fixed. |
| L | 3 | Remove | Not a clear error. «Ґуру» is indeclinable, so «чи то чоловіка, чи то жінки» reads naturally as a genitive of possession («материнство … чоловіка чи жінки»). The phrase is grammatical as written. |
| L | 4 | Remove | Style, not an error. The commas mark a spoken aside, as in the English "artificial, so-called, values". Ukrainian allows an attribute to be set off as a clarifying insertion. |
| S | 1 | Remove | False positive. The English quotes the Sanskrit word in lower case ('viveka') and glosses it at once («тобто … розсудливість»). The declined «вівеку» renders what was spoken, and the corpus uses the same forms («вівеку», «вівека»). |
| S | 2 | Remove | False positive. «Ґуру Сакшат Парабрахма» is a quoted mantra and keeps its Sanskrit form. The prose that follows uses the glossary form «Парабрахман / Парабрахмана», which matches the corpus. |
| S | 3 | Remove | False positive. The glossary allows both «Реалізація» and «реалізація», and the translation follows the English capitalisation ("realisation" is lower case in both places). |
| S | 4 | Remove | A legitimate translation choice. The phrase renders the idiom "face yourself" (to confront oneself honestly) and adds no new claim. It is not a silent repair. |

### Approved Corrections
| # | Paragraph | Error | Fix |
|---|-----------|-------|-----|
| 1 | 48 | хоч би якими ми є сьогодні | хоч би якими ми були сьогодні |
| 2 | 37 | хтивості, жадібності, і гніву, ревнощів | хтивості, жадібності і гніву, ревнощів |

## Summary

- Language (L): 4 issues found, 2 approved by Critic
- SY Domain (S): 4 issues found, 0 approved by Critic
- Total corrections applied: 2

The translation is of high quality. Terminology matches the glossary, deity pronouns are capitalised correctly and consistently, and typography (quotes, dashes, apostrophes, ellipses) is clean. Fidelity to the spoken original is handled well: broken-off sentences (paras 23, 36, 42) are kept as spoken, and translator's additions are marked with square brackets («вони [люди]», «вони [люди Заходу]», «[що]», «[чую]», «[це]»).
