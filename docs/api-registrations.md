# API: Registrations

Базовий шлях через nginx — `/api` (наприклад, `POST /api/events/<id>/registrations`). Формат помилок — [api-errors.md](api-errors.md).

| Метод | Шлях | Доступ | Опис | Картка |
|---|---|---|---|---|
| POST | `/events/:eventId/registrations` | `user` / `admin` | Атомарна реєстрація на подію з обраним типом квитка | ES-23 |
| GET | `/me/registrations` | `user` / `admin` | Перелік власних реєстрацій (CQS query) | ES-26 |
| DELETE | `/registrations/:id` | власник / `admin` | Скасування власної реєстрації (або будь-якої для `admin`) | ES-24, ES-25 |
| DELETE | `/admin/registrations/:id` | `admin` (`AdminGuard`) | Скасування будь-якої реєстрації адміністратором | ES-25 |

## Правила, атомарність та доменні події

- **Атомарний контроль ліміту (`SELECT … FOR UPDATE`):** створення реєстрації виконується в транзакції `IUnitOfWork` із блокуванням рядка типу квитка через публічний `TicketReader` (`tickets/index.ts`), після чого перевіряються статус події (`ACTIVE`, інакше `409 EVENT_REGISTRATION_CLOSED`), належність квитка до події (`404 TICKET_NOT_FOUND`) та кількість активних реєстрацій (`409 TICKETS_SOLD_OUT`). Паралельні запити серіалізуються і не призводять до перепродажу.
- **Скасування:** переводить реєстрацію зі статусу `ACTIVE` у `CANCELLED`, миттєво повертаючи місце у залишок (`GET /events/:id/tickets`). Повторне скасування повертає `409 REGISTRATION_ALREADY_CANCELLED`, скасування для завершеної події (`FINISHED`) — `409 EVENT_REGISTRATION_CLOSED`, спроба звичайного користувача скасувати чужу реєстрацію — `403 FORBIDDEN`.
- **Доменні події для Analytics (після COMMIT, асинхронно):**
  - `RegistrationCreated` — інкрементує `event_stats.registrations_count`;
  - `RegistrationCancelled` (`cancelledBy: 'owner' | 'admin'`) — декрементує `event_stats.registrations_count`.
- **Публічний API модуля (`registrations/index.ts`):** експортує `createSoldTicketsCounter` для розрахунку `remaining` у модулі `tickets` та контракти подій для `analytics`.

## Приклади

```http
POST /events/<eventId>/registrations
Authorization: Bearer <access>
{ "ticketTypeId": "<ticketTypeId>" }

201 {
  "id": "…",
  "userId": "…",
  "eventId": "<eventId>",
  "ticketTypeId": "<ticketTypeId>",
  "status": "ACTIVE",
  "registeredAt": "2026-11-27T12:00:00.000Z"
}
409 { "code": "TICKETS_SOLD_OUT", "message": "Tickets of this type are sold out" }
409 { "code": "EVENT_REGISTRATION_CLOSED", "message": "Registration is only available for active events" }
```

```http
GET /me/registrations
Authorization: Bearer <access>

200 [
  {
    "id": "…",
    "event": { "id": "…", "title": "KPI Jazz Night", "startsAt": "…", "endsAt": "…" },
    "ticket": { "type": "Standard", "price": 350 },
    "status": "ACTIVE",
    "registeredAt": "2026-11-27T12:00:00.000Z"
  }
]
```

```http
DELETE /registrations/<id>
Authorization: Bearer <access>

204
403 { "code": "FORBIDDEN", "message": "Only the owner or an admin can cancel a registration" }
409 { "code": "REGISTRATION_ALREADY_CANCELLED", "message": "Registration is already cancelled" }
```

```http
DELETE /admin/registrations/<id>
Authorization: Bearer <admin-access>

204
403 { "code": "FORBIDDEN", "message": "Insufficient permissions" }
```
