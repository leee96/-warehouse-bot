#!/usr/bin/env bash
# MariaDB napi mentés — SRK Host SSH terminálból, vagy cron jobként
# Ha a panel támogatja: Cron Jobs → 0 3 * * * bash ~/backup.sh

set -euo pipefail

BACKUP_DIR="$HOME/backups/warehouse-bot"
RETENTION_DAYS=14
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/db_${DATE}.sql.gz"

# .env-ből olvassa a DB adatokat
ENV_FILE="$(dirname "$0")/../.env"
if [[ -f "$ENV_FILE" ]]; then
  DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
  DB_USER=$(echo "$DB_URL" | sed -E 's|mysql://([^:]+):.*|\1|')
  DB_PASS=$(echo "$DB_URL" | sed -E 's|mysql://[^:]+:([^@]+)@.*|\1|')
  DB_HOST=$(echo "$DB_URL" | sed -E 's|mysql://[^@]+@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DB_URL" | sed -E 's|mysql://[^@]+@[^:]+:([0-9]+)/.*|\1|')
  DB_NAME=$(echo "$DB_URL" | sed -E 's|mysql://[^/]+/([^?]+).*|\1|')
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Backup: ${DB_NAME} → ${BACKUP_FILE}"

mysqldump \
  --host="$DB_HOST" \
  --port="${DB_PORT:-3306}" \
  --user="$DB_USER" \
  --password="$DB_PASS" \
  --single-transaction \
  --no-tablespaces \
  "$DB_NAME" | gzip > "$BACKUP_FILE"

echo "[$(date)] Kész: $(du -sh "$BACKUP_FILE" | cut -f1)"

find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
