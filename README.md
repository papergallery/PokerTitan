# PokerTitan

Веб-платформа для игры в покер (Техасский холдём) с MMR-рейтингом и матчмейкингом.

> ⚠️ **Статус: разработка свёрнута 2026-05-21.** Проект функционально завершён и
> находится в режиме заморозки (не активная разработка). Серверные тесты проходят
> 75/75, typecheck клиента и сервера — чисто. Прод работает на `pokertitan.pro`.
> Известные намеренные ограничения — в конце файла.

---

## Возможности

- ♠️ **Техасский холдём** в реальном времени по WebSocket, расчёт комбинаций через `pokersolver`.
- 📊 **MMR-рейтинг** — пересчёт после каждого турнира, таблица лидеров.
- 🎮 **4 формата игры** — `1v1`, `5-player`, `1v1-turbo` (таймер 10с), `5-player-bounty` (+MMR за нокаут).
- 👤 **Профили** — смена имени, загрузка аватара (обработка через `sharp`, кроп на клиенте).
- 🔐 **Авторизация** — e-mail/пароль (JWT в httpOnly-cookie) + опциональный Google OAuth.
- 🛒 **Магазин** — страница есть, покупки премиума/рамок намеренно отключены (см. ограничения).

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, socket.io-client, React Router |
| Backend | Node.js, Fastify, Socket.io, PostgreSQL (`pg`), `pokersolver`, `sharp` |
| Fastify-плагины | `@fastify/jwt`, `/cookie`, `/cors`, `/oauth2`, `/multipart`, `/static`, `/rate-limit` |
| Деплой | PM2 + Nginx напрямую (**без Docker**), HTTPS через certbot |

## Структура репозитория

```
client/            — React-фронтенд (Vite, dev-порт 5173)
server/            — Node-бэкенд (Fastify + Socket.io, порт 3001)
deploy/            — шаблон Nginx + скрипты деплоя/бэкапа
design-variants/   — архив HTML-прототипов дизайна стола (в прод не портировались)
uploads/           — загруженные аватары (раздаются Nginx, вне git)
project-design.md  — исходный дизайн-документ продукта
CLAUDE.md          — правила и команды для AI-агентов / разработчиков
```

> Общие типы живут в `client/src/types` и `server/src/types` (отдельной папки `shared/` нет).

---

## Локальная разработка

**Требования:** Node.js 18+, PostgreSQL 14+ (БД `pokertitan`).

### Сервер

```bash
cd server
cp .env.example .env          # заполнить DATABASE_URL и JWT_SECRET (≥ 32 символов)
npm install
npm run dev                   # tsx watch, http://localhost:3001
```

Миграции применяются автоматически при старте (`src/db/migrations.ts`).

### Клиент

```bash
cd client
npm install
npm run dev                   # Vite, http://localhost:5173
```

### Тесты

```bash
# Сервер (vitest). JWT_SECRET обязателен — сервер падает без него.
cd server && JWT_SECRET=test-secret-32-chars-minimum-ok-pad-extra npx vitest run

# Клиент: юнит-тесты компонентов + e2e-смоук
cd client && npm test
cd client && npm run test:e2e   # Playwright
```

---

## Сборка и деплой (production)

Docker **не используется**. Прод — это бэкенд под PM2 + системный Nginx + системный PostgreSQL
на сервере `185.70.184.239` (`pokertitan.pro`).

```bash
# 1. Сборка сервера
cd /var/www/html/PokerTitan/server && npm run build

# 2. Сборка клиента (dist уходит в paper:paper, поэтому от пользователя paper)
sudo -n rm -rf /var/www/html/PokerTitan/client/dist
cd /var/www/html/PokerTitan/client && sudo -n -u paper npm run build

# 3. Перезапуск (заодно прогоняет миграции)
sudo -n -u paper pm2 restart pokertitan-server

# 4. Проверка
curl -s http://localhost:3001/health
```

