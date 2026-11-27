# Звіт передрелізного регресійного тестування (`ES-43`)

**Дата прогону:** 2026-11-27  
**Гілки, що перевірялись:** `feature/qa` (на базі `feature/backend` `30c1473`) та production-збірка SPA з `origin/feature/frontend` (`3d8a4b4`).  
**База тест-кейсів:** [docs/test-plan.md](test-plan.md) (`49` функціональних `TC-*` + `14` нефункціональних `TC-NFR-*`).

---

## 1. Зведена статистика регресійного прогону

| Контур тестування | Інструмент / Середовище | Обсяг | Статус | Деталі |
|---|---|---|---|---|
| **Статичний аналіз бекенду** | Prettier, ESLint (межі модулів N11/N12), `tsc --noEmit`, `tsc -p tsconfig.build.json` | Уся кодова база `backend/` | ✅ Passed | 0 попереджень, 0 помилок |
| **Юніт-тести** | Vitest (`backend/tests/unit`) | 23 файли · **142 тести** | ✅ Passed | Доменні сутності, інваріанти, use cases, JWT, UoW, EventBus |
| **Компонентні API-тести** | Vitest + PGlite (`backend/tests/integration`) | 22 файли · **105 тестів** | ✅ Passed | Покриття V8: **98.5%** рядків / **95.3%** гілок / **98.1%** функцій |
| **API E2E на реальному PostgreSQL 17** | Vitest + `postgres:17-alpine` (`backend/tests/e2e`, `ES-37`…`ES-40`) | 4 файли · **25 тестів** | ✅ Passed | Auth/RBAC (9 адмін-маршрутів), Venues/Events/Tickets/Analytics, 30 паралельних запитів на 5 місць без overselling (4.55 с) |
| **Навантажувальне тестування (N2)** | `grafana/k6` через Docker Compose (`tests/load/k6-api-load.js`, `ES-41`) | **1704 запити** · 55.43 RPS | ✅ Passed | `p95 = 11.89 мс` (`≤ 300 мс`), 0.00% помилок ([load-testing.md](load-testing.md)) |
| **Кросбраузерні та адаптивні UI-тести (N6, N7)** | Playwright (`tests/ui/`, `ES-42`) | 6 проєктів · **60 тестів** | ✅ Passed | Chromium 159, Firefox 159, WebKit 27.2 у `360×800`, `768×1024`, `1440×900` ([ui-compatibility-report.md](ui-compatibility-report.md)) |
| **Аудит швидкодії сторінок (N3)** | Lighthouse 12.8.2 (`ES-42`) | `/`, `/events`, `/venues` | ✅ Passed | Performance **100**, Accessibility **100**, LCP **1.4 с** (`≤ 2 с`), CLS `0` |

**Разом автоматизованих перевірок:** **332 автотести** (`142` unit + `105` component/PGlite + `25` PostgreSQL 17 E2E + `60` Playwright cross-browser UI) + **1704** навантажувальні запити `k6` + **3** аудити Lighthouse.

---

## 2. Реєстр виявлених дефектів (Defect Log)

Під час комплексної регресії та перехресної звірки гілок `feature/backend` і `origin/feature/frontend` зафіксовано наведені нижче дефекти, які потрібно усунути перед фінальним релізом інтегрованої системи у `main`:

### `BUG-01` · Critical · Фронтенд не підключено до реального REST API (`localStorage`-моки + `USE_AUTH_MOCK`)
- **Область:** Frontend (`origin/feature/frontend`), Docker (`docker/web/Dockerfile`), картки `ES-29`…`ES-34`.
- **Кроки відтворення:**
  1. Зібрати `docker/web/Dockerfile` з `origin/feature/frontend` і підняти стек `docker compose up --build`.
  2. Відкрити веб-інтерфейс, зареєструвати користувача або створити локацію/подію та перевірити таблиці PostgreSQL (`users`, `venues`, `events`, `registrations`).
