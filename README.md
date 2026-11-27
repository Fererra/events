# Event Service

Модульний сервіс для організації публічних заходів: адміністратори керують локаціями, подіями та типами квитків, користувачі переглядають події та реєструються на них (придбання квитка) з атомарним контролем ліміту місць.

Проєкт виконується в межах курсу «Життєвий цикл розробки ПЗ» (КПІ, ІМ-43). Специфікація вимог — ЛР1, архітектура — ЛР2, Scrum-планування — ЛР3 ([дошка Trello](https://trello.com/b/lYGd5j5h/event-service-%D0%BB%D1%803-scrum)).

## Архітектура

Модульний моноліт у топології **SPA + REST API + PostgreSQL**.

- **Модулі:** `auth`, `venues`, `events`, `tickets`, `registrations`, `analytics`.
- **Шари в кожному модулі:** `presentation → application → domain ← infrastructure` (інверсія залежностей; домен не залежить від Fastify/ORM).
- **Межі модулів:** модуль імпортує інший модуль лише через його публічний `index.ts`. Правило перевіряє ESLint (`no-restricted-imports`).

## Стек

TypeScript · Fastify · Drizzle ORM · PostgreSQL · JWT + Argon2 · node-cron · React.js · Docker Compose · Vitest

## API

| Метод | Шлях | Доступ | Картка |
|---|---|---|---|
| GET | `/health`, `/health/db` | всі | ES-01, ES-03 |
| POST | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | гість | ES-07…ES-10 |
| GET | `/me` | `user` / `admin` | ES-12 |
| POST | `/venues` | `admin` | ES-13 |
| GET | `/me/registrations` | `user` / `admin` | ES-26 |
| GET | `/analytics/events?from&to&status` | `admin` | ES-28 |

Детальніше: [docs/api-auth.md](docs/api-auth.md), [docs/api-venues.md](docs/api-venues.md), [docs/api-analytics.md](docs/api-analytics.md), формат помилок — [docs/api-errors.md](docs/api-errors.md).

## Тимчасові заглушки (порти, що чекають на інші модулі)

Код, що залежить від ще не реалізованих модулів, працює через порти із заглушками. Use case, маршрут і DTO — фінальні; замінюється лише адаптер в `infrastructure/`.

| Порт | Заглушка | Чекає на |
|---|---|---|
| `IMyRegistrationsReadModel` (registrations) | `StubMyRegistrationsReadModel` → `[]` | ES-17, ES-21, ES-23 |
| `IEventCatalog` (analytics → events) | `StubEventCatalog` → `[]` | ES-17, ES-19 |
| `IEventLifecycleRepository` (events, для планувальника) | `StubEventLifecycleRepository` → `[]` | ES-17 |
| Публікація `RegistrationCreated` / `RegistrationCancelled` / `EventCancelled` | контракти описані, публікацію додають use cases | ES-23, ES-24/25, ES-20 |

## Структура репозиторію

```
backend/
  src/
    app.ts              composition root: збирає Fastify і реєструє модулі
    server.ts           точка входу
    shared/             спільне ядро (доменні помилки, конфіг, контракт модуля)
    modules/
      <module>/
        index.ts        публічний API модуля
        presentation/   HTTP-маршрути, guards, cron-тригери
        application/    use cases (CQS), порти
        domain/         сутності, об'єкти-значення, інтерфейси репозиторіїв
        infrastructure/ реалізації портів (ORM, Argon2, JWT, адаптери)
  tests/                тести (Vitest)
  Dockerfile            образ app
docker/web/             образ web (nginx, TLS, SPA)
docker-compose.yml      web + app + postgres
docs/                   документація проєкту
```

## Запуск через Docker Compose

Три контейнери: `web` (nginx: збірка SPA + проксі `/api` → `app`, HTTPS), `app` (Fastify), `postgres` (дані в іменованому volume `pgdata`). `app` стартує лише після успішного healthcheck БД, `web` — після healthcheck `app`; усі сервіси мають `restart: unless-stopped`. Назовні відкритий лише порт 443.

```bash
cp .env.example .env      # змініть секрети JWT
docker compose up -d --build
# https://localhost/  (самопідписаний сертифікат), API: https://localhost/api/health
```

Якщо порт 443 зайнятий, задайте `HTTPS_PORT=8443` у `.env`.

## Запуск бекенду локально (без Docker)

Потрібен Node.js ≥ 22.

```bash
cd backend
npm install
npm run dev        # http://localhost:3000/health
```

Потрібен запущений PostgreSQL (`DATABASE_URL`, за замовчуванням `postgres://events:events@localhost:5432/events`), наприклад `docker compose up -d postgres` з відкритим портом або локальний сервер. Міграції застосовуються автоматично при старті.

Інші команди: `npm run build`, `npm start`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`, `npm run db:generate` (нова міграція після зміни `*.schema.ts`).

## Тести

```bash
cd backend
npm test
```

Юніт-тести (`tests/unit`) працюють з in-memory фейками портів, інтеграційні (`tests/integration`) — з повним застосунком через `fastify.inject` на **PGlite** (PostgreSQL у процесі), тому Docker для тестів не потрібен.

```bash
npm run test:coverage   # звіт у терміналі + backend/coverage/index.html
```

Поточний стан: **123 тести**, покриття **97.5%** рядків / **93.3%** гілок.

CI (GitHub Actions, `.github/workflows/ci.yml`) на кожен PR і push у `main`:
- **backend** — Prettier, ESLint (з межами модулів), typecheck, тести з покриттям (поріг 90% рядків / 85% гілок), збірка; звіт покриття — артефакт `coverage-report`;
- **docker** — `docker compose up --build --wait` і smoke-тест через nginx: `/`, `/api/health`, `/api/health/db`, реєстрація та вхід стартового адміна на реальному PostgreSQL; перевірка, що назовні опубліковано лише HTTPS-порт.

У `main` зміни потрапляють лише через PR із зеленими перевірками.

## Виконання вимог

[docs/requirements-traceability.md](docs/requirements-traceability.md) — матриця «вимога ЛР1 → картка → реалізація → тести» для всіх функціональних (F1–F25) і нефункціональних (N1–N14) вимог, а також покриття коду за модулями.

## Команда

| Учасник | Роль | Зона відповідальності |
|---|---|---|
| Александров Ігор | Backend Developer | Архітектура модулів, Venues / Events / Tickets / Registrations |
| Козаченко Софія | QA | Тест-план, ручне та автоматизоване тестування API і UI, регресія |
| Сухоруков Микита | FullStack Developer | Каркас бекенду, Auth, Analytics, Scheduler, Docker / PostgreSQL |
| Хубеджева Єлизавета | Frontend Developer | React SPA, сторінки, інтеграція з API, верстка |

## Процес розробки

- Задачі — картки `ES-XX` на дошці Trello.
- Одна гілка на задачу: `feature/ES-XX-short-name`.
- Коміти — [Conventional Commits](https://www.conventionalcommits.org/) з номером картки у scope: `feat(ES-07): add register use case`.
- Зміни потрапляють у `main` лише через pull request після код-рев'ю.
