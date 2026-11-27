# Кросбраузерне, адаптивне тестування та швидкодія UI (`ES-42`, вимоги N3, N6, N7)

Перевірка нефункціональних вимог ЛР1 (§4):
- **N3:** сторінки веб-інтерфейсу завантажуються не довше ніж за `2 с` (`p95`).
- **N6:** адаптивний веб-інтерфейс для десктопних і мобільних екранів (від `360 px`).
- **N7:** коректне відображення та функціонування у `Google Chrome 110+`, `Mozilla Firefox 110+`, `Apple Safari 16+`, `Microsoft Edge 110+`.

Автотести: [tests/ui/playwright.config.ts](../tests/ui/playwright.config.ts), [tests/ui/ui-compatibility.spec.ts](../tests/ui/ui-compatibility.spec.ts).

---

## 1. Конфігурація стенду

- **Об'єкт перевірки:** production-збірка React 18 SPA з гілки `origin/feature/frontend` (`3d8a4b4`, `tsc --noEmit && vite build`: `index.html` `0.31 kB` gzip, CSS `4.27 kB` gzip, JS `82.70 kB` gzip).
- **Перевірка `browserslist` / target збірки:** `frontend/package.json` (`browserslist`) та `frontend/vite.config.ts` (`build.target`) явно фіксують `['chrome110', 'edge110', 'firefox110', 'safari16']` — повна відповідність **N7**.
- **Автоматизовані браузерні рушії (Playwright 1.50+):**
  - **Chromium 159.0** (рушій Blink — покриває Google Chrome та Microsoft Edge);
  - **Firefox 159.0** (рушій Gecko);
  - **WebKit 27.2** (рушій WebKit — покриває Apple Safari).
- **Роздільності екранів:** `360×800` (Mobile), `768×1024` (Tablet), `1440×900` (Desktop).

---

## 2. Запуск UI-тестів

```bash
cd tests/ui
npm ci
npx playwright install chromium firefox webkit
UI_BASE_URL=https://localhost:8443 npm run test:ui
```

---

## 3. Результати кросбраузерної та адаптивної перевірки (2026-11-27)

Загальний результат прогону: **60 / 60 тестів пройдено за 26.5 с** (0 помилок консолі, 0 збоїв рендеру).

| Проєкт Playwright | Рушій / Цільові браузери | Роздільність | Результат | Ключові перевірки |
|---|---|---|---|---|
| `chromium-desktop` | Blink (Chrome / Edge) | `1440×900` | ✅ 10 / 10 | Рендер 5 маршрутів (`< 2 с`), фільтри каталогу, деталі події/локації, валідація форм, `403` на `/admin` для `user` |
| `chromium-mobile` | Blink (Mobile Chrome) | `360×800` | ✅ 10 / 10 | Відсутність горизонтального скролу (`scrollWidth ≤ innerWidth`) на 360/768/1440px, робота бургер-меню `#main-nav` |
| `firefox-desktop` | Gecko (Firefox) | `1440×900` | ✅ 10 / 10 | Повна функціональність маршрутів, форм і навігації без `pageerror` |
| `firefox-mobile` | Gecko (Mobile Firefox) | `360×800` | ✅ 10 / 10 | Адаптивна сітка карток, відсутність переповнення, відкриття мобільного меню |
| `webkit-desktop` | WebKit (Safari) | `1440×900` | ✅ 10 / 10 | Коректний рендер CSS Grid/Flexbox, форм, навігації та повідомлень про помилки |
| `webkit-mobile` | WebKit (Mobile Safari) | `360×800` | ✅ 10 / 10 | Адаптивність від `360 px`, доступність мобільного меню та відсутність переповнення |

---

## 4. Результати аудиту Lighthouse 12.8.2 (вимога N3: ≤ 2 с p95)

Вимірювання виконано в стандартному мобільному профілі Lighthouse із симуляцією мережевого тротлінгу проти production-бандлу SPA:

| Сторінка | Performance | Accessibility | Best Practices | FCP | **LCP** | Speed Index | TTI | TBT | CLS | Статус N3 (`≤ 2 с`) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `/` (Головна) | **100** | **100** | **100** | 1.4 с (`1353 мс`) | **1.4 с** | 1.6 с | 1.4 с | 0 мс | 0 | ✅ |
| `/events` (Каталог подій) | **100** | **100** | **100** | 1.4 с (`1352 мс`) | **1.4 с** | 1.4 с | 1.4 с | 0 мс | 0 | ✅ |
| `/venues` (Каталог локацій) | **100** | **100** | **100** | 1.4 с (`1352 мс`) | **1.4 с** | 1.4 с | 1.4 с | 0 мс | 0 | ✅ |

---

## 5. Зауваження для фінальної інтеграції

- Перевірка виконана проти зібраного SPA з гілки `origin/feature/frontend` (`3d8a4b4`), де бізнес-дані (`events`, `venues`, `registrations`) і `auth` за замовчуванням працюють на `localStorage`-моках.
- Після влиття фронтенду в `main` і переключення API-клієнта на реальний бекенд (`VITE_USE_AUTH_MOCK=false`) необхідно повторно виконати `npm run test:ui` проти `https://localhost:8443` і перевірити виправлення інтеграційних дефектів, зафіксованих у [regression-report.md](regression-report.md) (`BUG-01`–`BUG-04`).