- **Очікуваний результат:** усі мутації зберігаються в PostgreSQL через `/api/*`.
- **Фактичний результат:** `USE_AUTH_MOCK` у `frontend/src/features/auth/api/auth.api.ts` увімкнений за замовчуванням (`!== 'false'`), у `docker/web/Dockerfile` не передано `VITE_USE_AUTH_MOCK=false`, а `venues.api.ts`, `events.api.ts` та `registrations.api.ts` взагалі не викликають `api()` і працюють лише з `localStorage`.

### `BUG-02` · Critical · Несумісність типів ID (`UUID` vs `number`) і полів DTO між Frontend і Backend
- **Область:** Frontend (`origin/feature/frontend`) ↔ Backend (`feature/backend`).
- **Кроки відтворення:**
  1. Отримати подію з `GET /api/events` (бекенд повертає `{ id: "<uuid>", title, startsAt, endsAt, organizer, venueId, status, createdAt }`).
  2. Перейти на `/events/<uuid>` у фронтенді.
- **Очікуваний результат:** сторінка відкриває деталі події, підвантажує типи квитків (`UUID`) і відправляє `{ ticketTypeId: "<uuid>" }` на `POST /api/events/:eventId/registrations`, коректно обробляючи `204 No Content` при `DELETE /api/registrations/:id`.
- **Фактичний результат:** `EventDetailsPage.tsx` виконує `const numId = Number(id)` і миттєво показує `404 Event not found` для будь-якого UUID; DTO фронтенду використовують старі назви `name`, `startTimestamp`, `endTimestamp`, `organisator`, `ticketId: number`, `registrationTimestamp`; у `VenueFormModal` поле `capacity` позначене опціональним і може відправляти `null` замість обов'язкового цілого `> 0`.

### `BUG-03` · High · Розбіжність кодів помилок `ApiError.code` між бекендом і `frontend/src/shared/api/errors.ts` (вимога F25)
- **Область:** Frontend (`origin/feature/frontend`), `src/shared/api/errors.ts`.
- **Кроки відтворення:**
  1. Викликати на бекенді видалення локації з подією (`409 VENUE_HAS_EVENTS`), дубль типу квитка (`409 TICKET_TYPE_TAKEN`), перевищення місткості локації (`409 TICKET_CAPACITY_EXCEEDED`) або некоректний інтервал події (`400 EVENT_PERIOD_INVALID`).
- **Очікуваний результат:** інтерфейс показує специфічне зрозуміле повідомлення для кожного коду.
- **Фактичний результат:** у словнику `MESSAGES` фронтенду використовуються інші ключі (`VENUE_HAS_SCHEDULED_EVENTS`, `TICKET_TYPE_EXISTS`, `PERIOD_INVALID`), а `TICKET_CAPACITY_EXCEEDED` та доменні `*_INVALID` відсутні — користувач бачить загальну заглушку *"Something went wrong. Please try again."* Повний перелік кодів зафіксовано в [docs/api-errors.md](api-errors.md).

### `BUG-04` · High · Відсутній бекенд-ендпоінт перегляду всіх реєстрацій для адміністратора (F13 / ES-25)
- **Область:** Backend (`modules/registrations`, `feature/backend`) ↔ Admin UI (`AdminRegistrationsTab.tsx`).
- **Кроки відтворення:**
  1. Увійти як адміністратор і відкрити вкладку `Registrations` в адмін-панелі для скасування чужої реєстрації (F13).
- **Очікуваний результат:** існує захищений `AdminGuard` маршрут (наприклад, `GET /admin/registrations`), який дозволяє переглянути реєстрації користувачів і викликати `DELETE /admin/registrations/:id`.
- **Фактичний результат:** реалізовано лише `DELETE /admin/registrations/:id` та `GET /me/registrations` (лише власні); в адміна немає API для отримання списку ID реєстрацій інших користувачів.

