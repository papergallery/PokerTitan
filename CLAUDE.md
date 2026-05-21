# PokerTitan — общие правила для всех агентов

## Проект
Веб-платформа для игры в покер (Техасский холдем) с MMR рейтингом.
Полный дизайн: `/var/www/html/PokerTitan/project-design.md`

## Структура
```
/client      — React фронтенд (порт 5173)
/server      — Node.js бэкенд (порт 3001)
/deploy      — Nginx-шаблоны и скрипты (Docker НЕ используется, см. ниже)
/shared      — общие TypeScript типы
```

## Стек
- Frontend: React 18 + TypeScript + Vite + Tailwind + Framer Motion
- Backend: Node.js + Fastify + Socket.io + PostgreSQL
- Игровая логика: pokersolver (npm)
- Деплой: PM2 + Nginx напрямую на сервере (БЕЗ Docker), сервер 185.70.184.239

## Запуск, сборка, деплой (актуально на 2026-05-21)

> ⚠️ Docker НЕ используется. `deploy/docker-compose*.yml` и `deploy/nginx/*.conf` —
> устаревшие артефакты, оставлены как референс. Прод работает напрямую.

- **Node-сервер**: PM2 под пользователем `paper`, имя процесса `pokertitan-server`,
  слушает `127.0.0.1:3001`, запускает скомпилированный `server/dist/index.js`.
- **Nginx**: `/etc/nginx/sites-enabled/pokertitan` — **источник истины** для конфига
  (за ним haproxy SNI-роутер на `:8443`, HTTPS `pokertitan.pro` через certbot).
  Шаблон `deploy/nginx-direct.conf` синхронизирован с live-конфигом 2026-05-21.
- **PostgreSQL**: localhost, БД `pokertitan`, миграции применяются автоматически при старте.
- **Секреты**: только в `server/.env` и `deploy/.env` (не в git). Ротированы 2026-05-12.

```bash
# Сборка сервера
cd /var/www/html/PokerTitan/server && npm run build

# Сборка клиента (dist уходит в paper:paper, поэтому от пользователя paper)
sudo -n rm -rf /var/www/html/PokerTitan/client/dist
cd /var/www/html/PokerTitan/client && sudo -n -u paper npm run build

# Перезапуск (заодно прогоняет миграции)
sudo -n -u paper pm2 restart pokertitan-server

# Здоровье
curl -s http://localhost:3001/health
```

## Статус проекта (разработка свёрнута 2026-05-21)

- Функционально готов. Серверные тесты: 75/75 проходят. Typecheck клиента и сервера — чисто.
- Магазин (`/shop`): покупки премиума и рамок аватара намеренно отключены («СКОРО»),
  платёжного бэкенда нет — это заглушки, а не недоделка.
- Слабое тестовое покрытие: WebSocket-флоу игры и e2e-сценарии (lobby→queue→game) не покрыты.
- Дизайн-эксперименты лежат в `design-variants/` (untracked), в продакшен не портировались.

## Воркфлоу разработки (исторический — проект свёрнут)

> Описание процесса, которым проект разрабатывался. Оставлено для справки.

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
# Без Docker — сборка + рестарт PM2 (см. раздел «Запуск, сборка, деплой» выше)
cd /var/www/html/PokerTitan/server && npm run build
sudo -n -u paper pm2 restart pokertitan-server
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
