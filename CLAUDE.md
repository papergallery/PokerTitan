# PokerTitan — общие правила для всех агентов

## Проект
Веб-платформа для игры в покер (Техасский холдем) с MMR рейтингом.
Полный дизайн: `/var/www/html/PokerTitan/project-design.md`

## Структура
```
/client   — React фронтенд (порт 5173)
/server   — Node.js бэкенд (порт 3001)
/shared   — общие TypeScript типы
```

## Стек
- Frontend: React 18 + TypeScript + Vite + Tailwind + Framer Motion
- Backend: Node.js + Fastify + Socket.io + PostgreSQL
- Игровая логика: pokersolver (npm)

## Правила
1. Весь код на TypeScript со строгой типизацией
2. Не коммитить .env файлы
3. Тесты через Vitest (бэкенд) и Playwright (e2e)
4. Все API ошибки возвращают `{ error: string }`
5. JWT хранится в httpOnly cookie с именем `token`
