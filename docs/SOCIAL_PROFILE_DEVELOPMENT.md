# KikiLink: отчёт по доработке общения и профилей

Дата: 19 сентября 2026. Основание: редакция задания от 18 сентября и шесть приложенных референсов.

Реализован и проверен локальный dev-кандидат с действующим backend-кодом. Это **не завершённая приёмка и не опубликованный релиз**: реальные браузерные скриншоты, Android Desktop mode и проверка с живыми BC-аккаунтами остаются открытыми. Production Cloud не изменялся.

## Рабочая база и границы

- Ветка: `local/social-preferences-20260919`.
- База и локальный rollback checkpoint: `6f680f886dcf2b37a83ff191f2143fea7712ddb2`, тег `checkpoint/pre-social-profile-20260919`.
- Сохранённая стабильная база проверена отдельно; разработка не подменяла её старым checkpoint.
- `package.json` остаётся 0.30.0; публичные `dist`, main, manifest и код FUSAM не изменены. Сборки находятся в `.local-dev/`.
- Использованы существующие CloudClient, авторизация BC/device, Fastify, SQLite, шифрование, media и event stream. Новый сервис, аккаунты, платный хостинг и upload-relay не создавались.
- Автоматические проверки выполнялись по этапам и после интеграции. Финальные цифры ниже относятся к итоговому коду; промежуточные неудачные прогоны не выдаются за успешные.

## Результат по разделам задания

