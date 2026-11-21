# Архітектура бекенду

## Модулі

| Модуль | Відповідальність |
|---|---|
| `auth` | Реєстрація, вхід, JWT (access 15 хв / refresh 7 днів), ролі `user` / `admin` |
| `venues` | Локації: назва, унікальна адреса, місткість |
| `events` | Події та їх життєвий цикл (`DRAFT → ACTIVE → FINISHED / CANCELLED`) |
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

## Контракт модуля

Кожен `index.ts` експортує об'єкт `AppModule` (`src/shared/module.ts`):

```ts
export interface AppModule {
  readonly name: string;
  register(app: FastifyInstance, ctx: AppContext): Promise<void> | void;
}
```

`app.ts` (composition root) створює спільні залежності (`AppContext`) і реєструє всі модулі.
