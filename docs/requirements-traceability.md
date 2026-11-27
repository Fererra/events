# Матриця трасування вимог

Відповідність вимог специфікації (ЛР1) реалізації, тест-кейсам ([test-plan.md](test-plan.md), ES-36) та автотестам. Тести — у `backend/tests`, запуск: `npm test`, з покриттям: `npm run test:coverage`.

**Статуси:** ✅ реалізовано й покрито тестами · 🟡 частково (бекенд готовий, частина залежить від інших модулів або не перевірена на реальному середовищі) · ⏳ не реалізовано (картка іншого учасника).

> Стан на 2026-11-27. Компонентні API-тести працюють на PGlite (швидкий запуск без Docker), а контур API E2E (`npm run test:e2e`, `ES-37`…`ES-40`), навантажувальні тести `k6` (`ES-41`) і кросбраузерні/Lighthouse тести (`ES-42`) перевіряють систему на реальному PostgreSQL 17, Docker Compose та браузерних рушіях Chromium, Firefox і WebKit. Повний регресійний звіт і реєстр дефектів — у [regression-report.md](regression-report.md).

## Функціональні вимоги

| # | Вимога (ЛР1, §3) | Картка | Тест-кейси (ES-36) | Статус | Реалізація | Тести |
|---|---|---|---|---|---|---|
| F1 | Реєстрація та авторизація неавторизованого користувача | ES-07, ES-08, ES-38 | `TC-AUTH-01`, `TC-AUTH-03`, `TC-AUTH-04`, `TC-AUTH-05` | ✅ | `POST /auth/register` (`surname`, `name`, `phone`, `email`, `password`), `POST /auth/login` — `auth/application/use-cases/register-user.ts`, `login-user.ts` | `integration/auth-register.test.ts` (7 тестів); `integration/auth-login.test.ts`; `unit/auth/register-user.test.ts` (10 тестів); `e2e/auth-rbac.e2e.test.ts` (PostgreSQL 17, граничні перевірки) |
| F2 | Помилка при реєстрації з уже зайнятим email | ES-07, ES-38 | `TC-AUTH-02` | ✅ | перевірка в use case + унікальний індекс `users.email` (захист від гонки) | `auth-register.test.ts`; `unit/auth/register-user.test.ts`; `e2e/auth-rbac.e2e.test.ts` (5 паралельних реєстрацій на реальному PostgreSQL) |
| F3 | Пара токенів і оновлення access за дійсним refresh | ES-08, ES-09, ES-38 | `TC-AUTH-04`, `TC-AUTH-06`, `TC-AUTH-07` | ✅ | `TokenPairIssuer`, `RefreshTokensUseCase` (ротація, `SELECT … FOR UPDATE`) | `auth-login.test.ts`; `auth-refresh.test.ts` (6 тестів); `unit/auth/jwt-token-service.test.ts`; `e2e/auth-rbac.e2e.test.ts` (ротація + крадіжка на PostgreSQL 17) |
| F4 | Вихід з відкликанням refresh-токена | ES-10, ES-38 | `TC-AUTH-08` | ✅ | `POST /auth/logout` — `LogoutUseCase` | `integration/auth-logout.test.ts`; `e2e/auth-rbac.e2e.test.ts` (ідемпотентність + ізоляція сесій на PostgreSQL 17) |
| F5 | Кожен акаунт має роль; адмін-дії недоступні користувачу | ES-11, ES-38 | `TC-AUTH-09` | ✅ | `JwtGuard` / `AdminGuard` (`auth/presentation/guards.ts`), експорт через `auth/index.ts`; стартовий адмін з `ADMIN_EMAIL` | `integration/auth-guards.test.ts` (9 тестів); `e2e/auth-rbac.e2e.test.ts` (наскрізна RBAC-матриця по всіх 9 адмін-маршрутах) |
| F6 | Перегляд власного профілю | ES-12, ES-37 | `TC-AUTH-10` | ✅ | `GET /me` (`surname`, `name`, `phone`, `email`, `role`, `createdAt`) — `GetProfileQuery` | `integration/auth-profile.test.ts`; `e2e/health-and-migrations.e2e.test.ts` |
| F7 | Адмін створює локацію (назва, унікальна адреса, місткість) | ES-13, ES-39 | `TC-VEN-01`, `TC-VEN-02` | ✅ | `POST /venues` (`AdminGuard`) — `venues/domain/venue.ts`, `venues/application/use-cases/create-venue.ts` | `integration/venues-create.test.ts` (8 тестів); `unit/venues/create-venue.test.ts` (9 тестів); `e2e/venues-and-events.e2e.test.ts` |
| F8 | Дубль адреси локації → помилка | ES-13, ES-39 | `TC-VEN-03` | ✅ | перевірка в use case + унікальний індекс `venues.normalized_address` (захист від гонки) | `venues-create.test.ts`; `unit/venues/create-venue.test.ts`; `e2e/venues-and-events.e2e.test.ts` (5 паралельних запитів на PostgreSQL 17) |
| F9 | Перегляд переліку та деталей локацій усіма | ES-14, ES-39 | `TC-VEN-04`, `TC-VEN-05` | ✅ | `GET /venues?page&limit`, `GET /venues/:id` (публічні) — `ListVenuesQuery`, `GetVenueQuery` | `integration/venues-read.test.ts` (5 тестів); `unit/venues/venue-queries.test.ts`; `e2e/venues-and-events.e2e.test.ts` |
| F10 | Заборона видалення локації із запланованими подіями | ES-16, ES-39 | `TC-VEN-07`, `TC-VEN-08` | ✅ | `DELETE /venues/:id` (`AdminGuard`), перевірка через порт `IVenueEventsChecker` над `events/index.ts` → `409 VENUE_HAS_EVENTS` | `integration/venues-delete.test.ts` (4 тести); `unit/venues/delete-venue.test.ts`; `e2e/venues-and-events.e2e.test.ts` |
| F11 | Редагування локації адміністратором | ES-15, ES-39 | `TC-VEN-06` | ✅ | `PATCH /venues/:id` (`AdminGuard`) — `UpdateVenueUseCase`, перевірка унікальності адреси *(див. `BUG-05` у `regression-report.md`)* | `integration/venues-update.test.ts` (6 тестів); `unit/venues/update-venue.test.ts`; `e2e/venues-and-events.e2e.test.ts` |
| F12 | Користувач скасовує власну реєстрацію | ES-24, ES-40 | `TC-REG-06`, `TC-REG-07` | ✅ | `DELETE /registrations/:id` (`JwtGuard`) — `CancelRegistrationUseCase`, повернення місця у ліміт, `RegistrationCancelled` (`owner`) | `integration/registrations-cancel.test.ts`; `unit/registrations/cancel-registration.test.ts`; `e2e/concurrency-oversell.e2e.test.ts` |
| F13 | Адмін скасовує реєстрацію будь-якого користувача | ES-25, ES-40 | `TC-REG-08` | ✅ | `DELETE /registrations/:id` (роль `admin`) та `DELETE /admin/registrations/:id` (`AdminGuard`), `RegistrationCancelled` (`admin`) *(для UI потрібен `GET`-список — `BUG-04`)* | `integration/registrations-cancel.test.ts`; `unit/registrations/cancel-registration.test.ts`; `e2e/concurrency-oversell.e2e.test.ts` |
| F14 | Адмін створює подію | ES-18, ES-39 | `TC-EVT-01`, `TC-EVT-02` | ✅ | `POST /events` (`AdminGuard`) — `Event` + `EventPeriod`, перевірка локації через `IVenueLookup` над `venues/index.ts` | `integration/events-create.test.ts` (5 тестів); `unit/events/event.test.ts`, `create-event.test.ts`; `e2e/venues-and-events.e2e.test.ts` |
| F15 | Перелік подій для авторизованих і гостей | ES-19, ES-39 | `TC-EVT-03`, `TC-EVT-04` | ✅ | `GET /events?page&limit&venueId&status`, `GET /events/:id` (публічні) — `ListEventsQuery`, `GetEventQuery` | `integration/events-read.test.ts` (4 тести); `unit/events/event-queries.test.ts`; `e2e/venues-and-events.e2e.test.ts` |
| F16 | Статус події, який змінює адмін | ES-06, ES-17, ES-20, ES-39 | `TC-EVT-05`…`TC-EVT-10` | ✅ | `Event` state machine (`publish`, `cancel`, `finish`, `delete`); `PATCH /events/:id/status` та `DELETE /events/:id` (`AdminGuard`); `EventCancelled` → Analytics; cron `SyncEventStatusesUseCase` | `integration/events-status.test.ts`, `events-lifecycle.test.ts`; `unit/events/*`; `e2e/venues-and-events.e2e.test.ts` (повна матриця переходів + cron на PostgreSQL 17) |
| F17 | Адмін додає типи квитків (тип, ліміт, ціна) | ES-21, ES-39, ES-40 | `TC-TCK-01`…`TC-TCK-05` | ✅ | `POST /events/:id/tickets` (`AdminGuard`) — `TicketType`, блокування події `FOR UPDATE` і контроль «сума лімітів ≤ місткість локації» | `integration/tickets-create.test.ts`; `unit/tickets/create-ticket-type.test.ts`; `e2e/venues-and-events.e2e.test.ts`, `e2e/concurrency-oversell.e2e.test.ts` (конкурентні тири) |
| F18 | Відображення типів квитків з ціною та залишком | ES-22, ES-39 | `TC-TCK-06` | ✅ | `GET /events/:id/tickets` (публічний) + `RegistrationsModuleSoldCounter` над `registrations/index.ts`; публічний `TicketReader` | `integration/tickets-read.test.ts`; `integration/registrations-*.test.ts`; `e2e/venues-and-events.e2e.test.ts`, `e2e/concurrency-oversell.e2e.test.ts` |
| F19 | Реєстрація на подію з вибором типу квитка | ES-23, ES-40 | `TC-REG-01`, `TC-REG-02`, `TC-REG-03` | ✅ | `POST /events/:eventId/registrations` (`JwtGuard`) — `RegistrationFactory`, `CreateRegistrationUseCase`, `RegistrationCreated` | `integration/registrations-create.test.ts`; `unit/registrations/create-registration.test.ts`; `e2e/concurrency-oversell.e2e.test.ts` |
| F20 | Атомарна перевірка вільних місць | ES-23, ES-40 | `TC-REG-04`, `TC-REG-05` | ✅ | `IUnitOfWork` + `SELECT … FOR UPDATE` на рядку `ticket_types` через `TicketReader` | `integration/registrations-create.test.ts`; `e2e/concurrency-oversell.e2e.test.ts` (30 паралельних запитів на 5 місць + 2-га хвиля на реальному пулі PostgreSQL 17) |
| F21 | Вичерпано ліміт → помилка, реєстрацію відхилено | ES-23, ES-40 | `TC-REG-04`, `TC-REG-05` | ✅ | `TicketsSoldOutError` → `409 TICKETS_SOLD_OUT` | `integration/registrations-create.test.ts`; `e2e/concurrency-oversell.e2e.test.ts` (`25×409 TICKETS_SOLD_OUT` на PostgreSQL 17) |
| F22 | Перегляд власних реєстрацій | ES-26, ES-23, ES-40 | `TC-REG-09` | ✅ | `GET /me/registrations` — `ListMyRegistrationsQuery` + живий `DrizzleMyRegistrationsReadModel` (batch-читачі `events/index.ts` і `tickets/index.ts`) | `integration/my-registrations.test.ts`; `integration/registrations-*.test.ts`; `e2e/concurrency-oversell.e2e.test.ts` |
| F23 | Автоматична статистика по події (кількість, скасування, остання активність) | ES-27, ES-20, ES-23, ES-24, ES-25 | `TC-ANL-01`, `TC-ANL-04` | ✅ | `EventStatsProjector` → `event_stats`, живі доменні події `RegistrationCreated`, `RegistrationCancelled`, `EventCancelled` | `unit/analytics/event-stats.test.ts`; `integration/analytics-projector.test.ts`; `e2e/venues-and-events.e2e.test.ts`, `e2e/concurrency-oversell.e2e.test.ts` |
| F24 | Адмін переглядає аналітику відвідуваності | ES-28, ES-19, ES-39 | `TC-ANL-02`, `TC-ANL-03` | ✅ | `GET /analytics/events?from&to&status` (`AdminGuard`) + живий адаптер `EventsModuleCatalog` над `events/index.ts` | `integration/analytics-view.test.ts` (6 тестів); `e2e/venues-and-events.e2e.test.ts` |
| F25 | Зрозумілі повідомлення про помилки у веб-інтерфейсі | ES-30…34, ES-42 | `TC-ERR-01`, `TC-ERR-02` | 🟡 | бекенд: уніфіковане тіло `{ code, message, details }` та повний довідник у `docs/api-errors.md`; UI перевірено у Playwright, потребує узгодження 4+ кодів після інтеграції (`BUG-03`) | `unit/error-handler.test.ts` (8 тестів); `tests/ui/ui-compatibility.spec.ts` (клієнтська валідація + `403 FORBIDDEN`) |

