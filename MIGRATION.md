# Migration Runbook — `SlavaSubotskiy/sy-subtitles` → `sy-tools/sy-subtitles`

Операційний план безшовного переносу репозиторія в організацію **`sy-tools`**.
Виконувати зверху вниз. Кожен блок має чек-лист — нічого не пропускати.

> **Target:** `https://github.com/sy-tools/sy-subtitles`
> **Нова Pages-адреса (без кастомного домену):** `https://sy-tools.github.io/sy-subtitles/`

---

## 0. Чому це не "просто Transfer"

GitHub `Settings → Transfer` переносить код, issues, PR, labels, branch protection і
налаштовує redirect зі старих URL. Але є три речі, які redirect **не** рятує:

1. **`localStorage` ревюверів.** Уся незакомічена робота ревювера (маркери, коментарі,
   правки в режимі preview/review) живе в браузері й прив'язана до **origin**
   (`slavasubotskiy.github.io`). Зміна Pages-хоста на `sy-tools.github.io` — це **новий
   origin із порожнім `localStorage`**. Робота не зникне зі старого origin, але стане
   недосяжною з нового. Це головний ризик.
2. **OAuth-токен пайплайну** (`CLAUDE_CODE_OAUTH_TOKEN`) — секрет переноситься з репо,
   але його треба підтвердити після переносу (див. §4).
3. **Захардкоджений `REPO` у SPA** і Pages-URL у тілі issue — їх треба перемкнути
   коммітом (див. §3).

Порядок ризику: **(1) localStorage ревюверів → (2) токен пайплайну → (3) політики
мерджа в орг можуть блокувати `bot-pr.sh`.**

---

## 1. Що переноситься автоматично (Transfer)

