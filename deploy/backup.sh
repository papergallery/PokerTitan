#!/bin/bash
# PostgreSQL backup script — запускается по расписанию через schedule skill
set -e

BACKUP_DIR="/var/backups/pokertitan"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="pokertitan_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-pokertitan}" pokertitan \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "Backup saved: ${BACKUP_DIR}/${FILENAME}"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete
echo "Old backups cleaned up"