## Нефункціональні вимоги

| # | Вимога (ЛР1, §4) | Картка | Тест-кейси (ES-36) | Статус | Як забезпечено | Чим підтверджено |
|---|---|---|---|---|---|---|
| N1 | Доступність ≥ 99% на місяць | ES-02 | `TC-NFR-01` | 🟡 | `restart: unless-stopped` для всіх контейнерів; healthcheck БД, app і web; `app` стартує лише після healthy БД | CI: `docker compose up --wait` дочікується healthy-стану всіх трьох контейнерів, `app` стартує після healthy БД; реальний місячний аптайм не вимірювався |
| N2 | 95% запитів API ≤ 300 мс при 50 RPS | ES-41 | `TC-NFR-02` | ✅ | пул з'єднань (`DB_POOL_MAX=10`), індекси БД, побічні операції винесено з запиту (N5) | `tests/load/k6-api-load.js` ([load-testing.md](load-testing.md)): **55.43 RPS** (`1704` запити через Nginx TLS), **0.00%** помилок, **`p95 = 11.89 мс`** (`POST /registrations` — `13.10 мс`) |
| N3 | Сторінки завантажуються ≤ 2 с (p95) | ES-31, ES-42 | `TC-NFR-03` | ✅ | компактна production-збірка Vite (`82.7 kB` JS gzip + `4.27 kB` CSS gzip), кешування `/assets/` на 1 рік (`immutable`) та `gzip` у Nginx | Lighthouse 12.8.2 ([ui-compatibility-report.md](ui-compatibility-report.md)): `/`, `/events`, `/venues` — Performance **100**, **LCP `1.4 с`**, TBT `0 мс`, CLS `0`; Playwright `< 2 с` у 6 проєктах |
| N4 | Критичні операції виконуються атомарно | ES-03, ES-21, ES-23, ES-40 | `TC-NFR-04`, `TC-REG-05` | ✅ | `IUnitOfWork` (транзакція, вкладені виклики), `SELECT … FOR UPDATE` при реєстрації на квиток, додаванні типів квитків, зміні статусу, ротації refresh-токенів і оновленні статистики, унікальні індекси | `unit/unit-of-work.test.ts`; `e2e/concurrency-oversell.e2e.test.ts` (30 паралельних запитів на 5 місць + конкурентне створення тирів на реальному PostgreSQL 17); `e2e/auth-rbac.e2e.test.ts`; `e2e/venues-and-events.e2e.test.ts` |
| N5 | Побічні операції не впливають на час відповіді основної | ES-05, ES-27, ES-41 | `TC-NFR-05`, `TC-ANL-01` | ✅ | шина доменних подій: доставка після COMMIT, асинхронно, помилка підписника ізольована | `unit/event-bus.test.ts`; `analytics-projector.test.ts`; `unit/unit-of-work.test.ts`; `k6` (`POST /registrations` `p95 = 13.10 мс` при 55 RPS) |
| N6 | Адаптивний веб-інтерфейс | ES-29, ES-42 | `TC-NFR-06` | ✅ | адаптивна верстка CSS Grid/Flexbox, мобільне бургер-меню `#main-nav` від `360 px` | `tests/ui/ui-compatibility.spec.ts` ([ui-compatibility-report.md](ui-compatibility-report.md)): `60/60` тестів, `scrollWidth ≤ innerWidth` у `360×800`, `768×1024`, `1440×900` |
| N7 | Підтримка останніх версій основних браузерів | ES-42 | `TC-NFR-07` | ✅ | `browserslist` і `vite.config.ts` (`chrome110`, `edge110`, `firefox110`, `safari16`) | `tests/ui/ui-compatibility.spec.ts` ([ui-compatibility-report.md](ui-compatibility-report.md)): `60/60` пройдено у Chromium 159 (Blink), Firefox 159 (Gecko) та WebKit 27.2 (Safari) |
| N8 | Паролі лише як хеш Argon2 за рекомендаціями OWASP | ES-07, ES-38 | `TC-NFR-08`, `TC-AUTH-01` | ✅ | Argon2id, m = 19 MiB, t = 2, p = 1; хеш не повертається в API; однакова відповідь на невірний email і пароль | `auth-register.test.ts`; `auth-login.test.ts`; `e2e/auth-rbac.e2e.test.ts` (перевірка хешу в таблиці `users` реального PostgreSQL 17) |
| N9 | Автентифікація та авторизація через JWT | ES-08, ES-11, ES-38 | `TC-NFR-09`, `TC-AUTH-06`, `TC-AUTH-07` | ✅ | HS256 з фіксованим алгоритмом, окремі секрети й `typ` для access/refresh, секрети ≥ 32 символів у production | `unit/auth/jwt-token-service.test.ts`; `unit/config.test.ts`; `auth-guards.test.ts`; `e2e/auth-rbac.e2e.test.ts` |
| N10 | Адмін-дії лише для ролі `admin` | ES-11, ES-38 | `TC-NFR-10`, `TC-AUTH-09` | ✅ | `AdminGuard` на всіх адмін-маршрутах | `auth-guards.test.ts`; `e2e/auth-rbac.e2e.test.ts` (перевірка `401` / `403` по всіх 9 адмін-ендпоінтах на PostgreSQL 17) |
| N11 | Шарова архітектура з інверсією залежностей | ES-01 | `TC-NFR-11` | ✅ | 4 шари в кожному модулі; порти в `application`/`domain`, реалізації в `infrastructure`; домен без Fastify/ORM | ESLint (`npm run lint`): заборона імпорту `fastify`, `drizzle-orm`, `pg`, `argon2`, `jsonwebtoken`, `node-cron` у `domain` |
| N12 | Модульний моноліт з публічними API між модулями | ES-01 | `TC-NFR-12` | ✅ | 6 модулів, взаємодія лише через `index.ts`, порти-споживачі з адаптерами | ESLint `no-restricted-imports` на імпорт внутрішніх шарів іншого модуля; `unit/health.test.ts` «registers all six modules» |
| N13 | Розгортання через Docker і Docker Compose | ES-02, ES-37 | `TC-NFR-13` | ✅ | `docker-compose.yml`: web (nginx, TLS, проксі `/api`), app, postgres; назовні лише 443; міграції при старті | CI «Docker Compose smoke test» + локальний прогін `k6` поверх `docker compose up --build --wait` |
| N14 | Постійне з'єднання з PostgreSQL | ES-03, ES-37 | `TC-NFR-14` | ✅ | пул з'єднань (`pg.Pool`), міграції при старті, readiness-ендпоінт `GET /health/db` | `unit/health.test.ts`; `e2e/health-and-migrations.e2e.test.ts` та CI-job `API E2E (real PostgreSQL 17)` |

