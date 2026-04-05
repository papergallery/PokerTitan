# PokerTitan — Project Design

Платформа для игры в покер (Техасский холдем) в режиме турнира с MMR рейтингом.

---

## Секция 1: Общая архитектура

```
[React Client]
    ↕ HTTP (REST)     — авторизация, профиль, лобби
    ↕ WebSocket       — игровой процесс в реальном времени
[Node.js + Fastify Server]
    ↕
[PostgreSQL]
```

**Два канала общения:**
- **REST API** — всё что не требует реального времени (логин, профиль, история турниров)
- **WebSocket (Socket.io)** — игровой стол (карты, ставки, ходы, таймер)

**Структура проекта:**
```
/client   — React приложение
/server   — Node.js + Fastify
/shared   — общие типы (TypeScript)
```

**TypeScript** для обеих частей — ловим ошибки на этапе разработки, особенно важно для игровой логики.

---

## Секция 2: Система агентов разработки

**4 агента разработки + менеджер:**

```
[Ты]
  ↓ высокоуровневая задача
[Manager Agent]
  ↓ планирует, декомпозирует, согласует ключевые решения
  ├── [Frontend Agent]   — worktree: feature/frontend-*
  ├── [Backend Agent]    — worktree: feature/backend-*
  ├── [QA Agent]         — worktree: feature/qa-*
  └── [Deploy Agent]     — worktree: feature/deploy-*
```

**Протокол передачи задач:**
```
Менеджер → ставит задачу агенту
Агент → выполняет в своём worktree
Агент → сигнализирует менеджеру о завершении
Менеджер → проверяет, мёрджит, уведомляет следующего агента
```

**Источники правды:**
```
/CLAUDE.md              — общие правила для всех агентов
/project-design.md      — архитектура и решения проекта
/client/CLAUDE.md       — специфика фронтенда
/server/CLAUDE.md       — специфика бэкенда
/deploy/CLAUDE.md       — специфика деплоя
```

**Агенты и их MCP:**

| Агент | Зона ответственности | MCP |
|---|---|---|
| Manager | Планирование, координация, handoff | filesystem, git |
| Frontend | `/client` — React, UI, Socket.io клиент | filesystem, browser, Figma |
| Backend | `/server` — Fastify, игровая логика, БД | filesystem, PostgreSQL |
| QA | Тесты для клиента и сервера | filesystem, browser, PostgreSQL |
| Deploy | Git push, docker-compose, окружения | filesystem, shell |
| Infrastructure | Docker, Nginx, БД, мониторинг, бэкапы | filesystem, shell, PostgreSQL, fetch |

**Скиллы Frontend Agent:**
- `simplify` — проверка качества компонентов после написания

**Скиллы Infrastructure Agent:**
- `simplify` — проверка качества конфигов после написания
- `schedule` — запуск бэкапов и health checks по расписанию

---

## Секция 3: База данных

```sql
users
├── id, email, name, avatar_url
├── mmr (текущий рейтинг, default: 1000)
├── google_id (для OAuth, nullable)
├── password_hash (nullable)
└── created_at

tournaments
├── id, status (waiting | in_progress | finished)
├── format (1v1 | 5-player)
└── created_at, started_at, finished_at

tournament_players
├── tournament_id, user_id
├── place (1-5, null пока турнир идёт)
└── mmr_change (сколько MMR получил/потерял)

game_states
├── tournament_id
├── state (JSON) — карты, банк, ходы, текущий игрок
└── updated_at
```

**Ключевые решения:**
- Игровое состояние хранится как JSON — гибко, не нужна сложная схема для карт/ставок
- MMR по умолчанию 1000 — классический старт как в шахматных рейтингах
- MMR общий для обоих форматов (1v1 и 5-player)
- История изменений MMR — через `tournament_players.mmr_change`

---

## Секция 4: Авторизация и матчмейкинг

**Авторизация:**
```
Вариант 1: Email + пароль
[Client] → POST /auth/register (email, password)
[Client] → POST /auth/login (email, password)

Вариант 2: Google OAuth
[Client] → /auth/google → [Google] → callback → [Server]
Server создаёт/обновляет user в БД

Оба варианта → выдают JWT → хранится в httpOnly cookie
```

- Пароль хранится как bcrypt hash, никогда в открытом виде
- При первом входе через Google — аккаунт создаётся автоматически с MMR 1000
- Один аккаунт может иметь и пароль, и Google (по одному email)

**Матчмейкинг:**
```
[Client] → выбирает формат (1v1 или 5-player) → встаёт в очередь
[Server] → очередь отдельная для каждого формата
         → подбирает игроков с близким MMR (±200 по умолчанию)
         → если долго нет матча — расширяет диапазон MMR
         → набрали нужное количество → создаёт tournament → уведомляет всех через WebSocket
```

