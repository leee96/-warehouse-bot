#!/usr/bin/env bash
# Első telepítés — root-ként futtatandó a szerveren
# Feltétel: Node.js 20+, MariaDB, git telepítve van
#
# Használat: bash deploy/setup.sh

set -euo pipefail

APP_DIR="/opt/warehouse-bot"
APP_USER="warehousebot"
SERVICE="warehouse-bot"
REPO_URL="${1:-}" # opcionális: bash setup.sh https://github.com/user/warehouse-bot.git

echo "=== Warehouse Bot — Első telepítés ==="

# --- 1. System user ---
echo "[1/8] System user létrehozása..."
if ! id "$APP_USER" &>/dev/null; then
  useradd --system --shell /usr/sbin/nologin --home "$APP_DIR" --create-home "$APP_USER"
  echo "  User '$APP_USER' létrehozva."
else
  echo "  User '$APP_USER' már létezik."
fi

# --- 2. App könyvtár ---
echo "[2/8] App könyvtár beállítása..."
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"

# --- 3. Kód klónozása (ha van repo URL) ---
if [[ -n "$REPO_URL" ]]; then
  echo "[3/8] Repo klónozása..."
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
  echo "[3/8] Repo URL nem adott — másold be a kódot manuálisan:"
  echo "  rsync -av ./warehouse-bot/ root@VPS_IP:${APP_DIR}/"
fi

# --- 4. .env ---
echo "[4/8] .env fájl..."
if [[ ! -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
  chown "$APP_USER:$APP_USER" "${APP_DIR}/.env"
  echo "  FONTOS: töltsd ki a ${APP_DIR}/.env fájlt!"
  echo "  nano ${APP_DIR}/.env"
else
  echo "  .env már létezik, kihagyva."
fi

# --- 5. MariaDB DB és user ---
echo "[5/8] MariaDB adatbázis és user létrehozása..."
DB_NAME="warehouse_bot"
DB_USER="warehousebot"
# Jelszó generálás
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')

mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "  DB: ${DB_NAME}, User: ${DB_USER}, Pass: ${DB_PASS}"
echo "  DATABASE_URL=\"mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}\""
echo "  Másold ezt a .env-be!"

# --- 6. npm install + prisma ---
echo "[6/8] npm install és Prisma migrate..."
sudo -u "$APP_USER" bash -c "cd ${APP_DIR} && npm ci --omit=dev && npx prisma generate && npx prisma migrate deploy"

# --- 7. systemd service ---
echo "[7/8] systemd service telepítése..."
cp "${APP_DIR}/deploy/warehouse-bot.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICE"

# --- 8. logrotate ---
echo "[8/8] logrotate konfig..."
cp "${APP_DIR}/deploy/logrotate.conf" /etc/logrotate.d/warehouse-bot

# --- 9. Backup cron ---
chmod +x "${APP_DIR}/deploy/backup.sh"
ln -sf "${APP_DIR}/deploy/backup.sh" /etc/cron.daily/warehouse-bot-backup

echo ""
echo "=== Telepítés kész ==="
echo ""
echo "Következő lépések:"
echo "  1. Töltsd ki: nano ${APP_DIR}/.env"
echo "  2. Deploy slash parancsok: sudo -u ${APP_USER} bash -c 'cd ${APP_DIR} && node src/deploy-commands.js'"
echo "  3. Bot indítása: systemctl start ${SERVICE}"
echo "  4. Állapot: systemctl status ${SERVICE}"
echo "  5. Logok: journalctl -u ${SERVICE} -f"