## Покриття коду тестами

`npm run test:coverage` (Vitest + V8). HTML-звіт: `backend/coverage/index.html`.

**Разом: 332 автотести (`247` unit/PGlite у 45 файлах + `25` PostgreSQL 17 E2E у 4 файлах + `60` Playwright UI у 6 конфігураціях), усі проходять.**

| Метрика (backend V8) | Значення |
|---|---|
| Рядки / інструкції | 98.5% |
| Гілки | 95.5% |
| Функції | 98.2% |

| Область | Рядки | Гілки | Функції |
|---|---|---|---|
| `auth` | 98.5% | 93.2% | 96.9% |
| `venues` | 98.7% | 97.2% | 100.0% |
| `events` | 99.6% | 98.8% | 100.0% |
| `tickets` | 98.6% | 95.6% | 100.0% |
| `registrations` | 99.1% | 96.8% | 100.0% |
| `analytics` | 100.0% | 98.4% | 100.0% |
| `shared` (UoW, шина подій, планувальник, помилки, конфіг) | 93.9% | 91.7% | 89.2% |
| `app.ts` (composition root) | 90.6% | 75.0% | 100.0% |

Зі звіту виключено файли без виконуваного коду: інтерфейси портів, контракти доменних подій, `server.ts` (точка входу). Усі 6 модулів повністю реалізовано без тимчасових заглушок.

