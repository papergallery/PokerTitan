#!/bin/bash
# Health check script — запускается по расписанию через schedule skill
set -e

API_URL="${API_URL:-http://localhost:3001}"
ERRORS=0

check() {
  local name=$1
  local url=$2
  local expected=$3

  status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$status" = "$expected" ]; then
    echo "✓ $name ($status)"
  else
    echo "✗ $name — expected $expected, got $status"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "=== Health Check $(date) ==="
check "API /health"   "${API_URL}/health"   "200"
check "Nginx"         "http://localhost:80"  "301"

# PostgreSQL
if docker compose exec -T postgres pg_isready -q 2>/dev/null; then
  echo "✓ PostgreSQL"
else
  echo "✗ PostgreSQL — not ready"
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
  echo "=== $ERRORS service(s) DOWN ==="
  exit 1
else
  echo "=== All services healthy ==="
fi