| Раздел | Реализация | Что подтверждено / что остаётся |
| --- | --- | --- |
| 1. Общий UI | Существующие токены, иконки, оболочка и темы сохранены; тема Profile применяется только к профилю. Общие picker, badge, popover, dialog и renderer оформления. | DOM и CSS-проверки проходят. Отрисовка, контраст всех комбинаций и clipping требуют браузера. |
| 2. Reports | Семь стабильных reason IDs, необязательное пояснение кроме Other, Sending, защита повторного нажатия, повтор с тем же clientId, подтверждение только после ответа о сохранении. Действующие report/moderation API, обновление по событию, серверные роли и пагинация. | Независимый авторизованный отправитель и модератор в API-тесте: одна жалоба после повторного запроса, обычному пользователю 403, удалённый объект не ломает список. DOM-тест сохраняет текст при ошибке. Причина конкретного сбоя в production не диагностировалась без доступа к production. |
| 3. Клавиатура | Composer остаётся доступен после Send, focus выполняется при явном действии до async-работы; позднее завершение не перехватывает другое поле и не стирает новый черновик. BC adapter ограничивает GameKeyDown/GamePaste только редактируемым полем KikiLink. | Тесты реальных adapter hooks через тестовый SDK проверяют ввод внутри/снаружи, закрытие, restart/teardown и отсутствие indiscriminate preventDefault. Реальная карта BC, физическая клавиатура и IME ещё требуют ручной проверки. |
| 4. Mute и даты | 15 min / 1 h / 8 h / 24 h / бессрочно; account/conversation metadata, индикатор, expiry и Unmute. DND сохраняет приоритет; muted исключены из общего Chat badge, история и unread внутри диалога остаются. Общий renderer календарных разделителей для Direct и обеих Group-реализаций. | Автотесты состояния, истечения, хранения, непрочитанных и границы дня/пагинации. Разделители используют локальный календарный день, HH:mm сохранён. Смена системной зоны в реальном браузере не проверена. |
| 5. Players и picker | Публичные, relationship и private notebook tags различаются, ограничены с +N. Свободная область строки и Enter/Space открывают Profile, вложенные действия и выделение текста защищены. Один существующий New chat dialog расширен режимами Create group / Add members / Add friend. | Старые отдельные выборщики заменены вызовом общего picker; итоговое подтверждение и выбранные участники сохраняются при ошибке. Офлайн/несовместимые legacy участники исключаются; Cloud-права проверяет сервер. FUSAM-тест создаёт группу через этот UI. |
| 6. Friend requests | Один CommunityService обслуживает Profile, Players, picker и Mailbox. Состояния Send → Sending → Pending Request, Accept/Decline/Cancel, повторная native sync. Requests вынесен в верхнюю панель Players рядом с New chat и Add friends; нижний All удалён. Received / Sent показываются только в режиме заявок. Native и Cloud состояния раздельны. | API-тесты crossing, повтора, отмены, decline, двухсторонних grants, блокировки и отзыва. Старые друзья подтверждаются без рассылки заявок. Отсутствие в online-списке не трактуется как отказ. Надёжного события vanilla mutual acceptance нет — уведомление не выдумывается. |
| 7. Header и Mailbox | Connected убран из header и оставлен на Home. Область branding стабильна, версия из прежнего источника; News и компактный bell с badge. Mailbox получил оформленный header, icon-only Mark all read и Close, loading/error/empty, пагинацию, действия заявок и ссылки на объекты. Реакции агрегируются; release из существующего curated News. | Один SSE lease на аккаунт, приватные события, исключение сообщений/typing/presence из Mailbox. Admin reports доступны только серверному модератору. Координаты header между вкладками визуально не измерены. |
| 8. Offline Direct | Единый Cloud-путь для совместимых пользователей с двусторонним разрешением и явным согласием на доставку. Стабильный UUID до отправки, account queue, серверный sequence, дедупликация, catch-up/ACK/receipts. Waiting / Sent / Delivered / Failed соответствуют реальному этапу. Неоднозначный timeout не вызывает дубль через BC. | Настоящие CloudClient/CommunityService/CloudDirect/ChatService, HTTP, SQLite и SSE проверены с отключением обоих клиентов и перезапуском API/БД. Получатель забрал сообщение без отправителя; повтор не создал дубль; Delivered появился после ACK. Это локальный транспортный E2E, не живой BC. |
| 9. Badges | Общий Players badge renderer используется для Chat и Feed. Chat считает входящие сообщения Direct + Groups с mute. Feed имеет baseline и checkpoint фактически просмотренной свежей ленты; новые посты предлагают отдельное действие без перестановки читаемой истории. | Account cursors, исключения own/blocked/deleted, повтор и reconnect проверяются клиентскими и серверными тестами. Read зависит от видимости беседы и положения у новых сообщений; список Chat не читает всё автоматически. |
| 10. Room Favorites | Звезда текущей комнаты использует тот же canonical key и хранилище, даже когда комнаты нет в обычной выдаче. Обновляются карточка, список и фильтр; Join не вызывается. | Регрессия текущей карточки и навигации проходит. Геометрия звезды/lock overlay остаётся для visual QA. |
| 11. Profile Cards | Явный preset / Gradient, детерминированная миграция legacy, сохранение цветов при переключениях, общий renderer preview/profile/Cloud/cache. Добавлены Glacier, Sage, Dusty rose, Amber. | Проверены нормализация, миграция и публичная сериализация. Визуальная читаемость всей матрицы пока не подтверждена. |
| 12. Avatar decorations | Явные none / preset / solid / gradient. Custom: Solid color перед Gradient; presets отключены до Use presets, прежний выбор сохранён. Четыре новых мотива: Wings, Lotus, Constellation, Crest. Обводка CSS, встроенные контролируемые SVG; никаких SVG uploads. | Независимость фона/аватара и нормализация покрыты тестами. Общая геометрия задаётся renderer/CSS, но центрирование на всех размерах и плотностях требует скриншотов. |
| 13. Preferences / Compatibility | Версионированный каталог 205 IDs в 11 категориях; 24 пункта Quick Setup; Hate / Dislike / Neutral / Like / Love / Hard Limit, а отсутствие записи означает Not Set. Быстрые 👎/👍, детальный обычный selector, локальный поиск, ленивые сворачиваемые категории и autosave через частичный PATCH. Отдельное приватное серверное хранение. В Profile после Bio расположен заметный Preferences summary/editor, а Compatibility остаётся компактной строкой `Online | ♥ 82% compatibility ›`. | Права, CAS merge/retry, retirement, cache invalidation, лимиты, hard-limit conflicts и математика проверены. Публичный profile/presence не содержит ratings. Старые профили без Preferences работают как пустые, без миграции и без подстановки Neutral. |
| 14. Avatar viewer / Discord | Общий ContentDialog: full image с contain, Escape/backdrop/close, возврат фокуса, reduced motion. Сохранён общий HTTPS parser на основе URL.pathname; Discord query/signature и завершающий & не удаляются. | Три политики Always/Ask/Links only, подписанная ссылка, error fallback и возврат фокуса проверены на реальном renderer в DOM. Живая действующая Discord-ссылка не предоставлялась и не проверялась. |
| 15. Регрессия | Account isolation, bounded queues, catch-up, события и backoff; миграции 006/007 и feature pause. Нужные transport keepalive и срок сессии сохранены. | Итоговые автоматические результаты ниже. Полная визуальная и живая приёмка остаётся обязательной до публикации. |

