# API: Venues

Базовий шлях через nginx — `/api` (наприклад, `GET /api/venues`). Формат помилок — [api-errors.md](api-errors.md).

| Метод | Шлях | Доступ | Опис | Картка |
|---|---|---|---|---|
| POST | `/venues` | `admin` | Створення локації | ES-13 |
| GET | `/venues?page&limit` | всі | Перелік локацій із пагінацією | ES-14 |
| GET | `/venues/:id` | всі | Деталі локації | ES-14 |
| PATCH | `/venues/:id` | `admin` | Редагування локації | ES-15 |
| DELETE | `/venues/:id` | `admin` | Видалення локації без запланованих подій | ES-16 |

## Правила та інваріанти

- **Унікальність адреси:** перевіряється без урахування регістру та зайвих пробілів (нормалізований ключ `normalized_address` з унікальним індексом у БД; оригінальний регістр зберігається для відображення). Дубль повертає `409 ADDRESS_TAKEN`.
- **Місткість (`capacity`):** додатне ціле число (`integer > 0`), інакше `400 CAPACITY_INVALID`.
- **Назва та адреса:** непорожні рядки до 200 і 300 символів відповідно.
- **Видалення:** перед видаленням модуль перевіряє наявність запланованих подій (`IN_PLANNING` / `ACTIVE`) через порт `IVenueEventsChecker` над `events/index.ts`; за їх наявності повертає `409 VENUE_HAS_EVENTS`. Локацію із завершеними (`FINISHED`) або скасованими (`CANCELLED`) подіями видалити можна.

## Приклади

```http
POST /venues
Authorization: Bearer <admin-access>
{
  "name": "KPI Culture Center",
  "address": "Kyiv, Beresteiskyi Ave 37",
  "capacity": 800
}

201 {
  "id": "…",
  "name": "KPI Culture Center",
  "address": "Kyiv, Beresteiskyi Ave 37",
  "capacity": 800,
  "createdAt": "2026-11-27T12:00:00.000Z"
}
400 { "code": "CAPACITY_INVALID", "message": "Capacity must be a positive integer" }
409 { "code": "ADDRESS_TAKEN", "message": "Venue address is already taken" }
```

```http
GET /venues?page=1&limit=10

200 {
  "items": [ { "id": "…", "name": "KPI Culture Center", "address": "…", "capacity": 800, "createdAt": "…" } ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "totalPages": 1
}
```

```http
PATCH /venues/<id>
Authorization: Bearer <admin-access>
{ "capacity": 900 }

200 { "id": "…", "name": "KPI Culture Center", "address": "…", "capacity": 900, "createdAt": "…" }
409 { "code": "ADDRESS_TAKEN", "message": "Venue address is already taken" }
```

```http
DELETE /venues/<id>
Authorization: Bearer <admin-access>

204
409 { "code": "VENUE_HAS_EVENTS", "message": "Cannot delete venue with scheduled events" }
```
