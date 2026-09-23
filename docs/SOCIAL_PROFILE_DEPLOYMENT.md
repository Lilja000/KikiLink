# KikiLink: отдельный план будущего развёртывания

Этот план подготовлен для ревью. Ничего из него не выполнялось на production; он не является разрешением на публикацию.

## 1. Завершить приёмку кандидата

Использовать точный local commit из review manifest. Проверить patch относительно checkpoint, неизменность public dist, версии и FUSAM. Прочитать [отчёт](SOCIAL_PROFILE_DEVELOPMENT.md), [Privacy](../cloud/PRIVACY.md) и [источники каталога](PREFERENCES_CATALOG.md). Автотесты кандидата пройдены, но блокирующая визуальная матрица и live сценарии не закрыты.

На доступном тестовом браузере снять скриншоты действующего UI, координаты branding/News/Mailbox, геометрию трёх Profile facts и avatar decorations. Отдельно проверить Android Desktop mode. Использовать настоящие CSS viewport/DPR, не размеры входных файлов. Выполнить матрицу density/Home/text и четыре сочетания цветовых редакторов из отчёта.

## 2. Подготовить изолированное staging

Использовать существующий Cloud stack и operator procedure, отдельные БД/ключи/бакеты/проверенные тестовые аккаунты. Не копировать реальные preferences или переписку в фикстуры. Сохранить точные CORS/origin и staging allowlist; verifier ingress остаётся loopback. Не включать upload relay и не менять media hosting.

Проверить encrypted backup и восстановление в **новую offline candidate БД** штатным `cloud/ops/admin.mjs`. Сначала проверить digest, keys, SQLite integrity, старые profile/report records и способность запуска текущего кандидата. Хостовые пути и credentials задаёт существующая операторская конфигурация, а не этот документ.

## 3. Проверить migration и смешанные версии

Остановить staging writers, сделать и проверить backup. Штатная команда `node ops/admin.mjs migrate --backed-up` из `cloud/` допускается только после этого шага и с проверенной staging-конфигурацией. Применяются additive 006/007; прежние checksums не менять.

Запустить новый backend сначала с `CLOUD_COMMUNITY_ENABLED=false`. Проверить readiness, профили, Feed, Groups, старые free-text reports и stable 0.30.0. Прогнать pause/resume и перезапуск БД. Затем явно включить флаг в staging и подтвердить capabilities через `/v1/me`.

Пересобрать dev artifact с **настоящим согласованным staging HTTPS origin**: `KIKILINK_CLOUD_ORIGIN=https://YOUR-STAGING-HOST node scripts/build.mjs --local --cloud`. В review archive origin `.invalid` специально не подключается. Простой DevTest ZIP Cloud не включает. Не менять public dist или production origin ради теста.

## 4. Пройти живые сценарии

Нужны два отдельных авторизованных тестовых пользователя и отдельный серверный модератор. Проверить report → сохранение → подтверждение → ровно одна строка у модератора; обычному пользователю доступ закрыт. Не выдавать роль клиентским Member Number.

Проверить composer/IME/WASD в настоящей карте BC, native FriendList add/remove и частичную ошибку sync, Requests/Profile/Mailbox, crossing/Accept/Decline/Cancel, старый клиент и vanilla. Старые контакты не должны получать массовые заявки. Mark all read не решает pending requests.

Для DM проверить always-on доставку, включая старое сохранённое `direct-consent=no`; отдельного переключателя больше нет. Получатель офлайн; отправить, дождаться серверного Sent, закрыть отправителя, перезапустить staging API, вернуть получателя, получить ровно один текст с исходным временем, вернуть отправителя и получить Delivered. Повторить с timeout, повторным UUID, блокировкой до retrieval, отключённой историей, revoked relationship, storage failure и expiry. Проверить read/unread/mute между двумя устройствами одного аккаунта.

Проверить private/score-only/friends/public, logout во время сохранения, concurrent revision и явное удаление preferences. Убедиться, что ratings отсутствуют в обычном profile/presence/SSE и чужом score-only ответе. Проверить parser с указанной в задании ссылкой; для live загрузки использовать новую действующую Discord-ссылку.

Снять browser network trace входа/вкладок/событий/reconnect/idle. Сравнивать одинаковые данные и условия; текущий synthetic benchmark показывает 14 → 28 requests, улучшение производительности не заявляется. Проверить один event stream, bounded catch-up, backoff и сохранение transport keepalive.

## 5. Подготовить конкретное решение о выпуске

До запроса разрешения приложить проверенный commit, screenshots, результаты живых сценариев, schema/backup receipts, privacy changes и окончательные release notes. Если разрешена публикация, отдельно согласовать изменение версии, public artifacts/main, deployment и FUSAM manifest — сейчас это не сделано.

Сначала совместимый backend с выключенным флагом, затем проверка stable клиента; включение новых функций только после готовности клиентского кандидата. Не выдавать offline DM/Preferences за работающие при старом сервере. Следить за 4xx/5xx/rate-limit, очередью/expiry DM, SSE reconnect и report visibility без логирования содержимого переписки или рейтингов.

## 6. Откат

Основной обратимый вариант: выключить `CLOUD_COMMUNITY_ENABLED`, перезапустить сервис штатно, вернуть стабильный addon. Новые маршруты закрываются, новый код продолжает понимать schema 7, данные остаются для расследования/возобновления. Такой feature pause/resume проверен на временной БД; конкретный host procedure ещё не выполнялся.

**Не запускать старый пяти-миграционный backend на schema 7.** Checksummed gate намеренно не позволит это. Не удалять migration records и не редактировать checksum ради запуска.

Обратные SQL-миграции не поставляются. Если требуется старый бинарный backend, сначала остановить writers, сохранить снимок текущего состояния, отдельно восстановить проверенный старый backup в новый offline path и оценить данные, появившиеся после backup. Потеря новых reports/DM/preferences требует отдельного решения; автоматическая подмена production БД запрещена. Ключи и encrypted backups сохранять по прежней политике, восстановление сессий — по существующей процедуре их инвалидирования.