## Переиспользованные части

BC adapter и mod-SDK hooks, LinkChatView и его New chat dialog, ChatService и прежние repositories, LinkPresenceService, профиль/cache и Profile editor, SocialUI, CloudPanel/FeedView, GroupInbox/GroupThread, существующая геометрия Players badge, позиционирование GroupListMenu, прежние иконки и News. Общие небольшие helpers выделены для date separators, mute, badge, report form, ContentDialog, appearance renderer/editor, relationship controls и Mailbox; несвязанные Music, Gallery и media transport не переписывались.

Новые необязательные поля оформления в presence ограничены размером. Private preferences в BC packets не отправляются. Стабильные клиенты продолжают читать прежние поля; неизвестные новые параметры сохраняются сервером при старом редактировании профиля.

## Хранение и API

| Изменение | Назначение |
| --- | --- |
| Settings schema 30 | Нормализация активного оформления с сохранением неактивных цветов и прежнего preset. Версия пакета не менялась. |
| `006_reports.sql` | Nullable `reason_code`, `client_id`, unique reporter/client_id; старые free-text жалобы читаются. |
| `007_community.sql` | capabilities, relationships, grants, mailbox, read cursors, encrypted Direct payloads/receipts, encrypted preferences. Старые профили и сообщения не переписываются. |
| Существующие `/v1/reports`, `/v1/moderation/reports…` | Расширены причины, идемпотентность и обновление; вторая система жалоб не создана. |
| `/v1/capabilities/me`, `/v1/relationships…` | Авторизованная совместимость, lifecycle запросов, known/confirm и отзыв. |
| `/v1/mailbox`, `/v1/mailbox/read` | Личные уведомления, страницы, чтение. |
| `/v1/direct/:member/messages`, `/v1/direct/inbox`, `/v1/direct/acknowledge`, `/v1/direct/receipts` | Сохранение, получение, подтверждение доставки и курсор receipts. |
| `/v1/read-cursors`, `/v1/read-cursors/:scope`, `/v1/feed/unread` | Монотонные account cursors; batch до 100 уменьшает write bursts при catch-up. |
| `/v1/preferences/me`, `/v1/preferences/:member`, `/v1/compatibility/:member` | Отдельная область ratings, безопасный partial PATCH, серверные права, revision, score и отдельные hard-limit conflicts. |
| Существующий `/v1/events` | Адресные invalidations; без рейтингов, текста DM и report evidence. Hint во время активного catch-up не теряется. |
| Group invitations, `/v1/comments/:id`, `/v1/me` | Совместимый batch приглашений, адресный переход к комментарию, feature negotiation. |

`CLOUD_COMMUNITY_ENABLED` по умолчанию **false**. При паузе новые маршруты закрыты, feature flags false; legacy profile/report API работают и новые данные сохраняются. В тестах включение выполняется явно.

