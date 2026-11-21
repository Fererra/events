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

## Як це влаштовано

- Домен кидає `DomainError` та підкласи (`ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`) з `src/shared/domain/errors.ts` — без HTTP-статусів.
- Централізований обробник `src/shared/presentation/error-handler.ts` перетворює їх на статуси та уніфіковане тіло.
- Валідація запитів — JSON Schema у визначенні маршруту Fastify.
