# API: Events

Базовий шлях через nginx — `/api` (наприклад, `GET /api/events`). Формат помилок — [api-errors.md](api-errors.md).

| Метод | Шлях | Доступ | Опис | Картка |
|---|---|---|---|---|
| POST | `/events` | `admin` | Створення події у статусі `IN_PLANNING` | ES-18 |
| GET | `/events?page&limit&venueId&status` | всі | Перелік подій із пагінацією та опційними фільтрами | ES-19 |
| GET | `/events/:id` | всі | Деталі події | ES-19 |
| PATCH | `/events/:id/status` | `admin` | Перехід статусу події (`publish`, `cancel`, `finish`) | ES-20 |
| DELETE | `/events/:id` | `admin` | Видалення завершеної або скасованої події | ES-20 |

## Життєвий цикл події (LR2 §4.2)

```
IN_PLANNING ──publish() [≥ 1 тип квитка]──► ACTIVE ──finish() [endsAt ≤ now]──► FINISHED ──► delete()
     │                                        │
     └──────────────cancel()──────────────────┴────────────────────────────────► CANCELLED ──► delete()
```

- **Створення:** подія створюється зі статусом `IN_PLANNING`. Перевіряються інваріант `EventPeriod` (`endsAt > startsAt`, інакше `400 EVENT_PERIOD_INVALID`) та існування локації через порт `IVenueLookup` над `venues/index.ts` (`404 VENUE_NOT_FOUND`).
- **Публікація (`IN_PLANNING → ACTIVE`):** вимагає наявності щонайменше одного типу квитків (перевіряється через порт `IEventTicketChecker` над `tickets/index.ts`); інакше `409 INVALID_STATUS_TRANSITION`.
- **Скасування (`IN_PLANNING | ACTIVE → CANCELLED`):** після COMMIT транзакції публікує доменну подію `EventCancelled` у шину подій для модуля `analytics`.
- **Завершення (`ACTIVE → FINISHED`):** виконується автоматично cron-задачею `sync-event-statuses` (ES-06) або вручну через `PATCH /events/:id/status` після настання `endsAt`.
- **Видалення:** дозволене лише для подій у статусах `FINISHED` або `CANCELLED`, інакше `409 INVALID_STATUS_TRANSITION`.
- **Недопустимі переходи:** будь-який заборонений діаграмою перехід повертає `409 INVALID_STATUS_TRANSITION`.

## Приклади

```http
POST /events
Authorization: Bearer <admin-access>
{
  "title": "KPI Jazz Night",
  "description": "Вечір живої музики у КПІ",
  "startsAt": "2026-12-20T17:00:00Z",
  "endsAt": "2026-12-20T21:00:00Z",
  "organizer": "FICE KPI",
  "venueId": "<venue-uuid>"
}

201 {
  "id": "…",
  "title": "KPI Jazz Night",
  "description": "Вечір живої музики у КПІ",
  "startsAt": "2026-12-20T17:00:00.000Z",
  "endsAt": "2026-12-20T21:00:00.000Z",
  "organizer": "FICE KPI",
  "venueId": "<venue-uuid>",
  "status": "IN_PLANNING",
  "createdAt": "2026-11-27T12:00:00.000Z"
}
400 { "code": "EVENT_PERIOD_INVALID", "message": "Event end time must be after start time" }
404 { "code": "VENUE_NOT_FOUND", "message": "Venue <venue-uuid> not found" }
```

```http
GET /events?page=1&limit=10&status=ACTIVE

200 {
  "items": [ { "id": "…", "title": "KPI Jazz Night", "status": "ACTIVE", "venueId": "…", "startsAt": "…", "endsAt": "…", "organizer": "FICE KPI", "description": "…", "createdAt": "…" } ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "totalPages": 1
}
```

```http
PATCH /events/<id>/status
Authorization: Bearer <admin-access>
{ "status": "ACTIVE" }

200 { "id": "…", "status": "ACTIVE", "…" }
409 { "code": "INVALID_STATUS_TRANSITION", "message": "Cannot publish an event without at least one ticket type" }
```

```http
DELETE /events/<id>
Authorization: Bearer <admin-access>

204
409 { "code": "INVALID_STATUS_TRANSITION", "message": "Cannot delete an event in status ACTIVE" }
```
