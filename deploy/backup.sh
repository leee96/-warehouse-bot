#!/usr/bin/env bash
# MariaDB napi mentés — /etc/cron.daily/warehouse-bot-backup vagy crontab
# Crontab példa: 0 3 * * * /opt/warehouse-bot/deploy/backup.sh >> /var/log/warehouse-bot-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/var/backups/warehouse-bot"
RETENTION_DAYS=14
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/db_${DATE}.sql.gz"

# DB kapcsolati adatok — .env-ből olvassuk, ha nincs külön beállítva
ENV_FILE="/opt/warehouse-bot/.env"
if [[ -f "$ENV_FILE" ]]; then
  # DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DBNAME"
  DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  DB_USER=$(echo "$DB_URL" | sed -E 's|mysql://([^:]+):.*|\1|')
  DB_PASS=$(echo "$DB_URL" | sed -E 's|mysql://[^:]+:([^@]+)@.*|\1|')
  DB_HOST=$(echo "$DB_URL" | sed -E 's|mysql://[^@]+@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DB_URL" | sed -E 's|mysql://[^@]+@[^:]+:([0-9]+)/.*|\1|')
  DB_NAME=$(echo "$DB_URL" | sed -E 's|mysql://[^/]+/([^?]+).*|\1|')
fi

# Fallback: egyedi env változók
DB_USER="${WB_DB_USER:-${DB_USER:-warehousebot}}"
DB_PASS="${WB_DB_PASS:-${DB_PASS:-}}"
DB_HOST="${WB_DB_HOST:-${DB_HOST:-localhost}}"
DB_PORT="${WB_DB_PORT:-${DB_PORT:-3306}}"
DB_NAME="${WB_DB_NAME:-${DB_NAME:-warehouse_bot}}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[$(date)] Backup indítása: ${DB_NAME} → ${BACKUP_FILE}"

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --no-tablespaces \
  "$DB_NAME" | gzip > "$BACKUP_FILE"

chmod 600 "$BACKUP_FILE"
echo "[$(date)] Backup kész: $(du -sh "$BACKUP_FILE" | cut -f1)"

# Régi mentések törlése
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Régi mentések törölve (>${RETENTION_DAYS} nap)"
