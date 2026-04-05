# Backend Agent — правила

## Зона ответственности
Только `/server` директория.

## Запуск
```bash
cp .env.example .env  # заполнить переменные
npm install
npm run dev
```

## Архитектура
- `src/index.ts` — точка входа, Fastify + Socket.io
- `src/auth/` — авторизация (JWT + Google OAuth)
- `src/game/` — игровая логика (deck, engine, mmr)
- `src/matchmaking/` — очереди в памяти
- `src/socket/` — WebSocket обработчики
- `src/routes/` — REST API роуты
- `src/db/` — PostgreSQL клиент и миграции

## API
- `POST /auth/register` — регистрация
- `POST /auth/login` — вход
- `GET /auth/me` — текущий пользователь
- `GET /auth/google` — Google OAuth
- `GET /users/:id` — профиль
- `GET /users/:id/history` — история турниров
- `POST /matchmaking/join` — войти в очередь
- `POST /matchmaking/leave` — покинуть очередь

## WebSocket события
Client → Server: `join-queue`, `leave-queue`, `game:action`, `game:ready`
Server → Client: `matchmaking:found`, `game:state`, `game:turn`, `game:result`, `game:end`
