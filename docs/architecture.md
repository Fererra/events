# Архітектура бекенду

## Модулі

| Модуль | Відповідальність |
|---|---|
| `auth` | Реєстрація, вхід, JWT (access 15 хв / refresh 7 днів), ролі `user` / `admin` |
| `venues` | Локації: назва, унікальна адреса, місткість |
| `events` | Події та їх життєвий цикл (`IN_PLANNING → ACTIVE → FINISHED / CANCELLED`) |
| `tickets` | Типи квитків події: ліміт і ціна |
| `registrations` | Реєстрація на подію з атомарною перевіркою ліміту |
| `analytics` | Статистика `event_stats`, оновлюється асинхронно з доменних подій |

## Шари

```
presentation  →  application  →  domain  ←  infrastructure
(routes,         (use cases,      (entities,   (Drizzle repos,
 guards,          ports,           value        Argon2, JWT,
 cron)            CQS)             objects)     adapters)
```

- `domain` не імпортує Fastify, Drizzle, pg, argon2, jsonwebtoken (правило ESLint).
- Порти (інтерфейси) оголошуються в `application`/`domain`, реалізації — в `infrastructure`.

## Взаємодія модулів

- Модуль-споживач оголошує **порт**, а адаптер у його `infrastructure` реалізує порт через публічний `index.ts` модуля-постачальника.
- Імпорт внутрішніх файлів іншого модуля заборонено ESLint-правилом `no-restricted-imports`.
- Побічні операції (аналітика) виконуються асинхронно через Domain Event Bus після COMMIT.

## Доступ до даних

- **Drizzle ORM + node-postgres**, пул з'єднань (`DB_POOL_MAX`, за замовчуванням 10). Усі запити параметризовані Drizzle — захист від SQL-ін'єкцій.
- **Схеми** — кожен модуль володіє своїми таблицями у `modules/<m>/infrastructure/*.schema.ts`.
- **Міграції** — `npm run db:generate` створює SQL у `backend/drizzle/`; застосовуються автоматично при старті `app` (вимкнути: `DB_MIGRATE_ON_START=false`).
- **`IUnitOfWork`** (порт у `shared/application`, реалізація `DrizzleUnitOfWork` у `shared/infrastructure/db`):
  - `run(work)` — атомарна транзакція; вкладені виклики приєднуються до зовнішньої;
  - `afterCommit(cb)` — побічна дія після COMMIT, асинхронно, не впливає на відповідь; при ROLLBACK скасовується.
  - Поточна транзакція зберігається в `AsyncLocalStorage`, тож репозиторії беруть `ctx.db.executor()` і автоматично працюють у ній — use cases не бачать типів ORM.
- **Health:** `GET /health` (liveness), `GET /health/db` (readiness, `select 1`).
- **Тести** використовують PGlite — PostgreSQL у процесі, без Docker.

## Контракт модуля

Кожен `index.ts` експортує об'єкт `AppModule` (`src/shared/module.ts`):

```ts
export interface AppModule {
  readonly name: string;
  register(app: FastifyInstance, ctx: AppContext): Promise<void> | void;
}
```

`app.ts` (composition root) створює спільні залежності (`AppContext`) і реєструє всі модулі.
