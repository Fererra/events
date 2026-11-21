# Матриця трасування вимог

Відповідність вимог специфікації (ЛР1) реалізації та автотестам. Тести — у `backend/tests`, запуск: `npm test`, з покриттям: `npm run test:coverage`.

**Статуси:** ✅ реалізовано й покрито тестами · 🟡 частково (бекенд готовий, частина залежить від інших модулів або не перевірена на реальному середовищі) · ⏳ не реалізовано (картка іншого учасника).

> Стан на 2026-11-21. Інтеграційні тести працюють на PGlite (PostgreSQL у процесі); запуск у Docker Compose з реальним PostgreSQL ще не перевірявся.

## Функціональні вимоги

| # | Вимога (ЛР1, §3) | Картка | Статус | Реалізація | Тести |
|---|---|---|---|---|---|
| F1 | Реєстрація та авторизація неавторизованого користувача | ES-07, ES-08 | ✅ | `POST /auth/register`, `POST /auth/login` — `auth/application/use-cases/register-user.ts`, `login-user.ts` | `integration/auth-register.test.ts` «creates an account…»; `integration/auth-login.test.ts` «returns an access JWT…» |
| F2 | Помилка при реєстрації з уже зайнятим email | ES-07 | ✅ | перевірка в use case + унікальний індекс `users.email` (захист від гонки) | `auth-register.test.ts` «duplicate e-mail → 409», «concurrent registrations… exactly one wins»; `unit/auth/register-user.test.ts` «rejects an e-mail that is already taken (case-insensitive)» |
| F3 | Пара токенів і оновлення access за дійсним refresh | ES-08, ES-09 | ✅ | `TokenPairIssuer`, `RefreshTokensUseCase` (ротація, `SELECT … FOR UPDATE`) | `auth-login.test.ts` (TTL 15 хв / 7 днів, запис у БД); `auth-refresh.test.ts` (6 тестів: ротація, повторне використання, прострочений, підмінений тип, невідомий `jti`); `unit/auth/jwt-token-service.test.ts` |
| F4 | Вихід з відкликанням refresh-токена | ES-10 | ✅ | `POST /auth/logout` — `LogoutUseCase` | `integration/auth-logout.test.ts` (відкликання в БД, refresh після logout → 401, ідемпотентність, інші сесії живі) |
| F5 | Кожен акаунт має роль; адмін-дії недоступні користувачу | ES-11 | ✅ | `JwtGuard` / `AdminGuard` (`auth/presentation/guards.ts`), експорт через `auth/index.ts`; стартовий адмін з `ADMIN_EMAIL` | `integration/auth-guards.test.ts` (9 тестів: 401 до бізнес-логіки, 403 для `user`, 200 для `admin`, реєстрація не дає роль `admin`); `analytics-view.test.ts` «user → 403, guest → 401» |
| F6 | Перегляд власного профілю | ES-12 | ✅ | `GET /me` — `GetProfileQuery` | `integration/auth-profile.test.ts` |
| F7 | Адмін створює локацію (назва, унікальна адреса, місткість) | ES-13 | ⏳ | — | — |
| F8 | Дубль адреси локації → помилка | ES-13 | ⏳ | — | — |
| F9 | Перегляд переліку та деталей локацій усіма | ES-14 | ⏳ | — | — |
| F10 | Заборона видалення локації із запланованими подіями | ES-16 | ⏳ | — | — |
| F11 | Редагування локації адміністратором | ES-15 | ⏳ | — | — |
| F12 | Користувач скасовує власну реєстрацію | ES-24 | ⏳ | контракт події `RegistrationCancelled` описано; Analytics його обробляє | `analytics-projector.test.ts` (обробка події) |
| F13 | Адмін скасовує реєстрацію будь-якого користувача | ES-25 | ⏳ | те саме | — |
| F14 | Адмін створює подію | ES-18 | ⏳ | — | — |
| F15 | Перелік подій для авторизованих і гостей | ES-19 | ⏳ | — | — |
| F16 | Статус події, який змінює адмін | ES-20 | 🟡 | автоматичний перехід минулих подій у `FINISHED` — `SyncEventStatusesUseCase` кожні 30 хв (ES-06); ручна зміна статусу — ES-20 | `unit/events/sync-event-statuses.test.ts`; `integration/scheduler.test.ts` |
| F17 | Адмін додає типи квитків (тип, ліміт, ціна) | ES-21 | ⏳ | — | — |
| F18 | Відображення типів квитків з ціною та залишком | ES-22 | ⏳ | — | — |
| F19 | Реєстрація на подію з вибором типу квитка | ES-23 | ⏳ | інфраструктура готова: `IUnitOfWork`, блокування рядків, шина подій | `unit/unit-of-work.test.ts` |
| F20 | Атомарна перевірка вільних місць | ES-23 | ⏳ | те саме | — |
| F21 | Вичерпано ліміт → помилка, реєстрацію відхилено | ES-23 | ⏳ | код помилки `TICKETS_SOLD_OUT` зарезервовано в `docs/api-errors.md` | — |
| F22 | Перегляд власних реєстрацій | ES-26 | 🟡 | `GET /me/registrations` — `ListMyRegistrationsQuery`; read model — заглушка до ES-17/21/23 | `integration/my-registrations.test.ts` (з фейковою read model: лише свої, сортування, формат, 401) |
| F23 | Автоматична статистика по події (кількість, скасування, остання активність) | ES-27 | 🟡 | `EventStatsProjector` → `event_stats`; події почнуть публікувати ES-23/24/20 | `unit/analytics/event-stats.test.ts`; `integration/analytics-projector.test.ts` (підрахунок, скасування, 20 паралельних подій без втрат) |
| F24 | Адмін переглядає аналітику відвідуваності | ES-28 | 🟡 | `GET /analytics/events?from&to&status`; перелік подій — заглушка `IEventCatalog` до ES-17/19 | `integration/analytics-view.test.ts` (фільтри, нулі для подій без реєстрацій, 400 на некоректні параметри, доступ лише admin) |
| F25 | Зрозумілі повідомлення про помилки у веб-інтерфейсі | ES-30…34 | 🟡 | бекенд: уніфіковане тіло `{ code, message, details }` (ES-04); показ у UI — фронтенд | `unit/error-handler.test.ts` (8 тестів) |

