# Event Service

Модульний сервіс для організації публічних заходів: адміністратори керують локаціями, подіями та типами квитків, користувачі переглядають події та реєструються на них (придбання квитка) з атомарним контролем ліміту місць.

Проєкт виконується в межах курсу «Життєвий цикл розробки ПЗ» (КПІ, ІМ-43). Специфікація вимог — ЛР1, архітектура — ЛР2, Scrum-планування — ЛР3 ([дошка Trello](https://trello.com/b/lYGd5j5h/event-service-%D0%BB%D1%803-scrum)).

## Архітектура

Модульний моноліт у топології **SPA + REST API + PostgreSQL**.

- **Модулі:** `auth`, `venues`, `events`, `tickets`, `registrations`, `analytics`.
- **Шари в кожному модулі:** `presentation → application → domain ← infrastructure` (інверсія залежностей; домен не залежить від Fastify/ORM).
- **Межі модулів:** модуль імпортує інший модуль лише через його публічний `index.ts`. Правило перевіряє ESLint (`no-restricted-imports`).

## Стек

TypeScript · Fastify · Drizzle ORM · PostgreSQL · JWT + Argon2 · React.js · Docker Compose · Vitest

## Структура репозиторію

```
backend/
  src/
    app.ts              composition root: збирає Fastify і реєструє модулі
    server.ts           точка входу
    shared/             спільне ядро (доменні помилки, конфіг, контракт модуля)
    modules/
      <module>/
        index.ts        публічний API модуля
        presentation/   HTTP-маршрути, guards, cron-тригери
        application/    use cases (CQS), порти
        domain/         сутності, об'єкти-значення, інтерфейси репозиторіїв
        infrastructure/ реалізації портів (ORM, Argon2, JWT, адаптери)
  tests/                тести (Vitest)
docs/                   документація проєкту
```

## Запуск (локально)

Потрібен Node.js ≥ 22.

```bash
cd backend
npm install
npm run dev        # http://localhost:3000/health
```

Інші команди: `npm run build`, `npm start`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`.

## Команда

| Учасник | Роль | Зона відповідальності |
|---|---|---|
| Александров Ігор | Backend Developer | Архітектура модулів, Venues / Events / Tickets / Registrations |
| Козаченко Софія | QA | Тест-план, ручне та автоматизоване тестування API і UI, регресія |
| Сухоруков Микита | FullStack Developer | Каркас бекенду, Auth, Analytics, Scheduler, Docker / PostgreSQL |
| Хубеджева Єлизавета | Frontend Developer | React SPA, сторінки, інтеграція з API, верстка |

## Процес розробки

- Задачі — картки `ES-XX` на дошці Trello.
- Одна гілка на задачу: `feature/ES-XX-short-name`.
- Коміти — [Conventional Commits](https://www.conventionalcommits.org/) з номером картки у scope: `feat(ES-07): add register use case`.
- Зміни потрапляють у `main` лише через pull request після код-рев'ю.
