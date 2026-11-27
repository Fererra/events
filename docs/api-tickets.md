# API: Tickets

Базовий шлях через nginx — `/api` (наприклад, `GET /api/events/<id>/tickets`). Формат помилок — [api-errors.md](api-errors.md).

| Метод | Шлях | Доступ | Опис | Картка |
|---|---|---|---|---|
| POST | `/events/:id/tickets` | `admin` | Додавання типу квитків до події | ES-21 |
| GET | `/events/:id/tickets` | всі | Перелік типів квитків події з ціною, лімітом і залишком | ES-22 |

## Правила та інваріанти

- **Ліміт (`limit`):** додатне ціле число (`integer > 0`), інакше `400 TICKET_LIMIT_INVALID`.
- **Ціна (`price`):** невід'ємне число з не більше ніж 2 знаками після коми (`≥ 0`), інакше `400 TICKET_PRICE_INVALID`.
- **Контроль місткості локації:** при додаванні типу квитків рядок події блокується (`SELECT … FOR UPDATE`), і перевіряється інваріант «сума лімітів усіх типів квитків події ≤ місткості локації». При перевищенні повертається `409 TICKET_CAPACITY_EXCEEDED`.
- **Доступність для додавання:** додавати типи квитків можна лише до подій у статусах `IN_PLANNING` або `ACTIVE`; для `FINISHED` / `CANCELLED` повертається `409 INVALID_STATUS_TRANSITION`.
- **Унікальність назви в межах події:** дубль назви типу квитка для однієї події (без урахування регістру та зайвих пробілів) повертає `409 TICKET_TYPE_TAKEN`.
- **Розрахунок залишку (`remaining`):** виконується через порт `ISoldTicketsCounter` (адаптер `RegistrationsModuleSoldCounter` над `registrations/index.ts`).
- **Публічний API модуля (`tickets/index.ts`):** експортує `TicketInfo` та `createTicketReader` (`hasAnyForEvent` для публікації подій, `findByIdForUpdate` для атомарної реєстрації, `findByIds` для `GET /me/registrations`).

## Приклади

```http
POST /events/<eventId>/tickets
Authorization: Bearer <admin-access>
{ "type": "Standard", "limit": 100, "price": 350 }

201 {
  "id": "…",
  "eventId": "…",
  "type": "Standard",
  "limit": 100,
  "price": 350,
  "createdAt": "2026-11-27T12:00:00.000Z"
}
409 { "code": "TICKET_CAPACITY_EXCEEDED", "message": "Sum of ticket limits exceeds venue capacity" }
```

```http
GET /events/<eventId>/tickets

200 [
  { "id": "…", "eventId": "…", "type": "Standard", "limit": 100, "price": 350, "remaining": 85, "createdAt": "…" },
  { "id": "…", "eventId": "…", "type": "VIP", "limit": 20, "price": 1000, "remaining": 20, "createdAt": "…" }
]
```