**Очередь в памяти сервера** (не в БД) — быстро, достаточно для MVP.

---

## Секция 5: Игровой процесс

**Библиотеки:**
- `pokersolver` (npm) — определение комбинаций и победителя
- Остальное пишем сами: ставки, банк, блайнды, очерёдность ходов

**События WebSocket:**
```
Client → Server:
  game:action  — ход игрока (fold, check, call, raise)
  game:ready   — игрок готов начать

Server → Client:
  game:state   — обновление игрового состояния (карты, банк, ходы)
  game:turn    — чья очередь ходить + таймер
  game:result  — итог раунда (кто выиграл банк, карты)
  game:end     — турнир завершён (места, MMR изменения)
```

**Игровой цикл (Техасский холдем):**
```
1. Раздача карт (2 каждому игроку, закрытые)
2. Pre-flop → ставки
3. Flop (3 общие карты) → ставки
4. Turn (4-я карта) → ставки
5. River (5-я карта) → ставки
6. Showdown → pokersolver определяет победителя
7. Следующий раунд или конец турнира (остался 1 игрок)
```

**Таймер на ход:** 30 секунд, при истечении — автоматический fold.

**Игровое состояние (JSON):**
```json
{
  "deck": [...],
  "players": [{ "userId": 1, "cards": [...], "chips": 1000, "status": "active" }],
  "communityCards": [...],
  "pot": 150,
  "currentPlayer": 3,
  "stage": "flop"
}
```

---

## Секция 6: Фронтенд

**Структура страниц:**
```
/              — лендинг (о проекте, кнопка войти)
/login         — вход (email/пароль + Google)
/register      — регистрация
/lobby         — выбор формата (1v1 или 5-player), кнопка "Найти игру"
/queue         — ожидание матча, индикатор поиска
/game/:id      — игровой стол
/profile/:id   — профиль игрока (MMR, история турниров)
```

**Ключевые компоненты:**
```
<PokerTable />   — игровой стол, карты, банк
<PlayerSeat />   — игрок (карты, фишки, таймер)
<ActionPanel />  — кнопки fold/check/call/raise
<MMRBadge />     — отображение рейтинга
<Matchmaking />  — анимация поиска игры
```

**Визуальный стиль:** Современный минимализм
- Чистые формы, много воздуха
- Нейтральная палитра с одним акцентным цветом
- Плавные анимации (карты, переходы, таймер)

**Стек:**
- React + TypeScript + Vite
- Tailwind CSS — стили
- Framer Motion — анимации
- Socket.io-client — WebSocket
- React Query — REST запросы
- React Router — навигация

**Frontend Agent — MCP и скиллы:**
- **Figma MCP** — читает дизайн напрямую, точный перенос в код
- **Browser MCP** — видит результат, исправляет визуальные баги
- **Скилл `simplify`** — проверка качества компонентов после написания

---

## Секция 7: Деплой и инфраструктура

**Структура:**
```
[GitHub]
  ↓ push to main (Deploy Agent)
[Сервер]
  ↓ git pull → сборка вручную
  ├── Docker: client (Nginx + React)
  ├── Docker: server (Node.js)
  └── Docker: PostgreSQL
```

**Окружения:**
```
development  — локально, docker-compose
production   — сервер, docker-compose
```

**Deploy Agent — задачи:**
- Убедиться что код готов к деплою (тесты прошли)
- Сделать git push в main
- Поддерживать `docker-compose.yml` и `.env.example`

**Переменные окружения:**
```
DATABASE_URL
JWT_SECRET
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
```

Хранятся в `.env` на сервере, никогда в коде.

---

## Секция 8: Тестирование

**QA Agent — зоны ответственности:**

**Бэкенд (unit тесты):**
```
- Игровая логика — раздача карт, ставки, смена стадий
- Определение победителя (pokersolver интеграция)
- MMR расчёт по местам
- Матчмейкинг — подбор по MMR диапазону
```

**Бэкенд (integration тесты):**
```
- REST API — авторизация, профиль
- WebSocket события — полный игровой цикл
- БД — корректная запись результатов турнира
```

**Фронтенд (e2e тесты — Playwright):**
```
- Регистрация и вход
- Поиск игры и попадание в матч
- Полный игровой сеанс
```

**Инструменты:**
```
Vitest      — unit и integration тесты (клиент + сервер)
Playwright  — e2e тесты
```

**Правила для QA Agent:**
- Тесты запускаются перед каждым деплоем
- Новая игровая логика = обязательный unit тест
- Реальная БД в тестах (не моки) — чтобы не пропустить баги миграций
