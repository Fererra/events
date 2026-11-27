# API та модуль Analytics

## Як збирається статистика (ES-27)

```
Registrations ──RegistrationCreated──┐
Registrations ──RegistrationCancelled┼──► Domain Event Bus ──► EventStatsProjector ──► event_stats
Events ─────────EventCancelled───────┘    (після COMMIT,        (власна транзакція,
                                           асинхронно)            SELECT … FOR UPDATE)
```

- `event_stats` (власна таблиця модуля): `event_id`, `registrations_count`, `is_cancelled`, `last_activity_at`.
- Оновлення виконується **після COMMIT** транзакції публікатора і **асинхронно** — відповідь на реєстрацію не чекає на Analytics.
- Збій Analytics логується й не впливає на продаж квитків (обробник ізольований у шині подій).
- Конкурентні оновлення однієї події серіалізуються блокуванням рядка — оновлення не губляться.
- Контракти подій експортуються з `registrations/index.ts` та `events/index.ts`; публікувати їх мають use cases ES-23, ES-24/25, ES-20.

## `GET /analytics/events` (ES-28)

Доступ: лише `admin` (гість → 401, `user` → 403).

| Параметр | Тип | Опис |
|---|---|---|
| `from` | ISO date-time | події, що починаються не раніше |
| `to` | ISO date-time | події, що починаються не пізніше |
| `status` | `IN_PLANNING` \| `ACTIVE` \| `FINISHED` \| `CANCELLED` | статус події |

`from > to` → 400 `PERIOD_INVALID`.

```json
[
  {
    "event": { "id": "…", "title": "Jazz night", "startsAt": "…", "endsAt": "…", "status": "ACTIVE" },
    "registrationsCount": 42,
    "isCancelled": false,
    "lastActivityAt": "2026-11-20T10:00:00.000Z"
  }
]
```

Події без реєстрацій теж повертаються (з нулями). Сортування — найновіші події спочатку. Перелік подій читається з модуля `events` через адаптер `EventsModuleCatalog` над `events/index.ts`.