### `BUG-05` · High · Зменшення `venue.capacity` через `PATCH /venues/:id` обходить інваріант суми лімітів квитків (ES-15 ↔ ES-21)
- **Область:** Backend (`backend/src/modules/venues/application/use-cases/update-venue.ts`).
- **Кроки відтворення:**
  1. Створити локацію з `capacity: 500`, створити на ній подію й додати тип квитків `limit: 400`.
  2. Виконати `PATCH /venues/:id` з `{ "capacity": 50 }`.
- **Очікуваний результат:** система відхиляє зменшення місткості нижче вже виділеного ліміту квитків на запланованих подіях (`409`).
- **Фактичний результат:** `PATCH /venues/:id` повертає `200 OK` і зберігає `capacity: 50` при 400 активних квитках.

### `BUG-06` · High · Видалення завершеної/скасованої події залишає сирітські записи і приховує історію користувача (ES-20 ↔ ES-26)
- **Область:** Backend (`delete-event.ts`, `drizzle-my-registrations-read-model.ts`).
- **Кроки відтворення:**
  1. Зареєструвати користувача на подію, перевести подію в `CANCELLED` або `FINISHED`, виконати `DELETE /events/:id`.
  2. Викликати `GET /me/registrations` від імені користувача.
- **Очікуваний результат:** історія реєстрацій користувача зберігає коректну інформацію або записи коректно архівуються/прибираються без сирітських рядків у `ticket_types`, `registrations` і `event_stats`.
- **Фактичний результат:** рядок з `events` видаляється, записи в `ticket_types`, `registrations` і `event_stats` залишаються сиротами, а `DrizzleMyRegistrationsReadModel` пропускає їх (`if (!event || !ticket) continue`), через що минулі реєстрації безслідно зникають з `/me/registrations`.

### `BUG-07` · Medium · Блокування `FOR UPDATE SKIP LOCKED` у `SyncEventStatusesUseCase` виконується поза транзакцією (ES-06 / ES-17)
- **Область:** Backend (`sync-event-statuses.ts`, `drizzle-event-repository.ts`).
- **Кроки відтворення:**
  1. У `SyncEventStatusesUseCase.execute()` виклик `this.events.findActiveEndedBefore(now)` виконується до `this.uow.run(...)`.
- **Очікуваний результат:** рядкове блокування утримується до `COMMIT` транзакції збереження статусу `FINISHED`, унеможливлюючи перезапис паралельного `CANCELLED`.
- **Фактичний результат:** `SELECT … FOR UPDATE SKIP LOCKED` виконується в auto-commit режимі, замок знімається одразу після `SELECT`, а `save(candidate)` у наступній транзакції перезаписує всі поля без повторного блокування.

### `BUG-08` · Medium · У конфігурації Nginx відсутні захисні HTTP-заголовки та rate limiting на `/api/auth/*`
- **Область:** Infrastructure (`docker/web/nginx.conf`).
- **Опис:** у `nginx.conf` налаштовано TLS 1.2/1.3 і HTTP/2, але відсутні заголовки `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` та обмеження частоти запитів (`limit_req`) для `/api/auth/login` і `/api/auth/register` (захист від brute-force та DoS через CPU-ємний Argon2id).

---

## 3. Релізний висновок QA

- **Бекенд-контур (`feature/backend` + `feature/qa`):** готовий до злиття у `main` — усі 272 серверні автотести (142 unit + 105 PGlite + 25 PostgreSQL 17 E2E) та навантажувальний тест `k6` (`55.43 RPS`, `p95 = 11.89 мс`) проходять на 100%. Дефекти `BUG-04`…`BUG-08` рекомендовано оформити окремими фікс-картками на бекенд/інфраструктуру.
- **Фронтенд-контур (`origin/feature/frontend`):** візуальна, адаптивна та кросбраузерна якість підтверджена на 100% (`60/60` Playwright, Lighthouse `100/100/100`, LCP `1.4 с`). Перед переведенням `ES-29`…`ES-34` у `Done` для інтегрованого релізу необхідно закрити **`BUG-01`–`BUG-03`** та дочекатися завершення **`ES-35`** (вкладка аналітики для F24).