DM payload ограничен 30 днями, metadata дедупликации — до 60 дней от сохранения, receipts — 30 днями. Не более 500 ожидающих исходящих и 1000 входящих на аккаунт; текст до 4000 символов; прежний общий write limit 40/min сохраняется. Локальная очередь до 100 сообщений. Stop retrying / удаление истории прекращает локальные повторы, но не обещает отозвать уже принятое сервером сообщение. Отключённая локальная история остаётся memory-only; согласованная очередь доставки может храниться отдельно. Старую историю никто автоматически не выгружает.

Mailbox ограничен 500 записями и 30 днями. Короткие серверные события только инвалидируют адресный кеш. Нет отдельного GitHub/FUSAM polling и опроса каждого друга.

Native FriendList подтверждается действием авторизованного клиента своего аккаунта. Сервер не получает независимого заверенного BC snapshot; скомпрометированный клиент может ложно сообщить о своей стороне. Для доставки всё равно нужны grants обеих сторон, совместимость и отсутствие блокировки. Эта граница не представляется абсолютной проверкой BC-состояния.

Шифрование серверное, **не E2EE**. Оператор с серверными ключами способен расшифровать содержимое. Изменения описаны в `PRIVACY.md` и `cloud/PRIVACY.md`.

## Каталог и формула

Версия `2026.09.19-2`: **205 уникальных IDs** в 11 категориях; 24 общих пункта отмечены для быстрого старта. Никаких запросов к сторонним каталогам во время использования.

