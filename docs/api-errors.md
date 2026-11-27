# Формат помилок API

Усі помилки повертаються в єдиному форматі:

```json
{
  "code": "EMAIL_TAKEN",
  "message": "Email is already taken",
  "details": [{ "field": "email", "message": "must match format \"email\"" }]
}
```

- `code` — стабільний машинний код; фронтенд показує повідомлення саме за ним.
- `message` — опис англійською (для логів / розробників).
- `details` — лише для `VALIDATION_ERROR`: перелік полів, що не пройшли валідацію.

## HTTP-статуси

| Статус | Коли | Приклади `code` |
|---|---|---|
| 400 | Некоректне тіло / параметри запиту, порушення інваріанту | `VALIDATION_ERROR`, `CAPACITY_INVALID` |
| 401 | Немає / невалідний / прострочений токен, невірні облікові дані | `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN` |
| 403 | Недостатньо прав (потрібна роль `admin`) | `FORBIDDEN` |
| 404 | Ресурс або маршрут не знайдено | `EVENT_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| 409 | Конфлікт стану | `EMAIL_TAKEN`, `ADDRESS_TAKEN`, `TICKETS_SOLD_OUT`, `INVALID_STATUS_TRANSITION` |
| 500 | Непередбачена помилка сервера (деталі лише в логах) | `INTERNAL_ERROR` |

## Повний довідник кодів помилок

Перелік усіх стабільних машинних кодів (`code`), які повертають модулі бекенду (джерело правди для відображення повідомлень у веб-інтерфейсі, вимога F25):

| Модуль / Шар | HTTP | `code` | Коли виникає |
|---|---|---|---|
| **HTTP / Shared** | 400 | `VALIDATION_ERROR` | Порушення JSON Schema тіла, параметрів маршруту або query (містить `details`) |
| **HTTP / Shared** | 400 | `BAD_REQUEST` | Клієнтська помилка фреймворку (наприклад, пошкоджений JSON) |
| **HTTP / Shared** | 404 | `ROUTE_NOT_FOUND` | Невідомий HTTP-метод або шлях |
| **HTTP / Shared** | 500 | `INTERNAL_ERROR` | Непередбачена помилка сервера (деталі лише в логах) |
| **Auth** | 400 | `EMAIL_INVALID`, `SURNAME_INVALID`, `NAME_INVALID`, `PHONE_INVALID`, `PASSWORD_INVALID` | Порушення доменних правил полів профілю, email або довжини пароля (8–128) |
| **Auth** | 401 | `UNAUTHORIZED` | Відсутній заголовок `Authorization: Bearer <token>` |
| **Auth** | 401 | `INVALID_TOKEN` | Невалідний підпис, формат або тип (`typ`) access-токена |
| **Auth** | 401 | `TOKEN_EXPIRED` | Строк дії access-токена вичерпано |
| **Auth** | 401 | `INVALID_CREDENTIALS` | Невірний email або пароль під час входу |
| **Auth** | 401 | `INVALID_REFRESH_TOKEN` | Невалідний, прострочений, відкликаний або повторно використаний refresh-токен |
| **Auth / Guards** | 403 | `FORBIDDEN` | Недостатньо прав (потрібна роль `admin` або доступ до власного ресурсу) |
| **Auth** | 404 | `USER_NOT_FOUND` | Користувача з `sub` токена не знайдено |
| **Auth** | 409 | `EMAIL_TAKEN` | Обліковий запис із цим email уже зареєстровано |
| **Venues** | 400 | `VENUE_NAME_INVALID`, `VENUE_ADDRESS_INVALID`, `CAPACITY_INVALID` | Порожня/задовга назва чи адреса, або `capacity` не є додатним цілим |
| **Venues** | 404 | `VENUE_NOT_FOUND` | Локацію з вказаним `id` не знайдено |
| **Venues** | 409 | `ADDRESS_TAKEN` | Локація з такою нормалізованою адресою вже існує |
| **Venues** | 409 | `VENUE_HAS_EVENTS` | Неможливо видалити локацію із запланованими (`IN_PLANNING` / `ACTIVE`) подіями |
| **Events** | 400 | `EVENT_TITLE_INVALID`, `EVENT_DESCRIPTION_INVALID`, `EVENT_ORGANIZER_INVALID`, `EVENT_PERIOD_INVALID` | Некоректна довжина полів або `endsAt <= startsAt` |
| **Events** | 404 | `EVENT_NOT_FOUND` | Подію з вказаним `id` не знайдено |
| **Events / Tickets** | 409 | `INVALID_STATUS_TRANSITION` | Заборонений стан-машиною перехід статусу, видалення активної події або додавання квитків до `FINISHED`/`CANCELLED` події |
| **Tickets** | 400 | `TICKET_TYPE_INVALID`, `TICKET_LIMIT_INVALID`, `TICKET_PRICE_INVALID` | Некоректна назва типу, ліміт ≤ 0 або ціна < 0 / > 2 знаків після коми |
| **Tickets / Registrations** | 404 | `TICKET_NOT_FOUND` | Тип квитка не знайдено або він не належить вказаній події |
| **Tickets** | 409 | `TICKET_TYPE_TAKEN` | Тип квитка з такою назвою вже існує для цієї події |
| **Tickets** | 409 | `TICKET_CAPACITY_EXCEEDED` | Сума лімітів усіх типів квитків перевищує місткість локації |
| **Registrations** | 404 | `REGISTRATION_NOT_FOUND` | Реєстрацію з вказаним `id` не знайдено |
| **Registrations** | 409 | `EVENT_REGISTRATION_CLOSED` | Подія не у статусі `ACTIVE` (для реєстрації) або вже `FINISHED` (для скасування) |
| **Registrations** | 409 | `TICKETS_SOLD_OUT` | Вільні місця для обраного типу квитка вичерпано |
| **Registrations** | 409 | `REGISTRATION_ALREADY_CANCELLED` | Реєстрацію вже було скасовано раніше |
| **Analytics** | 400 | `PERIOD_INVALID` | У фільтрі аналітики `from > to` |

## Як це влаштовано

- Домен кидає `DomainError` та підкласи (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`) з `src/shared/domain/errors.ts` — без HTTP-статусів.
- Централізований обробник `src/shared/presentation/error-handler.ts` перетворює їх на статуси та уніфіковане тіло.
- Валідація запитів — JSON Schema у визначенні маршруту Fastify.
