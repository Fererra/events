# Тест-план і тест-кейси (Event Service)

Документ визначає стратегію тестування, тестові середовища, критерії якості та формалізований набір тест-кейсів для перевірки відповідності сервісу **Event Service** усім функціональним (`F1`–`F25`) і нефункціональним (`N1`–`N14`) вимогам специфікації ЛР1.

Зв'язок вимог із реалізацією, тест-кейсами та автотестами підтримується в [requirements-traceability.md](requirements-traceability.md).

---

## 1. Об'єкт і цілі тестування

- **Об'єкт:** модульний моноліт `Event Service` у топології `web` (Nginx TLS + React SPA) → `app` (Fastify REST API, 6 модулів: `auth`, `venues`, `events`, `tickets`, `registrations`, `analytics` + `node-cron`) → `postgres` (PostgreSQL 17).
- **Цілі:**
  1. Підтвердити виконання всіх 25 функціональних вимог (`F1`–`F25`), включно з негативними та граничними сценаріями.
  2. Перевірити розмежування доступу (`гість` / `user` / `admin`) і безпеку автентифікації (Argon2id, ротація JWT, виявлення повторного використання refresh-токена).
  3. Гарантувати відсутність перепродажу квитків (`overselling`) під паралельним багатоз'єднаннєвим навантаженням на реальному PostgreSQL 17.
  4. Перевірити нефункціональні вимоги: продуктивність API (`p95 ≤ 300 мс` при `50 RPS`), швидкість завантаження UI (`p95 ≤ 2 с`), адаптивність (`≥ 360 px`) та кросбраузерну сумісність (`Chrome 110+`, `Firefox 110+`, `Safari 16+`, `Edge 110+`).

---

## 2. Стратегія та рівні тестування