База BC R131 закреплена commit `0de770190c9e72790d3be6be70e7901d68cc78a0`: [Female3DCG.js](https://gitgud.io/BondageProjects/Bondage-College/-/blob/0de770190c9e72790d3be6be70e7901d68cc78a0/BondageClub/Assets/Female3DCG/Female3DCG.js), [asset CSV](https://gitgud.io/BondageProjects/Bondage-College/-/blob/0de770190c9e72790d3be6be70e7901d68cc78a0/BondageClub/Assets/Female3DCG/Female3DCG.csv), проверены Preference.js и Activity.js. Внешние первоисточники: [публичный справочник F-List](https://www.f-list.net/json/api/kink-list.php) и [Scarleteen, Yes, No, Maybe So](https://www.scarleteen.com/read/relationships/yes-no-maybe-so-sexual-inventory-stocklist). Дата проверки, точные пути, условия и границы использования приведены в [PREFERENCES_CATALOG.md](PREFERENCES_CATALOG.md).

Синонимы объединены, направления giving/receiving разделены, цвета/варианты одного asset не размножены. Включены короткие общепринятые понятия и provenance; чужие полные описания, картинки, профили и базы не копируются. Разрешение на копирование BC-кода/арта не установлено и не заявляется; условия F-List ограничительные. Каталог ограничен взрослыми согласованными предпочтениями, нежелательные исходные категории исключены. Нет утверждений о популярности отдельных интересов.

ID сохраняет значение при переименовании. Уровни хранятся строками `hate`, `dislike`, `neutral`, `like`, `love`, `hard_limit`; отсутствие записи означает Not Set. Retired ratings не теряются при обычном сохранении, исключаются из расчёта и могут быть явно очищены. Удаление ratings оставляет пустую private-запись с новой revision, чтобы старое устройство не восстановило удалённое незаметно.

Для общей оценки учитывается только уникальный ID, явно заданный обоими пользователями. Явный Neutral участвует, а Not Set отсутствует в записи и не считается ни совпадением, ни различием. При N<5 процента нет. Для Hate…Love используется симметричное расстояние по шкале -2…2; Hard Limit имеет отдельные правила. Пара Like/Love ↔ Hard Limit дополнительно возвращается и показывается как Hard Limit Conflict, а не прячется в проценте. Это сходство заявленных интересов, не научный прогноз и не согласие на действия; границы всегда важнее числа. Score-only возвращает status/count/score/hardLimitConflictCount без списка. Private закрывает сравнение. Даже score может косвенно раскрыть сведения; для строгой приватности нужен Private.

Лимиты: 30 compatibility requests/min на пользователя; максимум 4 пересчёта пары/hour и 60/day на пользователя, bounded cache 1000 entries/15 min. Права проверяются до cache lookup.

## Выполненные проверки

| Проверка | Итог | Реальная область |
| --- | --- | --- |
| TypeScript `tsc --noEmit` | PASS | Клиент и тесты; итоговый лог без ошибок. |
| Локальная сборка `--local` | PASS | `.local-dev/dist`, public dist не тронут. |
| DevTest `--dev-test` | PASS | `.local-dev/devtest`, Cloud отключён. |
| Cloud `--local --cloud` с `.invalid` origin | PASS | `.local-dev/cloud`, deploy не выполнялся. |
| Полный addon Vitest | **1089 passed, 1 skipped**, 84 passed files | 31.21 s; DOM/модули/CSS, не браузерная отрисовка. |
| Полный Cloud Node test | **95 passed, 0 failed** | Временная SQLite, настоящие API/crypto/auth boundaries; controlled BC/storage fixtures. |
| DevTest built artifact suite | **19 passed** | Runtime loader, FUSAM bundle, отсутствие публичного update check. Эти проверки не надо прибавлять к addon count как новые уникальные тесты. |
| Реальный HTTP offline DM после рестарта | **PASS**, повторно после финальной правки SSE | Настоящие клиентские сервисы, API/DB/SSE, оба клиента уходили. Native login proof тестовый. |
| FUSAM Local: 3 dev клиента | **PASS** | Немодифицированный loader, synthetic BC, группы, relay, Players/Rooms, сохранённый offline draft, 0 GitHub requests. |
| FUSAM Local: dev + stable peers | **PASS** | Сохранённый source 0.30.0 пересобран с local flags; discovery после готовности старых peers, приглашения/relay. Отдельные новые проверки декораций/offline draft на старых peers не выполнялись. |
| `git diff --check` | PASS | Пробелы/patch consistency. Отдельный lint script в проекте не настроен. |

Единственный skip — прежний `cloud-native-beep.test.ts`, требующий внешнего закреплённого BC Server.js через `KIKILINK_BC_SERVER_SOURCE`; его файла в окружении нет. Skip не выдаётся за пройденный native integration.

Дополнительные регрессии: double-submit report и сохранение комментария; composer focus/draft при позднем сохранении; hooks WASD и teardown; очередь discovery без burst; consent/account isolation; storage-before-ACK; retry того же UUID; read-cursor batching; receipt/event overlap; private API/score-only без ratings; CAS merge и save после logout; old schema → 006/007 с сохранением старого profile/report; pause/resume с сохранением Preferences; signed Discord URL и все три image policies.

Команды воспроизведения из корня: `node node_modules/typescript/bin/tsc --noEmit`, `node scripts/build.mjs --local`, `KIKILINK_TEST_DIST=.local-dev/dist node node_modules/vitest/vitest.mjs run --maxWorkers=2`. Cloud suite: `node --test --test-concurrency=1 test/*.test.mjs` из `cloud/`. Не запускать корневой `npm test` ради этой dev-проверки: pretest пишет public dist.

## Сетевой замер до/после

`scripts/measure-social-network.mjs` запускает реальные модули обеих версий через esbuild + Happy DOM с synthetic HTTP/SSE. Один аккаунт, пустые Feed/Groups, offline Direct выключен. Числа — запросы, включая открытие SSE, **не байты и не реальные browser-wire measurements**.

| Фаза | Стабильная 0.30.0 | Dev |
| --- | ---: | ---: |
| Вход | 6 | 16 |
| Home | 0 | 0 |
| Custom Activities | 0 | 0 |
| Chat | 3 | 2 |
| Players | 0 | 0 |
| Feed | 4 | 3 |
| Событие Feed | 0 | 3 |
| Reconnect | 1 | 4 |
| Idle, наблюдение 3 s | 0 | 0 |
| Всего | **14** | **28** |

Пик одновременно открытых SSE — 1 в обоих случаях. За сценарий stable открыл 3 соединения, dev 2. В dev добавились capabilities, relationships, mailbox, Feed cursor и догоняющее обновление после события, пришедшего во время первого refresh. Это увеличение функций и запросов, а не доказанное ускорение. Трёхсекундный idle sample не означает отсутствие будущих keepalive/session refresh. JSON с фазами и маршрутами приложен к review archive.

## Шесть референсов и визуальная приёмка

| Референс по содержимому | Соответствие в коде | Доказательство / незакрытая проверка |
| --- | --- | --- |
| 1. Полный Profile с Compatibility | Current room и Last seen остаются компактными facts; Compatibility встроена в строку статуса в формате `Online | ♥ 82% compatibility ›`. Preferences расположен сразу после Bio. Нет self-match или 82% constant. | DOM assertions проверяют порядок, компактную строку и отсутствие прежней большой Compatibility-карточки. Все темы и narrow reflow пока без реального скриншота. |
| 2. Received / Sent | Сегмент показывается только после верхнего действия Players → Requests; нижний All удалён. | Структура UI, mobile grid и Cloud lifecycle реализованы. Визуальное сравнение размеров не выполнено. |
| 3. Pending Request | Та же область friend action меняет состояние после сохранения; повторная отправка недоступна, Cancel в действии. | Серверная идемпотентность подтверждена; отсутствие сдвига соседних кнопок ещё нужно измерить. |
| 4. Add Friends | Компактная кнопка с существующей person-plus иконкой, справа от New chat, общий picker. | DOM/CSS, не копия большого Discord блока. Проверка clipping мобильного toolbar остаётся. |
| 5. Custom Activities | Оболочка бордовая/золотистая сохранена, branding не зависит от длинного title, общий badge. | Изменение CSS проверено автоматически; координаты до/после перехода не сняты. |
| 6. Home | Та же шапка, Connected остаётся на Home, News/Mailbox стабилизированы. | Требуется сравнение Home ↔ Custom ↔ Chat ↔ Players при фиксированном CSS viewport/DPR. |

**Визуальных доказательств итогового интерфейса нет.** Skill `control-browser` получила явный отказ политики браузера при открытии локальной fixture; отказ не обходился другим протоколом/публикацией. Установка Chromium также не завершилась из-за ошибок сетевой загрузки. DOM-проверки и подготовленная fixture не выдаются за screenshots. Шесть входных изображений — требования, а не результаты этой разработки.

Открытая матрица: PC 1280×720 и 1920×1080; mobile 360/390/430 CSS px; отдельно настоящий Android Desktop mode с записанными viewport, DPR и масштабом. Плотности: Comfortable, Compact, Super compact; Home: Guided (`showcase`) / Focused (`compact`); text normal/large/extra-large. Нужны длинные имена, пустые состояния, 99+, scrolling/popovers, все profile themes, small/large avatars и четыре сочетания custom background × custom avatar. Подготовленная локальная fixture использует настоящие UI-модули с явными synthetic данными, но её отрисовка не проверена и она не заменяет staging/live проверку.

## Что передаётся и что дальше

- DevTest ZIP с одним userscript: Cloud отключён, подходят локальные/native UI проверки. Он не даёт новую Cloud-функциональность без обновлённого staging backend.
- Review ZIP: patch к указанной базе, local FUSAM artifact, Cloud build с нерабочим placeholder origin, docs, финальные логи, сетевой JSON и отдельная synthetic visual fixture. Без реальных credentials, БД, user data и скопированных внешних каталогов.
- Этот отчёт и отдельный [план безопасного развёртывания](SOCIAL_PROFILE_DEPLOYMENT.md).

Публикация остаётся отдельным решением после визуальной и живой приёмки. Старый backend с пятью миграциями не может открыть schema 7 из-за checksummed migration gate: безопасный основной rollback — новый backend с `CLOUD_COMMUNITY_ENABLED=false` и стабильный клиент. Обратные SQL-миграции не подготовлены; восстановление старой БД — отдельная offline операция с оценкой потерь, не автоматический откат.
