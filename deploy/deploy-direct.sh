#!/bin/bash
set -e
cd /var/www/html/PokerTitan

echo "=== Building server ==="
cd server && npm ci && npm run build && cd ..

echo "=== Building client ==="
cd client && npm ci && npm run build && cd ..

echo "=== Restarting server ==="
pm2 restart pokertitan-server

echo "=== Reloading nginx ==="
sudo nginx -t && sudo systemctl reload nginx

echo "=== Done ==="
curl -s http://localhost/health
