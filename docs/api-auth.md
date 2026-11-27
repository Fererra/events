# API: Auth

Базовий шлях через nginx — `/api` (наприклад, `POST /api/auth/login`). Формат помилок — [api-errors.md](api-errors.md).

| Метод | Шлях | Доступ | Опис | Картка |
|---|---|---|---|---|
| POST | `/auth/register` | гість | Реєстрація, роль `user` | ES-07 |
| POST | `/auth/login` | гість | Пара токенів | ES-08 |
| POST | `/auth/refresh` | гість (refresh-токен) | Ротація пари токенів | ES-09 |
| POST | `/auth/logout` | гість (refresh-токен) | Відкликання refresh-токена | ES-10 |
| GET | `/me` | `user`, `admin` | Власний профіль | ES-12 |

## Токени

- **access** — JWT HS256, 15 хв, claims `sub` (id користувача), `role`, `typ: "access"`. Передається в `Authorization: Bearer <token>`.
- **refresh** — JWT HS256 (окремий секрет), 7 днів, claims `sub`, `jti`, `typ: "refresh"`. `jti` зберігається в таблиці `refresh_tokens`, тому токен можна відкликати.
- **Ротація:** кожен `/auth/refresh` відкликає старий refresh-токен і видає нову пару. Повторне використання вже відкликаного токена вважається крадіжкою — відкликаються всі сесії користувача.
- Паролі зберігаються лише як хеш **Argon2id** (m = 19 MiB, t = 2, p = 1 — рекомендації OWASP).

## Приклади

```http
POST /auth/register
{
  "surname": "Kovalenko",
  "name": "Olena",
  "phone": "+380501234567",
  "email": "alice@example.com",
  "password": "secret-pass"
}

201 { "id": "…", "email": "alice@example.com", "surname": "Kovalenko", "name": "Olena", "phone": "+380501234567", "role": "user", "createdAt": "2026-11-21T10:00:00.000Z" }
409 { "code": "EMAIL_TAKEN", "message": "Email is already taken" }
```

```http
POST /auth/login
{ "email": "alice@example.com", "password": "secret-pass" }

200 { "tokenType": "Bearer", "accessToken": "…", "expiresIn": 900, "refreshToken": "…", "refreshExpiresIn": 604800 }
401 { "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" }
```

```http
POST /auth/refresh
{ "refreshToken": "…" }

200 { …нова пара… }
401 { "code": "INVALID_REFRESH_TOKEN", … }
```

```http
POST /auth/logout
{ "refreshToken": "…" }

204
```

```http
GET /me
Authorization: Bearer <access>

200 { "id": "…", "email": "alice@example.com", "surname": "Kovalenko", "name": "Olena", "phone": "+380501234567", "role": "user", "createdAt": "…" }
401 { "code": "UNAUTHORIZED" | "INVALID_TOKEN" | "TOKEN_EXPIRED", … }
```

## Захист маршрутів інших модулів

```ts
import { authGuards, currentUser } from '../auth/index.js';

const { requireAuth, requireAdmin } = authGuards(ctx.config);
app.post('/venues', { preHandler: requireAdmin }, async (req) => {
  const { userId, role } = currentUser(req);
  …
});
```

- немає / невалідний токен → **401** ще до бізнес-логіки;
- роль не `admin` на адмін-маршруті → **403**;
- маршрути без `preHandler` доступні гостям.

## Стартовий адміністратор

Публічна реєстрація завжди створює роль `user` і вимагає заповнених полів `surname`, `name`, `phone` (телефон не є унікальним; нормалізується при збереженні). Перший адміністратор створюється при старті з `ADMIN_EMAIL` / `ADMIN_PASSWORD` (див. `.env.example`), якщо такого акаунта ще немає; для нього `surname`, `name`, `phone` можуть бути `null`.