## Нефункціональні вимоги

| # | Вимога (ЛР1, §4) | Картка | Статус | Як забезпечено | Чим підтверджено |
|---|---|---|---|---|---|
| N1 | Доступність ≥ 99% на місяць | ES-02 | 🟡 | `restart: unless-stopped` для всіх контейнерів; healthcheck БД, app і web; `app` стартує лише після healthy БД | `docker compose config` валідний; реальний аптайм не вимірювався |
| N2 | 95% запитів API ≤ 300 мс при 50 RPS | ES-41 | ⏳ | пул з'єднань, побічні операції винесено з запиту (N5) | навантажувальний тест k6 — картка ES-41 |
| N3 | Сторінки завантажуються ≤ 2 с (p95) | ES-31, ES-42 | ⏳ | — | Lighthouse — ES-42 |
| N4 | Критичні операції виконуються атомарно | ES-03 | ✅ (для реалізованих операцій) | `IUnitOfWork` (транзакція, вкладені виклики), `SELECT … FOR UPDATE` при ротації refresh-токенів і оновленні статистики, унікальні індекси | `unit/unit-of-work.test.ts` (commit, rollback, вкладеність); `auth-register.test.ts` «concurrent registrations…»; `auth-refresh.test.ts` «reuse… revokes the whole session family»; `analytics-projector.test.ts` «does not lose updates under a burst» |
| N5 | Побічні операції не впливають на час відповіді основної | ES-05, ES-27 | ✅ | шина доменних подій: доставка після COMMIT, асинхронно, помилка підписника ізольована | `unit/event-bus.test.ts` (після COMMIT, скасування при ROLLBACK, ізоляція збою, незмінність); `analytics-projector.test.ts` «the publisher’s transaction is not slowed down or broken»; `unit/unit-of-work.test.ts` «runs afterCommit callbacks only after COMMIT and asynchronously» |
| N6 | Адаптивний веб-інтерфейс | ES-29, ES-42 | ⏳ | — | — |
| N7 | Підтримка останніх версій основних браузерів | ES-42 | ⏳ | — | — |
| N8 | Паролі лише як хеш Argon2 за рекомендаціями OWASP | ES-07 | ✅ | Argon2id, m = 19 MiB, t = 2, p = 1; хеш не повертається в API; однакова відповідь на невірний email і пароль | `auth-register.test.ts` «stores the password only as an Argon2id hash with OWASP parameters»; `auth-login.test.ts` «wrong password and unknown e-mail give the same 401» |
| N9 | Автентифікація та авторизація через JWT | ES-08, ES-11 | ✅ | HS256 з фіксованим алгоритмом, окремі секрети й `typ` для access/refresh, секрети ≥ 32 символів у production | `unit/auth/jwt-token-service.test.ts` (підробка, `alg: none`, прострочений токен, підміна типу); `unit/config.test.ts` (обов'язкові та довгі секрети в production); `auth-guards.test.ts` |
| N10 | Адмін-дії лише для ролі `admin` | ES-11 | ✅ | `AdminGuard` на адмін-маршрутах | `auth-guards.test.ts` «admin action by a regular user → 403»; `analytics-view.test.ts` |
| N11 | Шарова архітектура з інверсією залежностей | ES-01 | ✅ | 4 шари в кожному модулі; порти в `application`/`domain`, реалізації в `infrastructure`; домен без Fastify/ORM | ESLint (`npm run lint`): заборона імпорту `fastify`, `drizzle-orm`, `pg`, `argon2`, `jsonwebtoken`, `node-cron` у `domain` |
| N12 | Модульний моноліт з публічними API між модулями | ES-01 | ✅ | 6 модулів, взаємодія лише через `index.ts`, порти-споживачі з адаптерами | ESLint `no-restricted-imports` на імпорт внутрішніх шарів іншого модуля; `unit/health.test.ts` «registers all six modules» |
| N13 | Розгортання через Docker і Docker Compose | ES-02 | 🟡 | `docker-compose.yml`: web (nginx, TLS, проксі `/api`), app, postgres; назовні лише 443; міграції при старті | `docker compose config` валідний; `docker compose up` ще не запускався |
| N14 | Постійне з'єднання з PostgreSQL | ES-03 | ✅ | пул з'єднань, readiness-ендпоінт `GET /health/db` | `unit/health.test.ts` «GET /health/db checks the database» |

## Покриття коду тестами

`npm run test:coverage` (Vitest + V8). HTML-звіт: `backend/coverage/index.html`.

**Разом: 97 тестів у 21 файлі, усі проходять.**

| Метрика | Значення |
|---|---|
| Рядки / інструкції | 97.2% |
| Гілки | 92.5% |
| Функції | 93.9% |

| Область | Рядки | Гілки | Функції |
|---|---|---|---|
| `auth` | 98.3% | 92.1% | 96.3% |
| `analytics` | 99.1% | 98.3% | 96.7% |
| `registrations` (ES-26) | 98.9% | 91.7% | 100% |
| `events` (ES-06) | 96.2% | 100% | 75.0% |
| `shared` (UoW, шина подій, планувальник, помилки, конфіг) | 93.9% | 90.4% | 88.2% |
| `app.ts` (composition root) | 90.6% | 75.0% | 100% |

Зі звіту виключено файли без виконуваного коду: інтерфейси портів, контракти доменних подій, `server.ts` (точка входу). Модулі `venues` і `tickets` поки містять лише каркас.

| Тип тестів | Файлів | Тестів | Що перевіряють |
|---|---|---|---|
| Юніт (`tests/unit`) | 11 | 50 | доменні сутності, use cases з фейковими портами, JWT, конфіг, обробник помилок, UoW, шина подій, планувальник |
| Компонентні / API (`tests/integration`) | 10 | 47 | HTTP-ендпоінти через `fastify.inject` з реальною схемою БД (PGlite): коди відповідей, JSON, права доступу, конкурентні сценарії |