| Рівень | Інструменти | Середовище | Що перевіряється | Картки |
|---|---|---|---|---|
| **Unit** | Vitest | In-memory фейки портів | Доменні сутності, об'єкти-значення, стан-машина `Event`, use cases, `IUnitOfWork`, `InProcessEventBus`, обробник помилок | ES-01…ES-28 |
| **Component / API** | Vitest + `fastify.inject` | PGlite (PostgreSQL у пам'яті) | HTTP-контракти, JSON Schema, міграції, взаємодія модулів, коди відповідей і покриття (≥ 90% рядків / ≥ 85% гілок) | ES-07…ES-28 |
| **API E2E (Docker DB)** | Vitest + `fastify.inject` | Реальний `postgres:17-alpine` (`pg.Pool`) | Повні потоки Auth/RBAC, Venues/Events/Tickets, реальне багатоз'єднаннєве блокування `SELECT … FOR UPDATE` | ES-37…ES-40 |
| **Smoke / Deploy** | Docker Compose + `curl` (CI) | `web` (nginx HTTPS) + `app` + `postgres` | Старт з нуля, healthchecks, TLS на єдиному порту `443`, реальні міграції | ES-02, ES-37 |
| **Performance / Load** | k6 | Docker Compose (`web` + `app` + `postgres`) | `50 RPS`, `p95 ≤ 300 мс`, стабільність під навантаженням без деградації та overselling | ES-41 |
| **UI / Cross-browser** | Playwright + Lighthouse | Chromium, Firefox, WebKit (`360px` / `768px` / `1440px`) | Адаптивність, відображення помилок (`F25`), кросбраузерність (`N7`), `p95 ≤ 2 с` (`N3`) | ES-42 |
| **Regression** | Автотести + ручний чекліст | Повний інтегрований стенд | Передрелізна перевірка критичних сценаріїв і фіксація дефектів | ES-43 |

---

## 3. Критерії входу, виходу та керування дефектами

- **Критерії входу:** зелена збірка (`npm run build`), пройдені `format:check`, `lint` (включно з межами модулів) та `typecheck`, застосовані міграції БД `0000`–`0007`.
- **Критерії виходу (реліз):**
  - 100% пройдених автотестів (Unit, Component/PGlite, PostgreSQL E2E, Concurrency);
  - покриття коду бекенду ≥ 90% рядків і ≥ 85% гілок;
  - відсутні відкриті дефекти рівня `Blocker` / `Critical`;
  - виконано перевірки `k6` (`N2`) та `Lighthouse` / браузерної сумісності (`N3`, `N6`, `N7`).
- **Класифікація дефектів:** `Critical` (блокує ключовий потік або порушує цілісність даних/безпеку) · `High` (порушує вимогу ЛР1 або інваріант домену) · `Medium` (обхідний шлях існує або крайовий сценарій) · `Low` (косметичні/документаційні розбіжності).

---

## 4. Каталог тест-кейсів функціональних вимог (`F1`–`F25`)

### 4.1. Модуль `auth` — автентифікація, токени, ролі та профіль (`F1`–`F6`)

| ID | Вимога | Тип | Сценарій та вхідні дані | Очікуваний результат |
|---|---|---|---|---|
| `TC-AUTH-01` | F1 | Позитивний | `POST /auth/register` із валідними `surname`, `name`, `phone` (`+380 (50) 123-45-67`), `email` (`Alice@Example.com`), `password` (8–128 симв.) | `201 Created`; роль `user`; email збережено в нижньому регістрі, телефон нормалізовано (`+380501234567`); у БД `users.password_hash` містить Argon2id (`$argon2id$v=19$m=19456,t=2,p=1$...`), хеш не повертається у відповіді |
| `TC-AUTH-02` | F1, F2 | Негативний | Повторний `POST /auth/register` з тим самим `email` у іншому регістрі (`ALICE@example.com`), а також два паралельні запити з однаковим `email` | `409 Conflict`, `code: EMAIL_TAKEN`; при паралельних запитах рівно один повертає `201`, інший — `409 EMAIL_TAKEN` |
| `TC-AUTH-03` | F1 | Граничний / Негативний | `POST /auth/register` з невалідними даними: пароль 7 або 129 символів, порожній/51-символьний `surname` або `name` з цифрами, телефон 9 або 16 цифр, відсутнє обов'язкове поле, зайве поле `role: "admin"` | `400 Bad Request` (`VALIDATION_ERROR` із `details` або доменні `PASSWORD_INVALID`, `SURNAME_INVALID`, `NAME_INVALID`, `PHONE_INVALID`, `EMAIL_INVALID`); роль `admin` через публічну реєстрацію створити неможливо |
| `TC-AUTH-04` | F1, F3 | Позитивний | `POST /auth/login` із правильними `email` і `password` | `200 OK`; повертає `{ tokenType: "Bearer", accessToken, expiresIn: 900, refreshToken, refreshExpiresIn: 604800 }`; запис `jti` створено в `refresh_tokens` із `revoked_at IS NULL` |
| `TC-AUTH-05` | F1 | Негативний | `POST /auth/login` з невірним паролем для існуючого email та з неіснуючим email | Обидва випадки повертають ідентичний `401 Unauthorized`, `code: INVALID_CREDENTIALS` (без витоку факту існування акаунта) |
| `TC-AUTH-06` | F3 | Позитивний | `POST /auth/refresh` із чинним `refreshToken` | `200 OK`; видається нова пара токенів із новим `jti`; попередній запис у `refresh_tokens` отримує `revoked_at` |
| `TC-AUTH-07` | F3 | Негативний (безпека) | Повторне надсилання вже використаного (відкликаного) `refreshToken` на `POST /auth/refresh` (імітація крадіжки); також прострочений refresh або підставлений `accessToken` | `401 Unauthorized`, `code: INVALID_REFRESH_TOKEN`; при повторному використанні відкликаного токена в БД відкликаються **всі** активні сесії користувача |
| `TC-AUTH-08` | F4 | Позитивний / Негативний | `POST /auth/logout` із дійсним `refreshToken`, повторний `POST /auth/logout` (ідемпотентність) і спроба `POST /auth/refresh` цим токеном | `204 No Content` на обидва `logout`; подальший `refresh` → `401 INVALID_REFRESH_TOKEN`; паралельна сесія користувача на іншому пристрої залишається активною |
| `TC-AUTH-09` | F5 | Негативний (RBAC) | Запити до всіх адмін-маршрутів (`POST/PATCH/DELETE /venues`, `POST /events`, `PATCH /events/:id/status`, `DELETE /events/:id`, `POST /events/:id/tickets`, `DELETE /admin/registrations/:id`, `GET /analytics/events`): (а) без токена / з простроченим або підробленим токеном / з `refreshToken`; (б) з токеном `user` | (а) `401 Unauthorized` (`UNAUTHORIZED` / `TOKEN_EXPIRED` / `INVALID_TOKEN`) до виконання бізнес-логіки; (б) `403 Forbidden`, `code: FORBIDDEN` |
| `TC-AUTH-10` | F6 | Позитивний / Негативний | `GET /me` з токеном звичайного користувача, з токеном bootstrap-адміна (`ADMIN_EMAIL`) і без токена | `200 OK` з полями `id, email, surname, name, phone, role, createdAt` (для bootstrap-адміна `surname/name/phone` можуть бути `null`); без токена → `401 UNAUTHORIZED` |

### 4.2. Модуль `venues` — керування та перегляд локацій (`F7`–`F11`)

| ID | Вимога | Тип | Сценарій та вхідні дані | Очікуваний результат |
|---|---|---|---|---|
| `TC-VEN-01` | F7 | Позитивний | `POST /venues` від `admin` з `{ name, address, capacity: 500 }` | `201 Created`; локація збережена в таблиці `venues` з нормалізованою адресою `normalized_address` та `createdAt` |
| `TC-VEN-02` | F7 | Граничний / Негативний | `POST /venues` від `admin` з `capacity: 0`, `capacity: -10`, `capacity: 12.5`, порожньою назвою/адресою (`"   "`), або довжиною > 200/300 символів | `400 Bad Request` (`CAPACITY_INVALID`, `VENUE_NAME_INVALID`, `VENUE_ADDRESS_INVALID` або `VALIDATION_ERROR`) |
| `TC-VEN-03` | F8 | Негативний (гонка) | `POST /venues` з адресою, яка відрізняється лише регістром і зайвими пробілами (`"  kyiv,   beresteiskyi ave 37 "`), а також 2 паралельні запити з однаковою адресою | `409 Conflict`, `code: ADDRESS_TAKEN`; при конкурентному створенні виграє рівно один запит (`201`), інший отримує `409 ADDRESS_TAKEN` |
| `TC-VEN-04` | F9 | Позитивний | `GET /venues?page=1&limit=2` та `GET /venues/:id` від неавторизованого гостя | `200 OK`; повертає пагінований об'єкт `{ items, page, limit, total, totalPages }` та коректні деталі локації без токена |
| `TC-VEN-05` | F9 | Негативний | `GET /venues/:id` з неіснуючим UUID і з невалідним форматом UUID (`not-a-uuid`); `GET /venues?page=0&limit=101` | Неіснуючий UUID → `404 VENUE_NOT_FOUND`; невалідний формат / параметри пагінації → `400 VALIDATION_ERROR` |
| `TC-VEN-06` | F11 | Позитивний / Негативний | `PATCH /venues/:id` від `admin`: (а) часткове оновлення лише `capacity` або `name`; (б) зміна `address` на вже зайняту іншою локацією; (в) порожнє тіло `{}` | (а) `200 OK` з оновленими полями; (б) `409 ADDRESS_TAKEN`; (в) `400 VALIDATION_ERROR` (`minProperties: 1`) |
| `TC-VEN-07` | F10 | Негативний | `DELETE /venues/:id` від `admin`, коли на локації є подія у статусі `IN_PLANNING` або `ACTIVE` | `409 Conflict`, `code: VENUE_HAS_EVENTS`; запис локації залишається в БД |
| `TC-VEN-08` | F10 | Позитивний | `DELETE /venues/:id` від `admin` для локації без подій, а також для локації, на якій є лише `FINISHED` або `CANCELLED` події | `204 No Content`; локація видаляється з БД, повторний `GET /venues/:id` → `404 VENUE_NOT_FOUND` |

### 4.3. Модуль `events` — створення, перегляд і життєвий цикл подій (`F14`–`F16`)

| ID | Вимога | Тип | Сценарій та вхідні дані | Очікуваний результат |
|---|---|---|---|---|
| `TC-EVT-01` | F14 | Позитивний | `POST /events` від `admin` із валідними `title`, `description`, `startsAt < endsAt`, `organizer` та існуючим `venueId` | `201 Created`; подія створюється зі статусом `IN_PLANNING` |
| `TC-EVT-02` | F14 | Негативний | `POST /events` з `endsAt <= startsAt` (рівні або завершення раніше початку) та з неіснуючим `venueId` | Некоректний інтервал → `400 EVENT_PERIOD_INVALID`; неіснуюча локація → `404 VENUE_NOT_FOUND` |
| `TC-EVT-03` | F15 | Позитивний | `GET /events?page=1&limit=10`, `GET /events?venueId=...&status=ACTIVE`, `GET /events/:id` від гостя та від авторизованого користувача | `200 OK`; коректна фільтрація та пагінація (сортування `startsAt DESC`), доступ без авторизації |
| `TC-EVT-04` | F15 | Негативний | `GET /events/:id` з неіснуючим UUID; `GET /events?status=DRAFT` (недопустиме значення enum) | `404 EVENT_NOT_FOUND` та `400 VALIDATION_ERROR` відповідно |
| `TC-EVT-05` | F16 | Негативний | `PATCH /events/:id/status` → `{ status: "ACTIVE" }` для події в `IN_PLANNING`, яка ще **не має жодного типу квитків** | `409 Conflict`, `code: INVALID_STATUS_TRANSITION`; статус лишається `IN_PLANNING` |
| `TC-EVT-06` | F16 | Позитивний | Додати ≥ 1 тип квитка → `PATCH /events/:id/status` → `{ status: "ACTIVE" }` | `200 OK`; статус переходить в `ACTIVE`, подія відкривається для реєстрацій |
| `TC-EVT-07` | F16 | Позитивний / Негативний | `PATCH /events/:id/status` → `{ status: "CANCELLED" }` з `IN_PLANNING` або `ACTIVE`; повторний перехід з `CANCELLED` в `ACTIVE` або `IN_PLANNING` | Скасування → `200 OK` (`CANCELLED`) + асинхронна подія `EventCancelled` в `event_stats.is_cancelled = true`; вихід із термінального стану → `409 INVALID_STATUS_TRANSITION` |
| `TC-EVT-08` | F16 | Позитивний / Негативний | `PATCH /events/:id/status` → `{ status: "FINISHED" }` для `ACTIVE`-події: (а) коли `endsAt > now`; (б) коли `endsAt ≤ now` | (а) `409 INVALID_STATUS_TRANSITION`; (б) `200 OK`, статус `FINISHED` |
| `TC-EVT-09` | F16 | Позитивний (cron) | Запуск `SyncEventStatusesUseCase` (cron `*/30 * * * *`) для активних подій із `endsAt ≤ now` та майбутніх `ACTIVE`-подій | Минулі `ACTIVE`-події стають `FINISHED`; майбутні не змінюються; повторний запуск ідемпотентний (`finished: 0`) |
| `TC-EVT-10` | F16 | Позитивний / Негативний | `DELETE /events/:id` від `admin` для статусів `IN_PLANNING`, `ACTIVE`, `FINISHED`, `CANCELLED` | `IN_PLANNING` / `ACTIVE` → `409 INVALID_STATUS_TRANSITION`; `FINISHED` / `CANCELLED` → `204 No Content` |

### 4.4. Модуль `tickets` — типи квитків, ліміти та залишок (`F17`–`F18`)

| ID | Вимога | Тип | Сценарій та вхідні дані | Очікуваний результат |
|---|---|---|---|---|
| `TC-TCK-01` | F17 | Позитивний | `POST /events/:id/tickets` від `admin`: `{ type: "Standard", limit: 100, price: 350 }` та безкоштовний `{ type: "Free Pass", limit: 20, price: 0 }` | `201 Created`; ціна з точністю до 2 знаків після коми збережена в `ticket_types` |
| `TC-TCK-02` | F17 | Граничний / Негативний | `POST /events/:id/tickets` з `limit: 0` / `-1` / `1.5`, `price: -5` / `10.999` (3 знаки після коми), порожньою назвою | `400 Bad Request` (`TICKET_LIMIT_INVALID`, `TICKET_PRICE_INVALID`, `TICKET_TYPE_INVALID` або `VALIDATION_ERROR`) |
| `TC-TCK-03` | F17 | Негативний | `POST /events/:id/tickets` із дублем назви типу в межах однієї події (`"  standard "` після `"Standard"`) | `409 Conflict`, `code: TICKET_TYPE_TAKEN` |
| `TC-TCK-04` | F17 | Негативний (інваріант місткості) | Локація має `capacity: 100`; додано тип квитка на `70`, спроба додати другий тип на `31` (сума `101 > 100`), а також паралельне додавання двох типів по `60` | `409 Conflict`, `code: TICKET_CAPACITY_EXCEEDED`; сума лімітів усіх типів квитків події ніколи не перевищує `venue.capacity` |
| `TC-TCK-05` | F17 | Негативний | `POST /events/:id/tickets` для події у статусі `FINISHED` або `CANCELLED` та для неіснуючої події | Завершена/скасована подія → `409 INVALID_STATUS_TRANSITION`; неіснуюча подія → `404 EVENT_NOT_FOUND` |
| `TC-TCK-06` | F18 | Позитивний | `GET /events/:id/tickets` від гостя до реєстрацій, після реєстрації та після скасування реєстрації | `200 OK`; повертає масив типів із `limit`, `price` та актуальним `remaining` (`limit → limit - 1 → limit`) |

### 4.5. Модуль `registrations` — атомарна реєстрація, скасування та історія (`F12`–`F13`, `F19`–`F22`)

| ID | Вимога | Тип | Сценарій та вхідні дані | Очікуваний результат |
|---|---|---|---|---|
| `TC-REG-01` | F19, F22 | Позитивний | `POST /events/:eventId/registrations` з `{ ticketTypeId }` від авторизованого `user` на `ACTIVE`-подію з вільними місцями | `201 Created` (`status: ACTIVE`); `remaining` зменшується на 1; запис з'являється у `GET /me/registrations` з деталями події та квитка |
| `TC-REG-02` | F19 | Негативний | `POST /events/:eventId/registrations` на подію в статусі `IN_PLANNING`, `FINISHED` або `CANCELLED` | `409 Conflict`, `code: EVENT_REGISTRATION_CLOSED` |
| `TC-REG-03` | F19 | Негативний | `POST /events/:eventId/registrations` без токена; з неіснуючим `eventId`; з `ticketTypeId`, що належить **іншій** події | Без токена → `401 UNAUTHORIZED`; чужий або відсутній квиток → `404 TICKET_NOT_FOUND`; відсутня подія → `404 EVENT_NOT_FOUND` |
| `TC-REG-04` | F20, F21 | Позитивний / Негативний (ліміт) | Реєстрація до досягнення `remaining === 0` і наступний запит на той самий `ticketTypeId` | Останнє місце → `201 Created`; наступний запит → `409 Conflict`, `code: TICKETS_SOLD_OUT` |
| `TC-REG-05` | F20, F21, N4 | Конкурентний (стрес) | `N = 30` паралельних запитів `POST /events/:eventId/registrations` на тип квитка з лімітом `M = 5` на реальному PostgreSQL (`pg.Pool`) | Рівно `5` відповідей `201 Created`, рівно `25` відповідей `409 TICKETS_SOLD_OUT`; у БД рівно `5` рядків зі статусом `ACTIVE`; `remaining === 0`; `event_stats.registrations_count === 5` |
| `TC-REG-06` | F12 | Позитивний | `DELETE /registrations/:id` від власника активної реєстрації | `204 No Content`; статус змінюється на `CANCELLED`, `remaining` збільшується на 1 (нове місце доступне іншому користувачу), `event_stats.registrations_count` зменшується на 1 |
| `TC-REG-07` | F12 | Негативний | (а) Звичайний `user` намагається викликати `DELETE /registrations/:id` для чужої реєстрації; (б) повторне скасування вже `CANCELLED`-реєстрації; (в) скасування для `FINISHED`-події | (а) `403 FORBIDDEN`; (б) `409 REGISTRATION_ALREADY_CANCELLED`; (в) `409 EVENT_REGISTRATION_CLOSED` |
| `TC-REG-08` | F13 | Позитивний / Негативний | `admin` скасовує реєстрацію іншого користувача через `DELETE /admin/registrations/:id` і через `DELETE /registrations/:id`; `user` звертається до `DELETE /admin/registrations/:id` | `admin` → `204 No Content`, місце звільняється, публікується `RegistrationCancelled` (`cancelledBy: 'admin'`); `user` на `/admin/registrations/:id` → `403 FORBIDDEN` |
| `TC-REG-09` | F22 | Позитивний / Негативний | `GET /me/registrations` для користувача з кількома реєстраціями (`ACTIVE` і `CANCELLED`) на різні події; запит без токена | `200 OK`; повертаються **лише власні** реєстрації, відсортовані `registeredAt DESC`, з вкладеними `event` та `ticket`; без токена → `401 UNAUTHORIZED` |

### 4.6. Модуль `analytics` та уніфікована обробка помилок (`F23`–`F25`)

| ID | Вимога | Тип | Сценарій та вхідні дані | Очікуваний результат |
|---|---|---|---|---|
| `TC-ANL-01` | F23, N5 | Позитивний (async) | Реєстрація (`RegistrationCreated`), скасування (`RegistrationCancelled`) та скасування події (`EventCancelled`) | `event_stats` асинхронно після COMMIT оновлює `registrations_count` (`+1` / `-1`), `is_cancelled` (`true`) та `last_activity_at`; збій обробника не відкочує і не затримує основний запит |
| `TC-ANL-02` | F24 | Позитивний | `GET /analytics/events?from=...&to=...&status=ACTIVE` від `admin` (у т.ч. коли є події без реєстрацій) | `200 OK`; повертає всі відповідні події (для подій без реєстрацій `registrationsCount: 0, lastActivityAt: null`), відсортовані від найновіших |
| `TC-ANL-03` | F24 | Негативний | `GET /analytics/events` з `from > to`, з невалідним `status`, від `user` і від гостя | `from > to` → `400 PERIOD_INVALID`; невалідний `status` → `400 VALIDATION_ERROR`; `user` → `403 FORBIDDEN`; гість → `401 UNAUTHORIZED` |
| `TC-ANL-04` | F23, N4 | Конкурентний | Одночасний сплеск 20+ подій `RegistrationCreated` / `RegistrationCancelled` для однієї події | Усі оновлення серіалізовані через `SELECT … FOR UPDATE` без втрати лічильника |
| `TC-ERR-01` | F25 | Контрактний (API) | Перевірка тіла помилок усіх категорій (`400`, `401`, `403`, `404`, `409`, `500`) | Єдиний формат `{ code, message }` (плюс `details` для `VALIDATION_ERROR`); `500` не розкриває стек-трейс або SQL-деталі (`code: INTERNAL_ERROR`) |
| `TC-ERR-02` | F25 | UI (негативний) | Помилки у формах UI: зайнятий email, невірний пароль, вичерпаний ліміт квитків (`TICKETS_SOLD_OUT`), заборона видалення локації (`VENUE_HAS_EVENTS`), помилка мережі | Веб-інтерфейс відображає зрозуміле повідомлення за `code` та підсвічує поля з `details` |

---

## 5. Каталог перевірок нефункціональних вимог (`N1`–`N14`)

| ID | Вимога | Метод перевірки та цільовий критерій | Картка |
|---|---|---|---|
| `TC-NFR-01` | N1 (Доступність ≥ 99%) | Перевірка `restart: unless-stopped`, `healthcheck` усіх 3 сервісів (`postgres`, `app`, `web`) і порядку старту `depends_on: service_healthy` у `docker compose up --wait` | ES-02, ES-37 |
| `TC-NFR-02` | N2 (`p95 ≤ 300 мс` при `50 RPS`) | Навантажувальний сценарій `k6` (`constant-arrival-rate: 50/s`) на `GET /api/events`, `GET /api/events/:id/tickets`, `POST /api/events/:eventId/registrations`; поріг `http_req_duration p(95) <= 300` | ES-41 |
| `TC-NFR-03` | N3 (Завантаження сторінок `≤ 2 с` p95) | Замір часу завантаження сторінок SPA (`/`, `/events`, `/venues`, `/login`) через Lighthouse / Navigation Timing проти `web`-контейнера | ES-42 |
| `TC-NFR-04` | N4 (Атомарність критичних операцій) | Юніт-тести `DrizzleUnitOfWork` (commit/rollback/вкладеність) + багатоз'єднаннєвий тест `TC-REG-05` на реальному PostgreSQL + конкурентні тести реєстрації, локацій, ротації refresh-токенів і статистики | ES-03, ES-40 |
| `TC-NFR-05` | N5 (Побічні операції не впливають на час відповіді) | Перевірка `afterCommit` (`setImmediate`), скасування подій при `ROLLBACK` та ізоляції винятку в `EventStatsProjector` | ES-05, ES-27 |
| `TC-NFR-06` | N6 (Адаптивний веб-інтерфейс) | Автоматизована перевірка Playwright у `360×800`, `768×1024`, `1440×900`: `scrollWidth <= innerWidth`, коректне мобільне меню та форми | ES-42 |
| `TC-NFR-07` | N7 (Chrome 110+, Firefox 110+, Safari 16+, Edge 110+) | Перевірка `browserslist` / `vite.config.ts` (`build.target`) і прогін UI-сценаріїв у Chromium, Firefox та WebKit | ES-42 |
| `TC-NFR-08` | N8 (Argon2id за OWASP) | Перевірка формату хешу в БД (`m=19456, t=2, p=1`), відсутності витоку хешу в API та однакової відповіді на логіні (`TC-AUTH-01`, `TC-AUTH-05`) | ES-07, ES-38 |
| `TC-NFR-09` | N9 (JWT автентифікація) | Перевірка `HS256`, відхилення `alg: none`, окремих секретів (`≥ 32` симв. у production) та перевірки `typ` (`access`/`refresh`) | ES-08, ES-38 |
| `TC-NFR-10` | N10 (Адмін-дії лише для `admin`) | Наскрізна матриця RBAC `TC-AUTH-09` по всіх 9 адмін-ендпоінтах | ES-11, ES-38 |
| `TC-NFR-11` | N11 (Шарова архітектура з інверсією залежностей) | Статичний аналіз ESLint (`npm run lint`): заборона імпорту `fastify`, `drizzle-orm`, `pg`, `argon2`, `jsonwebtoken`, `node-cron` у `domain/**` | ES-01 |
| `TC-NFR-12` | N12 (Модульний моноліт із публічними API) | Статичний аналіз ESLint (`no-restricted-imports`): заборона імпорту внутрішніх шарів сусідніх модулів, окрім `index.ts` | ES-01 |
| `TC-NFR-13` | N13 (Docker і Docker Compose) | CI-job `Docker Compose smoke test`: збірка з нуля, HTTPS через nginx, перевірка публікації назовні **лише** порту `443` | ES-02, ES-37 |
| `TC-NFR-14` | N14 (Постійне з'єднання з PostgreSQL) | `GET /health/db` (`select 1`), автозастосування міграцій `0000`–`0007` і прогін `e2e`-тестів на реальному `postgres:17-alpine` | ES-03, ES-37 |