- [x] Issues (номери #1…#N зберігаються), labels, milestones
- [x] Pull requests, коміти, гілки, теги
- [x] Branch protection на `main` (зараз: required PR reviews = 0, enforce_admins = false)
- [x] Environments: `dry-run`, `github-pages`, `main`
- [x] Actions secrets (`CLAUDE_CODE_OAUTH_TOKEN`) — **перевірити після** (§4)
- [x] Webhooks
- [x] GitHub Pages (build_type = `workflow`, деплой через `deploy-pages.yml`)
- [x] Redirect зі старих `github.com` і git-remote URL (HTTP 301)

Зовнішніх ефектів немає: forks = 0, watchers/subscribers = 0 — **нікого повідомляти не
треба, окрім активних ревюверів** (§2).

---

## 2. Збереження роботи ревюверів (CRITICAL — зробити ДО cutover)

### 2.1. Активні ревью на момент написання

Issues з лейблом `review:in-progress` — у цих людей може бути незакомічена робота
в браузері:

| Issue | Talk |
|---|---|
| #2  | `1992-07-19_Guru-Puja` |
| #5  | `1979-02-25_Puja-In-Pune-Marathi` |
| #21 | `1988-05-08_Sahasrara-Puja-How-it-was-decided` |
| #70 | `1987-08-09_Shri-Vishnumaya-Puja-She-has-created-a-big-maya` |

> Перевір актуальний список перед cutover:
> ```bash
> gh issue list --label talk-review --state open --json number,title,labels \
>   --jq '.[] | select([.labels[].name] | index("review:in-progress")) | {number, title}'
> ```

### 2.2. Чому ризик і як саме гублять

SPA пише все у `localStorage` origin'у Pages. Ключі (`site/index.html`):

| Ключ | Вміст | Втрата = |
|---|---|---|
| `preview_<talkId>_<videoSlug>` | **маркери + правки** | втрачена сесія роботи |
| `sy.sync_player.<talkId>.<videoSlug>` | позиція плеєра, висота панелі | UX |
| `sy_review_mode_<talkId>`, `sy_review_srt_left/right_<talkId>`, `sy_review_langs_<talkId>` | стан перегляду | UX |
| `sy_last_video_<talkId>`, `sy_srt_lang_<talkId>`, `sy_filter_*`, `sy_expert_mode`, `sy_lang` | preferences | UX |
| `sy_tree_cache__<branch>` | кеш дерева репо | regenerable |

Після зміни origin браузер бачить новий хост як новий сайт із порожнім `localStorage`.

### 2.3. Вибрати ОДИН шлях захисту

- **A. Кастомний домен на Pages (найбезшовніше).** Додати CNAME (напр.
  `subtitles.<домен>.org`) **до** переносу. Тоді origin = домен, не `*.github.io`, і
  міграція для ревюверів невидима — `localStorage` переживає cutover.
  - Зараз `cname: null`. Потрібен контроль над DNS-зоною.
- **B. Ручний дамп.** Попросити кожного активного ревювера на старій адресі виконати в
  DevTools-консолі та зберегти вивід:
  ```js
  copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage))))
  ```
  Після cutover на новій адресі вставити назад:
  ```js
  Object.entries(JSON.parse(prompt('paste'))).forEach(([k,v]) => localStorage.setItem(k,v))
  ```
- **C. "Закоміть роботу в issue".** Кожен активний ревювер копіює маркери кнопкою
  `Copy all` у коментар свого GH issue **до** cutover. Найслабший варіант (людський
  фактор), але дешевий.

> **Рекомендація:** A якщо є домен; інакше C для всіх 4 issue + B як страховка для
> найактивніших.

### 2.4. PWA / Service Worker

`site/sw.js` прив'язаний до origin. Встановлений на старому хості PWA після cutover
працюватиме через redirect, але оновлення SW шукатиме `/sw.js` на старому origin і може
застрягти на старій версії.
- [ ] Після cutover попросити ревюверів **перевстановити PWA** з нової адреси.

---

## 3. Зміни в коді (зроблено в ЦЬОМУ PR — окремих правок на cutover не треба)

Код **org-agnostic**: SPA сам виводить `owner/repo` з Pages-хоста, а пайплайн — з
`github.repository`/`github.repository_owner`. Після transfer усе самопідлаштовується,
жодних ручних замін літералів. Що зроблено:

| Файл | Було | Стало |
|---|---|---|
| `site/index.html` | `var REPO = 'SlavaSubotskiy/sy-subtitles';` | `deriveRepo()` з `location.hostname` (`<owner>.github.io/<repo>`); поза Pages — `?repo=owner/name` або `window.__SY_REPO`, інакше **loud error**. Жодного імені орг у коді |
| `.github/workflows/subtitle-pipeline.yml` | `https://slavasubotskiy.github.io/sy-subtitles/...` в тілі issue | `SPA_BASE` з `OWNER`(lowercased)`.github.io/<repo>` |
| `site/sw.js` | `var CACHE_VERSION = 1;` | `= 2;` (інвалідує PWA-кеш, ревювери отримують новий код автоматично) |
| `tests/test_preview_spa.py` | очікувані URL `SlavaSubotskiy/...`; flaky fs-mode тести | `sy-tools/...`; тест-сервер інжектує `window.__SY_REPO`; реальний fullscreen серіалізовано через `_enter_fs`/`_exit_fs` |
| `tests/test_spa_cache.js` | `SlavaSubotskiy/...` у копії `renderStatusBadge` | `sy-tools/...` |

> **У прод-коді немає імені орг.** SPA виводить `owner/repo` суто з Pages-хоста. Поза
> Pages (локальна розробка) — явний `?repo=owner/name`; для тест-харнесу —
> `window.__SY_REPO` (інжектується тест-сервером). Якщо нічого не задано — кидається
> зрозуміла помилка, а не тихий fallback на захардкоджений слуг.

> **Реальний fullscreen зберігся під тестами:** `test_toggleFullscreen_applies_class_synchronously`
> і `_*_survives_missing_fullscreenchange` як раніше викликають справжній
> `requestFullscreen`; fs-mode тести розміру субтитрів теж входять у реальний FS, лише
> чекають на усталення нативного стану між toggle (усунуто гонку, не сам FS).

> Вже org-safe (без змін): усі workflow-кроки з `${{ github.repository }}` /
> `$GITHUB_REPOSITORY` (`whisper.yml`, `new-talk.yml`); SPA-рядки через `+ REPO +`.

Команда-перевірка перед cutover, що старе ім'я ніде не лишилось (має бути **порожньо**):
```bash
grep -rn "SlavaSubotskiy\|slavasubotskiy" \
  --include="*.yml" --include="*.py" --include="*.sh" --include="*.html" --include="*.js" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=.worktrees --exclude-dir=_scratch \
  | grep -v review-status.json | grep -v tests/fixtures | grep -v MIGRATION.md
```
(`sy-tools/sy-subtitles` залишиться лише в `tests/` — тест-сервер і асерти; це нормально.)

---

## 4. Що перевірити вручну після Transfer

- [ ] **`CLAUDE_CODE_OAUTH_TOKEN`** присутній у `Settings → Secrets → Actions`.
      За докою GitHub repository secrets переносяться разом із репо, тож очікувано він
      уже на місці — перевірка це fallback-страховка, а не припущення. Якщо все ж
      відсутній — додати заново (значення — OAuth-токен Claude підписки, від локації
      репо не залежить).
      ```bash
      gh secret list --repo sy-tools/sy-subtitles
      ```
- [ ] **Auto-merge / політики мерджа.** Зараз `allow_auto_merge` фактично вимкнений, тож
      `bot-pr.sh` падає в "merge immediately". В орг можуть бути CODEOWNERS або
      обов'язкові рев'ю, що **заблокують** автоматичний мердж bot-PR (whisper,
      review-status, pipeline). Перевірити, що `bot/*` PR мерджаться без блокувань, або
      налаштувати виняток/auto-merge.
- [ ] **Admin-bypass прямого пушу в `main`.** Зараз ти пушиш у `main` через admin
      override ("Bypassed rule violations"). У орг ця можливість залежить від ролі
      (Owner vs Admin). Підтвердити роль.
- [ ] **Environments** `dry-run` / `github-pages` / `main` та їх branch-policy на місці.
- [ ] **Pages** перебудувались і `html_url` = `https://sy-tools.github.io/sy-subtitles/`.

---

## 5. Runbook — день міграції

**Pre-flight (за тиждень+):**
1. [ ] Змерджити цей PR (org-agnostic код §3) у `main` — щоб на момент transfer код уже
       самопідлаштовувався під будь-який owner.
2. [ ] (Для цієї міграції — вже домовлено) інакше: шлях §2.3 для активних ревюверів.
3. [ ] (Опц.) Налаштувати кастомний CNAME на Pages.
4. [ ] Підтвердити, що `sy-tools` існує і ти маєш у ньому права створювати репо
       (орг уже існує: `gh api orgs/sy-tools`).

**Cutover:**
5. [ ] `gh auth status` — активний акаунт **SlavaSubotskiy**, токен має `repo`+`workflow`.
6. [ ] (Якщо секрет не переїде) занотувати/мати напоготові `CLAUDE_CODE_OAUTH_TOKEN`.
7. [ ] **Transfer:** `Settings → General → Danger Zone → Transfer ownership` → `sy-tools`.
8. [ ] Дочекатися завершення; перевірити §4 (секрет, environments, pages, протекшн).
9. [ ] Оновити локальний remote:
       ```bash
       git remote set-url origin https://github.com/sy-tools/sy-subtitles.git
       git remote -v
       ```
10. [ ] Запустити `deploy-pages.yml` вручну → переконатись, що SPA віддає новий `REPO`.
        ```bash
        gh workflow run deploy-pages.yml --repo sy-tools/sy-subtitles
        ```

**Smoke-test:**
11. [ ] Dry-run пайплайну, щоб переконатися, що токен і bot-PR живі:
        ```bash
        gh workflow run subtitle-pipeline.yml --repo sy-tools/sy-subtitles \
          -f talk_id=<будь-який-наявний> -f dry_run=true
        ```
12. [ ] Реальний прогін на тестовому толку → перевірити, що: коміт пройшов,
        issue `Review: …` створено/оновлено, `sync-status` відпрацював і
        `review-status.json` оновлено.
13. [ ] Відкрити `https://sy-tools.github.io/sy-subtitles/` → бейджі ведуть на
        `github.com/sy-tools/...`, expert-кнопки відкривають пайплайн нового репо.

**Post:**
14. [ ] Повідомити активних ревюверів: нова адреса (PWA оновиться сам завдяки
        `sw.js` cache-bump), за потреби §2.3-B імпорт стану.
15. [ ] Оновити зовнішні закладки/посилання на SPA, якщо є.

---

## 6. Rollback

Transfer оборотний у короткому вікні: можна перенести репо назад
`sy-tools` → `SlavaSubotskiy`. Redirect від GitHub діятиме в обидва боки, поки нове ім'я
не зайняте.
- Код org-agnostic (виводить owner із хоста), тож при transfer назад він самопідлаштується
  — окремого revert не треба.
- Просто перенести репо назад; Pages/SPA знову віддаватимуть старого owner з хоста.
- `localStorage` ревюверів на старому origin залишається недоторканим протягом усього —
  rollback на старий origin повертає доступ до нього.

---

## 7. Фінальний verification-чек

- [ ] `gh secret list --repo sy-tools/sy-subtitles` показує `CLAUDE_CODE_OAUTH_TOKEN`
- [ ] Реальний прогін пайплайну: commit ✓, issue ✓, `sync-status` ✓, `review-status.json` оновлено ✓
- [ ] `bot/*` PR авто-мерджаться (або налаштовано виняток)
- [ ] Pages на `sy-tools.github.io/sy-subtitles/`, SPA бейджі/кнопки на новий репо
- [ ] `grep -rn SlavaSubotskiy` (без fixtures/review-status) — порожньо (`sy-tools` лишається лише в `tests/`)
- [ ] Активні ревювери підтвердили доступ до своєї роботи на новій адресі
