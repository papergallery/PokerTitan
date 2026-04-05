# PokerTitan — общие правила для всех агентов

## Проект
Веб-платформа для игры в покер (Техасский холдем) с MMR рейтингом.
Полный дизайн: `/var/www/html/PokerTitan/project-design.md`

## Структура
```
/client      — React фронтенд (порт 5173)
/server      — Node.js бэкенд (порт 3001)
/deploy      — Docker, Nginx, инфраструктура
/shared      — общие TypeScript типы
```

## Стек
- Frontend: React 18 + TypeScript + Vite + Tailwind + Framer Motion
- Backend: Node.js + Fastify + Socket.io + PostgreSQL
- Игровая логика: pokersolver (npm)
- Деплой: Docker Compose, Nginx, сервер 185.70.184.239

## Воркфлоу: от задачи до git

### 1. Manager получает задачу от пользователя
- Анализирует: это фича, баг или инфраструктурная задача?
- Декомпозирует на подзадачи по агентам
- Согласует план с пользователем если нужно

### 2. Manager запускает агентов в git worktrees
Каждый агент получает свою изолированную ветку:
```
feature/backend-<задача>   → Backend Agent
feature/frontend-<задача>  → Frontend Agent
feature/infra-<задача>     → Infrastructure Agent
```
Команды для создания worktree (Manager выполняет сам):
```bash
git worktree add /tmp/wt-backend feature/backend-<задача>
git worktree add /tmp/wt-frontend feature/frontend-<задача>
```

### 3. Агенты работают параллельно (если независимы)
- Backend и Frontend могут работать одновременно
- Каждый агент коммитит в свою ветку

### 4. QA Agent запускает тесты
- После завершения Backend/Frontend агентов
- `cd /var/www/html/PokerTitan/server && npm test`
- Если тесты упали — возвращает задачу агенту

### 5. Manager мёрджит ветки в main
```bash
git merge feature/backend-<задача>
git merge feature/frontend-<задача>
git worktree remove /tmp/wt-backend
git worktree remove /tmp/wt-frontend
```

### 6. Deploy Agent пушит в git
```bash
git push origin main
```

### 7. Infrastructure Agent деплоит на сервер
```bash
sudo docker compose -f /var/www/html/PokerTitan/deploy/docker-compose.http.yml up -d --build
```

## Агенты

| Агент | Ветка | Директория | MCP |
|---|---|---|---|
| Manager | main | / | все |
| Backend | feature/backend-* | /server | filesystem, PostgreSQL |
| Frontend | feature/frontend-* | /client | filesystem, browser, Figma |
| QA | feature/qa-* | /server + /client | filesystem, browser, PostgreSQL |
| Deploy | — | / | filesystem, git |
| Infrastructure | — | /deploy | filesystem, shell, PostgreSQL, fetch |

## Правила
1. Весь код на TypeScript со строгой типизацией
2. Не коммитить .env файлы и ssl/
3. Тесты запускаются перед каждым мёрджем в main
4. Все API ошибки возвращают `{ error: string }`
5. JWT хранится в httpOnly cookie с именем `token`
