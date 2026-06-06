#!/usr/bin/env bash
# Production deploy script — Hetzner VPS
# Futtatás: sudo -u warehousebot bash deploy/deploy.sh
# Vagy: ssh user@vps "cd /opt/warehouse-bot && sudo -u warehousebot bash deploy/deploy.sh"

set -euo pipefail

APP_DIR="/opt/warehouse-bot"
SERVICE="warehouse-bot"

echo "=== Warehouse Bot Deploy ==="
echo "Dir: $APP_DIR | $(date)"

cd "$APP_DIR"

# 1. Kód frissítés
echo "[1/6] git pull..."
git pull --ff-only

# 2. Függőségek — csak production, audit nélkül (ci gyorsabb mint install)
echo "[2/6] npm ci --omit=dev..."
npm ci --omit=dev

# 3. Prisma client generálás + migration
echo "[3/6] Prisma migrate deploy..."
npx prisma generate
npx prisma migrate deploy

# 4. Slash parancsok globális deploy (csak ha szükséges — kommenteld ki ha nem változott)
echo "[4/6] Slash parancsok deploy..."
node src/deploy-commands.js

# 5. Service újraindítás
echo "[5/6] Service restart..."
sudo systemctl restart "$SERVICE"

# 6. Állapot ellenőrzés
sleep 3
echo "[6/6] Service állapot:"
sudo systemctl status "$SERVICE" --no-pager -l

echo "=== Deploy kész ==="