| Тип тестів | Файлів / Проєктів | Тестів | Що перевіряють |
|---|---|---|---|
| Юніт (`backend/tests/unit`) | 23 | 142 | доменні сутності, об'єкти-значення, стан-машина, use cases з фейковими портами, JWT, конфіг, обробник помилок, UoW, шина подій, планувальник |
| Компонентні / API (`backend/tests/integration`) | 22 | 105 | HTTP-ендпоінти через `fastify.inject` з реальною схемою БД (PGlite): коди відповідей, JSON, права доступу, міжмодульна інтеграція |
| API E2E та конкурентність (`backend/tests/e2e`, `ES-37`…`ES-40`) | 4 | 25 | повні сценарії на реальному контейнері `postgres:17-alpine` (`pg.Pool`): RBAC по всіх 9 адмін-маршрутах, стан-машина подій, 30 паралельних запитів на 5 місць без overselling |
| Навантажувальні (`tests/load/k6-api-load.js`, `ES-41`) | 1 сценарій | 1704 запити | `55.43 RPS` через Nginx TLS → Fastify → PostgreSQL 17, `p95 = 11.89 мс ≤ 300 мс` |
| Кросбраузерні / UI (`tests/ui/`, `ES-42`) | 6 проєктів | 60 | Chromium 159, Firefox 159, WebKit 27.2 у `360px` / `768px` / `1440px` + Lighthouse (`100/100/100`, LCP `1.4 с`) |
| Smoke / розгортання (CI) | — | 6 перевірок | повна система в Docker Compose: web → app → PostgreSQL |

## CI

GitHub Actions (`.github/workflows/ci.yml`) на кожен pull request і push у `main`. Усі jobs — обов'язкові перевірки: `main` захищено, зміни потрапляють туди лише через PR із зеленим CI.

| Job | Кроки |
|---|---|
| **Backend** | Prettier → ESLint (включно з межами модулів, N11/N12) → typecheck → тести з покриттям і порогами (90% рядків / 85% гілок) → збірка; звіт покриття — артефакт `coverage-report` |
| **API E2E (real PostgreSQL 17)** | Сервіс-контейнер `postgres:17-alpine` → `npm ci` → `npm run test:e2e` (міграції, Auth/RBAC, Venues/Events/Tickets/Analytics, конкурентний тест перепродажу квитків) |
| **Docker Compose smoke test** | `docker compose up --build --wait` → `GET /` (SPA через nginx) → `GET /api/health` → `GET /api/health/db` → `POST /api/auth/register` (201) → вхід стартового адміна → перевірка, що опубліковано лише порт 443 |

Перший повністю зелений запуск — PR [#17](https://github.com/Fererra/events/pull/17).
