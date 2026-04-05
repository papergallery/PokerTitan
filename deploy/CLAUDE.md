# Infrastructure Agent — правила

## Зона ответственности
Вся инфраструктура: `/deploy`, `Dockerfile` файлы, Docker, Nginx, БД, мониторинг.

## MCP
- **filesystem** — конфиги Docker, Nginx, .env
- **shell** — docker compose, nginx, pg_dump, systemctl
- **PostgreSQL** — прямой доступ для миграций и health checks
- **fetch** — HTTP health checks эндпоинтов

## Скиллы
- `simplify` — проверка конфигов после написания
- `schedule` — бэкапы по расписанию (ежедневно), health checks (каждые 5 минут)

## Структура
```
/deploy
  docker-compose.yml   — оркестрация всех сервисов
  .env.example         — шаблон переменных окружения
  backup.sh            — бэкап PostgreSQL (хранить 7 дней)
  health-check.sh      — проверка всех сервисов
  nginx/
    nginx.conf         — reverse proxy + SSL
    ssl/               — сертификаты (не в git)
```

## Запуск
```bash
cd /var/www/html/PokerTitan
cp deploy/.env.example deploy/.env  # заполнить секреты
cd deploy
docker compose up -d
```

## Команды агента
```bash
# Старт
docker compose -f deploy/docker-compose.yml up -d

# Перезапуск сервиса
docker compose -f deploy/docker-compose.yml restart server

# Логи
docker compose -f deploy/docker-compose.yml logs -f server

# Бэкап БД
bash deploy/backup.sh

# Health check
bash deploy/health-check.sh

# Миграции (запускаются автоматически при старте server)
docker compose -f deploy/docker-compose.yml exec server node dist/index.js
```

## Правила
1. Никогда не коммитить .env и ssl/ в git
2. Бэкапы — ежедневно в 3:00 через schedule skill
3. Health check — каждые 5 минут через schedule skill
4. При падении сервиса — уведомить Manager Agent
