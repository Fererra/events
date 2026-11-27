# API: Venues

Базовий шлях через nginx — `/api` (наприклад, `POST /api/venues`). Формат помилок — [api-errors.md](api-errors.md).

| Метод | Шлях | Доступ | Опис | Картка |
|---|---|---|---|---|
| POST | `/venues` | `admin` | Створення локації | ES-13 |

## Правила та інваріанти

- **Унікальність адреси:** перевіряється без урахування регістру та зайвих пробілів (зберігається нормалізований ключ `normalized_address` з унікальним індексом у БД; оригінальний регістр адреси зберігається для відображення). Дубль повертає `409 ADDRESS_TAKEN`.
- **Місткість (`capacity`):** додатне ціле число (`integer > 0`), інакше `400 CAPACITY_INVALID`.
- **Назва та адреса:** непорожні рядки до 200 і 300 символів відповідно.

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