**Топология прода:**
- PM2-процесс `pokertitan-server` (пользователь `paper`) слушает `127.0.0.1:3001`, запускает `server/dist/index.js`.
- Nginx: `/etc/nginx/sites-enabled/pokertitan` — **источник истины** для конфига; слушает `127.0.0.1:8443 ssl` за haproxy SNI-роутером, сертификаты certbot. Шаблон в `deploy/nginx-direct.conf` синхронизирован с live.
- PostgreSQL: localhost:5432, БД `pokertitan`.
- Статика клиента раздаётся Nginx из `client/dist`.

---

## API (REST)

| Метод | Путь | Описание | Доступ |
|---|---|---|---|
| POST | `/auth/register` | Регистрация (rate-limit 10 / 15 мин на IP) | публично |
| POST | `/auth/login` | Вход (rate-limit) | публично |
| GET | `/auth/me` | Текущий пользователь | JWT-cookie |
| POST | `/auth/logout` | Выход (очистка cookie) | публично |
| GET | `/auth/google` · `/auth/google/callback` | Google OAuth (если настроен, иначе 503) | публично |
| GET | `/users/:id` | Публичный профиль | публично |
| GET | `/users/:id/history` | История турниров | публично |
| GET | `/users/:id/stats` | Расширенная статистика | premium |
| PUT | `/users/me` | Сменить имя | JWT |
| POST | `/users/me/avatar` | Загрузка аватара (≤ 5 МБ, через `sharp`) | JWT |
| GET | `/stats/online` | Количество игроков онлайн | публично |
| GET | `/stats/leaderboard` | Таблица лидеров (пагинация) | публично |
| POST | `/admin/clear-games` | Сброс активных игр | admin |
| GET | `/health` | Healthcheck (status, uptime, version) | публично |

Все ошибки возвращаются в формате `{ error: string }`. JWT хранится в httpOnly-cookie `token`
(срок жизни 7 дней, `sameSite=lax`).

> Матчмейкинг работает **только по WebSocket** (событие `join-queue`), REST-эндпоинтов для очереди нет.

## WebSocket-события (Socket.io)

**Клиент → Сервер:** `join-queue`, `leave-queue`, `game:ready`, `game:action` (`{ action: 'fold' | 'check' | 'call' | 'raise', amount? }`), `game:surrender`

**Сервер → Клиент:** `matchmaking:found`, `game:state`, `game:turn`, `game:result`, `game:end`, `game:error`, `queue:count`, `queue:error`, `bounty:kill`

## Форматы игры

| Формат | Игроков | Таймер хода | Особенность |
|---|---|---|---|
| `1v1` | 2 | 30 с | Heads-up |
| `5-player` | 5 | 30 с | Стандартный стол |
| `1v1-turbo` | 2 | 10 с | Ускоренный heads-up |
| `5-player-bounty` | 5 | 30 с | +10 MMR за нокаут игрока |

## Переменные окружения (`server/.env`)

| Переменная | Обязательна | Описание |
|---|---|---|
| `DATABASE_URL` | да | Строка подключения PostgreSQL |
| `JWT_SECRET` | да | ≥ 32 символов (`openssl rand -base64 48`) |
| `PORT` | нет | Порт сервера (по умолчанию `3001`) |
| `CLIENT_URL` | нет | Origin фронтенда для CORS (по умолчанию `http://localhost:5173`) |
| `NODE_ENV` | нет | В проде `production` (cookie помечаются `Secure`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | нет | Включают Google OAuth |
| `OAUTH_CALLBACK_URL` | нет | Redirect URI для Google в проде |

> `.env` и `*.env.bak*` в git не коммитятся.

## База данных

Таблицы создаются миграциями автоматически: `users`, `tournaments`, `tournament_players`, `game_states`.

---

## Известные ограничения (намеренные, не баги)

- **Магазин** (`/shop`): покупки премиума и рамок аватара отключены («СКОРО») — платёжного бэкенда нет.
- **Тесты:** WebSocket-флоу игры и e2e-сценарии (`lobby → queue → game`) не покрыты; покрыты движок,
  MMR, матчмейкинг, auth и user-роуты.
- **Docker:** не используется; Docker-файлы удалены из репозитория.
- **`design-variants/`:** 4 HTML-прототипа дизайна стола сохранены как архив, в React не портировались.

## Лицензия

Приватный проект. Открытой лицензии нет.
