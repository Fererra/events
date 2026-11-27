# Матриця трасування вимог

Відповідність вимог специфікації (ЛР1) реалізації та автотестам. Тести — у `backend/tests`, запуск: `npm test`, з покриттям: `npm run test:coverage`.

**Статуси:** ✅ реалізовано й покрито тестами · 🟡 частково (бекенд готовий, частина залежить від інших модулів або не перевірена на реальному середовищі) · ⏳ не реалізовано (картка іншого учасника).

> Стан на 2026-11-27. Інтеграційні тести працюють на PGlite (PostgreSQL у процесі). Розгортання в Docker Compose з реальним PostgreSQL перевіряє CI-job **Docker Compose smoke test** на кожен PR (див. [нижче](#ci)).

## Функціональні вимоги

| # | Вимога (ЛР1, §3) | Картка | Статус | Реалізація | Тести |
|---|---|---|---|---|---|
| F1 | Реєстрація та авторизація неавторизованого користувача | ES-07, ES-08 | ✅ | `POST /auth/register` (`surname`, `name`, `phone`, `email`, `password`), `POST /auth/login` — `auth/application/use-cases/register-user.ts`, `login-user.ts` | `integration/auth-register.test.ts` (7 тестів: профільні поля, спільний телефон, Argon2id, дубль/гонка, 400); `integration/auth-login.test.ts`; `unit/auth/register-user.test.ts` (10 тестів) |
| F2 | Помилка при реєстрації з уже зайнятим email | ES-07 | ✅ | перевірка в use case + унікальний індекс `users.email` (захист від гонки) | `auth-register.test.ts` «duplicate e-mail → 409», «concurrent registrations… exactly one wins»; `unit/auth/register-user.test.ts` «rejects an e-mail that is already taken (case-insensitive)» |
| F3 | Пара токенів і оновлення access за дійсним refresh | ES-08, ES-09 | ✅ | `TokenPairIssuer`, `RefreshTokensUseCase` (ротація, `SELECT … FOR UPDATE`) | `auth-login.test.ts` (TTL 15 хв / 7 днів, запис у БД); `auth-refresh.test.ts` (6 тестів: ротація, повторне використання, прострочений, підмінений тип, невідомий `jti`); `unit/auth/jwt-token-service.test.ts` |
| F4 | Вихід з відкликанням refresh-токена | ES-10 | ✅ | `POST /auth/logout` — `LogoutUseCase` | `integration/auth-logout.test.ts` (відкликання в БД, refresh після logout → 401, ідемпотентність, інші сесії живі) |
| F5 | Кожен акаунт має роль; адмін-дії недоступні користувачу | ES-11 | ✅ | `JwtGuard` / `AdminGuard` (`auth/presentation/guards.ts`), експорт через `auth/index.ts`; стартовий адмін з `ADMIN_EMAIL` | `integration/auth-guards.test.ts` (9 тестів: 401 до бізнес-логіки, 403 для `user`, 200 для `admin`, реєстрація не дає роль `admin`); `analytics-view.test.ts` «user → 403, guest → 401» |
| F6 | Перегляд власного профілю | ES-12 | ✅ | `GET /me` (`surname`, `name`, `phone`, `email`, `role`, `createdAt`) — `GetProfileQuery` | `integration/auth-profile.test.ts` (користувач, bootstrap-адмін з `null`-полями, 401) |
| F7 | Адмін створює локацію (назва, унікальна адреса, місткість) | ES-13 | ✅ | `POST /venues` (`AdminGuard`) — `venues/domain/venue.ts`, `venues/application/use-cases/create-venue.ts` | `integration/venues-create.test.ts` (8 тестів: 201 + запис у БД, `CAPACITY_INVALID`, 400, 403 для `user`, 401 для гостя); `unit/venues/create-venue.test.ts` (9 тестів) |
| F8 | Дубль адреси локації → помилка | ES-13 | ✅ | перевірка в use case + унікальний індекс `venues.normalized_address` (захист від гонки) | `venues-create.test.ts` «duplicate address → 409 ADDRESS_TAKEN», «concurrent creations… exactly one wins»; `unit/venues/create-venue.test.ts` |
| F9 | Перегляд переліку та деталей локацій усіма | ES-14 | ✅ | `GET /venues?page&limit`, `GET /venues/:id` (публічні) — `ListVenuesQuery`, `GetVenueQuery` | `integration/venues-read.test.ts` (5 тестів: пагінація, деталі, 404, 400); `unit/venues/venue-queries.test.ts` |
| F10 | Заборона видалення локації із запланованими подіями | ES-16 | ✅ | `DELETE /venues/:id` (`AdminGuard`), перевірка через порт `IVenueEventsChecker` над `events/index.ts` → `409 VENUE_HAS_EVENTS` | `integration/venues-delete.test.ts` (4 тести: 204 без подій та з `CANCELLED`, 409 із запланованою, 404/403/401); `unit/venues/delete-venue.test.ts` |
| F11 | Редагування локації адміністратором | ES-15 | ✅ | `PATCH /venues/:id` (`AdminGuard`) — `UpdateVenueUseCase`, перевірка унікальності адреси | `integration/venues-update.test.ts` (6 тестів: часткове оновлення, 409 на дубль, 400/404/403/401); `unit/venues/update-venue.test.ts` |
| F12 | Користувач скасовує власну реєстрацію | ES-24 | ✅ | `DELETE /registrations/:id` (`JwtGuard`) — `CancelRegistrationUseCase`, повернення місця у ліміт, `RegistrationCancelled` (`owner`) | `integration/registrations-cancel.test.ts` (204, звільнення місця, `/me/registrations`, Analytics, 403/409/404/401); `unit/registrations/cancel-registration.test.ts` |
| F13 | Адмін скасовує реєстрацію будь-якого користувача | ES-25 | ✅ | `DELETE /registrations/:id` (роль `admin`) та `DELETE /admin/registrations/:id` (`AdminGuard`), `RegistrationCancelled` (`admin`) | `integration/registrations-cancel.test.ts` (скасування адміном через обидва маршрути, 403 для `user` на `AdminGuard`); `unit/registrations/cancel-registration.test.ts` |
| F14 | Адмін створює подію | ES-18 | ✅ | `POST /events` (`AdminGuard`) — `Event` + `EventPeriod`, перевірка локації через `IVenueLookup` над `venues/index.ts` | `integration/events-create.test.ts` (5 тестів: 201 `IN_PLANNING`, `EVENT_PERIOD_INVALID`, `VENUE_NOT_FOUND`, 403/401); `unit/events/event.test.ts`, `create-event.test.ts` |
| F15 | Перелік подій для авторизованих і гостей | ES-19 | ✅ | `GET /events?page&limit&venueId&status`, `GET /events/:id` (публічні) — `ListEventsQuery`, `GetEventQuery` | `integration/events-read.test.ts` (4 тести: пагінація, фільтри, 404/400, живий `EventCatalog`); `unit/events/event-queries.test.ts` |
| F16 | Статус події, який змінює адмін | ES-06, ES-17, ES-20 | ✅ | `Event` state machine (`publish`, `cancel`, `finish`, `delete`); `PATCH /events/:id/status` та `DELETE /events/:id` (`AdminGuard`); `EventCancelled` → Analytics; cron `SyncEventStatusesUseCase` | `integration/events-status.test.ts` (5 тестів: публікація з квитками, скасування + Analytics, завершення, видалення, 409/403/401); `integration/events-lifecycle.test.ts`; `unit/events/event.test.ts`, `change-event-status.test.ts`, `sync-event-statuses.test.ts` |
| F17 | Адмін додає типи квитків (тип, ліміт, ціна) | ES-21 | ✅ | `POST /events/:id/tickets` (`AdminGuard`) — `TicketType`, блокування події `FOR UPDATE` і контроль «сума лімітів ≤ місткість локації» | `integration/tickets-create.test.ts` (5 тестів: 201, `TICKET_CAPACITY_EXCEEDED`, `TICKET_TYPE_TAKEN`, 400/404/403/401); `unit/tickets/create-ticket-type.test.ts` |
| F18 | Відображення типів квитків з ціною та залишком | ES-22 | ✅ | `GET /events/:id/tickets` (публічний) + `RegistrationsModuleSoldCounter` над `registrations/index.ts`; публічний `TicketReader` | `integration/tickets-read.test.ts` (4 тести); `integration/registrations-create.test.ts` і `registrations-cancel.test.ts` (живий `remaining`); `unit/tickets/list-event-tickets.test.ts` |
| F19 | Реєстрація на подію з вибором типу квитка | ES-23 | ✅ | `POST /events/:eventId/registrations` (`JwtGuard`) — `RegistrationFactory`, `CreateRegistrationUseCase`, `RegistrationCreated` | `integration/registrations-create.test.ts` (201, живі `remaining`, `/me/registrations`, Analytics, 409/404/401); `unit/registrations/create-registration.test.ts` |
| F20 | Атомарна перевірка вільних місць | ES-23 | ✅ | `IUnitOfWork` + `SELECT … FOR UPDATE` на рядку `ticket_types` через `TicketReader` | `integration/registrations-create.test.ts` «prevents overselling under concurrent requests (limit 4, 10 parallel requests)»; `unit/unit-of-work.test.ts` |
| F21 | Вичерпано ліміт → помилка, реєстрацію відхилено | ES-23 | ✅ | `TicketsSoldOutError` → `409 TICKETS_SOLD_OUT` | `integration/registrations-create.test.ts` (6×409 `TICKETS_SOLD_OUT` при перевищенні ліміту); `unit/registrations/create-registration.test.ts` |
| F22 | Перегляд власних реєстрацій | ES-26, ES-23 | ✅ | `GET /me/registrations` — `ListMyRegistrationsQuery` + живий `DrizzleMyRegistrationsReadModel` (batch-читачі `events/index.ts` і `tickets/index.ts`) | `integration/my-registrations.test.ts` (3 тести); `integration/registrations-create.test.ts` і `registrations-cancel.test.ts` (живі дані) |
| F23 | Автоматична статистика по події (кількість, скасування, остання активність) | ES-27, ES-20, ES-23, ES-24, ES-25 | ✅ | `EventStatsProjector` → `event_stats`, живі доменні події `RegistrationCreated`, `RegistrationCancelled`, `EventCancelled` | `unit/analytics/event-stats.test.ts`; `integration/analytics-projector.test.ts`; живі перевірки у `events-status.test.ts`, `registrations-create.test.ts`, `registrations-cancel.test.ts` |
| F24 | Адмін переглядає аналітику відвідуваності | ES-28, ES-19 | ✅ | `GET /analytics/events?from&to&status` (`AdminGuard`) + живий адаптер `EventsModuleCatalog` над `events/index.ts` | `integration/analytics-view.test.ts` (6 тестів); `integration/events-read.test.ts` (живий каталог без заглушок) |
| F25 | Зрозумілі повідомлення про помилки у веб-інтерфейсі | ES-30…34 | 🟡 | бекенд: уніфіковане тіло `{ code, message, details }` (ES-04); показ у UI — фронтенд | `unit/error-handler.test.ts` (8 тестів) |

## Нефункціональні вимоги

| # | Вимога (ЛР1, §4) | Картка | Статус | Як забезпечено | Чим підтверджено |
|---|---|---|---|---|---|
| N1 | Доступність ≥ 99% на місяць | ES-02 | 🟡 | `restart: unless-stopped` для всіх контейнерів; healthcheck БД, app і web; `app` стартує лише після healthy БД | CI: `docker compose up --wait` дочікується healthy-стану всіх трьох контейнерів, `app` стартує після healthy БД; реальний місячний аптайм не вимірювався |
| N2 | 95% запитів API ≤ 300 мс при 50 RPS | ES-41 | ⏳ | пул з'єднань, побічні операції винесено з запиту (N5) | навантажувальний тест k6 — картка ES-41 |
| N3 | Сторінки завантажуються ≤ 2 с (p95) | ES-31, ES-42 | ⏳ | — | Lighthouse — ES-42 |
| N4 | Критичні операції виконуються атомарно | ES-03, ES-21, ES-23 | ✅ | `IUnitOfWork` (транзакція, вкладені виклики), `SELECT … FOR UPDATE` при реєстрації на квиток, додаванні типів квитків, зміні статусу, ротації refresh-токенів і оновленні статистики, унікальні індекси | `unit/unit-of-work.test.ts`; `registrations-create.test.ts` (10 паралельних запитів на ліміт 4 без oversell); `venues-create.test.ts` і `auth-register.test.ts` (конкурентні створення); `auth-refresh.test.ts`; `analytics-projector.test.ts` |
| N5 | Побічні операції не впливають на час відповіді основної | ES-05, ES-27 | ✅ | шина доменних подій: доставка після COMMIT, асинхронно, помилка підписника ізольована | `unit/event-bus.test.ts` (після COMMIT, скасування при ROLLBACK, ізоляція збою, незмінність); `analytics-projector.test.ts` «the publisher’s transaction is not slowed down or broken»; `unit/unit-of-work.test.ts` «runs afterCommit callbacks only after COMMIT and asynchronously» |
| N6 | Адаптивний веб-інтерфейс | ES-29, ES-42 | ⏳ | — | — |
| N7 | Підтримка останніх версій основних браузерів | ES-42 | ⏳ | — | — |
| N8 | Паролі лише як хеш Argon2 за рекомендаціями OWASP | ES-07 | ✅ | Argon2id, m = 19 MiB, t = 2, p = 1; хеш не повертається в API; однакова відповідь на невірний email і пароль | `auth-register.test.ts` «stores the password only as an Argon2id hash with OWASP parameters»; `auth-login.test.ts` «wrong password and unknown e-mail give the same 401» |
| N9 | Автентифікація та авторизація через JWT | ES-08, ES-11 | ✅ | HS256 з фіксованим алгоритмом, окремі секрети й `typ` для access/refresh, секрети ≥ 32 символів у production | `unit/auth/jwt-token-service.test.ts` (підробка, `alg: none`, прострочений токен, підміна типу); `unit/config.test.ts` (обов'язкові та довгі секрети в production); `auth-guards.test.ts` |
| N10 | Адмін-дії лише для ролі `admin` | ES-11 | ✅ | `AdminGuard` на адмін-маршрутах | `auth-guards.test.ts` «admin action by a regular user → 403»; перевірки 403/401 у `analytics-view.test.ts`, `venues-*.test.ts`, `events-*.test.ts`, `tickets-create.test.ts`, `registrations-cancel.test.ts` |
| N11 | Шарова архітектура з інверсією залежностей | ES-01 | ✅ | 4 шари в кожному модулі; порти в `application`/`domain`, реалізації в `infrastructure`; домен без Fastify/ORM | ESLint (`npm run lint`): заборона імпорту `fastify`, `drizzle-orm`, `pg`, `argon2`, `jsonwebtoken`, `node-cron` у `domain` |
| N12 | Модульний моноліт з публічними API між модулями | ES-01 | ✅ | 6 модулів, взаємодія лише через `index.ts`, порти-споживачі з адаптерами | ESLint `no-restricted-imports` на імпорт внутрішніх шарів іншого модуля; `unit/health.test.ts` «registers all six modules» |
| N13 | Розгортання через Docker і Docker Compose | ES-02 | ✅ | `docker-compose.yml`: web (nginx, TLS, проксі `/api`), app, postgres; назовні лише 443; міграції при старті | CI «Docker Compose smoke test»: збірка образів і `docker compose up` з нуля; через nginx по HTTPS відповідають `/`, `/api/health`, `/api/health/db`; назовні опубліковано лише порт 443 |
| N14 | Постійне з'єднання з PostgreSQL | ES-03 | ✅ | пул з'єднань, міграції при старті, readiness-ендпоінт `GET /health/db` | `unit/health.test.ts` «GET /health/db checks the database»; CI: `/api/health/db` на реальному PostgreSQL 17, реєстрація користувача та вхід стартового адміна проходять на застосованих міграціях |

## Покриття коду тестами

`npm run test:coverage` (Vitest + V8). HTML-звіт: `backend/coverage/index.html`.

**Разом: 247 тестів у 45 файлах, усі проходять.**

| Метрика | Значення |
|---|---|
| Рядки / інструкції | 98.5% |
| Гілки | 95.3% |
| Функції | 98.1% |

| Область | Рядки | Гілки | Функції |
|---|---|---|---|
| `auth` | 98.5% | 92.9% | 96.7% |
| `venues` | 98.7% | 97.1% | 100.0% |
| `events` | 99.6% | 98.8% | 100.0% |
| `tickets` | 98.6% | 95.5% | 100.0% |
| `registrations` | 99.1% | 96.7% | 100.0% |
| `analytics` | 100.0% | 98.4% | 100.0% |
| `shared` (UoW, шина подій, планувальник, помилки, конфіг) | 93.9% | 91.5% | 88.2% |
| `app.ts` (composition root) | 90.6% | 75.0% | 100.0% |

Зі звіту виключено файли без виконуваного коду: інтерфейси портів, контракти доменних подій, `server.ts` (точка входу). Усі 6 модулів повністю реалізовано без тимчасових заглушок.

| Тип тестів | Файлів | Тестів | Що перевіряють |
|---|---|---|---|
| Юніт (`tests/unit`) | 23 | 142 | доменні сутності, об'єкти-значення, стан-машина, use cases з фейковими портами, JWT, конфіг, обробник помилок, UoW, шина подій, планувальник |
| Компонентні / API (`tests/integration`) | 22 | 105 | HTTP-ендпоінти через `fastify.inject` з реальною схемою БД (PGlite): коди відповідей, JSON, права доступу, конкурентні сценарії, міжмодульна інтеграція |
| Smoke / розгортання (CI) | — | 6 перевірок | повна система в Docker Compose: web → app → PostgreSQL |

## CI

GitHub Actions (`.github/workflows/ci.yml`) на кожен pull request і push у `main`. Обидва jobs — обов'язкові перевірки: `main` захищено, зміни потрапляють туди лише через PR із зеленим CI.

| Job | Кроки |
|---|---|
| **Backend** | Prettier → ESLint (включно з межами модулів, N11/N12) → typecheck → тести з покриттям і порогами (90% рядків / 85% гілок) → збірка; звіт покриття — артефакт `coverage-report` |
| **Docker Compose smoke test** | `docker compose up --build --wait` → `GET /` (SPA через nginx) → `GET /api/health` → `GET /api/health/db` → `POST /api/auth/register` (201) → вхід стартового адміна → перевірка, що опубліковано лише порт 443 |

Перший повністю зелений запуск — PR [#17](https://github.com/Fererra/events/pull/17).
