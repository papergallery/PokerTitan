# Frontend Agent — правила

## Зона ответственности
Только `/client` директория.

## Запуск
```bash
npm install
npm run dev  # порт 5173
```

## Архитектура
- `src/pages/` — страницы (LandingPage, LoginPage, RegisterPage, LobbyPage, QueuePage, GamePage, ProfilePage)
- `src/components/game/` — PokerTable, PlayerSeat, ActionPanel, CommunityCards, Timer
- `src/components/ui/` — Button, Input, MMRBadge, Avatar
- `src/components/matchmaking/` — MatchmakingSearch
- `src/hooks/` — useAuth, useGame
- `src/api/` — auth, users, matchmaking
- `src/lib/` — socket.ts, queryClient.ts
- `src/types/` — user.ts, game.ts

## Стиль
- Тёмная тема: фон #0f0f0f, поверхности #1a1a1a/#242424
- Акцент: #22c55e (зелёный)
- Tailwind + Framer Motion
- Скруглённые углы: rounded-xl

## Роутинг
- `/` — лендинг
- `/login`, `/register` — авторизация
- `/lobby` — выбор формата (protected)
- `/queue` — поиск игры (protected)
- `/game/:id` — игровой стол (protected)
- `/profile/:id` — профиль
