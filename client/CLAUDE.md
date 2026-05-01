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

## Мобильная версия — обязательно
При любых изменениях UI учитывать мобильные экраны (< 640px):
- Фиксированные ширины (`w-[336px]`, `w-56` и т.п.) заменять адаптивными: `w-full sm:w-[336px]`
- Горизонтальные flex-ряды при необходимости переводить в колонку: `flex-col sm:flex-row`
- Паддинги и шрифты уменьшать на мобиле: `p-8 sm:p-12`, `text-xl sm:text-2xl`
- После любого UI-изменения мысленно проверить: влезет ли это на экран 390px шириной?

## Скиллы
- `frontend-design` — использовать при создании или переработке любого UI: компонентов, страниц, визуальных элементов. Даёт production-grade дизайн с чёткой эстетической позицией, избегает generic AI-визуала.

## Роутинг
- `/` — лендинг
- `/login`, `/register` — авторизация
- `/lobby` — выбор формата (protected)
- `/queue` — поиск игры (protected)
- `/game/:id` — игровой стол (protected)
- `/profile/:id` — профиль
